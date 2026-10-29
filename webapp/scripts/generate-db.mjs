import ts from 'typescript';
import { generateSQLiteDrizzleJson, generateSQLiteMigration } from 'drizzle-kit/api';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
await mkdir('.sites-runtime',{recursive:true});
await writeFile('.sites-runtime/schema.mjs',ts.transpileModule(await readFile('db/schema.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
const schema=await import('../.sites-runtime/schema.mjs?'+Date.now());
const journal=JSON.parse(await readFile('drizzle/meta/_journal.json','utf8'));
let previous=await generateSQLiteDrizzleJson({});
previous.id='00000000-0000-0000-0000-000000000000';
if(journal.entries.length){const n=String(journal.entries.length-1).padStart(4,'0');previous=JSON.parse(await readFile(`drizzle/meta/${n}_snapshot.json`,'utf8'));}
const snapshot=await generateSQLiteDrizzleJson(schema,previous.id);
const statements=await generateSQLiteMigration(previous,snapshot);
if(!statements.length){console.log('No schema changes');process.exit(0);}
const idx=journal.entries.length,prefix=String(idx).padStart(4,'0'),tag=prefix+'_reading_journal';
journal.entries.push({idx,version:'6',when:Date.now(),tag,breakpoints:true});
await writeFile(`drizzle/${tag}.sql`,statements.join('\n--> statement-breakpoint\n'));
await writeFile(`drizzle/meta/${prefix}_snapshot.json`,JSON.stringify(snapshot,null,2));
await writeFile('drizzle/meta/_journal.json',JSON.stringify(journal,null,2));
console.log(`Generated ${tag}: ${statements.length} statements`);
