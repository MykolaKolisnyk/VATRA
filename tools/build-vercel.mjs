/* Build VATRA for a host that can return HTTP 200 for clean permalink routes.
   GitHub Pages continues to publish the source tree as before. */
import {cp, mkdir, readFile, rm, writeFile} from "node:fs/promises";
import {dirname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";

const projectRoot=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const output=join(projectRoot,"dist");
const site=join(output,"VATRA");
const pages=[
 "404","club","communities","cookies","create-account","feed","forgot",
 "index","notifications","offline","privacy","profile","reset","terms","verify"
];
const siteFiles=["site.webmanifest","sitemap.xml","sw.js"];
const originalOrigin="https://mykolakolisnyk.github.io/VATRA";

function validHostname(value){
 if(!value)return null;
 let url;
 try{url=new URL(String(value).startsWith("https://")?String(value):"https://"+value);}
 catch{throw new Error("Invalid VATRA deployment hostname");}
 if(url.protocol!=="https:"||url.pathname!=="/"||url.search||url.hash||
  !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(url.hostname))
  throw new Error("Invalid VATRA deployment hostname");
 return url.hostname;
}
const deployedHosts=[...new Set([
 process.env.VERCEL_URL,
 process.env.VERCEL_BRANCH_URL,
 process.env.VERCEL_PROJECT_PRODUCTION_URL,
 process.env.VATRA_OFFICIAL_HOST
].map(validHostname).filter(Boolean))];
if(process.env.VERCEL==="1"&&!deployedHosts.length){
 throw new Error("VATRA: enable 'Automatically expose System Environment Variables' in Vercel settings, or set VATRA_OFFICIAL_HOST");
}
const canonicalHost=validHostname(
 process.env.VERCEL_PROJECT_PRODUCTION_URL||process.env.VATRA_OFFICIAL_HOST
);

await rm(output,{recursive:true,force:true});
await mkdir(site,{recursive:true});
await cp(join(projectRoot,"assets"),join(site,"assets"),{recursive:true});

for(const page of pages){
 const file=page+".html";
 let html=await readFile(join(projectRoot,file),"utf8");
 // Keep the canonical production origin correct on the new host. GitHub Pages
 // continues to use the untouched source files.
 if(canonicalHost)html=html.replaceAll(originalOrigin,"https://"+canonicalHost+"/VATRA");
 await writeFile(join(site,file),html);
}
for(const file of siteFiles){
 let data=await readFile(join(projectRoot,file),"utf8");
 if(canonicalHost&&file==="sitemap.xml")
  data=data.replaceAll(originalOrigin,"https://"+canonicalHost+"/VATRA");
 await writeFile(join(site,file),data);
}
// Vercel uses the top-level 404.html for truly unknown paths.
await cp(join(site,"404.html"),join(output,"404.html"));

// GitHub Pages must keep its strict official-host check. The Vercel output
// trusts only the exact deployment aliases supplied by Vercel itself.
const hostScript=join(site,"assets/js/host.js");
let code=await readFile(hostScript,"utf8");
const match='location.hostname==="mykolakolisnyk.github.io" &&';
if(code.split(match).length!==2)throw new Error("VATRA host guard changed; review build before publishing");
code=code.replace(match,
 '(["mykolakolisnyk.github.io",...'+JSON.stringify(deployedHosts)+'].includes(location.hostname)) &&');
code+='\n// This deployment resolves member/club permalinks directly with HTTP 200.\nwindow.VATRA_HTTP200_ROUTES=window.VATRA_HOST_ALLOWED===true;\n';
await writeFile(hostScript,code);

console.log("VATRA Vercel output ready:",pages.length,"pages and static assets, /VATRA/idN + /VATRA/clubN rewrites.");
