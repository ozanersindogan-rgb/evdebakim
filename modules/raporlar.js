// ── RAPORLAR (Mahalle + Export + Sayi Ver) ──
// ═══════════════════════════════════════════════════════════
// MAHALLE RAPORU
// ═══════════════════════════════════════════════════════════
function renderMahalle() {
  const ay=document.getElementById('mah-ay').value;
  const hiz=document.getElementById('mah-hizmet').value;
  const data=allData.filter(r=>(!ay||r.AY===ay)&&(!hiz||r['HİZMET']===hiz));
  const stats={};
  data.forEach(r=>{
    const m=r.MAHALLE||'—';
    if(!stats[m])stats[m]={aktif:0,iptal:0,vefat:0,pasif:0,bekleme:0,total:0,ziyaret:0};
    stats[m].total++;
    const d=r.DURUM;
    if(d==='AKTİF')stats[m].aktif++;
    else if(d==='İPTAL')stats[m].iptal++;
    else if(d==='VEFAT')stats[m].vefat++;
    else if(d==='PASİF')stats[m].pasif++;
    else if(d==='BEKLEME')stats[m].bekleme++;
    stats[m].ziyaret+=[r.BANYO1,r.BANYO2,r.BANYO3,r.BANYO4,r.BANYO5,r.SAC1,r.SAC2,r.TIRNAK1,r.TIRNAK2,r.SAKAL1,r.SAKAL2].filter(Boolean).length;
  });
  const sorted=Object.entries(stats).filter(([m])=>m&&m!=='—').sort((a,b)=>b[1].aktif-a[1].aktif);
  const el=document.getElementById('mah-tablo');
  if(!el)return;
  if(!sorted.length){el.innerHTML='<p style="color:var(--text-soft);text-align:center;padding:30px">Veri yok</p>';return;}
  const hzRenk={'KADIN BANYO':'#C2185B','ERKEK BANYO':'#1565C0','KUAFÖR':'#7c3aed','TEMİZLİK':'#0d9488'};
  const baslikRenk=hiz?(hzRenk[hiz]||'#1A237E'):'#1A237E';
  let tA=0,tI=0,tV=0,tP=0,tB=0,tT=0,tZ=0;
  sorted.forEach(([m,s])=>{tA+=s.aktif;tI+=s.iptal;tV+=s.vefat;tP+=s.pasif;tB+=s.bekleme;tT+=s.total;tZ+=s.ziyaret;});
  el.innerHTML=`<table style="width:100%;border-collapse:collapse;font-size:13px">
    <thead><tr style="background:${baslikRenk};color:#fff">
      <th style="padding:10px 12px;text-align:left">MAHALLE</th>
      <th style="padding:10px 8px;text-align:center">AKTİF</th>
      <th style="padding:10px 8px;text-align:center">İPTAL</th>
      <th style="padding:10px 8px;text-align:center">VEFAT</th>
      <th style="padding:10px 8px;text-align:center">PASİF</th>
      <th style="padding:10px 8px;text-align:center">BEKLEME</th>
      <th style="padding:10px 8px;text-align:center">TOPLAM</th>
      <th style="padding:10px 8px;text-align:center">ZİYARET</th>
    </tr></thead><tbody>
    ${sorted.map(([m,s],i)=>{
      const bg=i%2===0?'#fff':'#f8fafc';
      return `<tr style="background:${bg}">
        <td style="padding:9px 12px;font-weight:700;border-bottom:1px solid #e2e8f0">${m}</td>
        <td style="padding:9px 8px;text-align:center;border-bottom:1px solid #e2e8f0;font-weight:800;color:#1B5E20">${s.aktif||'—'}</td>
        <td style="padding:9px 8px;text-align:center;border-bottom:1px solid #e2e8f0;color:#B71C1C">${s.iptal||'—'}</td>
        <td style="padding:9px 8px;text-align:center;border-bottom:1px solid #e2e8f0">${s.vefat||'—'}</td>
        <td style="padding:9px 8px;text-align:center;border-bottom:1px solid #e2e8f0;color:#546E7A">${s.pasif||'—'}</td>
        <td style="padding:9px 8px;text-align:center;border-bottom:1px solid #e2e8f0;color:#F57F17">${s.bekleme||'—'}</td>
        <td style="padding:9px 8px;text-align:center;border-bottom:1px solid #e2e8f0;font-weight:700;color:#1A237E">${s.total}</td>
        <td style="padding:9px 8px;text-align:center;border-bottom:1px solid #e2e8f0;font-weight:700;color:#7c3aed">${s.ziyaret}</td>
      </tr>`;
    }).join('')}
    <tr style="background:#EEF2FF;font-weight:900">
      <td style="padding:10px 12px;color:#1A237E">TOPLAM</td>
      <td style="padding:10px 8px;text-align:center;color:#1B5E20">${tA}</td>
      <td style="padding:10px 8px;text-align:center;color:#B71C1C">${tI}</td>
      <td style="padding:10px 8px;text-align:center">${tV}</td>
      <td style="padding:10px 8px;text-align:center;color:#546E7A">${tP}</td>
      <td style="padding:10px 8px;text-align:center;color:#F57F17">${tB}</td>
      <td style="padding:10px 8px;text-align:center;color:#1A237E">${tT}</td>
      <td style="padding:10px 8px;text-align:center;color:#7c3aed">${tZ}</td>
    </tr></tbody></table>`;
}

