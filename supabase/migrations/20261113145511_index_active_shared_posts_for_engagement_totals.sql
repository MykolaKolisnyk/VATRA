-- Applied as Supabase migration 20261113145511.
-- Accelerates the existing per-post share counter with a compact partial index.
CREATE INDEX IF NOT EXISTS feed_posts_active_shared_ref_idx
ON public.feed_posts(shared_post_kind, shared_post_id)
WHERE archived_at IS NULL AND shared_post_id IS NOT NULL;
