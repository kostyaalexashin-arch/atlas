async function exportFullSheetPng(){
  const mapEl=document.getElementById("mapDiv");
  if(!mapEl)return alert("Переключитесь в режим карты или сетки.");
  const mId=document.getElementById("selMetric").value,reg=document.getElementById("selReg").value,fo=document.getElementById("selFO").value;
  const regFeats=(reg!=="ALL")?Array.from(GEO.features.filter(f=>f.properties.region===reg&&f.properties._map_status==="В_выборке"&&!f.properties._inset).reduce((m,f)=>{if(!m.has(f.properties.join_key))m.set(f.properties.join_key,f);return m;},new Map()).values()).sort((a,b)=>a.properties._lbl.localeCompare(b.properties._lbl,"ru")):Array.of();
  const hasRightList=regFeats.length>0;
  let numTraceAdded=false;
  if(hasRightList){
    const savedAnns=(mapEl.layout.annotations||Array.of()).slice();await Plotly.relayout(mapEl,{annotations:savedAnns.filter(a=>!a._isCore)});
    await Plotly.addTraces(mapEl,{type:"scattergeo",mode:"text",lon:regFeats.map(f=>f.properties._cent.lon),lat:regFeats.map(f=>f.properties._cent.lat),text:regFeats.map((_,i)=>String(i+1)),textfont:{family:"Times New Roman",size:16,color:"#000000"},showlegend:false,hoverinfo:"skip"});
    numTraceAdded=true;
  }
  try{
    const mapW=hasRightList?2460:3160,mapH=1680;
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

    // Нижний блок: верхняя граница шкалы закреплена строго на одном уровне footY с верхней границей легенды
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
    const a=document.createElement("a");a.download="Атлас_"+mId+"_"+(reg!=="ALL"?reg:fo)+".png";a.href=canvas.toDataURL("image/png");a.click();
  }finally{
    if(numTraceAdded){await Plotly.deleteTraces(mapEl,-1);await Plotly.relayout(mapEl,{annotations:savedAnns});}
  }
}