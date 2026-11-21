const MONOPOLY_TOKENS=Array.of("🎩","🚗","🐕","🚢","👢","🐈","🦆","🦖","🐧","🎲");
let BENCH_STATE={mainKey:null,compKeys:Array.of(),tokens:{},inited:false};

function getAllUniqueMOs(){
  const m=new Map();
  GEO.features.forEach(f=>{
    const p=f.properties;
    if(p._map_status==="В_выборке"&&!p._inset&&!m.has(p.join_key)){
      const c24=String(DATA.panel_cats?.["2024"]?.[p.join_key]||"5");
      m.set(p.join_key,{key:p.join_key,lbl:p._lbl,reg:p.region,fo:p.fo,cat:c24,full:p._lbl+" ("+p.region+")"});
    }
  });
  return Array.from(m.values()).sort((a,b)=>a.full.localeCompare(b.full,"ru"));
}
function isDarkHex(hex){
  const h=String(hex||"#ffffff").replace("#","");
  if(h.length<6)return false;
  const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
  return(0.299*r+0.587*g+0.114*b)<135;
}
function assignRandomToken(jk){
  if(BENCH_STATE.tokens[jk])return;
  const used=new Set(Object.values(BENCH_STATE.tokens));
  const free=MONOPOLY_TOKENS.filter(t=>!used.has(t));
  const pool=free.length?free:MONOPOLY_TOKENS;
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
    if(last&&Math.abs(p.pct-last.pct)<5.2){
      last.items.push(p);
      last.pct=last.items.reduce((s,x)=>s+x.pct,0)/last.items.length;
      if(!last.vals.includes(p.txt))last.vals.push(p.txt);
    }else{
      grps.push({pct:p.pct,items:Array.of(p),vals:Array.of(p.txt)});
    }
  });
  return grps;
}
function initBenchControls(){
  if(BENCH_STATE.inited||!GEO||!DATA)return;
  BENCH_STATE.inited=true;
  const allMOs=getAllUniqueMOs(),dl=document.getElementById("moDatalist");
  dl.innerHTML="";allMOs.forEach(m=>{const o=document.createElement("option");o.value=m.full;dl.appendChild(o);});
  const bindFilter=(suf,isMain)=>{
    const cEl=document.getElementById("bCat"+suf),fEl=document.getElementById("bFO"+suf),rEl=document.getElementById("bReg"+suf),mEl=document.getElementById("bMO"+suf),sEl=document.getElementById("bSearch"+suf),rstBtn=document.getElementById("bRst"+suf);
    const syncDropdowns=()=>{
      const vC=cEl.value,vF=fEl.value,vR=rEl.value;
      const validCats=new Set(allMOs.filter(m=>(vF==="ALL"||m.fo===vF)&&(vR==="ALL"||m.reg===vR)).map(m=>m.cat));
      Array.from(cEl.options).forEach(o=>{if(o.value!=="ALL")o.hidden=!validCats.has(o.value);});
      const validFOs=Array.from(new Set(allMOs.filter(m=>(vC==="ALL"||m.cat===vC)&&(vR==="ALL"||m.reg===vR)).map(m=>m.fo))).sort((a,b)=>a.localeCompare(b,"ru"));
      fEl.innerHTML='<option value="ALL">ФО (все)</option>';validFOs.forEach(f=>fEl.add(new Option(f+" ФО",f)));
      if(validFOs.includes(vF))fEl.value=vF;
      const validRegs=Array.from(new Set(allMOs.filter(m=>(vC==="ALL"||m.cat===vC)&&(fEl.value==="ALL"||m.fo===fEl.value)).map(m=>m.reg))).sort((a,b)=>a.localeCompare(b,"ru"));
      rEl.innerHTML='<option value="ALL">Регион (все)</option>';validRegs.forEach(r=>rEl.add(new Option(r,r)));
      if(validRegs.includes(vR))rEl.value=vR;
      const list=allMOs.filter(m=>(cEl.value==="ALL"||m.cat===cEl.value)&&(fEl.value==="ALL"||m.fo===fEl.value)&&(rEl.value==="ALL"||m.reg===rEl.value));
      mEl.innerHTML=isMain?'<option value="">Выберите МО ('+list.length+')...</option>':'<option value="">+ Добавить МО ('+list.length+')...</option>';
      list.forEach(m=>mEl.add(new Option(m.full,m.key)));
    };
    const clearFilters=()=>{cEl.value="ALL";fEl.value="ALL";rEl.value="ALL";sEl.value="";syncDropdowns();};
    cEl.onchange=syncDropdowns;fEl.onchange=syncDropdowns;rEl.onchange=syncDropdowns;
    if(rstBtn)rstBtn.onclick=()=>{clearFilters();if(isMain){BENCH_STATE.mainKey=null;renderBenchmark();}};
    syncDropdowns();
    const pickKey=k=>{
      if(!k)return;
      assignRandomToken(k);
      if(isMain){BENCH_STATE.mainKey=k;BENCH_STATE.compKeys=BENCH_STATE.compKeys.filter(x=>x!==k);}
      else if(k!==BENCH_STATE.mainKey&&!BENCH_STATE.compKeys.includes(k)&&BENCH_STATE.compKeys.length<9){BENCH_STATE.compKeys.push(k);}
      clearFilters();renderBenchChips(allMOs);renderBenchmark();
    };
    mEl.onchange=()=>pickKey(mEl.value);
    sEl.onchange=()=>{const hit=allMOs.find(m=>m.full.toLowerCase()===sEl.value.trim().toLowerCase());if(hit)pickKey(hit.key);};
  };
  bindFilter("1",true);bindFilter("2",false);
  document.getElementById("btnBenchRun").onclick=renderBenchmark;
  document.getElementById("bYear").onchange=renderBenchmark;
  renderBenchChips(allMOs);
}
function renderBenchChips(allMOs){
  const box=document.getElementById("bChips");box.innerHTML="";
  BENCH_STATE.compKeys.forEach(k=>{
    const m=allMOs.find(x=>x.key===k);if(!m)return;
    const d=document.createElement("div");d.className="bench-chip";
    d.innerHTML='<span>'+(BENCH_STATE.tokens[k]||"🎩")+' '+m.full+'</span><button type="button" title="Удалить">×</button>';
    d.querySelector("button").onclick=()=>{BENCH_STATE.compKeys=BENCH_STATE.compKeys.filter(x=>x!==k);renderBenchChips(allMOs);renderBenchmark();};
    box.appendChild(d);
  });
}
function renderBenchmark(){
  initBenchControls();
  const box=document.getElementById("sheetBox"),yr=document.getElementById("bYear").value,actCol=PALETTES[currentPal]||PALETTES["RdYlGn"];
  const allMOs=getAllUniqueMOs(),selKeys=Array.of(BENCH_STATE.mainKey).concat(BENCH_STATE.compKeys).filter(Boolean);
  const selMOs=selKeys.map(k=>allMOs.find(m=>m.key===k)).filter(Boolean);
  if(selMOs.length===0){
    box.innerHTML='<div class="bench-empty"><b>Режим бенчмаркинга муниципальных образований</b><br><br>Выберите основное МО и до 9 МО для сравнения в панели слева.</div>';
    return;
  }
  const view=document.createElement("div");view.className="bench-view";
  const stickyTop=document.createElement("div");stickyTop.className="bench-sticky-top";
  const hdr=document.createElement("div");hdr.className="bench-hdr-grid";
  hdr.style.gridTemplateColumns="repeat("+Math.min(5,Math.max(2,Math.ceil(selMOs.length/2)))+",1fr)";
  selMOs.forEach(m=>{
    const row=document.createElement("div");row.className="bench-mo-row";
    const sel=document.createElement("select");sel.className="b-tok-sel";
    MONOPOLY_TOKENS.forEach(tk=>{const op=new Option(tk,tk);if(tk===BENCH_STATE.tokens[m.key])op.selected=true;sel.add(op);});
    sel.onchange=()=>{BENCH_STATE.tokens[m.key]=sel.value;renderBenchChips(allMOs);renderBenchmark();};
    const sp=document.createElement("span");sp.textContent=m.full;sp.title=m.full+" ("+yr+" г.)";
    row.append(sel,sp);hdr.appendChild(row);
  });
  stickyTop.appendChild(hdr);view.appendChild(stickyTop);
  const groups=Array.of();
  DATA.metrics.forEach(m=>{let g=groups.find(x=>x.name===m.group);if(!g){g={name:m.group,items:Array.of()};groups.push(g);}g.items.push(m);});
  const clEntries=Object.entries(DATA.cluster_colors||{});
  groups.forEach(g=>{
    const gh=document.createElement("div");gh.className="bench-blk-hdr";gh.textContent=g.name;view.appendChild(gh);
    g.items.forEach(m=>{
      const valMap=(yr==="2024")?(DATA.v2024[m.id]||{}):(DATA.panel[m.id]?.[yr]||{});
      const row=document.createElement("div");row.className="bench-row";
      const nm=document.createElement("div");nm.className="bench-met-name";nm.textContent=m.id+" — "+m.title;row.appendChild(nm);
      if(m.cat){
        const grid=document.createElement("div");grid.className="bench-clust-cells";
        clEntries.forEach(pair=>{
          const cname=pair.at(0),chex=pair.at(1),cell=document.createElement("div");cell.className="bench-ccell";
          cell.style.background=chex;cell.style.color=isDarkHex(chex)?"#ffffff":"#111111";cell.title=cname;
          const letter=cname.split(" ").at(0).replace(/\.+$/,"");
          const hits=selMOs.filter(mo=>valMap[mo.key]===cname);
          cell.innerHTML='<div>'+letter+'</div><div class="bench-ccell-toks">'+hits.map(mo=>'<span class="bench-ctok" title="'+mo.full+': '+cname+'">'+(BENCH_STATE.tokens[mo.key]||"🎩")+'</span>').join("")+'</div>';
          grid.appendChild(cell);
        });
        row.appendChild(grid);
      }else{
        const allV=allMOs.map(mo=>Number(valMap[mo.key])).filter(v=>!isNaN(v));
        const scObj=computeScale(allV,actCol,m.inv);
        const wrap=document.createElement("div");wrap.className="bench-scale-wrap";
        const bar=document.createElement("div");bar.className="bench-bar";bar.style.background="linear-gradient(to right,"+scObj.pal.join(",")+")";
        const grps=buildScaleGroups(selMOs,valMap,scObj,m.dec);
        grps.forEach(gp=>{
          const el=document.createElement("div");el.className="bench-grp";el.style.left=gp.pct+"%";
          const tip=gp.items.map(x=>x.mo.full+": "+x.txt).join(" | ");
          const toksHtml=gp.items.map(x=>'<span title="'+x.mo.full+': '+x.txt+'">'+(BENCH_STATE.tokens[x.mo.key]||"🎩")+'</span>').join("");
          el.innerHTML='<div class="bench-toks-row" title="'+tip+'">'+toksHtml+'</div><div class="bench-stem"></div><div class="bench-vals-row">'+gp.vals.join(" ")+'</div>';
          bar.appendChild(el);
        });
        wrap.appendChild(bar);row.appendChild(wrap);
      }
      view.appendChild(row);
    });
  });
  box.innerHTML="";box.appendChild(view);
}

