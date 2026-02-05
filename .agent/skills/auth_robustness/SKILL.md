---
name: Authentication & Role Management Best Practices
description: Guidelines to prevent infinite routing loops and ensure robust role-based access.
---

# Authentication & Role Management Best Practices

## 1. Login Page Logic
The Login page (`src/app/login/page.tsx` or `LoginModal.tsx`) MUST handle ALL defined user roles to prevent redirects to incorrect dashboards.

### Rule of Thumb:
Whenever a new role is introduced (e.g., `referee`, `planillero`), you MUST update:
1. **Auto-Redirect (`useEffect`)**: Checks existing session on mount.
2. **Post-Login Redirect (`handleAuth`)**: Redirects after successful sign-in.

### Example Pattern:
```typescript
// Auto-Redirect
useEffect(() => {
    // ... check session ...
    switch (profile.role) {
        case 'admin': router.push('/admin'); break;
        case 'club': router.push('/club'); break;
        case 'referee': router.push('/referee'); break; // Don't forget this!
        default: router.push('/');
    }
}, []);

// Post-Login
const handleLogin = async () => {
    // ... sign in ...
    switch (profile.role) {
        case 'admin': router.push('/admin'); break;
        // ... same cases ...
    }
}
```

## 2. Protected Routes & Hooks
Use dedicated hooks for each panel (e.g., `useClubAuth`, `useRefereeAuth`, `useAdminAuth`).

### Anti-Loop Pattern:
To avoid infinite loops (`/dashboard` -> `/login` -> `/dashboard` -> ...):
1. **Hooks should redirect to `/login` ONLY if session is missing.**
2. **Login Page should redirect to `/dashboard` ONLY if session exists AND matches role.**
3. **If Dashboard fails validation (e.g. role mismatch), redirect to `/` (Home), NOT `/login`.**

```typescript
// Wrong (Causes Loop if user is logged in but has wrong role/data)
if (profile.role !== 'correct_role') router.push('/login'); 

// Correct
if (profile.role !== 'correct_role') {
    console.error("Access Denied");
    router.push('/'); // Send away, don't ask to login again immediately
}
```

## 3. Database Sync
Ensure tables linked to roles (e.g., `referees`, `teams`) exist.
If `useClubAuth` relies on `teams` table, ensure the relationship exists.
Always handle `null` or missing data gracefully without crashing the auth flow.
