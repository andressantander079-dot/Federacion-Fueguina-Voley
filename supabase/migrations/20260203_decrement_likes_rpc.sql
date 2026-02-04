CREATE OR REPLACE FUNCTION decrement_likes(row_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE news
  SET likes = GREATEST(COALESCE(likes, 0) - 1, 0)
  WHERE id = row_id;
END;
$$ LANGUAGE plpgsql;
