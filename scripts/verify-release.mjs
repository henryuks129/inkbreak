import {readFile,readdir,stat} from 'node:fs/promises';
import {resolve,join,extname,dirname} from 'node:path';
import assert from 'node:assert/strict';

const root=resolve(import.meta.dirname,'..'),dist=join(root,'dist');
const exists=async path=>{try{await stat(path);return true;}catch{return false;}};
assert.equal(await exists(join(root,'index.html')),false,'Root source index would shadow dist on start.ng.');
const html=await readFile(join(dist,'index.html'),'utf8');
assert.ok(!/\/src\/|\.tsx?["']/.test(html),'Build must not reference TypeScript sources.');
const allowed=new Set('html htm css js mjs json map txt svg png jpg jpeg gif webp avif ico woff woff2 ttf otf mp3 ogg wav mp4 webm wasm'.split(' '));
let files=0,bytes=0;const scripts=[],pages=[],styles=[];
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){assert.ok(!entry.isSymbolicLink(),'No symlinks in release');const path=join(dir,entry.name);if(entry.isDirectory())await walk(path);else{assert.ok(allowed.has(extname(path).slice(1)),`Unsupported file ${path}`);const size=(await stat(path)).size;assert.ok(size<=25*1024*1024,`File too large ${path}`);files++;bytes+=size;if(extname(path)==='.js')scripts.push(await readFile(path,'utf8'));if(extname(path)==='.html')pages.push(path);if(extname(path)==='.css')styles.push(path);}}}
await walk(dist);assert.ok(files<=2000&&bytes<=100*1024*1024,'Release exceeds start.ng limits');
const code=scripts.join('\n');assert.ok(code.includes('startng:whoami')&&code.includes('https://start.ng'),'Missing player integration');
const png=await readFile(join(dist,'cover.png'));assert.equal(png.subarray(1,4).toString(),'PNG');const width=png.readUInt32BE(16),height=png.readUInt32BE(20);assert.ok(width>=640&&height>=400&&width/height===1.6,'Cover must be 16:10 and at least 640x400');assert.ok(png.length<2*1024*1024,'Cover exceeds 2MB');
async function checkReference(path,url){if(url.startsWith('#')||url.startsWith('data:')||url.startsWith('https://'))return;assert.ok(!url.startsWith('/')&&!url.startsWith('http:'),`Nonrelative or insecure asset ${url}`);assert.ok(await exists(resolve(dirname(path),url.split(/[?#]/)[0])),`Missing asset ${url} from ${path}`);}
for(const path of pages)for(const match of (await readFile(path,'utf8')).matchAll(/(?:src|href)=["']([^"']+)["']/g))await checkReference(path,match[1]);
for(const path of styles)for(const match of (await readFile(path,'utf8')).matchAll(/url\(["']?([^"')]+)["']?\)/g))await checkReference(path,match[1]);
console.log(JSON.stringify({ok:true,files,bytes,cover:{width,height,bytes:png.length},entry:'dist/index.html',playerIntegration:true},null,2));
