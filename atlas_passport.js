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
  const fillDL=(id,arr)=>{const dl=document.getElementById(id);dl.innerHTML="";arr.forEach(v=>{const o=document.createElement("option");o.value=v;dl.appendChild(o);});};
  const syncAll=()=>{
    const selCat=Object.entries(PASS_CAT_NAMES).find(p=>p.at(1).toLowerCase()===cIn.value.trim().toLowerCase())?.at(0)||"ALL";
    const selFO=fIn.value.trim()||"ALL",selReg=rIn.value.trim()||"ALL";
    const fCat=all.filter(m=>(selFO==="ALL"||m.fo===selFO)&&(selReg==="ALL"||m.reg===selReg));
    fillDL("pDlCat",Array.from(new Set(fCat.map(m=>PASS_CAT_NAMES[m.cat]))).filter(Boolean));
    const fFO=all.filter(m=>(selCat==="ALL"||m.cat===selCat)&&(selReg==="ALL"||m.reg===selReg));
    fillDL("pDlFO",Array.from(new Set(fFO.map(m=>m.fo))).sort((a,b)=>a.localeCompare(b,"ru")));
    const fReg=all.filter(m=>(selCat==="ALL"||m.cat===selCat)&&(selFO==="ALL"||m.fo===selFO));
    fillDL("pDlReg",Array.from(new Set(fReg.map(m=>m.reg))).sort((a,b)=>a.localeCompare(b,"ru")));
    const fMO=all.filter(m=>(selCat==="ALL"||m.cat===selCat)&&(selFO==="ALL"||m.fo===selFO)&&(selReg==="ALL"||m.reg===selReg));
    fillDL("pDlMO",fMO.map(m=>m.full));
  };
  Array.of(cIn,fIn,rIn).forEach(el=>{el.oninput=syncAll;el.onchange=syncAll;});
  mIn.onchange=()=>{
    const hit=all.find(m=>m.full.toLowerCase()===mIn.value.trim().toLowerCase());
    if(!hit)return;
    PASS_STATE.key=hit.key;
    if(hit.coh){ySel.disabled=false;}else{ySel.value="2024";ySel.disabled=true;}
    cIn.value="";fIn.value="";rIn.value="";syncAll();renderPassport();
  };
  ySel.onchange=renderPassport;
  rst.onclick=()=>{PASS_STATE.key=null;cIn.value="";fIn.value="";rIn.value="";mIn.value="";ySel.value="2024";ySel.disabled=true;syncAll();renderPassport();};
  syncAll();
}
function buildRadarSvg(subItems,topItems){
  const W=360,H=290,cx=W/2,cy=H/2-4,R=92,n=subItems.length;
  let s='<svg width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'">';
  Array.of(0.2,0.4,0.6,0.8,1.0).forEach(lv=>{
    const pts=subItems.map((_,i)=>{const a=-Math.PI/2+i*2*Math.PI/n;return(cx+Math.cos(a)*R*lv).toFixed(1)+","+(cy+Math.sin(a)*R*lv).toFixed(1);}).join(" ");
    s+='<polygon points="'+pts+'" fill="none" stroke="#cbd5e1" stroke-width="1"/>';
  });
  const polyPts=subItems.map((it,i)=>{
    const a=-Math.PI/2+i*2*Math.PI/n,v=Math.max(0,Math.min(1,Number(it.val)||0));
    const x=cx+Math.cos(a)*R*v,y=cy+Math.sin(a)*R*v;
    const lx=cx+Math.cos(a)*(R+18),ly=cy+Math.sin(a)*(R+14);
    s+='<line x1="'+cx+'" y1="'+cy+'" x2="'+(cx+Math.cos(a)*R).toFixed(1)+'" y2="'+(cy+Math.sin(a)*R).toFixed(1)+'" stroke="#cbd5e1" stroke-width="1"/>';
    s+='<text x="'+lx.toFixed(1)+'" y="'+ly.toFixed(1)+'" font-size="10" font-weight="bold" text-anchor="middle" fill="#0369a1">'+it.short+'</text>';
    return x.toFixed(1)+","+y.toFixed(1);
  }).join(" ");
  s+='<polygon points="'+polyPts+'" fill="rgba(2,132,199,0.24)" stroke="#0284c7" stroke-width="2"/>';
  subItems.forEach((it,i)=>{const a=-Math.PI/2+i*2*Math.PI/n,v=Math.max(0,Math.min(1,Number(it.val)||0));s+='<circle cx="'+(cx+Math.cos(a)*R*v).toFixed(1)+'" cy="'+(cy+Math.sin(a)*R*v).toFixed(1)+'" r="3.2" fill="#0369a1"/>';});
  if(topItems&&topItems.length){
    const tAngles=Array.of(-Math.PI/4,Math.PI/4,3*Math.PI/4,-3*Math.PI/4);
    const tPoly=topItems.map((it,i)=>{
      const a=tAngles.at(i),v=Math.max(0,Math.min(1,Number(it.val)||0));
      const x=cx+Math.cos(a)*R*v,y=cy+Math.sin(a)*R*v;
      const lx=cx+Math.cos(a)*(R+22),ly=cy+Math.sin(a)*(R+17);
      s+='<text x="'+lx.toFixed(1)+'" y="'+ly.toFixed(1)+'" font-size="10" font-weight="bold" text-anchor="middle" fill="#be123c">'+it.short+'</text>';
      return x.toFixed(1)+","+y.toFixed(1);
    }).join(" ");
    s+='<polygon points="'+tPoly+'" fill="rgba(225,29,72,0.18)" stroke="#e11d48" stroke-width="2" stroke-dasharray="4,2"/>';
    topItems.forEach((it,i)=>{const a=tAngles.at(i),v=Math.max(0,Math.min(1,Number(it.val)||0));s+='<rect x="'+(cx+Math.cos(a)*R*v-3).toFixed(1)+'" y="'+(cy+Math.sin(a)*R*v-3).toFixed(1)+'" width="6" height="6" fill="#be123c"/>';});
  }
  s+='<rect x="44" y="'+(H-18)+'" width="10" height="10" fill="rgba(2,132,199,0.35)" stroke="#0284c7"/><text x="58" y="'+(H-9)+'" font-size="10" fill="#111">Подблоки (9)</text>';
  s+='<rect x="180" y="'+(H-18)+'" width="10" height="10" fill="rgba(225,29,72,0.28)" stroke="#e11d48"/><text x="194" y="'+(H-9)+'" font-size="10" fill="#111">Субиндексы (4)</text>';
  return s+'</svg>';
}
function getPassportData(mo,yr){
  const jk=mo.key,findM=pat=>DATA.metrics.find(m=>m.id===pat||m.title.includes(pat));
  const vOf=(pat,dec=4)=>{const m=findM(pat);if(!m)return"—";const v=getPassVal(m.id,yr,jk);return(v===undefined||v===null||v==="")?"—":fmtNum(v,dec);};
  const nOf=pat=>{const m=findM(pat);if(!m)return 0;const v=Number(getPassVal(m.id,yr,jk));return isNaN(v)?0:v;};
  const clVal=getPassVal("Кластер 2024","2024",jk)||"—",catYr=String(DATA.panel_cats?.[yr]?.[jk]||mo.cat||"5");
  const subBlocks=Array.of(
    {short:"ЭК-1",name:"Обеспеченность базовой водной инфраструктурой",val:nOf("ЭК-Подблок 1"),txt:vOf("ЭК-Подблок 1",4)},
    {short:"ЭК-2",name:"Износ коммунальных инженерных сетей",val:nOf("ЭК-Подблок 2"),txt:vOf("ЭК-Подблок 2",4)},
    {short:"ЭК-3",name:"Качество окружающей среды, газификация и отходы",val:nOf("ЭК-Подблок 3"),txt:vOf("ЭК-Подблок 3",4)},
    {short:"СЦ-1",name:"Демографическая устойчивость и соц. нагрузка",val:nOf("СЦ-Подблок 1"),txt:vOf("СЦ-Подблок 1",4)},
    {short:"СЦ-2",name:"Физическое состояние социальной инфраструктуры",val:nOf("СЦ-Подблок 2"),txt:vOf("СЦ-Подблок 2",4)},
    {short:"СЦ-3",name:"Жилищная обеспеченность и транспорт",val:nOf("СЦ-Подблок 3"),txt:vOf("СЦ-Подблок 3",4)},
    {short:"УЭ-1",name:"Производственно-инвестиционный потенциал",val:nOf("УЭ-Подблок 1"),txt:vOf("УЭ-Подблок 1",4)},
    {short:"УЭ-2",name:"Потребительский рынок и бюджетная автономия",val:nOf("УЭ-Подблок 2"),txt:vOf("УЭ-Подблок 2",4)},
    {short:"УЭ-3",name:"Финансовая результативность и администрирование",val:nOf("УЭ-Подблок 3"),txt:vOf("УЭ-Подблок 3",4)}
  );
  const ekList=DATA.metrics.filter(m=>m.id.startsWith("ЭК-0")||m.id.startsWith("ЭК-1")).map(m=>({id:m.id,title:m.title,val:vOf(m.id,m.dec)}));
  const scList=DATA.metrics.filter(m=>m.id.startsWith("СЦ-0")||m.id.startsWith("СЦ-1")).map(m=>({id:m.id,title:m.title,val:vOf(m.id,m.dec)}));
  const ueList=DATA.metrics.filter(m=>m.id.startsWith("УЭ-0")||m.id.startsWith("УЭ-1")).map(m=>({id:m.id,title:m.title,val:vOf(m.id,m.dec)}));
  return{
    clVal,clCol:DATA.cluster_colors?.[clVal]||"#e2e8f0",catTxt:PASS_CAT_NAMES[catYr]||"Малые",
    pop:vOf("Численность, чел.",0),area:vOf("Площадь, га",0),
    idxMain:vOf("Интегральный индекс устойчивого развития",4),
    idxEk:vOf("Индекс ЭК",4),idxSc:vOf("Индекс СЦ",4),idxUe:vOf("Индекс УЭ",4),idxIq:vOf("IQ от max",4),topSubs:Array.of({short:"ЭК",val:nOf("Индекс ЭК")},{short:"СЦ",val:nOf("Индекс СЦ")},{short:"УЭ",val:nOf("Индекс УЭ")},{short:"IQ",val:nOf("IQ от max")}),
    subBlocks,ekList,scList,ueList
  };
}
function renderPassport(){
  initPassportControls();
  const box=document.getElementById("sheetBox"),yr=document.getElementById("pYear").value,all=getPassMOs();
  const mo=all.find(m=>m.key===PASS_STATE.key);
  if(!mo){
    box.innerHTML='<div class="bench-empty"><b>Цифровой паспорт устойчивости муниципального образования</b><br><br>Выберите муниципальное образование в панели слева для формирования паспорта.<br><span style="font-size:13px;color:#64748b;">Для 193 МО динамической когорты доступен выбор года (2019–2024 гг.).</span></div>';
    return;
  }
  const pd=getPassportData(mo,yr);
  const bRow=(lbl,val,cls="")=>'<div class="pass-irow '+cls+'"><span>'+lbl+'</span><b>'+val+'</b></div>';
  let idxHtml=bRow("Индекс устойчивого развития",pd.idxMain,"main");
  idxHtml+=bRow("Экологический субиндекс",pd.idxEk,"sub")+pd.subBlocks.slice(0,3).map(b=>bRow(b.name,b.txt,"blk")).join("");
  idxHtml+=bRow("Социальный субиндекс",pd.idxSc,"sub")+pd.subBlocks.slice(3,6).map(b=>bRow(b.name,b.txt,"blk")).join("");
  idxHtml+=bRow("Управленческо-экономический субиндекс",pd.idxUe,"sub")+pd.subBlocks.slice(6,9).map(b=>bRow(b.name,b.txt,"blk")).join("");
  idxHtml+=bRow("Цифровой субиндекс (IQ от max)",pd.idxIq,"sub");
  const colHtml=(title,arr)=>'<div><div class="pass-col-hdr">'+title+'</div>'+arr.map(x=>'<div class="pass-crow"><span title="'+x.title+'"><b>'+x.id+'</b> — '+x.title+'</span><b>'+x.val+'</b></div>').join("")+'</div>';
  box.innerHTML='<div class="pass-view">'+
    '<div class="pass-top"><div class="pass-coat">Место под герб<br>(будет позже)</div><div class="pass-intro"><div class="pass-title">Цифровой паспорт устойчивости муниципального образования</div><div class="pass-sub">'+mo.full+' — '+yr+' г.</div><div class="pass-desc">Цифровой паспорт — это интерактивная аналитическая платформа, отражающая реальное состояние и потенциал развития. В режиме реального времени собраны ключевые показатели. Цифровой инструмент создан для открытого диалога между властью, бизнесом и жителями, помогая вместе планировать уверенное и экологичное будущее.</div></div></div>'+
    '<div class="pass-meta-grid"><div class="pass-mrow"><span>Кластер (2024 г.):</span><b style="background:'+pd.clCol+';padding:1px 8px;border-radius:3px;border:1px solid #475569;">'+pd.clVal+'</b></div><div class="pass-mrow"><span>Категория:</span><b>'+pd.catTxt+'</b></div><div class="pass-mrow"><span>Численность, чел.:</span><b>'+pd.pop+'</b></div><div class="pass-mrow"><span>Площадь, га:</span><b>'+pd.area+'</b></div></div>'+
    '<div class="pass-mid"><div class="pass-radar-box"><div style="font-weight:bold;margin-bottom:4px;">Профиль устойчивости ('+yr+' г.)</div>'+buildRadarSvg(pd.subBlocks,pd.topSubs)+'</div><div class="pass-idx-box">'+idxHtml+'</div></div>'+
    '<div class="pass-bot">'+colHtml("Экологический блок",pd.ekList)+colHtml("Социальный блок",pd.scList)+colHtml("Управленческо-экономический блок",pd.ueList)+'</div></div>';
}

