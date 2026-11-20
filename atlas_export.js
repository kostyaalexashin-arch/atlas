async function buildSheetCanvas(){
  const mapEl=document.getElementById("mapDiv");
  if(!mapEl)return alert("Переключитесь в режим карты или сетки.");
  const mId=document.getElementById("selMetric").value,reg=document.getElementById("selReg").value,fo=document.getElementById("selFO").value;
  const regFeats=(reg!=="ALL")?Array.from(GEO.features.filter(f=>f.properties.region===reg&&f.properties._map_status==="В_выборке"&&!f.properties._inset).reduce((m,f)=>{if(!m.has(f.properties.join_key))m.set(f.properties.join_key,f);return m;},new Map()).values()).sort((a,b)=>a.properties._lbl.localeCompare(b.properties._lbl,"ru")):Array.of();
  const hasRightList=regFeats.length>0;
  let numTraceAdded=false,savedAnns=null,coreTrIdx=-1;
  if(hasRightList){
    savedAnns=(mapEl.layout.annotations||Array.of()).slice();
    coreTrIdx=mapEl.data.findIndex(t=>t.type==="scattergeo"&&t.mode==="text");
    if(coreTrIdx!==-1)await Plotly.restyle(mapEl,{visible:false},Array.of(coreTrIdx));
    await Plotly.relayout(mapEl,{annotations:savedAnns.filter(a=>!a._isCore)});
    const pts=regFeats.map(f=>{const c=(f.properties._cx!==undefined&&f.properties._cx!==0)?{lon:f.properties._cx,lat:f.properties._cy}:getCenter(f.geometry);return{lon:c.lon,lat:c.lat};});
    for(let i=0;i<pts.length;i++){
      for(let j=0;j<i;j++){
        if(Math.hypot(pts.at(i).lon-pts.at(j).lon,pts.at(i).lat-pts.at(j).lat)<0.075){
          pts.at(j).lon-=0.038;pts.at(j).lat+=0.022;
          pts.at(i).lon+=0.038;pts.at(i).lat-=0.022;
        }
      }
    }
    await Plotly.addTraces(mapEl,{type:"scattergeo",mode:"text",lon:pts.map(p=>p.lon),lat:pts.map(p=>p.lat),text:regFeats.map((_,i)=>String(i+1)),textfont:{family:"Times New Roman",size:14,color:"#111111"},showlegend:false,hoverinfo:"skip"});
    numTraceAdded=true;
  }
  try{
    if(!hasRightList&&window._badgesReady)await window._badgesReady;
    const mapW=hasRightList?2460:3160,mapH=1680;
    mapEl.querySelectorAll(".geolayer text").forEach(t=>{t.style.stroke="#ffffff";t.style.strokeWidth="3.5px";t.style.paintOrder="stroke";t.style.fontWeight="bold";});
    const imgData=await Plotly.toImage(mapEl,{format:"png",width:Math.round(mapW/2),height:Math.round(mapH/2),scale:2});

    const xList=2485,yTop=95,LINE_STEP=24,FONT_SIZE=18;
    const listBottom=hasRightList?(yTop+18+regFeats.length*LINE_STEP+16):mapH;
    const contentH=Math.max(mapH,listBottom);

    const canvas=document.createElement("canvas");
    canvas.width=3160;canvas.height=contentH+190;
    const ctx=canvas.getContext("2d");ctx.fillStyle="#ffffff";ctx.fillRect(0,0,canvas.width,canvas.height);
    const mapImg=new Image();
    await new Promise(ok=>{mapImg.onload=ok;mapImg.src=imgData;});
    ctx.drawImage(mapImg,0,0,mapW,mapH);

    if(hasRightList){
      ctx.strokeStyle="#cbd5e1";ctx.lineWidth=1.5;ctx.strokeRect(xList-15,yTop-38,3145-xList,contentH-yTop+38);
      ctx.fillStyle="#111111";ctx.font="bold 21px 'Times New Roman'";
      ctx.fillText("Муниципальные образования:",xList,yTop-10);
      ctx.font=FONT_SIZE+"px 'Times New Roman'";
      regFeats.forEach((f,i)=>{
        const lbl=(i+1)+". "+f.properties._lbl;
        ctx.fillText(lbl.length>46?lbl.slice(0,45)+"…":lbl,xList,yTop+18+i*LINE_STEP);
      });
    }

    const hasCbar=!!document.querySelector("#sheetBox .cbar-strip");
    const legW=hasCbar?1920:3080,footY=contentH+14,footH=155;
    ctx.strokeStyle="#cbd5e1";ctx.lineWidth=1.5;ctx.strokeRect(40,footY,legW,footH);

    const items=Array.from(document.querySelectorAll("#sheetBox .leg-item"));
    const cols=hasCbar?3:5,colW=Math.floor((legW-30)/cols);
    ctx.font="21px 'Times New Roman'";
    items.forEach((el,idx)=>{
      const c=idx%cols,r=Math.floor(idx/cols),ix=58+c*colW,iy=footY+36+r*36;
      const colHex=el.dataset.color||"#94a3b8",kind=el.dataset.kind||"box";
      if(kind==="dot"){
        ctx.fillStyle=colHex;ctx.beginPath();ctx.arc(ix+10,iy-6,8,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle="#ffffff";ctx.lineWidth=2;ctx.stroke();
      }else if(kind==="line"){
        ctx.strokeStyle=colHex;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(ix,iy-6);ctx.lineTo(ix+24,iy-6);ctx.stroke();
      }else{
        ctx.fillStyle=colHex;ctx.fillRect(ix,iy-16,24,17);
        ctx.strokeStyle="#555555";ctx.lineWidth=1;ctx.strokeRect(ix,iy-16,24,17);
      }
      ctx.fillStyle="#111111";ctx.fillText(el.textContent.trim(),ix+32,iy);
    });

    if(hasCbar){
      const actCol=PALETTES[currentPal]||PALETTES["RdYlGn"];
      const xBar=2000,wBar=1120;
      const grd=ctx.createLinearGradient(xBar,0,xBar+wBar,0);
      actCol.forEach((c,i)=>grd.addColorStop(i/(actCol.length-1),c));
      ctx.fillStyle=grd;ctx.fillRect(xBar,footY,wBar,26);
      ctx.strokeStyle="#475569";ctx.lineWidth=1;ctx.strokeRect(xBar,footY,wBar,26);
      ctx.fillStyle="#111111";ctx.font="20px 'Times New Roman'";ctx.textAlign="center";
      const tks=Array.from(document.querySelectorAll("#sheetBox .cbar-ticks span")).map(s=>s.textContent);
      tks.forEach((t,i)=>ctx.fillText(t,xBar+(wBar*(0.08+i*0.21)),footY+54));
      ctx.font="bold 22px 'Times New Roman'";
      const cTitle=document.querySelector("#sheetBox .cbar-title")?.textContent||"";
      ctx.fillText(cTitle.length>78?cTitle.slice(0,77)+"…":cTitle,xBar+wBar/2,footY+92);
      ctx.textAlign="left";
    }

    const sc=Number(document.getElementById("selDpi")?.value||1);
    if(sc<0.99){
      const c2=document.createElement("canvas");
      c2.width=Math.round(canvas.width*sc);c2.height=Math.round(canvas.height*sc);
      const x2=c2.getContext("2d");x2.imageSmoothingEnabled=true;x2.imageSmoothingQuality="high";
      x2.drawImage(canvas,0,0,c2.width,c2.height);
      return c2;
    }
    return canvas;
  }finally{
    if(numTraceAdded){
      await Plotly.deleteTraces(mapEl,-1);
      if(coreTrIdx!==-1)await Plotly.restyle(mapEl,{visible:true},Array.of(coreTrIdx));
      if(savedAnns)await Plotly.relayout(mapEl,{annotations:savedAnns});
    }
  }
}
async function exportFullSheetPng(){
  const c=await buildSheetCanvas();if(!c)return;
  const mId=document.getElementById("selMetric").value,reg=document.getElementById("selReg").value,fo=document.getElementById("selFO").value;
  const a=document.createElement("a");a.download="Атлас_"+mId+"_"+(reg!=="ALL"?reg:fo)+".png";a.href=c.toDataURL("image/png");a.click();
}
function buildPdfBlob(pages){
  const enc=new TextEncoder(),chunks=Array.of(),offs=Array.of(0);let pos=0;
  const push=s=>{const b=typeof s==="string"?enc.encode(s):s;chunks.push(b);pos+=b.length;};
  const obj=id=>{offs[id]=pos;push(id+" 0 obj\n");};
  push("%PDF-1.4\n");
  const n=pages.length,kids=pages.map((_,i)=>(3+i*3)+" 0 R").join(" ");
  obj(1);push("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  obj(2);push("<< /Type /Pages /Kids [ "+kids+" ] /Count "+n+" >>\nendobj\n");
  pages.forEach((p,i)=>{
    const idP=3+i*3,idX=4+i*3,idC=5+i*3,w=Math.round(p.w*0.5),h=Math.round(p.h*0.5);
    const cs="q "+w+" 0 0 "+h+" 0 0 cm /Im0 Do Q\n";
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
  const btn=document.getElementById("btnPdf"),scope=document.getElementById("selPdfScope").value;
  const sFO=document.getElementById("selFO"),sReg=document.getElementById("selReg"),mId=document.getElementById("selMetric").value;
  if(document.getElementById("selMode").value==="table")return alert("Переключитесь в режим карты или сетки.");
  const origFO=sFO.value,origReg=sReg.value,queue=Array.of(),pages=Array.of();
  if(scope==="fo"){queue.push({fo:"RF",reg:"ALL"});DATA.fos.forEach(f=>queue.push({fo:f,reg:"ALL"}));}
  else if(scope==="cur_fo"){const fl=origFO==="RF"?DATA.fos:Array.of(origFO);fl.forEach(f=>(DATA.fo_to_regs[f]||Array.of()).forEach(r=>queue.push({fo:f,reg:r})));}
  else{queue.push({fo:"RF",reg:"ALL"});DATA.fos.forEach(f=>{queue.push({fo:f,reg:"ALL"});(DATA.fo_to_regs[f]||Array.of()).forEach(r=>queue.push({fo:f,reg:r}));});}
  btn.disabled=true;
  try{
    for(let i=0;i<queue.length;i++){
      btn.textContent="PDF: "+(i+1)+" / "+queue.length+"...";
      const it=queue.at(i);
      if(sFO.value!==it.fo){sFO.value=it.fo;sReg.innerHTML='<option value="ALL">Весь округ / РФ</option>';if(it.fo!=="RF")(DATA.fo_to_regs[it.fo]||Array.of()).forEach(r=>sReg.add(new Option(r,r)));}
      sReg.value=it.reg;render();
      if(window._plotReady)await window._plotReady;
      await new Promise(r=>setTimeout(r,220));
      const c=await buildSheetCanvas();if(!c)continue;
      const b64=c.toDataURL("image/jpeg",0.82).split(",").at(1),bin=atob(b64),arr=new Uint8Array(bin.length);
      for(let k=0;k<bin.length;k++)arr[k]=bin.charCodeAt(k);
      pages.push({w:c.width,h:c.height,jpg:arr});
    }
    if(pages.length>0){const a=document.createElement("a");a.download="Атлас_"+mId+"_"+scope+".pdf";a.href=URL.createObjectURL(buildPdfBlob(pages));a.click();}
  }finally{
    sFO.value=origFO;sReg.innerHTML='<option value="ALL">Весь округ / РФ</option>';if(origFO!=="RF")(DATA.fo_to_regs[origFO]||Array.of()).forEach(r=>sReg.add(new Option(r,r)));
    sReg.value=origReg;render();btn.disabled=false;btn.textContent="Выгрузить PDF";
  }
}
