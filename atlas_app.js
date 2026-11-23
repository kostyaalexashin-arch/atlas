
window.returnToWelcome = function(){
  window._welcomeDismissed = false;
  document.body.classList.add('welcome-active');
  const sb = document.getElementById('mainSidebar') || document.querySelector('.sidebar');
  if(sb) sb.style.display = 'none';
  const ov = document.getElementById('welcomeOverlay');
  if(ov) ov.style.display = 'flex';
  const btnH = document.getElementById('btnGoHome');
  if(btnH) btnH.style.display = 'none';
  if(typeof renderRandomAtlasFact === 'function') renderRandomAtlasFact();
};


window._lastFactMO = null;

window._inflectAdjPrep = function(word){
  if(/([жшщч])ий$/i.test(word)) return word.replace(/ий$/i, 'ем');
  if(/([гкх])ий$/i.test(word)) return word.replace(/ий$/i, 'ом');
  if(/ский$/i.test(word)) return word.replace(/ский$/i, 'ском');
  if(/цкий$/i.test(word)) return word.replace(/цкий$/i, 'цком');
  if(/ний$/i.test(word)) return word.replace(/ний$/i, 'нем');
  if(/[ыо]й$/i.test(word)) return word.replace(/[ыо]й$/i, 'ом');
  if(/ий$/i.test(word)) return word.replace(/ий$/i, 'ом');
  return word;
};

window._formatMoInPrep = function(lbl){
  const s = String(lbl || '').trim();
  const mParen = s.match(/^(.+?)\s*\((МР|ГО|МО|ГП|СП)\)$/i);
  if(mParen){
    const base = mParen[1].trim();
    const kind = mParen[2].toUpperCase();
    const typeMap = {
      'МР': 'муниципальном районе',
      'ГО': 'городском округе',
      'МО': 'муниципальном округе',
      'ГП': 'городском поселении',
      'СП': 'сельском поселении'
    };
    const words = base.split(/\s+/);
    const inflected = words.map((w, i) => (i === 0 || /[ыио]й$/i.test(w)) ? window._inflectAdjPrep(w) : w).join(' ');
    return inflected + ' ' + (typeMap[kind] || 'муниципальном образовании');
  }
  if(/^г\.\s*/i.test(s)) return 'городе ' + s.replace(/^г\.\s*/i, '');
  if(/^город\s+/i.test(s)) return 'городе ' + s.replace(/^город\s+/i, '');
  return s;
};

window._inflectRegionPrep = function(reg){
  let r = String(reg || '').trim();
  r = r.replace(/\bобласть\b/i, 'области');
  r = r.replace(/\bкрай\b/i, 'крае');
  r = r.replace(/\bРеспублика\b/i, 'Республике');
  r = r.replace(/\bавтономный округ\b/i, 'автономном округе');
  r = r.replace(/\bавтономная область\b/i, 'автономной области');
  r = r.replace(/^([А-ЯЁа-яё-]+)(?=\s+(?:области|крае|Республике|автономном|автономной))/u, m => window._inflectAdjPrep(m));
  const w0 = r.split(/\s+/)[0] || '';
  if(/ская$/i.test(w0)) r = r.replace(/^([А-ЯЁа-яё-]+)ая\b/u, '$1ой');
  if(/яя$/i.test(w0)) r = r.replace(/^([А-ЯЁа-яё-]+)яя\b/u, '$1ей');
  return r;
};

window._splitMetricTitleAndUnit = function(rawTitle){
  let t = String(rawTitle || '').trim();
  let unit = '';
  const idxComma = t.lastIndexOf(',');
  if(idxComma > 10 && idxComma >= t.length - 18){
    unit = t.slice(idxComma + 1).trim();
    t = t.slice(0, idxComma).trim();
  }
  if(t.length > 1 && t[0] === t[0].toUpperCase() && t[1] === t[1].toLowerCase()){
    t = t[0].toLowerCase() + t.slice(1);
  }
  if(/,\s*(?:находящ|требующ|нуждающ|приходящ|не\s+отвечающ|не\s+имеющ|используем|пользующ|проживающ|состоящ|оборудованн|в\s+отношении\s+которых|имеющ|расположенн|введенн)/i.test(t)){
    t = t + ',';
  }
  return { name: t, unit };
};

window._agreeVerb = function(metricName, isUp, isStatic){
  const cleanName = String(metricName || '').replace(/,+$/, '').trim();
  const firstWord = (cleanName.split(/\s+/)[0] || '').toLowerCase();
  const plurStems = ['расходы', 'доходы', 'инвестиции', 'средства', 'выбросы', 'отходы', 'затраты', 'поступления', 'налоги', 'субсидии'];
  const femStems  = ['доля', 'площадь', 'протяженность', 'протяжённость', 'численность', 'обеспеченность', 'выручка', 'прибыль', 'добыча', 'мощность'];
  const neutStems = ['количество', 'число', 'отношение', 'соотношение', 'значение', 'потребление', 'водоотведение', 'водоснабжение'];

  if(plurStems.some(w => firstWord.startsWith(w))) return isStatic ? 'составили' : (isUp ? 'выросли' : 'снизились');
  if(femStems.some(w => firstWord.startsWith(w)) || /[ая]$/.test(firstWord)) return isStatic ? 'составила' : (isUp ? 'выросла' : 'снизилась');
  if(neutStems.some(w => firstWord.startsWith(w)) || /[ое]$/.test(firstWord)) return isStatic ? 'составило' : (isUp ? 'выросло' : 'снизилось');
  return isStatic ? 'составил' : (isUp ? 'вырос' : 'снизился');
};

