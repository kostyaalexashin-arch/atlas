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
function wrapTitle(s,lim=106){if(s.length<=lim)return s;const idx=s.lastIndexOf(" ",lim);if(idx<=30)return s;const tail=s.slice(idx+1);return tail.length<14?s:(s.slice(0,idx)+"<br>"+tail);}
function markerSvg(c,f,sz=20){const s="#1e293b",h=sz/2;if(c==="1")return '<svg width="'+sz+'" height="'+sz+'"><rect x="3" y="3" width="'+(sz-6)+'" height="'+(sz-6)+'" fill="'+f+'" stroke="'+s+'" stroke-width="1.2"/></svg>';if(c==="2")return '<svg width="'+sz+'" height="'+sz+'"><polygon points="'+h+',2 '+(sz-2)+','+h+' '+h+','+(sz-2)+' 2,'+h+'" fill="'+f+'" stroke="'+s+'" stroke-width="1.2"/></svg>';if(c==="3")return '<svg width="'+sz+'" height="'+sz+'"><polygon points="'+h+',2 '+(sz-2)+','+(sz-3)+' 2,'+(sz-3)+'" fill="'+f+'" stroke="'+s+'" stroke-width="1.2"/></svg>';if(c==="4")return '<svg width="'+sz+'" height="'+sz+'"><circle cx="'+h+'" cy="'+h+'" r="'+(h-3)+'" fill="'+f+'" stroke="'+s+'" stroke-width="1.2"/></svg>';return '<svg width="'+sz+'" height="'+sz+'"><polygon points="'+h+',2 '+(sz-2)+','+(sz*0.42)+' '+(sz*0.8)+','+(sz-2)+' '+(sz*0.2)+','+(sz-2)+' 2,'+(sz*0.42)+'" fill="'+f+'" stroke="'+s+'" stroke-width="1.2"/></svg>';}
function getCenter(g){if(!g||!g.coordinates)return{lon:0,lat:0};const rings=g.type==="Polygon"?Array.of(g.coordinates.at(0)):g.coordinates.map(p=>p.at(0));let best=rings.at(0),bLen=0;rings.forEach(r=>{if(r.length>bLen){bLen=r.length;best=r;}});let sx=0,sy=0;best.forEach(pt=>{sx+=pt.at(0);sy+=pt.at(1);});return best.length?{lon:sx/best.length,lat:sy/best.length}:{lon:0,lat:0};}
function makeProj(fo,reg){
  if(fo==="RF"&&reg==="ALL")return{type:"mercator",rotation:{lon:105}};
  if(fo==="Дальневосточный"||reg==="Чукотский автономный округ"||reg==="Камчатский край"||reg==="Магаданская область")return{type:"albers",rotation:{lon:142},parallels:Array.of(50,66)};
  if(fo==="Сибирский"||fo==="Уральский")return{type:"albers",rotation:{lon:85},parallels:Array.of(52,66)};
  return{type:"mercator"};
}
function wideGeoCfg(feats,projObj,domX,domY){
  let x0=999,x1=-999,y0=999,y1=-999;
  const w=c=>{if(typeof c.at(0)==="number"){if(c.at(0)<x0)x0=c.at(0);if(c.at(0)>x1)x1=c.at(0);if(c.at(1)<y0)y0=c.at(1);if(c.at(1)>y1)y1=c.at(1);}else c.forEach(w);};
  feats.forEach(f=>{if(f.geometry&&f.geometry.coordinates)w(f.geometry.coordinates);});
  if(x0>900)return{domain:{x:domX,y:domY},fitbounds:"locations",visible:false,projection:projObj};
  const cx=(x0+x1)/2,cy=(y0+y1)/2,cosL=Math.max(0.24,Math.cos(cy*Math.PI/180));
  const boxW=1560*(domX.at(1)-domX.at(0)),boxH=745*(domY.at(1)-domY.at(0));
  const spanX=Math.max(0.35,(x1-x0)*cosL),spanY=Math.max(0.25,(y1-y0)*(projObj.type==="albers"?0.88:1.15));
  if(projObj.type==="mercator"&&projObj.rotation?.lon===105){
    return{domain:{x:domX,y:domY},visible:false,projection:projObj,lonaxis:{range:Array.of(-90,90)},lataxis:{range:Array.of(41,82)}};
  }
  const sc=Math.min(boxW/(spanX*4.05),boxH/(spanY*4.05));
  const p=Object.assign({},projObj,{scale:Math.max(0.85,sc)});
  return{domain:{x:domX,y:domY},visible:false,projection:p,center:{lon:cx,lat:cy}};
}
function niceRound(v){if(v===0)return 0;const s=v<0?-1:1,a=Math.abs(v),p=Math.pow(10,Math.floor(Math.log10(a))),n=a/p;let r=1;if(n>=7.5)r=10;else if(n>=3.5)r=5;else if(n>=1.5)r=2;return s*r*p;}
function computeScale(vals,palArr,inv){
  const s=vals.slice().sort((a,b)=>a-b),vmin=s.at(Math.floor(s.length*0.02))??0,vmax=s.at(Math.min(s.length-1,Math.floor(s.length*0.98)))??1,med=s.at(Math.floor(s.length*0.5))??0;
  const gamma=(vmin>=0&&med>0&&(vmax/med)>=4.5)?0.42:1.0,pal=inv?palArr.slice().reverse():palArr;
  const norm=v=>{if(vmax<=vmin)return 0.5;return Math.pow(Math.max(0,Math.min(1,(v-vmin)/(vmax-vmin))),gamma);};
  const invNorm=u=>vmin+Math.pow(u,1/gamma)*(vmax-vmin);
  const plScale=Array.of(0,0.125,0.25,0.375,0.5,0.625,0.75,0.875,1.0).map(u=>Array.of(u,pal.at(Math.min(pal.length-1,Math.floor(u*pal.length)))));
  const rawTicks=Array.of(0.08,0.29,0.50,0.71,0.92).map(u=>invNorm(u));
  const span=Math.max(1e-9,vmax-vmin),step=niceRound(span/5);
  const ticks=rawTicks.map((t,i)=>{const v=Math.round(t/step)*step;return (i>0&&v===Math.round(rawTicks.at(i-1)/step)*step)?Number((v+step/2).toFixed(4)):v;});
  const getHex=v=>(v===null||v===undefined||isNaN(Number(v)))?"#eeeeee":pal.at(Math.min(pal.length-1,Math.floor(norm(Number(v))*pal.length)));
  return{vmin,vmax,gamma,pal,plScale,ticks,getHex};
}
function syncControls(){
  const sM=document.getElementById("selMode"),sB=document.getElementById("selBase"),sY=document.getElementById("selYear");
  if(sM.value==="grid"||sM.value==="table"){sB.value="coh";sB.disabled=true;sY.disabled=true;}
  else{sB.disabled=false;if(sB.value==="all"){sY.value="2024";sY.disabled=true;}else{sY.disabled=false;}}
}
function stepSelect(selId,dir){
  const el=document.getElementById(selId);if(!el||el.options.length===0)return;
  el.selectedIndex=(el.selectedIndex+dir+el.options.length)%el.options.length;
  el.dispatchEvent(new Event("change"));
}
const getJson=u=>fetch(u+"?v="+Date.now()).then(r=>{if(!r.ok)throw new Error(u+": HTTP "+r.status);return r.json();});
Promise.all(Array.of(getJson("geo_plotly.json"),getJson("regions_geo.json"),getJson("metrics_data.json"))).then(res=>{try{
  GEO=res.at(0);REGS=res.at(1);DATA=res.at(2);GEO.features.forEach(f=>{f.properties._cent=getCenter(f.geometry);});
  const sFO=document.getElementById("selFO"),sReg=document.getElementById("selReg"),sMet=document.getElementById("selMetric");
  DATA.fos.forEach(f=>sFO.add(new Option(f+" ФО",f)));const gm={};
  DATA.metrics.forEach(m=>{if(!gm[m.group]){gm[m.group]=document.createElement("optgroup");gm[m.group].label=m.group;sMet.add(gm[m.group]);}gm[m.group].appendChild(new Option(m.id+" — "+m.title,m.id));});
  sFO.onchange=()=>{sReg.innerHTML='<option value="ALL">Весь округ / РФ</option>';if(sFO.value!=="RF")(DATA.fo_to_regs[sFO.value]||Array.of()).forEach(r=>sReg.add(new Option(r,r)));render();};
  Array.of("selMode","selBase","selYear","selReg","selMetric","selScale").forEach(id=>document.getElementById(id).onchange=()=>{syncControls();render();});
  document.getElementById("prevMet").onclick=()=>stepSelect("selMetric",-1);document.getElementById("nextMet").onclick=()=>stepSelect("selMetric",1);
  document.getElementById("prevFO").onclick=()=>stepSelect("selFO",-1);document.getElementById("nextFO").onclick=()=>stepSelect("selFO",1);
  document.getElementById("prevReg").onclick=()=>stepSelect("selReg",-1);document.getElementById("nextReg").onclick=()=>stepSelect("selReg",1);
  document.getElementById("btnPng").onclick=exportFullSheetPng;syncControls();render();
}catch(e){document.getElementById("mapDiv").innerHTML="Ошибка: "+e.message;}}).catch(e=>{document.getElementById("mapDiv").innerHTML="Ошибка загрузки: "+e.message;});

