
-- ДОДАТКОВА МІГРАЦІЯ: виконати ПІСЛЯ vatra-gifts.sql.
-- Замовлення лише без грошових списань: спосіб оплати розробник погоджує приватно.
ALTER TABLE public.vatra_gift_catalog ADD COLUMN IF NOT EXISTS price_uah integer NOT NULL DEFAULT 0;
ALTER TABLE public.vatra_gift_catalog ADD CONSTRAINT vatra_gift_price_check CHECK(price_uah>=0);
ALTER TABLE public.vatra_gift_instances DROP CONSTRAINT IF EXISTS vatra_gift_instances_source_check;
ALTER TABLE public.vatra_gift_instances ADD CONSTRAINT vatra_gift_instances_source_check CHECK(source IN ('holiday','developer','transfer','welcome'));
INSERT INTO public.vatra_gift_catalog(code,title,category,sort_order,price_uah) VALUES
('welcome','Перша іскра ВАТРИ','holiday',1,0),
('gold_pumpkin','Золотий гарбуз','premium',110,20),
('rose','Квітка дружби','premium',120,20),
('cocoa','Тепле какао','premium',130,25),
('cupcake','Святковий кекс','premium',140,30),
('lantern','Ліхтарик ВАТРИ','premium',150,35),
('ribbon','Стрічка щастя','premium',160,20),
('sun','Сонечко','premium',170,25),
('teddy','Ведмедик ВАТРИ','premium',180,40),
('hearts','Два серця','premium',190,30),
('firebird','Вогняний птах','premium',200,75)
ON CONFLICT(code) DO UPDATE SET title=excluded.title,sort_order=excluded.sort_order,price_uah=excluded.price_uah;
UPDATE public.vatra_gift_catalog SET price_uah=CASE code
WHEN 'warmth' THEN 30 WHEN 'bouquet' THEN 35 WHEN 'spark' THEN 20 ELSE 0 END
WHERE code IN ('warmth','bouquet','spark','welcome','halloween','newyear','independence');
-- Вітальний подарунок один раз на обліковий запис. У випадку повторного входу дублікат не створиться.
CREATE OR REPLACE FUNCTION public.vatra_gifts_claim_welcome() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' SET row_security=off AS $f$
DECLARE actor uuid:=auth.uid(); inserted integer;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'Необхідна авторизація'; END IF;
 INSERT INTO public.vatra_gift_claims(uid,code,year) VALUES(actor,'welcome',0) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS inserted=ROW_COUNT;
 IF inserted=1 THEN
  INSERT INTO public.vatra_gift_instances(code,owner_uid,source) VALUES('welcome',actor,'welcome');
 END IF;
 RETURN inserted=1;
END;$f$;

