GRANT INSERT ON TABLE public.profile_presence TO authenticated;
CREATE INDEX IF NOT EXISTS photo_album_comments_photo_album_fk_idx ON public.photo_album_comments (photo_id, album_id);
