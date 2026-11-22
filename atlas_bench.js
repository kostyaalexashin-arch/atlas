function cleanBenchGroup(gName){
  return String(gName||"").replace(/\s*\([^)]*\)\s*/g," ").replace(/\s+/g," ").trim();
}
function cleanBenchMetName(m){
  const t=String(m.title||"").trim(),id=String(m.id||"").trim();
  if(/^(ЭК|СЦ|УЭ)-\d+/.test(id))return id+" — "+t;
  return t;
}
const MONOPOLY_TOKENS=Array.of("🔵","🟥","🔺","💠","⭐","🟢","🟣","🔶","⬛","🩷");
const CAT_HOUSES=Array.of(
  {c:"1",ico:"🏙️",lbl:"Крупнейшие"},{c:"2",ico:"🏢",lbl:"Крупные"},
  {c:"3",ico:"🏬",lbl:"Большие"},{c:"4",ico:"🏘️",lbl:"Средние"},{c:"5",ico:"🏡",lbl:"Малые"}
);
let BENCH_STATE={mainKey:null,compKeys:Array.of(),tokens:{},inited:false,refreshFn:null};

function getBenchMOs(){
  const isCoh=(document.getElementById("bBase")?.value==="coh"),m=new Map();
  GEO.features.forEach(f=>{
    const p=f.properties;
    if(p._map_status==="В_выборке"&&!p._inset&&(!isCoh||p.coh)&&!m.has(p.join_key)){
      const c24=String(DATA.panel_cats?.["2024"]?.[p.join_key]||"5");
      m.set(p.join_key,{key:p.join_key,lbl:p._lbl,reg:p.region,fo:p.fo,cat:c24,coh:Boolean(p.coh),full:p._lbl+" ("+p.region+")"});
    }
  });
  return Array.from(m.values()).sort((a,b)=>a.full.localeCompare(b.full,"ru"));
}
function isDarkHex(hex){
  const h=String(hex||"#ffffff").replace("#","");if(h.length<6)return false;
  const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
  return(0.299*r+0.587*g+0.114*b)<135;
}
function assignRandomToken(jk){
  if(BENCH_STATE.tokens[jk])return;
  const used=new Set(Object.values(BENCH_STATE.tokens));
  const free=MONOPOLY_TOKENS.filter(t=>!used.has(t)),pool=free.length?free:MONOPOLY_TOKENS;
  BENCH_STATE.tokens[jk]=pool.at(Math.floor(Math.random()*pool.length));
}
function buildScaleGroups(selMOs,valMap,scObj,dec){
  const rawPts=selMOs.map(mo=>{
    const raw=Number(valMap[mo.key]);if(isNaN(raw))return null;
    const u=scObj.vmax<=scObj.vmin?0.5:Math.pow(Math.max(0,Math.min(1,(raw-scObj.vmin)/(scObj.vmax-scObj.vmin))),scObj.gamma);
    return{mo,raw,pct:4+u*92,txt:fmtNum(raw,dec)};
  }).filter(Boolean).sort((a,b)=>a.pct-b.pct);
  const grps=Array.of();
  rawPts.forEach(p=>{
    const last=grps.at(grps.length-1);
    if(last&&Math.abs(p.pct-last.pct)<1.4){
      last.items.push(p);last.pct=last.items.reduce((s,x)=>s+x.pct,0)/last.items.length;
      if(!last.vals.includes(p.txt))last.vals.push(p.txt);
    }else{grps.push({pct:p.pct,items:Array.of(p),vals:Array.of(p.txt),topTier:0,botTier:0});}
  });
  for(let i=1;i<grps.length;i++){
    for(let j=Math.max(0,i-3);j<i;j++){
      if(Math.abs(grps.at(i).pct-grps.at(j).pct)<7.5&&grps.at(i).topTier===grps.at(j).topTier)grps.at(i).topTier=(grps.at(j).topTier+1)%3;
      if(Math.abs(grps.at(i).pct-grps.at(j).pct)<11.5&&grps.at(i).botTier===grps.at(j).botTier)grps.at(i).botTier=(grps.at(j).botTier+1)%2;
    }
  }
  return grps;
}
function syncBenchBase(){
  const bBase=document.getElementById("bBase"),bYear=document.getElementById("bYear"),pB=document.getElementById("prevBYear"),nB=document.getElementById("nextBYear");
  if(!bBase||!bYear)return;
  const dis=(bBase.value==="all");
  if(dis)bYear.value="2024";
  bYear.disabled=dis;if(pB)pB.disabled=dis;if(nB)nB.disabled=dis;
}
const CAT_NAMES={"1":"Крупнейшие (> 1 млн)","2":"Крупные (250 тыс. – 1 млн)","3":"Большие (100 – 250 тыс.)","4":"Средние (50 – 100 тыс.)","5":"Малые (≤ 50 тыс.)"};
function initBenchControls(){
  if(BENCH_STATE.inited||!GEO||!DATA)return;
  BENCH_STATE.inited=true;
  const cIn=document.getElementById("bCatIn"),fIn=document.getElementById("bFOIn"),rIn=document.getElementById("bRegIn"),mIn=document.getElementById("bMOIn"),rst=document.getElementById("bRstAll");
  const fillDL=(id,arr,curV="")=>{const dl=document.getElementById(id);dl.innerHTML="";if(curV&&arr.length===1&&arr.at(0).toLowerCase()===curV.trim().toLowerCase())return;arr.forEach(v=>{const o=document.createElement("option");o.value=v;dl.appendChild(o);});};
  const syncAll=()=>{
    const avail=getBenchMOs(),chosen=new Set(Array.of(BENCH_STATE.mainKey).concat(BENCH_STATE.compKeys).filter(Boolean));
    const free=avail.filter(m=>!chosen.has(m.key));
    const selCat=Object.entries(CAT_NAMES).find(p=>p.at(1).toLowerCase()===cIn.value.trim().toLowerCase())?.at(0)||"ALL";
    const selFO=fIn.value.trim()||"ALL",selReg=rIn.value.trim()||"ALL";
    const fCat=free.filter(m=>(selFO==="ALL"||m.fo===selFO)&&(selReg==="ALL"||m.reg===selReg));
    fillDL("dlCat",Array.from(new Set(fCat.map(m=>CAT_NAMES[m.cat]))).filter(Boolean),cIn.value);
    const fFO=free.filter(m=>(selCat==="ALL"||m.cat===selCat)&&(selReg==="ALL"||m.reg===selReg));
    fillDL("dlFO",Array.from(new Set(fFO.map(m=>m.fo))).sort((a,b)=>a.localeCompare(b,"ru")),fIn.value);
    const fReg=free.filter(m=>(selCat==="ALL"||m.cat===selCat)&&(selFO==="ALL"||m.fo===selFO));
    fillDL("dlReg",Array.from(new Set(fReg.map(m=>m.reg))).sort((a,b)=>a.localeCompare(b,"ru")),rIn.value);
    const fMO=free.filter(m=>(selCat==="ALL"||m.cat===selCat)&&(selFO==="ALL"||m.fo===selFO)&&(selReg==="ALL"||m.reg===selReg));
    fillDL("dlMO",fMO.map(m=>m.full));
    const atMax=chosen.size>=5;
    Array.of(cIn,fIn,rIn,mIn).forEach(el=>el.disabled=atMax);
    const lm=document.getElementById("bLimitMsg");if(lm)lm.style.visibility=atMax?"visible":"hidden";
    renderBenchChips();
  };
  BENCH_STATE.refreshFn=syncAll;
  const clearInputs=()=>{cIn.value="";fIn.value="";rIn.value="";mIn.value="";cIn.blur();fIn.blur();rIn.blur();mIn.blur();syncAll();};
  Array.of(cIn,fIn,rIn).forEach(el=>{el.oninput=syncAll;el.onchange=()=>{el.blur();syncAll();};});
  mIn.onchange=()=>{
    const avail=getBenchMOs(),hit=avail.find(m=>m.full.toLowerCase()===mIn.value.trim().toLowerCase());
    if(!hit)return;
    const allSel=Array.of(BENCH_STATE.mainKey).concat(BENCH_STATE.compKeys).filter(Boolean);
    if(allSel.includes(hit.key)||allSel.length>=5)return;
    assignRandomToken(hit.key);
    if(!BENCH_STATE.mainKey)BENCH_STATE.mainKey=hit.key;else BENCH_STATE.compKeys.push(hit.key);
    clearInputs();renderBenchmark();
  };
  rst.onclick=()=>{BENCH_STATE.mainKey=null;BENCH_STATE.compKeys=Array.of();clearInputs();renderBenchmark();};
  document.getElementById("bBase").onchange=()=>{
    syncBenchBase();const validSet=new Set(getBenchMOs().map(m=>m.key));
    if(BENCH_STATE.mainKey&&!validSet.has(BENCH_STATE.mainKey))BENCH_STATE.mainKey=null;
    BENCH_STATE.compKeys=BENCH_STATE.compKeys.filter(k=>validSet.has(k));
    if(!BENCH_STATE.mainKey&&BENCH_STATE.compKeys.length>0)BENCH_STATE.mainKey=BENCH_STATE.compKeys.shift();
    syncAll();renderBenchmark();
  };
  const stepBY=dir=>{const yEl=document.getElementById("bYear");if(!yEl||yEl.disabled)return;yEl.selectedIndex=(yEl.selectedIndex+dir+yEl.options.length)%yEl.options.length;renderBenchmark();};
  document.getElementById("prevBYear").onclick=()=>stepBY(-1);
  document.getElementById("nextBYear").onclick=()=>stepBY(1);
  document.getElementById("btnBenchRun").onclick=renderBenchmark;document.getElementById("bYear").onchange=renderBenchmark;
  syncBenchBase();syncAll();
}
function renderBenchChips(){
  const box=document.getElementById("bChips"),avail=getBenchMOs(),allKeys=Array.of(BENCH_STATE.mainKey).concat(BENCH_STATE.compKeys).filter(Boolean);
  box.innerHTML="";
  allKeys.forEach(k=>{
    const m=avail.find(x=>x.key===k);if(!m)return;
    const d=document.createElement("div");d.className="bench-chip";
    d.innerHTML='<span>'+(BENCH_STATE.tokens[k]||"🎩")+' '+m.full+'</span><button type="button" title="Удалить">×</button>';
    d.querySelector("button").onclick=()=>{
      if(BENCH_STATE.mainKey===k)BENCH_STATE.mainKey=BENCH_STATE.compKeys.shift()||null;
      else BENCH_STATE.compKeys=BENCH_STATE.compKeys.filter(x=>x!==k);
      if(BENCH_STATE.refreshFn)BENCH_STATE.refreshFn();renderBenchmark();
    };
    box.appendChild(d);
  });
}