function buildFooterHtml(isCat,scObj,mMeta,legItems){
  const f=document.createElement("div");f.className="footer-grid";
  const lBox=document.createElement("div");lBox.className="leg-box"+(isCat?" wide":"");
  legItems.forEach(it=>{
    const d=document.createElement("div");d.className="leg-item";
    d.dataset.color=it.col||"#94a3b8";d.dataset.kind=it.kind||"box";
    d.innerHTML=it.icon+'<span>'+it.txt+'</span>';lBox.appendChild(d);
  });
  f.appendChild(lBox);
  if(!isCat&&scObj){
    const cBox=document.createElement("div");cBox.className="cbar-box";
    cBox.innerHTML='<div class="cbar-strip" style="background:linear-gradient(to right,'+scObj.pal.join(",")+')"></div><div class="cbar-ticks">'+scObj.ticks.map(t=>'<span>'+fmtNum(t,mMeta.dec)+'</span>').join("")+'</div><div class="cbar-title">'+mMeta.title+(scObj.gamma<1?" (сглаж. выбросов)":"")+'</div>';
    f.appendChild(cBox);
  }
  return f;
}

function addCoreBadges(mapEl,isRegLevel){
  if(mapEl._badgeBusy)return;
  setTimeout(()=>{
    const svg=mapEl.querySelector("svg.main-svg");if(!svg)return;
    const sRect=svg.getBoundingClientRect();if(!sRect.width||!sRect.height)return;
    const fo=document.getElementById("selFO").value,reg=document.getElementById("selReg").value;
    const isNW=(fo.includes("Северо-Запад")||fo==="СЗФО")&&reg==="ALL";
    const allF=GEO.features.filter(f=>(fo==="RF"||f.properties.fo===fo)&&(reg==="ALL"||f.properties.region===reg));
    const mainC=allF.filter(f=>!f.properties._inset&&(!isNW||!f.properties.region.includes("Калининград"))&&f.properties.is_center&&f.properties._map_status==="В_выборке");
    const kalC=isNW?allF.filter(f=>f.properties.region.includes("Калининград")&&f.properties.is_center&&f.properties._map_status==="В_выборке"):Array.of();
    const coreOrdered=mainC.concat(kalC);
    const anns=(mapEl.layout.annotations||Array.of()).filter(a=>!a._isCore);
    if(!isRegLevel){
      const pts=Array.from(svg.querySelectorAll(".geolayer .point"));
      coreOrdered.forEach((f,idx)=>{
        const pEl=pts.at(idx);if(!pEl)return;
        const r=pEl.getBoundingClientRect();if(!r||r.width===0)return;
        const px=(r.left+r.width/2-sRect.left)/sRect.width;
        const py=1.0-(r.top+r.height/2-sRect.top)/sRect.height;
        const dirs=Array.of(Array.of(0,-18),Array.of(0,18),Array.of(38,0),Array.of(-38,0));
        const d=dirs.at(idx%4);
        anns.push({
          _isCore:true,xref:"paper",yref:"paper",x:px,y:py,
          text:"<b>"+f.properties._lbl+"</b>",
          showarrow:true,arrowhead:0,arrowwidth:1,arrowcolor:"#475569",
          ax:d.at(0),ay:d.at(1),
          bgcolor:"rgba(255,255,255,0.95)",bordercolor:"#475569",borderwidth:1,borderpad:3,
          font:{family:"Times New Roman",size:12,color:"#111111"}
        });
      });
    }else if(mainC.length>0){
      const paths=Array.from(svg.querySelectorAll(".geolayer .choropleth path"));
      const lastP=paths.at(paths.length-1);
      if(lastP){
        const r=lastP.getBoundingClientRect();
        const px=(r.left+r.width/2-sRect.left)/sRect.width;
        const py=1.0-(r.top+r.height/2-sRect.top)/sRect.height;
        anns.push({
          _isCore:true,xref:"paper",yref:"paper",x:px,y:py,
          text:"<b>"+mainC.at(0).properties._lbl+"</b>",
          showarrow:false,
          bgcolor:"rgba(255,255,255,0.95)",bordercolor:"#e6007e",borderwidth:1.2,borderpad:3,
          font:{family:"Times New Roman",size:13,color:"#111111"}
        });
      }
    }
    mapEl._badgeBusy=true;
    Plotly.relayout(mapEl,{annotations:anns}).finally(()=>{setTimeout(()=>{mapEl._badgeBusy=false;},80);});
  },120);
}

