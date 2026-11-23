// Модуль пакетной выгрузки (ZIP, PDF, контроль 1200 dpi)
window._buildCustomCtrlTasks = function(allMos){
  const list = Array.isArray(allMos) ? allMos.filter(m => m && m.oktmo) : [];
  const getCat = m => String(m.cat || m.category || m.pop_cat || m.group || 'Без категории');
  const getFo  = m => String(m.fo || m.fed_okrug || '');
  const getReg = m => String(m.region || m.reg || '');

  const buckets = new Map();
  list.forEach(m => {
    const key = getCat(m) + '||' + getFo(m);
    if(!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(m);
  });
  const sortedBuckets = Array.from(buckets.values()).filter(b => b.length >= 2);

  const benchSizes = Array.of(2, 2, 3, 3, 4, 4, 4, 5, 5, 5);
  const benchTasks = [];
  const usedBenchRefs = new Set();

  benchSizes.forEach((sz, idx) => {
    let chosen = null;
    for(let shift = 0; shift < sortedBuckets.length; shift++){
      const b = sortedBuckets[(idx + shift) % sortedBuckets.length];
      const avail = b.filter(m => !usedBenchRefs.has(m.oktmo));
      if(avail.length >= sz){
        const picked = [];
        const seenR = new Set();
        for(const item of avail){
          if(!seenR.has(getReg(item))){ picked.push(item); seenR.add(getReg(item)); }
          if(picked.length === sz) break;
        }
        for(const item of avail){
          if(picked.length === sz) break;
          if(!picked.includes(item)) picked.push(item);
        }
        chosen = picked;
        break;
      }
    }
    if(!chosen && list.length >= sz){
      chosen = list.slice(idx * 2, idx * 2 + sz);
    }
    if(chosen && chosen.length >= 2){
      chosen.forEach(m => usedBenchRefs.add(m.oktmo));
      benchTasks.push({ ref: chosen.at(0), peers: chosen.slice(1), mos: chosen, count: chosen.length });
    }
  });

  const cats = Array.from(new Set(list.map(getCat)));
  const fos  = Array.from(new Set(list.map(getFo)));
  const passTasks = [];
  const usedRegs = new Set();
  const usedOktmo = new Set();

  for(let step = 0; step < 10; step++){
    const targetCat = cats.length ? cats[step % cats.length] : null;
    const targetFo  = fos.length  ? fos[step % fos.length]   : null;
    let cand = list.find(m =>
      !usedOktmo.has(m.oktmo) && !usedRegs.has(getReg(m)) &&
      (!targetCat || getCat(m) === targetCat) && (!targetFo || getFo(m) === targetFo)
    );
    if(!cand) cand = list.find(m => !usedOktmo.has(m.oktmo) && !usedRegs.has(getReg(m)) && (!targetCat || getCat(m) === targetCat));
    if(!cand) cand = list.find(m => !usedOktmo.has(m.oktmo) && !usedRegs.has(getReg(m)));
    if(!cand) cand = list.find(m => !usedOktmo.has(m.oktmo));
    if(cand){
      usedRegs.add(getReg(cand));
      usedOktmo.add(cand.oktmo);
      passTasks.push(cand);
    }
  }
  return { benchTasks, passTasks };
};


// --- Анти-троттлинг фоновой вкладки (Web Worker + Web Lock) ---
window._bgSleep = (function(){
  try {
    const blob = new Blob([
      'self.onmessage = function(e){ setTimeout(function(){ self.postMessage(e.data); }, e.data.ms); };'
    ], {type: 'application/javascript'});
    const worker = new Worker(URL.createObjectURL(blob));
    const cbs = new Map();
    let seq = 0;
    worker.onmessage = function(e){
      const fn = cbs.get(e.data.id);
      if(fn){ cbs.delete(e.data.id); fn(); }
    };
    return function(ms){
      return new Promise(res => {
        const id = ++seq;
        cbs.set(id, res);
        worker.postMessage({id, ms: Math.max(1, ms || 1)});
      });
    };
  } catch(e) {
    return ms => new Promise(res => setTimeout(res, ms));
  }
})();
window._withBgLock = async function(fn){
  if(navigator.locks && navigator.locks.request){
    return navigator.locks.request('atlas_export_active', {mode: 'exclusive'}, fn);
  }
  return fn();
};

function bgTick(ms=20){
  return new Promise(res=>{
    const ch=new MessageChannel(),t0=performance.now();
    ch.port1.onmessage=()=>{if(performance.now()-t0>=ms)res();else ch.port2.postMessage(0);};
    ch.port2.postMessage(0);
  });
}
let _keepAliveCtx=null;
function setKeepAlive(on){
  try{
    if(on&&!_keepAliveCtx){
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      _keepAliveCtx=new AC();const osc=_keepAliveCtx.createOscillator(),g=_keepAliveCtx.createGain();
      g.gain.value=0.0001;osc.connect(g);g.connect(_keepAliveCtx.destination);osc.start();
    }else if(!on&&_keepAliveCtx){_keepAliveCtx.close();_keepAliveCtx=null;}
  }catch(e){}
}


function buildZipBlob(files){
  const enc=new TextEncoder(),crcT=new Uint32Array(256);
  for(let i=0;i<256;i++){let c=i;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);crcT[i]=c;}
  const crc32=buf=>{let c=0xffffffff;for(let i=0;i<buf.length;i++)c=crcT[(c^buf[i])&0xff]^(c>>>8);return(c^0xffffffff)>>>0;};
  const parts=Array.of(),cds=Array.of();let off=0;
  files.forEach(f=>{
    const nb=enc.encode(f.name),crc=crc32(f.data),lh=new Uint8Array(30+nb.length),dv=new DataView(lh.buffer);
    dv.setUint32(0,0x04034b50,true);dv.setUint16(4,20,true);dv.setUint16(6,0x0800,true);dv.setUint32(14,crc,true);dv.setUint32(18,f.data.length,true);dv.setUint32(22,f.data.length,true);dv.setUint16(26,nb.length,true);
    lh.set(nb,30);parts.push(lh,f.data);
    const cd=new Uint8Array(46+nb.length),cv=new DataView(cd.buffer);
    cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x0800,true);cv.setUint32(16,crc,true);cv.setUint32(20,f.data.length,true);cv.setUint32(24,f.data.length,true);cv.setUint16(28,nb.length,true);cv.setUint32(42,off,true);
    cd.set(nb,46);cds.push(cd);off+=lh.length+f.data.length;
  });
  const cdSz=cds.reduce((s,b)=>s+b.length,0),eocd=new Uint8Array(22),ev=new DataView(eocd.buffer);
  ev.setUint32(0,0x06054b50,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);ev.setUint32(12,cdSz,true);ev.setUint32(16,off,true);
  return new Blob(parts.concat(cds,Array.of(eocd)),{type:"application/zip"});
}






