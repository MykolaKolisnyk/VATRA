/* Canonical CSS and JS import guard: no layered same-selector declarations. */
import assert from "node:assert/strict";
import {readFile,readdir} from "node:fs/promises";

function rules(source){
 const clean=source.replace(/\/\*[\s\S]*?\*\//g,m=>m.replace(/[^\n]/g," "));
 let stack=[],from=0,found=[];
 for(let i=0;i<clean.length;i++){
  if(clean[i]==="{"){
   const header=clean.slice(from,i).trim();
   stack.push({header,open:i,at:header.startsWith("@")});
   from=i+1;
  }else if(clean[i]==="}"){
   const entry=stack.pop();
   assert.ok(entry,"Unexpected closing brace in CSS");
   if(!entry.at){
    const scope=stack.filter(x=>x.at).map(x=>x.header.replace(/\s+/g," ")).join("|");
    const selector=entry.header.replace(/\s+/g," ");
    let start=entry.open+1,quote="",depth=0;
    for(let j=start;j<=i;j++){
     const char=clean[j]||";";
     if(quote){if(char==="\\")j++;else if(char===quote)quote="";}
     else if(char==="'"||char==='"')quote=char;
     else if(char==="(")depth++;
     else if(char===")")depth--;
     else if((char===";"&&depth===0)||j===i){
      const segment=clean.slice(start,j).trim();
      const match=segment.match(/^([-\w]+)\s*:\s*([\s\S]+)$/);
      if(match)found.push({key:scope+"::"+selector+"::"+match[1].toLowerCase(),
       selector,prop:match[1],rule:entry.open,line:source.slice(0,start).split("\n").length});
      start=j+1;
     }
    }
   }
   from=i+1;
  }
 }
 assert.equal(stack.length,0,"Unclosed CSS blocks");
 return found;
}
const cssFiles=(await readdir("assets/css")).filter(x=>x.endsWith(".css"));
for(const file of cssFiles){
 const found=rules(await readFile("assets/css/"+file,"utf8")),visited=new Map;
 for(const decl of found){
  const earlier=visited.get(decl.key);
  assert.ok(!earlier||earlier.rule===decl.rule,
   file+": "+decl.selector+" -> "+decl.prop+
   " is redeclared in separate CSS rules at lines "+earlier?.line+" and "+decl.line+
   " with identical selector and at-rule context");
  visited.set(decl.key,{line:decl.line,rule:decl.rule});
 }
}
const htmlFiles=(await readdir(".")).filter(x=>x.endsWith(".html"));
for(const file of htmlFiles){
 const html=await readFile(file,"utf8");
 const scripts=[...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/g)].map(m=>m[1]);
 const styles=[...html.matchAll(/<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["']([^"']+)["']/g)].map(m=>m[1]);
 assert.equal(scripts.length,new Set(scripts).size,file+": duplicate JavaScript import");
 assert.equal(styles.length,new Set(styles).size,file+": duplicate CSS import");
}
console.log("VATRA CSS/JS audit: "+cssFiles.length+" canonical stylesheets and "+htmlFiles.length+" page imports clean.");
