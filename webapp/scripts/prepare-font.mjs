import { existsSync } from 'node:fs';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
// Noto Sans KR is distributed under SIL OFL 1.1. This public upstream contains no credentials.
const base='https://raw.githubusercontent.com/google/fonts/main/ofl/notosanskr/';
await mkdir('assets',{recursive:true});await mkdir('lib',{recursive:true});
let font;
if(existsSync('assets/NotoSansKR-VF.ttf'))font=await readFile('assets/NotoSansKR-VF.ttf');
else {const r=await fetch(base+'NotoSansKR%5Bwght%5D.ttf');if(!r.ok)throw new Error('Cannot download Korean font: '+r.status);font=Buffer.from(await r.arrayBuffer());await writeFile('assets/NotoSansKR-VF.ttf',font);}
if(!existsSync('assets/OFL.txt')){const r=await fetch(base+'OFL.txt');if(!r.ok)throw new Error('Cannot download font license: '+r.status);await writeFile('assets/OFL.txt',await r.text());}
await writeFile('lib/korean-font.ts','export default '+JSON.stringify(font.toString('base64'))+';\n');
console.log('Korean PDF font prepared. SHA256: '+createHash('sha256').update(font).digest('hex'));
