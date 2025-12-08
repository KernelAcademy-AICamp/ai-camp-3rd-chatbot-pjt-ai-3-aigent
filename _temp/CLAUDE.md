# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **TrendWhiz Coupang Product Sourcing Tool** - a React-based web application that helps users identify profitable product opportunities on Coupang (Korean e-commerce platform) by analyzing Naver DataLab trend data and competition metrics.

**Tech Stack:**
- Vite + React 18 + TypeScript
- Supabase (Auth + Database + Edge Functions)
- TanStack Query for data fetching
- shadcn/ui + Tailwind CSS for UI
- React Router for navigation

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (runs on port 8080)
npm run dev

# Build for production
npm run build

# Build in development mode
npm run build:dev

# Lint code
npm run lint

# Preview production build
npm run preview
```

## Architecture & Data Flow

### Authentication Flow
- **AuthProvider** (`src/hooks/useAuth.tsx`) wraps the entire app
- Uses Supabase Auth with email/password
- Session persisted in localStorage
- Non-logged-in users get a temporary `session_id` via `localStorage.getItem('sourcing_session_id')`
- RLS policies enforce user_id must not be NULL for database operations

### Main Analysis Pipeline

1. **User Input** → `AnalysisFilters` component collects date range, categories, device/gender filters
2. **Trend Data** → `trendAnalysisService.runFullAnalysis()`:
   - First tries real Naver DataLab API via `naver-trend` edge function
   - Falls back to mock data via `generate-mock-keywords` edge function if Naver fails
3. **AI Analysis** → `analyze-trends` edge function processes trend data with AI
4. **Results Display** → Keywords ranked by growth potential, with competition analysis, charts, niche keywords
5. **History** → Saved to `analysis_history` table (only for logged-in users)

### Competition Analysis Flow

1. User clicks keyword → triggers `CompetitionAnalysis` component
2. Calls `coupang-crawl` edge function to scrape Coupang product listings
3. Aggregates metrics: avg price, review count, rocket delivery ratio, competition score
4. Saves to `competition_analysis` table
5. `CompetitionDashboard` displays side-by-side comparison of saved analyses

### Supabase Edge Functions (Deno)

Located in `supabase/functions/`:
- `naver-trend/` - Fetches trend data from Naver DataLab API
- `predict-trend/` - Statistical time-series prediction (Moving Average, Exponential Smoothing, Linear Regression, Seasonality Detection)
- `analyze-trends/` - AI-powered trend analysis using Lovable AI Gateway (Gemini 2.5 Flash)
- `coupang-crawl/` - Scrapes Coupang for competition data
- `alibaba-search/` - Searches Alibaba for sourcing options
- `generate-mock-keywords/` - Generates mock data for testing

All functions use CORS headers for browser access.

**Note on Trend Prediction:**
- Originally designed for LSTM (TRD specification), but implemented with statistical methods due to Deno runtime constraints
- Uses combination of Moving Average, Exponential Smoothing, and Linear Regression
- Includes automatic seasonality pattern detection
- Returns predictions with confidence intervals

### Database Schema

**Tables:**
- `analysis_history` - Stores trend analysis results per user
  - Columns: `id`, `user_id`, `session_id`, `start_date`, `end_date`, `categories`, `device_filter`, `gender_filter`, `age_filter`, `keywords_result` (JSONB), `created_at`
- `competition_analysis` - Stores Coupang competition scraping results
  - Columns: `id`, `user_id`, `session_id`, `keyword`, `total_products`, `average_price`, `average_reviews`, `rocket_delivery_ratio`, `competition_score`, `products` (JSONB), `created_at`

Both tables have RLS enabled with policies requiring `auth.uid() = user_id`.

## Key Services

### `trendAnalysisService.ts`
Central service for all data operations:
- `runFullAnalysis()` - Main pipeline orchestrator (Naver data → Prediction → AI analysis)
- `getNaverTrend()` - Fetch from Naver DataLab
- `predictTrend()` - Run statistical time-series prediction
- `analyzeTrends()` - AI analysis via edge function
- `generateMockKeywords()` - Fallback mock data generation
- `saveToHistory()` / `getHistory()` / `deleteHistoryEntry()` - History management
- `crawlCoupangCompetition()` - Competition scraping
- `saveCompetitionAnalysis()` / `getCompetitionAnalyses()` / `deleteCompetitionAnalysis()` - Competition data persistence

### `exportService.ts`
Handles data export to Excel and PDF formats using `xlsx` and `jspdf` libraries.

## Important Patterns

### Route Structure
- `/` - Main index page (requires auth check, redirects to `/auth` if not logged in for certain features)
- `/auth` - Login/signup page
- Custom routes must be added ABOVE the `*` catch-all route in `App.tsx`

### Path Aliases
Uses `@` alias for `src/` directory (configured in `tsconfig.json`):
```typescript
import { supabase } from "@/integrations/supabase/client";
```

### Component Organization
- `src/components/` - Feature components (e.g., `CompetitionAnalysis`, `TrendChart`)
- `src/components/ui/` - shadcn/ui primitives (accordion, button, card, etc.)
- `src/pages/` - Route pages (Index, Auth, NotFound)
- `src/hooks/` - Custom React hooks (useAuth, use-toast)

### State Management
- React Query (`@tanstack/react-query`) for server state
- Local state with `useState` for UI state
- AuthContext for global auth state

## Environment Variables

Required in `.env`:
```
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
```

Edge functions require additional env vars (set in Supabase dashboard):
- `NAVER_CLIENT_ID`
- `NAVER_CLIENT_SECRET`

## PRD/TRD Implementation Status

This project implements the requirements from `PRD_소싱도우미.md` and `TRD_소싱도우미.md`:

### Implemented Features (Must Have)
- ✅ F1: Naver DataLab Integration (`naver-trend` edge function)
- ✅ F2: Time-Series Prediction (`predict-trend` edge function - statistical methods instead of LSTM)
- ✅ F3: AI Trend Analysis (`analyze-trends` edge function - Gemini 2.5 Flash via Lovable Gateway)
- ✅ F4: Seasonality Pattern Detection (integrated in `predict-trend`)
- ✅ F5: Coupang Competition Analysis (`coupang-crawl` edge function)
- ✅ F6: Niche Keyword Recommendations (integrated in AI analysis)
- ✅ F7: Margin Calculator (`MarginCalculator` component)
- ✅ F8: Alibaba/Taobao Integration (`alibaba-search` edge function)
- ✅ F9: Analysis History (`analysis_history` table with RLS)

### Key Differences from TRD
- **Tech Stack**: Vite + React + Supabase instead of Next.js (as specified in TRD)
- **Prediction Model**: Statistical methods (Moving Average, Exponential Smoothing, Linear Regression) instead of LSTM/TensorFlow.js
  - Reason: Deno runtime in Supabase Edge Functions doesn't support TensorFlow.js efficiently
  - Alternative approach achieves similar results with lower complexity
- **AI Provider**: Lovable AI Gateway (Gemini 2.5 Flash) instead of direct Claude API
  - Uses same prompting strategy and output format
- **State Management**: React Query + Local State instead of Zustand

### Enhanced Features Beyond PRD
- Competition Dashboard for side-by-side comparison
- Real-time data visualization with Recharts
- Export to Excel and PDF
- Mobile-responsive design with Tailwind CSS

## Lovable Integration

This project is managed via [Lovable](https://lovable.dev). Changes made in Lovable are automatically committed to this repository. When working locally, push changes to sync them back to Lovable.
