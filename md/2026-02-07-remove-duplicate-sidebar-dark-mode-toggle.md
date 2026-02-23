# Remove Duplicate Sidebar Dark Mode Toggle

## Date: 2026-02-07

## Summary
Removed the duplicate Light/Dark Mode toggle from the sidebar in all three layout files. The toggle in the top-right header remains as the single place to switch themes.

## Files Changed

### `src/components/Layout.tsx` (Admin Layout)
- Removed the `DarkModeToggle` component from the sidebar footer section

### `src/components/ClientLayout.tsx` (Client Layout)
- Removed the `DarkModeToggle` component from the sidebar footer section

### `src/components/LayoutRouter.tsx` (Layout Router)
- Removed the `DarkModeToggle` component from the sidebar footer section

## Notes
- The `DarkModeToggle` component in the header (top-right) is unchanged and continues to function as the sole theme switcher
- The `DarkModeToggle` component file itself is unchanged since it is still used by the header