function renderBenchmark(){
  initBenchControls();syncBenchBase();
  const box=document.getElementById("sheetBox"),yr=document.getElementById("bYear").value,isCoh=(document.getElementById("bBase").value==="coh"),actCol=PALETTES[currentPal]||PALETTES["RdYlGn"];
  const availMOs=getBenchMOs(),selKeys=Array.of(BENCH_STATE.mainKey).concat(BENCH_STATE.compKeys).filter(Boolean),selMOs=selKeys.map(k=>availMOs.find(m=>m.key===k)).filter(Boolean);
  if(selMOs.length===0){box.innerHTML='<div class="bench-empty"><b>Режим бенчмаркинга муниципальных образований</b><br><br>Выберите до 5 МО для сравнения в панели слева ('+(isCoh?'Динамическая когорта — 193 МО':'Генеральный срез 2024 — 2269 МО')+').</div>';return;}
  const view=document.createElement("div");view.className="bench-view";
  const stickyTop=document.createElement("div");stickyTop.className="bench-sticky-top";
  const hdr=document.createElement("div");hdr.className="bench-hdr-grid";hdr.style.gridTemplateColumns="repeat("+Math.max(1,selMOs.length)+",1fr)";
  selMOs.forEach(m=>{
    const row=document.createElement("div");row.className="bench-mo-row";const sel=document.createElement("select");sel.className="b-tok-sel";
    MONOPOLY_TOKENS.forEach(tk=>{const op=new Option(tk,tk);if(tk===BENCH_STATE.tokens[m.key])op.selected=true;sel.add(op);});
    sel.onchange=()=>{BENCH_STATE.tokens[m.key]=sel.value;renderBenchChips();renderBenchmark();};
    const sp=document.createElement("span");sp.textContent=m.full;sp.title=m.full+" ("+yr+" г.)";row.append(sel,sp);hdr.appendChild(row);
  });
  stickyTop.appendChild(hdr);view.appendChild(stickyTop);
  const groups=Array.of();DATA.metrics.forEach(m=>{
    if((m.cat||m.is_cat)&&yr!=="2024")return;
    let g=groups.find(x=>x.name===m.group);if(!g){g={name:m.group,items:Array.of()};groups.push(g);}g.items.push(m);
  });
  const clEntries=Object.entries(DATA.cluster_colors||{});
  groups.forEach((g,gi)=>{
    if(gi===0){
      if(yr!=="2024"){const gh0=document.createElement("div");gh0.className="bench-blk-hdr";gh0.textContent="0. Категория МО";view.appendChild(gh0);}
      const crow=document.createElement("div");crow.className="bench-row";
      crow.innerHTML='<div class="bench-met-name">Категория МО по численности населения</div>';
      const cgrid=document.createElement("div");cgrid.className="bench-cat-cells";
      CAT_HOUSES.forEach(ch=>{
        const hits=selMOs.filter(mo=>String(DATA.panel_cats?.[yr]?.[mo.key]||mo.cat||"5")===ch.c);
        const cell=document.createElement("div");cell.className="bench-catcell";
        cell.innerHTML='<div class="bench-cat-ico">'+ch.ico+'</div><div>'+ch.lbl+'</div><div class="bench-ccell-toks">'+hits.map(mo=>'<span class="bench-ctok" title="'+mo.full+'">'+(BENCH_STATE.tokens[mo.key]||"🔵")+'</span>').join("")+'</div>';
        cgrid.appendChild(cell);
      });
      crow.appendChild(cgrid);view.appendChild(crow);
      const gh=document.createElement("div");gh.className="bench-blk-hdr";gh.textContent=cleanBenchGroup(g.name);view.appendChild(gh);
    }else{
      const gh=document.createElement("div");gh.className="bench-blk-hdr";gh.textContent=cleanBenchGroup(g.name);view.appendChild(gh);
    }
    g.items.forEach(m=>{
      const valMap=((m.cat||m.is_cat||!isCoh)&&yr==="2024")?(DATA.v2024[m.id]||{}):(DATA.panel[m.id]?.[yr]||{});
      const row=document.createElement("div");row.className="bench-row";const nm=document.createElement("div");nm.className="bench-met-name";nm.textContent=cleanBenchMetName(m);row.appendChild(nm);
      if(m.cat||m.is_cat){
        const grid=document.createElement("div");grid.className="bench-clust-cells";
        clEntries.forEach(pair=>{
          const cname=pair.at(0),chex=pair.at(1),cell=document.createElement("div");cell.className="bench-ccell";cell.style.background=chex;cell.style.color=isDarkHex(chex)?"#ffffff":"#111111";cell.title=cname;
          const letter=cname.split(" ").at(0).replace(/\.+$/,""),hits=selMOs.filter(mo=>valMap[mo.key]===cname);
          cell.innerHTML='<div>'+letter+'</div><div class="bench-ccell-toks">'+hits.map(mo=>'<span class="bench-ctok" title="'+mo.full+': '+cname+'">'+(BENCH_STATE.tokens[mo.key]||"🎩")+'</span>').join("")+'</div>';
          grid.appendChild(cell);
        });
        row.appendChild(grid);
      }else{
        const allV=availMOs.map(mo=>Number(valMap[mo.key])).filter(v=>!isNaN(v)),scObj=computeScale(allV,actCol,m.inv);
        const wrap=document.createElement("div");wrap.className="bench-scale-wrap";wrap.style.height="78px";const bar=document.createElement("div");bar.className="bench-bar";bar.style.background="linear-gradient(to right,"+scObj.pal.join(",")+")";
        buildScaleGroups(selMOs,valMap,scObj,m.dec).forEach(gp=>{
          const el=document.createElement("div");el.className="bench-grp";el.style.left=gp.pct+"%";
          el.style.top=(-24-gp.topTier*18)+"px";el.style.bottom=(-22-gp.botTier*15)+"px";
          const tip=gp.items.map(x=>x.mo.full+": "+x.txt).join(" | "),toksHtml=gp.items.map(x=>'<span title="'+x.mo.full+': '+x.txt+'">'+(BENCH_STATE.tokens[x.mo.key]||"🎩")+'</span>').join("");
          el.innerHTML='<div class="bench-toks-row" title="'+tip+'">'+toksHtml+'</div><div class="bench-stem"></div><div class="bench-vals-row">'+gp.vals.join(" / ")+'</div>';
          bar.appendChild(el);
        });
        wrap.appendChild(bar);row.appendChild(wrap);
      }
      view.appendChild(row);
    });
  });
  box.innerHTML="";box.appendChild(view);
}

