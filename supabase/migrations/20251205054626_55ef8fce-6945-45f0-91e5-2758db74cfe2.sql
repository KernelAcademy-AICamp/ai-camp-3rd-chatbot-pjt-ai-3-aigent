-- Create table for storing keyword analysis results
CREATE TABLE public.keyword_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword TEXT NOT NULL,
  category TEXT,
  trend_score INTEGER NOT NULL,
  growth_potential TEXT NOT NULL,
  competition TEXT NOT NULL,
  seasonality TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  related_keywords TEXT[] NOT NULL,
  pricing_strategy TEXT NOT NULL,
  risk_factors TEXT[] NOT NULL,
  recommendation TEXT NOT NULL,
  market_insight TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.keyword_analyses ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read analyses (public data)
CREATE POLICY "Anyone can view analyses"
ON public.keyword_analyses
FOR SELECT
USING (true);

-- Allow anyone to insert analyses (for now, since no auth)
CREATE POLICY "Anyone can insert analyses"
ON public.keyword_analyses
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_keyword_analyses_created_at ON public.keyword_analyses(created_at DESC);
CREATE INDEX idx_keyword_analyses_keyword ON public.keyword_analyses(keyword);