async function mahIndir() {
  const ay=document.getElementById('mah-ay').value;
  const hiz=document.getElementById('mah-hizmet').value;
  const data=allData.filter(r=>(!ay||r.AY===ay)&&(!hiz||r['HİZMET']===hiz));
  const stats={};
  data.forEach(r=>{
    const m=r.MAHALLE||'—';
    if(!stats[m])stats[m]={aktif:0,iptal:0,vefat:0,pasif:0,bekleme:0,total:0,ziyaret:0};
    stats[m].total++;const d=r.DURUM;
    if(d==='AKTİF')stats[m].aktif++;
    else if(d==='İPTAL')stats[m].iptal++;
    else if(d==='VEFAT')stats[m].vefat++;
    else if(d==='PASİF')stats[m].pasif++;
    else if(d==='BEKLEME')stats[m].bekleme++;
    stats[m].ziyaret+=[r.BANYO1,r.BANYO2,r.BANYO3,r.BANYO4,r.BANYO5,r.SAC1,r.SAC2,r.TIRNAK1,r.TIRNAK2,r.SAKAL1,r.SAKAL2].filter(Boolean).length;
  });
  const sorted=Object.entries(stats).filter(([m])=>m&&m!=='—').sort((a,b)=>b[1].aktif-a[1].aktif);
  if(!sorted.length){showToast('Veri yok');return;}
  try {
    const te=new TextEncoder();const e=s=>te.encode(s);
    const esc=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const ss=[];const ssIdx={};
    const S=v=>{const k=String(v==null?'':v);if(!k)return null;if(ssIdx[k]===undefined){ssIdx[k]=ss.length;ss.push(k);}return ssIdx[k];};
    const rows=[];
    rows.push([{v:S('MAHALLE'),s:0},{v:S('AKTİF'),s:0},{v:S('İPTAL'),s:0},{v:S('VEFAT'),s:0},{v:S('PASİF'),s:0},{v:S('BEKLEME'),s:0},{v:S('TOPLAM KAYIT'),s:0},{v:S('TOPLAM ZİYARET'),s:0}]);
    rows.push([{v:S((ay||'Tüm Aylar')+' / '+(hiz||'Tüm Hizmetler')),s:6},{v:S(''),s:6},{v:S(''),s:6},{v:S(''),s:6},{v:S(''),s:6},{v:S(''),s:6},{v:S(''),s:6},{v:S(''),s:6}]);
    rows.push([{v:S(''),s:1},{v:S(''),s:1},{v:S(''),s:1},{v:S(''),s:1},{v:S(''),s:1},{v:S(''),s:1},{v:S(''),s:1},{v:S(''),s:1}]);
    let tA=0,tI=0,tV=0,tP=0,tB=0,tT=0,tZ=0;
    sorted.forEach(([m,s],i)=>{
      const si=i%2===0?1:2;
      rows.push([{v:S(m),s:si},{v:s.aktif,s:4,n:true},{v:s.iptal,s:3,n:true},{v:s.vefat,s:3,n:true},{v:s.pasif,s:3,n:true},{v:s.bekleme,s:3,n:true},{v:s.total,s:3,n:true},{v:s.ziyaret,s:3,n:true}]);
      tA+=s.aktif;tI+=s.iptal;tV+=s.vefat;tP+=s.pasif;tB+=s.bekleme;tT+=s.total;tZ+=s.ziyaret;
    });
    rows.push([{v:S(''),s:1},{v:S(''),s:1},{v:S(''),s:1},{v:S(''),s:1},{v:S(''),s:1},{v:S(''),s:1},{v:S(''),s:1},{v:S(''),s:1}]);
    rows.push([{v:S('TOPLAM'),s:5},{v:tA,s:5,n:true},{v:tI,s:5,n:true},{v:tV,s:5,n:true},{v:tP,s:5,n:true},{v:tB,s:5,n:true},{v:tT,s:5,n:true},{v:tZ,s:5,n:true}]);
    const COLS=['A','B','C','D','E','F','G','H'];
    let rowsXml='';
    rows.forEach((row,ri)=>{
      let cx='';
      row.forEach((cell,ci)=>{
        const ref=COLS[ci]+(ri+1);
        if(cell.n)cx+=`<c r="${ref}" s="${cell.s}" t="n"><v>${cell.v}</v></c>`;
        else if(!cell.v&&cell.v!==0)cx+=`<c r="${ref}" s="${cell.s}"/>`;
        else cx+=`<c r="${ref}" s="${cell.s}" t="s"><v>${cell.v}</v></c>`;
      });
      rowsXml+=`<row r="${ri+1}" ht="18" customHeight="1">${cx}</row>`;
    });
    const sharedXml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${ss.length}" uniqueCount="${ss.length}">${ss.map(s=>`<si><t xml:space="preserve">${esc(s)}</t></si>`).join('')}</sst>`;
    const fontsXml=['<font><sz val="11"/><b/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>','<font><sz val="10"/><color rgb="FF263238"/><name val="Calibri"/></font>','<font><sz val="10"/><color rgb="FF424242"/><name val="Calibri"/></font>','<font><sz val="10"/><b/><color rgb="FF1565C0"/><name val="Calibri"/></font>','<font><sz val="10"/><b/><color rgb="FF1B5E20"/><name val="Calibri"/></font>','<font><sz val="11"/><b/><color rgb="FF1A237E"/><name val="Calibri"/></font>','<font><sz val="9"/><color rgb="FF546E7A"/><name val="Calibri"/></font>'].join('');
    const fillsXml=['<fill><patternFill patternType="none"/></fill>','<fill><patternFill patternType="gray125"/></fill>','<fill><patternFill patternType="solid"><fgColor rgb="FF1A237E"/></patternFill></fill>','<fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/></patternFill></fill>','<fill><patternFill patternType="solid"><fgColor rgb="FFF5F5F5"/></patternFill></fill>','<fill><patternFill patternType="solid"><fgColor rgb="FFE3F2FD"/></patternFill></fill>','<fill><patternFill patternType="solid"><fgColor rgb="FFE8F5E9"/></patternFill></fill>','<fill><patternFill patternType="solid"><fgColor rgb="FFE8EAF6"/></patternFill></fill>','<fill><patternFill patternType="solid"><fgColor rgb="FFFFF9C4"/></patternFill></fill>'].join('');
    const xfDefs=[[0,2,'center'],[1,3,'left'],[2,4,'left'],[3,5,'center'],[4,6,'center'],[5,7,'center'],[6,8,'left']];
    const cellXfs=xfDefs.map(([fi,fli,ha])=>`<xf numFmtId="0" fontId="${fi}" fillId="${fli}" borderId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="${ha}" vertical="center"/></xf>`).join('');
    const stylesXml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="7">${fontsXml}</fonts><fills count="9">${fillsXml}</fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="7">${cellXfs}</cellXfs></styleSheet>`;
    const sheetXml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetFormatPr defaultRowHeight="18"/><cols><col min="1" max="1" width="22" customWidth="1"/><col min="2" max="8" width="13" customWidth="1"/></cols><sheetData>${rowsXml}</sheetData></worksheet>`;
    const wbXml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Mahalle Raporu" sheetId="1" r:id="rId1"/></sheets></workbook>`;
    const RELS=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>`;
    const APP_RELS=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
    const CT=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>`;
    const zip=await buildZip([[`[Content_Types].xml`,e(CT),true],[`_rels/.rels`,e(APP_RELS),true],[`xl/workbook.xml`,e(wbXml),false],[`xl/_rels/workbook.xml.rels`,e(RELS),true],[`xl/worksheets/sheet1.xml`,e(sheetXml),false],[`xl/styles.xml`,e(stylesXml),false],[`xl/sharedStrings.xml`,e(sharedXml),false]]);
    const fname='mahalle_raporu'+(ay?'_'+ay:'')+(hiz?'_'+hiz.replace(/ /g,'_'):'')+'.xlsx';
    const blob=new Blob([zip],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=fname;
    document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
    showToast('Excel indirildi: '+fname);
  } catch(err){console.error(err);showToast('Hata: '+err.message);}
}

// ═══════════════════════════════════════════════════════════
// ZİYARET TAKVİMİ WHATSAPP PAYLAŞIM
// ═══════════════════════════════════════════════════════════
function takvimWpPaylasGun(tarihStr) {
  const d=new Date(tarihStr);
  const fmtTarih=d.toLocaleDateString('tr-TR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const ziyaretler=allData.filter(r=>
    [r.BANYO1,r.BANYO2,r.BANYO3,r.BANYO4,r.BANYO5,r.SAC1,r.SAC2,r.TIRNAK1,r.TIRNAK2,r.SAKAL1,r.SAKAL2]
    .some(t=>{if(!t)return false;const dd=parseDate(t);if(!dd)return false;
      const iso=dd.getFullYear()+'-'+String(dd.getMonth()+1).padStart(2,'0')+'-'+String(dd.getDate()).padStart(2,'0');
      return iso===tarihStr;})
  );
  if(!ziyaretler.length){showToast('Bu gün için ziyaret yok');return;}
  const [_y,_m,_g] = tarihStr.split('-');
  const _tarihTR = _g+'.'+_m+'.'+_y;
  const HIZMET_ETIKET = {
    'KADIN BANYO': '[Kadin Banyo]',
    'ERKEK BANYO': '[Erkek Banyo]',
    'KUAFOR':      '[Kuafor]',
    'KUAFÖR':      '[Kuafor]',
    'TEMİZLİK':    '[Temizlik]',
  };
  // Hizmet verilemedi olanları filtrele (BANYO/KUAFOR/TEMİZLİK VERİLEMEDİ formatı)
  const _tarihTR2 = _tarihTR; // already defined above
  const wpZiyaretlerFinal = ziyaretler.filter(r => {
    const tumNot = (r.NOT1||'') + ' ' + (r.NOT2||'') + ' ' + (r.NOT3||'');
    return !tumNot.includes(_tarihTR2 + ' BANYO VERİLEMEDİ') &&
           !tumNot.includes(_tarihTR2 + ' KUAFOR VERİLEMEDİ') &&
           !tumNot.includes(_tarihTR2 + ' TEMİZLİK VERİLEMEDİ') &&
           !tumNot.includes(_tarihTR2 + ' HİZMET VERİLEMEDİ');
  });
  if(!wpZiyaretlerFinal.length){showToast('Paylaşılacak ziyaret yok');return;}
  const gruplar={};
  wpZiyaretlerFinal.forEach(r=>{const h=r['HİZMET']||'DİĞER';if(!gruplar[h])gruplar[h]=[];gruplar[h].push(r);});
  let metin=`*${fmtTarih}*\nToplam ${wpZiyaretlerFinal.length} ziyaret\n\n`;
  Object.entries(gruplar).forEach(([hizmet,kayitlar])=>{
    const etiket = HIZMET_ETIKET[hizmet] || `[${hizmet}]`;
    metin+=`${etiket} *${hizmet}* (${kayitlar.length} kisi)\n`;
    kayitlar.forEach((r,i)=>{metin+=`${i+1}. ${r.ISIM_SOYISIM} - ${r.MAHALLE}\n`;});
    metin+='\n';
  });
  metin+='_Evde Bakim Sistemi_';
  window.open('https://wa.me/?text='+encodeURIComponent(metin),'_blank');
}

async function makeZipEntry(name, data, isStored=false) {
  const nameBytes = str(name);
  const modDate = 0x5670; // 2023-03-16
  const modTime = 0x0000;
  let compressed, method, csize;
  if(isStored) {
    compressed = data;
    method = 0;
    csize = data.length;
  } else {
    compressed = await deflateRaw(data);
    // If compression doesn't help, store
    if(compressed.length >= data.length) { compressed=data; method=0; }
    else { method=8; }
    csize = compressed.length;
  }
  const crc = crc32(data);
  const local = concat(
    new Uint8Array([0x50,0x4B,0x03,0x04]), // sig
    le16(20),       // version needed
    le16(0),        // flags
    le16(method),   // compression
    le16(modTime), le16(modDate),
    le32(crc),
    le32(csize),
    le32(data.length),
    le16(nameBytes.length),
    le16(0),        // extra length
    nameBytes,
    compressed
  );
  return {local, name:nameBytes, crc, csize, usize:data.length, method, modDate, modTime};
}

const enc = s => new TextEncoder().encode(s);
async function buildZip(files) {
  const entries = [];
  let offset = 0;
  const parts = [];
  for(const [name, data, stored] of files) {
    const e = await makeZipEntry(name, data, stored);
    e.offset = offset;
    offset += e.local.length;
    parts.push(e.local);
    entries.push(e);
  }
  // Central directory
  const cdParts = entries.map(e => {
    return concat(
      new Uint8Array([0x50,0x4B,0x01,0x02]),
      le16(20), le16(20),
      le16(0), le16(e.method),
      le16(e.modTime), le16(e.modDate),
      le32(e.crc),
      le32(e.csize),
      le32(e.usize),
      le16(e.name.length),
      le16(0), le16(0), le16(0), le16(0), le32(0),
      le32(e.offset),
      e.name
    );
  });
  const cd = concat(...cdParts);
  const cdOffset = offset;
  const eocd = concat(
    new Uint8Array([0x50,0x4B,0x05,0x06]),
    le16(0), le16(0),
    le16(entries.length), le16(entries.length),
    le32(cd.length),
    le32(cdOffset),
    le16(0)
  );
  return concat(...parts, cd, eocd);
}

// ---- XLSX XML builders ----
function xmlEsc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function buildStyles(colorMap) {
  // colorMap: [{fg, fontColor, bold}] indexed
  const fills = [
    '<fill><patternFill patternType="none"/></fill>',
    '<fill><patternFill patternType="gray125"/></fill>',
    ...colorMap.map(c=>`<fill><patternFill patternType="solid"><fgColor rgb="FF${c.bg}"/></patternFill></fill>`)
  ];
  const fonts = [
    '<font><name val="Calibri"/><sz val="10"/></font>',
    ...colorMap.map(c=>`<font><name val="Calibri"/><sz val="${c.sz||10}"/>${c.bold?'<b/>':''}<color rgb="FF${c.fg||'000000'}"/></font>`)
  ];
  const xfs_base = '<xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>';
  const xfs = colorMap.map((c,i)=>{
    const align = c.align||'left';
    return `<xf numFmtId="0" fontId="${i+1}" fillId="${i+2}" borderId="${c.border?1:0}" applyFont="1" applyFill="1" applyAlignment="1" applyBorder="1"><alignment horizontal="${align}" vertical="center"/></xf>`;
  });
  const borders = [
    '<border><left/><right/><top/><bottom/><diagonal/></border>',
    '<border><left style="hair"><color rgb="FFD0D0D0"/></left><right style="hair"><color rgb="FFD0D0D0"/></right><top style="hair"><color rgb="FFE0E0E0"/></top><bottom style="hair"><color rgb="FFE0E0E0"/></bottom><diagonal/></border>'
  ];
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="0"/>
<fonts count="${fonts.length}">${fonts.join('')}</fonts>
<fills count="${fills.length}">${fills.join('')}</fills>
<borders count="${borders.length}">${borders.join('')}</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${xfs.length+1}">${xfs_base}${xfs.join('')}</cellXfs>
</styleSheet>`;
}

function buildSheet(rows, colStyles, colWidths) {
  // rows: [{cells:[{v,s}]}]  s = style index (1-based in cellXfs, 0=default)
  const cols = colWidths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('');
  const rowsXml = rows.map((row,ri)=>{
    const cells = row.cells.map((cell,ci)=>{
      const col = String.fromCharCode(65+ci);
      const ref = `${col}${ri+1}`;
      const v = cell.v===null||cell.v===undefined?'':String(cell.v);
      const s = cell.s||0;
      if(!v && !s) return `<c r="${ref}"/>`;
      return `<c r="${ref}" t="inlineStr" s="${s}"><is><t>${xmlEsc(v)}</t></is></c>`;
    }).join('');
    return `<row r="${ri+1}" ht="${ri===0?22:18}" customHeight="1">${cells}</row>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="18"/>
<cols>${cols}</cols>
<sheetData>${rowsXml}</sheetData>
<autoFilter ref="A1:J1"/>
</worksheet>`;
}

const CONTENT_TYPES=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

const RELS=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

const WB_RELS=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

const WORKBOOK=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Veri" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;

// ---- Main buildXlsx ----
const XLSX_HC = {
  'KADIN BANYO': {header:'C2185B', band1:'FCE4EC', band2:'F8BBD0', text:'880E4F'},
  'ERKEK BANYO': {header:'1565C0', band1:'E3F2FD', band2:'BBDEFB', text:'0D47A1'},
  'KUAFÖR':      {header:'2E7D32', band1:'E8F5E9', band2:'C8E6C9', text:'1B5E20'},
  'TEMİZLİK':   {header:'E65100', band1:'FFF3E0', band2:'FFE0B2', text:'BF360C'},
};
const DUR_STYLES = {
  'AKTİF':  {bg:'C8E6C9', fg:'1B5E20'},
  'İPTAL':  {bg:'FFCDD2', fg:'B71C1C'},
  'VEFAT':  {bg:'CFD8DC', fg:'263238'},
  'BEKLEME':{bg:'FFF9C4', fg:'F57F17'},
  'PASİF':  {bg:'ECEFF1', fg:'546E7A'},
};

async function buildXlsx(data, filename) {
  const grup = expGetVal('exp-grup-group');
  if(grup==='hizmet')   data.sort((a,b)=>a.hizmet.localeCompare(b.hizmet)||a.mahalle.localeCompare(b.mahalle));
  else if(grup==='mahalle') data.sort((a,b)=>a.mahalle.localeCompare(b.mahalle)||a.hizmet.localeCompare(b.hizmet));
  else data.sort((a,b)=>a.isim.localeCompare(b.isim));

  // Build color map for styles — collect all unique style combos
  // We'll use a fixed style set: header + 4 hizmet x 2 bands + durum styles
  const colorDefs = [
    // 1: Header
    {bg:'1A237E', fg:'FFFFFF', bold:true, sz:11, align:'center'},
    // 2-3: KADIN BANYO band1/band2
    {bg:'FCE4EC', fg:'C2185B', bold:true, align:'left'},
    {bg:'F8BBD0', fg:'C2185B', bold:true, align:'left'},
    // 4-5: ERKEK BANYO
    {bg:'E3F2FD', fg:'1565C0', bold:true, align:'left'},
    {bg:'BBDEFB', fg:'1565C0', bold:true, align:'left'},
    // 6-7: KUAFÖR
    {bg:'E8F5E9', fg:'2E7D32', bold:true, align:'left'},
    {bg:'C8E6C9', fg:'2E7D32', bold:true, align:'left'},
    // 8-9: TEMİZLİK
    {bg:'FFF3E0', fg:'E65100', bold:true, align:'left'},
    {bg:'FFE0B2', fg:'E65100', bold:true, align:'left'},
    // 10: Ay col (normal, muted)
    {bg:'F5F5F5', fg:'546E7A', bold:false, align:'center'},
    // 11: Tarih col
    {bg:'E8EAF6', fg:'1565C0', bold:false, align:'center', border:true},
    // 12-16: Durum styles
    {bg:'C8E6C9', fg:'1B5E20', bold:true, align:'center'},  // AKTİF
    {bg:'FFCDD2', fg:'B71C1C', bold:true, align:'center'},  // İPTAL
    {bg:'CFD8DC', fg:'263238', bold:true, align:'center'},  // VEFAT
    {bg:'FFF9C4', fg:'F57F17', bold:true, align:'center'},  // BEKLEME
    {bg:'ECEFF1', fg:'546E7A', bold:true, align:'center'},  // PASİF
    // 17: İsim bold
    {bg:'FFFFFF', fg:'212121', bold:true, align:'left'},
    // 18: Mahalle normal
    {bg:'FFFFFF', fg:'546E7A', bold:false, align:'left'},
    // 19: Not
    {bg:'FFFDE7', fg:'795548', bold:false, align:'left', sz:9},
  ];

  // Style index map (1-based in cellXfs after default)
  const SI = {
    HDR:1, KB1:2, KB2:3, EB1:4, EB2:5, KF1:6, KF2:7, TZ1:8, TZ2:9,
    AY:10, TARIH:11,
    AKTIF:12, IPTAL:13, VEFAT:14, BEKLEME:15, PASIF:16,
    ISIM:17, MAH:18, NOT:19
  };
  const HIZMET_SI = {
    'KADIN BANYO':[SI.KB1,SI.KB2],
    'ERKEK BANYO':[SI.EB1,SI.EB2],
    'KUAFÖR':[SI.KF1,SI.KF2],
    'TEMİZLİK':[SI.TZ1,SI.TZ2],
  };
  const DUR_SI = {'AKTİF':SI.AKTIF,'İPTAL':SI.IPTAL,'VEFAT':SI.VEFAT,'BEKLEME':SI.BEKLEME,'PASİF':SI.PASIF};

  const HEADERS = ['Hizmet','Ay','İsim Soyisim','Mahalle','Tarih 1','Tarih 2','Tarih 3','Tarih 4','Not','Durum'];
  const WIDTHS   = [18,9,28,18,13,13,13,13,30,12];

  // Header row
  const rows = [{
    cells: HEADERS.map(h=>({v:h, s:SI.HDR}))
  }];

  // Data rows
  data.forEach((row,i)=>{
    const hsiArr = HIZMET_SI[row.hizmet]||[SI.KB1,SI.KB2];
    const hsi = hsiArr[i%2];
    const dsi = DUR_SI[row.durum]||SI.PASIF;
    rows.push({cells:[
      {v:row.hizmet,      s:hsi},
      {v:row.ay,          s:SI.AY},
      {v:row.isim,        s:SI.ISIM},
      {v:row.mahalle,     s:SI.MAH},
      {v:row.tarihler[0], s:SI.TARIH},
      {v:row.tarihler[1], s:SI.TARIH},
      {v:row.tarihler[2], s:SI.TARIH},
      {v:row.tarihler[3], s:SI.TARIH},
      {v:row.not1,        s:SI.NOT},
      {v:row.durum,       s:dsi},
    ]});
  });

  const enc = s => new TextEncoder().encode(s);
  const stylesXml = buildStyles(colorDefs);
  const sheetXml  = buildSheet(rows, HEADERS.map((_,i)=>i), WIDTHS);

  const zip = await buildZip([
    ['[Content_Types].xml',        enc(CONTENT_TYPES), true],
    ['_rels/.rels',                enc(RELS),          true],
    ['xl/workbook.xml',            enc(WORKBOOK),      false],
    ['xl/_rels/workbook.xml.rels', enc(WB_RELS),       true],
    ['xl/worksheets/sheet1.xml',   enc(sheetXml),      false],
    ['xl/styles.xml',              enc(stylesXml),     false],
  ]);

  const blob = new Blob([zip], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
}


// ===== FİLTRE / ÖNİZLEME / İNDİR =====
function expGetVal(groupId) {
  const el = document.querySelector('#'+groupId+' .exp-chip.active');
  return el ? el.dataset.val : '';
}
function expChipSelect(el, groupId) {
  document.querySelectorAll('#'+groupId+' .exp-chip').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
}
function expGetData() {
  const tur    = expGetVal('exp-tur-group');
  const hizmet = expGetVal('exp-hizmet-group');
  const ay     = expGetVal('exp-ay-group');
  const mah    = document.getElementById('exp-mah-sel') ? document.getElementById('exp-mah-sel').value : '';
  const today  = new Date().toISOString().split('T')[0];
  return allData.filter(r => {
    if(hizmet && r['HİZMET']!==hizmet) return false;
    if(ay && r.AY!==ay) return false;
    if(mah && r.MAHALLE!==mah) return false;
    if(tur==='aktif' && r.DURUM!=='AKTİF') return false;
    if(tur==='iptal' && r.DURUM!=='İPTAL' && r.DURUM!=='VEFAT') return false;
    if(tur==='bugun') {
      const tarihler=[r.BANYO1,r.BANYO2,r.BANYO3,r.BANYO4,r.BANYO5,r.SAC1,r.SAC2,r.TIRNAK1,r.TIRNAK2,r.SAKAL1,r.SAKAL2];
      if(!tarihler.includes(today)) return false;
    }
    return true;
  }).map(r => ({
    hizmet: r['HİZMET']||'',
    ay: r.AY||'',
    isim: r.ISIM_SOYISIM||'',
    mahalle: r.MAHALLE||'',
    tarihler: r['HİZMET']==='KUAFÖR'
      ? [r.SAC1||'',r.SAC2||'',r.TIRNAK1||'',r.TIRNAK2||'']
      : [r.BANYO1||'',r.BANYO2||'',r.BANYO3||'',r.BANYO4||''],
    durum: r.DURUM||'',
    not1: r.NOT1||'',
  }));
}
// ═══════════════════════════════════════════
// SAYI VER — Aylık Hizmet Özeti
// ═══════════════════════════════════════════
// AYLAR ve AY_KISALT sabitleri dosya başında tanımlandı

function svGetHizmetTurleri() {
  return ['KADIN BANYO','ERKEK BANYO','KUAFÖR','TEMİZLİK'];
}

function svHizmetIcon(h) {
  if(h==='KADIN BANYO') return '🛁';
  if(h==='ERKEK BANYO') return '🚿';
  if(h==='KUAFÖR') return '✂️';
  if(h==='TEMİZLİK') return '🧹';
  return '';
}

function svHizmetRenk(h) {
  if(h==='KADIN BANYO') return '#c2185b';
  if(h==='ERKEK BANYO') return '#1565c0';
  if(h==='KUAFÖR') return '#7c3aed';
  if(h==='TEMİZLİK') return '#0d9488';
  return '#475569';
}

// Bir tarih string'inden yıl ve ayı çıkar
function svTarihAyYil(tarihStr) {
  if (!tarihStr) return null;
  // YYYY-MM-DD veya DD.MM.YYYY formatları
  let y, m;
  if (tarihStr.includes('-')) {
    const p = tarihStr.split('-');
    y = parseInt(p[0]); m = parseInt(p[1]);
  } else if (tarihStr.includes('.')) {
    const p = tarihStr.split('.');
    y = parseInt(p[2]); m = parseInt(p[1]);
  }
  if (!y || !m || isNaN(y) || isNaN(m)) return null;
  return { y, m };
}

function svHesapla(yilFiltre, hizmetFiltre) {
  const tarihAlanlari = {
    'KADIN BANYO': ['BANYO1','BANYO2','BANYO3','BANYO4','BANYO5'],
    'ERKEK BANYO': ['BANYO1','BANYO2','BANYO3','BANYO4','BANYO5'],
    'KUAFÖR':      ['SAC1','SAC2','TIRNAK1','TIRNAK2','SAKAL1','SAKAL2'],
    'TEMİZLİK':   ['BANYO1','BANYO2','BANYO3','BANYO4','BANYO5'],
  };

  // hizmet → ay(1-12) → { hizmetSayisi, aktifVatandas }
  const sonuc = {};
  const hizmetler = hizmetFiltre ? [hizmetFiltre] : svGetHizmetTurleri();

  hizmetler.forEach(hz => {
    sonuc[hz] = {};
    for(let ay=1;ay<=12;ay++) sonuc[hz][ay] = { hizmet: 0, aktif: 0, isimler: new Set() };
  });

  allData.forEach(r => {
    const hz = r['HİZMET'];
    if (!sonuc[hz]) return;
    const alanlar = tarihAlanlari[hz] || [];

    alanlar.forEach(alan => {
      const val = r[alan];
      if (!val) return;
      const parsed = svTarihAyYil(val);
      if (!parsed) return;
      if (yilFiltre && parsed.y !== parseInt(yilFiltre)) return;
      sonuc[hz][parsed.m].hizmet++;
      sonuc[hz][parsed.m].isimler.add(r.ISIM_SOYISIM);
    });

  });

  // Aktif vatandaş sayısı — vatandaşlar sekmesiyle birebir aynı mantık
  // allData'da r.AY alanına göre filtreleyerek o ay kaydedilmiş AKTİF kişi sayısı
  const AY_ADLARI = ['OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN','TEMMUZ','AĞUSTOS','EYLÜL','EKİM','KASIM','ARALIK'];
  hizmetler.forEach(hz => {
    for(let ay=1;ay<=12;ay++) {
      if (hz === 'TEMİZLİK') {
        // TEMİZLİK: TP_DATA'dan AKTİF olanları say (ay bağımsız — sabit)
        sonuc[hz][ay].aktif = (typeof TP_DATA !== 'undefined')
          ? TP_DATA.filter(tp => tp.durum === 'AKTİF').length
          : 0;
      } else {
        // Banyo/Kuaför: vatandaşlar sekmesiyle aynı — r.AY alanına göre filtrele
        const ayAdi = AY_ADLARI[ay-1];
        sonuc[hz][ay].aktif = allData.filter(r =>
          r['HİZMET']===hz && r.DURUM==='AKTİF' && r.AY===ayAdi
        ).length;
      }
    }
  });

  // TEMİZLİK için TP_DATA'dan hizmet sayısını da ekle
  if (sonuc['TEMİZLİK'] && typeof TP_DATA !== 'undefined') {
    TP_DATA.forEach(tp => {
      if (!tp.sonGidilme) return;
      const parsed = svTarihAyYil(tp.sonGidilme);
      if (!parsed) return;
      if (yilFiltre && parsed.y !== parseInt(yilFiltre)) return;
      const zatenVar = sonuc['TEMİZLİK'][parsed.m].isimler.has((tp.isim||'').toUpperCase());
      if (!zatenVar) {
        sonuc['TEMİZLİK'][parsed.m].hizmet++;
        sonuc['TEMİZLİK'][parsed.m].isimler.add((tp.isim||'').toUpperCase());
      }
    });
  }

  return sonuc;
}

function svRender() {
  const yil = document.getElementById('sv-yil')?.value || '';
  const hizmetFiltre = document.getElementById('sv-hizmet')?.value || '';
  const el = document.getElementById('sv-tablo');
  if (!el) return;

  const sonuc = svHesapla(yil, hizmetFiltre);
  const hizmetler = hizmetFiltre ? [hizmetFiltre] : svGetHizmetTurleri();

  // Hangi ayların verisi var?
  const aktifAylar = [];
  for(let ay=1;ay<=12;ay++) {
    const toplam = hizmetler.reduce((s,h)=>s+(sonuc[h]?.[ay]?.hizmet||0),0);
    if(toplam>0) aktifAylar.push(ay);
  }
  if (!aktifAylar.length) { el.innerHTML='<p style="color:var(--text-soft);text-align:center;padding:30px">Bu filtrede veri yok</p>'; return; }

  // Tablo başlığı
  let html = '<table style="width:100%;border-collapse:collapse;font-size:13px">';
  html += '<thead><tr style="background:var(--primary);color:#fff">';
  html += '<th style="padding:10px 12px;text-align:left;border-radius:8px 0 0 0">HİZMET</th>';
  aktifAylar.forEach(ay => {
    html += `<th style="padding:10px 8px;text-align:center;white-space:nowrap">${AYLAR[ay-1]}</th>`;
  });
  html += '<th style="padding:10px 8px;text-align:center;border-radius:0 8px 0 0">TOPLAM</th>';
  html += '</tr></thead><tbody>';

  let toplamSatir = {};
  aktifAylar.forEach(ay => toplamSatir[ay] = {hizmet:0, aktif:0});
  let genelToplam = 0;

  hizmetler.forEach((hz, hi) => {
    const renk = svHizmetRenk(hz);
    const icon = svHizmetIcon(hz);
    const rowBg = hi%2===0 ? '#fff' : '#f8fafc';
    let hizmetToplam = 0;

    // Hizmet sayısı satırı
    html += `<tr style="background:${rowBg}">`;
    html += `<td style="padding:10px 12px;font-weight:800;color:${renk};border-bottom:1px solid #e2e8f0">${icon} ${hz}</td>`;
    aktifAylar.forEach(ay => {
      const sayi = sonuc[hz]?.[ay]?.hizmet || 0;
      hizmetToplam += sayi;
      toplamSatir[ay].hizmet += sayi;
      html += `<td style="padding:10px 8px;text-align:center;border-bottom:1px solid #e2e8f0;font-weight:${sayi>0?'700':'400'};color:${sayi>0?renk:'#94a3b8'}">${sayi>0?sayi:'—'}</td>`;
    });
    genelToplam += hizmetToplam;
    html += `<td style="padding:10px 8px;text-align:center;border-bottom:1px solid #e2e8f0;font-weight:900;color:${renk}">${hizmetToplam}</td>`;
    html += '</tr>';

    // Aktif vatandaş satırı
    html += `<tr style="background:${rowBg}">`;
    html += `<td style="padding:4px 12px 10px 24px;font-size:11px;color:#64748b;border-bottom:2px solid #e2e8f0">👤 Aktif Vatandaş</td>`;
    aktifAylar.forEach(ay => {
      const aktif = sonuc[hz]?.[ay]?.aktif || 0;
      toplamSatir[ay].aktif += aktif;
      html += `<td style="padding:4px 8px 10px;text-align:center;border-bottom:2px solid #e2e8f0;font-size:11px;color:#64748b">${aktif>0?aktif:'—'}</td>`;
    });
    html += `<td style="border-bottom:2px solid #e2e8f0"></td>`;
    html += '</tr>';
  });

  // Toplam satırı
  html += '<tr style="background:#f0f9ff;font-weight:900">';
  html += '<td style="padding:10px 12px;color:#1e40af">📊 TOPLAM HİZMET</td>';
  aktifAylar.forEach(ay => {
    html += `<td style="padding:10px 8px;text-align:center;color:#1e40af">${toplamSatir[ay].hizmet||'—'}</td>`;
  });
  html += `<td style="padding:10px 8px;text-align:center;color:#1e40af">${genelToplam}</td>`;
  html += '</tr>';

  html += '</tbody></table>';
  el.innerHTML = html;
}

async function svIndir() {
  const yil = document.getElementById('sv-yil')?.value || '2026';
  const hizmetFiltre = document.getElementById('sv-hizmet')?.value || '';
  const sonuc = svHesapla(yil, hizmetFiltre);
  const hizmetler = hizmetFiltre ? [hizmetFiltre] : svGetHizmetTurleri();

  try {
    const te = new TextEncoder();
    const e = s => te.encode(s);

    const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    // Shared strings
    const ss = []; const ssIdx = {};
    const S = v => {
      const k = String(v||'');
      if (ssIdx[k] === undefined) { ssIdx[k] = ss.length; ss.push(k); }
      return ssIdx[k];
    };

    // Renk tanımları — hizmet başlık renkleri
    const HZ = {
      'KADIN BANYO': {h:'C2185B', bg:'FCE4EC'},
      'ERKEK BANYO': {h:'1565C0', bg:'E3F2FD'},
      'KUAFÖR':      {h:'2E7D32', bg:'E8F5E9'},
      'TEMİZLİK':   {h:'E65100', bg:'FFF3E0'},
    };

    // Stil indexleri: 0=header, 1=KB satır, 2=EB satır, 3=KF satır, 4=TZ satır
    //                5=sayı, 6=aktif, 7=toplam, 8=genel, 9=boş
    const fontsXml = [
      '<font><sz val="11"/><b/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>',  // 0 header
      '<font><sz val="10"/><b/><color rgb="FFC2185B"/><name val="Calibri"/></font>',  // 1 KB
      '<font><sz val="10"/><b/><color rgb="FF1565C0"/><name val="Calibri"/></font>',  // 2 EB
      '<font><sz val="10"/><b/><color rgb="FF2E7D32"/><name val="Calibri"/></font>',  // 3 KF
      '<font><sz val="10"/><b/><color rgb="FFE65100"/><name val="Calibri"/></font>',  // 4 TZ
      '<font><sz val="10"/><color rgb="FF263238"/><name val="Calibri"/></font>',       // 5 sayı
      '<font><sz val="10"/><b/><color rgb="FF1B5E20"/><name val="Calibri"/></font>',  // 6 aktif
      '<font><sz val="11"/><b/><color rgb="FF1A237E"/><name val="Calibri"/></font>',  // 7 toplam
      '<font><sz val="12"/><b/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>',  // 8 genel
      '<font><sz val="10"/><color rgb="FF000000"/><name val="Calibri"/></font>',       // 9 boş
    ].join('');

    const fillsXml = [
      '<fill><patternFill patternType="none"/></fill>',
      '<fill><patternFill patternType="gray125"/></fill>',
      '<fill><patternFill patternType="solid"><fgColor rgb="FF1A237E"/></patternFill></fill>', // 2 header
      '<fill><patternFill patternType="solid"><fgColor rgb="FFFCE4EC"/></patternFill></fill>', // 3 KB
      '<fill><patternFill patternType="solid"><fgColor rgb="FFE3F2FD"/></patternFill></fill>', // 4 EB
      '<fill><patternFill patternType="solid"><fgColor rgb="FFE8F5E9"/></patternFill></fill>', // 5 KF
      '<fill><patternFill patternType="solid"><fgColor rgb="FFFFF3E0"/></patternFill></fill>', // 6 TZ
      '<fill><patternFill patternType="solid"><fgColor rgb="FFF5F5F5"/></patternFill></fill>', // 7 sayı
      '<fill><patternFill patternType="solid"><fgColor rgb="FFE8F5E9"/></patternFill></fill>', // 8 aktif
      '<fill><patternFill patternType="solid"><fgColor rgb="FFE8EAF6"/></patternFill></fill>', // 9 toplam
      '<fill><patternFill patternType="solid"><fgColor rgb="FF1A237E"/></patternFill></fill>', // 10 genel
      '<fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/></patternFill></fill>', // 11 boş
    ].join('');

    // xf: fontId, fillId
    // stil 0=header(f0,fill2), 1=KB(f1,fill3), 2=EB(f2,fill4), 3=KF(f3,fill5), 4=TZ(f4,fill6)
    //     5=sayı(f5,fill7), 6=aktif(f6,fill8), 7=toplam(f7,fill9), 8=genel(f8,fill10), 9=boş(f9,fill11)
    const xfs = [
      [0,2,'center'],[1,3,'left'],[2,4,'left'],[3,5,'left'],[4,6,'left'],
      [5,7,'center'],[6,8,'center'],[7,9,'center'],[8,10,'center'],[9,11,'left']
    ];
    const cellXfsXml = xfs.map(([fi,fli,ha]) =>
      `<xf numFmtId="0" fontId="${fi}" fillId="${fli}" borderId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="${ha}" vertical="center"/></xf>`
    ).join('');

    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="10">${fontsXml}</fonts>
<fills count="12">${fillsXml}</fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="10">${cellXfsXml}</cellXfs>
</styleSheet>`;

    // Satırları oluştur
    const rows = [];
    // Başlık
    rows.push([{v:S('HİZMET TÜRÜ'),s:0},{v:S('AY'),s:0},{v:S('HİZMET SAYISI'),s:0},{v:S('AKTİF VATANDAŞ'),s:0}]);

    const HZ_SI = {'KADIN BANYO':1,'ERKEK BANYO':2,'KUAFÖR':3,'TEMİZLİK':4};

    hizmetler.forEach(hz => {
      const si = HZ_SI[hz] || 1;
      // Hizmet başlık satırı
      rows.push([{v:S(hz),s:si},{v:S(''),s:si},{v:S(''),s:si},{v:S(''),s:si}]);

      for(let ay=1;ay<=12;ay++) {
        const hs = sonuc[hz]?.[ay]?.hizmet || 0;
        const ak = sonuc[hz]?.[ay]?.aktif  || 0;
        if (hs === 0) continue;
        rows.push([{v:S(''),s:si},{v:S(AYLAR[ay-1]),s:si},{v:hs,s:5,n:true},{v:ak,s:6,n:true}]);
      }

      const toplam = Object.values(sonuc[hz]||{}).reduce((s,v)=>s+(v.hizmet||0),0);
      if (toplam > 0) {
        rows.push([{v:S(hz+' TOPLAM'),s:7},{v:S('—'),s:7},{v:toplam,s:7,n:true},{v:S(''),s:7}]);
        rows.push([{v:S(''),s:9},{v:S(''),s:9},{v:S(''),s:9},{v:S(''),s:9}]);
      }
    });

    const genelToplam = hizmetler.reduce((s,h)=>s+Object.values(sonuc[h]||{}).reduce((ss,v)=>ss+(v.hizmet||0),0),0);
    rows.push([{v:S('GENEL TOPLAM'),s:8},{v:S('—'),s:8},{v:genelToplam,s:8,n:true},{v:S(''),s:8}]);

    // Sheet XML
    let rowsXml = '';
    const cols = ['A','B','C','D'];
    rows.forEach((row, ri) => {
      let cx = '';
      row.forEach((cell, ci) => {
        const ref = cols[ci]+(ri+1);
        if (cell.n) {
          cx += `<c r="${ref}" s="${cell.s}" t="n"><v>${cell.v}</v></c>`;
        } else {
          cx += `<c r="${ref}" s="${cell.s}" t="s"><v>${cell.v}</v></c>`;
        }
      });
      rowsXml += `<row r="${ri+1}" ht="18" customHeight="1">${cx}</row>`;
    });

    const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetFormatPr defaultRowHeight="18"/>
<cols><col min="1" max="1" width="22" customWidth="1"/><col min="2" max="2" width="11" customWidth="1"/><col min="3" max="3" width="16" customWidth="1"/><col min="4" max="4" width="18" customWidth="1"/></cols>
<sheetData>${rowsXml}</sheetData>
</worksheet>`;

    const sharedStringsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${ss.length}" uniqueCount="${ss.length}">
${ss.map(s=>`<si><t xml:space="preserve">${esc(s)}</t></si>`).join('')}
</sst>`;

    const wbXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Hizmet Ozeti ${yil}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;

    const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`;

    const APP_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

    const CT = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`;

    const zip = await buildZip([
      ['[Content_Types].xml',        e(CT),               true],
      ['_rels/.rels',                e(APP_RELS),          true],
      ['xl/workbook.xml',            e(wbXml),             false],
      ['xl/_rels/workbook.xml.rels', e(RELS),              true],
      ['xl/worksheets/sheet1.xml',   e(sheetXml),          false],
      ['xl/styles.xml',              e(stylesXml),         false],
      ['xl/sharedStrings.xml',       e(sharedStringsXml),  false],
    ]);

    const fname = 'sayi_ver_' + (yil||'tum') + '.xlsx';
    const blob = new Blob([zip], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=fname;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    showToast('Excel indirildi: ' + fname);
  } catch(err) {
    console.error('svIndir hata:', err);
    showToast('Hata: ' + err.message);
  }
}


function expPreview() {
  const data = expGetData();
  const prev = document.getElementById('exp-preview');
  const lbl  = document.getElementById('exp-count-label');
  if(!prev) return;
  if(lbl) lbl.textContent = data.length + ' kayıt seçildi';
  if(!data.length){
    prev.innerHTML='<div style="text-align:center;padding:30px;color:#94a3b8">Seçilen filtreyle eşleşen kayıt yok</div>';
    return;
  }
  const sample = data.slice(0,8);
  const hc = name => ({'KADIN BANYO':'#C2185B','ERKEK BANYO':'#1565C0','KUAFÖR':'#2E7D32','TEMİZLİK':'#E65100'}[name]||'#455A64');
  const dc = d => ({'AKTİF':'#C8E6C9','İPTAL':'#FFCDD2','VEFAT':'#CFD8DC','BEKLEME':'#FFF9C4','PASİF':'#ECEFF1'}[d]||'#F5F5F5');
  prev.innerHTML = `
    <table style="width:100%;border-collapse:collapse;font-size:10.5px">
      <thead><tr>
        <th style="background:#1A237E;color:#fff;padding:4px 8px;text-align:left">Hizmet</th>
        <th style="background:#1A237E;color:#fff;padding:4px 8px;text-align:left">İsim Soyisim</th>
        <th style="background:#1A237E;color:#fff;padding:4px 8px;text-align:left">Mahalle</th>
        <th style="background:#1A237E;color:#fff;padding:4px 8px;text-align:center">Tarih 1</th>
        <th style="background:#1A237E;color:#fff;padding:4px 8px;text-align:center">Durum</th>
      </tr></thead>
      <tbody>${sample.map((r,i)=>{
        const bg=i%2===0?'#F8F9FA':'#FFFFFF';
        return `<tr>
          <td style="padding:3px 8px;border-bottom:1px solid #EEE;background:${bg}"><span style="color:${hc(r.hizmet)};font-weight:800;font-size:10px">${r.hizmet}</span></td>
          <td style="padding:3px 8px;border-bottom:1px solid #EEE;background:${bg};font-weight:600">${r.isim}</td>
          <td style="padding:3px 8px;border-bottom:1px solid #EEE;background:${bg};color:#546E7A">${r.mahalle}</td>
          <td style="padding:3px 8px;border-bottom:1px solid #EEE;background:${bg};text-align:center;color:#1565C0">${r.tarihler[0]||'—'}</td>
          <td style="padding:3px 8px;border-bottom:1px solid #EEE;background:${dc(r.durum)};text-align:center;font-weight:700;font-size:10px">${r.durum}</td>
        </tr>`;
      }).join('')}
      ${data.length>8?`<tr><td colspan="5" style="text-align:center;padding:6px;color:#94a3b8;font-size:10px">... ve ${data.length-8} kayıt daha</td></tr>`:''}
      </tbody>
    </table>`;
}
async function expIndir() {
  const data = expGetData();
  if(!data.length){showToast('⚠️ İndirilecek kayıt bulunamadı');return;}
  const tur    = expGetVal('exp-tur-group');
  const hizmet = expGetVal('exp-hizmet-group');
  const ay     = expGetVal('exp-ay-group');
  const parts  = ['evde_bakim'];
  if(hizmet) parts.push(hizmet.replace(/ /g,'_').toLowerCase());
  if(ay) parts.push(ay.toLowerCase());
  if(tur!=='tum') parts.push(tur);
  await buildXlsx(data, parts.join('_')+'.xlsx');
  showToast(`✅ ${data.length} kayıt Excel olarak indirildi`);
}

// DD.MM.YYYY veya YYYY-MM-DD → Date objesi
function parseDate(d) {
  if (!d) return null;
  if (d instanceof Date) return d;
  const s = String(d).trim().split(/[\s_]/)[0];
  if (s.includes('.')) {
    const [g,a,y] = s.split('.');
    const dt = new Date(+y, +a-1, +g);
    return isNaN(dt) ? null : dt;
  }
  if (s.includes('-')) {
    const [y,a,g] = s.split('-');
    const dt = new Date(+y, +a-1, +g);
    return isNaN(dt) ? null : dt;
  }
  return null;
}
// DD.MM.YYYY veya YYYY-MM-DD → YYYY-MM-DD
function toISO(d) {
  if (!d) return '';
  if (d.includes('-')) return d.substring(0,10);
  const [g,a,y] = d.trim().split('.');
  return `${y}-${a.padStart(2,'0')}-${g.padStart(2,'0')}`;
}
function fmt(d){
  if(!d)return '';
  if(d.includes('.')) return d.split(' ')[0];
  const p=d.split('-');
  return p.length===3?p[2]+'.'+p[1]+'.'+p[0]:d;
}
function getBanyolar(r){
  return [r.BANYO1,r.BANYO2,r.BANYO3,r.BANYO4,r.BANYO5].filter(Boolean)
    .map(d=>'<span class="date-chip">'+fmt(d)+'</span>').join('')||'<span style="color:#94a3b8;font-size:11px">—</span>';
}
function durBadge(d){
  const cls={'AKTİF':'aktif','İPTAL':'iptal','VEFAT':'vefat','BEKLEME':'bekleme','PASİF':'pasif'}[d?.trim()]||'pasif';
  return `<span class="badge badge-${cls}">${d||'—'}</span>`;
}
function esc(s){return (s||'').replace(/'/g,"\\'").replace(/"/g,'&quot;');}
function dlCSV(rows,fn){
  const BOM='\uFEFF';
  const SEP='sep=;\n';
  const csv=BOM+SEP+rows.map(r=>r.map(v=>'"'+(v||'').toString().replace(/"/g,'""')+'"').join(';')).join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=fn;a.click();URL.revokeObjectURL(url);
}
function showToast(m){const t=document.getElementById('toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2800);}


// ── AYLIK ÖZET EXPORT ──
async function aylikOzetIndir() {
  const ay = document.getElementById('aylik-exp-ay')?.value || '';
  if (!ay) { showToast('⚠️ Lütfen bir ay seçin'); return; }

  const kayitlar = allData.filter(r => (r.AY || '').toUpperCase() === ay.toUpperCase() && r.ISIM_SOYISIM);

  if (!kayitlar.length) { showToast('Bu ayda kayıt bulunamadı'); return; }

  // Sıralama: hizmet → mahalle → isim
  kayitlar.sort((a, b) =>
    (a['HİZMET'] || '').localeCompare(b['HİZMET'] || '') ||
    (a.MAHALLE || '').localeCompare(b.MAHALLE || '') ||
    (a.ISIM_SOYISIM || '').localeCompare(b.ISIM_SOYISIM || '')
  );

  const HIZMET_TARIH_ALANLARI = {
    'KADIN BANYO': ['BANYO1','BANYO2','BANYO3','BANYO4','BANYO5'],
    'ERKEK BANYO': ['BANYO1','BANYO2','BANYO3','BANYO4','BANYO5'],
    'KUAFÖR':      ['SAC1','SAC2','TIRNAK1','TIRNAK2','SAKAL1','SAKAL2'],
    'TEMİZLİK':   ['BANYO1','BANYO2','BANYO3','BANYO4','BANYO5'],
  };

  const satirlar = kayitlar.map((r, i) => {
    const alanlar = HIZMET_TARIH_ALANLARI[r['HİZMET']] || [];
    const tarihler = alanlar.map(a => r[a] || '').filter(Boolean);
    return {
      no: i + 1,
      isim: r.ISIM_SOYISIM || '',
      hizmet: r['HİZMET'] || '',
      mahalle: r.MAHALLE || '',
      durum: r.DURUM || '',
      ziyaretSayisi: tarihler.length,
      tarihler: tarihler.join(', ') || '—',
      not: [r.NOT1, r.NOT2, r.NOT3].filter(Boolean).join(' | ') || ''
    };
  });

  // Basit XML tabanlı xlsx oluştur
  const esc = s => (s+'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const HEADERS = ['#','İsim Soyisim','Hizmet','Mahalle','Durum','Ziyaret Sayısı','Ziyaret Tarihleri','Notlar'];
  const WIDTHS  = [4, 28, 14, 16, 10, 8, 36, 30];

  let sharedStrs = [];
  const strIdx = s => { let i = sharedStrs.indexOf(s); if(i===-1){i=sharedStrs.length;sharedStrs.push(s);} return i; };

  const headerRow = HEADERS.map(h => `<c t="s"><v>${strIdx(h)}</v></c>`).join('');
  const dataRows = satirlar.map(r => {
    const vals = [r.no, r.isim, r.hizmet, r.mahalle, r.durum, r.ziyaretSayisi, r.tarihler, r.not];
    return '<row>' + vals.map((v, ci) =>
      ci === 0 || ci === 5
        ? `<c t="n"><v>${v}</v></c>`
        : `<c t="s"><v>${strIdx(String(v))}</v></c>`
    ).join('') + '</row>';
  }).join('');

  const colDefs = WIDTHS.map(w => `<col customWidth="1" width="${w}"/>`).join('');
  const sheetXml = `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<cols>${colDefs}</cols>
<sheetData>
<row>${headerRow}</row>
${dataRows}
</sheetData></worksheet>`;

  const ssXml = `<?xml version="1.0" encoding="UTF-8"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${sharedStrs.length}" uniqueCount="${sharedStrs.length}">
${sharedStrs.map(s=>`<si><t xml:space="preserve">${esc(s)}</t></si>`).join('')}
</sst>`;

  const wbXml = `<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${esc(ay)}" sheetId="1" r:id="rId1"/></sheets></workbook>`;

  const CT = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml"  ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml"           ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml"  ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/sharedStrings.xml"      ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`;

  const RELS = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`;

  const APP_RELS = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const e = s => new TextEncoder().encode(s);
  const zip = await buildZip([
    ['[Content_Types].xml', e(CT), true],
    ['_rels/.rels', e(APP_RELS), true],
    ['xl/workbook.xml', e(wbXml), false],
    ['xl/_rels/workbook.xml.rels', e(RELS), true],
    ['xl/worksheets/sheet1.xml', e(sheetXml), false],
    ['xl/sharedStrings.xml', e(ssXml), false],
  ]);

  const blob = new Blob([zip], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `aylik_ozet_${ay.toLowerCase()}.xlsx`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
  showToast(`✅ ${ay} özeti indirildi (${satirlar.length} kayıt)`);
}
window.aylikOzetIndir = aylikOzetIndir;
