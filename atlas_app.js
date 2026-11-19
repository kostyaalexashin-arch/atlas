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
function markerSvg(c,f,sz=20){const s="#1e293b",h=sz/2;if(c==="1")return '<svg width="'+sz+'" height="'+sz+'"><rect x="3" y="3" width="'+(sz-6)+'" height="'+(sz-6)+'" fill="'+f+'" stroke="'+s+'" stroke-width="1.2"/></svg>';if(c==="2")return '<svg width="'+sz+'" height="'+sz+'"><polygon points="'+h+',2 '+(sz-2)+','+h+' '+h+','+(sz-2)+' 2,'+h+'" fill="'+f+'" stroke="'+s+'" stroke-width="1.2"/></svg>';if(c==="3")return '<svg width="'+sz+'" height="'+sz+'"><polygon points="'+h+',2 '+(sz-2)+','+(sz-3)+' 2,'+(sz-3)+'" fill="'+f+'" stroke="'+s+'" stroke-width="1.2"/></svg>';if(c==="4")return '<svg width="'+sz+'" height="'+sz+'"><circle cx="'+h+'" cy="'+h+'" r="'+(h-3)+'" fill="'+f+'" stroke="'+s+'" stroke-width="1.2"/></svg>';return '<svg width="'+sz+'" height="'+sz+'"><polygon points="'+h+',2 '+(sz-2)+','+(sz*0.42)+' '+(sz*0.8)+','+(sz-2)+' '+(sz*0.2)+','+(sz-2)+' 2,'+(sz*0.42)+'" fill="'+f+'" stroke="'+s+'" stroke-width="1.2"/></svg>';}
function getCenter(g){let sx=0,sy=0,n=0;const w=c=>{if(typeof c.at(0)==="number"){sx+=c.at(0);sy+=c.at(1);n++;}else c.forEach(w);};if(g&&g.coordinates)w(g.coordinates);return n?{lon:sx/n,lat:sy/n}:{lon:0,lat:0};}
function syncControls(){
  const sM=document.getElementById("selMode"),sB=document.getElementById("selBase"),sY=document.getElementById("selYear");
  if(sM.value==="grid"||sM.value==="table"){sB.value="coh";sB.disabled=true;sY.disabled=true;}
  else{sB.disabled=false;if(sB.value==="all"){sY.value="2024";sY.disabled=true;}else{sY.disabled=false;}}
}
function computeScale(vals,palArr,inv){
  const s=vals.slice().sort((a,b)=>a-b),vmin=s.at(Math.floor(s.length*0.02))??0,vmax=s.at(Math.min(s.length-1,Math.floor(s.length*0.98)))??1,med=s.at(Math.floor(s.length*0.5))??0;
  const gamma=(vmin>=0&&med>0&&(vmax/med)>=4.5)?0.42:1.0,pal=inv?palArr.slice().reverse():palArr;
  const norm=v=>{if(vmax<=vmin)return 0.5;return Math.pow(Math.max(0,Math.min(1,(v-vmin)/(vmax-vmin))),gamma);};
  const invNorm=u=>vmin+Math.pow(u,1/gamma)*(vmax-vmin);
  const plScale=Array.of(0,0.125,0.25,0.375,0.5,0.625,0.75,0.875,1.0).map(u=>Array.of(u,pal.at(Math.min(pal.length-1,Math.floor(u*pal.length)))));
  const ticks=Array.of(0.08,0.29,0.50,0.71,0.92).map(u=>invNorm(u));
  const getHex=v=>(v===null||v===undefined||isNaN(Number(v)))?"#eeeeee":pal.at(Math.min(pal.length-1,Math.floor(norm(Number(v))*pal.length)));
  return{vmin,vmax,gamma,pal,plScale,ticks,getHex};
}
const getJson=u=>fetch(u+"?v="+Date.now()).then(r=>{if(!r.ok)throw new Error(u+": HTTP "+r.status);return r.json();});
Promise.all(Array.of(getJson("geo_plotly.json"),getJson("regions_geo.json"),getJson("metrics_data.json"))).then(res=>{try{
  GEO=res.at(0);REGS=res.at(1);DATA=res.at(2);GEO.features.forEach(f=>{f.properties._cent=getCenter(f.geometry);});
  const sFO=document.getElementById("selFO"),sReg=document.getElementById("selReg"),sMet=document.getElementById("selMetric");
  DATA.fos.forEach(f=>sFO.add(new Option(f+" ФО",f)));const gm={};
  DATA.metrics.forEach(m=>{if(!gm[m.group]){gm[m.group]=document.createElement("optgroup");gm[m.group].label=m.group;sMet.add(gm[m.group]);}gm[m.group].appendChild(new Option(m.id+" — "+m.title,m.id));});
  sFO.onchange=()=>{sReg.innerHTML='<option value="ALL">Весь округ / РФ</option>';if(sFO.value!=="RF")(DATA.fo_to_regs[sFO.value]||Array.of()).forEach(r=>sReg.add(new Option(r,r)));render();};
  Array.of("selMode","selBase","selYear","selReg","selMetric","selScale").forEach(id=>document.getElementById(id).onchange=()=>{syncControls();render();});
  document.getElementById("btnPng").onclick=exportFullSheetPng;syncControls();render();
}catch(e){document.getElementById("mapDiv").innerHTML="Ошибка: "+e.message;}}).catch(e=>{document.getElementById("mapDiv").innerHTML="Ошибка загрузки: "+e.message;});

