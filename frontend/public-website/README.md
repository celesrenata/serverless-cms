# Public Website

This is the public-facing website for the Serverless CMS. It displays published content including blog posts, galleries, and projects.

## Features

- **Home Page**: Featured content, recent posts, and gallery preview
- **Blog**: List of published blog posts with category/tag filtering and pagination
- **Single Post**: Full post view with SEO metadata and related posts
- **Gallery**: Photo galleries with lightbox viewer and progressive loading
- **Projects**: Code projects with syntax highlighting

## Tech Stack

- React 18 with TypeScript
- React Router for navigation
- TanStack Query for data fetching and caching
- Tailwind CSS for styling
- Prism.js for syntax highlighting
- React Helmet Async for SEO

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```
VITE_API_URL=https://your-api-gateway-url.amazonaws.com/api/v1
```

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── Layout/      # Header, Footer, Layout wrapper
│   ├── PostCard.tsx # Blog post preview card
│   ├── CodeBlock.tsx # Syntax highlighted code
│   └── Lightbox.tsx # Image lightbox viewer
├── pages/           # Page components
│   ├── Home.tsx     # Homepage
│   ├── Blog.tsx     # Blog listing
│   ├── Post.tsx     # Single post view
│   ├── Gallery.tsx  # Photo galleries
│   └── Projects.tsx # Code projects
├── hooks/           # Custom React hooks
│   ├── useContent.ts      # Content fetching
│   └── useSiteSettings.ts # Site settings
├── services/        # API client
│   └── api.ts       # API service
├── types/           # TypeScript types
│   └── index.ts     # Shared types
└── App.tsx          # Main app component
```

## Deployment

The website is deployed to S3 and served via CloudFront. Build artifacts are uploaded to the S3 bucket configured in the CDK stack.

```bash
# Build the application
npm run build

# Deploy (handled by CDK deployment script)
# See main project README for deployment instructions
```
# Force redeploy Sat Feb 14 04:57:15 PM PST 2026
