-- Enable Realtime for matches table
-- This allows updates to be broadcast to subscribers (Official Match Sheet Live View)

begin;
  -- Remove if already exists to avoid duplication errors (though add table is usually idempotent for publication)
  alter publication supabase_realtime drop table matches;
exception when others then
  -- Ignore error if table wasn't in publication
end;

alter publication supabase_realtime add table matches;
