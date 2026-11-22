let PASS_STATE={key:null,inited:false};
const PASS_CAT_NAMES={"1":"Крупнейшие (> 1 млн чел.)","2":"Крупные (250 тыс. – 1 млн)","3":"Большие (100 – 250 тыс.)","4":"Средние (50 – 100 тыс.)","5":"Малые (≤ 50 тыс. чел.)"};

function getPassMOs(){
  const m=new Map();
  GEO.features.forEach(f=>{
    const p=f.properties;
    if(p._map_status==="В_выборке"&&!p._inset&&!m.has(p.join_key)){
      const c24=String(DATA.panel_cats?.["2024"]?.[p.join_key]||"5");
      m.set(p.join_key,{key:p.join_key,lbl:p._lbl,reg:p.region,fo:p.fo,cat:c24,coh:Boolean(p.coh),full:p._lbl+" ("+p.region+")"});
    }
  });
  return Array.from(m.values()).sort((a,b)=>a.full.localeCompare(b.full,"ru"));
}
function getPassVal(mId,yr,jk){
  if(yr==="2024"&&DATA.v2024?.[mId]?.[jk]!==undefined&&DATA.v2024?.[mId]?.[jk]!==null)return DATA.v2024[mId][jk];
  return DATA.panel?.[mId]?.[yr]?.[jk];
}
function initPassportControls(){
  if(PASS_STATE.inited||!GEO||!DATA)return;
  PASS_STATE.inited=true;
  const all=getPassMOs(),cIn=document.getElementById("pCatIn"),fIn=document.getElementById("pFOIn"),rIn=document.getElementById("pRegIn"),mIn=document.getElementById("pMOIn"),ySel=document.getElementById("pYear"),rst=document.getElementById("pRst");
  const fillDL=(id,arr,curV="")=>{const dl=document.getElementById(id);dl.innerHTML="";if(curV&&arr.length===1&&arr.at(0).toLowerCase()===curV.trim().toLowerCase())return;arr.forEach(v=>{const o=document.createElement("option");o.value=v;dl.appendChild(o);});};
  const syncAll=()=>{
    const selCat=Object.entries(PASS_CAT_NAMES).find(p=>p.at(1).toLowerCase()===cIn.value.trim().toLowerCase())?.at(0)||"ALL";
    const selFO=fIn.value.trim()||"ALL",selReg=rIn.value.trim()||"ALL";
    const fCat=all.filter(m=>(selFO==="ALL"||m.fo===selFO)&&(selReg==="ALL"||m.reg===selReg));
    fillDL("pDlCat",Array.from(new Set(fCat.map(m=>PASS_CAT_NAMES[m.cat]))).filter(Boolean),cIn.value);
    const fFO=all.filter(m=>(selCat==="ALL"||m.cat===selCat)&&(selReg==="ALL"||m.reg===selReg));
    fillDL("pDlFO",Array.from(new Set(fFO.map(m=>m.fo))).sort((a,b)=>a.localeCompare(b,"ru")),fIn.value);
    const fReg=all.filter(m=>(selCat==="ALL"||m.cat===selCat)&&(selFO==="ALL"||m.fo===selFO));
    fillDL("pDlReg",Array.from(new Set(fReg.map(m=>m.reg))).sort((a,b)=>a.localeCompare(b,"ru")),rIn.value);
    const fMO=all.filter(m=>(selCat==="ALL"||m.cat===selCat)&&(selFO==="ALL"||m.fo===selFO)&&(selReg==="ALL"||m.reg===selReg));
    fillDL("pDlMO",fMO.map(m=>m.full),mIn.value);
  };
  Array.of(cIn,fIn,rIn).forEach(el=>{el.oninput=syncAll;el.onchange=()=>{el.blur();syncAll();};});
  mIn.onchange=()=>{
    const hit=all.find(m=>m.full.toLowerCase()===mIn.value.trim().toLowerCase());
    if(!hit)return;
    PASS_STATE.key=hit.key;
    const pP=document.getElementById("prevPYear"),nP=document.getElementById("nextPYear");if(hit.coh){ySel.disabled=false;if(pP)pP.disabled=false;if(nP)nP.disabled=false;}else{ySel.value="2024";ySel.disabled=true;if(pP)pP.disabled=true;if(nP)nP.disabled=true;}
    cIn.value="";fIn.value="";rIn.value="";mIn.blur();syncAll();renderPassport();
  };
  ySel.onchange=renderPassport;
  const stepPY=d=>{if(ySel.disabled)return;ySel.selectedIndex=(ySel.selectedIndex+d+ySel.options.length)%ySel.options.length;renderPassport();};
  const pP=document.getElementById("prevPYear"),nP=document.getElementById("nextPYear");if(pP)pP.onclick=()=>stepPY(-1);if(nP)nP.onclick=()=>stepPY(1);
  rst.onclick=()=>{PASS_STATE.key=null;cIn.value="";fIn.value="";rIn.value="";mIn.value="";ySel.value="2024";ySel.disabled=true;if(pP)pP.disabled=true;if(nP)nP.disabled=true;syncAll();renderPassport();};
  syncAll();
}
function buildRadarSvg(items,fillRgba,strokeHex){
  const W=220,H=195,cx=W/2,cy=H/2+2,R=68,n=items.length;
  let s='<svg width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'">';
  Array.of(0.25,0.5,0.75,1.0).forEach(lv=>{
    const pts=items.map((_,i)=>{const a=-Math.PI/2+i*2*Math.PI/n;return(cx+Math.cos(a)*R*lv).toFixed(1)+","+(cy+Math.sin(a)*R*lv).toFixed(1);}).join(" ");
    s+='<polygon points="'+pts+'" fill="none" stroke="#cbd5e1" stroke-width="1"/>';
  });
  const polyPts=items.map((it,i)=>{
    const a=-Math.PI/2+i*2*Math.PI/n,v=Math.max(0,Math.min(1,Number(it.val)||0));
    const x=cx+Math.cos(a)*R*v,y=cy+Math.sin(a)*R*v;
    const lx=cx+Math.cos(a)*(R+15),ly=cy+Math.sin(a)*(R+12);
    s+='<line x1="'+cx+'" y1="'+cy+'" x2="'+(cx+Math.cos(a)*R).toFixed(1)+'" y2="'+(cy+Math.sin(a)*R).toFixed(1)+'" stroke="#cbd5e1" stroke-width="1"/>';
    s+='<text x="'+lx.toFixed(1)+'" y="'+ly.toFixed(1)+'" font-size="9.5" font-weight="bold" text-anchor="middle" fill="#1e293b">'+it.short+'</text>';
    return x.toFixed(1)+","+y.toFixed(1);
  }).join(" ");
  s+='<polygon points="'+polyPts+'" fill="'+fillRgba+'" stroke="'+strokeHex+'" stroke-width="2"/>';
  items.forEach((it,i)=>{const a=-Math.PI/2+i*2*Math.PI/n,v=Math.max(0,Math.min(1,Number(it.val)||0));s+='<circle cx="'+(cx+Math.cos(a)*R*v).toFixed(1)+'" cy="'+(cy+Math.sin(a)*R*v).toFixed(1)+'" r="3" fill="'+strokeHex+'"/>';});
  return s+'</svg>';
}
function getPassportData(mo,yr){
  const jk=mo.key,findM=pat=>DATA.metrics.find(m=>m.id===pat||m.title.includes(pat));
  const vOf=(pat,dec=4)=>{const m=findM(pat);if(!m)return"—";const v=getPassVal(m.id,yr,jk);return(v===undefined||v===null||v==="")?"—":fmtNum(v,dec);};
  const nOf=pat=>{const m=findM(pat);if(!m)return 0;const v=Number(getPassVal(m.id,yr,jk));return isNaN(v)?0:v;};
  const clVal=getPassVal("Кластер 2024","2024",jk)||"—",catYr=String(DATA.panel_cats?.[yr]?.[jk]||mo.cat||"5");
  const topSubs=Array.of(
    {short:"ЭК",name:"Экологический субиндекс",val:nOf("Индекс ЭК"),txt:vOf("Индекс ЭК",4)},
    {short:"СЦ",name:"Социальный субиндекс",val:nOf("Индекс СЦ"),txt:vOf("Индекс СЦ",4)},
    {short:"УЭ",name:"Управленческо-экономический субиндекс",val:nOf("Индекс УЭ"),txt:vOf("Индекс УЭ",4)},
    {short:"IQ",name:"Цифровой субиндекс (IQ от max)",val:nOf("IQ от max"),txt:vOf("IQ от max",4)}
  );
  const subBlocks=Array.of(
    {short:"ЭК-1",name:"ЭК-1. Обеспеченность базовой водной инфраструктурой",val:nOf("ЭК-Подблок 1"),txt:vOf("ЭК-Подблок 1",4)},
    {short:"ЭК-2",name:"ЭК-2. Износ коммунальных инженерных сетей",val:nOf("ЭК-Подблок 2"),txt:vOf("ЭК-Подблок 2",4)},
    {short:"ЭК-3",name:"ЭК-3. Качество окружающей среды, газификация и отходы",val:nOf("ЭК-Подблок 3"),txt:vOf("ЭК-Подблок 3",4)},
    {short:"СЦ-1",name:"СЦ-1. Демографическая устойчивость и соц. нагрузка",val:nOf("СЦ-Подблок 1"),txt:vOf("СЦ-Подблок 1",4)},
    {short:"СЦ-2",name:"СЦ-2. Физическое состояние социальной инфраструктуры",val:nOf("СЦ-Подблок 2"),txt:vOf("СЦ-Подблок 2",4)},
    {short:"СЦ-3",name:"СЦ-3. Жилищная обеспеченность и транспорт",val:nOf("СЦ-Подблок 3"),txt:vOf("СЦ-Подблок 3",4)},
    {short:"УЭ-1",name:"УЭ-1. Производственно-инвестиционный потенциал",val:nOf("УЭ-Подблок 1"),txt:vOf("УЭ-Подблок 1",4)},
    {short:"УЭ-2",name:"УЭ-2. Потребительский рынок и бюджетная автономия",val:nOf("УЭ-Подблок 2"),txt:vOf("УЭ-Подблок 2",4)},
    {short:"УЭ-3",name:"УЭ-3. Финансовая результативность и администрирование",val:nOf("УЭ-Подблок 3"),txt:vOf("УЭ-Подблок 3",4)}
  );
  const ekList=DATA.metrics.filter(m=>m.id.startsWith("ЭК-0")||m.id.startsWith("ЭК-1")).map(m=>({id:m.id,title:m.title,val:vOf(m.id,m.dec)}));
  const scList=DATA.metrics.filter(m=>m.id.startsWith("СЦ-0")||m.id.startsWith("СЦ-1")).map(m=>({id:m.id,title:m.title,val:vOf(m.id,m.dec)}));
  const ueList=DATA.metrics.filter(m=>m.id.startsWith("УЭ-0")||m.id.startsWith("УЭ-1")).map(m=>({id:m.id,title:m.title,val:vOf(m.id,m.dec)}));
  return{clVal,clCol:DATA.cluster_colors?.[clVal]||"#e2e8f0",catTxt:PASS_CAT_NAMES[catYr]||"Малые",pop:vOf("Численность, чел.",0),area:vOf("Площадь, га",0),idxMain:vOf("Интегральный индекс устойчивого развития",4),topSubs,subBlocks,ekList,scList,ueList};
}

