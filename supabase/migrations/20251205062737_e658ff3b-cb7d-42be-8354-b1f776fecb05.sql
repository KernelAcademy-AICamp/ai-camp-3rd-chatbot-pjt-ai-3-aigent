-- Add UPDATE policy for keyword_analyses table to allow toggling favorites
CREATE POLICY "Users can update their own analyses"
ON public.keyword_analyses
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);