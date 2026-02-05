---
description: Critical guidelines for robust Supabase updates, RLS debugging, and Singleton Data management.
---

# Supabase Robustness & Debugging Protocols

## 1. The "Silent Fail" Rule (RLS Blocking)
If a Supabase `UPDATE` or `INSERT` returns **0 rows** but **throws no error**, it is almost 100% likely to be a **Row Level Security (RLS)** policy blocking the action.

**Diagnosis:**
- The query syntax is correct.
- The row `id` exists (verified via unrelated script).
- `data` is `[]` or `null`.

**Solution:**
- Check Policies: `supabase/migrations/xxxx_create_table.sql`.
- Verify `USING` vs `WITH CHECK` clauses.
    - `USING` = Visibility (Can I see the row I want to update?)
    - `WITH CHECK` = Validity (Is the *new* state of the row allowed?)
- **Debug Action:** Create a dedicated migration to explicitely `DROP` and `RE-CREATE` the policy for the specific role to ensure permissions are applied.

## 2. The "Dirty Payload" Rule (Whitelist Updates)
**NEVER** use the spread operator (`...settings`) to send an update payload derived from a `select('*')` fetch.

**Why?**
- It includes protected columns (`id`, `created_at`, `updated_at`).
- It includes internal logic columns (`singleton_key`).
- It includes "Ghost Columns" (values that exist in JSON but not in the DB Schema).
- **Result:** The DB will reject the update (often silently due to RLS mismatch on those specific columns).

**Protocol:**
- **ALWAYS** construct a **Strict Whitelist Payload**.
```typescript
// BAD ❌
await supabase.from('table').update({ ...data }).eq('id', id);

// GOOD ✅
const payload = {
    name: data.name,
    status: data.status,
    // Only mutable fields
};
await supabase.from('table').update(payload).eq('id', id);
```

## 3. singleton_key Pattern
For "Settings" or "Config" tables that should only have **one row**:
- **Do not rely on `id`**. IDs can change during resets/migrations.
- **Use `singleton_key`**. Enforce a column `singleton_key bool unique default true` in the schema.
- **Update Target:** Always target `.eq('singleton_key', true)`.

```typescript
.from('settings')
.update(payload)
.eq('singleton_key', true) // Robust
// .eq('id', settings.id) // Fragile
```

## 4. Verification Check
Always chain `.select()` and verify the result length.

```typescript
const { data, error } = await supabase.from('x').update(y).select();

if (!data || data.length === 0) {
    throw new Error("Update failed: Row not found or RLS blocked.");
}
```
