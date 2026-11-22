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
function buildMergedTableCanvases(terrs,silent=false){
  const mId=document.getElementById("selMetric").value,mObj=DATA.metrics.find(m=>m.id===mId)||DATA.metrics.at(0),yrs=Array.of("2019","2020","2021","2022","2023","2024");
  const hasRF=terrs.some(t=>t.fo==="RF"),foSet=new Set(terrs.filter(t=>t.fo!=="RF"&&t.reg==="ALL").map(t=>t.fo)),regSet=new Set(terrs.filter(t=>t.reg!=="ALL").map(t=>t.reg));
  const seen=new Set(),rows=Array.of();
  GEO.features.forEach(ft=>{
    const p=ft.properties;if(p._map_status!=="В_выборке"||p._inset||!p.coh||seen.has(p.join_key))return;
    if(!hasRF&&!foSet.has(p.fo)&&!regSet.has(p.region))return;
    seen.add(p.join_key);const vals=yrs.map(y=>DATA.panel[mId]?.[y]?.[p.join_key]);
    rows.push({lbl:p._lbl,reg:p.region,fo:p.fo,cat:p.cat,vals,v24:vals.at(5)});
  });
  const sorted=sortTableRows(rows,mObj);if(!sorted.length){if(!silent)alert("Нет строк для выбранных территорий.");return Array.of();}
  const sc=Number(document.getElementById("selDpi")?.value||1),W=Math.round(3508*sc),H=Math.round(2480*sc),rowsPerPage=48,pages=Math.max(1,Math.ceil(sorted.length/rowsPerPage)),out=Array.of();
  const fVals=sorted.flatMap(r=>r.vals).filter(v=>v!==null&&v!==undefined&&!isNaN(Number(v))).map(Number),mn=fVals.length?Math.min(...fVals):0,mx=fVals.length?Math.max(...fVals):1;
  const subTitle=hasRF?"Российская Федерация (сводная выборка)":"Выбранные территории ("+terrs.length+" поз.)";
  for(let pg=0;pg<pages;pg++){
    const cv=document.createElement("canvas");cv.width=W;cv.height=H;const ctx=cv.getContext("2d");ctx.scale(sc,sc);
    ctx.fillStyle="#ffffff";ctx.fillRect(0,0,3508,2480);ctx.strokeStyle="#111111";ctx.lineWidth=3;ctx.strokeRect(18,18,3472,2444);
    ctx.fillStyle="#111111";ctx.font="bold 44px 'Times New Roman'";ctx.textAlign="center";
    ctx.fillText(mObj.id+" — "+mObj.title,1754,76);
    ctx.font="italic 31px 'Times New Roman'";ctx.fillStyle="#334155";
    ctx.fillText(subTitle+" • Динамика 2019–2024 гг. • Лист "+(pg+1)+" из "+pages,1754,122);
    const cols=Array.of({x:40,w:980,t:"Муниципальное образование (Регион)"},{x:1020,w:380,t:"Категория МО"},{x:1400,w:330,t:"2019"},{x:1730,w:330,t:"2020"},{x:2060,w:330,t:"2021"},{x:2390,w:330,t:"2022"},{x:2720,w:330,t:"2023"},{x:3050,w:418,t:"2024"});
    ctx.fillStyle="#eef3f8";ctx.fillRect(40,150,3428,48);ctx.strokeStyle="#64748b";ctx.lineWidth=1.5;ctx.strokeRect(40,150,3428,48);
    ctx.fillStyle="#111111";ctx.font="bold 24px 'Times New Roman'";
    cols.forEach(c=>{ctx.strokeRect(c.x,150,c.w,48);ctx.fillText(c.t,c.x+c.w/2,182);});
    const slice=sorted.slice(pg*rowsPerPage,(pg+1)*rowsPerPage);
    slice.forEach((r,idx)=>{
      const y=198+idx*42;ctx.fillStyle=idx%2?"#fafbfc":"#ffffff";ctx.fillRect(40,y,3428,42);
      ctx.strokeStyle="#cbd5e1";ctx.lineWidth=1;cols.forEach(c=>ctx.strokeRect(c.x,y,c.w,42));
      ctx.textAlign="left";ctx.fillStyle="#111111";ctx.font="22px 'Times New Roman'";
      ctx.fillText((r.lbl+" ("+r.reg+")").slice(0,58),52,y+28);
      ctx.textAlign="center";ctx.fillText((CAT_NAMES[r.cat]||r.cat).slice(0,22),1210,y+28);
      r.vals.forEach((v,vi)=>{
        const cx=cols.at(vi+2).x,cw=cols.at(vi+2).w;
        if(v!==null&&v!==undefined&&!isNaN(Number(v))){
          const t=mx>mn?(Number(v)-mn)/(mx-mn):0.5,rgb=samplePalRGB(currentPal,mObj.inv?1-t:t);
          ctx.fillStyle="rgba("+rgb.at(0)+","+rgb.at(1)+","+rgb.at(2)+",0.35)";ctx.fillRect(cx+1,y+1,cw-2,40);
        }
        ctx.fillStyle="#111111";ctx.font="bold 22px 'Times New Roman'";ctx.fillText(fmtVal(v,mObj.dec),cx+cw/2,y+28);
      });
    });
    drawFooterOnCanvas(ctx,3508,2480,false,getScale(mObj,fVals,false),null);out.push(cv);
  }
  return out;
}
function collectTableBatchCanvases(scope){
  const sFO=document.getElementById("selFO"),sReg=document.getElementById("selReg"),sMet=document.getElementById("selMetric");
  const origFO=sFO.value,origReg=sReg.value,origMet=sMet.value;
  const tasks=Array.of();
  if(scope==="all_fo"){DATA.fos.forEach(f=>tasks.push({fo:f,reg:"ALL",met:origMet,tag:f+"_ФО"}));}
  else if(scope==="all_reg"){DATA.fos.forEach(f=>(DATA.fo_to_regs[f]||Array.of()).forEach(r=>tasks.push({fo:f,reg:r,met:origMet,tag:r})));}
  else if(scope==="all_met"){
    const baseTag=origReg!=="ALL"?origReg:origFO;
    DATA.metrics.filter(m=>!(m.cat||m.is_cat)).forEach(m=>tasks.push({fo:origFO,reg:origReg,met:m.id,tag:baseTag+"_"+m.id}));
  }
  else{tasks.push({fo:origFO,reg:origReg,met:origMet,tag:origReg!=="ALL"?origReg:origFO});}
  const allOut=Array.of();
  try{
    tasks.forEach(t=>{
      sFO.value=t.fo;sReg.value=t.reg;sMet.value=t.met;
      const cs=buildTableCanvases(tasks.length>1);
      cs.forEach((cv,i)=>allOut.push({cv,name:t.tag.replace(/[^a-zA-Z0-9а-яА-ЯёЁ_-]/g,"_")+"_Лист_"+String(i+1).padStart(2,"0")+".png"}));
    });
  }finally{sFO.value=origFO;sReg.value=origReg;sMet.value=origMet;}
  return allOut;
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

function drawCatShape(ctx,cat,cx,cy,r,fill){
  ctx.fillStyle=fill;ctx.strokeStyle="#334155";ctx.lineWidth=1.5;ctx.beginPath();
  if(cat==="1"){ctx.rect(cx-r,cy-r,r*2,r*2);}
  else if(cat==="2"){ctx.moveTo(cx,cy-r*1.15);ctx.lineTo(cx+r*1.15,cy);ctx.lineTo(cx,cy+r*1.15);ctx.lineTo(cx-r*1.15,cy);ctx.closePath();}
  else if(cat==="3"){ctx.moveTo(cx,cy-r*1.15);ctx.lineTo(cx+r*1.1,cy+r*0.95);ctx.lineTo(cx-r*1.1,cy+r*0.95);ctx.closePath();}
  else if(cat==="4"){ctx.arc(cx,cy,r,0,Math.PI*2);}
  else{for(let i=0;i<5;i++){const a=-Math.PI/2+i*2*Math.PI/5,px=cx+Math.cos(a)*r*1.1,py=cy+Math.sin(a)*r*1.1;if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.closePath();}
  ctx.fill();ctx.stroke();
}
function buildTableCanvases(silent=false){
  const fo=document.getElementById("selFO").value,reg=document.getElementById("selReg").value,mId=document.getElementById("selMetric").value;
  const grpFO=(fo==="RF"&&Boolean(document.getElementById("chkGroupFO")?.checked));
  const FO_ORD=Array.of("Центральный","Северо-Западный","Южный","Северо-Кавказский","Приволжский","Уральский","Сибирский","Дальневосточный");
  const mMeta=DATA.metrics.find(m=>m.id===mId),terrTitle=reg!=="ALL"?reg:(fo==="RF"?"Российская Федерация":fo+" федеральный округ");
  const actCol=PALETTES[currentPal]||PALETTES["RdYlGn"],yrs=Array.of("2019","2020","2021","2022","2023","2024");
  const scTbl=mMeta.cat?null:computeScale(yrs.flatMap(y=>Object.values(DATA.panel[mId]?.[y]||{})).map(Number).filter(v=>!isNaN(v)),actCol,mMeta.inv);
  const allFeats=GEO.features.filter(f=>(fo==="RF"||f.properties.fo===fo)&&(reg==="ALL"||f.properties.region===reg));
  const cmpMO=(a,b)=>(Number(Boolean(b.properties.is_center))-Number(Boolean(a.properties.is_center)))||a.properties._lbl.localeCompare(b.properties._lbl,"ru");
  const sorted=Array.from(allFeats.filter(f=>f.properties._map_status==="В_выборке"&&f.properties.coh&&!f.properties._inset).reduce((m,f)=>m.set(f.properties.join_key,f),new Map()).values()).sort((a,b)=>{
    if(grpFO){const ia=FO_ORD.indexOf(a.properties.fo),ib=FO_ORD.indexOf(b.properties.fo);if(ia!==ib)return(ia===-1?99:ia)-(ib===-1?99:ib);}
    return a.properties.region.localeCompare(b.properties.region,"ru")||cmpMO(a,b);
  });
  if(!sorted.length){if(!silent)alert("Нет строк для отображения в выбранной территории.");return Array.of();}
  const items=Array.of();let lastFO=null;
  sorted.forEach(f=>{if(grpFO&&f.properties.fo!==lastFO){lastFO=f.properties.fo;items.push({isFO:true,title:lastFO+" федеральный округ"});}items.push({isFO:false,f});});
  const pagesArr=Array.of();let curPg=Array.of(),activeFO="";
  items.forEach(it=>{
    if(it.isFO)activeFO=it.title;
    if(curPg.length===0&&!it.isFO&&grpFO&&activeFO)curPg.push({isFO:true,title:activeFO+" (продолжение)"});
    curPg.push(it);
    if(curPg.length>=24){pagesArr.push(curPg);curPg=Array.of();}
  });
  if(curPg.length>0)pagesArr.push(curPg);
  const totalPages=pagesArr.length,W=3160,H=2234,sc=Number(document.getElementById("selDpi")?.value||1);
  const catsLeg=Array.of({c:"1",t:"Крупнейшие (> 1 млн чел.)"},{c:"2",t:"Крупные (250 тыс. – 1 млн)"},{c:"3",t:"Большие (100 – 250 тыс.)"},{c:"4",t:"Средние (50 – 100 тыс.)"},{c:"5",t:"Малые (≤ 50 тыс. чел.)"});
  const out=Array.of();
  for(let pg=0;pg<totalPages;pg++){
    const sub=pagesArr.at(pg),canvas=document.createElement("canvas");canvas.width=W;canvas.height=H;
    const ctx=canvas.getContext("2d");ctx.fillStyle="#ffffff";ctx.fillRect(0,0,W,H);
    ctx.fillStyle="#111111";ctx.textAlign="center";ctx.font="bold 34px 'Times New Roman'";ctx.fillText(mMeta.title+" (2019–2024 гг.)",W/2,56);
    ctx.font="bold 26px 'Times New Roman'";ctx.fillText(terrTitle+(totalPages>1?" — Лист "+(pg+1)+" из "+totalPages:""),W/2,96);ctx.textAlign="left";
    const xCols=Array.of(40,460,1120,1453,1786,2119,2452,2785,3120),tTop=120,hdrH=52,rowH=78;
    ctx.fillStyle="#eef3f8";ctx.fillRect(40,tTop,3080,hdrH);ctx.strokeStyle="#64748b";ctx.lineWidth=1.5;ctx.strokeRect(40,tTop,3080,hdrH);
    const hdrs=Array.of("Регион","Муниципальное образование","2019 г.","2020 г.","2021 г.","2022 г.","2023 г.","2024 г.");
    ctx.fillStyle="#111111";ctx.font="bold 21px 'Times New Roman'";ctx.textAlign="center";
    hdrs.forEach((h,i)=>{if(i>0){ctx.beginPath();ctx.moveTo(xCols.at(i),tTop);ctx.lineTo(xCols.at(i),tTop+hdrH);ctx.stroke();}ctx.fillText(h,(xCols.at(i)+xCols.at(i+1))/2,tTop+34);});
    sub.forEach((it,ri)=>{
      const y=tTop+hdrH+ri*rowH;
      if(it.isFO){ctx.fillStyle="#dbeafe";ctx.fillRect(40,y,3080,rowH);ctx.strokeStyle="#64748b";ctx.strokeRect(40,y,3080,rowH);ctx.fillStyle="#111111";ctx.textAlign="left";ctx.font="bold 22px 'Times New Roman'";ctx.fillText(it.title,56,y+47);return;}
      const f=it.f,jk=f.properties.join_key;
      ctx.strokeStyle="#cbd5e1";ctx.lineWidth=1.2;ctx.strokeRect(40,y,3080,rowH);
      for(let ci=1;ci<8;ci++){ctx.beginPath();ctx.moveTo(xCols.at(ci),y);ctx.lineTo(xCols.at(ci),y+rowH);ctx.stroke();}
      ctx.fillStyle="#111111";ctx.textAlign="left";ctx.font="19px 'Times New Roman'";
      const rTxt=f.properties.region;ctx.fillText(rTxt.length>26?rTxt.slice(0,25)+"…":rTxt,54,y+46);
      ctx.font=(f.properties.is_center?"bold ":"")+"19px 'Times New Roman'";const mTxt=f.properties._lbl;ctx.fillText(mTxt.length>38?mTxt.slice(0,37)+"…":mTxt,474,y+46);
      ctx.textAlign="center";
      yrs.forEach((yr,yi)=>{
        const cx=(xCols.at(yi+2)+xCols.at(yi+3))/2,v=DATA.panel[mId]?.[yr]?.[jk],catYr=String(DATA.panel_cats?.[yr]?.[jk]||"5");
        let fill="#ffffff",txt="н/д";
        if(v!==undefined&&v!==null&&v!==""){
          if(mMeta.cat){fill=DATA.cluster_colors[v]||"#e2e8f0";txt=String(v).split(" ").at(0);}
          else{const nv=Number(v);txt=fmtNum(nv,mMeta.dec);if(scTbl){const u=scTbl.vmax<=scTbl.vmin?0.5:Math.pow(Math.max(0,Math.min(1,(nv-scTbl.vmin)/(scTbl.vmax-scTbl.vmin))),scTbl.gamma);const ci=Math.min(scTbl.pal.length-1,Math.floor(u*scTbl.pal.length));fill=scTbl.pal.at(ci);}}
        }
        drawCatShape(ctx,catYr,cx,y+30,15,fill);
        ctx.fillStyle="#111111";ctx.font="bold 18px 'Times New Roman'";ctx.fillText(txt,cx,y+67);
      });
    });
    const footY=2095;ctx.strokeStyle="#94a3b8";ctx.beginPath();ctx.moveTo(40,footY);ctx.lineTo(3120,footY);ctx.stroke();
    ctx.textAlign="left";ctx.font="18px 'Times New Roman'";
    catsLeg.forEach((it,i)=>{const c=Math.floor(i/2),r=i%2,lx=55+c*520,ly=footY+36+r*44;drawCatShape(ctx,it.c,lx,ly-6,11,"#ffffff");ctx.fillStyle="#111111";ctx.fillText(it.t,lx+22,ly);});
    if(scTbl){
      const xBar=2000,wBar=1100,grd=ctx.createLinearGradient(xBar,0,xBar+wBar,0);scTbl.pal.forEach((c,i)=>grd.addColorStop(i/(scTbl.pal.length-1),c));
      ctx.fillStyle=grd;ctx.fillRect(xBar,footY+18,wBar,32);ctx.strokeStyle="#475569";ctx.strokeRect(xBar,footY+18,wBar,32);
      ctx.fillStyle="#111111";ctx.font="bold 19px 'Times New Roman'";ctx.textAlign="center";
      scTbl.ticks.forEach((t,i)=>ctx.fillText(fmtNum(t,mMeta.dec),xBar+wBar*(0.06+i*0.22),footY+80));
    }
    if(sc<0.99){const c2=document.createElement("canvas");c2.width=Math.round(W*sc);c2.height=Math.round(H*sc);const x2=c2.getContext("2d");x2.imageSmoothingEnabled=true;x2.imageSmoothingQuality="high";x2.drawImage(canvas,0,0,c2.width,c2.height);out.push(c2);}
    else out.push(canvas);
  }
  return out;
}

async function buildSheetCanvas(){
  const mode=document.getElementById("selMode").value;
  if(mode==="table"){alert("Переключитесь в режим карты или сетки.");return null;}
  const mId=document.getElementById("selMetric").value,reg=document.getElementById("selReg").value,fo=document.getElementById("selFO").value,yr=document.getElementById("selYear").value;
  const mMeta=DATA.metrics.find(x=>x.id===mId)||DATA.metrics.at(0);
  const isArk=reg.includes("Архангельск"),isNW=(fo.includes("Северо-Запад")||fo==="СЗФО")&&reg==="ALL";
  const hasInsets=isArk||isNW;
  const regFeats=(mode==="single"&&reg!=="ALL")?Array.from(GEO.features.filter(f=>f.properties.region===reg&&f.properties._map_status==="В_выборке"&&!f.properties._inset).reduce((m,f)=>{if(!m.has(f.properties.join_key))m.set(f.properties.join_key,f);return m;},new Map()).values()).sort((a,b)=>(Number(Boolean(b.properties.is_center))-Number(Boolean(a.properties.is_center)))||a.properties._lbl.localeCompare(b.properties._lbl,"ru")):Array.of();
  const hasList=regFeats.length>0,hasRightCol=hasInsets||hasList;
  const prevExp=Boolean(window._isExportMode);
  window._isExportMode=true;setKeepAlive(true);
  if(reg!=="ALL"){render();if(window._plotReady)await window._plotReady;await new Promise(r=>setTimeout(r,260));}
  const mapEl=document.getElementById("mapDiv");
  let numTraceAdded=false,savedAnns=null,coreTrIdx=-1;
  try{
    if(hasList){
      savedAnns=(mapEl.layout.annotations||Array.of()).slice();
      coreTrIdx=mapEl.data.findIndex(t=>t.type==="scattergeo"&&t.mode==="text");
      if(coreTrIdx!==-1)await Plotly.restyle(mapEl,{visible:false},Array.of(coreTrIdx));
      await Plotly.relayout(mapEl,{annotations:savedAnns.filter(a=>!a._isCore)});
      const polyArea=g=>{let a=0;const w=c=>{if(Array.isArray(c)&&c.length>2&&typeof c.at(0).at(0)==="number"){for(let i=0;i<c.length-1;i++)a+=c.at(i).at(0)*c.at(i+1).at(1)-c.at(i+1).at(0)*c.at(i).at(1);}else if(Array.isArray(c))c.forEach(w);};if(g&&g.coordinates)w(g.coordinates);return Math.abs(a)/2;};
      const isKras=reg.includes("Красноярск"),isKN=f=>/таймыр|эвенкий|норильск|турухан|енисейск|лесосибирск|мотыгин|богучан|кежемск/i.test(String(f.properties._lbl||""));
      const mIdx=Array.of(),nIdx=Array.of();
      regFeats.forEach((f,i)=>{if(isKras&&isKN(f))nIdx.push(i);else mIdx.push(i);});
      const packPts=(idxs,spScale,lThr)=>{
        const arr=idxs.map(i=>{const f=regFeats.at(i),c=(f.properties._cx!==undefined&&f.properties._cx!==0)?{lon:f.properties._cx,lat:f.properties._cy}:getCenter(f.geometry);return{idx:i,ox:c.lon,oy:c.lat,lon:c.lon,lat:c.lat,small:polyArea(f.geometry)<0.055};});
        if(!arr.length)return{arr,lLon:Array.of(),lLat:Array.of()};
        const b=arr.reduce((a,p)=>({x0:Math.min(a.x0,p.ox),x1:Math.max(a.x1,p.ox),y0:Math.min(a.y0,p.oy),y1:Math.max(a.y1,p.oy)}),{x0:999,x1:-999,y0:999,y1:-999});
        const cx0=(b.x0+b.x1)/2,cy0=(b.y0+b.y1)/2,tx=Math.max(0.22,(b.x1-b.x0)*spScale),ty=Math.max(0.14,(b.y1-b.y0)*spScale);
        arr.forEach(p=>{if(p.small){const a=Math.atan2(p.oy-cy0,p.ox-cx0);p.lon=p.ox+Math.cos(a)*tx*1.15;p.lat=p.oy+Math.sin(a)*ty*1.15;}});
        for(let pass=0;pass<20;pass++){for(let i=0;i<arr.length;i++){for(let j=0;j<i;j++){const dx=(arr.at(i).lon-arr.at(j).lon)/tx,dy=(arr.at(i).lat-arr.at(j).lat)/ty,d=Math.hypot(dx,dy);if(d<1.0){const a=d>0.01?Math.atan2(dy,dx):(i*1.2),k=(1.04-d)*0.5;arr.at(i).lon+=Math.cos(a)*tx*k;arr.at(i).lat+=Math.sin(a)*ty*k;arr.at(j).lon-=Math.cos(a)*tx*k;arr.at(j).lat-=Math.sin(a)*ty*k;}}}}
        if(reg.includes("Чукотск"))arr.forEach(p=>{if(p.ox<=180&&p.lon>179.8)p.lon=179.8;if(p.ox>180&&p.lon<180.2)p.lon=180.2;});const lLon=Array.of(),lLat=Array.of();arr.forEach(p=>{if(Math.hypot((p.lon-p.ox)/tx,(p.lat-p.oy)/ty)>lThr){lLon.push(p.ox,p.lon,null);lLat.push(p.oy,p.lat,null);}});
        return{arr,lLon,lLat};
      };
      const mPack=packPts(mIdx,isKras?0.044:0.068,0.72),nPack=packPts(nIdx,0.085,0.65);
      const nTr=nPack.arr.length>0?Array.of(
        {type:"scattergeo",geo:"geo2",mode:"lines",lon:nPack.lLon,lat:nPack.lLat,line:{color:"#1e293b",width:1.1},showlegend:false,hoverinfo:"skip"},
        {type:"scattergeo",geo:"geo2",mode:"markers",lon:nPack.arr.map(p=>p.lon),lat:nPack.arr.map(p=>p.lat),marker:{size:15,color:"rgba(255,255,255,0.85)",line:{color:"#475569",width:0.8}},showlegend:false,hoverinfo:"skip"},
        {type:"scattergeo",geo:"geo2",mode:"text",lon:nPack.arr.map(p=>p.lon),lat:nPack.arr.map(p=>p.lat),text:nPack.arr.map(p=>String(p.idx+1)),textfont:{family:"Times New Roman",size:10.5,color:"#111111"},showlegend:false,hoverinfo:"skip"}
      ):Array.of();
      await Plotly.addTraces(mapEl,Array.of(
        {type:"scattergeo",mode:"lines",lon:mPack.lLon,lat:mPack.lLat,line:{color:"#1e293b",width:1.1},showlegend:false,hoverinfo:"skip"},
        {type:"scattergeo",mode:"markers",lon:mPack.arr.map(p=>p.lon),lat:mPack.arr.map(p=>p.lat),marker:{size:15,color:"rgba(255,255,255,0.8)",line:{color:"#475569",width:0.8}},showlegend:false,hoverinfo:"skip"},
        {type:"scattergeo",mode:"text",lon:mPack.arr.map(p=>p.lon),lat:mPack.arr.map(p=>p.lat),text:mPack.arr.map(p=>String(p.idx+1)),textfont:{family:"Times New Roman",size:10.5,color:"#111111"},showlegend:false,hoverinfo:"skip"}
      ).concat(nTr));
      window._numTrCnt=3+nTr.length;
      numTraceAdded=true;
    }else if(window._badgesReady){
      await window._badgesReady;
      savedAnns=(mapEl.layout.annotations||Array.of()).slice();
      window._expCorePins=savedAnns.filter(a=>a._isCore).map(a=>({
        rx:a.x,
        ry:1-a.y,
        txt:String(a.text||"").replace(/<[^>]+>/g,"").trim()
      }));
      await Plotly.relayout(mapEl,{annotations:savedAnns.filter(a=>!a._isCore)});
    }

    mapEl.querySelectorAll(".geolayer text").forEach(t=>{t.style.stroke="#ffffff";t.style.strokeWidth="3.5px";t.style.paintOrder="stroke";t.style.fontWeight="bold";});
    const hPaths=Array.from(mapEl.querySelectorAll("path")).filter(p=>{const s=(p.getAttribute("style")||"")+(p.getAttribute("fill")||"");return s.includes("zatoHatch")||s.includes("0.987")||s.replace(/\s/g,"").includes("203,213,225");});
    hPaths.forEach(p=>{p.style.fill="#e2e8f0";p.style.fillOpacity="1";p.setAttribute("fill","#e2e8f0");});
    const allAnns=(mapEl.layout.annotations||Array.of()).slice(),hasNorthLbl=allAnns.some(a=>String(a.text||"").includes(""));if(hasNorthLbl)await Plotly.relayout(mapEl,{annotations:allAnns.filter(a=>!String(a.text||"").includes(""))});const mapW=3080,mapH=1945,imgData=await Plotly.toImage(mapEl,{format:"png",width:1540,height:972,scale:2});if(hasNorthLbl)await Plotly.relayout(mapEl,{annotations:allAnns});
    hPaths.forEach(p=>{p.style.fill="url(#zatoHatch)";p.style.fillOpacity="1";p.setAttribute("fill","url(#zatoHatch)");});
    const canvas=document.createElement("canvas");canvas.width=3160;canvas.height=2234;
    const ctx=canvas.getContext("2d");ctx.fillStyle="#ffffff";ctx.fillRect(0,0,3160,2234);
    const terrTitle=reg!=="ALL"?reg:(fo!=="RF"?fo+" федеральный округ":"Российская Федерация");
    const fullMet=mMeta.title+" ("+(mode==="grid"?"2019–2024 гг.":yr+" г.")+")";
    ctx.fillStyle="#111111";ctx.textAlign="center";ctx.font="bold 34px 'Times New Roman'";
    const lines=wrapTitle(fullMet,92).split("<br>");
    if(lines.length===1){ctx.fillText(lines.at(0),1580,68);}else{ctx.fillText(lines.at(0),1580,48);ctx.fillText(lines.at(1),1580,88);}
    ctx.font="bold 32px 'Times New Roman'";ctx.fillText(terrTitle,1580,134);ctx.textAlign="left";
    const mapImg=new Image();await new Promise(ok=>{mapImg.onload=ok;mapImg.src=imgData;});
    ctx.drawImage(mapImg,40,155,mapW,mapH);
    if(window._expCorePins&&window._expCorePins.length>0){
      window._expCorePins.forEach(p=>{
        const lx=40+p.rx*mapW,ly=155+p.ry*mapH;
        ctx.save();
        ctx.font="bold 23px 'Times New Roman', serif";
        const tw=ctx.measureText(p.txt).width,bw=tw+14,bh=32;
        ctx.fillStyle="rgba(255,255,255,0.95)";ctx.fillRect(lx-bw/2,ly-bh/2,bw,bh);
        ctx.strokeStyle="#e6007e";ctx.lineWidth=2.0;ctx.strokeRect(lx-bw/2,ly-bh/2,bw,bh);
        ctx.fillStyle="#111111";ctx.textAlign="center";ctx.textBaseline="middle";
        ctx.fillText(p.txt,lx,ly+1);ctx.restore();
      });
    }
    {
      const idt=ctx.getImageData(40,155,mapW,mapH),px=idt.data;
      for(let y=0;y<mapH;y++){for(let x=0;x<mapW;x++){const k=(y*mapW+x)*4;const isZ=(Math.abs(px[k]-204)<=4&&Math.abs(px[k+1]-214)<=4&&Math.abs(px[k+2]-225)<=4);if(isZ&&((x+y)%22)<7){px[k]=71;px[k+1]=85;px[k+2]=105;}}}
      ctx.putImageData(idt,40,155);
    }
    const sbEl=mapEl.querySelector("#mapScaleBarG");
    if(sbEl){
      const tEl=sbEl.querySelector("text"),pEl=sbEl.querySelector("path"),dAttr=pEl?pEl.getAttribute("d"):"";
      const mPts=dAttr.match(/M([0-9.]+),[0-9.]+ L[0-9.]+,[0-9.]+ L([0-9.]+),/);
      if(tEl&&mPts){
        const wPx=Math.round((Number(mPts.at(2))-Number(mPts.at(1)))*2),isKr=reg.includes("Красноярск")||(fo==="Сибирский"&&reg==="ALL");
        const sx0=isKr?760:64,sy0=155+mapH-26;
        ctx.fillStyle="rgba(255,255,255,0.9)";ctx.fillRect(sx0-8,sy0-34,wPx+24,42);
        ctx.strokeStyle="#111111";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(sx0,sy0-10);ctx.lineTo(sx0,sy0);ctx.lineTo(sx0+wPx,sy0);ctx.lineTo(sx0+wPx,sy0-10);ctx.stroke();
        ctx.fillStyle="#111111";ctx.font="bold 21px 'Times New Roman'";ctx.textAlign="center";ctx.fillText(tEl.textContent,sx0+wPx/2,sy0-10);ctx.textAlign="left";
      }
    }
    if(hasList){
      const lx=40+Math.round(mapW*0.785),lw=3120-lx,lyTop=isArk?(155+Math.round(mapH*0.67)):165,lyBot=155+mapH-8;
      const step=23,fs=18,maxRows=Math.max(6,Math.floor((lyBot-lyTop-34)/step)),twoCols=regFeats.length>maxRows;
      ctx.fillStyle="#111111";ctx.font="bold 20px 'Times New Roman'";ctx.fillText("Муниципальные образования:",lx,lyTop+18);
      ctx.font=fs+"px 'Times New Roman'";
      const splitIdx=twoCols?Math.ceil(regFeats.length/2):regFeats.length,colW=twoCols?Math.floor(lw/2):lw,maxCh=twoCols?25:52;
      regFeats.forEach((f,i)=>{
        const c=i<splitIdx?0:1,r=i<splitIdx?i:(i-splitIdx),txt=(i+1)+". "+f.properties._lbl;
        ctx.font=(f.properties.is_center?"bold ":"")+fs+"px 'Times New Roman'";ctx.fillText(txt.length>maxCh?txt.slice(0,maxCh-1)+"…":txt,lx+c*colW,lyTop+44+r*step);
      });
    }
    const hasCbar=!!document.querySelector("#sheetBox .cbar-strip"),footY=2125,legW=hasCbar?1900:3080;
    const items=Array.from(document.querySelectorAll("#sheetBox .leg-item")),cols=hasCbar?3:5,colW=Math.floor(legW/cols);
    ctx.font="21px 'Times New Roman'";
    items.forEach((el,idx)=>{
      const c=Math.floor(idx/2),r=idx%2,ix=46+c*colW,iy=footY+28+r*42,colHex=el.dataset.color||"#94a3b8",kind=el.dataset.kind||"box";
      if(kind==="dot"){ctx.fillStyle=colHex;ctx.beginPath();ctx.arc(ix+10,iy-6,8,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#ffffff";ctx.lineWidth=2;ctx.stroke();}
      else if(kind==="line"){ctx.strokeStyle=colHex;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(ix,iy-6);ctx.lineTo(ix+24,iy-6);ctx.stroke();}
      else if(kind==="hatch"){ctx.fillStyle="#e2e8f0";ctx.fillRect(ix,iy-16,24,17);ctx.save();ctx.beginPath();ctx.rect(ix,iy-16,24,17);ctx.clip();ctx.strokeStyle="#475569";ctx.lineWidth=2.3;for(let d=-18;d<32;d+=8){ctx.beginPath();ctx.moveTo(ix+d,iy+1);ctx.lineTo(ix+d+17,iy-16);ctx.stroke();}ctx.restore();ctx.strokeStyle="#475569";ctx.lineWidth=1;ctx.strokeRect(ix,iy-16,24,17);}else{ctx.fillStyle=colHex;ctx.fillRect(ix,iy-16,24,17);ctx.strokeStyle="#555555";ctx.lineWidth=1;ctx.strokeRect(ix,iy-16,24,17);}
      ctx.fillStyle="#111111";ctx.fillText(el.textContent.trim(),ix+32,iy);
    });
    if(hasCbar){
      const actCol=PALETTES[currentPal]||PALETTES["RdYlGn"],xBar=2050,wBar=1070,grd=ctx.createLinearGradient(xBar,0,xBar+wBar,0);
      actCol.forEach((c,i)=>grd.addColorStop(i/(actCol.length-1),c));
      ctx.fillStyle=grd;ctx.fillRect(xBar,footY+8,wBar,32);ctx.strokeStyle="#475569";ctx.lineWidth=1;ctx.strokeRect(xBar,footY+8,wBar,32);
      ctx.fillStyle="#111111";ctx.font="bold 21px 'Times New Roman'";ctx.textAlign="center";
      const tks=Array.from(document.querySelectorAll("#sheetBox .cbar-ticks span")).map(s=>s.textContent);
      tks.forEach((t,i)=>ctx.fillText(t,xBar+(wBar*(0.06+i*0.22)),footY+68));ctx.textAlign="left";
    }
    const sc=Number(document.getElementById("selDpi")?.value||1);
    if(sc<0.99){const c2=document.createElement("canvas");c2.width=Math.round(3160*sc);c2.height=Math.round(2234*sc);const x2=c2.getContext("2d");x2.imageSmoothingEnabled=true;x2.imageSmoothingQuality="high";x2.drawImage(canvas,0,0,c2.width,c2.height);return c2;}
    return canvas;
  }finally{
    if(!hasList&&savedAnns){await Plotly.relayout(mapEl,{annotations:savedAnns});window._expCorePins=null;}
    if(numTraceAdded){const delArr=window._numTrCnt===6?Array.of(-6,-5,-4,-3,-2,-1):Array.of(-3,-2,-1);await Plotly.deleteTraces(mapEl,delArr);if(coreTrIdx!==-1)await Plotly.restyle(mapEl,{visible:true},Array.of(coreTrIdx));if(savedAnns)await Plotly.relayout(mapEl,{annotations:savedAnns});}
    window._isExportMode=prevExp;if(reg!=="ALL"&&!prevExp)render();
  }
}

async function exportFullSheetPng(){
  const mVal=document.getElementById("selMode").value;
  if(mVal==="table"){
    const scope=document.getElementById("selPdfScope")?.value||"cur",items=collectTableBatchCanvases(scope);
    if(!items.length)return;
    if(items.length===1){const a=document.createElement("a");a.download=items.at(0).name;a.href=items.at(0).cv.toDataURL("image/png");a.click();return;}
    const zFiles=items.map(it=>{const b64=it.cv.toDataURL("image/png").split(",").at(1),bin=atob(b64),arr=new Uint8Array(bin.length);for(let k=0;k<bin.length;k++)arr[k]=bin.charCodeAt(k);return{name:it.name,data:arr};});
    const a=document.createElement("a");a.download="Таблица_динамики_МО.zip";a.href=URL.createObjectURL(buildZipBlob(zFiles));a.click();return;
  }
  if(mVal==="bench"){
    const cs=buildBenchCanvases();if(!cs.length)return;
    const zFiles=cs.map((cv,i)=>{const b64=cv.toDataURL("image/png").split(",").at(1),bin=atob(b64),arr=new Uint8Array(bin.length);for(let k=0;k<bin.length;k++)arr[k]=bin.charCodeAt(k);return{name:"Бенчмаркинг_Лист_"+(i+1)+".png",data:arr};});
    const a=document.createElement("a");a.download="Бенчмаркинг_МО.zip";a.href=URL.createObjectURL(buildZipBlob(zFiles));a.click();return;
  }
  const c=mVal==="passport"?(await buildPassportCanvas()):(await buildSheetCanvas());if(!c)return;
  const mId=document.getElementById("selMetric").value,reg=document.getElementById("selReg").value,fo=document.getElementById("selFO").value;
  const a=document.createElement("a");a.download="Атлас_"+mId+"_"+(reg!=="ALL"?reg:fo)+".png";a.href=c.toDataURL("image/png");a.click();
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
    const a=document.createElement("a");a.download="Таблица_динамики_МО_"+scope+".pdf";a.href=URL.createObjectURL(buildPdfBlob(pages));a.click();return;
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
      if(pages.length>0){const a=document.createElement("a");a.download="Цифровые_паспорта_МО_"+scope+".pdf";a.href=URL.createObjectURL(buildPdfBlob(pages));a.click();}
    }finally{btn.disabled=false;btn.textContent="💾 PDF";}
    return;
  }
  if(curM==="bench"){
    const cs=buildBenchCanvases();if(!cs.length)return;
    const pages=cs.map(cv=>{const b64=cv.toDataURL("image/jpeg",0.85).split(",").at(1),bin=atob(b64),arr=new Uint8Array(bin.length);for(let k=0;k<bin.length;k++)arr[k]=bin.charCodeAt(k);return{w:cv.width,h:cv.height,jpg:arr};});
    const a=document.createElement("a");a.download="Бенчмаркинг_МО.pdf";a.href=URL.createObjectURL(buildPdfBlob(pages));a.click();return;
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
    if(pages.length>0){const a=document.createElement("a");a.download="Атлас_"+mId+"_"+scope+".pdf";a.href=URL.createObjectURL(buildPdfBlob(pages));a.click();}
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
        const cs=buildBenchCanvases(),tag=(baseMO.lbl+"_vs_"+pr.lbl+"_"+yr).replace(/[^a-zA-Z0-9а-яА-ЯёЁ_-]/g,"_");
        cs.forEach((cv,ci)=>{
          if(fmt==="zip"){const b64=cv.toDataURL("image/png").split(",").at(1),bin=atob(b64),arr=new Uint8Array(bin.length);for(let k=0;k<bin.length;k++)arr[k]=bin.charCodeAt(k);zFiles.push({name:tag+"_Лист_"+(ci+1)+".png",data:arr});}
          else{const b64=cv.toDataURL("image/jpeg",qJpg).split(",").at(1),bin=atob(b64),arr=new Uint8Array(bin.length);for(let k=0;k<bin.length;k++)arr[k]=bin.charCodeAt(k);pdfPages.push({w:cv.width,h:cv.height,jpg:arr});}
        });
      }
      if(fmt==="zip"&&zFiles.length){const a=document.createElement("a");a.download="Бенчмаркинг_1на1_PNG.zip";a.href=URL.createObjectURL(buildZipBlob(zFiles));a.click();}
      if(fmt==="pdf"&&pdfPages.length){const a=document.createElement("a");a.download="Бенчмаркинг_1на1.pdf";a.href=URL.createObjectURL(buildPdfBlob(pdfPages));a.click();}
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
        const tag=(mo.lbl+"_"+mo.reg+"_"+yr).replace(/[^a-zA-Z0-9а-яА-ЯёЁ_-]/g,"_");
        if(fmt==="zip"){const b64=cv.toDataURL("image/png").split(",").at(1),bin=atob(b64),arr=new Uint8Array(bin.length);for(let k=0;k<bin.length;k++)arr[k]=bin.charCodeAt(k);zFiles.push({name:tag+".png",data:arr});}
        else{const b64=cv.toDataURL("image/jpeg",qJpg).split(",").at(1),bin=atob(b64),arr=new Uint8Array(bin.length);for(let k=0;k<bin.length;k++)arr[k]=bin.charCodeAt(k);pdfPages.push({w:cv.width,h:cv.height,jpg:arr});}
      }
      if(fmt==="zip"&&zFiles.length){const a=document.createElement("a");a.download="Паспорта_МО_PNG.zip";a.href=URL.createObjectURL(buildZipBlob(zFiles));a.click();}
      if(fmt==="pdf"&&pdfPages.length){const a=document.createElement("a");a.download="Паспорта_МО.pdf";a.href=URL.createObjectURL(buildPdfBlob(pdfPages));a.click();}
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
          zFiles.push({name:tag+(cvs.length>1?"_Лист_"+String(ci+1).padStart(2,"0"):"")+".png",data:arr});
        }else{
          const b64=cv.toDataURL("image/jpeg",qJpg).split(",").at(1),bin=atob(b64),arr=new Uint8Array(bin.length);
          for(let k=0;k<bin.length;k++)arr[k]=bin.charCodeAt(k);
          pdfPages.push({w:cv.width,h:cv.height,jpg:arr});
        }
      }
    }
    if(fmt==="zip"&&zFiles.length){const a=document.createElement("a");a.download="Пакет_Атлас_PNG.zip";a.href=URL.createObjectURL(buildZipBlob(zFiles));a.click();}
    if(fmt==="pdf"&&pdfPages.length){const a=document.createElement("a");a.download="Пакет_Атлас.pdf";a.href=URL.createObjectURL(buildPdfBlob(pdfPages));a.click();}
    modal.classList.remove("open");
  }finally{
    window._isExportMode=false;setKeepAlive(false);sFO.value=origFO;sReg.innerHTML='<option value="ALL">Весь округ / РФ</option>';if(origFO!=="RF")(DATA.fo_to_regs[origFO]||Array.of()).forEach(r=>sReg.add(new Option(r,r)));
    sReg.value=origReg;sMet.value=origMet;sYr.value=origYr;if(mode!=="table")render();
    btnZ.disabled=false;btnP.disabled=false;btnZ.textContent="💾 PNG (ZIP-архив)";btnP.textContent="💾 Скачать PDF";
  }
}

async function runControl1200DpiPdf(){
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
  }

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
    // Этап 3: 40 случайных сравнений Бенчмаркинга
    sMode.value="bench";syncControls();initBenchControls();
    for(let i=0;i<benchPairs.length;i++){
      if(btn)btn.textContent="3/4 Бенчмаркинг: "+(i+1)+"/"+benchPairs.length;
      const {m1,m2}=benchPairs.at(i);BENCH_STATE.mainKey=m1.key;BENCH_STATE.compKeys=Array.of(m2.key);
      BENCH_STATE.tokens[m1.key]="🔵";BENCH_STATE.tokens[m2.key]="🟥";
      buildBenchCanvases().forEach(cv=>pushCv(cv));await bgTick(15);
    }
    // Этап 4: 40 случайных Цифровых паспортов МО
    sMode.value="passport";syncControls();initPassportControls();
    for(let i=0;i<passList.length;i++){
      if(btn)btn.textContent="4/4 Паспорта: "+(i+1)+"/"+passList.length;
      const mo=passList.at(i);document.getElementById("pYear").value=mo.coh?"2023":"2024";
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
