-- Add extended analysis columns for deep analysis mode
ALTER TABLE public.keyword_analyses
ADD COLUMN sourcing_channels text,
ADD COLUMN estimated_sales text,
ADD COLUMN marketing_strategy text,
ADD COLUMN supplier_tips text,
ADD COLUMN profit_margin text,
ADD COLUMN entry_barrier text,
ADD COLUMN competitor_analysis text,
ADD COLUMN product_differentiation text,
ADD COLUMN inventory_strategy text,
ADD COLUMN content_strategy text,
ADD COLUMN platform text DEFAULT 'general',
ADD COLUMN analysis_depth text DEFAULT 'standard';