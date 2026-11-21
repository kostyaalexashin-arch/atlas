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
function assignRandomToken(jk){
  if(BENCH_STATE.tokens[jk])return;
  const used=new Set(Object.values(BENCH_STATE.tokens));
  const free=MONOPOLY_TOKENS.filter(t=>!used.has(t));
  const pool=free.length?free:MONOPOLY_TOKENS;
  BENCH_STATE.tokens[jk]=pool.at(Math.floor(Math.random()*pool.length));
}
function initBenchControls(){
  if(BENCH_STATE.inited||!GEO||!DATA)return;
  BENCH_STATE.inited=true;
  const allMOs=getAllUniqueMOs(),dl=document.getElementById("moDatalist");
  allMOs.forEach(m=>{const o=document.createElement("option");o.value=m.full;dl.appendChild(o);});
  Array.of("bFO1","bFO2").forEach(id=>{const el=document.getElementById(id);DATA.fos.forEach(f=>el.add(new Option(f+" ФО",f)));});
  const bindFilter=(suf,isMain)=>{
    const cEl=document.getElementById("bCat"+suf),fEl=document.getElementById("bFO"+suf),rEl=document.getElementById("bReg"+suf),mEl=document.getElementById("bMO"+suf),sEl=document.getElementById("bSearch"+suf);
    const refillRegs=()=>{
      rEl.innerHTML='<option value="ALL">Регион (все)</option>';
      const regs=fEl.value==="ALL"?Object.values(DATA.fo_to_regs).flat().sort((a,b)=>a.localeCompare(b,"ru")):(DATA.fo_to_regs[fEl.value]||Array.of());
      regs.forEach(r=>rEl.add(new Option(r,r)));
    };
    const refillMOs=()=>{
      mEl.innerHTML=isMain?'<option value="">Выберите МО...</option>':'<option value="">+ Добавить МО...</option>';
      allMOs.filter(m=>(cEl.value==="ALL"||m.cat===cEl.value)&&(fEl.value==="ALL"||m.fo===fEl.value)&&(rEl.value==="ALL"||m.reg===rEl.value)).forEach(m=>mEl.add(new Option(m.full,m.key)));
    };
    fEl.onchange=()=>{refillRegs();refillMOs();};
    cEl.onchange=refillMOs;rEl.onchange=refillMOs;
    refillRegs();refillMOs();
    const pickKey=k=>{
      if(!k)return;
      assignRandomToken(k);
      if(isMain){BENCH_STATE.mainKey=k;BENCH_STATE.compKeys=BENCH_STATE.compKeys.filter(x=>x!==k);}
      else if(k!==BENCH_STATE.mainKey&&!BENCH_STATE.compKeys.includes(k)&&BENCH_STATE.compKeys.length<9){BENCH_STATE.compKeys.push(k);}
      renderBenchChips(allMOs);renderBenchmark();
    };
    mEl.onchange=()=>{pickKey(mEl.value);if(!isMain)mEl.value="";};
    sEl.onchange=()=>{const hit=allMOs.find(m=>m.full.toLowerCase()===sEl.value.trim().toLowerCase());if(hit){pickKey(hit.key);if(!isMain)sEl.value="";}};
  };
  bindFilter("1",true);bindFilter("2",false);
  document.getElementById("btnBenchRun").onclick=renderBenchmark;
  document.getElementById("bYear").onchange=renderBenchmark;
  const defMain=allMOs.find(m=>m.lbl==="Москва")||allMOs.at(0);
  if(defMain){BENCH_STATE.mainKey=defMain.key;assignRandomToken(defMain.key);document.getElementById("bSearch1").value=defMain.full;}
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
  const view=document.createElement("div");view.className="bench-view";
  const hdr=document.createElement("div");hdr.className="bench-hdr-grid";
  selMOs.forEach(m=>{
    const row=document.createElement("div");row.className="bench-mo-row";
    const sel=document.createElement("select");sel.className="b-tok-sel";
    MONOPOLY_TOKENS.forEach(tk=>{const op=new Option(tk,tk);if(tk===BENCH_STATE.tokens[m.key])op.selected=true;sel.add(op);});
    sel.onchange=()=>{BENCH_STATE.tokens[m.key]=sel.value;renderBenchChips(allMOs);renderBenchmark();};
    const sp=document.createElement("span");sp.textContent=m.full+" ("+yr+" г.)";
    row.append(sel,sp);hdr.appendChild(row);
  });
  view.appendChild(hdr);
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
          const cname=pair.at(0),chex=pair.at(1),cell=document.createElement("div");cell.className="bench-ccell";cell.style.background=chex;cell.title=cname;
          const shortLbl=cname.split(" ").at(0);
          const hits=selMOs.filter(mo=>valMap[mo.key]===cname);
          cell.innerHTML='<div>'+shortLbl+'</div><div class="bench-ccell-toks">'+hits.map(mo=>'<span title="'+mo.full+': '+cname+'">'+(BENCH_STATE.tokens[mo.key]||"🎩")+'</span>').join("")+'</div>';
          grid.appendChild(cell);
        });
        row.appendChild(grid);
      }else{
        const allV=allMOs.map(mo=>Number(valMap[mo.key])).filter(v=>!isNaN(v));
        const scObj=computeScale(allV,actCol,m.inv);
        const wrap=document.createElement("div");wrap.className="bench-scale-wrap";
        const bar=document.createElement("div");bar.className="bench-bar";bar.style.background="linear-gradient(to right,"+scObj.pal.join(",")+")";
        const pins=selMOs.map(mo=>{
          const raw=Number(valMap[mo.key]);if(isNaN(raw))return null;
          const u=scObj.vmax<=scObj.vmin?0.5:Math.pow(Math.max(0,Math.min(1,(raw-scObj.vmin)/(scObj.vmax-scObj.vmin))),scObj.gamma);
          return{mo,raw,pct:4+u*92,lvl:0};
        }).filter(Boolean).sort((a,b)=>a.pct-b.pct);
        for(let i=1;i<pins.length;i++){
          if(pins.at(i).pct-pins.at(i-1).pct<6.5)pins.at(i).lvl=pins.at(i-1).lvl+1;
        }
        pins.forEach(p=>{
          const pin=document.createElement("div");pin.className="bench-pin";pin.style.left=p.pct+"%";
          const lift=p.lvl*24;pin.style.top=(-8-lift)+"px";
          const tip=p.mo.full+": "+fmtNum(p.raw,m.dec);
          pin.innerHTML=(p.lvl>0?'<div class="bench-pin-val">'+fmtNum(p.raw,m.dec)+'</div>':'')+'<div class="bench-pin-tok" title="'+tip+'">'+(BENCH_STATE.tokens[p.mo.key]||"🎩")+'</div>'+(p.lvl>0?'<div class="bench-pin-line" style="height:'+(lift+4)+'px"></div>':'');
          bar.appendChild(pin);
        });
        wrap.appendChild(bar);row.appendChild(wrap);
      }
      view.appendChild(row);
    });
  });
  box.innerHTML="";box.appendChild(view);
}