function wrapBenchTitle(ctx,txt,maxW){
  const words=txt.split(" "),lines=Array.of();let cur="";
  words.forEach(w=>{const test=cur?cur+" "+w:w;if(ctx.measureText(test).width<=maxW)cur=test;else{if(cur)lines.push(cur);cur=w;}});
  if(cur)lines.push(cur);return lines.slice(0,2);
}
function buildBenchCanvases(){
  const yr=document.getElementById("bYear").value,isCoh=(document.getElementById("bBase").value==="coh"),actCol=PALETTES[currentPal]||PALETTES["RdYlGn"];
  const availMOs=getBenchMOs(),selKeys=Array.of(BENCH_STATE.mainKey).concat(BENCH_STATE.compKeys).filter(Boolean),selMOs=selKeys.map(k=>availMOs.find(m=>m.key===k)).filter(Boolean);
  if(selMOs.length===0){alert("Выберите хотя бы одно МО для сравнения.");return Array.of();}
  const groups=Array.of();DATA.metrics.forEach(m=>{if((m.cat||m.is_cat)&&yr!=="2024")return;let g=groups.find(x=>x.name===m.group);if(!g){g={name:m.group,items:Array.of()};groups.push(g);}g.items.push(m);});
  const rows=Array.of();
  groups.forEach((g,gi)=>{
    if(gi===0){if(yr!=="2024")rows.push({kind:"blk",txt:"0. Категория МО"});rows.push({kind:"cat"});}
    rows.push({kind:"blk",txt:cleanBenchGroup(g.name)});
    g.items.forEach(m=>rows.push({kind:"met",m}));
  });
  const splitIdx=Math.ceil(rows.length/2),pagesRows=Array.of(rows.slice(0,splitIdx),rows.slice(splitIdx));
  const W=2234,H=3160,sc=Number(document.getElementById("selDpi")?.value||1),clEntries=Object.entries(DATA.cluster_colors||{});
  const out=Array.of();
  pagesRows.forEach((sub,pgIdx)=>{
    const canvas=document.createElement("canvas");canvas.width=W;canvas.height=H;const ctx=canvas.getContext("2d");
    ctx.fillStyle="#ffffff";ctx.fillRect(0,0,W,H);ctx.fillStyle="#111111";ctx.textAlign="center";ctx.font="bold 36px 'Times New Roman'";
    ctx.fillText("Бенчмаркинг муниципальных образований ("+yr+" г.) — Лист "+(pgIdx+1)+" из 2",W/2,58);ctx.textAlign="left";
    const colsH=Math.max(1,selMOs.length),colWH=Math.floor((W-100)/colsH),hdrY=82;
    ctx.strokeStyle="#cbd5e1";ctx.lineWidth=1.5;ctx.strokeRect(50,hdrY,W-100,64);
    selMOs.forEach((m,idx)=>{const x=62+idx*colWH,y=hdrY+42;ctx.font="26px 'Times New Roman'";ctx.fillText(BENCH_STATE.tokens[m.key]||"🎩",x,y);ctx.font="bold 20px 'Times New Roman'";const lbl=m.full;ctx.fillText(lbl.length>32?lbl.slice(0,31)+"…":lbl,x+36,y);});
    const topY=170,botY=3110,step=Math.min(86,Math.floor((botY-topY)/Math.max(1,sub.length)));
    sub.forEach((it,ri)=>{
      const y=topY+ri*step;
      if(it.kind==="blk"){ctx.fillStyle="#e2e8f0";ctx.fillRect(50,y+4,W-100,step-10);ctx.fillStyle="#111111";ctx.font="bold 23px 'Times New Roman'";ctx.fillText(it.txt,64,y+step-14);return;}
      ctx.strokeStyle="#e2e8f0";ctx.beginPath();ctx.moveTo(50,y+step);ctx.lineTo(W-50,y+step);ctx.stroke();
      const sx=1040,sw=W-1090;
      if(it.kind==="cat"){
        ctx.fillStyle="#111111";ctx.font="20px 'Times New Roman'";ctx.fillText("Категория МО по численности населения",56,y+step/2+6);
        const cw=Math.floor(sw/5),ch=Math.min(64,step-10),cy=y+(step-ch)/2;
        CAT_HOUSES.forEach((chObj,ci)=>{
          const cx=sx+ci*cw;ctx.fillStyle="#f8fafc";ctx.fillRect(cx,cy,cw-4,ch);ctx.strokeStyle="#64748b";ctx.strokeRect(cx,cy,cw-4,ch);
          ctx.textAlign="center";ctx.font="20px 'Times New Roman'";ctx.fillText(chObj.ico,cx+(cw-4)/2,cy+22);
          ctx.fillStyle="#111111";ctx.font="bold 14px 'Times New Roman'";ctx.fillText(chObj.lbl,cx+(cw-4)/2,cy+38);
          const hits=selMOs.filter(mo=>String(DATA.panel_cats?.[yr]?.[mo.key]||mo.cat||"5")===chObj.c);
          if(hits.length){const rC=11,gC=24,bx0=cx+(cw-4)/2-(hits.length-1)*gC/2,byC=cy+ch-13;hits.forEach((mo,hi)=>{const bx=bx0+hi*gC;ctx.fillStyle="#ffffff";ctx.beginPath();ctx.arc(bx,byC,rC,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#1e293b";ctx.stroke();ctx.fillStyle="#111111";ctx.font="15px 'Times New Roman'";ctx.fillText(BENCH_STATE.tokens[mo.key]||"🎩",bx,byC+5);});}
          ctx.textAlign="left";
        });
        return;
      }
      const m=it.m,valMap=(!isCoh&&yr==="2024")?(DATA.v2024[m.id]||{}):(DATA.panel[m.id]?.[yr]||{});
      ctx.fillStyle="#111111";ctx.font="19.5px 'Times New Roman'";const tLines=wrapBenchTitle(ctx,cleanBenchMetName(m),960),lH=22,stY=y+(step-(tLines.length-1)*lH)/2+6;
      tLines.forEach((ln,li)=>ctx.fillText(ln,56,stY+li*lH));
      if(m.cat||m.is_cat){
        const cw=Math.floor(sw/7),ch=Math.min(62,step-10),cy=y+(step-ch)/2;
        clEntries.forEach((pair,ci)=>{
          const cname=pair.at(0),chex=pair.at(1),cx=sx+ci*cw;ctx.fillStyle=chex;ctx.fillRect(cx,cy,cw-4,ch);ctx.strokeStyle="#475569";ctx.strokeRect(cx,cy,cw-4,ch);
          ctx.fillStyle=isDarkHex(chex)?"#ffffff":"#111111";ctx.font="bold 17px 'Times New Roman'";ctx.textAlign="center";
          const ltr=cname.split(" ").at(0).replace(/\.+$/,""),hits=selMOs.filter(mo=>valMap[mo.key]===cname);
          ctx.fillText(ltr,cx+(cw-4)/2,cy+19);
          if(hits.length){const rC=12,gC=26,bx0=cx+(cw-4)/2-(hits.length-1)*gC/2,byC=cy+ch-15;hits.forEach((mo,hi)=>{const bx=bx0+hi*gC;ctx.fillStyle="#ffffff";ctx.beginPath();ctx.arc(bx,byC,rC,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#1e293b";ctx.stroke();ctx.fillStyle="#111111";ctx.font="16px 'Times New Roman'";ctx.fillText(BENCH_STATE.tokens[mo.key]||"🎩",bx,byC+5);});}
          ctx.textAlign="left";
        });
      }else{
        const allV=availMOs.map(mo=>Number(valMap[mo.key])).filter(v=>!isNaN(v)),scObj=computeScale(allV,actCol,m.inv);
        const by=y+step/2-6,bh=13,grd=ctx.createLinearGradient(sx,0,sx+sw,0);scObj.pal.forEach((c,i)=>grd.addColorStop(i/(scObj.pal.length-1),c));
        ctx.fillStyle=grd;ctx.fillRect(sx,by,sw,bh);ctx.strokeStyle="#475569";ctx.strokeRect(sx,by,sw,bh);
        buildScaleGroups(selMOs,valMap,scObj,m.dec).forEach(gp=>{
          const px=sx+sw*(gp.pct/100),topYPin=by-24-gp.topTier*21,botYPin=by+bh+16+gp.botTier*17;
          ctx.strokeStyle="#1e293b";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(px,topYPin+18);ctx.lineTo(px,botYPin-12);ctx.stroke();
          const tStr=gp.items.map(x=>BENCH_STATE.tokens[x.mo.key]||"🎩").join("");ctx.font="18px 'Times New Roman'";const tw=ctx.measureText(tStr).width+10;
          ctx.fillStyle="#ffffff";ctx.fillRect(px-tw/2,topYPin,tw,20);ctx.strokeStyle="#1e293b";ctx.strokeRect(px-tw/2,topYPin,tw,20);
          ctx.fillStyle="#111111";ctx.textAlign="center";ctx.fillText(tStr,px,topYPin+16);ctx.font="bold 15px 'Times New Roman'";
          ctx.fillText(gp.vals.join(" / "),px,botYPin);ctx.textAlign="left";
        });
      }
    });
    if(sc<0.99){const c2=document.createElement("canvas");c2.width=Math.round(W*sc);c2.height=Math.round(H*sc);const x2=c2.getContext("2d");x2.imageSmoothingEnabled=true;x2.imageSmoothingQuality="high";x2.drawImage(canvas,0,0,c2.width,c2.height);out.push(c2);}
    else out.push(canvas);
  });
  return out;
}
