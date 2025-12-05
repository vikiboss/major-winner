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

Custom Tailwind theme with CS2/gaming aesthetics:

- **Color Tokens**: `primary-*`, `surface-*`, `border-*`
- **Semantic Colors**: `win` (green), `lose` (red), `muted` (gray)
- **Background**: `bg-game-dark` base with layered surfaces
- **Responsive**: Mobile-first with `lg:` breakpoints

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
