import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=path=>readFile(path,"utf8");
const [sql,composer,feed,profile,interactions,style,feedStyle]=await Promise.all([
 read("_development/supabase/migrations/20261123161115_feed_polls_and_scheduled_posts.sql"),
 read("assets/js/post-composer-ui.js"),read("assets/js/feed.js"),
 read("assets/js/profile.js"),read("assets/js/post-interactions.js"),
 read("assets/css/post-composer.css"),read("assets/css/feed.css")
]);
const required={
 sql:[
  "ADD COLUMN IF NOT EXISTS poll jsonb","CREATE TABLE IF NOT EXISTS public.post_poll_votes",
  "CREATE TABLE IF NOT EXISTS public.post_poll_counts",
  "CREATE OR REPLACE VIEW public.post_poll_voters WITH (security_invoker=true)",
  "CREATE TABLE IF NOT EXISTS public.post_poll_visible_choices",
  "Read nonanonymous choices on visible posts",
  "vatra_scheduler.sync_visible_poll_choices()",
  "CREATE TRIGGER vatra_sync_visible_poll_choices",
  "voter_vatra_id bigint NOT NULL",
  "(posts.poll->>'anonymous')='false'",
  "NEW.voter_vatra_id FROM public.accounts",
  "CREATE TABLE IF NOT EXISTS public.scheduled_feed_posts",
  "ENABLE ROW LEVEL SECURITY","SELECT auth.uid()",
  "CREATE TRIGGER vatra_poll_vote_guard","CREATE TRIGGER vatra_poll_vote_counts",
  'CREATE POLICY "Remove own poll vote" ON public.post_poll_votes FOR DELETE TO authenticated',
  "AND p.poll IS NOT NULL AND (p.poll->>'allow_revote')='true'",
  "IF TG_OP='DELETE' THEN RETURN OLD; END IF;",
  "post_poll_votes_voter_id_idx","post_poll_visible_choices_vatra_id_idx",
  "scheduled_feed_posts_published_post_id_idx",
  "Only an untouched pending post may be scheduled",
  "SECURITY DEFINER SET search_path = ''",
  "FOR UPDATE SKIP LOCKED","AS RESTRICTIVE FOR ALL TO authenticated",
  "vatra_admin_private.allowed()","Author account is not active",
  "FROM public.account_states s WHERE s.vatra_id=queued.author_vatra_id",
  "REVOKE ALL ON FUNCTION vatra_scheduler.publish_due_posts() FROM PUBLIC, anon, authenticated",
  "cron.schedule('vatra-publish-scheduled-feed'",
 ],
 composer:["function getPoll()","const getScheduledAt=()=>","const pollQuestion=","const scheduleInput="],
 feed:["getPoll?.()","getScheduledAt?.()",'client.from(publishAt?"scheduled_feed_posts":"feed_posts")'],
 profile:["getPoll?.()","getScheduledAt?.()",'client.from(publishAt?"scheduled_feed_posts":"feed_posts")',
  "postSaved=true","if(uploaded&&!postSaved)","try{await loadPosts(client,ownId,ownId,user.id);}" ],
 interactions:['client.from("post_poll_votes")','client.from("post_poll_counts")',
  'client.from("post_poll_voters")','.contains("choices",[index])',
  'data.anonymous','vatra-post-poll-voters-panel-001',
  'if(response.error||!response.data)','if(r.error||!r.data)',
  'votersPageSize=20','.range(offset,offset+votersPageSize-1)',
  'vatra-post-poll-voters-more-button-001',
  'function mountPoll(','if(kind==="person"&&post.poll)mountPoll('],
 style:[".vatra-post-composer-poll-question-001",".vatra-post-composer-schedule-date-001"],
 feedStyle:[".vatra-post-poll-voters-more-button-001"]
};
const contents={sql,composer,feed,profile,interactions,style,feedStyle};
for(const [name,patterns] of Object.entries(required))
 for(const expected of patterns)
  assert.ok(contents[name].includes(expected),name+": missing "+expected);
assert.ok(!sql.includes("Read nonanonymous poll voters for visible posts"),
 "Private auth user IDs must not become queryable to other voters.");
assert.ok(sql.includes("REVOKE ALL ON public.post_poll_visible_choices FROM PUBLIC, anon, authenticated")&&
 sql.includes("GRANT SELECT ON public.post_poll_visible_choices TO authenticated"),
 "The public identity mapping must be read-only and RLS-limited.");
assert.ok(sql.indexOf("CREATE SCHEMA IF NOT EXISTS vatra_scheduler")<
 sql.indexOf("vatra_scheduler.sync_visible_poll_choices()"),
 "The private schema must exist before poll sync triggers.");
assert.ok(sql.includes("USING (voter_id=(SELECT auth.uid())"),
 "Vote read policy must be scoped to the authenticated voter.");
assert.ok(sql.includes("EXISTS(SELECT 1 FROM public.feed_posts"),
 "Poll counters must be restricted by visible feed posts.");
assert.ok(sql.includes("status='queued'")&&sql.includes("status='published'"),
 "Scheduled posts need a durable queue/published lifecycle.");
assert.ok(!composer.includes("setTimeout(()=>form.requestSubmit()"),
 "Scheduling must never use a browser timer for publishing.");
for(const lang of ["en","pl","de","fr","it","ka","bg"]){
 const dict=JSON.parse(await read("assets/i18n/"+lang+".json"));
 for(const key of ["Опитування","Запланувати публікацію","Голосувати",
  "Дата і час публікації","Заплановані публікації",
  "Хто проголосував","Не вдалося завантажити учасників."]){
  assert.ok(typeof dict[key]==="string"&&dict[key]!==key,
   lang+": missing translated key: "+key);
 }
}
console.log("VATRA post planning: secure poll counters, UI and server queue contracts verified.");