function buildPdfBlob(pages){
  const enc=new TextEncoder(),chunks=Array.of(),offs=Array.of(0);let pos=0;
  const push=s=>{const b=typeof s==="string"?enc.encode(s):s;chunks.push(b);pos+=b.length;},obj=id=>{offs[id]=pos;push(id+" 0 obj\n");};
  push("%PDF-1.4\n");const n=pages.length,kids=pages.map((_,i)=>(3+i*3)+" 0 R").join(" ");
  obj(1);push("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");obj(2);push("<< /Type /Pages /Kids [ "+kids+" ] /Count "+n+" >>\nendobj\n");
  pages.forEach((p,i)=>{
    const idP=3+i*3,idX=4+i*3,idC=5+i*3,w=Math.round(p.w*0.5),h=Math.round(p.h*0.5),cs="q "+w+" 0 0 "+h+" 0 0 cm /Im0 Do Q\n";
    obj(idP);push("<< /Type /Page /Parent 2 0 R /Resources << /XObject << /Im0 "+idX+" 0 R >> >> /MediaBox [0 0 "+w+" "+h+"] /Contents "+idC+" 0 R >>\nendobj\n");
    obj(idX);push("<< /Type /XObject /Subtype /Image /Width "+p.w+" /Height "+p.h+" /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length "+p.jpg.length+" >>\nstream\n");push(p.jpg);push("\nendstream\nendobj\n");
    obj(idC);push("<< /Length "+cs.length+" >>\nstream\n"+cs+"endstream\nendobj\n");
  });
  const xPos=pos;push("xref\n0 "+(3+n*3)+"\n0000000000 65535 f \n");
  for(let i=1;i<3+n*3;i++)push(String(offs[i]).padStart(10,"0")+" 00000 n \n");
  push("trailer\n<< /Size "+(3+n*3)+" /Root 1 0 R >>\nstartxref\n"+xPos+"\n%%EOF");
  return new Blob(chunks,{type:"application/pdf"});
}
async function exportBatchPdf(){
  const btn=document.getElementById("btnPdf"),scope=document.getElementById("selPdfScope").value,sFO=document.getElementById("selFO"),sReg=document.getElementById("selReg"),mId=document.getElementById("selMetric").value;
  const curM=document.getElementById("selMode").value;
  if(curM==="table"){
    const items=collectTableBatchCanvases(scope);if(!items.length)return;
    const pages=items.map(it=>{const b64=it.cv.toDataURL("image/jpeg",0.85).split(",").at(1),bin=atob(b64),arr=new Uint8Array(bin.length);for(let k=0;k<bin.length;k++)arr[k]=bin.charCodeAt(k);return{w:it.cv.width,h:it.cv.height,jpg:arr};});
    const a=document.createElement("a");a.download=buildAtlasBatchName({doc:"Табл",terr:reg!=="ALL"?reg:_foShort(fo),met:scope==="all_met"?"Все_пок":mId,yr:"2019-2024",ext:"pdf"});a.href=URL.createObjectURL(buildPdfBlob(pages));a.click();return;
  }
  if(curM==="passport"){
    const allM=getPassMOs(),curMO=allM.find(m=>m.key===PASS_STATE.key);
    const regFilter=document.getElementById("pRegIn")?.value.trim()||"",foFilter=document.getElementById("pFOIn")?.value.trim()||"",catTxt=document.getElementById("pCatIn")?.value.trim()||"";
    const catCode=Object.entries(PASS_CAT_NAMES).find(p=>p.at(1).toLowerCase()===catTxt.toLowerCase())?.at(0)||(curMO?curMO.cat:"");
    let list=Array.of();
    if(scope==="cur"){if(curMO)list=Array.of(curMO);}
    else if(scope==="reg"){const tReg=regFilter||(curMO?curMO.reg:"");if(tReg)list=allM.filter(m=>m.reg===tReg);}
    else if(scope==="fo"){const tFO=foFilter||(curMO?curMO.fo:"");if(tFO)list=allM.filter(m=>m.fo===tFO);}
    else if(scope==="cat"){if(catCode)list=allM.filter(m=>m.cat===catCode);}
    else{list=allM.filter(m=>m.coh);}
    if(!list.length)return alert("Выберите МО, Категорию, Регион или ФО в панели слева для выгрузки паспортов.");
    btn.disabled=true;
    try{
      const pages=Array.of(),scDpi=Number(document.getElementById("selDpi")?.value||1),qJpg=scDpi<0.38?0.52:(scDpi<0.6?0.65:0.82);
      for(let i=0;i<list.length;i++){
        btn.textContent="PDF: "+(i+1)+" / "+list.length+"...";await bgTick(10);
        const cv=await buildPassportCanvas(list.at(i));if(!cv)continue;
        const b64=cv.toDataURL("image/jpeg",qJpg).split(",").at(1),bin=atob(b64),arr=new Uint8Array(bin.length);
        for(let k=0;k<bin.length;k++)arr[k]=bin.charCodeAt(k);pages.push({w:cv.width,h:cv.height,jpg:arr});
      }
      if(pages.length>0){const a=document.createElement("a");a.download=buildAtlasBatchName({doc:"Пасп",terr:scope,yr:document.getElementById("pYear")?.value||"2024",ext:"pdf"});a.href=URL.createObjectURL(buildPdfBlob(pages));a.click();}
    }finally{btn.disabled=false;btn.textContent="💾 PDF";}
    return;
  }
  if(curM==="bench"){
    const cs=buildBenchCanvases();if(!cs.length)return;
    const pages=cs.map(cv=>{const b64=cv.toDataURL("image/jpeg",0.85).split(",").at(1),bin=atob(b64),arr=new Uint8Array(bin.length);for(let k=0;k<bin.length;k++)arr[k]=bin.charCodeAt(k);return{w:cv.width,h:cv.height,jpg:arr};});
    const a=document.createElement("a");const _bMOs=getBenchMOs(),_m0=_bMOs.find(x=>x.key===BENCH_STATE.mainKey)||{},_bYr=document.getElementById("bYear")?.value||"2024",_plus=BENCH_STATE.compKeys.length;
    a.download=buildAtlasFileName({doc:"Бенч",fo:_m0.fo,reg:_m0.reg,mo:_m0.lbl,plus:_plus,yr:_bYr,ext:"pdf"});a.href=URL.createObjectURL(buildPdfBlob(pages));a.click();return;
  }
  const origFO=sFO.value,origReg=sReg.value,queue=Array.of(),pages=Array.of();
  if(scope==="cur"){queue.push({fo:origFO,reg:origReg,met:mId});}
  else if(scope==="all_met"){DATA.metrics.filter(m=>!(m.cat||m.is_cat)||document.getElementById("selMode").value==="single").forEach(m=>queue.push({fo:origFO,reg:origReg,met:m.id}));}
  else if(scope==="fo"){queue.push({fo:"RF",reg:"ALL"});DATA.fos.forEach(f=>queue.push({fo:f,reg:"ALL"}));}
  else if(scope==="cur_fo"){const fl=origFO==="RF"?DATA.fos:Array.of(origFO);fl.forEach(f=>(DATA.fo_to_regs[f]||Array.of()).forEach(r=>queue.push({fo:f,reg:r})));}
  else{queue.push({fo:"RF",reg:"ALL"});DATA.fos.forEach(f=>{queue.push({fo:f,reg:"ALL"});(DATA.fo_to_regs[f]||Array.of()).forEach(r=>queue.push({fo:f,reg:r}));});}
  btn.disabled=true;window._isExportMode=true;setKeepAlive(true);
  try{
    for(let i=0;i<queue.length;i++){
      btn.textContent="PDF: "+(i+1)+" / "+queue.length+"...";const it=queue.at(i);
      if(sFO.value!==it.fo){sFO.value=it.fo;sReg.innerHTML='<option value="ALL">Весь округ / РФ</option>';if(it.fo!=="RF")(DATA.fo_to_regs[it.fo]||Array.of()).forEach(r=>sReg.add(new Option(r,r)));}
      if(it.met)document.getElementById("selMetric").value=it.met;sReg.value=it.reg;render();if(window._plotReady)await window._plotReady;await bgTick(300);
      const c=await buildSheetCanvas();if(!c)continue;
      const scDpi=Number(document.getElementById("selDpi")?.value||1),qJpg=scDpi<0.38?0.48:(scDpi<0.6?0.62:(scDpi<0.9?0.74:(scDpi>2.5?0.78:0.86))),b64=c.toDataURL("image/jpeg",qJpg).split(",").at(1),bin=atob(b64),arr=new Uint8Array(bin.length);
      for(let k=0;k<bin.length;k++)arr[k]=bin.charCodeAt(k);pages.push({w:c.width,h:c.height,jpg:arr});
    }
    if(pages.length>0){const a=document.createElement("a");a.download=buildAtlasBatchName({doc:"Карта",terr:scope==="cur"?(origReg!=="ALL"?origReg:_foShort(origFO)):scope,met:scope==="all_met"?"Все_пок":mId,yr:document.getElementById("selYear")?.value||"2024",ext:"pdf"});a.href=URL.createObjectURL(buildPdfBlob(pages));a.click();}
  }finally{
    window._isExportMode=false;setKeepAlive(false);sFO.value=origFO;sReg.innerHTML='<option value="ALL">Весь округ / РФ</option>';if(origFO!=="RF")(DATA.fo_to_regs[origFO]||Array.of()).forEach(r=>sReg.add(new Option(r,r)));
    document.getElementById("selMetric").value=mId;sReg.value=origReg;render();btn.disabled=false;btn.textContent="💾 PDF";
  }
}

