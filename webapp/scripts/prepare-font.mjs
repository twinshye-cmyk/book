import { existsSync } from 'node:fs';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
// Nanum Gothic's static TrueType font works reliably in PDF viewers.
// Licensed under SIL OFL 1.1; pin the exact tested font bytes for reproducible builds.
const base='https://raw.githubusercontent.com/google/fonts/main/ofl/nanumgothic/';
const expectedHash='76f45ef4a6bcff344c837c95a7dcc26e017e38b5846d5ae0cdcb5b86be2e2d31';
await mkdir('assets',{recursive:true});await mkdir('lib',{recursive:true});
let font;
if(existsSync('assets/NanumGothic-Regular.ttf'))font=await readFile('assets/NanumGothic-Regular.ttf');
else {const r=await fetch(base+'NanumGothic-Regular.ttf');if(!r.ok)throw new Error('Cannot download Korean font: '+r.status);font=Buffer.from(await r.arrayBuffer());await writeFile('assets/NanumGothic-Regular.ttf',font);}
if(createHash('sha256').update(font).digest('hex')!==expectedHash)throw new Error('Korean font checksum mismatch');
if(!existsSync('assets/NanumGothic-OFL.txt')){const r=await fetch(base+'OFL.txt');if(!r.ok)throw new Error('Cannot download font license: '+r.status);await writeFile('assets/NanumGothic-OFL.txt',await r.text());}
await writeFile('lib/korean-font.ts','export default '+JSON.stringify(font.toString('base64'))+';\n');
console.log('Korean PDF font prepared. SHA256: '+createHash('sha256').update(font).digest('hex'));