CREATE TABLE IF NOT EXISTS public.vatra_gift_orders(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 buyer_uid uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 code text NOT NULL REFERENCES public.vatra_gift_catalog(code),
 price_uah integer NOT NULL CHECK(price_uah>=0),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','fulfilled','cancelled')),
 created_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz,
 handled_by uuid REFERENCES auth.users(id),
 note text
);
CREATE UNIQUE INDEX IF NOT EXISTS vatra_gift_unique_pending_order ON public.vatra_gift_orders(buyer_uid,code) WHERE status='pending';
CREATE INDEX IF NOT EXISTS vatra_gift_orders_status_idx ON public.vatra_gift_orders(status,created_at DESC);
CREATE TABLE IF NOT EXISTS public.vatra_gift_audit(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_uid uuid NOT NULL,
 target_uid uuid NOT NULL,
 gift_id uuid,
 code text NOT NULL,
 action text NOT NULL CHECK(action IN ('issued','revoked','order_fulfilled')),
 note text,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vatra_gift_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vatra_gift_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.vatra_gift_orders,public.vatra_gift_audit FROM anon,authenticated;
-- Сервер звіряє лише UID сесії, а не переданий клієнтом ідентифікатор.
CREATE OR REPLACE FUNCTION public.vatra_gifts_place_order(_code text) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' SET row_security=off AS $f$
DECLARE actor uuid:=auth.uid(); cost integer; order_id bigint;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'Необхідна авторизація'; END IF;
 SELECT c.price_uah INTO cost FROM public.vatra_gift_catalog c
 WHERE c.code=_code AND c.enabled AND c.category='premium' AND c.price_uah>0;
 IF cost IS NULL THEN RAISE EXCEPTION 'Подарунок недоступний для замовлення'; END IF;
 INSERT INTO public.vatra_gift_orders(buyer_uid,code,price_uah) VALUES(actor,_code,cost)
 ON CONFLICT(buyer_uid,code) WHERE status='pending' DO NOTHING RETURNING id INTO order_id;
 IF order_id IS NULL THEN SELECT id INTO order_id FROM public.vatra_gift_orders
 WHERE buyer_uid=actor AND code=_code AND status='pending' LIMIT 1; END IF;
 RETURN order_id;
END;$f$;
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
CREATE OR REPLACE FUNCTION public.vatra_gifts_resolve_handle(_handle text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' SET row_security=off AS $f$
DECLARE result uuid; num integer; target text:=lower(trim(leading '@' from trim(coalesce(_handle,''))));
BEGIN
 IF auth.uid() IS NULL OR public.vatra_staff_role()<>'owner' THEN RAISE EXCEPTION 'Недостатньо повноважень'; END IF;
 IF length(target)<2 THEN RAISE EXCEPTION 'Вкажіть псевдонім користувача'; END IF;
 SELECT count(*),min(substring(path from 16))::uuid INTO num,result FROM public.app_data
 WHERE path LIKE 'publicProfiles/%' AND lower(value->>'handle')=target
 AND substring(path from 16) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
 IF num<>1 THEN RAISE EXCEPTION 'Знайдено % акаунтів. Потрібен єдиний псевдонім.',num; END IF;
 RETURN result;
END;$f$;
CREATE OR REPLACE FUNCTION public.vatra_gifts_admin_inventory(_handle text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' SET row_security=off AS $f$
DECLARE uid uuid:=public.vatra_gifts_resolve_handle(_handle); items jsonb;
BEGIN
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',i.id,'code',i.code,'receivedAt',i.received_at) ORDER BY i.received_at DESC),'[]'::jsonb)
 INTO items FROM public.vatra_gift_instances i WHERE i.owner_uid=uid;
 RETURN jsonb_build_object('uid',uid,'handle',_handle,'items',items);
END;$f$;
CREATE OR REPLACE FUNCTION public.vatra_gifts_admin_grant(_handle text,_code text,_reason text DEFAULT 'Видано вручну') RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' SET row_security=off AS $f$
DECLARE target uuid:=public.vatra_gifts_resolve_handle(_handle); gift uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.vatra_gift_catalog WHERE code=_code AND enabled) THEN RAISE EXCEPTION 'Невідомий подарунок'; END IF;
 INSERT INTO public.vatra_gift_instances(code,owner_uid,source) VALUES(_code,target,'developer') RETURNING id INTO gift;
 INSERT INTO public.vatra_gift_audit(actor_uid,target_uid,gift_id,code,action,note)
 VALUES(auth.uid(),target,gift,_code,'issued',left(coalesce(_reason,''),500));
 RETURN gift;
END;$f$;
CREATE OR REPLACE FUNCTION public.vatra_gifts_admin_revoke(_handle text,_item_id uuid,_reason text DEFAULT 'Відкликано адміністратором') RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' SET row_security=off AS $f$
DECLARE target uuid:=public.vatra_gifts_resolve_handle(_handle); code_value text;
BEGIN
 DELETE FROM public.vatra_gift_instances WHERE id=_item_id AND owner_uid=target RETURNING code INTO code_value;
 IF code_value IS NULL THEN RAISE EXCEPTION 'Цей подарунок не належить вказаному користувачу'; END IF;
 INSERT INTO public.vatra_gift_audit(actor_uid,target_uid,gift_id,code,action,note)
 VALUES(auth.uid(),target,_item_id,code_value,'revoked',left(coalesce(_reason,''),500));
 RETURN true;
END;$f$;
CREATE OR REPLACE FUNCTION public.vatra_gifts_admin_fulfill(_order_id bigint) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' SET row_security=off AS $f$
DECLARE order_row public.vatra_gift_orders%rowtype; gift uuid;
BEGIN
 IF auth.uid() IS NULL OR public.vatra_staff_role()<>'owner' THEN RAISE EXCEPTION 'Недостатньо повноважень'; END IF;
 SELECT * INTO order_row FROM public.vatra_gift_orders WHERE id=_order_id FOR UPDATE;
 IF NOT FOUND OR order_row.status<>'pending' THEN RAISE EXCEPTION 'Замовлення вже виконане або відсутнє'; END IF;
 INSERT INTO public.vatra_gift_instances(code,owner_uid,source) VALUES(order_row.code,order_row.buyer_uid,'developer') RETURNING id INTO gift;
 UPDATE public.vatra_gift_orders SET status='fulfilled',completed_at=now(),handled_by=auth.uid() WHERE id=_order_id;
 INSERT INTO public.vatra_gift_audit(actor_uid,target_uid,gift_id,code,action,note)
 VALUES(auth.uid(),order_row.buyer_uid,gift,order_row.code,'order_fulfilled','Оплату підтверджено адміністратором');
 RETURN gift;
END;$f$;
CREATE OR REPLACE FUNCTION public.vatra_gifts_cancel_order(_order_id bigint) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' SET row_security=off AS $f$
DECLARE changed integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Необхідна авторизація'; END IF;
 DELETE FROM public.vatra_gift_orders WHERE id=_order_id AND buyer_uid=auth.uid() AND status='pending';
 GET DIAGNOSTICS changed=ROW_COUNT;RETURN changed=1;
END;$f$;
REVOKE ALL ON FUNCTION public.vatra_gifts_claim_welcome(),public.vatra_gifts_place_order(text),public.vatra_gifts_my_orders(),public.vatra_gifts_admin_orders(),public.vatra_gifts_resolve_handle(text),public.vatra_gifts_admin_inventory(text),public.vatra_gifts_admin_grant(text,text,text),public.vatra_gifts_admin_revoke(text,uuid,text),public.vatra_gifts_admin_fulfill(bigint),public.vatra_gifts_cancel_order(bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.vatra_gifts_claim_welcome(),public.vatra_gifts_place_order(text),public.vatra_gifts_my_orders(),public.vatra_gifts_admin_orders(),public.vatra_gifts_admin_inventory(text),public.vatra_gifts_admin_grant(text,text,text),public.vatra_gifts_admin_revoke(text,uuid,text),public.vatra_gifts_admin_fulfill(bigint),public.vatra_gifts_cancel_order(bigint) TO authenticated;
-- Допоміжна резолюція псевдоніма використовується лише в SECURITY DEFINER функціях.

-- Офіційні повідомлення по замовленнях. Потрібна vatra-support-desk.sql.
ALTER TABLE public.vatra_gift_orders ADD COLUMN IF NOT EXISTS support_ticket_id bigint;
CREATE OR REPLACE FUNCTION public.vatra_gifts_admin_contact_order(_order_id bigint,_message text)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path='' SET row_security=off AS $f$
DECLARE rowx public.vatra_gift_orders%rowtype; ticket bigint; body_text text:=btrim(coalesce(_message,''));
BEGIN
 IF auth.uid() IS NULL OR public.vatra_staff_role()<>'owner' THEN RAISE EXCEPTION 'Недостатньо повноважень'; END IF;
 IF length(body_text)<5 OR length(body_text)>4000 THEN RAISE EXCEPTION 'Повідомлення має містити 5–4000 символів'; END IF;
 SELECT * INTO rowx FROM public.vatra_gift_orders WHERE id=_order_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Замовлення не знайдено'; END IF;
 ticket:=rowx.support_ticket_id;
 IF ticket IS NULL THEN
  INSERT INTO public.vatra_support_tickets(requester_uid,assigned_uid,subject,status)
  VALUES(rowx.buyer_uid,auth.uid(),'Замовлення подарунка ВАТРИ №'||_order_id,'in_progress') RETURNING id INTO ticket;
  UPDATE public.vatra_gift_orders SET support_ticket_id=ticket WHERE id=_order_id;
 END IF;
 INSERT INTO public.vatra_support_messages(ticket_id,sender_uid,body) VALUES(ticket,auth.uid(),body_text);
 UPDATE public.vatra_support_tickets SET last_activity_at=now(),status='in_progress' WHERE id=ticket;
 RETURN ticket;
END;$f$;
REVOKE ALL ON FUNCTION public.vatra_gifts_admin_contact_order(bigint,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.vatra_gifts_admin_contact_order(bigint,text) TO authenticated;
