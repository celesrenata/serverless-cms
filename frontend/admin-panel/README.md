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
