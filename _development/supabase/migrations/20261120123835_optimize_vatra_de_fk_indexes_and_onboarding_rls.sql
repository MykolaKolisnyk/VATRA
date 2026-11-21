-- VATRA-DE: covering indexes for three foreign keys and per-statement JWT lookup.
-- Idempotent: the live project was optimized and verified before recording this migration.
CREATE INDEX IF NOT EXISTS business_ratings_customer_vatra_id_idx
  ON public.business_ratings (customer_vatra_id);
CREATE INDEX IF NOT EXISTS marketplace_listings_seller_id_idx
  ON public.marketplace_listings (seller_id);
CREATE INDEX IF NOT EXISTS verification_requests_applicant_id_idx
  ON public.verification_requests (applicant_id);
ALTER POLICY onboarding_own_read ON public.onboarding_done
  USING (EXISTS (
    SELECT 1 FROM public.accounts a
    WHERE a.user_id = (SELECT auth.uid())
      AND a.vatra_id = onboarding_done.vatra_id
  ));
ALTER POLICY onboarding_own_insert ON public.onboarding_done
  WITH CHECK (
    (SELECT vatra_admin_private.allowed()) AND
    EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.user_id = (SELECT auth.uid())
        AND a.vatra_id = onboarding_done.vatra_id
    )
  );