async function runCustomBatchExport(fmt){
  const modal=document.getElementById("batchModal"),btnZ=document.getElementById("bmRunZip"),btnP=document.getElementById("bmRunPdf");
  const mode=document.getElementById("selMode").value,scDpi=Number(document.getElementById("selDpi")?.value||1),qJpg=scDpi<0.38?0.52:(scDpi<0.6?0.65:(scDpi>2.5?0.78:0.85));
  if(mode==="bench"){
    const {baseMO,tasks}=getBenchBatchPairs();
    if(!baseMO||!tasks.length)return alert("Нет парных МО с данными за выбранный год в этой группе.");
    const bYEl=document.getElementById("bYear"),origBY=bYEl.value,origMain=BENCH_STATE.mainKey,origComps=BENCH_STATE.compKeys.slice(),origToks=Object.assign({},BENCH_STATE.tokens);
    btnZ.disabled=true;btnP.disabled=true;const zFiles=Array.of(),pdfPages=Array.of();
    try{
      for(let i=0;i<tasks.length;i++){
        const {yr,pr}=tasks.at(i),lbl=(fmt==="zip"?"PNG: ":"PDF: ")+(i+1)+"/"+tasks.length;btnZ.textContent=lbl;btnP.textContent=lbl;await bgTick(8);
        bYEl.value=yr;BENCH_STATE.mainKey=baseMO.key;BENCH_STATE.compKeys=Array.of(pr.key);BENCH_STATE.tokens[baseMO.key]="🔵";BENCH_STATE.tokens[pr.key]="🟥";
        const cs=buildBenchCanvases();
        for(let ci=0;ci<cs.length;ci++){
          const cv=cs.at(ci);
          if(fmt==="zip"){
            const b64=cv.toDataURL("image/png").split(",").at(1),bin=atob(b64),arr=new Uint8Array(bin.length);
            for(let k=0;k<bin.length;k++)arr[k]=bin.charCodeAt(k);
            zFiles.push({name:buildAtlasFileName({doc:"Бенч",fo:baseMO.fo,reg:baseMO.reg,mo:baseMO.lbl,plus:1,yr:yr,page:ci+1,ext:"png"}),data:arr});
          }else{
            const b64=cv.toDataURL("image/jpeg",qJpg).split(",").at(1),bin=atob(b64),arr=new Uint8Array(bin.length);
            for(let k=0;k<bin.length;k++)arr[k]=bin.charCodeAt(k);
            pdfPages.push({w:cv.width,h:cv.height,jpg:arr});
          }
        }
      }
      const _bYr=tasks.at(0)?.yr||origBY;
      if(fmt==="zip"&&zFiles.length){const a=document.createElement("a");a.download=buildAtlasBatchName({doc:"Бенч",terr:baseMO.lbl,yr:_bYr,ext:"zip"});a.href=URL.createObjectURL(buildZipBlob(zFiles));a.click();}
      if(fmt==="pdf"&&pdfPages.length){const a=document.createElement("a");a.download=buildAtlasBatchName({doc:"Бенч",terr:baseMO.lbl,yr:_bYr,ext:"pdf"});a.href=URL.createObjectURL(buildPdfBlob(pdfPages));a.click();}
      modal.classList.remove("open");
    }finally{bYEl.value=origBY;BENCH_STATE.mainKey=origMain;BENCH_STATE.compKeys=origComps;BENCH_STATE.tokens=origToks;btnZ.disabled=false;btnP.disabled=false;btnZ.textContent="💾 PNG (ZIP-архив)";btnP.textContent="💾 Скачать PDF";}
    return;
  }
  if(mode==="passport"){
    const tasks=getPassportBatchTasks();if(!tasks.length)return alert("В выбранной группе нет МО с данными за указанный год.");
    const pYEl=document.getElementById("pYear"),origPY=pYEl.value;
    btnZ.disabled=true;btnP.disabled=true;const zFiles=Array.of(),pdfPages=Array.of();
    try{
      for(let i=0;i<tasks.length;i++){
        const {yr,mo}=tasks.at(i),lbl=(fmt==="zip"?"PNG: ":"PDF: ")+(i+1)+"/"+tasks.length;btnZ.textContent=lbl;btnP.textContent=lbl;await bgTick(8);
        pYEl.value=yr;const cv=await buildPassportCanvas(mo);if(!cv)continue;
        const fName=buildAtlasFileName({doc:"Пасп",fo:mo.fo,reg:mo.reg,mo:mo.lbl,yr:yr,page:1,ext:"png"});
        if(fmt==="zip"){const b64=cv.toDataURL("image/png").split(",").at(1),bin=atob(b64),arr=new Uint8Array(bin.length);for(let k=0;k<bin.length;k++)arr[k]=bin.charCodeAt(k);zFiles.push({name:fName,data:arr});}
        else{const b64=cv.toDataURL("image/jpeg",qJpg).split(",").at(1),bin=atob(b64),arr=new Uint8Array(bin.length);for(let k=0;k<bin.length;k++)arr[k]=bin.charCodeAt(k);pdfPages.push({w:cv.width,h:cv.height,jpg:arr});}
      }
      const _pYr=tasks.at(0)?.yr||origPY;
      const _pSelList=Array.from(modal.querySelectorAll("select")).filter(s=>{if(!s.value||s.value==="ALL"||/^20\d\d$/.test(s.value))return false;const st=window.getComputedStyle(s);if(st.display==="none"||st.visibility==="hidden")return false;const pBox=s.closest("[id*=Pass],[class*=pass],div");if(pBox&&window.getComputedStyle(pBox).display==="none")return false;return Array.from(s.options).some(o=>o.value==="ALL"||o.text.includes("Крупнейшие"));});
      const _pGrp=_pSelList.map(s=>String(s.options[s.selectedIndex]?.text||"").split("(").trim()).filter(Boolean).join("_");
      if(fmt==="zip"&&zFiles.length){const a=document.createElement("a");a.download=buildAtlasBatchName({doc:"Пасп",terr:_pGrp,yr:_pYr,ext:"zip"});a.href=URL.createObjectURL(buildZipBlob(zFiles));a.click();}
      if(fmt==="pdf"&&pdfPages.length){const a=document.createElement("a");a.download=buildAtlasBatchName({doc:"Пасп",terr:_pGrp,yr:_pYr,ext:"pdf"});a.href=URL.createObjectURL(buildPdfBlob(pdfPages));a.click();}
      modal.classList.remove("open");
    }finally{pYEl.value=origPY;btnZ.disabled=false;btnP.disabled=false;btnZ.textContent="💾 PNG (ZIP-архив)";btnP.textContent="💾 Скачать PDF";}
    return;
  }
  const terrs=Array.from(modal.querySelectorAll(".bm-t-chk:checked")).map(c=>({fo:c.dataset.fo,reg:c.dataset.reg}));
  const mets=Array.from(modal.querySelectorAll(".bm-m-chk:checked")).map(c=>c.value);
  const yrsChecked=Array.from(modal.querySelectorAll(".bm-y-chk:checked")).map(c=>c.value);
  if(!terrs.length||!mets.length)return alert("Выберите хотя бы одну территорию и один показатель.");
  const sFO=document.getElementById("selFO"),sReg=document.getElementById("selReg"),sMet=document.getElementById("selMetric"),sYr=document.getElementById("selYear");
  const origFO=sFO.value,origReg=sReg.value,origMet=sMet.value,origYr=sYr.value;
  const yrs=(mode==="single"&&document.getElementById("selBase").value==="coh"&&yrsChecked.length)?yrsChecked:Array.of(origYr);
  const mergeTbl=(mode==="table"&&document.getElementById("bmMergeTbl")?.checked&&terrs.length>1);
  const tasks=Array.of();
  if(mergeTbl){mets.forEach(m=>tasks.push({mergedTerrs:terrs,fo:"RF",reg:"ALL",met:m,yr:origYr}));}
  else{terrs.forEach(t=>mets.forEach(m=>yrs.forEach(y=>tasks.push({fo:t.fo,reg:t.reg,met:m,yr:y}))));}
  btnZ.disabled=true;btnP.disabled=true;window._isExportMode=true;setKeepAlive(true);
  const zFiles=Array.of(),pdfPages=Array.of();
  try{
    for(let i=0;i<tasks.length;i++){
      const t=tasks.at(i),lbl=(fmt==="zip"?"PNG: ":"PDF: ")+(i+1)+"/"+tasks.length;
      btnZ.textContent=lbl;btnP.textContent=lbl;
      if(sFO.value!==t.fo){sFO.value=t.fo;sReg.innerHTML='<option value="ALL">Весь округ / РФ</option>';if(t.fo!=="RF")(DATA.fo_to_regs[t.fo]||Array.of()).forEach(r=>sReg.add(new Option(r,r)));}
      sReg.value=t.reg;sMet.value=t.met;sYr.value=t.yr;
      const tag=((t.mergedTerrs?"Сводная_выборка":(t.reg!=="ALL"?t.reg:t.fo))+"_"+t.met+(mode==="single"?"_"+t.yr:"")).replace(/[^a-zA-Z0-9а-яА-ЯёЁ_-]/g,"_");
      const cvs=(mode==="table")?(t.mergedTerrs?buildMergedTableCanvases(t.mergedTerrs,true):buildTableCanvases(true)):Array.of(await (async()=>{render();if(window._plotReady)await window._plotReady;await bgTick(280);return await buildSheetCanvas();})());
      for(let ci=0;ci<cvs.length;ci++){
        const cv=cvs.at(ci);if(!cv)continue;
        if(fmt==="zip"){
          const b64=cv.toDataURL("image/png").split(",").at(1),bin=atob(b64),arr=new Uint8Array(bin.length);
          for(let k=0;k<bin.length;k++)arr[k]=bin.charCodeAt(k);
          const _docCode=(mode==="table")?"Табл":"Карта",_yrStr=(mode==="single")?t.yr:"2019-2024";
          zFiles.push({name:buildAtlasFileName({doc:_docCode,fo:t.fo,reg:t.reg,met:t.met,yr:_yrStr,page:ci+1,ext:"png"}),data:arr});
        }else{
          const b64=cv.toDataURL("image/jpeg",qJpg).split(",").at(1),bin=atob(b64),arr=new Uint8Array(bin.length);
          for(let k=0;k<bin.length;k++)arr[k]=bin.charCodeAt(k);
          pdfPages.push({w:cv.width,h:cv.height,jpg:arr});
        }
      }
    }
    const _pDoc=(mode==="table")?"Табл":"Карта";
    const _pTerr=(terrs.length===1)?(terrs.at(0).reg!=="ALL"?terrs.at(0).reg:_foShort(terrs.at(0).fo)):(terrs.length+"терр");
    const _pMet=(mets.length===1)?mets.at(0):(mets.length+"пок");
    const _pYr=(mode==="single")?(yrs.length===1?yrs.at(0):(yrs.length+"лет")):"2019-2024";
    if(fmt==="zip"&&zFiles.length){const a=document.createElement("a");a.download=buildAtlasBatchName({doc:_pDoc,terr:_pTerr,met:_pMet,yr:_pYr,ext:"zip"});a.href=URL.createObjectURL(buildZipBlob(zFiles));a.click();}
    if(fmt==="pdf"&&pdfPages.length){const a=document.createElement("a");a.download=buildAtlasBatchName({doc:_pDoc,terr:_pTerr,met:_pMet,yr:_pYr,ext:"pdf"});a.href=URL.createObjectURL(buildPdfBlob(pdfPages));a.click();}
    modal.classList.remove("open");
  }finally{
    window._isExportMode=false;setKeepAlive(false);sFO.value=origFO;sReg.innerHTML='<option value="ALL">Весь округ / РФ</option>';if(origFO!=="RF")(DATA.fo_to_regs[origFO]||Array.of()).forEach(r=>sReg.add(new Option(r,r)));
    sReg.value=origReg;sMet.value=origMet;sYr.value=origYr;if(mode!=="table")render();
    btnZ.disabled=false;btnP.disabled=false;btnZ.textContent="💾 PNG (ZIP-архив)";btnP.textContent="💾 Скачать PDF";
  }
}

