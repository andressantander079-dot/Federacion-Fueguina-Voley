---
name: Verify Database Schema
description: Protocol to verify DB schema before writing code to prevent runtime errors.
---

# Schema Verification Protocol

To improve efficiency and avoid "Column not found" loops:

1.  **Read Before Write**: Before adding a field to an `insert` or `select` statement, ALWAYS verify the column exists in `supabase/schema.sql` or recent migrations.
2.  **Migration First**: If a column is missing:
    *   Create the migration file (`.sql`) FIRST.
    *   Notify the user to apply it (or attempt `db push` if safe).
    *   ONLY THEN update the TypeScript code.
3.  **No Assumptions**: Do not assume standard fields (like `phone`, `address`, `admin_id`) exist unless explicitly seen in the schema file.