function renderPassport(){
  initPassportControls();
  const box=document.getElementById("sheetBox"),yr=document.getElementById("pYear").value,all=getPassMOs(),mo=all.find(m=>m.key===PASS_STATE.key);
  if(!mo){box.innerHTML='<div class="bench-empty"><b>Цифровой паспорт устойчивости муниципального образования</b><br><br>Выберите муниципальное образование в панели слева для формирования паспорта.<br><span style="font-size:13px;color:#64748b;">Для 193 МО динамической когорты доступен выбор года (2019–2024 гг.).</span></div>';return;}
  const pd=getPassportData(mo,yr),bRow=(lbl,val,cls="")=>'<div class="pass-irow '+cls+'"><span>'+lbl+'</span><b>'+val+'</b></div>';
  const sec1Html=bRow("Интегральный индекс устойчивого развития",pd.idxMain,"main")+pd.topSubs.map(s=>bRow(s.name,s.txt,"sub")).join("");
  const sec2Html=pd.subBlocks.map(b=>bRow(b.name,b.txt,"blk")).join("");
  const colHtml=(title,arr)=>'<div><div class="pass-col-hdr">'+title+'</div>'+arr.map(x=>'<div class="pass-crow"><span><b>'+x.id+'</b> — '+x.title+'</span><b>'+x.val+'</b></div>').join("")+'</div>';
  box.innerHTML='<div class="pass-view">'+
    '<div class="pass-top" style="display:block;"><div class="pass-intro" style="width:100%;"><div class="pass-title">Цифровой паспорт устойчивости муниципального образования</div><div class="pass-sub">'+mo.full+' — '+yr+' г.</div><div class="pass-desc">Цифровой паспорт — это интерактивная аналитическая платформа, отражающая реальное состояние и потенциал развития. В режиме реального времени собраны ключевые показатели. Цифровой инструмент создан для открытого диалога между властью, бизнесом и жителями, помогая вместе планировать уверенное и экологичное будущее.</div></div></div>'+
    '<div class="pass-meta-grid"><div class="pass-mrow"><span>Кластер (2024 г.):</span><b>'+pd.clVal+'</b></div><div class="pass-mrow"><span>Категория:</span><b>'+pd.catTxt+'</b></div><div class="pass-mrow"><span>Площадь, га:</span><b>'+pd.area+'</b></div><div class="pass-mrow"><span>Численность, чел.:</span><b>'+pd.pop+'</b></div></div>'+
    '<div class="pass-sec"><div class="pass-radar-box"><div style="font-weight:bold;font-size:11px;">Субиндексы устойчивости</div>'+buildRadarSvg(pd.topSubs,"rgba(225,29,72,0.24)","#e11d48")+'</div><div class="pass-idx-box">'+sec1Html+'</div></div>'+
    '<div class="pass-sec"><div class="pass-radar-box"><div style="font-weight:bold;font-size:11px;">Подблоки показателей (9)</div>'+buildRadarSvg(pd.subBlocks,"rgba(2,132,199,0.24)","#0284c7")+'</div><div class="pass-idx-box">'+sec2Html+'</div></div>'+
    '<div class="pass-bot">'+colHtml("Экологический блок",pd.ekList)+colHtml("Социальный блок",pd.scList)+colHtml("Управленческо-экономический блок",pd.ueList)+'</div></div>';
}
function drawCanvasRadar(ctx,items,rcx,rcy,R,fillRgba,strokeHex){
  const n=items.length;
  Array.of(0.25,0.5,0.75,1.0).forEach(lv=>{ctx.strokeStyle="#cbd5e1";ctx.lineWidth=1.5;ctx.beginPath();items.forEach((_,i)=>{const a=-Math.PI/2+i*2*Math.PI/n,x=rcx+Math.cos(a)*R*lv,y=rcy+Math.sin(a)*R*lv;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.closePath();ctx.stroke();});
  items.forEach((_,i)=>{const a=-Math.PI/2+i*2*Math.PI/n;ctx.beginPath();ctx.moveTo(rcx,rcy);ctx.lineTo(rcx+Math.cos(a)*R,rcy+Math.sin(a)*R);ctx.stroke();});
  ctx.beginPath();items.forEach((it,i)=>{const a=-Math.PI/2+i*2*Math.PI/n,v=Math.max(0,Math.min(1,Number(it.val)||0)),x=rcx+Math.cos(a)*R*v,y=rcy+Math.sin(a)*R*v;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.closePath();
  ctx.fillStyle=fillRgba;ctx.fill();ctx.strokeStyle=strokeHex;ctx.lineWidth=3.5;ctx.stroke();
  ctx.fillStyle="#111111";ctx.font="bold 29px 'Times New Roman'";ctx.textAlign="center";
  items.forEach((it,i)=>{const a=-Math.PI/2+i*2*Math.PI/n;ctx.fillText(it.short,rcx+Math.cos(a)*(R+36),rcy+Math.sin(a)*(R+28));});ctx.textAlign="left";
}
function wrapPassText(ctx,txt,maxW){
  const words=txt.split(" "),lines=Array.of();let cur="";
  words.forEach(w=>{const test=cur?cur+" "+w:w;if(ctx.measureText(test).width<=maxW)cur=test;else{if(cur)lines.push(cur);cur=w;}});
  if(cur)lines.push(cur);return lines.slice(0,3);
}
function buildPassportCanvas(overrideMO=null){
  const yr=document.getElementById("pYear").value,all=getPassMOs(),mo=overrideMO||all.find(m=>m.key===PASS_STATE.key);
  if(!mo){alert("Выберите муниципальное образование для паспорта.");return null;}
  const pd=getPassportData(mo,yr),W=2234,H=3160,canvas=document.createElement("canvas");canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext("2d");ctx.fillStyle="#ffffff";ctx.fillRect(0,0,W,H);
  ctx.fillStyle="#111111";ctx.textAlign="center";ctx.font="bold 55px 'Times New Roman'";
  ctx.fillText("Цифровой паспорт устойчивости муниципального образования",1117,84);
  ctx.font="bold 43px 'Times New Roman'";ctx.fillText(mo.full+" ("+yr+" г.)",1117,132);
  ctx.font="italic 27px 'Times New Roman'";
  ctx.fillText("Цифровой паспорт — интерактивная аналитическая платформа, отражающая реальное состояние и потенциал развития МО.",1117,176);
  ctx.fillText("В режиме реального времени собраны ключевые показатели для открытого диалога между властью, бизнесом и жителями.",1117,206);
  ctx.textAlign="left";
  ctx.strokeStyle="#cbd5e1";ctx.strokeRect(50,235,2134,115);
  ctx.font="bold 32px 'Times New Roman'";ctx.fillStyle="#111111";
  ctx.fillText("Кластер (2024 г.): "+pd.clVal,75,282);ctx.fillText("Категория: "+pd.catTxt,1150,282);
  ctx.fillText("Площадь, га: "+pd.area,75,330);ctx.fillText("Численность, чел.: "+pd.pop,1150,330);
  ctx.strokeStyle="#cbd5e1";ctx.strokeRect(50,375,2134,660);
  ctx.font="bold 31px 'Times New Roman'";ctx.textAlign="center";ctx.fillText("Субиндексы устойчивости",440,442);ctx.textAlign="left";
  drawCanvasRadar(ctx,pd.topSubs,440,745,220,"rgba(225,29,72,0.24)","#e11d48");
  let iy1=520;const ix=840,iw=1320;
  ctx.fillStyle="#e2e8f0";ctx.fillRect(ix,iy1-34,iw,46);ctx.fillStyle="#111111";ctx.font="bold 35px 'Times New Roman'";ctx.fillText("Интегральный индекс устойчивого развития",ix+14,iy1);ctx.textAlign="right";ctx.fillText(pd.idxMain,ix+iw-14,iy1);ctx.textAlign="left";iy1+=68;
  pd.topSubs.forEach(s=>{ctx.fillStyle="#f1f5f9";ctx.fillRect(ix,iy1-30,iw,42);ctx.fillStyle="#111111";ctx.font="bold 31px 'Times New Roman'";ctx.fillText(s.name,ix+14,iy1);ctx.textAlign="right";ctx.fillText(s.txt,ix+iw-14,iy1);ctx.textAlign="left";iy1+=62;});
  ctx.strokeStyle="#cbd5e1";ctx.strokeRect(50,1070,2134,670);
  ctx.font="bold 31px 'Times New Roman'";ctx.textAlign="center";ctx.fillText("Подблоки показателей (9)",440,1108);ctx.textAlign="left";
  drawCanvasRadar(ctx,pd.subBlocks,440,1425,220,"rgba(2,132,199,0.24)","#0284c7");
  let iy2=1145;
  pd.subBlocks.forEach(b=>{ctx.strokeStyle="#e2e8f0";ctx.beginPath();ctx.moveTo(ix,iy2+14);ctx.lineTo(ix+iw,iy2+14);ctx.stroke();ctx.fillStyle="#111111";ctx.font="29px 'Times New Roman'";ctx.fillText(b.name,ix+14,iy2);ctx.font="bold 29px 'Times New Roman'";ctx.textAlign="right";ctx.fillText(b.txt,ix+iw-14,iy2);ctx.textAlign="left";iy2+=64;});
  const cols=Array.of({t:"Экологический блок",a:pd.ekList},{t:"Социальный блок",a:pd.scList},{t:"Управленческо-экономический блок",a:pd.ueList});
  const cw=690,by0=1760,rowStep=102;
  cols.forEach((col,ci)=>{
    const cx0=50+ci*722,valColX=cx0+cw-115;
    ctx.fillStyle="#eef3f8";ctx.fillRect(cx0,by0,cw,48);ctx.strokeStyle="#94a3b8";ctx.strokeRect(cx0,by0,cw,48);
    ctx.fillStyle="#111111";ctx.font="bold 30px 'Times New Roman'";ctx.textAlign="center";ctx.fillText(col.t,cx0+cw/2,by0+32);ctx.textAlign="left";
    let cy=by0+76;
    col.a.forEach(it=>{
      ctx.strokeStyle="#cbd5e1";ctx.beginPath();ctx.moveTo(cx0,cy+66);ctx.lineTo(cx0+cw,cy+66);ctx.stroke();
      ctx.beginPath();ctx.moveTo(valColX,cy-24);ctx.lineTo(valColX,cy+66);ctx.stroke();
      ctx.fillStyle="#111111";ctx.font="27px 'Times New Roman'";
      const tLines=wrapPassText(ctx,it.id+" — "+it.title,valColX-cx0-12);
      tLines.forEach((ln,li)=>ctx.fillText(ln,cx0+6,cy+li*23));
      ctx.font="bold 28px 'Times New Roman'";ctx.textAlign="right";ctx.fillText(it.val,cx0+cw-8,cy+22);ctx.textAlign="left";cy+=rowStep;
    });
  });
  const sc=Number(document.getElementById("selDpi")?.value||1);
  if(sc<0.99){const c2=document.createElement("canvas");c2.width=Math.round(W*sc);c2.height=Math.round(H*sc);const x2=c2.getContext("2d");x2.imageSmoothingEnabled=true;x2.imageSmoothingQuality="high";x2.drawImage(canvas,0,0,c2.width,c2.height);return c2;}
  return canvas;
}
