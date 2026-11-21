-- VATRA: a relationship belongs to its participants, not every signed-in user.
-- The profile screen already treats other members' friends lists as private.
-- The old permissive policy also allowed unrelated users to query accepted
-- friendships whenever both members had public profiles; UI hiding alone
-- cannot protect this data through PostgREST.
DROP POLICY IF EXISTS "vatra_friends_read_accepted_or_own" ON public.friendships;

CREATE POLICY "vatra_friends_read_accepted_or_own"
ON public.friendships AS PERMISSIVE
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.accounts AS a
    WHERE a.user_id = (SELECT auth.uid())
      AND a.vatra_id = ANY(
        ARRAY[public.friendships.requester_id,public.friendships.recipient_id]
      )
  )
);

-- Existing RESTRICTIVE block_hide_friendships continues to apply.
-- All INSERT/UPDATE/DELETE ownership policies are intentionally unchanged.
