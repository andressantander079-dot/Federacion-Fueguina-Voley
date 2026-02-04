-- Add display_order column to sponsors table
ALTER TABLE public.sponsors 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 99;

-- Rename link_url to website to match frontend expectations if necessary, 
-- or we will just update frontend to use 'website' as seen in DB schema.
-- The DB schema showed 'website' column, so we will stick to that.

-- Add a comment
COMMENT ON COLUMN public.sponsors.display_order IS 'Order to display sponsors in the banner (1-based)';
