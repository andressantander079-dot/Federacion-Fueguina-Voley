---
name: "Console & React Error Expert Debugger"
description: "Guidelines for proactively identifying, squashing, and preventing console errors, warnings, and hydration mismatches in React/Next.js applications."
---

# Console & React Error Expert Debugger

This project demands a pristine developer console. Warnings, errors, and hydration mismatches are not just aesthetic issues; they point to deeper structural or performance flaws.

## Core Directives

1.  **Zero Warnings Policy**: Consider React console warnings (like missing keys, controlled/uncontrolled input changes, or invalid DOM nesting) as critical bugs.
2.  **Hydration Mismatch Prevention**: Given the Next.js SSR/Client architecture, always ensure that the initial render on the client matches the server.
    *   Avoid using `typeof window !== 'undefined'` or `window.innerWidth` directly in render outputs without a `useEffect` or an `isMounted` safeguard.
    *   Dates should be formatted server-side or rendered conditionally on the client.
3.  **Network/API Cleanliness**: 400, 404, and 500 errors must be handled gracefully. Do not let unhandled promise rejections pollute the console.
    *   Always null-check variables before using them in Supabase queries (e.g., `.eq('id', value)` where value could be undefined).
4.  **Key Prop Enforcement**: Every `map()` loop MUST have a unique, stable `key` prop. Never use the array index as a key for easily mutable lists.
5.  **Unmounted Component State Updates**: Prevent `Warning: Can't perform a React state update on an unmounted component`. Clean up subscriptions and async tasks in `useEffect` cleanup functions.

## Auditing Workflow

When asked to audit:
1.  Check for correct hook usage (dependency arrays).
2.  Verify logical operators rendering invalid UI (e.g., `condition && <Component />` where condition is `0` or `NaN` leading to rendered numbers instead of elements).
3.  Verify proper `<Image/>` or `<img>` tag formatting to prevent broken image icons (handle `onError`).