function buildBenchCanvas(){
  const yr=document.getElementById("bYear").value,actCol=PALETTES[currentPal]||PALETTES["RdYlGn"];
  const allMOs=getAllUniqueMOs(),selKeys=Array.of(BENCH_STATE.mainKey).concat(BENCH_STATE.compKeys).filter(Boolean);
  const selMOs=selKeys.map(k=>allMOs.find(m=>m.key===k)).filter(Boolean);
  if(selMOs.length===0){alert("Выберите хотя бы одно МО для сравнения.");return null;}
  const W=3160,H=2234,canvas=document.createElement("canvas");canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext("2d");ctx.fillStyle="#ffffff";ctx.fillRect(0,0,W,H);
  ctx.fillStyle="#111111";ctx.textAlign="center";ctx.font="bold 34px 'Times New Roman'";
  ctx.fillText("Бенчмаркинг муниципальных образований ("+yr+" г.)",W/2,54);ctx.textAlign="left";
  const colsH=5,colWH=Math.floor((W-80)/colsH),hdrY=76;
  ctx.strokeStyle="#cbd5e1";ctx.lineWidth=1.5;ctx.strokeRect(40,hdrY,W-80,96);
  selMOs.forEach((m,idx)=>{
    const c=Math.floor(idx/2),r=idx%2,x=52+c*colWH,y=hdrY+34+r*44;
    ctx.font="24px 'Times New Roman'";ctx.fillText(BENCH_STATE.tokens[m.key]||"🎩",x,y);
    ctx.font="bold 20px 'Times New Roman'";const lbl=m.full;
    ctx.fillText(lbl.length>34?lbl.slice(0,33)+"…":lbl,x+34,y);
  });
  const colX=Array.of(40,1600),colW=1520,topY=196,botY=2195;
  ctx.strokeStyle="#94a3b8";ctx.setLineDash(Array.of(8,6));ctx.beginPath();ctx.moveTo(1580,topY);ctx.lineTo(1580,botY);ctx.stroke();ctx.setLineDash(Array.of());
  const groups=Array.of();
  DATA.metrics.forEach(m=>{let g=groups.find(x=>x.name===m.group);if(!g){g={name:m.group,items:Array.of()};groups.push(g);}g.items.push(m);});
  const rows=Array.of();groups.forEach(g=>{rows.push({kind:"blk",txt:g.name});g.items.forEach(m=>rows.push({kind:"met",m}));});
  const splitIdx=Math.ceil(rows.length/2),clEntries=Object.entries(DATA.cluster_colors||{});
  for(let col=0;col<2;col++){
    const sub=col===0?rows.slice(0,splitIdx):rows.slice(splitIdx),x0=colX.at(col);
    const step=Math.min(72,Math.floor((botY-topY)/Math.max(1,sub.length)));
    sub.forEach((it,ri)=>{
      const y=topY+ri*step;
      if(it.kind==="blk"){
        ctx.fillStyle="#e2e8f0";ctx.fillRect(x0,y+4,colW,step-10);
        ctx.fillStyle="#111111";ctx.font="bold 21px 'Times New Roman'";ctx.fillText(it.txt,x0+10,y+step-14);
        return;
      }
      const m=it.m,valMap=(yr==="2024")?(DATA.v2024[m.id]||{}):(DATA.panel[m.id]?.[yr]||{});
      ctx.strokeStyle="#e2e8f0";ctx.beginPath();ctx.moveTo(x0,y+step);ctx.lineTo(x0+colW,y+step);ctx.stroke();
      ctx.fillStyle="#111111";ctx.font="19px 'Times New Roman'";
      const title=m.id+" — "+m.title;
      if(title.length<=54)ctx.fillText(title,x0+4,y+step/2+6);
      else{const cut=title.lastIndexOf(" ",54)>20?title.lastIndexOf(" ",54):54;ctx.fillText(title.slice(0,cut),x0+4,y+step/2-4);ctx.fillText(title.slice(cut+1,cut+55),x0+4,y+step/2+17);}
      const sx=x0+670,sw=colW-680;
      if(m.cat){
        const cw=Math.floor(sw/7),ch=Math.min(44,step-12),cy=y+(step-ch)/2;
        clEntries.forEach((pair,ci)=>{
          const cname=pair.at(0),chex=pair.at(1),cx=sx+ci*cw;
          ctx.fillStyle=chex;ctx.fillRect(cx,cy,cw-3,ch);ctx.strokeStyle="#475569";ctx.strokeRect(cx,cy,cw-3,ch);
          ctx.fillStyle=isDarkHex(chex)?"#ffffff":"#111111";ctx.font="bold 16px 'Times New Roman'";ctx.textAlign="center";
          const ltr=cname.split(" ").at(0).replace(/\.+$/,""),hits=selMOs.filter(mo=>valMap[mo.key]===cname);
          ctx.fillText(ltr+(hits.length?" "+hits.map(mo=>BENCH_STATE.tokens[mo.key]||"🎩").join("") :""),cx+(cw-3)/2,cy+ch/2+6);ctx.textAlign="left";
        });
      }else{
        const allV=allMOs.map(mo=>Number(valMap[mo.key])).filter(v=>!isNaN(v)),scObj=computeScale(allV,actCol,m.inv);
        const by=y+step/2-6,bh=13,grd=ctx.createLinearGradient(sx,0,sx+sw,0);
        scObj.pal.forEach((c,i)=>grd.addColorStop(i/(scObj.pal.length-1),c));
        ctx.fillStyle=grd;ctx.fillRect(sx,by,sw,bh);ctx.strokeStyle="#475569";ctx.strokeRect(sx,by,sw,bh);
        const grps=buildScaleGroups(selMOs,valMap,scObj,m.dec);
        grps.forEach(gp=>{
          const px=sx+sw*(gp.pct/100);
          ctx.strokeStyle="#1e293b";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(px,by-4);ctx.lineTo(px,by+bh+4);ctx.stroke();
          const tStr=gp.items.map(x=>BENCH_STATE.tokens[x.mo.key]||"🎩").join("");
          ctx.font="18px 'Times New Roman'";const tw=ctx.measureText(tStr).width+10;
          ctx.fillStyle="#ffffff";ctx.fillRect(px-tw/2,by-24,tw,20);ctx.strokeStyle="#1e293b";ctx.strokeRect(px-tw/2,by-24,tw,20);
          ctx.fillStyle="#111111";ctx.textAlign="center";ctx.fillText(tStr,px,by-8);
          ctx.font="bold 15px 'Times New Roman'";ctx.fillText(gp.vals.join(" "),px,by+bh+18);ctx.textAlign="left";
        });
      }
    });
  }
  const sc=Number(document.getElementById("selDpi")?.value||1);
  if(sc<0.99){const c2=document.createElement("canvas");c2.width=Math.round(W*sc);c2.height=Math.round(H*sc);const x2=c2.getContext("2d");x2.imageSmoothingEnabled=true;x2.imageSmoothingQuality="high";x2.drawImage(canvas,0,0,c2.width,c2.height);return c2;}
  return canvas;
}
