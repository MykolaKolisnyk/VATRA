/* Prepare VATRA static files for a self-managed Caddy VPS.
   Never change the GitHub Pages sources, and never publish .github, tools,
   email templates, or deployment instructions as website assets. */
import {cp,mkdir,readdir,readFile,rm,writeFile} from "node:fs/promises";
import {dirname,join,resolve,sep} from "node:path";
import {fileURLToPath} from "node:url";

const repository=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const output=join(repository,"dist","vps");
const website=join(output,"VATRA");
const domain=String(process.env.VATRA_DOMAIN||"").toLowerCase().trim();
if(!/^(?=.{4,253}$)[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(domain)||
 domain.split(".").some(label=>label.startsWith("-")||label.endsWith("-"))||
 domain.endsWith(".github.io")){
 throw new Error("Set VATRA_DOMAIN to your own public DNS hostname, e.g. vatra.example.org");
}
if(!output.startsWith(repository+sep))throw new Error("Invalid build path");
await rm(output,{recursive:true,force:true});
await mkdir(website,{recursive:true});

const documents=(await readdir(repository)).filter(name=>name.endsWith(".html"));
if(!documents.includes("profile.html")||!documents.includes("club.html")||
 !documents.includes("404.html"))throw new Error("VATRA public pages missing");
const oldOrigin="https://mykolakolisnyk.github.io/VATRA";
const newOrigin="https://"+domain+"/VATRA";
for(const name of documents){
 let content=await readFile(join(repository,name),"utf8");
 content=content.replaceAll(oldOrigin,newOrigin);
 // Profile and community HTML may be served at /id123 or /club123.
 // Keep their CSS, JS and relative URLs anchored at /VATRA/.
 content=content.replace(/<head(\s[^>]*)?>/i,match=>match+'\n  <base href="/VATRA/">');
 await writeFile(join(website,name),content);
}
await cp(join(repository,"assets"),join(website,"assets"),{recursive:true});
for(const name of ["site.webmanifest","sw.js","sitemap.xml"]){
 let content=await readFile(join(repository,name),"utf8");
 if(name==="sitemap.xml")content=content.replaceAll(oldOrigin,newOrigin);
 await writeFile(join(website,name),content);
}

const hostPath=join(website,"assets","js","host.js");
let guard=await readFile(hostPath,"utf8");
const expected='location.hostname==="mykolakolisnyk.github.io"';
if(guard.split(expected).length!==2)
 throw new Error("Official-host policy changed; inspect host.js before VPS deployment");
guard=guard.replace(expected,'location.hostname==='+JSON.stringify(domain))
 .replaceAll(oldOrigin,newOrigin);
const oldPath='/^\\/VATRA(?:\\/|$)/.test(location.pathname)';
if(guard.split(oldPath).length!==2)
 throw new Error("Official path policy changed; review host.js before VPS deployment");
guard=guard.replace(oldPath,
 '(/^\\/VATRA(?:\\/|$)/.test(location.pathname)||'+
 '/^\\/(?:id|club)[1-9][0-9]{0,18}$/.test(location.pathname)||'+
 '/^\\/(?:feed|profile|club|communities|notifications|create-account|forgot|reset|verify|terms|privacy|cookies|offline)$/.test(location.pathname)||'+
 'location.pathname==="/")');
guard+="\n// Server-rendered permalinks on the VPS are genuine HTTP 200 responses.\n";
guard+="window.VATRA_HTTP200_ROUTES=window.VATRA_HOST_ALLOWED===true;\n";
await writeFile(hostPath,guard);
console.log("VATRA VPS site:",website);
console.log("Hostname:",domain,"| pages:",documents.length);
console.log("Deploy the contents of dist/vps/ to /srv/vatra/www/ on your VPS.");
