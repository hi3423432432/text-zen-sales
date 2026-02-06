-- Add latest_info column to custom_personas for storing time-sensitive information
ALTER TABLE public.custom_personas 
ADD COLUMN latest_info text;

-- Add comment for clarity
COMMENT ON COLUMN public.custom_personas.latest_info IS 'Time-sensitive information like policies, promotions, or updates that should be included in AI context';