CREATE OR REPLACE FUNCTION increment_likes(row_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE news
  SET likes = COALESCE(likes, 0) + 1
  WHERE id = row_id;
END;
$$ LANGUAGE plpgsql;
