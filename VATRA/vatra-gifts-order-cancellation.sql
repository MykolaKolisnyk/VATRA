-- VATRA: cancel pending gift order = permanent removal from all user/admin lists.
-- Apply AFTER VATRA/vatra-gifts-orders.sql. Only cancelled orders are purged.
-- Fulfilled gifts, paid/fulfilled orders, and gift instances remain untouched.
BEGIN;
CREATE OR REPLACE FUNCTION public.vatra_gifts_cancel_order(_order_id bigint) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' SET row_security=off AS $f$
DECLARE changed integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Необхідна авторизація'; END IF;
 DELETE FROM public.vatra_gift_orders WHERE id=_order_id AND buyer_uid=auth.uid() AND status='pending';
 GET DIAGNOSTICS changed=ROW_COUNT;
 RETURN changed=1;
END;$f$;
CREATE OR REPLACE FUNCTION public.vatra_gifts_admin_cancel_order(_order_id bigint) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' SET row_security=off AS $f$
DECLARE changed integer;
BEGIN
 IF auth.uid() IS NULL OR public.vatra_staff_role()<>'owner' THEN RAISE EXCEPTION 'Недостатньо повноважень'; END IF;
 DELETE FROM public.vatra_gift_orders WHERE id=_order_id AND status='pending';
 GET DIAGNOSTICS changed=ROW_COUNT;
 RETURN changed=1;
END;$f$;
-- Historical cancelled orders disappear permanently. This is intentionally destructive
-- ONLY for status='cancelled'; run a production backup before applying.
DELETE FROM public.vatra_gift_orders WHERE status='cancelled';
CREATE OR REPLACE FUNCTION public.vatra_gifts_my_orders() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' SET row_security=off AS $f$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',o.id,'code',o.code,'price',o.price_uah,'status',o.status,'date',o.created_at) ORDER BY o.created_at DESC),'[]'::jsonb)
 FROM public.vatra_gift_orders o WHERE o.buyer_uid=auth.uid() AND o.status<>'cancelled';
$f$;
CREATE OR REPLACE FUNCTION public.vatra_gifts_admin_orders() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' SET row_security=off AS $f$
DECLARE items jsonb;
BEGIN
 IF auth.uid() IS NULL OR public.vatra_staff_role()<>'owner' THEN RAISE EXCEPTION 'Недостатньо повноважень'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',o.id,'uid',o.buyer_uid,'handle',coalesce((select x.value->>'handle' from public.app_data x WHERE x.path='publicProfiles/'||o.buyer_uid::text),'невідомий'),'code',o.code,'price',o.price_uah,'status',o.status,'createdAt',o.created_at,'completedAt',o.completed_at) ORDER BY o.created_at DESC),'[]'::jsonb)
 INTO items FROM (SELECT * FROM public.vatra_gift_orders WHERE status<>'cancelled' ORDER BY created_at DESC LIMIT 150) o;
 RETURN items;
END;$f$;
REVOKE ALL ON FUNCTION public.vatra_gifts_cancel_order(bigint),public.vatra_gifts_admin_cancel_order(bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.vatra_gifts_cancel_order(bigint),public.vatra_gifts_admin_cancel_order(bigint) TO authenticated;
COMMIT;
