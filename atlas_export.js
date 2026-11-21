async function buildSheetCanvas(){
  const mode=document.getElementById("selMode").value;
  if(mode==="table"){alert("Переключитесь в режим карты или сетки.");return null;}
  const mId=document.getElementById("selMetric").value,reg=document.getElementById("selReg").value,fo=document.getElementById("selFO").value,yr=document.getElementById("selYear").value;
  const mMeta=DATA.metrics.find(x=>x.id===mId)||DATA.metrics.at(0);
  const isArk=reg.includes("Архангельск"),isNW=(fo.includes("Северо-Запад")||fo==="СЗФО")&&reg==="ALL";
  const hasInsets=isArk||isNW;
  const regFeats=(reg!=="ALL")?Array.from(GEO.features.filter(f=>f.properties.region===reg&&f.properties._map_status==="В_выборке"&&!f.properties._inset).reduce((m,f)=>{if(!m.has(f.properties.join_key))m.set(f.properties.join_key,f);return m;},new Map()).values()).sort((a,b)=>(Number(Boolean(b.properties.is_center))-Number(Boolean(a.properties.is_center)))||a.properties._lbl.localeCompare(b.properties._lbl,"ru")):Array.of();
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
        const lLon=Array.of(),lLat=Array.of();arr.forEach(p=>{if(Math.hypot((p.lon-p.ox)/tx,(p.lat-p.oy)/ty)>lThr){lLon.push(p.ox,p.lon,null);lLat.push(p.oy,p.lat,null);}});
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
  const c=await buildSheetCanvas();if(!c)return;
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
  if(document.getElementById("selMode").value==="table")return alert("Переключитесь в режим карты или сетки.");
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