window.renderRandomAtlasFact = function(){
  const box = document.getElementById('welcomeFactText');
  if(!box) return;
  if(typeof GEO === 'undefined' || typeof DATA === 'undefined' || !GEO || !DATA){
    setTimeout(window.renderRandomAtlasFact, 250);
    return;
  }
  const mos = [], seen = new Set();
  GEO.features.forEach(f => {
    const p = f.properties;
    if(p && p._map_status === 'В_выборке' && !p._inset && !seen.has(p.join_key)){
      seen.add(p.join_key);
      mos.push(p);
    }
  });
  const numMets = (DATA.metrics || []).filter(m => !(m.cat || m.is_cat) && /^(ЭК|СЦ|УЭ)-\d{2}$/.test(String(m.id || '').trim()));
  if(!mos.length || !numMets.length) return;

  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  for(let attempt = 0; attempt < 50; attempt++){
    const mo = pick(mos), jk = mo.join_key;
    const placePhrase = `в <b>${window._formatMoInPrep(mo._lbl)}</b> (${window._inflectRegionPrep(mo.region)})`;
    if((attempt % 2 === 0) && mo.coh){
      const m = pick(numMets);
      const v19 = DATA.panel?.[m.id]?.['2019']?.[jk], v24 = DATA.panel?.[m.id]?.['2024']?.[jk];
      if(v19 !== undefined && v19 !== null && v24 !== undefined && v24 !== null && Number(v19) !== Number(v24)){
        const s19 = typeof fmtNum === 'function' ? fmtNum(v19, m.dec) : Number(v19).toFixed(m.dec || 2);
        const s24 = typeof fmtNum === 'function' ? fmtNum(v24, m.dec) : Number(v24).toFixed(m.dec || 2);
        const { name, unit } = window._splitMetricTitleAndUnit(m.title);
        const uStr = unit ? (' ' + unit) : '';
        window._lastFactMO = mo;
        box.innerHTML = `<span>А вы знали, что с 2019 по 2024 годы ${placePhrase} ${name} ${window._agreeVerb(name, Number(v24) > Number(v19), false)} с <b>${s19}${uStr}</b> до <b>${s24}${uStr}</b>?</span>`;
        return;
      }
    }
    const m = pick(numMets);
    const v24 = (DATA.v2024?.[m.id]?.[jk] !== undefined && DATA.v2024?.[m.id]?.[jk] !== null) ? DATA.v2024[m.id][jk] : DATA.panel?.[m.id]?.['2024']?.[jk];
    if(v24 !== undefined && v24 !== null && v24 !== ''){
      const s24 = typeof fmtNum === 'function' ? fmtNum(v24, m.dec) : Number(v24).toFixed(m.dec || 2);
      const { name, unit } = window._splitMetricTitleAndUnit(m.title);
      const uStr = unit ? (' ' + unit) : '';
      window._lastFactMO = mo;
      box.innerHTML = `<span>А вы знали, что в 2024 году ${placePhrase} ${name} ${window._agreeVerb(name, true, true)} <b>${s24}${uStr}</b>?</span>`;
      return;
    }
  }
};

window.openFactInPassport = function(){
  const mo = window._lastFactMO;
  if(typeof startAtlasMode === 'function') startAtlasMode('passport');
  if(mo && typeof PASS_STATE !== 'undefined'){
    PASS_STATE.key = mo.join_key;
    const mIn = document.getElementById('pMOIn');
    if(mIn) mIn.value = mo._lbl + ' (' + mo.region + ')';
    const ySel = document.getElementById('pYear');
    if(ySel){ ySel.value = '2024'; ySel.disabled = !mo.coh; }
    if(typeof renderPassport === 'function') renderPassport();
  }
};

setTimeout(() => { if(typeof window.renderRandomAtlasFact === 'function') window.renderRandomAtlasFact(); }, 300);



window._welcomeDismissed = false;
window.toggleWelcomeBatchCats = function(){
  const row = document.getElementById('welcomeBatchSubRow');
  if(row) row.style.display = (row.style.display === 'none' || !row.style.display) ? 'grid' : 'none';
};

window.openBatchFromWelcome = function(targetMode){
  const sMode = document.getElementById('selMode');
  if(sMode && targetMode){
    sMode.value = targetMode;
    if(!sMode.value && sMode.options.length) sMode.selectedIndex = 0;
    if(typeof syncControls === 'function') syncControls();
  }
  const btnB = document.getElementById('btnOpenBatch') || document.querySelector('[onclick*="batch"], #btnBatch');
  if(btnB) btnB.click();
};