function render(){
  if(!GEO||!DATA)return;
  const mode=document.getElementById("selMode").value,base=document.getElementById("selBase").value,yr=document.getElementById("selYear").value,mId=document.getElementById("selMetric").value,fo=document.getElementById("selFO").value,reg=document.getElementById("selReg").value,scMode=document.getElementById("selScale").value;
  const mMeta=DATA.metrics.find(x=>x.id===mId)||DATA.metrics.at(0),box=document.getElementById("sheetBox");
  const allFeats=GEO.features.filter(f=>(fo==="RF"||f.properties.fo===fo)&&(reg==="ALL"||f.properties.region===reg));
  const isNW=(fo.includes("Северо-Запад")||fo==="СЗФО");
  const hasInsets=(reg.includes("Архангельск")||(isNW&&reg==="ALL"));
  const hasKal=(isNW&&reg==="ALL");
  const mainFeats=hasInsets?allFeats.filter(f=>!f.properties._inset&&(!hasKal||!f.properties.region.includes("Калининград"))):allFeats;
  const nzFeats=hasInsets?allFeats.filter(f=>f.properties._inset==="NZ"):Array.of();
  const zfiFeats=hasInsets?allFeats.filter(f=>f.properties._inset==="ZFI"):Array.of();
  const kalFeats=hasKal?allFeats.filter(f=>f.properties.region.includes("Калининград")):Array.of();
  const terrTitle=reg!=="ALL"?reg:(fo!=="RF"?fo+" федеральный округ":"Российская Федерация");
  const yrs=Array.of("2019","2020","2021","2022","2023","2024"),actCol=PALETTES[currentPal]||PALETTES["RdYlGn"],CORE="#e6007e";

  if(mode==="table"){
    const rows=allFeats.filter(f=>f.properties._map_status==="В_выборке"&&f.properties.coh),refF=(scMode==="global")?GEO.features:allFeats,allV=Array.of();
    yrs.forEach(y=>{const ym=DATA.panel[mId]?.[y]||{};refF.filter(f=>f.properties._map_status==="В_выборке"&&f.properties.coh).forEach(f=>{const v=Number(ym[f.properties.join_key]);if(!isNaN(v))allV.push(v);});});
    const scObj=computeScale(allV,actCol,mMeta.inv);
    const wrap=document.createElement("div");wrap.className="tbl-wrap";
    const hdr=document.createElement("div");hdr.className="sticky-hdr";hdr.textContent=mMeta.title+" (2019–2024 гг.)";
    const tbl=document.createElement("table");tbl.className="dyn-tbl";
    const cg=document.createElement("colgroup");
    Array.of("210px","270px","115px","115px","115px","115px","115px","115px").forEach(w=>{const c=document.createElement("col");c.style.width=w;cg.appendChild(c);});
    tbl.appendChild(cg);
    const thead=tbl.createTHead(),thR=thead.insertRow();
    Array.of("Регион","Муниципальное образование","2019 г.","2020 г.","2021 г.","2022 г.","2023 г.","2024 г.").forEach(t=>{const th=document.createElement("th");th.textContent=t;thR.appendChild(th);});
    const tbody=tbl.createTBody(),presCats=new Set();
    rows.forEach(f=>{const tr=tbody.insertRow(),id=f.properties.join_key;const c0=tr.insertCell();c0.textContent=f.properties.region;const c1=tr.insertCell();c1.className="mo-name";c1.innerHTML="<b>"+f.properties._lbl+"</b>";yrs.forEach(y=>{const td=tr.insertCell(),v=DATA.panel[mId]?.[y]?.[id],cc=DATA.panel_cats?.[y]?.[id]||"5";presCats.add(cc);td.innerHTML='<div>'+markerSvg(cc,scObj.getHex(v),22)+'</div><div style="font-size:12px;margin-top:2px;">'+fmtNum(v,mMeta.dec)+'</div>';});});
    const sHex=actCol.at(Math.floor(actCol.length*0.75)),legIt=Array.of();
    Object.keys(CAT_META).forEach(k=>{if(presCats.has(k))legIt.push({col:sHex,kind:"box",icon:markerSvg(k,sHex,18),txt:CAT_META[k].lbl});});
    wrap.append(hdr,tbl);box.innerHTML="";box.append(wrap,buildFooterHtml(false,scObj,mMeta,legIt));return;
  }

  box.innerHTML='<div id="mapDiv"></div>';const mapEl=document.getElementById("mapDiv");
  const projObj=makeProj(fo,reg);
  const fullTitle=terrTitle+": "+mMeta.title+" ("+(mode==="grid"?"2019–2024 гг.":yr+" г.")+")";
  const hdrSvg={text:"<b>"+wrapTitle(fullTitle,106)+"</b>",x:0.5,xanchor:"center",y:0.985,font:{family:"Times New Roman",size:17,color:"#111"}};

  if(mode==="grid"){
    const subGeo={type:"FeatureCollection",features:mainFeats},refF=(scMode==="global")?GEO.features:allFeats,allV=Array.of();
    yrs.forEach(y=>{const ym=DATA.panel[mId]?.[y]||{};refF.filter(f=>f.properties._map_status==="В_выборке"&&f.properties.coh).forEach(f=>{const v=Number(ym[f.properties.join_key]);if(!isNaN(v))allV.push(v);});});
    const scObj=computeScale(allV,actCol,mMeta.inv),traces=Array.of(),layout={title:hdrSvg,margin:{l:5,r:5,t:62,b:5},height:810,annotations:Array.of()},presCats=new Set();
    yrs.forEach((yK,idx)=>{
      const gK=idx===0?"geo":"geo"+(idx+1),col=idx%3,row=Math.floor(idx/3),x0=col*0.335,x1=x0+0.325,y1=0.95-row*0.48,y0=y1-0.43;
      layout[gK]=wideGeoCfg(mainFeats,projObj,Array.of(x0,x1),Array.of(y0,y1));
      layout.annotations.push({text:"<b>"+yK+" г.</b>",x:(x0+x1)/2,y:y1+0.015,xref:"paper",yref:"paper",showarrow:false,font:{family:"Times New Roman",size:15}});
      traces.push({type:"choropleth",geo:gK,geojson:subGeo,featureidkey:"properties.join_key",locations:mainFeats.map(f=>f.properties.join_key),z:mainFeats.map(()=>0),colorscale:Array.of(Array.of(0,"#f3f4f6"),Array.of(1,"#f3f4f6")),showscale:false,hoverinfo:"skip",marker:{line:{color:"#cbd5e1",width:0.35}}});
      const ym=DATA.panel[mId]?.[yK]||{},pts=mainFeats.filter(f=>f.properties._map_status==="В_выборке"&&f.properties.coh&&ym[f.properties.join_key]!==undefined);
      const syms=pts.map(f=>{const cc=DATA.panel_cats?.[yK]?.[f.properties.join_key]||"5";presCats.add(cc);return CAT_META[cc].sym;});
      traces.push({type:"scattergeo",geo:gK,lon:pts.map(f=>f.properties._cent.lon),lat:pts.map(f=>f.properties._cent.lat),text:pts.map(f=>"<b>"+f.properties._lbl+"</b> ("+yK+" г.): <b>"+fmtNum(ym[f.properties.join_key],mMeta.dec)+"</b>"),hoverinfo:"text",showlegend:false,marker:{symbol:syms,size:fo==="RF"?7:11,color:pts.map(f=>scObj.getHex(ym[f.properties.join_key])),line:{color:"#1e293b",width:0.7}}});
    });
    Plotly.newPlot(mapEl,traces,layout,{responsive:true,displaylogo:false,modeBarButtonsToRemove:Array.of("toImage")});
    const sHex=actCol.at(Math.floor(actCol.length*0.75)),legIt=Array.of();
    Object.keys(CAT_META).forEach(k=>{if(presCats.has(k))legIt.push({col:sHex,kind:"box",icon:markerSvg(k,sHex,18),txt:CAT_META[k].lbl});});
    legIt.push({col:"#f3f4f6",kind:"box",icon:'<span style="display:inline-block;width:18px;height:13px;background:#f3f4f6;border:1px solid #94a3b8;"></span>',txt:"Территория субъектов РФ"});
    box.appendChild(buildFooterHtml(false,scObj,mMeta,legIt));return;
  }

  const valMap=(base==="all"&&yr==="2024")?(DATA.v2024[mId]||{}):(DATA.panel[mId]?.[yr]||{}),traces=Array.of(),legIt=Array.of();
  const refF=(scMode==="global")?GEO.features:allFeats,allV=refF.filter(f=>f.properties._map_status==="В_выборке"&&(base==="all"||f.properties.coh)).map(f=>Number(valMap[f.properties.join_key])).filter(v=>!isNaN(v));
  const scObj=mMeta.cat?null:computeScale(allV,actCol,mMeta.inv);

  const addGeoLayers=(fList,gKey)=>{
    const subG={type:"FeatureCollection",features:fList};
    const outF=fList.filter(f=>f.properties._map_status!=="В_выборке"&&f.properties._map_status!=="ЗАТО");
    const zatoF=fList.filter(f=>f.properties._map_status==="ЗАТО");
    if(outF.length>0)traces.push({type:"choropleth",geo:gKey,geojson:subG,featureidkey:"properties.join_key",locations:outF.map(f=>f.properties.join_key),z:outF.map(()=>0),text:outF.map(f=>f.properties._lbl+" ("+f.properties.region+") — Вне выборки"),hoverinfo:"text",colorscale:Array.of(Array.of(0,"#f0f0f0"),Array.of(1,"#f0f0f0")),showscale:false,marker:{line:{color:"#9aa2ae",width:0.35}}});
    if(zatoF.length>0)traces.push({type:"choropleth",geo:gKey,geojson:subG,featureidkey:"properties.join_key",locations:zatoF.map(f=>f.properties.join_key),z:zatoF.map(()=>0),text:zatoF.map(f=>f.properties._lbl+" ("+f.properties.region+") — ЗАТО"),hoverinfo:"text",colorscale:Array.of(Array.of(0,"#cbd5e1"),Array.of(1,"#cbd5e1")),showscale:false,marker:{line:{color:"#475569",width:0.7}}});
    const inF=fList.filter(f=>f.properties._map_status==="В_выборке"&&(base==="all"||f.properties.coh));
    if(mMeta.cat){
      Object.entries(DATA.cluster_colors).forEach(p=>{const cn=p.at(0),ch=p.at(1),cf=inF.filter(f=>valMap[f.properties.join_key]===cn);if(cf.length>0)traces.push({type:"choropleth",geo:gKey,geojson:subG,featureidkey:"properties.join_key",locations:cf.map(f=>f.properties.join_key),z:cf.map(()=>1),text:cf.map(f=>"<b>"+f.properties._lbl+"</b><br>"+f.properties.region+"<br>"+cn),hoverinfo:"text",colorscale:Array.of(Array.of(0,ch),Array.of(1,ch)),showscale:false,marker:{line:{color:"#64748b",width:0.35}}});});
    }else{
      traces.push({type:"choropleth",geo:gKey,geojson:subG,featureidkey:"properties.join_key",locations:inF.map(f=>f.properties.join_key),z:inF.map(f=>{const v=Number(valMap[f.properties.join_key]);if(isNaN(v))return null;return Math.pow(Math.max(0,Math.min(1,(v-scObj.vmin)/Math.max(1e-9,scObj.vmax-scObj.vmin))),scObj.gamma);}),zmin:0,zmax:1,zauto:false,text:inF.map(f=>"<b>"+f.properties._lbl+"</b><br>"+f.properties.region+"<br>Значение: <b>"+fmtNum(valMap[f.properties.join_key],mMeta.dec)+"</b>"),hoverinfo:"text",colorscale:scObj.plScale,showscale:false,marker:{line:{color:"#64748b",width:0.35}}});
    }
  };

  addGeoLayers(mainFeats,"geo");
  if(nzFeats.length>0)addGeoLayers(nzFeats,"geo2");
  if(zfiFeats.length>0)addGeoLayers(zfiFeats,"geo3");
  if(kalFeats.length>0){
    addGeoLayers(kalFeats,"geo4");
    const kCore=kalFeats.filter(f=>f.properties.is_center&&f.properties._map_status==="В_выборке");
    if(kCore.length>0)traces.push({type:"scattergeo",geo:"geo4",mode:"markers",lon:kCore.map(f=>f.properties._cent.lon),lat:kCore.map(f=>f.properties._cent.lat),hovertext:kCore.map(f=>"<b>Ядро региона:</b> "+f.properties._lbl),hoverinfo:"text",showlegend:false,marker:{size:8,color:CORE,line:{color:"#ffffff",width:1.1}}});
  }

  if(reg==="ALL"&&REGS){
    const rList=REGS.features.filter(f=>fo==="RF"||f.properties.fo===fo);
    traces.push({type:"choropleth",geo:"geo",geojson:{type:"FeatureCollection",features:rList},featureidkey:"properties.region",locations:rList.map(f=>f.properties.region),z:rList.map(()=>1),colorscale:Array.of(Array.of(0,"rgba(0,0,0,0)"),Array.of(1,"rgba(0,0,0,0)")),showscale:false,hoverinfo:"skip",marker:{line:{color:"#1e293b",width:1.4}}});
  }

  if(mMeta.cat){Object.entries(DATA.cluster_colors).forEach(p=>{const cn=p.at(0),ch=p.at(1);if(allFeats.some(f=>valMap[f.properties.join_key]===cn)||fo==="RF")legIt.push({col:ch,kind:"box",icon:'<span style="display:inline-block;width:18px;height:13px;background:'+ch+';border:1px solid #555;"></span>',txt:cn});});}

  const coreF=mainFeats.filter(f=>f.properties.is_center&&f.properties._map_status==="В_выборке");
  if(coreF.length>0){
    if(reg==="ALL"){
      traces.push({type:"scattergeo",geo:"geo",mode:"markers",lon:coreF.map(f=>f.properties._cent.lon),lat:coreF.map(f=>f.properties._cent.lat),text:coreF.map(f=>f.properties._lbl),hovertext:coreF.map(f=>"<b>Ядро региона:</b> "+f.properties._lbl+" ("+f.properties.region+")"),hoverinfo:"text",textposition:coreF.map((f,i)=>{const near=coreF.some((g,j)=>j<i&&Math.hypot(f.properties._cent.lon-g.properties._cent.lon,f.properties._cent.lat-g.properties._cent.lat)<4.2);return near?Array.of("bottom center","middle right","middle left","top center").at(i%4):"top center";}),textfont:{family:"Times New Roman",size:13,color:"#111"},showlegend:false,marker:{size:fo==="RF"?6:9,color:CORE,line:{color:"#ffffff",width:1.1}}});
      legIt.push({col:CORE,kind:"dot",icon:'<span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:'+CORE+';border:1.5px solid #fff;box-shadow:0 0 0 1px #666;"></span>',txt:"Ядро региона (макс. население)"});
    }else{
      traces.push({type:"choropleth",geo:"geo",geojson:{type:"FeatureCollection",features:mainFeats},featureidkey:"properties.join_key",locations:coreF.map(f=>f.properties.join_key),z:coreF.map(()=>1),colorscale:Array.of(Array.of(0,"rgba(0,0,0,0)"),Array.of(1,"rgba(0,0,0,0)")),showscale:false,hoverinfo:"skip",marker:{line:{color:CORE,width:2.8}}});
      
      legIt.push({col:CORE,kind:"line",icon:'<span style="display:inline-block;width:18px;height:3px;background:'+CORE+';"></span>',txt:"Ядро региона (макс. население)"});
    }
  }
  if(allFeats.some(f=>f.properties._map_status==="ЗАТО"))legIt.push({col:"#cbd5e1",kind:"box",icon:'<span style="display:inline-block;width:18px;height:13px;background:#cbd5e1;border:1px solid #475569;"></span>',txt:"ЗАТО"});
  if(allFeats.some(f=>f.properties._map_status!=="В_выборке"&&f.properties._map_status!=="ЗАТО"))legIt.push({col:"#f0f0f0",kind:"box",icon:'<span style="display:inline-block;width:18px;height:13px;background:#f0f0f0;border:1px solid #9aa2ae;"></span>',txt:"Вне выборки"});

  const layout={title:hdrSvg,geo:wideGeoCfg(mainFeats,projObj,Array.of(hasInsets?0.23:0.0,1.0),Array.of(0.02,0.97)),annotations:Array.of(),showlegend:false,margin:{l:5,r:5,t:62,b:5},height:810};
  const yNZ=hasKal?Array.of(0.68,0.93):Array.of(0.52,0.92),yZFI=hasKal?Array.of(0.36,0.61):Array.of(0.04,0.44);
  if(nzFeats.length>0){layout.geo2=wideGeoCfg(nzFeats,{type:"mercator"},Array.of(0.01,0.21),yNZ);layout.geo2.showframe=true;layout.geo2.framecolor="#64748b";layout.geo2.framewidth=1;layout.annotations.push({text:"<b>МО «Новая Земля»</b>",x:0.11,y:yNZ.at(1)+0.025,xref:"paper",yref:"paper",showarrow:false,font:{family:"Times New Roman",size:12}});}
  if(zfiFeats.length>0){layout.geo3=wideGeoCfg(zfiFeats,{type:"mercator"},Array.of(0.01,0.21),yZFI);layout.geo3.showframe=true;layout.geo3.framecolor="#64748b";layout.geo3.framewidth=1;layout.annotations.push({text:"<b>арх. Земля Франца-Иосифа</b>",x:0.11,y:yZFI.at(1)+0.025,xref:"paper",yref:"paper",showarrow:false,font:{family:"Times New Roman",size:12}});}
  if(kalFeats.length>0){layout.geo4=wideGeoCfg(kalFeats,{type:"mercator"},Array.of(0.01,0.21),Array.of(0.04,0.29));layout.geo4.showframe=true;layout.geo4.framecolor="#64748b";layout.geo4.framewidth=1;layout.annotations.push({text:"<b>Калининградская область</b>",x:0.11,y:0.315,xref:"paper",yref:"paper",showarrow:false,font:{family:"Times New Roman",size:12}});}

  Plotly.newPlot(mapEl,traces,layout,{responsive:true,displaylogo:false,modeBarButtonsToRemove:Array.of("toImage")}).then(()=>{
    if(coreF.length>0&&(reg!=="ALL"||fo!=="RF"))addCoreBadges(mapEl,reg!=="ALL");
  });
  mapEl.on("plotly_relayout",()=>{if(coreF.length>0&&(reg!=="ALL"||fo!=="RF"))addCoreBadges(mapEl,reg!=="ALL");});
  box.appendChild(buildFooterHtml(mMeta.cat,scObj,mMeta,legIt));
}