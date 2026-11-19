async function exportFullSheetPng(){
  const mapEl=document.getElementById("mapDiv");
  if(!mapEl)return alert("Переключитесь в режим карты или сетки.");
  const mId=document.getElementById("selMetric").value,reg=document.getElementById("selReg").value,fo=document.getElementById("selFO").value;
  const regFeats=(reg!=="ALL")?GEO.features.filter(f=>f.properties.region===reg&&f.properties._map_status==="В_выборке").sort((a,b)=>a.properties._lbl.localeCompare(b.properties._lbl,"ru")):Array.of();
  const hasRightList=regFeats.length>0;
  let numTraceAdded=false;
  if(hasRightList){
    await Plotly.addTraces(mapEl,{type:"scattergeo",mode:"text",lon:regFeats.map(f=>f.properties._cent.lon),lat:regFeats.map(f=>f.properties._cent.lat),text:regFeats.map((_,i)=>String(i+1)),textfont:{family:"Times New Roman",size:10,color:"#111"},showlegend:false,hoverinfo:"skip"});
    numTraceAdded=true;
  }
  try{
    const mapW=hasRightList?2460:3160,mapH=1680;
    const imgData=await Plotly.toImage(mapEl,{format:"png",width:mapW,height:mapH});

    // Единый фиксированный шаг строки 24 px и шрифт 18 px для всех регионов
    const xList=2485,yTop=95,LINE_STEP=24,FONT_SIZE=18;
    const listBottom=hasRightList?(yTop+18+regFeats.length*LINE_STEP+16):mapH;
    const contentH=Math.max(mapH,listBottom);

    const canvas=document.createElement("canvas");
    canvas.width=3160;canvas.height=contentH+200;
    const ctx=canvas.getContext("2d");ctx.fillStyle="#ffffff";ctx.fillRect(0,0,canvas.width,canvas.height);
    const mapImg=new Image();
    await new Promise(ok=>{mapImg.onload=ok;mapImg.src=imgData;});
    ctx.drawImage(mapImg,0,0,mapW,mapH);

    // Справа от карты — список МО в одну колонку
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

    // Нижний блок: легенда слева и шкала справа
    let yCur=contentH+25,xCur=40;ctx.fillStyle="#111111";ctx.font="bold 24px 'Times New Roman'";
    document.querySelectorAll("#sheetBox .leg-item").forEach(sp=>{
      const txt="▪ "+sp.textContent.trim();
      ctx.fillText(txt,xCur,yCur+26);xCur+=ctx.measureText(txt).width+42;
      if(xCur>1860){xCur=40;yCur+=34;}
    });
    if(document.querySelector("#sheetBox .cbar-strip")){
      const actCol=PALETTES[currentPal]||PALETTES["RdYlGn"];
      const grd=ctx.createLinearGradient(1920,0,3100,0);
      actCol.forEach((c,i)=>grd.addColorStop(i/(actCol.length-1),c));
      ctx.fillStyle=grd;ctx.fillRect(1920,contentH+20,1180,25);ctx.strokeStyle="#475569";ctx.strokeRect(1920,contentH+20,1180,25);
      ctx.fillStyle="#111111";ctx.font="21px 'Times New Roman'";
      Array.from(document.querySelectorAll("#sheetBox .cbar-ticks span")).forEach((s,i)=>ctx.fillText(s.textContent,1940+i*275,contentH+70));
      ctx.font="bold 23px 'Times New Roman'";ctx.textAlign="center";
      ctx.fillText(document.querySelector("#sheetBox .cbar-title")?.textContent||"",2510,contentH+102);ctx.textAlign="left";
    }
    const a=document.createElement("a");a.download="Атлас_"+mId+"_"+(reg!=="ALL"?reg:fo)+".png";a.href=canvas.toDataURL("image/png");a.click();
  }finally{
    if(numTraceAdded)await Plotly.deleteTraces(mapEl,-1);
  }
}