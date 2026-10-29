import { zipSync, strToU8 } from 'fflate';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fontBase64 from './korean-font';
import type { Entry } from './server';
const date=(n:number)=>new Date(n).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'});
const xml=(s:string)=>s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
export function exportXlsx(rows:Entry[]) {
  const data=[['학번','이름','책 제목','작가','감상문','제출 일시','확인 상태'],...rows.map(r=>[r.student_id,r.name,r.title,r.author,r.review,date(r.created_at),r.reviewed?'확인 완료':'미확인'])];
  const content=data.map((r,i)=>`<row r="${i+1}">${r.map((s,j)=>`<c r="${String.fromCharCode(65+j)}${i+1}" t="inlineStr" s="${i?0:1}"><is><t xml:space="preserve">${xml(s)}</t></is></c>`).join('')}</row>`).join('');
  const files:Record<string,string>={
    '[Content_Types].xml':'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
    '_rels/.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml':'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="독후감" sheetId="1" r:id="rId1"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    'xl/styles.xml':'<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="맑은 고딕"/></font><font><b/><sz val="11"/><name val="맑은 고딕"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>',
    'xl/worksheets/sheet1.xml':`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="2" width="18" customWidth="1"/><col min="3" max="4" width="30" customWidth="1"/><col min="5" max="5" width="80" customWidth="1"/><col min="6" max="7" width="24" customWidth="1"/></cols><sheetData>${content}</sheetData><autoFilter ref="A1:G${data.length}"/></worksheet>`
  };
  return zipSync(Object.fromEntries(Object.entries(files).map(([k,v])=>[k,strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+v)])),{level:6});
}
export async function exportPdf(rows:Entry[]) {
  const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
  const bytes=Uint8Array.from(atob(fontBase64),c=>c.charCodeAt(0)),font=await doc.embedFont(bytes,{subset:true});
  doc.setTitle('우리 반 독서 기록장');doc.setCreator('우리 반 독서 기록장');
  const characters=new Set(font.getCharacterSet());
  let page=doc.addPage([595.28,841.89]),y=790;
  const line=(s:string,size=10,color=rgb(.14,.18,.17))=>{
    if(y<55){page=doc.addPage([595.28,841.89]);y=790;}
    page.drawText(s,{x:44,y,size,font,color});y-=size*1.7;
  };
  const paragraph=(s:string,size=10)=>{
    for(const original of s.replace(/\r\n?/g,'\n').split('\n')) {
      let current='';
      for(const ch of original.replace(/[\u0000-\u001f\u007f]/g,' ')) {
        // Replace unsupported emoji/symbols rather than silently producing broken glyphs.
        const safe=characters.has(ch.codePointAt(0)!)?ch:'□';
        if(font.widthOfTextAtSize(current+safe,size)>505){line(current,size);current='';}current+=safe;
      }
      line(current||' ',size);
    }
  };
  paragraph('우리 반 독서 기록장',20);paragraph(`독후감 ${rows.length}건 · ${date(Date.now())}`,9);y-=18;
  if(!rows.length)paragraph('저장할 제출물이 없습니다.');
  for(const r of rows){if(y<130){page=doc.addPage([595.28,841.89]);y=790;}paragraph(r.title,14);paragraph(`${r.student_id} · ${r.name} | ${r.author}`,9);paragraph(`${date(r.created_at)} · ${r.reviewed?'확인 완료':'미확인'}`,9);y-=6;paragraph(r.review);y-=22;}
  const pages=doc.getPages();pages.forEach((p,i)=>p.drawText(`${i+1} / ${pages.length}`,{x:280,y:28,size:8,font}));
  return doc.save();
}
