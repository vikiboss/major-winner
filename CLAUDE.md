# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Major Winner is a Next.js application for tracking and displaying Counter Strike 2 (CS2) Major tournament prediction results and leaderboards. The app compares predictions from multiple content creators against actual tournament results.

## Development Commands

```bash
# Development
pnpm dev              # Start development server with Turbopack

# Build & Production
pnpm build            # Build for production
pnpm start            # Start production server

# Code Quality
pnpm lint             # Run Next.js linter
pnpm format           # Format code with Prettier
```

## Tech Stack

- **Framework**: Next.js 16 (canary) with App Router
- **React**: v19 with React Server Components
- **Styling**: Tailwind CSS v4 with custom design tokens
- **TypeScript**: Strict mode enabled
- **Package Manager**: pnpm
- **Analytics**: Vercel Analytics
- **Third-party Scripts**: Google Analytics via @next/third-parties

## Architecture

### Data Flow

The app uses a **static data-driven architecture** with no backend:

1. **Data Sources** (`data/`)
   - `events.json`: Tournament events, teams, and actual match results
   - `predictions.json`: Predictor forecasts for each tournament stage

2. **Data Layer** (`lib/data.ts`)
   - Core business logic for calculating prediction accuracy
   - Stage pass/fail determination (Swiss rounds, finals)
   - Predictor statistics and rankings
   - Event progress tracking and state management

3. **Type System** (`types/index.ts`)
   - Comprehensive TypeScript types for all data structures
   - Stage types: Swiss rounds (stage-1/2/3) and Finals (8-to-4, 4-to-2, 2-to-1)
   - Result types: SwissResult, FinalsResult, StagePassStatus

### Prediction Scoring Rules

**Swiss Stages** (瑞士轮):

- Predictors forecast 10 teams: 2×3-0, 6×3-1-or-3-2, 2×0-3
- Pass threshold: 5/10 correct predictions
- Exact match required (3-0 prediction must be 3-0 actual, not 3-1)

**Finals**:

- 8-to-4: Predict 4 semifinalists, need 2/4 correct
- 4-to-2: Predict 2 finalists, need 1/2 correct
- 2-to-1: Predict champion, must match exactly

### Component Structure

```
app/                       # Next.js App Router pages
├── page.tsx              # Home: tournament overview with stage results
├── predictions/          # Prediction-related pages
│   ├── page.tsx         # All predictions overview
│   ├── [stage]/         # Stage-specific predictions
│   │   └── page.tsx     # Dynamic route for each stage
│   ├── layout.tsx       # Shared layout for predictions
│   └── StageNav.tsx     # Stage navigation component
├── predictors/           # Predictor rankings
│   └── page.tsx         # Leaderboard with statistics
├── teams/                # Team listings
│   └── page.tsx         # All participating teams
├── layout.tsx           # Root layout with theme provider
├── globals.css          # Global styles + Tailwind v4 config
├── robots.ts            # SEO: robots.txt generation
└── sitemap.ts           # SEO: sitemap.xml generation

components/               # Shared UI components
├── Header.tsx           # Navigation with links and theme toggle
├── Footer.tsx           # Footer with copyright and links
├── EventContext.tsx     # React Context for current event
├── EventSelector.tsx    # Event dropdown selector
├── TeamLogo.tsx         # Team logo with fallback
├── ThemeProvider.tsx    # Dark/light theme context (client)
└── ThemeToggle.tsx      # Theme toggle button (client)

lib/
└── data.ts              # All data access and business logic

types/
└── index.ts             # TypeScript type definitions

data/                     # Static JSON data files
├── events.json          # Tournament data
└── predictions.json     # Predictor forecasts
```

### Styling System

#### Tailwind CSS v4 Configuration

This project uses **Tailwind CSS v4** with custom theme configuration:

- **Configuration Location**: `app/globals.css` (NOT `tailwind.config.ts`)
- **Theme Definition**: CSS variables defined in `:root`, `.dark`, and `.light` selectors
- **Import**: `@import 'tailwindcss';` at the top of `globals.css`
- **PostCSS**: Uses `@tailwindcss/postcss` plugin

#### Color System & Theme Support

The app supports **light and dark modes** with automatic theme switching:

**Theme Variables** (defined in `app/globals.css`):

```css
/* Primary text colors */
--foreground: main text color
--foreground-secondary: secondary text
--foreground-muted: muted/tertiary text

/* Surface colors */
--color-surface-0/1/2/3: background layers (0=base, 3=elevated)
--color-border: border color

/* Brand colors */
--color-primary-400/500/600: CS2 orange theme

/* State colors */
--color-win: green (success/correct prediction)
--color-lose: red (failure/incorrect prediction)
--color-muted: gray (neutral/inactive)
```

**Semantic Color Classes** (use these instead of hardcoded colors):

- `text-primary`: Main text color (adapts to theme)
- `text-secondary`: Secondary text color
- `text-tertiary` / `text-muted`: Muted/gray text
- `hover-text-primary`: Hover state with theme-adaptive color
- `text-primary-400/500/600`: Brand orange (CS2 theme)
- `text-win` / `text-lose`: State-based colors
- `bg-surface-0/1/2/3`: Background layers
- `border-border`: Border color

**IMPORTANT Color Guidelines**:

