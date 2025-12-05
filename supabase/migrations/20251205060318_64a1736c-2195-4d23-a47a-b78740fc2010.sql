-- Add is_favorite column to keyword_analyses
ALTER TABLE public.keyword_analyses 
ADD COLUMN is_favorite BOOLEAN NOT NULL DEFAULT false;

-- Create index for faster favorite queries
CREATE INDEX idx_keyword_analyses_is_favorite ON public.keyword_analyses(is_favorite) WHERE is_favorite = true;