async function runControl1200DpiPdf(){
  const _allCtrlMos = (typeof DATA !== 'undefined' && Array.isArray(DATA.mos)) ? DATA.mos :
    ((typeof GEO !== 'undefined' && Array.isArray(GEO.features)) ? GEO.features.map(f => f.properties).filter(p => p && p._map_status === 'В_выборке') : []);
  const _customCtrl = window._buildCustomCtrlTasks(_allCtrlMos);

const btn=document.getElementById("btnCtrl1200");
  const sMode=document.getElementById("selMode"),sBase=document.getElementById("selBase"),sYr=document.getElementById("selYear");
  const sFO=document.getElementById("selFO"),sReg=document.getElementById("selReg"),sMet=document.getElementById("selMetric"),sDpi=document.getElementById("selDpi");
  const orig={mode:sMode.value,base:sBase.value,yr:sYr.value,fo:sFO.value,reg:sReg.value,met:sMet.value,dpi:sDpi.value};
  let opt1200=sDpi.querySelector('option[value="2.0"]');
  if(!opt1200){opt1200=new Option("1200 dpi (контроль)","2.0");sDpi.add(opt1200);}
  sDpi.value="2.0";

  const pickRnd=(arr,n)=>{const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const tmp=a[i];a[i]=a[j];a[j]=tmp;}return a.slice(0,n);};
  const setTerr=(fo,reg)=>{sFO.value=fo;sReg.innerHTML='<option value="ALL">Весь округ / РФ</option>';if(fo!=="RF")(DATA.fo_to_regs[fo]||Array.of()).forEach(r=>sReg.add(new Option(r,r)));sReg.value=reg;};

  // 1. Карты: РФ + 8 ФО + все 82 региона, с ротацией по ВСЕМ показателям атласа (чтобы каждый регион и каждый показатель попали минимум 1 раз)
  const allTerrs=Array.of({fo:"RF",reg:"ALL"});
  DATA.fos.forEach(f=>{allTerrs.push({fo:f,reg:"ALL"});(DATA.fo_to_regs[f]||Array.of()).forEach(r=>allTerrs.push({fo:f,reg:r}));});
  const allMets=DATA.metrics.map(m=>m.id);
  const mapPairs=Array.of(),maxLen=Math.max(allTerrs.length,allMets.length);
  for(let i=0;i<maxLen;i++)mapPairs.push({t:allTerrs.at(i%allTerrs.length),m:allMets.at(i%allMets.length)});

  // 2. Таблицы: РФ + 4 случайных ФО + 20 случайных когортных регионов
  const cohRegs=Array.from(new Set(GEO.features.filter(f=>f.properties.coh&&f.properties._map_status==="В_выборке").map(f=>f.properties.region)));
  const tblTerrs=Array.of({fo:"RF",reg:"ALL"});
  pickRnd(DATA.fos,4).forEach(f=>tblTerrs.push({fo:f,reg:"ALL"}));
  pickRnd(cohRegs,20).forEach(r=>{const fo=Object.entries(DATA.fo_to_regs).find(p=>p.at(1).includes(r))?.at(0)||"RF";tblTerrs.push({fo,reg:r});});

  // 3. 40 случайных парных сравнений в Бенчмаркинге по разным кластерам, категориям и регионам
  const allMOs=getBenchMOs(),benchPairs=Array.of(),shuffledMOs=pickRnd(allMOs,allMOs.length);
  for(let i=0;i<shuffledMOs.length&&benchPairs.length<40;i++){
    const m1=shuffledMOs.at(i),m2=shuffledMOs.find((x,idx)=>idx>i&&x.key!==m1.key&&(x.cat!==m1.cat||x.reg!==m1.reg));
    if(m2)benchPairs.push({m1,m2});
  // 4. 40 случайных МО из разных категорий и кластеров для Цифрового паспорта
  const passList=pickRnd(getPassMOs(),40);

  // Сохраняем в томах по 50 страниц, чтобы 1200 dpi не переполняло память браузера
  let partIdx=1,pdfPages=Array.of();
  const flushVol=()=>{
    if(!pdfPages.length)return;
    const a=document.createElement("a");a.download="Контрольный_пакет_1200dpi_Том_"+String(partIdx).padStart(2,"0")+".pdf";
    a.href=URL.createObjectURL(buildPdfBlob(pdfPages));a.click();pdfPages=Array.of();partIdx++;
  };
  const pushCv=cv=>{
    if(!cv)return;
    const b64=cv.toDataURL("image/jpeg",0.86).split(",").at(1),bin=atob(b64),arr=new Uint8Array(bin.length);
    for(let k=0;k<bin.length;k++)arr[k]=bin.charCodeAt(k);
    pdfPages.push({w:cv.width,h:cv.height,jpg:arr});
    if(pdfPages.length>=50)flushVol();
  };

  if(btn)btn.disabled=true;
  window._isExportMode=true;setKeepAlive(true);
  try{
    // Этап 1: Карты (все 82 региона + РФ + ФО по всем показателям)
    sMode.value="single";sBase.value="all";sYr.value="2024";syncControls();
    for(let i=0;i<mapPairs.length;i++){
      if(btn)btn.textContent="1/4 Карты: "+(i+1)+"/"+mapPairs.length;
      const it=mapPairs.at(i);sMet.value=it.m;setTerr(it.t.fo,it.t.reg);
      render();if(window._plotReady)await window._plotReady;await bgTick(260);
      pushCv(await buildSheetCanvas());
    }
    // Этап 2: Таблицы динамики (РФ + 4 ФО + 20 регионов)
    sMode.value="table";syncControls();
    for(let i=0;i<tblTerrs.length;i++){
      if(btn)btn.textContent="2/4 Таблицы: "+(i+1)+"/"+tblTerrs.length;
      const it=tblTerrs.at(i);sMet.value=allMets.at((i*3)%allMets.length);setTerr(it.fo,it.reg);
      const cs=buildTableCanvases(true);if(cs.length)pushCv(cs.at(0));await bgTick(15);
    }
    // Этап 3: 10 сравнений Бенчмаркинга (2 по 2 МО, 2 по 3 МО, 3 по 4 МО, 3 по 5 МО)
    const _ctrlCustom = window._buildCustomCtrlTasks(_allCtrlMos);
    const _ctrlBench = _ctrlCustom.benchTasks.length ? _ctrlCustom.benchTasks : benchPairs.slice(0,10).map(p=>({mos:[p.m1,p.m2]}));
    const _ctrlPass  = _ctrlCustom.passTasks.length  ? _ctrlCustom.passTasks  : passList.slice(0,10);
    const _tokPool = ["🔵","🟥","🟩","🟨","🟪"];
    sMode.value="bench";syncControls();initBenchControls();
    for(let i=0;i<_ctrlBench.length;i++){
      if(btn)btn.textContent="3/4 Бенчмаркинг: "+(i+1)+"/"+_ctrlBench.length;
      const grp=_ctrlBench.at(i).mos||[];if(grp.length<2)continue;
      BENCH_STATE.mainKey=grp.at(0).key;BENCH_STATE.compKeys=grp.slice(1).map(x=>x.key);
      grp.forEach((x,ti)=>{BENCH_STATE.tokens[x.key]=_tokPool.at(ti%_tokPool.length);});
      buildBenchCanvases().forEach(cv=>pushCv(cv));await bgTick(15);
    }
    // Этап 4: 10 Цифровых паспортов МО (разные категории, ФО и регионы)
    sMode.value="passport";syncControls();initPassportControls();
    for(let i=0;i<_ctrlPass.length;i++){
      if(btn)btn.textContent="4/4 Паспорта: "+(i+1)+"/"+_ctrlPass.length;
      const mo=_ctrlPass.at(i);document.getElementById("pYear").value=mo.coh?"2023":"2024";
      pushCv(await buildPassportCanvas(mo));await bgTick(15);
    }
    flushVol();
  }finally{
    window._isExportMode=false;setKeepAlive(false);
    sDpi.value=orig.dpi;sMode.value=orig.mode;sBase.value=orig.base;sYr.value=orig.yr;sMet.value=orig.met;
    setTerr(orig.fo,orig.reg);syncControls();render();
    if(btn){btn.disabled=false;btn.textContent="🧪 Контроль 1200 dpi (PDF)";}

}
}
}
window.exportFullSheetPng = exportFullSheetPng;
window.exportBatchPdf = exportBatchPdf;
window.runCustomBatchExport = runCustomBatchExport;
window.runControl1200DpiPdf = runControl1200DpiPdf;
