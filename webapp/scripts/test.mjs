import ts from 'typescript';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
for(const file of ['lib/server.ts','lib/exports.ts','lib/korean-font.ts','tests/integration.ts']){
 const out=path.join('.sites-runtime/test',file.replace(/\.ts$/,'.mjs'));await mkdir(path.dirname(out),{recursive:true});
 const js=ts.transpileModule(await readFile(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace(/from (['"])(\.[^'"]*)\1/g,(_,q,p)=>`from ${q}${p}.mjs${q}`);
 await writeFile(out,js);
}
const r=spawnSync(process.execPath,['--experimental-sqlite','.sites-runtime/test/tests/integration.mjs'],{stdio:'inherit'});process.exit(r.status??1);
