/* Offline VPS packaging checks. No server, secrets or production traffic. */
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {readFile,stat} from "node:fs/promises";

const hostname="vatra.example.org";
const launched=spawnSync(process.execPath,["deploy/vps/build.mjs"],{
 env:{...process.env,VATRA_DOMAIN:hostname},encoding:"utf8"
});
assert.equal(launched.status,0,
 "VPS static build failed:\n"+(launched.stderr||launched.stdout));
const root="dist/vps/VATRA/";
const sourceHost=await readFile("assets/js/host.js","utf8");
const renderedHost=await readFile(root+"assets/js/host.js","utf8");
const profile=await readFile(root+"profile.html","utf8");
const community=await readFile(root+"club.html","utf8");
const config=await readFile("deploy/vps/Caddyfile","utf8");
assert.ok(renderedHost.includes('location.hostname==="'+hostname+'"')&&
 !renderedHost.includes('location.hostname==="mykolakolisnyk.github.io"')&&
 renderedHost.includes("window.VATRA_HTTP200_ROUTES=")&&
 renderedHost.includes("location.pathname"),
 "Only the approved VPS hostname must pass the generated host guard");
assert.ok(sourceHost.includes('location.hostname==="mykolakolisnyk.github.io"')&&
 !sourceHost.includes("window.VATRA_HTTP200_ROUTES"),
 "The GitHub Pages host guard must remain unchanged");
assert.ok(profile.includes('<base href="/VATRA/">')&&
 community.includes('<base href="/VATRA/">')&&
 profile.includes('src="assets/js/profile.js"')&&
 community.includes('src="assets/js/communities.js"'),
 "Root-level clean permalinks must load their relative JS and styles from /VATRA/");
assert.ok((await stat(root+"assets/css/profile.css")).isFile()&&
 (await stat(root+"assets/i18n/uk.json")).isFile(),
 "Build must include localized styles and public assets");
assert.ok(config.includes('@member path_regexp member ^/(?:VATRA/)?id')&&
 config.includes('@community path_regexp community ^/(?:VATRA/)?club')&&
 config.includes('rewrite * /VATRA/profile.html')&&
 config.includes('rewrite * /VATRA/club.html')&&
 config.includes('handle_errors 404'),
 "Caddy must serve public member and club links with HTTP 200 and preserve true 404s");
console.log("VATRA VPS static build, exact-host guard, root paths and Caddy routing: OK");
