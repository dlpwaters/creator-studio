# Frontend workspace status

The research workspace has a clearer notebook library, name/description search,
recent-update or name sorting, persistent tile/list views, and direct creation
actions. Desktop notebooks show Sources, Chat, and Notes together. Smaller screens
use one active tab and a navigation drawer. Chat starters prepare an editable draft.

The implementation uses the existing Next.js, Tailwind, Radix, API, and localization
stack. The new interface labels are available in all 14 supported locales.

## Verified checks

- Frontend: 68 tests across 13 files pass.
- ESLint: no errors or new warnings; six existing warnings remain.
- TypeScript checking and the production build pass.
- Development and compiled production previews load real data through the existing
  backend proxy.
- Desktop and phone checks cover navigation, search, view controls, creation forms,
  themes, and notebook tabs. The checked screens have no horizontal page overflow
  or automated accessibility violations.
- The development-image workflow keeps fork builds separate from upstream registry
  publication. Its publication condition was checked for fork pushes, upstream
  pull requests, and upstream main pushes.

## Running this version

See [the frontend preview instructions](../README.dev.md#frontend-workspace-preview).
Publishing or merging source does not update an installed upstream Docker image.
To use the redesign in a container, build and deploy an image from this checkout
as a separate deployment step. Existing data volumes and provider configuration
should be retained.