function buildFooterHtml(isCat,scObj,mMeta,legItems){
  const f=document.createElement("div");f.className="footer-grid";
  const lBox=document.createElement("div");lBox.className="leg-box"+(isCat?" wide":"");
  legItems.forEach(it=>{const d=document.createElement("div");d.className="leg-item";d.innerHTML=it.icon+'<span>'+it.txt+'</span>';lBox.appendChild(d);});
  f.appendChild(lBox);
  if(!isCat&&scObj){
    const cBox=document.createElement("div");cBox.className="cbar-box";
    cBox.innerHTML='<div class="cbar-strip" style="background:linear-gradient(to right,'+scObj.pal.join(",")+')"></div><div class="cbar-ticks">'+scObj.ticks.map(t=>'<span>'+fmtNum(t,mMeta.dec)+'</span>').join("")+'</div><div class="cbar-title">'+mMeta.title+(scObj.gamma<1?" (сглаж. выбросов)":"")+'</div>';
    f.appendChild(cBox);
  }
  return f;
}

function render(){
  if(!GEO||!DATA)return;
  const mode=document.getElementById("selMode").value,base=document.getElementById("selBase").value,yr=document.getElementById("selYear").value,mId=document.getElementById("selMetric").value,fo=document.getElementById("selFO").value,reg=document.getElementById("selReg").value,scMode=document.getElementById("selScale").value;
  const mMeta=DATA.metrics.find(x=>x.id===mId)||DATA.metrics.at(0),box=document.getElementById("sheetBox");
  const allFeats=GEO.features.filter(f=>(fo==="RF"||f.properties.fo===fo)&&(reg==="ALL"||f.properties.region===reg));
  const hasInsets=(reg==="Архангельская область"||(fo==="Северо-Западный"&&reg==="ALL"));
  const mainFeats=hasInsets?allFeats.filter(f=>!f.properties._inset):allFeats;
  const nzFeats=hasInsets?allFeats.filter(f=>f.properties._inset==="NZ"):Array.of();
  const zfiFeats=hasInsets?allFeats.filter(f=>f.properties._inset==="ZFI"):Array.of();
  const terrTitle=reg!=="ALL"?reg:(fo!=="RF"?fo+" федеральный округ":"Российская Федерация");
  const yrs=Array.of("2019","2020","2021","2022","2023","2024"),actCol=PALETTES[currentPal]||PALETTES["RdYlGn"],CORE="#e6007e";

  if(mode==="table"){
    const rows=allFeats.filter(f=>f.properties._map_status==="В_выборке"&&f.properties.coh),refF=(scMode==="global")?GEO.features:allFeats,allV=Array.of();
    yrs.forEach(y=>{const ym=DATA.panel[mId]?.[y]||{};refF.filter(f=>f.properties._map_status==="В_выборке"&&f.properties.coh).forEach(f=>{const v=Number(ym[f.properties.join_key]);if(!isNaN(v))allV.push(v);});});
    const scObj=computeScale(allV,actCol,mMeta.inv);
    const hdr=document.createElement("div");hdr.style.cssText="text-align:center;font-size:19px;font-weight:bold;margin-bottom:10px;";hdr.textContent=mMeta.title+" (2019–2024 гг.)";
    const tbl=document.createElement("table");tbl.className="dyn-tbl";
    const thR=tbl.insertRow();Array.of("Регион","Муниципальное образование","2019 г.","2020 г.","2021 г.","2022 г.","2023 г.","2024 г.").forEach(t=>{const th=document.createElement("th");th.textContent=t;thR.appendChild(th);});
    const presCats=new Set();
    rows.forEach(f=>{const tr=tbl.insertRow(),id=f.properties.join_key;const c0=tr.insertCell();c0.textContent=f.properties.region;const c1=tr.insertCell();c1.className="mo-name";c1.innerHTML="<b>"+f.properties._lbl+"</b>";yrs.forEach(y=>{const td=tr.insertCell(),v=DATA.panel[mId]?.[y]?.[id],cc=DATA.panel_cats?.[y]?.[id]||"5";presCats.add(cc);td.innerHTML='<div>'+markerSvg(cc,scObj.getHex(v),22)+'</div><div style="font-size:12px;margin-top:2px;">'+fmtNum(v,mMeta.dec)+'</div>';});});
    const sHex=actCol.at(Math.floor(actCol.length*0.75)),legIt=Array.of();
    Object.keys(CAT_META).forEach(k=>{if(presCats.has(k))legIt.push({icon:markerSvg(k,sHex,18),txt:CAT_META[k].lbl});});
    box.innerHTML="";box.append(hdr,tbl,buildFooterHtml(false,scObj,mMeta,legIt));return;
  }

  box.innerHTML='<div id="mapDiv"></div>';
  const projObj=(fo==="RF"||fo==="Дальневосточный")?{type:"mercator",rotation:{lon:105}}:{type:"mercator"};
  const hdrSvg={text:"<b>"+terrTitle+":</b>  "+mMeta.title+" ("+(mode==="grid"?"2019–2024 гг.":yr+" г.")+")",x:0.5,xanchor:"center",font:{family:"Times New Roman",size:19,color:"#111"}};

  if(mode==="grid"){
    const subGeo={type:"FeatureCollection",features:mainFeats},refF=(scMode==="global")?GEO.features:allFeats,allV=Array.of();
    yrs.forEach(y=>{const ym=DATA.panel[mId]?.[y]||{};refF.filter(f=>f.properties._map_status==="В_выборке"&&f.properties.coh).forEach(f=>{const v=Number(ym[f.properties.join_key]);if(!isNaN(v))allV.push(v);});});
    const scObj=computeScale(allV,actCol,mMeta.inv),traces=Array.of(),layout={title:hdrSvg,margin:{l:5,r:5,t:50,b:5},height:840,annotations:Array.of()},presCats=new Set();
    yrs.forEach((yK,idx)=>{
      const gK=idx===0?"geo":"geo"+(idx+1),col=idx%3,row=Math.floor(idx/3),x0=col*0.335,x1=x0+0.325,y1=0.96-row*0.49,y0=y1-0.44;
      layout[gK]={domain:{x:Array.of(x0,x1),y:Array.of(y0,y1)},fitbounds:"locations",visible:false,projection:projObj};
      layout.annotations.push({text:"<b>"+yK+" г.</b>",x:(x0+x1)/2,y:y1+0.015,xref:"paper",yref:"paper",showarrow:false,font:{family:"Times New Roman",size:15}});
      traces.push({type:"choropleth",geo:gK,geojson:subGeo,featureidkey:"properties.join_key",locations:mainFeats.map(f=>f.properties.join_key),z:mainFeats.map(()=>0),colorscale:Array.of(Array.of(0,"#f3f4f6"),Array.of(1,"#f3f4f6")),showscale:false,hoverinfo:"skip",marker:{line:{color:"#cbd5e1",width:0.35}}});
      const ym=DATA.panel[mId]?.[yK]||{},pts=mainFeats.filter(f=>f.properties._map_status==="В_выборке"&&f.properties.coh&&ym[f.properties.join_key]!==undefined);
      const syms=pts.map(f=>{const cc=DATA.panel_cats?.[yK]?.[f.properties.join_key]||"5";presCats.add(cc);return CAT_META[cc].sym;});
      traces.push({type:"scattergeo",geo:gK,lon:pts.map(f=>f.properties._cent.lon),lat:pts.map(f=>f.properties._cent.lat),text:pts.map(f=>"<b>"+f.properties._lbl+"</b> ("+yK+" г.): <b>"+fmtNum(ym[f.properties.join_key],mMeta.dec)+"</b>"),hoverinfo:"text",showlegend:false,marker:{symbol:syms,size:fo==="RF"?7:11,color:pts.map(f=>scObj.getHex(ym[f.properties.join_key])),line:{color:"#1e293b",width:0.7}}});
    });
    Plotly.newPlot("mapDiv",traces,layout,{responsive:true});
    const sHex=actCol.at(Math.floor(actCol.length*0.75)),legIt=Array.of();
    Object.keys(CAT_META).forEach(k=>{if(presCats.has(k))legIt.push({icon:markerSvg(k,sHex,18),txt:CAT_META[k].lbl});});
    legIt.push({icon:'<span style="display:inline-block;width:18px;height:13px;background:#f3f4f6;border:1px solid #94a3b8;"></span>',txt:"Территория субъектов РФ"});
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

  if(reg==="ALL"&&REGS){
    const rList=REGS.features.filter(f=>fo==="RF"||f.properties.fo===fo);
    traces.push({type:"choropleth",geo:"geo",geojson:{type:"FeatureCollection",features:rList},featureidkey:"properties.region",locations:rList.map(f=>f.properties.region),z:rList.map(()=>1),colorscale:Array.of(Array.of(0,"rgba(0,0,0,0)"),Array.of(1,"rgba(0,0,0,0)")),showscale:false,hoverinfo:"skip",marker:{line:{color:"#1e293b",width:1.4}}});
  }

  if(mMeta.cat){Object.entries(DATA.cluster_colors).forEach(p=>{const cn=p.at(0),ch=p.at(1);if(allFeats.some(f=>valMap[f.properties.join_key]===cn)||fo==="RF")legIt.push({icon:'<span style="display:inline-block;width:18px;height:13px;background:'+ch+';border:1px solid #555;"></span>',txt:cn});});}

  const coreF=mainFeats.filter(f=>f.properties.is_center&&f.properties._map_status==="В_выборке");
  if(coreF.length>0){
    if(reg==="ALL"){
      traces.push({type:"scattergeo",geo:"geo",mode:fo==="RF"?"markers":"markers+text",lon:coreF.map(f=>f.properties._cent.lon),lat:coreF.map(f=>f.properties._cent.lat),text:coreF.map(f=>f.properties._lbl),hovertext:coreF.map(f=>"<b>Ядро региона:</b> "+f.properties._lbl+" ("+f.properties.region+")"),hoverinfo:"text",textposition:"top center",textfont:{family:"Times New Roman",size:11,color:"#111"},showlegend:false,marker:{size:fo==="RF"?6:9,color:CORE,line:{color:"#ffffff",width:1.1}}});
      legIt.push({icon:'<span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:'+CORE+';border:1.5px solid #fff;box-shadow:0 0 0 1px #666;"></span>',txt:"Ядро региона (макс. население)"});
    }else{
      traces.push({type:"choropleth",geo:"geo",geojson:{type:"FeatureCollection",features:mainFeats},featureidkey:"properties.join_key",locations:coreF.map(f=>f.properties.join_key),z:coreF.map(()=>1),colorscale:Array.of(Array.of(0,"rgba(0,0,0,0)"),Array.of(1,"rgba(0,0,0,0)")),showscale:false,hoverinfo:"skip",marker:{line:{color:CORE,width:2.8}}});
      traces.push({type:"scattergeo",geo:"geo",mode:"text",lon:coreF.map(f=>f.properties._cent.lon),lat:coreF.map(f=>f.properties._cent.lat),text:coreF.map(f=>"<b>"+f.properties._lbl+"</b>"),hoverinfo:"skip",showlegend:false,textfont:{family:"Times New Roman",size:12,color:"#111"}});
      legIt.push({icon:'<span style="display:inline-block;width:18px;height:3px;background:'+CORE+';"></span>',txt:"Ядро региона (макс. население)"});
    }
  }
  if(allFeats.some(f=>f.properties._map_status==="ЗАТО"))legIt.push({icon:'<span style="display:inline-block;width:18px;height:13px;background:#cbd5e1;border:1px solid #475569;"></span>',txt:"ЗАТО"});
  if(allFeats.some(f=>f.properties._map_status!=="В_выборке"&&f.properties._map_status!=="ЗАТО"))legIt.push({icon:'<span style="display:inline-block;width:18px;height:13px;background:#f0f0f0;border:1px solid #9aa2ae;"></span>',txt:"Вне выборки"});

  const layout={title:hdrSvg,geo:{domain:{x:Array.of(hasInsets?0.22:0.0,1.0),y:Array.of(0.0,1.0)},fitbounds:"locations",visible:false,projection:projObj},annotations:Array.of(),showlegend:false,margin:{l:5,r:5,t:48,b:5},height:840};
  if(nzFeats.length>0){layout.geo2={domain:{x:Array.of(0.01,0.20),y:Array.of(0.52,0.94)},fitbounds:"locations",visible:false,projection:{type:"mercator"},showframe:true,framecolor:"#64748b",framewidth:1};layout.annotations.push({text:"<b>МО «Новая Земля»</b>",x:0.105,y:0.97,xref:"paper",yref:"paper",showarrow:false,font:{family:"Times New Roman",size:12}});}
  if(zfiFeats.length>0){layout.geo3={domain:{x:Array.of(0.01,0.20),y:Array.of(0.04,0.46)},fitbounds:"locations",visible:false,projection:{type:"mercator"},showframe:true,framecolor:"#64748b",framewidth:1};layout.annotations.push({text:"<b>арх. Земля Франца-Иосифа</b>",x:0.105,y:0.49,xref:"paper",yref:"paper",showarrow:false,font:{family:"Times New Roman",size:12}});}
  Plotly.newPlot("mapDiv",traces,layout,{responsive:true});
  box.appendChild(buildFooterHtml(mMeta.cat,scObj,mMeta,legIt));
}