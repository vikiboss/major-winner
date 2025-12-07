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
- **Package Manager**: pnpm (workspace)

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
   - Event progress tracking

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
app/                    # Next.js App Router pages
├── page.tsx           # Home: stage results + predictions
├── leaderboard/       # Overall predictor rankings
├── predictors/[id]/   # Individual predictor detail
├── compare/           # Side-by-side prediction comparison
└── teams/             # Team listings
components/            # Shared UI components
├── Header.tsx        # Navigation with theme toggle
├── Footer.tsx
├── ThemeProvider.tsx # Dark/light theme context
└── ThemeToggle.tsx
lib/
└── data.ts           # All data access and business logic
types/
└── index.ts          # TypeScript type definitions
data/                 # Static JSON data files
```

### Styling System

#### Tailwind CSS v4 Configuration

This project uses **Tailwind CSS v4** with custom theme configuration:

- **Configuration Location**: `app/globals.css` (NOT `tailwind.config.ts`)
- **Theme Definition**: CSS variables defined in `:root`, `.dark`, and `.light` selectors
- **Import**: `@import 'tailwindcss';` at the top of `globals.css`

#### Color System & Theme Support

The app supports **light and dark modes** with automatic theme switching:

**Theme Variables** (defined in `app/globals.css`):

```css
/* Primary text colors */
--foreground: main text color --foreground-secondary: secondary text
  --foreground-muted: muted/tertiary text /* Surface colors */ --color-surface-0/1/2/3: background
  layers --color-border: border color /* Brand colors */ --color-primary-400/500/600: CS2 orange
  /* State colors */ --color-win: green (success) --color-lose: red (failure) --color-muted: gray
  (neutral);
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

Path alias: `@/*` maps to `./*`

## Key Development Patterns

### Event Progress Detection

The app intelligently determines tournament state by examining result data:

- `getEventProgress(event)`: Auto-detects current stage from results
- `shouldShowStage(event, stageId)`: Determines stage visibility
- `getActiveStages(event)`: Returns stages with results (in-progress or completed)

**Important**: Never hardcode stage visibility. Always use these utility functions to respect the data-driven architecture.

### Image Configuration

Remote image patterns are whitelisted in `next.config.ts`:

- `avatars.githubusercontent.com` (predictor avatars)
- `steamcdn-a.akamaihd.net` (team logos)

### Adding New Predictors

1. Add entry to `src/data/predictions.json` under `predictions` array
2. Include all fields: `predictor`, `platform`, `description`, `link`
3. Provide stage predictions (null for unpredicted stages)
4. No code changes needed—data layer handles everything

### Data Update Workflow

To update tournament results:

1. Edit `src/data/events.json` → update `result` fields for stages
2. The app automatically recalculates all scores and updates rankings
3. Stage visibility and leaderboard adapt based on completed data

## Code Style

- **Prettier Config**: 2-space indent, single quotes, no semicolons, 100 char width
- **Imports**: Use `@/` alias for all `src/` imports
- **React**: Prefer functional components with TypeScript
- **Server Components**: Default to RSC; use `'use client'` only when needed (ThemeProvider, ThemeToggle)