1. **Never use hardcoded colors**: Avoid `text-zinc-900`, `text-white`, `dark:text-white`
2. **Always use semantic classes**: `text-primary`, `text-secondary`, `text-tertiary`
3. **Theme-adaptive hover states**: Use `hover-text-primary` instead of `hover:text-zinc-900 dark:hover:text-white`
4. **Custom utility classes**: See `app/globals.css` for `.text-primary`, `.hover-text-primary` definitions

#### Mobile-First Responsive Design

The app is **mobile-first** with careful attention to small screens:

**Breakpoints**:

- Default: Mobile (< 640px)
- `sm:`: Small tablets (≥ 640px)
- `md:`: Tablets (≥ 768px)
- `lg:`: Desktop (≥ 1024px)

**Mobile Optimizations** (in `app/globals.css`):

- Safe area insets for notched devices (`env(safe-area-inset-*)`)
- Touch-optimized scrollbars (thin scrollbar width)
- Better text sizing and line-height for mobile
- Horizontal scroll prevention
- Touch-friendly button/link targets

**Responsive Patterns**:

- Navigation: Card view on mobile, table on desktop
- Tables: Convert to cards with `md:hidden` / `hidden md:block`
- Text sizing: Use `text-sm sm:text-base` for adaptive sizing
- Padding: `px-4 sm:px-6` for responsive spacing
- Gaps: `gap-2 sm:gap-3` for adaptive spacing

**Path alias**: `@/*` maps to `./*` (root directory)

## Key Development Patterns

### Event Progress Detection

The app intelligently determines tournament state by examining result data:

- `getEventProgress(event)`: Auto-detects current stage from results
- `shouldShowStage(event, stageId)`: Determines stage visibility
- `getActiveStages(event)`: Returns stages with results (in-progress or completed)

**Important**: Never hardcode stage visibility. Always use these utility functions to respect the data-driven architecture.

### Event Context Pattern

The app uses React Context for event management:

- `EventContext.tsx`: Provides current event to all components
- `EventSelector.tsx`: Dropdown for switching between events
- Usage: Wrap pages with `EventProvider` or access via `useEvent()` hook

### Image Configuration

Remote image patterns are whitelisted in `next.config.ts`:

- `avatars.githubusercontent.com` (predictor avatars)
- `steamcdn-a.akamaihd.net` (team logos from Steam CDN)

### Adding New Predictors

1. Add entry to `data/predictions.json` under `predictions` array
2. Include all fields:
   - `predictor`: Name/nickname
   - `platform`: Platform (e.g., "bilibili", "youtube")
   - `description`: Brief description
   - `link`: Profile URL
   - `avatar`: Avatar URL (optional)
3. Provide stage predictions (use `null` for unpredicted stages)
4. No code changes needed—data layer handles everything automatically

### Data Update Workflow

To update tournament results:

1. Edit `data/events.json` → update `result` fields for completed stages
2. The app automatically recalculates:
   - All prediction scores
   - Pass/fail status for each predictor
   - Updated rankings and statistics
   - Event progress state
3. Stage visibility and leaderboard adapt based on completed data

**Example**:
```json
{
  "id": "stage-1",
  "result": {
    "3-0": ["team1", "team2"],
    "3-1-or-3-2": ["team3", "team4", "team5", "team6", "team7", "team8"],
    "0-3": ["team9", "team10"]
  }
}
```

## Code Style

- **Prettier Config**: 2-space indent, single quotes, no semicolons, 100 char width
- **Imports**: Use `@/` alias for all root imports (e.g., `@/lib/data`, `@/types`)
- **React**: Prefer functional components with TypeScript
- **Server Components**: Default to RSC; use `'use client'` only when needed:
  - `ThemeProvider.tsx` (uses `useEffect`, `useState`)
  - `ThemeToggle.tsx` (uses `useTheme` hook)
  - `EventContext.tsx` (uses `createContext`, `useState`)
  - `EventSelector.tsx` (uses form interactions)
  - `StageNav.tsx` (uses client-side navigation state)

## Performance Optimizations

- **Turbopack**: Fast development builds with `--turbopack` flag
- **Static Generation**: All pages are statically generated at build time
- **Image Optimization**: Next.js Image component with remote patterns
- **React 19**: Latest React with automatic optimizations
- **No Runtime Dependencies**: Pure static data, no API calls

## SEO Configuration

- **Metadata**: Configured in `app/layout.tsx`
- **Robots**: Dynamic `robots.txt` via `app/robots.ts`
- **Sitemap**: Dynamic `sitemap.xml` via `app/sitemap.ts`
- **Open Graph**: Configured for social sharing

## Common Gotchas

1. **Data File Paths**: Files are in `data/`, not `src/data/`
2. **Tailwind Config**: In `globals.css`, not `tailwind.config.ts`
3. **Theme Variables**: Must be defined in `:root`, `.dark`, and `.light`
4. **Stage IDs**: Must match format `stage-1`, `stage-2`, etc. or `8-to-4`, `4-to-2`, `2-to-1`
5. **Prediction Keys**: Must exactly match stage IDs in `events.json`

## Debugging Tips

- Check browser console for data loading errors
- Verify JSON syntax in `data/*.json` files
- Use TypeScript errors to catch type mismatches
- Check `getEventProgress()` output to understand current state
- Inspect theme CSS variables in DevTools
