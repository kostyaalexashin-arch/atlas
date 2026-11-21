let GEO=null,REGS=null,DATA=null,currentPal="RdYlGn";
const PALETTES={
  "RdYlGn":Array.of("#a50026","#d73027","#f46d43","#fdae61","#fee08b","#ffffbf","#d9ef8b","#a6d96a","#66bd63","#1a9850","#006837"),
  "YlGnBu":Array.of("#ffffd9","#edf8b1","#c7e9b4","#7fcdbb","#41b6c4","#1d91c0","#225ea8","#253494","#081d58"),
  "Viridis":Array.of("#440154","#482878","#3e4989","#31688e","#26828e","#1f9e89","#35b779","#6ece58","#b5de2b","#fde725"),
  "PuBuGn":Array.of("#fff7fb","#ece2f0","#d0d1e6","#a6bddb","#67a9cf","#3690c0","#02818a","#016c59","#014636"),
  "YlOrRd":Array.of("#ffffcc","#ffeda0","#fed976","#feb24c","#fd8d3c","#fc4e2a","#e31a1c","#bd0026","#800026"),
  "Blues":Array.of("#f7fbff","#deebf7","#c6dbef","#9ecae1","#6baed6","#4292c6","#2171b5","#08519c","#08306b")
};
const CAT_META={"1":{sym:"square",lbl:"Крупнейшие (> 1 млн чел.)"},"2":{sym:"diamond",lbl:"Крупные (250 тыс. – 1 млн)"},"3":{sym:"triangle-up",lbl:"Большие (100 – 250 тыс.)"},"4":{sym:"circle",lbl:"Средние (50 – 100 тыс.)"},"5":{sym:"pentagon",lbl:"Малые (≤ 50 тыс. чел.)"}};
const btnP=document.getElementById("palBtn"),menuP=document.getElementById("palMenu");
const updBtn=p=>{const g="linear-gradient(to right,"+PALETTES[p].join(",")+")";btnP.innerHTML='<span class="pal-swatch" style="background:'+g+'"></span><span>'+p+'</span><span>▾</span>';};
Object.keys(PALETTES).forEach(p=>{const it=document.createElement("div");it.className="pal-opt";const g="linear-gradient(to right,"+PALETTES[p].join(",")+")";it.innerHTML='<span>'+p+'</span><span class="pal-swatch" style="background:'+g+'"></span>';it.onclick=()=>{currentPal=p;updBtn(p);menuP.classList.remove("open");render();};menuP.appendChild(it);});
btnP.onclick=e=>{e.stopPropagation();menuP.classList.toggle("open");};
document.addEventListener("click",()=>menuP.classList.remove("open"));updBtn(currentPal);
const fmtNum=(v,d)=>(v===null||v===undefined||v===""||isNaN(Number(v)))?"н/д":Number(v).toLocaleString("ru-RU",{minimumFractionDigits:d,maximumFractionDigits:d});
function wrapTitle(s,lim=92){if(s.length<=lim)return s;const idx=s.lastIndexOf(" ",lim);if(idx<=28)return s;const tail=s.slice(idx+1);return tail.length<12?s:(s.slice(0,idx)+"<br>"+tail);}
function markerSvg(c,f,sz=20){const s="#1e293b",h=sz/2;if(c==="1")return '<svg width="'+sz+'" height="'+sz+'"><rect x="3" y="3" width="'+(sz-6)+'" height="'+(sz-6)+'" fill="'+f+'" stroke="'+s+'" stroke-width="1.2"/></svg>';if(c==="2")return '<svg width="'+sz+'" height="'+sz+'"><polygon points="'+h+',2 '+(sz-2)+','+h+' '+h+','+(sz-2)+' 2,'+h+'" fill="'+f+'" stroke="'+s+'" stroke-width="1.2"/></svg>';if(c==="3")return '<svg width="'+sz+'" height="'+sz+'"><polygon points="'+h+',2 '+(sz-2)+','+(sz-3)+' 2,'+(sz-3)+'" fill="'+f+'" stroke="'+s+'" stroke-width="1.2"/></svg>';if(c==="4")return '<svg width="'+sz+'" height="'+sz+'"><circle cx="'+h+'" cy="'+h+'" r="'+(h-3)+'" fill="'+f+'" stroke="'+s+'" stroke-width="1.2"/></svg>';return '<svg width="'+sz+'" height="'+sz+'"><polygon points="'+h+',2 '+(sz-2)+','+(sz*0.42)+' '+(sz*0.8)+','+(sz-2)+' '+(sz*0.2)+','+(sz-2)+' 2,'+(sz*0.42)+'" fill="'+f+'" stroke="'+s+'" stroke-width="1.2"/></svg>';}
function getCenter(g){
  if(!g)return{lon:0,lat:0};
  const rings=Array.of(),collect=o=>{if(!o)return;if(o.type==="GeometryCollection"&&o.geometries)o.geometries.forEach(collect);else if(o.type==="Polygon"&&o.coordinates)rings.push(o.coordinates.at(0));else if(o.type==="MultiPolygon"&&o.coordinates)o.coordinates.forEach(p=>rings.push(p.at(0)));};
  collect(g);if(!rings.length)return{lon:0,lat:0};
  let best=rings.at(0),bLen=0;rings.forEach(r=>{if(r&&r.length>bLen){bLen=r.length;best=r;}});
  let sx=0,sy=0;best.forEach(pt=>{sx+=pt.at(0);sy+=pt.at(1);});return best.length?{lon:sx/best.length,lat:sy/best.length}:{lon:0,lat:0};
}
function makeProj(fo,reg){
  if(fo==="RF"&&reg==="ALL")return{type:"conic equal area",rotation:{lon:100},parallels:Array.of(52,68)};
  if(fo==="Дальневосточный"||reg==="Чукотский автономный округ"||reg==="Камчатский край"||reg==="Магаданская область"||reg==="Сахалинская область"||reg==="Приморский край"||reg==="Хабаровский край")return{type:"mercator",rotation:{lon:152}};
  return{type:"mercator"};
}
function wideGeoCfg(feats,projObj,domX,domY){
  const rotLon=projObj.rotation?.lon||0;let x0=999,x1=-999,y0=999,y1=-999;
  const w=c=>{if(typeof c.at(0)==="number"){const lx=((c.at(0)-rotLon+540)%360)-180;if(lx<x0)x0=lx;if(lx>x1)x1=lx;if(c.at(1)<y0)y0=c.at(1);if(c.at(1)>y1)y1=c.at(1);}else c.forEach(w);};
  feats.forEach(f=>{if(f.geometry&&f.geometry.coordinates)w(f.geometry.coordinates);});
  if(x0>900)return{domain:{x:domX,y:domY},fitbounds:"locations",visible:false,projection:projObj};
  if(projObj.type==="conic equal area"){
    return{domain:{x:domX,y:domY},visible:false,showframe:false,projection:projObj,lonaxis:{range:Array.of(rotLon+x0-2,rotLon+x1+2)},lataxis:{range:Array.of(Math.max(40,y0-1.5),Math.min(82.5,y1+1.5))}};
  }
  const mEl=document.getElementById("mapDiv"),W=(mEl&&mEl.clientWidth>200)?mEl.clientWidth:1540,H=(mEl&&mEl.clientHeight>200)?mEl.clientHeight:740;
  const boxW=W*(domX.at(1)-domX.at(0)),boxH=H*(domY.at(1)-domY.at(0)),aspect=boxW/Math.max(1,boxH);
  const toM=lat=>Math.log(Math.tan(Math.PI/4+Math.max(-84,Math.min(84,lat))*Math.PI/360))*180/Math.PI;
  const fromM=ym=>(2*Math.atan(Math.exp(ym*Math.PI/180))-Math.PI/2)*180/Math.PI;
  const pad=1.06,cx=(x0+x1)/2;let dx=Math.max(0.45,(x1-x0)*pad),ym0=toM(y0),ym1=toM(y1),ymc=(ym0+ym1)/2,dym=Math.max(0.45,(ym1-ym0)*pad);
  if(dx/dym<aspect){dx=dym*aspect;}else{dym=dx/aspect;}
  return{domain:{x:domX,y:domY},visible:false,showframe:false,projection:projObj,lonaxis:{range:Array.of(rotLon+cx-dx/2,rotLon+cx+dx/2)},lataxis:{range:Array.of(Math.max(-84,fromM(ymc-dym/2)),Math.min(84.5,fromM(ymc+dym/2)))}};
}
function niceRound(v){if(v===0)return 0;const s=v<0?-1:1,a=Math.abs(v),p=Math.pow(10,Math.floor(Math.log10(a))),n=a/p;let r=1;if(n>=7.5)r=10;else if(n>=3.5)r=5;else if(n>=1.5)r=2;return s*r*p;}
function computeScale(vals,palArr,inv){
  const s=vals.slice().sort((a,b)=>a-b),vmin=s.at(Math.floor(s.length*0.02))??0,vmax=s.at(Math.min(s.length-1,Math.floor(s.length*0.98)))??1,med=s.at(Math.floor(s.length*0.5))??0;
  const gamma=(vmin>=0&&med>0&&(vmax/med)>=4.0)?0.42:1.0,pal=inv?palArr.slice().reverse():palArr;
  const norm=v=>{if(vmax<=vmin)return 0.5;return Math.pow(Math.max(0,Math.min(1,(v-vmin)/(vmax-vmin))),gamma);};
  const invNorm=u=>vmin+Math.pow(u,1/gamma)*(vmax-vmin);
  const plScale=Array.of(0,0.125,0.25,0.375,0.5,0.625,0.75,0.875,1.0).map(u=>Array.of(u,pal.at(Math.min(pal.length-1,Math.floor(u*pal.length)))));
  const ticks=Array.of(0.06,0.28,0.50,0.72,0.94).map(u=>{const raw=invNorm(u),p=raw!==0?Math.pow(10,Math.floor(Math.log10(Math.abs(raw)))-1):1;return Math.round(raw/p)*p;});
  const getHex=v=>(v===null||v===undefined||isNaN(Number(v)))?"#eeeeee":pal.at(Math.min(pal.length-1,Math.floor(norm(Number(v))*pal.length)));
  return{vmin,vmax,gamma,pal,plScale,ticks,getHex};
}
function syncControls(){
  const sM=document.getElementById("selMode"),sB=document.getElementById("selBase"),sY=document.getElementById("selYear");
  if(sM.value==="grid"||sM.value==="table"){sB.value="coh";sB.disabled=true;sY.disabled=true;}
  else{sB.disabled=false;if(sB.value==="all"){sY.value="2024";sY.disabled=true;}else{sY.disabled=false;}}
}
function stepSelect(selId,dir){const el=document.getElementById(selId);if(!el||el.options.length===0)return;el.selectedIndex=(el.selectedIndex+dir+el.options.length)%el.options.length;el.dispatchEvent(new Event("change"));}
const getJson=u=>fetch(u+"?v="+Date.now()).then(r=>{if(!r.ok)throw new Error(u+": HTTP "+r.status);return r.json();});
Promise.all(Array.of(getJson("geo_plotly.json"),getJson("regions_geo.json"),getJson("metrics_data.json"))).then(res=>{try{
  GEO=res.at(0);REGS=res.at(1);DATA=res.at(2);GEO.features.forEach(f=>{f.properties._cent=(f.properties._cx!==undefined)?{lon:f.properties._cx,lat:f.properties._cy}:getCenter(f.geometry);});
  const sFO=document.getElementById("selFO"),sReg=document.getElementById("selReg"),sMet=document.getElementById("selMetric");
  DATA.fos.forEach(f=>sFO.add(new Option(f+" ФО",f)));const gm={};
  DATA.metrics.forEach(m=>{if(!gm[m.group]){gm[m.group]=document.createElement("optgroup");gm[m.group].label=m.group;sMet.add(gm[m.group]);}gm[m.group].appendChild(new Option(m.id+" — "+m.title,m.id));});
  sFO.onchange=()=>{sReg.innerHTML='<option value="ALL">Весь округ / РФ</option>';if(sFO.value!=="RF")(DATA.fo_to_regs[sFO.value]||Array.of()).forEach(r=>sReg.add(new Option(r,r)));render();};
  Array.of("selMode","selBase","selYear","selReg","selMetric","selScale").forEach(id=>document.getElementById(id).onchange=()=>{syncControls();render();});
  document.getElementById("prevMet").onclick=()=>stepSelect("selMetric",-1);document.getElementById("nextMet").onclick=()=>stepSelect("selMetric",1);
  document.getElementById("prevFO").onclick=()=>stepSelect("selFO",-1);document.getElementById("nextFO").onclick=()=>stepSelect("selFO",1);
  document.getElementById("prevReg").onclick=()=>stepSelect("selReg",-1);document.getElementById("nextReg").onclick=()=>stepSelect("selReg",1);
  document.getElementById("btnPng").onclick=exportFullSheetPng;
  if(document.getElementById("btnPdf"))document.getElementById("btnPdf").onclick=exportBatchPdf;
  syncControls();render();
}catch(e){document.getElementById("mapDiv").innerHTML="Ошибка: "+e.message;}}).catch(e=>{document.getElementById("mapDiv").innerHTML="Ошибка загрузки: "+e.message;});

