# WP Suite Forms Starter

Starter repository for a Gutenberg + Mantine + React 18 form plugin.

Included:
- single React tree per form on the frontend
- Context + useReducer runtime
- minimal field blocks
- admin submissions screen skeleton
- API client contract placeholders

The frontend rendering model is:
- `save.tsx` writes config placeholders
- `form/view.tsx` finds each saved form root
- one React root mounts for each form
- children read runtime state via context hooks

## WordPress plugin bootstrap

A minimal plugin bootstrap file (`smartcloud-flow.php`) and WordPress.org-style `readme.txt` are included so the starter can be tried as a real plugin after running `yarn build-wp`.