function buildPassportCanvas(overrideMO=null){
  const yr=document.getElementById("pYear").value,all=getPassMOs(),mo=overrideMO||all.find(m=>m.key===PASS_STATE.key);
  if(!mo){alert("Выберите муниципальное образование для паспорта.");return null;}
  const pd=getPassportData(mo,yr),W=2234,H=3160,canvas=document.createElement("canvas");canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext("2d");ctx.fillStyle="#ffffff";ctx.fillRect(0,0,W,H);
  ctx.strokeStyle="#475569";ctx.lineWidth=2;ctx.strokeRect(50,45,210,210);
  ctx.fillStyle="#475569";ctx.font="20px 'Times New Roman'";ctx.textAlign="center";
  ctx.fillText("Место под герб",155,140);ctx.fillText("(будет позже)",155,168);
  ctx.fillStyle="#111111";ctx.font="bold 40px 'Times New Roman'";
  ctx.fillText("Цифровой паспорт устойчивости",1240,95);ctx.fillText("муниципального образования",1240,142);
  ctx.font="bold 30px 'Times New Roman'";ctx.fillText(mo.full+" ("+yr+" г.)",1240,188);
  ctx.font="italic 20px 'Times New Roman'";ctx.fillText("Интерактивная аналитическая платформа, отражающая реальное состояние и потенциал развития МО.",1240,228);
  ctx.textAlign="left";
  ctx.strokeStyle="#cbd5e1";ctx.strokeRect(50,280,2134,115);
  ctx.font="bold 24px 'Times New Roman'";ctx.fillStyle="#111111";
  ctx.fillText("Кластер: "+pd.clVal,75,325);ctx.fillText("Категория: "+pd.catTxt,1150,325);
  ctx.fillText("Численность, чел.: "+pd.pop,75,372);ctx.fillText("Площадь, га: "+pd.area,1150,372);
  const rcx=520,rcy=760,R=240,n=pd.subBlocks.length;
  Array.of(0.2,0.4,0.6,0.8,1.0).forEach(lv=>{ctx.strokeStyle="#cbd5e1";ctx.beginPath();pd.subBlocks.forEach((_,i)=>{const a=-Math.PI/2+i*2*Math.PI/n,x=rcx+Math.cos(a)*R*lv,y=rcy+Math.sin(a)*R*lv;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.closePath();ctx.stroke();});
  ctx.beginPath();pd.subBlocks.forEach((it,i)=>{const a=-Math.PI/2+i*2*Math.PI/n,v=Math.max(0,Math.min(1,Number(it.val)||0)),x=rcx+Math.cos(a)*R*v,y=rcy+Math.sin(a)*R*v;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.closePath();ctx.fillStyle="rgba(2,132,199,0.28)";ctx.fill();ctx.strokeStyle="#0284c7";ctx.lineWidth=3;ctx.stroke();
  ctx.fillStyle="#0369a1";ctx.font="bold 20px 'Times New Roman'";ctx.textAlign="center";
  pd.subBlocks.forEach((it,i)=>{const a=-Math.PI/2+i*2*Math.PI/n;ctx.fillText(it.short,rcx+Math.cos(a)*(R+34),rcy+Math.sin(a)*(R+28));});
  if(pd.topSubs){
    const tAng=Array.of(-Math.PI/4,Math.PI/4,3*Math.PI/4,-3*Math.PI/4);
    ctx.beginPath();pd.topSubs.forEach((it,i)=>{const a=tAng.at(i),v=Math.max(0,Math.min(1,Number(it.val)||0)),x=rcx+Math.cos(a)*R*v,y=rcy+Math.sin(a)*R*v;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.closePath();
    ctx.fillStyle="rgba(225,29,72,0.2)";ctx.fill();ctx.strokeStyle="#e11d48";ctx.lineWidth=3;ctx.stroke();
    ctx.fillStyle="#be123c";pd.topSubs.forEach((it,i)=>{const a=tAng.at(i);ctx.fillText(it.short,rcx+Math.cos(a)*(R+44),rcy+Math.sin(a)*(R+36));});
  }
  ctx.textAlign="left";
  const ix=1020,iw=1164;let iy=430;
  const drawIRow=(lbl,val,kind)=>{
    if(kind==="main"){ctx.fillStyle="#e2e8f0";ctx.fillRect(ix,iy-28,iw,38);ctx.font="bold 25px 'Times New Roman'";}
    else if(kind==="sub"){ctx.fillStyle="#f1f5f9";ctx.fillRect(ix,iy-24,iw,32);ctx.font="bold 22px 'Times New Roman'";}
    else{ctx.font="19px 'Times New Roman'";}
    ctx.fillStyle="#111111";ctx.fillText((kind==="blk"?"   ":"")+lbl,ix+10,iy);ctx.textAlign="right";ctx.fillText(val,ix+iw-10,iy);ctx.textAlign="left";iy+=(kind==="blk"?32:40);
  };
  drawIRow("Индекс устойчивого развития",pd.idxMain,"main");
  drawIRow("Экологический субиндекс",pd.idxEk,"sub");pd.subBlocks.slice(0,3).forEach(b=>drawIRow(b.name,b.txt,"blk"));
  drawIRow("Социальный субиндекс",pd.idxSc,"sub");pd.subBlocks.slice(3,6).forEach(b=>drawIRow(b.name,b.txt,"blk"));
  drawIRow("Управленческо-экономический субиндекс",pd.idxUe,"sub");pd.subBlocks.slice(6,9).forEach(b=>drawIRow(b.name,b.txt,"blk"));
  drawIRow("Цифровой субиндекс (IQ от max)",pd.idxIq,"sub");
  const cols=Array.of({t:"Экологический блок",a:pd.ekList},{t:"Социальный блок",a:pd.scList},{t:"Управленческо-экономический блок",a:pd.ueList});
  const cw=690,by0=1140;
  cols.forEach((col,ci)=>{
    const cx0=50+ci*722;ctx.fillStyle="#eef3f8";ctx.fillRect(cx0,by0,cw,42);ctx.fillStyle="#111111";ctx.font="bold 23px 'Times New Roman'";ctx.textAlign="center";ctx.fillText(col.t,cx0+cw/2,by0+29);ctx.textAlign="left";
    let cy=by0+74;
    col.a.forEach(it=>{
      ctx.strokeStyle="#e2e8f0";ctx.beginPath();ctx.moveTo(cx0,cy+10);ctx.lineTo(cx0+cw,cy+10);ctx.stroke();
      ctx.font="17px 'Times New Roman'";const full=it.id+" — "+it.title;
      if(full.length<=48){ctx.fillText(full,cx0+4,cy);}
      else{const cut=full.lastIndexOf(" ",48)>18?full.lastIndexOf(" ",48):48;ctx.fillText(full.slice(0,cut),cx0+4,cy-8);ctx.fillText(full.slice(cut+1,cut+49),cx0+4,cy+11);}
      ctx.font="bold 18px 'Times New Roman'";ctx.textAlign="right";ctx.fillText(it.val,cx0+cw-4,cy);ctx.textAlign="left";cy+=54;
    });
  });
  const sc=Number(document.getElementById("selDpi")?.value||1);
  if(sc<0.99){const c2=document.createElement("canvas");c2.width=Math.round(W*sc);c2.height=Math.round(H*sc);const x2=c2.getContext("2d");x2.imageSmoothingEnabled=true;x2.imageSmoothingQuality="high";x2.drawImage(canvas,0,0,c2.width,c2.height);return c2;}
  return canvas;
}
