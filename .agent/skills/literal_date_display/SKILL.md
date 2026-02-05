---
name: Literal Date Display Strategy
description: Guidelines for displaying timestamps exactly as stored in the database, bypassing browser timezone logic.
---

# Literal Date Display Strategy

## Context
In many applications (especially refereeing or scheduling), exact time reliability is more important than "User's Local Time".
If a match is scheduled for `20:00`, it should appear as `20:00` whether the user is in Argentina, Spain, or on a device with incorrect timezone settings.

Browser-based `Date` objects (`new Date()`, `toLocaleString`) inherently try to be "helpful" by converting UTC times to the browser's local timezone. This often results in unwanted offsets (e.g., -3 hours) when the data was conceptualized as "Wall Clock Time" but stored as simple UTC.

## The Rule: NO Date Objects for Display
**DO NOT use `Date` objects or `Intl.DateTimeFormat` for rendering text.**

Instead, treat the ISO string from the database as a **formatted string** and just extract the characters you need.

### 🚫 Forbidden Pattern (Browser Conversion)
```typescript
// BAD: Browser will shift this by -3 hours in ARG
const date = new Date(match.scheduled_time); 
return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }); 
```

### ✅ Recommended Pattern (String Slicing)
```typescript
// GOOD: What you see is what you get
export function formatTimeLiteral(isoString: string): string {
    if (!isoString) return '';
    // Expected: "2026-02-05T20:00:00+00:00"
    const parts = isoString.split('T'); // ["2026-02-05", "20:00:00+00:00"]
    return parts[1].substring(0, 5); // "20:00"
}
```

## Implementation Snippets

### Full Date Formatter
Use this to display "Day, DD Month, HH:mm" without timezone math.

```typescript
const MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const DAYS = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];

export function formatLiteralDate(isoString: string): string {
    if (!isoString) return '';
    
    // Split explicitly
    const [datePart, timePart] = isoString.split('T');
    if (!datePart || !timePart) return isoString;

    // Use UTC for weekday calc ONLY (math, not display)
    const [y, m, d] = datePart.split('-').map(Number);
    const utcDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    
    const dayName = DAYS[utcDate.getUTCDay()];
    const monthName = MONTHS[m - 1];
    
    // Extract Time "HH:mm"
    const time = timePart.substring(0, 5);

    return `${dayName}, ${d} ${monthName}, ${time} hs`;
}
```

## When to use this
*   Admin sets a schedule (e.g. "Match at 20:00").
*   Users need to see "20:00" regardless of their travel or device settings.
*   "Wall Clock" time is the source of truth, not a specific point in absolute time.

## Validation Checklist (How to Audit)

To ensure this issue doesn't sneak back in, run these checks:

1.  **Grep for Forbidden Patterns:**
    Search the codebase for `new Date(match.scheduled_time)` or `toLocaleTimeString`.
    ```bash
    grep -r "toLocaleTimeString" src/
    grep -r "new Date.*scheduled_time" src/
    ```

2.  **Verify DB vs UI:**
    *   DB: `2026-05-10T20:00:00`
    *   UI: Must be `20:00`.
    *   If UI shows `17:00` (UTC-3 behavior), you are using a Date object.

3.  **Visual Check:**
    Always check the Admin Panel AND the Public Fixture. They often share logic or copy-pasted code.
