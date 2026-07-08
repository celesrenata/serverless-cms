# Admin Panel

React-based admin panel for the Serverless CMS.

## Project Structure

```
src/
├── components/       # Reusable UI components
├── hooks/           # Custom React hooks
├── pages/           # Page components
├── services/        # API and external service integrations
├── types/           # TypeScript type definitions
├── App.tsx          # Main application component
├── main.tsx         # Application entry point
└── index.css        # Global styles with Tailwind
```

## Technology Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **TanStack Query** - Data fetching and caching
- **Tailwind CSS** - Utility-first CSS framework
- **TipTap** - Rich text editor
- **Axios** - HTTP client
- **Amazon Cognito Identity JS** - Authentication

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Features

### Appearance / Theme Management

The Appearance page (`/appearance`) provides a full visual theme management system:

- **Theme Gallery** — Browse all available themes (builtin + custom) in a responsive grid. Active theme is highlighted with a badge.
- **Visual Theme Editor** — Two-column editor (`/appearance/edit/:id` or `/appearance/new`) with live preview. Edit color tokens, typography, spacing, effects, patterns, and custom CSS.
- **Theme Actions** — Activate, duplicate, export (JSON), import, and delete themes directly from the gallery.
- **Builtin Themes** — Ships with several pre-built themes (Celestium Neon, Celestium Bromide, etc.) that cannot be modified but can be duplicated.
- **Custom Themes** — Create up to 50 custom themes with full token customization and optional CSS overrides.

**Key files:**
- `src/pages/Appearance.tsx` — Gallery page
- `src/pages/ThemeEditor.tsx` — Visual editor
- `src/components/ThemeCard.tsx` — Theme card component
- `src/services/themeService.ts` — API client
- `src/hooks/useThemes.ts` — React Query hooks

**Navigation:** The Appearance item appears in the sidebar between Settings and Plugins (🎨 icon).

## Development

1. Install dependencies: `npm install`
2. Start dev server: `npm run dev`
3. Open http://localhost:5173

## Type Definitions

All TypeScript types are defined in `src/types/`:
- `content.ts` - Content management types
- `media.ts` - Media library types
- `user.ts` - User and authentication types
- `plugin.ts` - Plugin system types
- `settings.ts` - Site settings types
