import { storyIsExpired, storyMediaPath, storyPrivateMediaPath } from "./index.ts";

const owner = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const site = "https://example.supabase.co";
const row = (createdAt: number, mediaUrl = site +
  "/storage/v1/object/public/vatra-media/" + owner + "/posts/1710000000-demo.jpg") =>
  ({ path: "posts/aaa", value: { kind: "story", authorUid: owner, createdAt, mediaUrl } });
const expect = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

Deno.test("only owner-authored stories older than 24 hours expire", () => {
  const now = 48 * 60 * 60 * 1000;
  expect(storyIsExpired(row(now - 24 * 60 * 60 * 1000), now), "Exactly 24 hours must expire");
  expect(!storyIsExpired(row(now - 23 * 60 * 60 * 1000), now), "Fresh story must survive");
  expect(!storyIsExpired({ ...row(1), path: "users/aaa" }, now), "Other data paths must survive");
  expect(!storyIsExpired({ path: "posts/a", value: { ...row(1).value, kind: "post" } }, now), "Normal posts must survive");
});

Deno.test("cleanup only deletes a same-owner VATRA media object", () => {
  const old = row(1);
  expect(storyMediaPath(old, site) === owner + "/posts/1710000000-demo.jpg", "Owner upload should match");
  expect(storyMediaPath(row(1, site + "/storage/v1/object/public/vatra-media/" + other + "/posts/a.jpg"), site) === null, "Other user must be protected");
  expect(storyMediaPath(row(1, "https://evil.example/storage/v1/object/public/vatra-media/" + owner + "/posts/a.jpg"), site) === null, "Other origins must be rejected");
  expect(storyMediaPath(row(1, site + "/storage/v1/object/public/vatra-media/" + owner + "/posts/%2e%2e%2fother.jpg"), site) === null, "Path traversal must be rejected");
});

Deno.test("private Stories cleanup accepts only its own complete path",()=>{
 const id="1234567890abcdef1234567890abcdef";
 const data={path:"posts/"+id,value:{kind:"story",authorUid:owner,createdAt:1,
   mediaBucket:"vatra-stories",mediaPath:owner+"/stories/"+id+".webp"}};
 expect(storyPrivateMediaPath(data)===data.value.mediaPath,"Private file belongs to story");
 expect(storyPrivateMediaPath({...data,value:{...data.value,mediaPath:other+"/stories/"+id+".webp"}})===null,"Never delete another author's file");
 expect(storyPrivateMediaPath({...data,value:{...data.value,mediaPath:owner+"/stories/different123456789012345678901234.webp"}})===null,"Never delete unrelated story media");
 expect(storyPrivateMediaPath({...data,value:{...data.value,mediaPath:owner+"/stories/"+id+".webp/../x"}})===null,"Refuse traversal");
 expect(storyPrivateMediaPath({...data,value:{...data.value,mediaBucket:"vatra-media"}})===null,"Require private bucket");
});
