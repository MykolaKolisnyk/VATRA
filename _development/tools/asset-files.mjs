import {readdir} from "node:fs/promises";
export async function assetFiles(root,extension){
 const files=[];
 async function walk(directory,prefix=""){
  for(const entry of await readdir(directory,{withFileTypes:true})){
   const relative=prefix+entry.name;
   if(entry.isDirectory())await walk(directory+"/"+entry.name,relative+"/");
   else if(entry.isFile()&&entry.name.endsWith(extension))files.push(relative);
  }
 }
 await walk(root);
 return files.sort();
}
