
function drawCatShape(ctx,cat,cx,cy,r,fill){
  ctx.fillStyle=fill;ctx.strokeStyle="#334155";ctx.lineWidth=1.5;ctx.beginPath();
  if(cat==="1"){ctx.rect(cx-r,cy-r,r*2,r*2);}
  else if(cat==="2"){ctx.moveTo(cx,cy-r*1.15);ctx.lineTo(cx+r*1.15,cy);ctx.lineTo(cx,cy+r*1.15);ctx.lineTo(cx-r*1.15,cy);ctx.closePath();}
  else if(cat==="3"){ctx.moveTo(cx,cy-r*1.15);ctx.lineTo(cx+r*1.1,cy+r*0.95);ctx.lineTo(cx-r*1.1,cy+r*0.95);ctx.closePath();}
  else if(cat==="4"){ctx.arc(cx,cy,r,0,Math.PI*2);}
  else{for(let i=0;i<5;i++){const a=-Math.PI/2+i*2*Math.PI/5,px=cx+Math.cos(a)*r*1.1,py=cy+Math.sin(a)*r*1.1;if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.closePath();}
  ctx.fill();ctx.stroke();
}
function buildTableCanvases(){
  const fo=document.getElementById("selFO").value,reg=document.getElementById("selReg").value,mId=document.getElementById("selMetric").value;
  const mMeta=DATA.metrics.find(m=>m.id===mId),terrTitle=reg!=="ALL"?reg:(fo==="RF"?"Российская Федерация":fo+" федеральный округ");
  const actCol=PALETTES[currentPal]||PALETTES["RdYlGn"],yrs=Array.of("2019","2020","2021","2022","2023","2024");
  const scTbl=mMeta.cat?null:computeScale(yrs.flatMap(y=>Object.values(DATA.panel[mId]?.[y]||{})).map(Number).filter(v=>!isNaN(v)),actCol,mMeta.inv);
  const allFeats=GEO.features.filter(f=>(fo==="RF"||f.properties.fo===fo)&&(reg==="ALL"||f.properties.region===reg));
  const rows=Array.from(allFeats.filter(f=>f.properties.coh&&!f.properties._inset).reduce((m,f)=>m.set(f.properties.join_key,f),new Map()).values()).sort((a,b)=>a.properties.region.localeCompare(b.properties.region,"ru")||a.properties._lbl.localeCompare(b.properties._lbl,"ru"));
  if(!rows.length){alert("Нет строк для отображения в выбранной территории.");return Array.of();}
  const perPage=24,totalPages=Math.ceil(rows.length/perPage),W=3160,H=2234,sc=Number(document.getElementById("selDpi")?.value||1);
  const catsLeg=Array.of(
    {c:"1",t:"Крупнейшие (> 1 млн чел.)"},{c:"2",t:"Крупные (250 тыс. – 1 млн)"},
    {c:"3",t:"Большие (100 – 250 тыс.)"},{c:"4",t:"Средние (50 – 100 тыс.)"},{c:"5",t:"Малые (≤ 50 тыс. чел.)"}
  );
  const out=Array.of();
  for(let pg=0;pg<totalPages;pg++){
    const sub=rows.slice(pg*perPage,(pg+1)*perPage),canvas=document.createElement("canvas");canvas.width=W;canvas.height=H;
    const ctx=canvas.getContext("2d");ctx.fillStyle="#ffffff";ctx.fillRect(0,0,W,H);
    ctx.fillStyle="#111111";ctx.textAlign="center";ctx.font="bold 34px 'Times New Roman'";
    ctx.fillText(mMeta.title+" (2019–2024 гг.)",W/2,56);
    ctx.font="bold 26px 'Times New Roman'";ctx.fillText(terrTitle+(totalPages>1?" — Лист "+(pg+1)+" из "+totalPages:""),W/2,96);
    ctx.textAlign="left";
    const xCols=Array.of(40,460,1120,1453,1786,2119,2452,2785,3120),tTop=120,hdrH=52,rowH=78;
    ctx.fillStyle="#eef3f8";ctx.fillRect(40,tTop,3080,hdrH);ctx.strokeStyle="#64748b";ctx.lineWidth=1.5;ctx.strokeRect(40,tTop,3080,hdrH);
    const hdrs=Array.of("Регион","Муниципальное образование","2019 г.","2020 г.","2021 г.","2022 г.","2023 г.","2024 г.");
    ctx.fillStyle="#111111";ctx.font="bold 21px 'Times New Roman'";ctx.textAlign="center";
    hdrs.forEach((h,i)=>{if(i>0){ctx.beginPath();ctx.moveTo(xCols.at(i),tTop);ctx.lineTo(xCols.at(i),tTop+hdrH);ctx.stroke();}ctx.fillText(h,(xCols.at(i)+xCols.at(i+1))/2,tTop+34);});
    sub.forEach((f,ri)=>{
      const y=tTop+hdrH+ri*rowH,jk=f.properties.join_key;
      ctx.strokeStyle="#cbd5e1";ctx.lineWidth=1.2;ctx.strokeRect(40,y,3080,rowH);
      for(let ci=1;ci<8;ci++){ctx.beginPath();ctx.moveTo(xCols.at(ci),y);ctx.lineTo(xCols.at(ci),y+rowH);ctx.stroke();}
      ctx.fillStyle="#111111";ctx.textAlign="left";ctx.font="19px 'Times New Roman'";
      const rTxt=f.properties.region;ctx.fillText(rTxt.length>26?rTxt.slice(0,25)+"…":rTxt,54,y+46);
      ctx.font="bold 19px 'Times New Roman'";const mTxt=f.properties._lbl;ctx.fillText(mTxt.length>38?mTxt.slice(0,37)+"…":mTxt,474,y+46);
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
  window._isExportMode=true;
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
    }else if(window._badgesReady){await window._badgesReady;}

    mapEl.querySelectorAll(".geolayer text").forEach(t=>{t.style.stroke="#ffffff";t.style.strokeWidth="3.5px";t.style.paintOrder="stroke";t.style.fontWeight="bold";});
    const hPaths=Array.from(mapEl.querySelectorAll("path")).filter(p=>{const s=(p.getAttribute("style")||"")+(p.getAttribute("fill")||"");return s.includes("zatoHatch")||s.includes("0.987")||s.replace(/\s/g,"").includes("203,213,225");});
    hPaths.forEach(p=>{p.style.fill="#e2e8f0";p.style.fillOpacity="1";p.setAttribute("fill","#e2e8f0");});
    const allAnns=(mapEl.layout.annotations||Array.of()).slice(),hasNorthLbl=allAnns.some(a=>String(a.text||"").includes("Карта северных территорий"));if(hasNorthLbl)await Plotly.relayout(mapEl,{annotations:allAnns.filter(a=>!String(a.text||"").includes("Карта северных территорий"))});const mapW=3080,mapH=1945,imgData=await Plotly.toImage(mapEl,{format:"png",width:1540,height:972,scale:2});if(hasNorthLbl)await Plotly.relayout(mapEl,{annotations:allAnns});
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
    {
      const idt=ctx.getImageData(40,155,mapW,mapH),px=idt.data;
      for(let y=0;y<mapH;y++){for(let x=0;x<mapW;x++){const k=(y*mapW+x)*4;const isZ=(Math.abs(px[k]-204)<=4&&Math.abs(px[k+1]-214)<=4&&Math.abs(px[k+2]-225)<=4);if(isZ&&((x+y)%22)<7){px[k]=71;px[k+1]=85;px[k+2]=105;}}}
      ctx.putImageData(idt,40,155);
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
    if(numTraceAdded){const delArr=window._numTrCnt===6?Array.of(-6,-5,-4,-3,-2,-1):Array.of(-3,-2,-1);await Plotly.deleteTraces(mapEl,delArr);if(coreTrIdx!==-1)await Plotly.restyle(mapEl,{visible:true},Array.of(coreTrIdx));if(savedAnns)await Plotly.relayout(mapEl,{annotations:savedAnns});}
    window._isExportMode=prevExp;if(reg!=="ALL"&&!prevExp)render();
  }
}

async function exportFullSheetPng(){
  const mVal=document.getElementById("selMode").value;if(mVal==="table"){const cs=buildTableCanvases();cs.forEach((cv,i)=>{const a=document.createElement("a");a.download="Таблица_динамики_"+(i+1)+".png";a.href=cv.toDataURL("image/png");a.click();});return;}const c=mVal==="passport"?buildPassportCanvas():(mVal==="bench"?buildBenchCanvas():await buildSheetCanvas());if(!c)return;
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
  const curM=document.getElementById("selMode").value;if(curM==="table"){const cs=buildTableCanvases();if(!cs.length)return;const pages=cs.map(cv=>{const b64=cv.toDataURL("image/jpeg",0.85).split(",").at(1),bin=atob(b64),arr=new Uint8Array(bin.length);for(let k=0;k<bin.length;k++)arr[k]=bin.charCodeAt(k);return{w:cv.width,h:cv.height,jpg:arr};});const a=document.createElement("a");a.download="Таблица_динамики_МО.pdf";a.href=URL.createObjectURL(buildPdfBlob(pages));a.click();return;}if(curM==="passport"){const c=buildPassportCanvas();if(!c)return;const b64=c.toDataURL("image/jpeg",0.85).split(",").at(1),bin=atob(b64),arr=new Uint8Array(bin.length);for(let k=0;k<bin.length;k++)arr[k]=bin.charCodeAt(k);const a=document.createElement("a");a.download="Цифровой_паспорт_МО.pdf";a.href=URL.createObjectURL(buildPdfBlob(Array.of({w:c.width,h:c.height,jpg:arr})));a.click();return;}if(curM==="bench"){const c=buildBenchCanvas();if(!c)return;const b64=c.toDataURL("image/jpeg",0.85).split(",").at(1),bin=atob(b64),arr=new Uint8Array(bin.length);for(let k=0;k<bin.length;k++)arr[k]=bin.charCodeAt(k);const a=document.createElement("a");a.download="Бенчмаркинг_МО.pdf";a.href=URL.createObjectURL(buildPdfBlob(Array.of({w:c.width,h:c.height,jpg:arr})));a.click();return;}
  const origFO=sFO.value,origReg=sReg.value,queue=Array.of(),pages=Array.of();
  if(scope==="fo"){queue.push({fo:"RF",reg:"ALL"});DATA.fos.forEach(f=>queue.push({fo:f,reg:"ALL"}));}
  else if(scope==="cur_fo"){const fl=origFO==="RF"?DATA.fos:Array.of(origFO);fl.forEach(f=>(DATA.fo_to_regs[f]||Array.of()).forEach(r=>queue.push({fo:f,reg:r})));}
  else{queue.push({fo:"RF",reg:"ALL"});DATA.fos.forEach(f=>{queue.push({fo:f,reg:"ALL"});(DATA.fo_to_regs[f]||Array.of()).forEach(r=>queue.push({fo:f,reg:r}));});}
  btn.disabled=true;window._isExportMode=true;
  try{
    for(let i=0;i<queue.length;i++){
      btn.textContent="PDF: "+(i+1)+" / "+queue.length+"...";const it=queue.at(i);
      if(sFO.value!==it.fo){sFO.value=it.fo;sReg.innerHTML='<option value="ALL">Весь округ / РФ</option>';if(it.fo!=="RF")(DATA.fo_to_regs[it.fo]||Array.of()).forEach(r=>sReg.add(new Option(r,r)));}
      sReg.value=it.reg;render();if(window._plotReady)await window._plotReady;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(r,380))));
      const c=await buildSheetCanvas();if(!c)continue;
      const scDpi=Number(document.getElementById("selDpi")?.value||1),qJpg=scDpi<0.38?0.48:(scDpi<0.6?0.62:(scDpi<0.9?0.74:0.85)),b64=c.toDataURL("image/jpeg",qJpg).split(",").at(1),bin=atob(b64),arr=new Uint8Array(bin.length);
      for(let k=0;k<bin.length;k++)arr[k]=bin.charCodeAt(k);pages.push({w:c.width,h:c.height,jpg:arr});
    }
    if(pages.length>0){const a=document.createElement("a");a.download="Атлас_"+mId+"_"+scope+".pdf";a.href=URL.createObjectURL(buildPdfBlob(pages));a.click();}
  }finally{
    window._isExportMode=false;sFO.value=origFO;sReg.innerHTML='<option value="ALL">Весь округ / РФ</option>';if(origFO!=="RF")(DATA.fo_to_regs[origFO]||Array.of()).forEach(r=>sReg.add(new Option(r,r)));
    sReg.value=origReg;render();btn.disabled=false;btn.textContent="Выгрузить PDF";
  }
}