function buildHeaderHtml(metTitle,yrStr,terrTitle){
  const h=document.createElement("div");h.className="sheet-hdr";
  h.innerHTML='<div class="hdr-met">'+wrapTitle(metTitle+" ("+yrStr+")",92)+'</div><div class="hdr-terr">'+terrTitle+'</div>';
  return h;
}
function buildFooterHtml(isCat,scObj,legItems){
  const f=document.createElement("div");f.className="footer-grid";
  const lBox=document.createElement("div");lBox.className="leg-box"+(isCat?" wide":"");
  legItems.forEach(it=>{const d=document.createElement("div");d.className="leg-item";d.dataset.color=it.col||"#94a3b8";d.dataset.kind=it.kind||"box";d.innerHTML=it.icon+'<span>'+it.txt+'</span>';lBox.appendChild(d);});
  f.appendChild(lBox);
  if(!isCat&&scObj){
    const cBox=document.createElement("div");cBox.className="cbar-box";
    cBox.innerHTML='<div class="cbar-strip" style="background:linear-gradient(to right,'+scObj.pal.join(",")+')"></div><div class="cbar-ticks">'+scObj.ticks.map(t=>'<span>'+fmtNum(t,scObj.dec)+'</span>').join("")+'</div>';
    f.appendChild(cBox);
  }
  return f;
}
function applyZatoHatch(mapEl){
  const svg=mapEl.querySelector("svg.main-svg");if(!svg)return;
  let defs=svg.querySelector("defs");if(!defs){defs=document.createElementNS("http://www.w3.org/2000/svg","defs");svg.insertBefore(defs,svg.firstChild);}
  const oldP=defs.querySelector("#zatoHatch");if(oldP)oldP.remove();
  const pat=document.createElementNS("http://www.w3.org/2000/svg","pattern");
  pat.setAttribute("id","zatoHatch");pat.setAttribute("width","11");pat.setAttribute("height","11");pat.setAttribute("patternUnits","userSpaceOnUse");pat.setAttribute("patternTransform","rotate(45)");
  const bg=document.createElementNS("http://www.w3.org/2000/svg","rect");bg.setAttribute("width","11");bg.setAttribute("height","11");bg.setAttribute("fill","#e2e8f0");
  const ln=document.createElementNS("http://www.w3.org/2000/svg","line");ln.setAttribute("x1","0");ln.setAttribute("y1","0");ln.setAttribute("x2","0");ln.setAttribute("y2","11");ln.setAttribute("stroke","#475569");ln.setAttribute("stroke-width","3.2");
  pat.append(bg,ln);defs.appendChild(pat);
  svg.querySelectorAll("path").forEach(p=>{const st=(p.getAttribute("style")||"")+(p.getAttribute("fill")||"");if(st.includes("0.987")||st.replace(/\s/g,"").includes("203,213,225")){p.style.fill="url(#zatoHatch)";p.style.fillOpacity="1";p.setAttribute("fill","url(#zatoHatch)");}});
}
function addCoreBadges(mapEl,isRegLevel){
  if(mapEl._badgeBusy)return window._badgesReady||Promise.resolve();
  window._badgesReady=new Promise(res=>{setTimeout(()=>{
    const svg=mapEl.querySelector("svg.main-svg");if(!svg){res();return;}
    const sRect=svg.getBoundingClientRect();if(!sRect.width||!sRect.height){res();return;}
    const fo=document.getElementById("selFO").value,reg=document.getElementById("selReg").value;
    const isNW=(fo.includes("Северо-Запад")||fo==="СЗФО")&&reg==="ALL";
    const hasRight=isNW||reg.includes("Архангельск")||(reg!=="ALL"&&window._isExportMode);
    const allF=GEO.features.filter(f=>(fo==="RF"||f.properties.fo===fo)&&(reg==="ALL"||f.properties.region===reg));
    const mainC=allF.filter(f=>!f.properties._inset&&(!isNW||!f.properties.region.includes("Калининград"))&&f.properties.is_center&&f.properties._map_status==="В_выборке");
    const kalC=isNW?allF.filter(f=>f.properties.region.includes("Калининград")&&f.properties.is_center&&f.properties._map_status==="В_выборке"):Array.of();
    const coreOrdered=mainC.concat(kalC),anns=(mapEl.layout.annotations||Array.of()).filter(a=>!a._isCore);
    const pW=Math.max(1,sRect.width),pH=Math.max(1,sRect.height);
    if(!isRegLevel){
      const pts=Array.from(svg.querySelectorAll(".geolayer .point"));
      coreOrdered.forEach((f,idx)=>{
        const pEl=pts.at(idx);if(!pEl)return;
        const r=pEl.getBoundingClientRect();if(!r||r.width===0)return;
        const px=(r.left+r.width/2-sRect.left)/pW,py=1.0-(r.top+r.height/2-sRect.top)/pH;
        const isK=isNW&&f.properties.region.includes("Калининград");
        const xMin=isK?0.785:0.01,xMax=isK?0.99:(hasRight?0.76:0.99);
        if(px<xMin||px>xMax||py<0.02||py>0.98)return;
        const dirs=Array.of(Array.of(0,-22),Array.of(0,24),Array.of(52,0),Array.of(-52,0),Array.of(46,-22),Array.of(-46,24),Array.of(46,24),Array.of(-46,-22));
        let d=dirs.at(idx%8);
        for(let k=0;k<dirs.length;k++){
          const cand=dirs.at((idx+k)%dirs.length),cx=px*pW+cand.at(0),cy=(1-py)*pH+cand.at(1);
          if(!anns.some(a=>a._isCore&&Math.abs((a.x*pW+a.ax)-cx)<86&&Math.abs(((1-a.y)*pH+a.ay)-cy)<28)){d=cand;break;}
        }
        anns.push({_isCore:true,xref:"paper",yref:"paper",x:px,y:py,text:"<b>"+f.properties._lbl+"</b>",showarrow:true,arrowhead:0,arrowwidth:1,arrowcolor:"#475569",ax:d.at(0),ay:d.at(1),bgcolor:"rgba(255,255,255,0.96)",bordercolor:"#475569",borderwidth:1,borderpad:3,font:{family:"Times New Roman",size:12,color:"#111111"}});
      });
    }else if(mainC.length>0){
      const xMax=hasRight?0.76:0.99;
      const allP=Array.from(svg.querySelectorAll(".geolayer .choropleth path")).filter(p=>{const r=p.getBoundingClientRect();return r.width>0&&(r.left-sRect.left)/pW<xMax;});
      const lastP=allP.find(p=>{const st=(p.getAttribute("style")||"").replace(/\s/g,"");return st.includes("230,0,126")||st.includes("e6007e");})||allP.at(allP.length-1);
      if(lastP){
        const r=lastP.getBoundingClientRect(),px=(r.left+r.width/2-sRect.left)/pW,py=1.0-(r.top+r.height/2-sRect.top)/pH;
        if(px>=0.01&&px<=xMax&&py>=0.02&&py<=0.98){const dx=(px>0.55?-64:64),dy=(py>0.75?34:-34);anns.push({_isCore:true,xref:"paper",yref:"paper",x:px,y:py,text:"<b>"+mainC.at(0).properties._lbl+"</b>",showarrow:true,arrowhead:0,arrowwidth:1.2,arrowcolor:"#e6007e",ax:dx,ay:dy,bgcolor:"rgba(255,255,255,0.96)",bordercolor:"#e6007e",borderwidth:1.2,borderpad:3,font:{family:"Times New Roman",size:13,color:"#111111"}});}
      }
    }
    mapEl._badgeBusy=true;
    Plotly.relayout(mapEl,{annotations:anns}).finally(()=>{setTimeout(()=>{mapEl._badgeBusy=false;res();},80);});
  },140);});
  return window._badgesReady;
}

