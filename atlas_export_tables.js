// Модуль рендера таблиц динамики (2019-2024 гг.)
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
    if(curPg.length>=23){pagesArr.push(curPg);curPg=Array.of();}
  });
  if(curPg.length>0)pagesArr.push(curPg);
  const totalPages=pagesArr.length,W=3160,H=2234,sc=Number(document.getElementById("selDpi")?.value||1);
  const catsLeg=Array.of({c:"1",t:"Крупнейшие (> 1 млн чел.)"},{c:"2",t:"Крупные (250 тыс. – 1 млн)"},{c:"3",t:"Большие (100 – 250 тыс.)"},{c:"4",t:"Средние (50 – 100 тыс.)"},{c:"5",t:"Малые (≤ 50 тыс. чел.)"});
  const out=Array.of();
  for(let pg=0;pg<totalPages;pg++){
    const sub=pagesArr.at(pg),canvas=document.createElement("canvas");canvas.width=W;canvas.height=H;
    const ctx=canvas.getContext("2d");ctx.fillStyle="#ffffff";ctx.fillRect(0,0,W,H);
    ctx.fillStyle="#111111";ctx.textAlign="center";ctx.font="bold 36px 'Times New Roman'";
    const mLines=wrapTitle(mMeta.title+" (2019–2024 гг.)",105).split("<br>");
    if(mLines.length===1){ctx.fillText(mLines.at(0),W/2,56);}else{ctx.fillText(mLines.at(0),W/2,44);ctx.fillText(mLines.at(1),W/2,84);}
    ctx.font="bold 36px 'Times New Roman'";ctx.fillText(terrTitle+(totalPages>1?" — Лист "+(pg+1)+" из "+totalPages:""),W/2,128);ctx.textAlign="left";
    const xCols=Array.of(40,530,1240,1553,1866,2179,2492,2805,3120),tTop=156,hdrH=52,rowH=81;
    ctx.fillStyle="#eef3f8";ctx.fillRect(40,tTop,3080,hdrH);ctx.strokeStyle="#64748b";ctx.lineWidth=1.5;ctx.strokeRect(40,tTop,3080,hdrH);
    const hdrs=Array.of("Регион","Муниципальное образование","2019 г.","2020 г.","2021 г.","2022 г.","2023 г.","2024 г.");
    ctx.fillStyle="#111111";ctx.font="bold 28px 'Times New Roman'";ctx.textAlign="center";
    hdrs.forEach((h,i)=>{if(i>0){ctx.beginPath();ctx.moveTo(xCols.at(i),tTop);ctx.lineTo(xCols.at(i),tTop+hdrH);ctx.stroke();}ctx.fillText(h,(xCols.at(i)+xCols.at(i+1))/2,tTop+34);});
    sub.forEach((it,ri)=>{
      const y=tTop+hdrH+ri*rowH;
      if(it.isFO){ctx.fillStyle="#dbeafe";ctx.fillRect(40,y,3080,rowH);ctx.strokeStyle="#64748b";ctx.strokeRect(40,y,3080,rowH);ctx.fillStyle="#111111";ctx.textAlign="left";ctx.font="bold 28px 'Times New Roman'";ctx.fillText(it.title,56,y+47);return;}
      const f=it.f,jk=f.properties.join_key;
      ctx.strokeStyle="#cbd5e1";ctx.lineWidth=1.2;ctx.strokeRect(40,y,3080,rowH);
      for(let ci=1;ci<8;ci++){ctx.beginPath();ctx.moveTo(xCols.at(ci),y);ctx.lineTo(xCols.at(ci),y+rowH);ctx.stroke();}
      ctx.fillStyle="#111111";ctx.textAlign="left";ctx.font="28px 'Times New Roman'";
      const rTxt=f.properties.region;ctx.fillText(rTxt.length>29?rTxt.slice(0,28)+"…":rTxt,54,y+48);
      ctx.font=(f.properties.is_center?"bold ":"")+"28px 'Times New Roman'";const mTxt=f.properties._lbl;ctx.fillText(mTxt.length>40?mTxt.slice(0,39)+"…":mTxt,544,y+48);
      ctx.textAlign="center";
      yrs.forEach((yr,yi)=>{
        const cx=(xCols.at(yi+2)+xCols.at(yi+3))/2,v=DATA.panel[mId]?.[yr]?.[jk],catYr=String(DATA.panel_cats?.[yr]?.[jk]||"5");
        let fill="#ffffff",txt="н/д";
        if(v!==undefined&&v!==null&&v!==""){
          if(mMeta.cat){fill=DATA.cluster_colors[v]||"#e2e8f0";txt=String(v).split(" ").at(0);}
          else{const nv=Number(v);txt=fmtNum(nv,mMeta.dec);if(scTbl){const u=scTbl.vmax<=scTbl.vmin?0.5:Math.pow(Math.max(0,Math.min(1,(nv-scTbl.vmin)/(scTbl.vmax-scTbl.vmin))),scTbl.gamma);const ci=Math.min(scTbl.pal.length-1,Math.floor(u*scTbl.pal.length));fill=scTbl.pal.at(ci);}}
        }
        drawCatShape(ctx,catYr,cx,y+30,15,fill);
        ctx.fillStyle="#111111";ctx.font="bold  24px \'Times New Roman\'";ctx.fillText(txt,cx,y+67);
      });
    });
    const footY=2095;ctx.strokeStyle="#94a3b8";ctx.beginPath();ctx.moveTo(40,footY);ctx.lineTo(3120,footY);ctx.stroke();
    ctx.textAlign="left";ctx.font=" 24px \'Times New Roman\'";
    catsLeg.forEach((it,i)=>{const c=Math.floor(i/2),r=i%2,lx=55+c*520,ly=footY+36+r*44;drawCatShape(ctx,it.c,lx,ly-6,11,"#ffffff");ctx.fillStyle="#111111";ctx.fillText(it.t,lx+22,ly);});
    if(scTbl){
      const xBar=2000,wBar=1100,grd=ctx.createLinearGradient(xBar,0,xBar+wBar,0);scTbl.pal.forEach((c,i)=>grd.addColorStop(i/(scTbl.pal.length-1),c));
      ctx.fillStyle=grd;ctx.fillRect(xBar,footY+18,wBar,32);ctx.strokeStyle="#475569";ctx.strokeRect(xBar,footY+18,wBar,32);
      ctx.fillStyle="#111111";ctx.font="bold  24px \'Times New Roman\'";ctx.textAlign="center";
      scTbl.ticks.forEach((t,i)=>ctx.fillText(fmtNum(t,mMeta.dec),xBar+wBar*(0.06+i*0.22),footY+80));
    }
    if(sc<0.99){const c2=document.createElement("canvas");c2.width=Math.round(W*sc);c2.height=Math.round(H*sc);const x2=c2.getContext("2d");x2.imageSmoothingEnabled=true;x2.imageSmoothingQuality="high";x2.drawImage(canvas,0,0,c2.width,c2.height);out.push(c2);}
    else out.push(canvas);
  }
  return out;
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
  const sc=Number(document.getElementById("selDpi")?.value||1),W=Math.round(3508*sc),H=Math.round(2480*sc),rowsPerPage=46,pages=Math.max(1,Math.ceil(sorted.length/rowsPerPage)),out=Array.of();
  const fVals=sorted.flatMap(r=>r.vals).filter(v=>v!==null&&v!==undefined&&!isNaN(Number(v))).map(Number),mn=fVals.length?Math.min(...fVals):0,mx=fVals.length?Math.max(...fVals):1;
  const subTitle=hasRF?"Российская Федерация (сводная выборка)":"Выбранные территории ("+terrs.length+" поз.)";
  for(let pg=0;pg<pages;pg++){
    const cv=document.createElement("canvas");cv.width=W;cv.height=H;const ctx=cv.getContext("2d");ctx.scale(sc,sc);
    ctx.fillStyle="#ffffff";ctx.fillRect(0,0,3508,2480);ctx.strokeStyle="#111111";ctx.lineWidth=3;ctx.strokeRect(18,18,3472,2444);
    ctx.fillStyle="#111111";ctx.font="bold 36px 'Times New Roman'";ctx.textAlign="center";
    const mLines=wrapTitle(mObj.id+" — "+mObj.title,115).split("<br>");
    if(mLines.length===1){ctx.fillText(mLines.at(0),1754,64);}else{ctx.fillText(mLines.at(0),1754,54);ctx.fillText(mLines.at(1),1754,94);}
    ctx.font="bold 36px 'Times New Roman'";ctx.fillStyle="#111111";
    ctx.fillText(subTitle+" • Динамика 2019–2024 гг. • Лист "+(pg+1)+" из "+pages,1754,138);
    const cols=Array.of({x:40,w:980,t:"Муниципальное образование (Регион)"},{x:1020,w:380,t:"Категория МО"},{x:1400,w:330,t:"2019"},{x:1730,w:330,t:"2020"},{x:2060,w:330,t:"2021"},{x:2390,w:330,t:"2022"},{x:2720,w:330,t:"2023"},{x:3050,w:418,t:"2024"});
    ctx.fillStyle="#eef3f8";ctx.fillRect(40,170,3428,48);ctx.strokeStyle="#64748b";ctx.lineWidth=1.5;ctx.strokeRect(40,170,3428,48);
    ctx.fillStyle="#111111";ctx.font="bold 28px 'Times New Roman'";
    cols.forEach(c=>{ctx.strokeRect(c.x,170,c.w,48);ctx.fillText(c.t,c.x+c.w/2,202);});
    const slice=sorted.slice(pg*rowsPerPage,(pg+1)*rowsPerPage);
    slice.forEach((r,idx)=>{
      const y=218+idx*43;ctx.fillStyle=idx%2?"#fafbfc":"#ffffff";ctx.fillRect(40,y,3428,42);
      ctx.strokeStyle="#cbd5e1";ctx.lineWidth=1;cols.forEach(c=>ctx.strokeRect(c.x,y,c.w,42));
      ctx.textAlign="left";ctx.fillStyle="#111111";ctx.font=" 24px \'Times New Roman\'";
      ctx.fillText((r.lbl+" ("+r.reg+")").slice(0,58),52,y+28);
      ctx.textAlign="center";ctx.fillText((CAT_NAMES[r.cat]||r.cat).slice(0,22),1210,y+28);
      r.vals.forEach((v,vi)=>{
        const cx=cols.at(vi+2).x,cw=cols.at(vi+2).w;
        if(v!==null&&v!==undefined&&!isNaN(Number(v))){
          const t=mx>mn?(Number(v)-mn)/(mx-mn):0.5,rgb=samplePalRGB(currentPal,mObj.inv?1-t:t);
          ctx.fillStyle="rgba("+rgb.at(0)+","+rgb.at(1)+","+rgb.at(2)+",0.35)";ctx.fillRect(cx+1,y+1,cw-2,40);
        }
        ctx.fillStyle="#111111";ctx.font="bold 28px 'Times New Roman'";ctx.fillText(fmtVal(v,mObj.dec),cx+cw/2,y+28);
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