window.startAtlasMode = function(modeVal){
  window._welcomeDismissed = true;
  document.body.classList.remove('welcome-active');
  const sb = document.getElementById('mainSidebar') || document.querySelector('.sidebar');
  if(sb) sb.style.display = 'flex';
  const ov = document.getElementById('welcomeOverlay');
  if(ov) ov.style.display = 'none';
  const btnH = document.getElementById('btnGoHome');
  if(btnH) btnH.style.display = 'inline-block';
  const sMode = document.getElementById('selMode');
  if(sMode && modeVal){
    sMode.value = (modeVal === 'single') ? 'map' : modeVal;
    if(!sMode.value && sMode.options.length) sMode.selectedIndex = 0;
    if(typeof syncControls === 'function') syncControls();
  }
  if(typeof render === 'function') render();
};

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
function wrapTitle(str,maxLen=95){
  const s=String(str||"").trim();
  if(s.length<=maxLen)return s;
  const words=s.split(/\s+/);
  const lines=[];
  let cur="";
  words.forEach(w=>{
    const cand=cur?(cur+" "+w):w;
    if(cand.length>maxLen&&cur){
      lines.push(cur);
      cur=w;
    }else{
      cur=cand;
    }
  });
  if(cur)lines.push(cur);
  if(lines.length>3){
    const merged=lines.slice(0,2);
    merged.push(lines.slice(2).join(" "));
    return merged.join("<br>");
  }
  return lines.join("<br>");
}
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
  if(fo==="Дальневосточный"&&reg==="ALL")return{type:"mercator",rotation:{lon:152}};if(reg==="Чукотский автономный округ")return{type:"mercator",rotation:{lon:174}};
  return{type:"mercator"};
}
function wideGeoCfg(feats,projObj,domX,domY){
  const rotLon=projObj.rotation?.lon||0;let x0=999,x1=-999,y0=999,y1=-999;
  const w=c=>{if(typeof c.at(0)==="number"){const lx=((c.at(0)-rotLon+540)%360)-180;if(lx<x0)x0=lx;if(lx>x1)x1=lx;if(c.at(1)<y0)y0=c.at(1);if(c.at(1)>y1)y1=c.at(1);}else c.forEach(w);};
  feats.forEach(f=>{if(f.geometry&&f.geometry.coordinates)w(f.geometry.coordinates);});
  if(x0>900)return{domain:{x:domX,y:domY},fitbounds:"locations",visible:false,projection:projObj};
  if(projObj.type==="conic equal area"){
    return{domain:{x:domX,y:domY},visible:false,showframe:false,projection:projObj,lonaxis:{range:Array.of(22,188)},lataxis:{range:Array.of(41.2,81.8)}};
  }
  const mEl=document.getElementById("mapDiv"),W=(mEl&&mEl.clientWidth>200)?mEl.clientWidth:1540,H=(mEl&&mEl.clientHeight>200)?mEl.clientHeight:740;
  const boxW=W*(domX.at(1)-domX.at(0)),boxH=H*(domY.at(1)-domY.at(0)),aspect=boxW/Math.max(1,boxH);
  const toM=lat=>Math.log(Math.tan(Math.PI/4+Math.max(-84,Math.min(84,lat))*Math.PI/360))*180/Math.PI;
  const fromM=ym=>(2*Math.atan(Math.exp(ym*Math.PI/180))-Math.PI/2)*180/Math.PI;
  const cx=(x0+x1)/2,ym0=toM(y0),ym1=toM(y1),spanM=Math.max(0.45,ym1-ym0),padY=spanM*0.015;
  let ymBot=ym0-padY,ymTop=ym1+padY,dym=ymTop-ymBot,dx=Math.max(0.45,(x1-x0)*1.02);
  if(dx/dym<aspect){dx=dym*aspect;}else{const extra=(dx/aspect-dym)/2;ymBot-=extra;ymTop+=extra;}
  const baseLon=(projObj.rotation?.lon===175)?0:rotLon;
  return{domain:{x:domX,y:domY},visible:false,showframe:false,projection:projObj,lonaxis:{range:Array.of(baseLon+cx-dx/2,baseLon+cx+dx/2)},lataxis:{range:Array.of(Math.max(-84,fromM(ymBot)),Math.min(84.5,fromM(ymTop)))}};
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
  const isBench=(sM.value==="bench"),isPass=(sM.value==="passport"),hideStd=isBench||isPass;
  const bp=document.getElementById("benchPanel"),pp=document.getElementById("passPanel"),dp=document.getElementById("distPanel"),mb=document.getElementById("stdMetBox");
  if(dp)dp.style.display=(sM.value==="dist")?"flex":"none";
  if(bp)bp.style.display=isBench?"flex":"none";
  if(pp)pp.style.display=isPass?"flex":"none";
  if(mb)mb.style.display=hideStd?"none":"flex";
  Array.of("selBase","selYear","selFO","selReg","prevFO","nextFO","prevReg","nextReg").forEach(id=>{const el=document.getElementById(id);if(el)el.style.display=hideStd?"none":"";});
  document.querySelectorAll(".nav-grp").forEach(el=>el.style.display=hideStd?"none":"flex");
  const shB=document.getElementById("sheetBox");if(shB)shB.classList.toggle("portrait",isPass);
  const scEl=document.getElementById("selPdfScope");
  if(scEl){
    const targetMode=isPass?"pass":(isBench?"bench":(sM.value==="table"?"table":"map"));
    if(scEl.dataset.mode!==targetMode){
      scEl.dataset.mode=targetMode;
      if(targetMode==="pass")scEl.innerHTML='<option value="cur">Текущее МО (1 лист)</option><option value="reg">Все МО региона</option><option value="fo">Все МО ФО</option><option value="cat">По категории МО</option><option value="coh">Все 193 МО когорты</option>';
      else if(targetMode==="bench")scEl.innerHTML='<option value="cur">Текущее сравнение (2 листа)</option>';
      else if(targetMode==="table")scEl.innerHTML='<option value="cur">Текущая таблица</option><option value="all_fo">Все 8 ФО (по показателю)</option><option value="all_reg">Все регионы (по показателю)</option><option value="all_met">Все показатели (по территории)</option>';
      else scEl.innerHTML='<option value="cur">Текущий лист</option><option value="fo">РФ + 8 ФО (по показателю)</option><option value="cur_fo">Регионы ФО (по показателю)</option><option value="all">Весь атлас (по показателю)</option><option value="all_met">Все показатели (по территории)</option>';
    }
  }
  const sScEl=document.getElementById("selScale");if(sScEl)sScEl.style.display=(sM.value==="dist")?"none":"";
  const gW=document.getElementById("grpFOWrap"),cGFEl=document.getElementById("chkGroupFO");
  const isTblMode=(sM.value==="table"),canGrpFO=(isTblMode&&document.getElementById("selFO")?.value==="RF");
  if(cGFEl)cGFEl.disabled=!canGrpFO;
  if(gW){gW.style.display=isTblMode?"flex":"none";gW.style.opacity=canGrpFO?"1":"0.45";gW.style.pointerEvents=canGrpFO?"auto":"none";}
  if(hideStd)return;
  const sMet=document.getElementById("selMetric");
  if(sMet){
    const isTbl=(sM.value==="table");
    Array.from(sMet.options).forEach(opt=>{if(opt.dataset.isSep==="1"){opt.style.display="";return;}const mm=DATA.metrics.find(x=>x.id===opt.value);opt.style.display=(isTbl&&mm&&(mm.cat||mm.is_cat))?"none":"";});
    const curMM=DATA.metrics.find(x=>x.id===sMet.value);
    if(isTbl&&curMM&&(curMM.cat||curMM.is_cat)){const okOpt=Array.from(sMet.options).find(o=>{const mm=DATA.metrics.find(x=>x.id===o.value);return mm&&!(mm.cat||mm.is_cat);});if(okOpt)sMet.value=okOpt.value;}
  }
  if(sM.value==="table"){sB.value="coh";sB.disabled=true;sY.disabled=true;}
  else{sB.disabled=false;if(sB.value==="all"){sY.value="2024";sY.disabled=true;}else{sY.disabled=false;}}
}
function stepSelect(selId,dir){
  const el=document.getElementById(selId);if(!el||el.options.length===0)return;
  const n=el.options.length,curMode=document.getElementById("selMode")?.value;
  let idx=el.selectedIndex;
  for(let k=0;k<n;k++){
    idx=(idx+dir+n)%n;
    const opt=el.options[idx];
    if(opt.disabled||opt.hidden)continue;
    if(selId==="selMetric"&&curMode==="table"&&typeof DATA!=="undefined"){
      const mm=(DATA.metrics||[]).find(m=>m.id===opt.value);
      if(mm&&(mm.cat||mm.is_cat))continue;
    }
    el.selectedIndex=idx;
    el.dispatchEvent(new Event("change"));
    return;
  }
}
const getJson=u=>fetch(u+"?v="+Date.now()).then(r=>{if(!r.ok)throw new Error(u+": HTTP "+r.status);return r.json();});
Promise.all(Array.of(getJson("geo_plotly.json"),getJson("regions_geo.json"),getJson("metrics_data.json"))).then(res=>{try{
  GEO=res.at(0);REGS=res.at(1);DATA=res.at(2);GEO.features.forEach(f=>{f.properties._cent=(f.properties._cx!==undefined)?{lon:f.properties._cx,lat:f.properties._cy}:getCenter(f.geometry);});
  const sFO=document.getElementById("selFO"),sReg=document.getElementById("selReg"),sMet=document.getElementById("selMetric");
  DATA.fos.forEach(f=>sFO.add(new Option(f+" ФО",f)));const gm={};
  DATA.metrics.slice().sort((a,b)=>String(a.group||"").localeCompare(String(b.group||""),"ru")).forEach(m=>{const gLbl=String(m.group||"").replace(/^5\.1\./,"5.");if(!gm[gLbl]){gm[gLbl]=document.createElement("optgroup");gm[gLbl].label=gLbl;sMet.add(gm[gLbl]);}gm[gLbl].appendChild(new Option(m.id+": "+m.title,m.id));});
  const cGF=document.getElementById("chkGroupFO");if(cGF)cGF.onchange=render;
  sFO.onchange=()=>{syncControls();sReg.innerHTML='<option value="ALL">Весь округ / РФ</option>';if(sFO.value!=="RF")(DATA.fo_to_regs[sFO.value]||Array.of()).forEach(r=>sReg.add(new Option(r,r)));render();};
  Array.of("selMode","selBase","selYear","selReg","selMetric","selScale").forEach(id=>document.getElementById(id).onchange=()=>{addSubBlockSeparators();if(typeof renderRandomAtlasFact==="function")renderRandomAtlasFact();syncControls();render();});
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
  const svg=mapEl.querySelector("svg.main-svg");if(!svg)return Promise.resolve();
  const sRect=svg.getBoundingClientRect(),pW=sRect.width,pH=sRect.height;if(pW<50||pH<50)return Promise.resolve();
  const oldA=(mapEl.layout.annotations||Array.of()).filter(a=>!a._isCore),anns=oldA.slice();
  const sideEl=document.querySelector(".mo-side-panel");
  const hasRight=Boolean(sideEl&&sideEl.offsetParent!==null);
  const xMax=hasRight?0.76:0.99,placed=Array.of(),ptObstacles=Array.of();
  const placeItem=(cx,cy,lbl,sz,pad,distX,distY)=>{
    const bw=Math.max(46,lbl.length*(sz*0.62)+14),bh=sz+pad*2+6;
    const dirs=[[0,-1],[1,-0.75],[-1,-0.75],[1,0.75],[-1,0.75],[1,0],[-1,0],[0,-1.6],[0,1.6],[1.4,-1.1],[-1.4,-1.1],[1.4,1.1],[-1.4,1.1]];
    let bestLx=cx,bestLy=cy-distY;
    for(const item of dirs){
      const ux=item[0],uy=item[1];
      const lx=cx+Math.round(ux*distX),ly=cy+Math.round(uy*distY);
      if(lx-bw*0.5<sRect.left+6||lx+bw*0.5>sRect.left+pW*xMax-6||ly-bh*0.5<sRect.top+6||ly+bh*0.5>sRect.bottom-6)continue;
      const hitBox=placed.some(b=>Math.abs(lx-b.x)<(bw+b.w)*0.5+4&&Math.abs(ly-b.y)<(bh+b.h)*0.5+3);
      const hitPt=ptObstacles.some(p=>Math.abs(lx-p.x)<bw*0.5+8&&Math.abs(ly-p.y)<bh*0.5+8);
      if(!hitBox&&!hitPt){bestLx=lx;bestLy=ly;break;}
    }
    placed.push({x:bestLx,y:bestLy,w:bw,h:bh});
    const px=(bestLx-sRect.left)/pW,py=1.0-(bestLy-sRect.top)/pH;
    anns.push({_isCore:true,xref:"paper",yref:"paper",x:px,y:py,xanchor:"center",yanchor:"middle",text:"<b>"+lbl+"</b>",showarrow:false,bgcolor:"rgba(255,255,255,0.95)",bordercolor:"#e6007e",borderwidth:1.1,borderpad:pad,font:{family:"Times New Roman",size:sz,color:"#111111"}});
  };
  if(isRegLevel){
    const coreP=Array.from(svg.querySelectorAll('[class*="geo"] .choropleth path')).find(p=>{const st=(p.getAttribute("style")||"").replace(/\s/g,"");return st.includes("230,0,126")||st.includes("e6007e");});
    const regName=document.getElementById("selReg")?.value||"";
    const coreFeat=GEO.features.find(f=>f.properties.region===regName&&f.properties.is_center&&f.properties._map_status==="В_выборке");
    const cName=coreFeat?coreFeat.properties._lbl:(DATA.core_names?.[regName]||regName);
    if(coreP){
      const r=coreP.getBoundingClientRect(),cx=r.left+r.width*0.5,cy=r.top+r.height*0.5;
      if(r.width>0&&cx>=sRect.left+4&&cx<=sRect.left+pW*xMax&&cy>=sRect.top+4&&cy<=sRect.bottom-4){
        placeItem(cx,cy,cName,13,3,Math.min(115,Math.round(r.width*0.5+28)),Math.min(85,Math.round(r.height*0.5+18)));
      }
    }
  }else{
    const pts=Array.from(svg.querySelectorAll('[class*="geo"] .scatterlayer path.point'));
    const txts=Array.from(svg.querySelectorAll('[class*="geo"] .scatterlayer text'));
    const items=Array.of();
    pts.forEach(pt=>{
      const r=pt.getBoundingClientRect(),cx=r.left+r.width*0.5,cy=r.top+r.height*0.5;
      if(r.width<=0||cx<sRect.left+4||cx>sRect.left+pW*xMax||cy<sRect.top+4||cy>sRect.bottom-4)return;
      ptObstacles.push({x:cx,y:cy});
      let bestT=null,bestD=1e9;
      txts.forEach(t=>{const tr=t.getBoundingClientRect(),d=Math.hypot((tr.left+tr.width*0.5)-cx,(tr.top+tr.height*0.5)-cy);if(d<bestD){bestD=d;bestT=t;}});
      let lbl=(bestT&&bestD<140)?(bestT.textContent||"").trim():"";
      if(!lbl&&(cx-sRect.left)/pW>0.72&&(cy-sRect.top)/pH>0.55)lbl="Калининград";
      if(lbl)items.push({cx,cy,lbl});
    });
    items.sort((a,b)=>a.cy-b.cy);
    items.forEach(it=>placeItem(it.cx,it.cy,it.lbl,11.5,2,36,18));
  }
  window._inBadgeRelayout=true;return Plotly.relayout(mapEl,{annotations:anns}).finally(()=>{setTimeout(()=>{window._inBadgeRelayout=false;},350);});
}

function render(){
  if(!window._welcomeDismissed && !window._isExportMode){
    const ov = document.getElementById('welcomeOverlay');
    if(ov){ ov.style.display = 'flex'; return; }
  }
  if(!GEO||!DATA)return;
  const mode=document.getElementById("selMode").value;if(mode==="bench"&&typeof renderBenchmark==="function"){renderBenchmark();return;}if(mode==="passport"&&typeof renderPassport==="function"){renderPassport();return;}const base=document.getElementById("selBase").value,yr=document.getElementById("selYear").value,mId=document.getElementById("selMetric").value,fo=document.getElementById("selFO").value,reg=document.getElementById("selReg").value,scMode=document.getElementById("selScale").value;
  const mMeta=DATA.metrics.find(x=>x.id===mId)||DATA.metrics.at(0),box=document.getElementById("sheetBox");
  const allFeats=GEO.features.filter(f=>(fo==="RF"||f.properties.fo===fo)&&(reg==="ALL"||f.properties.region===reg));
  const isNW=(fo.includes("Северо-Запад")||fo==="СЗФО"),isArk=reg.includes("Архангельск"),isKras=reg.includes("Красноярск"),isSFO=(fo==="Сибирский"&&reg==="ALL");const hasLeftInset=isKras||isSFO;
  const hasInsets=(isArk||(isNW&&reg==="ALL")),hasKal=(isNW&&reg==="ALL");
  const hasRightCol=hasInsets||(reg!=="ALL");
  const isKrasNorth=f=>/таймыр|эвенкий|норильск|турухан|енисейск|лесосибирск|мотыгин|богучан|кежемск/i.test(String(f.properties._lbl||""));
  const mainFeats=hasLeftInset?allFeats:(hasInsets?allFeats.filter(f=>!f.properties._inset&&(!hasKal||!f.properties.region.includes("Калининград"))):allFeats);
  const nzFeats=hasInsets?allFeats.filter(f=>f.properties._inset==="NZ"):Array.of();
  const zfiFeats=hasInsets?allFeats.filter(f=>f.properties._inset==="ZFI"):Array.of();
  const kalFeats=hasKal?allFeats.filter(f=>f.properties.region.includes("Калининград")):Array.of();
  const terrTitle=reg!=="ALL"?reg:(fo!=="RF"?fo+" федеральный округ":"Российская Федерация");
  const yrs=Array.of("2019","2020","2021","2022","2023","2024"),actCol=PALETTES[currentPal]||PALETTES["RdYlGn"],CORE="#e6007e";
  if(mode==="table"){
    const FO_ORD=Array.of("Центральный","Северо-Западный","Южный","Северо-Кавказский","Приволжский","Уральский","Сибирский","Дальневосточный");
    const grpFO=(fo==="RF"&&Boolean(document.getElementById("chkGroupFO")?.checked));
    const uniq=Array.from(allFeats.filter(f=>f.properties._map_status==="В_выборке"&&f.properties.coh&&!f.properties._inset).reduce((m,f)=>m.set(f.properties.join_key,f),new Map()).values());
    const cmpMO=(a,b)=>(Number(Boolean(b.properties.is_center))-Number(Boolean(a.properties.is_center)))||a.properties._lbl.localeCompare(b.properties._lbl,"ru");
    const rows=uniq.slice().sort((a,b)=>{
      if(grpFO){const ia=FO_ORD.indexOf(a.properties.fo),ib=FO_ORD.indexOf(b.properties.fo);if(ia!==ib)return(ia===-1?99:ia)-(ib===-1?99:ib);}
      return a.properties.region.localeCompare(b.properties.region,"ru")||cmpMO(a,b);
    });
    const refF=(scMode==="global")?GEO.features:allFeats,allV=Array.of();
    yrs.forEach(y=>{const ym=DATA.panel[mId]?.[y]||{};refF.filter(f=>f.properties._map_status==="В_выборке"&&f.properties.coh).forEach(f=>{const v=Number(ym[f.properties.join_key]);if(!isNaN(v))allV.push(v);});});
    const scObj=Object.assign(computeScale(allV,actCol,mMeta.inv),{dec:mMeta.dec}),wrap=document.createElement("div");wrap.className="tbl-wrap";
    const hdr=document.createElement("div");hdr.className="sticky-hdr";hdr.textContent=mMeta.title+" (2019–2024 гг.)";
    const tbl=document.createElement("table");tbl.className="dyn-tbl";
    const cg=document.createElement("colgroup");Array.of("210px","270px","115px","115px","115px","115px","115px","115px").forEach(w=>{const c=document.createElement("col");c.style.width=w;cg.appendChild(c);});tbl.appendChild(cg);
    const thead=tbl.createTHead(),thR=thead.insertRow();Array.of("Регион","Муниципальное образование","2019 г.","2020 г.","2021 г.","2022 г.","2023 г.","2024 г.").forEach(t=>{const th=document.createElement("th");th.textContent=t;thR.appendChild(th);});
    const tbody=tbl.createTBody(),presCats=new Set();let curFO=null;
    rows.forEach(f=>{
      if(grpFO&&f.properties.fo!==curFO){curFO=f.properties.fo;const gr=tbody.insertRow(),gc=gr.insertCell();gc.colSpan=8;gc.style.background="#dbeafe";gc.style.fontWeight="bold";gc.style.textAlign="left";gc.style.padding="6px 10px";gc.textContent=curFO+" федеральный округ";}
      const tr=tbody.insertRow(),id=f.properties.join_key;const c0=tr.insertCell();c0.textContent=f.properties.region;const c1=tr.insertCell();c1.className="mo-name";c1.innerHTML=f.properties.is_center?("<b>"+f.properties._lbl+"</b>"):f.properties._lbl;
      yrs.forEach(y=>{const td=tr.insertCell(),v=DATA.panel[mId]?.[y]?.[id],cc=DATA.panel_cats?.[y]?.[id]||"5";presCats.add(cc);td.innerHTML='<div style="display:inline-flex;align-items:center;justify-content:center;gap:8px;width:88px;"><span style="display:inline-flex;width:22px;justify-content:center;flex-shrink:0;">'+markerSvg(cc,scObj.getHex(v),19)+'</span><span style="display:inline-block;width:56px;text-align:right;font-size:13px;font-weight:bold;font-variant-numeric:tabular-nums;">'+fmtNum(v,mMeta.dec)+'</span></div>';});
    });
    const sHex=actCol.at(Math.floor(actCol.length*0.75)),legIt=Array.of();
    Object.keys(CAT_META).forEach(k=>{if(presCats.has(k))legIt.push({col:sHex,kind:"box",icon:markerSvg(k,sHex,18),txt:CAT_META[k].lbl});});
    box.style.display="flex";box.style.flexDirection="column";box.style.overflow="hidden";wrap.append(hdr,tbl);box.innerHTML="";box.append(wrap,buildFooterHtml(false,scObj,legIt));return;
  }
  box.innerHTML="";box.appendChild(buildHeaderHtml(mMeta.title,mode==="grid"?"2019–2024 гг.":yr+" г.",terrTitle));
  const mapEl=document.createElement("div");mapEl.id="mapDiv";box.appendChild(mapEl);
  const projObj=makeProj(fo,reg);
  if(mode==="grid"){
    const subGeo={type:"FeatureCollection",features:mainFeats},refF=(scMode==="global")?GEO.features:allFeats,allV=Array.of();
    yrs.forEach(y=>{const ym=DATA.panel[mId]?.[y]||{};refF.filter(f=>f.properties._map_status==="В_выборке"&&f.properties.coh).forEach(f=>{const v=Number(ym[f.properties.join_key]);if(!isNaN(v))allV.push(v);});});
    const scObj=Object.assign(computeScale(allV,actCol,mMeta.inv),{dec:mMeta.dec}),traces=Array.of(),layout={margin:{l:0,r:0,t:10,b:0},height:Math.max(420,mapEl.clientHeight||640),annotations:Array.of()},presCats=new Set();
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
    
    box.appendChild(buildFooterHtml(false,scObj,legIt));return;
  }
  const valMap=(base==="all"&&yr==="2024")?(DATA.v2024[mId]||{}):(DATA.panel[mId]?.[yr]||{}),traces=Array.of(),legIt=Array.of();
  const refF=(scMode==="global")?GEO.features:allFeats,allV=refF.filter(f=>f.properties._map_status==="В_выборке"&&(base==="all"||f.properties.coh)).map(f=>Number(valMap[f.properties.join_key])).filter(v=>!isNaN(v));
  const scObj=((mMeta.cat||mMeta.is_cat)||mMeta.is_cat)?null:Object.assign(computeScale(allV,actCol,mMeta.inv),{dec:mMeta.dec});
  const addGeoLayers=(fList,gKey,maskFn=null)=>{
    if(maskFn){
      const mF=fList.filter(maskFn);
      if(mF.length>0)traces.push({type:"choropleth",geo:gKey,geojson:{type:"FeatureCollection",features:mF},featureidkey:"properties.join_key",locations:mF.map(f=>f.properties.join_key),z:mF.map(()=>0),text:mF.map(f=>f.properties._lbl),hoverinfo:"text",colorscale:Array.of(Array.of(0,"#f3f4f6"),Array.of(1,"#f3f4f6")),showscale:false,marker:{line:{color:"rgba(0,0,0,0)",width:0}}});
      fList=fList.filter(f=>!maskFn(f));
    }
    const subG={type:"FeatureCollection",features:fList};
    const allIn=fList.filter(f=>f.properties._map_status==="В_выборке"),zatoF=fList.filter(f=>f.properties._map_status==="ЗАТО"),outF=fList.filter(f=>f.properties._map_status!=="В_выборке"&&f.properties._map_status!=="ЗАТО");
    const isCatM=Boolean(mMeta.cat||mMeta.is_cat);
    const inF=allIn.filter(f=>{const v=valMap[f.properties.join_key];return v!==null&&v!==undefined&&v!==""&&(isCatM||!isNaN(Number(v)));});
    const noDataF=allIn.filter(f=>{const v=valMap[f.properties.join_key];return v===null||v===undefined||v===""||(!isCatM&&isNaN(Number(v)));});
    if(mMeta.cat||mMeta.is_cat){
      const clPairs=Object.entries(DATA.cluster_colors),nCl=Math.max(1,clPairs.length-1);
      const clScale=clPairs.map((p,i)=>Array.of(i/nCl,p.at(1)));
      const getLtr=s=>{const m=String(s||"").match(/(?:^|[^А-Яа-яЁё])([А-Ж])(?:[^А-Яа-яЁё]|$)/);return m?m.at(1):String(s||"").trim().charAt(0);};
      const idxOf=v=>clPairs.findIndex(p=>getLtr(p.at(0))===getLtr(v));
      const cF=allIn.filter(f=>idxOf(valMap[f.properties.join_key])!==-1);
      if(cF.length>0)traces.push({type:"choropleth",geo:gKey,geojson:subG,featureidkey:"properties.join_key",locations:cF.map(f=>f.properties.join_key),z:cF.map(f=>idxOf(valMap[f.properties.join_key])),zmin:0,zmax:nCl,zauto:false,text:cF.map(f=>f.properties._lbl+" ("+f.properties.region+"): "+valMap[f.properties.join_key]),hoverinfo:"text",autocolorscale:false,colorscale:clScale,showscale:false,marker:{line:{color:"#334155",width:0.65}}});
    }else if(inF.length>0){
      traces.push({type:"choropleth",geo:gKey,geojson:subG,featureidkey:"properties.join_key",locations:inF.map(f=>f.properties.join_key),z:inF.map(f=>{const v=Number(valMap[f.properties.join_key]);return scObj.vmax<=scObj.vmin?0.5:Math.pow(Math.max(0,Math.min(1,(v-scObj.vmin)/(scObj.vmax-scObj.vmin))),scObj.gamma);}),zmin:0,zmax:1,zauto:false,text:inF.map(f=>{const v=valMap[f.properties.join_key];return f.properties._lbl+" ("+f.properties.region+"): "+fmtNum(v,mMeta.dec);}),hoverinfo:"text",autocolorscale:false,colorscale:scObj.plScale,showscale:false,marker:{line:{color:"#334155",width:0.65}}});
    }
    if(noDataF.length>0)traces.push({type:"choropleth",geo:gKey,geojson:subG,featureidkey:"properties.join_key",locations:noDataF.map(f=>f.properties.join_key),z:noDataF.map(()=>0),text:noDataF.map(f=>f.properties._lbl+" ("+f.properties.region+") — Нет данных"),hoverinfo:"text",colorscale:Array.of(Array.of(0,"#ffffff"),Array.of(1,"#ffffff")),showscale:false,marker:{line:{color:"#64748b",width:0.65}}});
    if(zatoF.length>0){const zLon=Array.of(),zLat=Array.of(),addRing=r=>{r.forEach(pt=>{zLon.push(pt.at(0));zLat.push(pt.at(1));});zLon.push(null);zLat.push(null);};zatoF.forEach(f=>{const g=f.geometry;if(!g)return;if(g.type==="Polygon")g.coordinates.forEach(addRing);else if(g.type==="MultiPolygon")g.coordinates.forEach(p=>p.forEach(addRing));});traces.push({type:"scattergeo",geo:gKey,mode:"lines",lon:zLon,lat:zLat,fill:"toself",fillcolor:"rgba(203,213,225,0.987)",line:{color:"#475569",width:0.8},hoverinfo:"skip",showlegend:false});}
    if(outF.length>0)traces.push({type:"choropleth",geo:gKey,geojson:subG,featureidkey:"properties.join_key",locations:outF.map(f=>f.properties.join_key),z:outF.map(()=>0),text:outF.map(f=>f.properties._lbl+" ("+f.properties.region+") — Вне выборки"),hoverinfo:"text",colorscale:Array.of(Array.of(0,"#f0f0f0"),Array.of(1,"#f0f0f0")),showscale:false,marker:{line:{color:"#64748b",width:0.65}}});
  };

  addGeoLayers(mainFeats,"geo",hasLeftInset?isKrasNorth:null);if(zfiFeats.length>0)addGeoLayers(zfiFeats,"geo2");if(nzFeats.length>0)addGeoLayers(nzFeats,"geo3");
  if(hasLeftInset&&allFeats.length>0){addGeoLayers(allFeats,"geo2",f=>!isKrasNorth(f));}
  if(kalFeats.length>0){addGeoLayers(kalFeats,"geo4");const kCore=kalFeats.filter(f=>f.properties.is_center&&f.properties._map_status==="В_выборке");if(kCore.length>0)traces.push({type:"scattergeo",geo:"geo4",mode:"markers",lon:kCore.map(f=>f.properties._cent.lon),lat:kCore.map(f=>f.properties._cent.lat),hovertext:kCore.map(f=>"<b>Ядро региона:</b> "+f.properties._lbl),hoverinfo:"text",showlegend:false,marker:{size:8,color:CORE,line:{color:"#ffffff",width:1.1}}});}
  if(reg==="ALL"&&REGS){const rList=REGS.features.filter(f=>(fo==="RF"||f.properties.fo===fo)&&(!hasKal||!f.properties.region.includes("Калининград"))&&(!isSFO||!f.properties.region.includes("Красноярск")));traces.push({type:"choropleth",geo:"geo",geojson:{type:"FeatureCollection",features:rList},featureidkey:"properties.region",locations:rList.map(f=>f.properties.region),z:rList.map(()=>1),colorscale:Array.of(Array.of(0,"rgba(0,0,0,0)"),Array.of(1,"rgba(0,0,0,0)")),showscale:false,hoverinfo:"skip",marker:{line:{color:"#1e293b",width:1.4}}});}
  if(((mMeta.cat||mMeta.is_cat)||mMeta.is_cat)){Object.entries(DATA.cluster_colors).forEach(p=>{const cn=p.at(0),ch=p.at(1);if(allFeats.some(f=>valMap[f.properties.join_key]===cn)||fo==="RF")legIt.push({col:ch,kind:"box",icon:'<span style="display:inline-block;width:18px;height:13px;background:'+ch+';border:1px solid #555;"></span>',txt:cn});});}
  const coreF=mainFeats.filter(f=>f.properties.is_center&&f.properties._map_status==="В_выборке");const kalCoreF=kalFeats.filter(f=>f.properties.is_center&&f.properties._map_status==="В_выборке");
  if(coreF.length>0){
    if(reg==="ALL"){traces.push({type:"scattergeo",geo:"geo",mode:"markers+text",lon:coreF.map(f=>f.properties._cent.lon),lat:coreF.map(f=>f.properties._cent.lat),text:coreF.map(f=>f.properties._lbl),textfont:{size:1,color:"rgba(0,0,0,0)"},hovertext:coreF.map(f=>"<b>Ядро региона:</b> "+f.properties._lbl+" ("+f.properties.region+")"),hoverinfo:"text",showlegend:false,marker:{size:fo==="RF"?6:9,color:CORE,line:{color:"#ffffff",width:1.1}}});legIt.push({col:CORE,kind:"dot",icon:'<span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:'+CORE+';border:1.5px solid #fff;box-shadow:0 0 0 1px #666;"></span>',txt:"Ядро региона (макс. население)"});}
    else{traces.push({type:"choropleth",geo:"geo",geojson:{type:"FeatureCollection",features:mainFeats},featureidkey:"properties.join_key",locations:coreF.map(f=>f.properties.join_key),z:coreF.map(()=>1),colorscale:Array.of(Array.of(0,"rgba(0,0,0,0)"),Array.of(1,"rgba(0,0,0,0)")),showscale:false,hoverinfo:"skip",marker:{line:{color:CORE,width:3.5}}});legIt.push({col:CORE,kind:"line",icon:'<span style="display:inline-block;width:18px;height:3px;background:'+CORE+';"></span>',txt:"Ядро региона (макс. население)"});}
  }
  if(allFeats.some(f=>f.properties._map_status==="ЗАТО"))legIt.push({col:"#cbd5e1",kind:"hatch",icon:'<span style="display:inline-block;width:18px;height:13px;background:repeating-linear-gradient(-45deg,#e2e8f0,#e2e8f0 5px,#475569 5px,#475569 7.5px);border:1px solid #475569;"></span>',txt:"ЗАТО"});
  if(allFeats.some(f=>f.properties._map_status!=="В_выборке"&&f.properties._map_status!=="ЗАТО"))legIt.push({col:"#f0f0f0",kind:"box",icon:'<span style="display:inline-block;width:18px;height:13px;background:#f0f0f0;border:1px solid #9aa2ae;"></span>',txt:"Вне выборки"});

  const zoomFeats=hasLeftInset?mainFeats.filter(f=>!isKrasNorth(f)):mainFeats;
  const layout={geo:wideGeoCfg(zoomFeats,projObj,Array.of(hasLeftInset?0.23:0.005,hasRightCol?0.765:0.995),Array.of(hasLeftInset?0.005:0.02,hasLeftInset?0.985:0.95)),annotations:Array.of(),showlegend:false,margin:{l:0,r:0,t:0,b:0},height:Math.max(420,mapEl.clientHeight||640)};
  const shrinkTop=hasKal||isArk;const yZFI=shrinkTop?Array.of(0.72,0.98):Array.of(0.56,0.98),yNZ=shrinkTop?Array.of(0.39,0.65):Array.of(0.07,0.49);
  if(hasLeftInset&&allFeats.length>0){layout.geo2=wideGeoCfg(allFeats,{type:"mercator"},Array.of(0.005,0.215),Array.of(0.03,0.78));layout.annotations.push({text:"<b></b>",x:0.11,y:0.055,yanchor:"top",xref:"paper",yref:"paper",showarrow:false,font:{family:"Times New Roman",size:12}});}
  if(zfiFeats.length>0){layout.geo2=wideGeoCfg(zfiFeats,{type:"mercator"},Array.of(0.785,0.995),yZFI);layout.annotations.push({text:"<b>архипелаг Земля Франца-Иосифа</b>",x:0.89,xanchor:"center",y:yZFI.at(0)-0.012,yanchor:"top",xref:"paper",yref:"paper",showarrow:false,font:{family:"Times New Roman",size:12}});}
  if(nzFeats.length>0){layout.geo3=wideGeoCfg(nzFeats,{type:"mercator"},Array.of(0.785,0.995),yNZ);layout.annotations.push({text:"<b>архипелаг Новая Земля</b>",x:0.89,xanchor:"center",y:yNZ.at(0)-0.012,yanchor:"top",xref:"paper",yref:"paper",showarrow:false,font:{family:"Times New Roman",size:12}});}
  if(kalFeats.length>0){layout.geo4=wideGeoCfg(kalFeats,{type:"mercator"},Array.of(0.785,0.995),Array.of(0.06,0.32));layout.annotations.push({text:"<b>Калининградская область</b>",x:0.89,xanchor:"center",y:0.048,yanchor:"top",xref:"paper",yref:"paper",showarrow:false,font:{family:"Times New Roman",size:12}});}
  window._plotReady=Plotly.newPlot(mapEl,traces,layout,{responsive:true,displaylogo:false,modeBarButtonsToRemove:Array.of("toImage")}).then(()=>{applyZatoHatch(mapEl);if((coreF.length>0||kalCoreF.length>0)&&(reg!=="ALL"||fo!=="RF"))return addCoreBadges(mapEl,reg!=="ALL",kalCoreF);});
  mapEl.on("plotly_relayout",ev=>{if(window._inBadgeRelayout||(ev&&ev.annotations))return;applyZatoHatch(mapEl);if((coreF.length>0||kalCoreF.length>0)&&(reg!=="ALL"||fo!=="RF"))addCoreBadges(mapEl,reg!=="ALL",kalCoreF);});

  if(reg!=="ALL"&&mode==="single"){
    const regList=Array.from(allFeats.filter(f=>f.properties._map_status==="В_выборке"&&!f.properties._inset).reduce((m,f)=>{if(!m.has(f.properties.join_key))m.set(f.properties.join_key,f);return m;},new Map()).values()).sort((a,b)=>(Number(Boolean(b.properties.is_center))-Number(Boolean(a.properties.is_center)))||a.properties._lbl.localeCompare(b.properties._lbl,"ru"));
    if(regList.length>0){
      const stage=document.createElement("div");stage.className="map-stage";mapEl.parentNode.insertBefore(stage,mapEl);stage.appendChild(mapEl);
      const pnl=document.createElement("div");pnl.className="mo-side-panel"+(isArk?" ark":"");
      pnl.innerHTML='<div class="mo-side-hdr">Муниципальные образования:</div>';
      const actTrIdxs=traces.map((t,idx)=>(t.type==="choropleth"&&(t.geo==="geo"||t.geo==="geo2")&&t.colorscale&&t.colorscale.length>2)?idx:-1).filter(idx=>idx!==-1);
      regList.forEach((f,i)=>{
        const it=document.createElement("div");it.className="mo-side-item";it.textContent=(i+1)+". "+f.properties._lbl;if(f.properties.is_center)it.style.fontWeight="bold";
        it.onmouseenter=()=>{
          actTrIdxs.forEach(tIdx=>{
            const orig=mapEl.data.at(tIdx);
            if(!orig._origZ){orig._origZ=orig.z.slice();orig._origCs=orig.colorscale;}
            const csDim=Array.of(Array.of(0,"#e2e8f0"),Array.of(0.001,"#e2e8f0")).concat(orig._origCs.map(p=>Array.of(0.002+p.at(0)*0.998,p.at(1))));
            const nz=orig._origZ.map((v,k)=>orig.locations.at(k)===f.properties.join_key?(0.002+Number(v)*0.998):0);
            Plotly.restyle(mapEl,{z:Array.of(nz),colorscale:Array.of(csDim)},Array.of(tIdx));
          });
        };
        pnl.appendChild(it);
      });
      pnl.onmouseleave=()=>{
        actTrIdxs.forEach(tIdx=>{
          const orig=mapEl.data.at(tIdx);
          if(orig._origZ)Plotly.restyle(mapEl,{z:Array.of(orig._origZ),colorscale:Array.of(orig._origCs)},Array.of(tIdx));
        });
      };
      stage.appendChild(pnl);
    }
  }
  box.appendChild(buildFooterHtml(((mMeta.cat||mMeta.is_cat)||mMeta.is_cat),scObj,legIt));
}

function addSubBlockSeparators(){
  const s=document.getElementById("selMetric");if(!s||s.dataset.hasSeps==="1")return;
  const defs=Array.of(
    {id:"ЭК-01",lbl:"  ▸ 5.1. Экологический блок"},
    {id:"СЦ-01",lbl:"  ▸ 5.2. Социальный блок"},
    {id:"УЭ-01",lbl:"  ▸ 5.3. Управленческо-экономический блок"}
  );
  defs.forEach(d=>{
    const target=s.querySelector('option[value="'+d.id+'"]');
    if(target){
      const sep=document.createElement("option");sep.disabled=true;sep.dataset.isSep="1";
      sep.style.cssText="font-weight:bold;font-style:italic;color:#0369a1;background:#eef6fb;";
      sep.textContent=d.lbl;target.insertAdjacentElement("beforebegin",sep);
    }
  });
  s.dataset.hasSeps="1";
}