function render(){
  if(!GEO||!DATA)return;
  const mode=document.getElementById("selMode").value,base=document.getElementById("selBase").value,yr=document.getElementById("selYear").value,mId=document.getElementById("selMetric").value,fo=document.getElementById("selFO").value,reg=document.getElementById("selReg").value,scMode=document.getElementById("selScale").value;
  const mMeta=DATA.metrics.find(x=>x.id===mId)||DATA.metrics.at(0),box=document.getElementById("sheetBox");
  const allFeats=GEO.features.filter(f=>(fo==="RF"||f.properties.fo===fo)&&(reg==="ALL"||f.properties.region===reg));
  const isNW=(fo.includes("Северо-Запад")||fo==="СЗФО"),isArk=reg.includes("Архангельск");
  const hasInsets=(isArk||(isNW&&reg==="ALL")),hasKal=(isNW&&reg==="ALL");
  const hasRightCol=hasInsets||(reg!=="ALL");
  const mainFeats=hasInsets?allFeats.filter(f=>!f.properties._inset&&(!hasKal||!f.properties.region.includes("Калининград"))):allFeats;
  const nzFeats=hasInsets?allFeats.filter(f=>f.properties._inset==="NZ"):Array.of();
  const zfiFeats=hasInsets?allFeats.filter(f=>f.properties._inset==="ZFI"):Array.of();
  const kalFeats=hasKal?allFeats.filter(f=>f.properties.region.includes("Калининград")):Array.of();
  const terrTitle=reg!=="ALL"?reg:(fo!=="RF"?fo+" федеральный округ":"Российская Федерация");
  const yrs=Array.of("2019","2020","2021","2022","2023","2024"),actCol=PALETTES[currentPal]||PALETTES["RdYlGn"],CORE="#e6007e";
  if(mode==="table"){
    const rows=allFeats.filter(f=>f.properties._map_status==="В_выборке"&&f.properties.coh),refF=(scMode==="global")?GEO.features:allFeats,allV=Array.of();
    yrs.forEach(y=>{const ym=DATA.panel[mId]?.[y]||{};refF.filter(f=>f.properties._map_status==="В_выборке"&&f.properties.coh).forEach(f=>{const v=Number(ym[f.properties.join_key]);if(!isNaN(v))allV.push(v);});});
    const scObj=Object.assign(computeScale(allV,actCol,mMeta.inv),{dec:mMeta.dec}),wrap=document.createElement("div");wrap.className="tbl-wrap";
    const hdr=document.createElement("div");hdr.className="sticky-hdr";hdr.textContent=mMeta.title+" (2019–2024 гг.)";
    const tbl=document.createElement("table");tbl.className="dyn-tbl";
    const cg=document.createElement("colgroup");Array.of("210px","270px","115px","115px","115px","115px","115px","115px").forEach(w=>{const c=document.createElement("col");c.style.width=w;cg.appendChild(c);});tbl.appendChild(cg);
    const thead=tbl.createTHead(),thR=thead.insertRow();Array.of("Регион","Муниципальное образование","2019 г.","2020 г.","2021 г.","2022 г.","2023 г.","2024 г.").forEach(t=>{const th=document.createElement("th");th.textContent=t;thR.appendChild(th);});
    const tbody=tbl.createTBody(),presCats=new Set();
    rows.forEach(f=>{const tr=tbody.insertRow(),id=f.properties.join_key;const c0=tr.insertCell();c0.textContent=f.properties.region;const c1=tr.insertCell();c1.className="mo-name";c1.innerHTML="<b>"+f.properties._lbl+"</b>";yrs.forEach(y=>{const td=tr.insertCell(),v=DATA.panel[mId]?.[y]?.[id],cc=DATA.panel_cats?.[y]?.[id]||"5";presCats.add(cc);td.innerHTML='<div>'+markerSvg(cc,scObj.getHex(v),22)+'</div><div style="font-size:12px;margin-top:2px;">'+fmtNum(v,mMeta.dec)+'</div>';});});
    const sHex=actCol.at(Math.floor(actCol.length*0.75)),legIt=Array.of();
    Object.keys(CAT_META).forEach(k=>{if(presCats.has(k))legIt.push({col:sHex,kind:"box",icon:markerSvg(k,sHex,18),txt:CAT_META[k].lbl});});
    wrap.append(hdr,tbl);box.innerHTML="";box.append(wrap,buildFooterHtml(false,scObj,legIt));return;
  }
  box.innerHTML="";box.appendChild(buildHeaderHtml(mMeta.title,mode==="grid"?"2019–2024 гг.":yr+" г.",terrTitle));
  const mapEl=document.createElement("div");mapEl.id="mapDiv";box.appendChild(mapEl);
  const projObj=makeProj(fo,reg);
  if(mode==="grid"){
    const subGeo={type:"FeatureCollection",features:mainFeats},refF=(scMode==="global")?GEO.features:allFeats,allV=Array.of();
    yrs.forEach(y=>{const ym=DATA.panel[mId]?.[y]||{};refF.filter(f=>f.properties._map_status==="В_выборке"&&f.properties.coh).forEach(f=>{const v=Number(ym[f.properties.join_key]);if(!isNaN(v))allV.push(v);});});
    const scObj=Object.assign(computeScale(allV,actCol,mMeta.inv),{dec:mMeta.dec}),traces=Array.of(),layout={margin:{l:0,r:0,t:10,b:0},height:740,annotations:Array.of()},presCats=new Set();
    yrs.forEach((yK,idx)=>{
      const gK=idx===0?"geo":"geo"+(idx+1),col=idx%3,row=Math.floor(idx/3),x0=col*0.335,x1=x0+0.325,y1=0.95-row*0.49,y0=y1-0.44;
      layout[gK]=wideGeoCfg(mainFeats,projObj,Array.of(x0,x1),Array.of(y0,y1));
      layout.annotations.push({text:"<b>"+yK+" г.</b>",x:(x0+x1)/2,y:y1+0.015,xref:"paper",yref:"paper",showarrow:false,font:{family:"Times New Roman",size:15}});
      traces.push({type:"choropleth",geo:gK,geojson:subGeo,featureidkey:"properties.join_key",locations:mainFeats.map(f=>f.properties.join_key),z:mainFeats.map(()=>0),colorscale:Array.of(Array.of(0,"#f3f4f6"),Array.of(1,"#f3f4f6")),showscale:false,hoverinfo:"skip",marker:{line:{color:"#cbd5e1",width:0.35}}});
      const ym=DATA.panel[mId]?.[yK]||{},pts=mainFeats.filter(f=>f.properties._map_status==="В_выборке"&&f.properties.coh&&ym[f.properties.join_key]!==undefined);
      const syms=pts.map(f=>{const cc=DATA.panel_cats?.[yK]?.[f.properties.join_key]||"5";presCats.add(cc);return CAT_META[cc].sym;});
      traces.push({type:"scattergeo",geo:gK,lon:pts.map(f=>f.properties._cent.lon),lat:pts.map(f=>f.properties._cent.lat),text:pts.map(f=>"<b>"+f.properties._lbl+"</b> ("+yK+" г.): <b>"+fmtNum(ym[f.properties.join_key],mMeta.dec)+"</b>"),hoverinfo:"text",showlegend:false,marker:{symbol:syms,size:fo==="RF"?7:11,color:pts.map(f=>scObj.getHex(ym[f.properties.join_key])),line:{color:"#1e293b",width:0.7}}});
    });
    window._plotReady=Plotly.newPlot(mapEl,traces,layout,{responsive:true,displaylogo:false,modeBarButtonsToRemove:Array.of("toImage")});
    const sHex=actCol.at(Math.floor(actCol.length*0.75)),legIt=Array.of();
    Object.keys(CAT_META).forEach(k=>{if(presCats.has(k))legIt.push({col:sHex,kind:"box",icon:markerSvg(k,sHex,18),txt:CAT_META[k].lbl});});
    legIt.push({col:"#f3f4f6",kind:"box",icon:'<span style="display:inline-block;width:18px;height:13px;background:#f3f4f6;border:1px solid #94a3b8;"></span>',txt:"Территория субъектов РФ"});
    box.appendChild(buildFooterHtml(false,scObj,legIt));return;
  }
  const valMap=(base==="all"&&yr==="2024")?(DATA.v2024[mId]||{}):(DATA.panel[mId]?.[yr]||{}),traces=Array.of(),legIt=Array.of();
  const refF=(scMode==="global")?GEO.features:allFeats,allV=refF.filter(f=>f.properties._map_status==="В_выборке"&&(base==="all"||f.properties.coh)).map(f=>Number(valMap[f.properties.join_key])).filter(v=>!isNaN(v));
  const scObj=mMeta.cat?null:Object.assign(computeScale(allV,actCol,mMeta.inv),{dec:mMeta.dec});
  const addGeoLayers=(fList,gKey)=>{
    const subG={type:"FeatureCollection",features:fList},outF=fList.filter(f=>f.properties._map_status!=="В_выборке"&&f.properties._map_status!=="ЗАТО"),zatoF=fList.filter(f=>f.properties._map_status==="ЗАТО");
    if(outF.length>0)traces.push({type:"choropleth",geo:gKey,geojson:subG,featureidkey:"properties.join_key",locations:outF.map(f=>f.properties.join_key),z:outF.map(()=>0),text:outF.map(f=>f.properties._lbl+" ("+f.properties.region+") — Вне выборки"),hoverinfo:"text",colorscale:Array.of(Array.of(0,"#f0f0f0"),Array.of(1,"#f0f0f0")),showscale:false,marker:{line:{color:"#9aa2ae",width:0.35}}});
    if(zatoF.length>0){const zLon=Array.of(),zLat=Array.of(),addRing=r=>{r.forEach(pt=>{zLon.push(pt.at(0));zLat.push(pt.at(1));});zLon.push(null);zLat.push(null);};zatoF.forEach(f=>{const g=f.geometry;if(!g)return;if(g.type==="Polygon")g.coordinates.forEach(addRing);else if(g.type==="MultiPolygon")g.coordinates.forEach(p=>p.forEach(addRing));});traces.push({type:"scattergeo",geo:gKey,mode:"lines",lon:zLon,lat:zLat,fill:"toself",fillcolor:"rgba(203,213,225,0.987)",line:{color:"#475569",width:0.8},hoverinfo:"skip",showlegend:false});}
    const inF=fList.filter(f=>f.properties._map_status==="В_выборке"&&(base==="all"||f.properties.coh));
    if(mMeta.cat){Object.entries(DATA.cluster_colors).forEach(p=>{const cn=p.at(0),ch=p.at(1),cf=inF.filter(f=>valMap[f.properties.join_key]===cn);if(cf.length>0)traces.push({type:"choropleth",geo:gKey,geojson:subG,featureidkey:"properties.join_key",locations:cf.map(f=>f.properties.join_key),z:cf.map(()=>1),text:cf.map(f=>"<b>"+f.properties._lbl+"</b><br>"+f.properties.region+"<br>"+cn),hoverinfo:"text",colorscale:Array.of(Array.of(0,ch),Array.of(1,ch)),showscale:false,marker:{line:{color:"#64748b",width:0.35}}});});}
    else{traces.push({type:"choropleth",geo:gKey,geojson:subG,featureidkey:"properties.join_key",locations:inF.map(f=>f.properties.join_key),z:inF.map(f=>{const v=Number(valMap[f.properties.join_key]);if(isNaN(v))return null;return Math.pow(Math.max(0,Math.min(1,(v-scObj.vmin)/Math.max(1e-9,scObj.vmax-scObj.vmin))),scObj.gamma);}),zmin:0,zmax:1,zauto:false,text:inF.map(f=>"<b>"+f.properties._lbl+"</b><br>"+f.properties.region+"<br>Значение: <b>"+fmtNum(valMap[f.properties.join_key],mMeta.dec)+"</b>"),hoverinfo:"text",colorscale:scObj.plScale,showscale:false,marker:{line:{color:"#64748b",width:0.35}}});}
  };

  addGeoLayers(mainFeats,"geo");if(zfiFeats.length>0)addGeoLayers(zfiFeats,"geo2");if(nzFeats.length>0)addGeoLayers(nzFeats,"geo3");
  if(kalFeats.length>0){addGeoLayers(kalFeats,"geo4");const kCore=kalFeats.filter(f=>f.properties.is_center&&f.properties._map_status==="В_выборке");if(kCore.length>0)traces.push({type:"scattergeo",geo:"geo4",mode:"markers",lon:kCore.map(f=>f.properties._cent.lon),lat:kCore.map(f=>f.properties._cent.lat),hovertext:kCore.map(f=>"<b>Ядро региона:</b> "+f.properties._lbl),hoverinfo:"text",showlegend:false,marker:{size:8,color:CORE,line:{color:"#ffffff",width:1.1}}});}
  if(reg==="ALL"&&REGS){const rList=REGS.features.filter(f=>(fo==="RF"||f.properties.fo===fo)&&(!hasKal||!f.properties.region.includes("Калининград")));traces.push({type:"choropleth",geo:"geo",geojson:{type:"FeatureCollection",features:rList},featureidkey:"properties.region",locations:rList.map(f=>f.properties.region),z:rList.map(()=>1),colorscale:Array.of(Array.of(0,"rgba(0,0,0,0)"),Array.of(1,"rgba(0,0,0,0)")),showscale:false,hoverinfo:"skip",marker:{line:{color:"#1e293b",width:1.4}}});}
  if(mMeta.cat){Object.entries(DATA.cluster_colors).forEach(p=>{const cn=p.at(0),ch=p.at(1);if(allFeats.some(f=>valMap[f.properties.join_key]===cn)||fo==="RF")legIt.push({col:ch,kind:"box",icon:'<span style="display:inline-block;width:18px;height:13px;background:'+ch+';border:1px solid #555;"></span>',txt:cn});});}
  const coreF=mainFeats.filter(f=>f.properties.is_center&&f.properties._map_status==="В_выборке");
  if(coreF.length>0){
    if(reg==="ALL"){traces.push({type:"scattergeo",geo:"geo",mode:"markers",lon:coreF.map(f=>f.properties._cent.lon),lat:coreF.map(f=>f.properties._cent.lat),text:coreF.map(f=>f.properties._lbl),hovertext:coreF.map(f=>"<b>Ядро региона:</b> "+f.properties._lbl+" ("+f.properties.region+")"),hoverinfo:"text",showlegend:false,marker:{size:fo==="RF"?6:9,color:CORE,line:{color:"#ffffff",width:1.1}}});legIt.push({col:CORE,kind:"dot",icon:'<span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:'+CORE+';border:1.5px solid #fff;box-shadow:0 0 0 1px #666;"></span>',txt:"Ядро региона (макс. население)"});}
    else{traces.push({type:"choropleth",geo:"geo",geojson:{type:"FeatureCollection",features:mainFeats},featureidkey:"properties.join_key",locations:coreF.map(f=>f.properties.join_key),z:coreF.map(()=>1),colorscale:Array.of(Array.of(0,"rgba(0,0,0,0)"),Array.of(1,"rgba(0,0,0,0)")),showscale:false,hoverinfo:"skip",marker:{line:{color:CORE,width:3.5}}});legIt.push({col:CORE,kind:"line",icon:'<span style="display:inline-block;width:18px;height:3px;background:'+CORE+';"></span>',txt:"Ядро региона (макс. население)"});}
  }
  if(allFeats.some(f=>f.properties._map_status==="ЗАТО"))legIt.push({col:"#cbd5e1",kind:"hatch",icon:'<span style="display:inline-block;width:18px;height:13px;background:repeating-linear-gradient(-45deg,#e2e8f0,#e2e8f0 5px,#475569 5px,#475569 7.5px);border:1px solid #475569;"></span>',txt:"ЗАТО"});
  if(allFeats.some(f=>f.properties._map_status!=="В_выборке"&&f.properties._map_status!=="ЗАТО"))legIt.push({col:"#f0f0f0",kind:"box",icon:'<span style="display:inline-block;width:18px;height:13px;background:#f0f0f0;border:1px solid #9aa2ae;"></span>',txt:"Вне выборки"});

  const layout={geo:wideGeoCfg(mainFeats,projObj,Array.of(0.005,hasRightCol?0.765:0.995),Array.of(0.01,0.99)),annotations:Array.of(),showlegend:false,margin:{l:0,r:0,t:0,b:0},height:740};
  const shrinkTop=hasKal||isArk;const yZFI=shrinkTop?Array.of(0.72,0.98):Array.of(0.56,0.98),yNZ=shrinkTop?Array.of(0.39,0.65):Array.of(0.07,0.49);
  if(zfiFeats.length>0){layout.geo2=wideGeoCfg(zfiFeats,{type:"mercator"},Array.of(0.785,0.995),yZFI);layout.annotations.push({text:"<b>архипелаг Земля Франца-Иосифа</b>",x:0.89,y:yZFI.at(0)-0.012,yanchor:"top",xref:"paper",yref:"paper",showarrow:false,font:{family:"Times New Roman",size:12}});}
  if(nzFeats.length>0){layout.geo3=wideGeoCfg(nzFeats,{type:"mercator"},Array.of(0.785,0.995),yNZ);layout.annotations.push({text:"<b>архипелаг Новая Земля</b>",x:0.89,y:yNZ.at(0)-0.012,yanchor:"top",xref:"paper",yref:"paper",showarrow:false,font:{family:"Times New Roman",size:12}});}
  if(kalFeats.length>0){layout.geo4=wideGeoCfg(kalFeats,{type:"mercator"},Array.of(0.785,0.995),Array.of(0.06,0.32));layout.annotations.push({text:"<b>Калининградская область</b>",x:0.89,y:0.048,yanchor:"top",xref:"paper",yref:"paper",showarrow:false,font:{family:"Times New Roman",size:12}});}
  window._plotReady=Plotly.newPlot(mapEl,traces,layout,{responsive:true,displaylogo:false,modeBarButtonsToRemove:Array.of("toImage")}).then(()=>{applyZatoHatch(mapEl);if(coreF.length>0&&(reg!=="ALL"||fo!=="RF"))return addCoreBadges(mapEl,reg!=="ALL");});
  mapEl.on("plotly_relayout",()=>{applyZatoHatch(mapEl);if(coreF.length>0&&(reg!=="ALL"||fo!=="RF"))addCoreBadges(mapEl,reg!=="ALL");});

  if(reg!=="ALL"&&mode==="single"){
    const regList=Array.from(mainFeats.filter(f=>f.properties._map_status==="В_выборке").reduce((m,f)=>{if(!m.has(f.properties.join_key))m.set(f.properties.join_key,f);return m;},new Map()).values()).sort((a,b)=>(Number(Boolean(b.properties.is_center))-Number(Boolean(a.properties.is_center)))||a.properties._lbl.localeCompare(b.properties._lbl,"ru"));
    if(regList.length>0){
      const stage=document.createElement("div");stage.className="map-stage";mapEl.parentNode.insertBefore(stage,mapEl);stage.appendChild(mapEl);
      const pnl=document.createElement("div");pnl.className="mo-side-panel"+(isArk?" ark":"");
      pnl.innerHTML='<div class="mo-side-hdr">Муниципальные образования:</div>';
      const mainTrIdx=traces.findIndex(t=>t.type==="choropleth"&&t.geo==="geo"&&t.locations&&t.locations.length===regList.length);
      regList.forEach((f,i)=>{
        const it=document.createElement("div");it.className="mo-side-item";it.textContent=(i+1)+". "+f.properties._lbl;if(f.properties.is_center)it.style.fontWeight="bold";
        it.onmouseenter=()=>{if(mainTrIdx===-1)return;const orig=mapEl.data.at(mainTrIdx);if(!orig._origZ){orig._origZ=orig.z.slice();orig._origCs=orig.colorscale;}const csDim=Array.of(Array.of(0,"#e2e8f0"),Array.of(0.001,"#e2e8f0")).concat(orig._origCs.map(p=>Array.of(0.002+p.at(0)*0.998,p.at(1))));const nz=orig._origZ.map((v,k)=>orig.locations.at(k)===f.properties.join_key?(0.002+Number(v)*0.998):0);Plotly.restyle(mapEl,{z:Array.of(nz),colorscale:Array.of(csDim)},Array.of(mainTrIdx));};
        pnl.appendChild(it);
      });
      pnl.onmouseleave=()=>{if(mainTrIdx===-1)return;const orig=mapEl.data.at(mainTrIdx);if(orig._origZ)Plotly.restyle(mapEl,{z:Array.of(orig._origZ),colorscale:Array.of(orig._origCs)},Array.of(mainTrIdx));};
      stage.appendChild(pnl);
    }
  }
  box.appendChild(buildFooterHtml(mMeta.cat,scObj,legIt));
}
