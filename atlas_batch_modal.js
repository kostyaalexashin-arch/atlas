function getBenchBatchPairs(){
  const modal=document.getElementById("batchModal"),baseK=document.getElementById("bmBenchBaseMO")?.value||"";
  const scope=modal.querySelector('input[name="bmBenchScope"]:checked')?.value||"reg";
  const all=getBenchMOs(),baseMO=all.find(m=>m.key===baseK);
  if(!baseMO)return{baseMO:null,tasks:Array.of()};
  const yrsSel=Array.from(modal.querySelectorAll(".bm-y-chk:checked")).map(c=>c.value);
  const yrs=yrsSel.length?yrsSel:Array.of(baseMO.coh?(document.getElementById("bYear")?.value||"2024"):"2024");
  const peers=all.filter(m=>m.key!==baseMO.key&&(scope==="cat"?m.cat===baseMO.cat:(scope==="fo"?m.fo===baseMO.fo:m.reg===baseMO.reg)));
  const tasks=Array.of();
  yrs.forEach(yr=>{
    if(yr!=="2024"&&!baseMO.coh)return;
    peers.forEach(pr=>{if(yr==="2024"||pr.coh)tasks.push({yr,pr});});
  });
  return{baseMO,tasks};
}
function initBatchModal(){
  const modal=document.getElementById("batchModal"),btnOpen=document.getElementById("btnOpenBatch"),btnClose=document.getElementById("btnCloseBatch");
  if(!modal||!btnOpen)return;
  const updSum=()=>{
    const mode=document.getElementById("selMode")?.value||"single",yCnt=Math.max(1,modal.querySelectorAll(".bm-y-chk:checked").length);
    if(mode==="bench"){
      const {tasks}=getBenchBatchPairs();
      document.getElementById("bmSummary").textContent="Парных сравнений 1 на 1: "+tasks.length+" (листов А4: "+(tasks.length*2)+")";return;
    }
    if(mode==="passport"){
      const tasks=getPassportBatchTasks();
      document.getElementById("bmSummary").textContent="Выбрано паспортов МО: "+tasks.length+" (листов А4: "+tasks.length+")";return;
    }
    const tCnt=modal.querySelectorAll(".bm-t-chk:checked").length,mCnt=modal.querySelectorAll(".bm-m-chk:checked").length;
    const mult=(mode==="single"&&document.getElementById("selBase")?.value==="coh")?yCnt:1;
    document.getElementById("bmSummary").textContent="Выбрано позиций: "+(tCnt*mCnt*mult)+" (территорий: "+tCnt+", показателей: "+mCnt+")";
  };
  btnOpen.onclick=()=>{
    const sDpi = document.getElementById("selDpi"), bmDpi = document.getElementById("bmDpi");
    if(sDpi && bmDpi){
      bmDpi.value = sDpi.value || "1";
      bmDpi.onchange = () => { sDpi.value = bmDpi.value; };
    }

    const mode=document.getElementById("selMode").value,c1T=document.getElementById("bmCol1Title"),c2T=document.getElementById("bmCol2Title");
    const tList=document.getElementById("bmTerrList"),mList=document.getElementById("bmMetList"),yList=document.getElementById("bmYrList");
    if(c1T)c1T.textContent=mode==="bench"?"Эталонное МО (кого сравниваем):":(mode==="passport"?"1. Выбор охвата МО":"1. Территории");
    if(c2T)c2T.textContent=mode==="bench"?"Группа сравнения (с кем сравниваем):":(mode==="passport"?"2. Состав паспорта":"2. Показатели и блоки");
    document.getElementById("bmAllTerr").parentElement.style.display=(mode==="bench"||mode==="passport")?"none":"";
    document.getElementById("bmAllMet").parentElement.style.display=(mode==="bench"||mode==="passport")?"none":"";
    document.getElementById("bmAllYr").parentElement.style.display=(mode==="table")?"none":"";
    const mw=document.getElementById("bmMergeWrap");if(mw)mw.style.display=(mode==="table")?"flex":"none";
    document.getElementById("bmAllYr").checked=false;
    if(mode==="bench"){
      initBenchControls();const all=getBenchMOs(),curK=BENCH_STATE.mainKey||(all.at(0)?.key||""),curY=document.getElementById("bYear")?.value||"2024";
      tList.innerHTML='<select id="bmBCat" style="width:100%;height:26px;margin-bottom:4px;"><option value="ALL">Все категории МО</option>'+Object.entries(CAT_NAMES).map(p=>'<option value="'+p.at(0)+'">'+p.at(1)+'</option>').join("")+'</select>'+
        '<select id="bmBFO" style="width:100%;height:26px;margin-bottom:4px;"><option value="ALL">Все федеральные округа</option>'+Array.from(new Set(all.map(m=>m.fo))).sort((a,b)=>a.localeCompare(b,"ru")).map(f=>'<option value="'+f+'">'+f+'</option>').join("")+'</select>'+
        '<select id="bmBReg" style="width:100%;height:26px;margin-bottom:4px;"><option value="ALL">Все регионы</option>'+Array.from(new Set(all.map(m=>m.reg))).sort((a,b)=>a.localeCompare(b,"ru")).map(r=>'<option value="'+r+'">'+r+'</option>').join("")+'</select>'+
        '<select id="bmBenchBaseMO" style="width:100%;height:30px;padding:2px 6px;font-weight:bold;"></select>';
      mList.innerHTML='<label class="bm-item"><input type="radio" name="bmBenchScope" value="reg" checked> 1) внутри региона эталонного МО</label>'+
        '<label class="bm-item"><input type="radio" name="bmBenchScope" value="fo"> 2) внутри ФО эталонного МО</label>'+
        '<label class="bm-item"><input type="radio" name="bmBenchScope" value="cat"> 3) внутри категории эталонного МО</label>';
      const syncBenchYears=()=>{
        const bMO=all.find(m=>m.key===document.getElementById("bmBenchBaseMO").value),hasDyn=Boolean(bMO&&bMO.coh);
        document.getElementById("bmAllYr").parentElement.style.display=hasDyn?"":"none";document.getElementById("bmAllYr").checked=false;
        yList.innerHTML=!hasDyn?'<label class="bm-item"><input type="checkbox" class="bm-y-chk" value="2024" checked disabled> 2024 г. (только срез)</label>':Array.of("2019","2020","2021","2022","2023","2024").map(y=>'<label class="bm-item"><input type="checkbox" class="bm-y-chk" value="'+y+'" '+(y===curY?"checked":"")+'> '+y+' г.</label>').join("");
        yList.querySelectorAll("input").forEach(c=>c.addEventListener("change",updSum));updSum();
      };
      const syncBM=()=>{
        const fC=document.getElementById("bmBCat").value,fF=document.getElementById("bmBFO").value,fR=document.getElementById("bmBReg").value,sel=document.getElementById("bmBenchBaseMO"),prev=sel.value||curK;
        sel.innerHTML=all.filter(m=>(fC==="ALL"||m.cat===fC)&&(fF==="ALL"||m.fo===fF)&&(fR==="ALL"||m.reg===fR)).map(m=>'<option value="'+m.key+'" '+(m.key===prev?"selected":"")+'>'+m.full+'</option>').join("");
        syncBenchYears();
      };
      Array.of("bmBCat","bmBFO","bmBReg").forEach(id=>document.getElementById(id).onchange=syncBM);
      document.getElementById("bmBenchBaseMO").onchange=syncBenchYears;
      document.getElementById("bmAllYr").onchange=e=>{modal.querySelectorAll(".bm-y-chk:not(:disabled)").forEach(c=>c.checked=e.target.checked);updSum();};
      mList.querySelectorAll("input").forEach(el=>el.addEventListener("change",updSum));syncBM();modal.classList.add("open");return;
    }
    if(mode==="passport"){
      initPassportControls();const all=getPassMOs(),curMO=all.find(m=>m.key===PASS_STATE.key),curY=document.getElementById("pYear")?.value||"2024";
      const fos=Array.from(new Set(all.map(m=>m.fo))).sort((a,b)=>a.localeCompare(b,"ru")),regs=Array.from(new Set(all.map(m=>m.reg))).sort((a,b)=>a.localeCompare(b,"ru"));
      tList.innerHTML='<label class="bm-item"><input type="radio" name="bmPassScope" value="reg" checked> Все МО выбранного региона</label><select id="bmPassReg" style="width:100%;height:28px;margin:2px 0 6px 0;">'+regs.map(r=>'<option value="'+r+'" '+(curMO&&curMO.reg===r?"selected":"")+'>'+r+'</option>').join("")+'</select>'+
        '<label class="bm-item"><input type="radio" name="bmPassScope" value="fo"> Все МО выбранного ФО</label><select id="bmPassFO" style="width:100%;height:28px;margin:2px 0 6px 0;">'+fos.map(f=>'<option value="'+f+'" '+(curMO&&curMO.fo===f?"selected":"")+'>'+f+' ФО</option>').join("")+'</select>'+
        '<label class="bm-item"><input type="radio" name="bmPassScope" value="cat"> По категории МО</label><select id="bmPassCat" style="width:100%;height:28px;margin:2px 0 6px 0;">'+Object.entries(PASS_CAT_NAMES).map(p=>'<option value="'+p.at(0)+'" '+(curMO&&curMO.cat===p.at(0)?"selected":"")+'>'+p.at(1)+'</option>').join("")+'</select>'+
        '<label class="bm-item"><input type="radio" name="bmPassScope" value="coh"> Все 193 МО динамической когорты</label>';
      mList.innerHTML='<div style="padding:6px;color:#334155;">В каждый паспорт включаются:<br>• Общая характеристика МО<br>• Диаграмма и таблица 4 субиндексов<br>• Диаграмма и таблица 9 подблоков<br>• Все 39 частных показателей (ЭК, СЦ, УЭ)<br><br><span style="font-size:11px;color:#64748b;">За 2019–2023 гг. выгружаются только МО, входящие в динамическую когорту.</span></div>';
      yList.innerHTML=Array.of("2019","2020","2021","2022","2023","2024").map(y=>'<label class="bm-item"><input type="checkbox" class="bm-y-chk" value="'+y+'" '+(y===curY?"checked":"")+'> '+y+' г.</label>').join("");
      document.getElementById("bmAllYr").onchange=e=>{modal.querySelectorAll(".bm-y-chk").forEach(c=>c.checked=e.target.checked);updSum();};
      modal.querySelectorAll("select,input").forEach(el=>el.addEventListener("change",updSum));updSum();modal.classList.add("open");return;
    }
    const isCoh=(mode==="table"||document.getElementById("selBase").value==="coh"),cohRegs=new Set(GEO.features.filter(f=>f.properties.coh&&f.properties._map_status==="В_выборке").map(f=>f.properties.region));
    tList.innerHTML='<label class="bm-grp"><input type="checkbox" class="bm-t-chk" data-fo="RF" data-reg="ALL" checked> Российская Федерация (вся РФ)</label>';
    DATA.fos.forEach(fo=>{tList.insertAdjacentHTML("beforeend",'<label class="bm-grp"><input type="checkbox" class="bm-t-chk" data-fo="'+fo+'" data-reg="ALL"> '+fo+' ФО (целиком)</label>');(DATA.fo_to_regs[fo]||Array.of()).forEach(reg=>{if(!isCoh||cohRegs.has(reg))tList.insertAdjacentHTML("beforeend",'<label class="bm-item"><input type="checkbox" class="bm-t-chk" data-fo="'+fo+'" data-reg="'+reg+'"> '+reg+'</label>');});});
    mList.innerHTML="";const curM=document.getElementById("selMetric").value,grps=Array.of();
    DATA.metrics.forEach(m=>{if((mode==="table"||mode==="grid")&&(m.cat||m.is_cat))return;let g=grps.find(x=>x.name===m.group);if(!g){g={name:m.group,items:Array.of()};grps.push(g);}g.items.push(m);});
    grps.forEach((g,gi)=>{const gId="bmGrp_"+gi;mList.insertAdjacentHTML("beforeend",'<label class="bm-grp"><input type="checkbox" class="bm-g-chk" data-gid="'+gId+'"> '+g.name+'</label>');g.items.forEach(m=>{if(m.id==="ЭК-01"||m.id==="СЦ-01"||m.id==="УЭ-01")mList.insertAdjacentHTML("beforeend",'<div style="font-weight:bold;font-size:11.5px;color:#0369a1;padding:3px 0 1px 8px;">'+(m.id==="ЭК-01"?"Экологический блок":(m.id==="СЦ-01"?"Социальный блок":"Управленческо-экономический блок"))+'</div>');mList.insertAdjacentHTML("beforeend",'<label class="bm-item"><input type="checkbox" class="bm-m-chk" data-gid="'+gId+'" value="'+m.id+'" '+(m.id===curM?"checked":"")+'> '+m.id+' — '+m.title+'</label>');});});
    const curY=document.getElementById("selYear").value;
    yList.innerHTML=(mode==="table")?'<div style="color:#475569;padding:4px;">Весь период (2019–2024 гг.)</div>':(!isCoh?'<label class="bm-item"><input type="checkbox" class="bm-y-chk" value="2024" checked disabled> 2024 г. (срез)</label>':Array.of("2019","2020","2021","2022","2023","2024").map(y=>'<label class="bm-item"><input type="checkbox" class="bm-y-chk" value="'+y+'" '+(y===curY?"checked":"")+'> '+y+' г.</label>').join(""));
    modal.querySelectorAll(".bm-g-chk").forEach(gc=>{gc.onchange=()=>{modal.querySelectorAll('.bm-m-chk[data-gid="'+gc.dataset.gid+'"]').forEach(mc=>mc.checked=gc.checked);updSum();};});
    document.getElementById("bmAllTerr").onchange=e=>{modal.querySelectorAll(".bm-t-chk").forEach(c=>c.checked=e.target.checked);updSum();};
    document.getElementById("bmAllMet").onchange=e=>{modal.querySelectorAll(".bm-m-chk,.bm-g-chk").forEach(c=>c.checked=e.target.checked);updSum();};
    document.getElementById("bmAllYr").onchange=e=>{modal.querySelectorAll(".bm-y-chk:not(:disabled)").forEach(c=>c.checked=e.target.checked);updSum();};
    modal.querySelectorAll("input[type=checkbox]").forEach(c=>c.addEventListener("change",updSum));updSum();
    const oldPresets = modal.querySelector("#bmQuickPresets");
    if(oldPresets) oldPresets.remove();
    if(mode === "single" || mode === "map" || mode === "grid" || mode === "table"){
      const pBar = document.createElement("div");
      pBar.id = "bmQuickPresets";
      pBar.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:6px 10px;background:#f8fafc;border-bottom:1px solid #cbd5e1;font-size:11.5px;";
      pBar.innerHTML =
        '<div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center;">' +
          '<b style="color:#334155;">Территории:</b>' +
          '<button type="button" class="btn-rst" data-tp="rf">Только РФ</button>' +
          '<button type="button" class="btn-rst" data-tp="fo">Только 8 ФО</button>' +
          '<button type="button" class="btn-rst" data-tp="reg">Все регионы</button>' +
          '<button type="button" class="btn-rst" data-tp="none">Снять</button>' +
          '<label style="display:inline-flex;align-items:center;gap:3px;margin-left:4px;cursor:pointer;color:#0369a1;font-weight:bold;"><input type="checkbox" id="bmAutoFORegs"> + регионы выбранных ФО</label>' +
        '</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center;">' +
          '<b style="color:#334155;">Разделы:</b>' +
          '<button type="button" class="btn-rst" data-mp="1.">1. Общ.</button>' +
          '<button type="button" class="btn-rst" data-mp="2.">2. Цифр.</button>' +
          '<button type="button" class="btn-rst" data-mp="3.">3. Инт.</button>' +
          '<button type="button" class="btn-rst" data-mp="4.">4. Подбл.</button>' +
          '<button type="button" class="btn-rst" data-mp="ЭК-0">5.1. ЭК</button>' +
          '<button type="button" class="btn-rst" data-mp="СЦ-0">5.2. СЦ</button>' +
          '<button type="button" class="btn-rst" data-mp="УЭ-0">5.3. УЭ</button>' +
          '<button type="button" class="btn-rst" data-mp="all">Все</button>' +
          '<button type="button" class="btn-rst" data-mp="none">Снять</button>' +
        '</div>';
      const bodyEl = modal.querySelector(".bm-body") || tList.parentElement.parentElement;
      bodyEl.parentNode.insertBefore(pBar, bodyEl);

      pBar.querySelectorAll("button[data-tp]").forEach(btn => {
        btn.onclick = () => {
          const tp = btn.dataset.tp;
          tList.querySelectorAll(".bm-t-chk").forEach(c => {
            const isRF = (c.dataset.fo === "RF");
            const isFO = (!isRF && c.dataset.reg === "ALL");
            const isReg = (c.dataset.reg !== "ALL");
            if(tp === "rf") c.checked = isRF;
            else if(tp === "fo") c.checked = isFO;
            else if(tp === "reg") c.checked = isReg;
            else c.checked = false;
          });
          updSum();
        };
      });

      tList.addEventListener("change", e => {
        const chk = e.target;
        if(!chk || !chk.classList || !chk.classList.contains("bm-t-chk")) return;
        const autoR = document.getElementById("bmAutoFORegs")?.checked;
        if(autoR && chk.dataset.fo !== "RF" && chk.dataset.reg === "ALL"){
          tList.querySelectorAll('.bm-t-chk[data-fo="' + chk.dataset.fo + '"]').forEach(c => {
            if(c.dataset.reg !== "ALL") c.checked = chk.checked;
          });
          updSum();
        }
      });

      pBar.querySelectorAll("button[data-mp]").forEach(btn => {
        btn.onclick = () => {
          const mp = btn.dataset.mp;
          mList.querySelectorAll(".bm-m-chk").forEach(c => {
            if(mp === "none") c.checked = false;
            else if(mp === "all") c.checked = true;
            else if(mp === "ЭК-0" || mp === "СЦ-0" || mp === "УЭ-0") c.checked = String(c.value).startsWith(mp.slice(0, 3)) && /^..\-\d{2}$/.test(String(c.value));
            else{
              const mObj = (DATA.metrics || []).find(x => x.id === c.value);
              c.checked = Boolean(mObj && String(mObj.group || "").startsWith(mp));
            }
          });
          updSum();
        };
      });
    }

    modal.classList.add("open");
  };
  btnClose.onclick=()=>modal.classList.remove("open");
  document.getElementById("bmRunZip").onclick=()=>runCustomBatchExport("zip");
  document.getElementById("bmRunPdf").onclick=()=>runCustomBatchExport("pdf");
}
function getPassportBatchTasks(){
  const modal=document.getElementById("batchModal"),all=getPassMOs(),sc=modal.querySelector('input[name="bmPassScope"]:checked')?.value||"reg";
  let baseList=Array.of();
  if(sc==="reg")baseList=all.filter(m=>m.reg===(document.getElementById("bmPassReg")?.value||""));
  else if(sc==="fo")baseList=all.filter(m=>m.fo===(document.getElementById("bmPassFO")?.value||""));
  else if(sc==="cat")baseList=all.filter(m=>m.cat===(document.getElementById("bmPassCat")?.value||""));
  else baseList=all.filter(m=>m.coh);
  const yrsSel=Array.from(modal.querySelectorAll(".bm-y-chk:checked")).map(c=>c.value);
  const yrs=yrsSel.length?yrsSel:Array.of(document.getElementById("pYear")?.value||"2024");
  const tasks=Array.of();
  yrs.forEach(yr=>baseList.forEach(mo=>{if(yr==="2024"||mo.coh)tasks.push({yr,mo});}));
  
  const _pScope = document.querySelector('input[name="bmPassScope"]:checked')?.value || "reg";
  if(_pScope === "reg"){
    window._lastPassBatchTag = document.getElementById("bmPassReg")?.value || "";
  }else if(_pScope === "fo"){
    const fVal = document.getElementById("bmPassFO")?.value || "";
    window._lastPassBatchTag = typeof _foShort === "function" ? _foShort(fVal) : fVal;
  }else if(_pScope === "cat"){
    const cEl = document.getElementById("bmPassCat");
    window._lastPassBatchTag = cEl ? String(cEl.options[cEl.selectedIndex]?.text || "").split("(").at(0).trim() : "";
  }else{
    window._lastPassBatchTag = "Когорта_193_МО";
  }
  return tasks;
}
document.addEventListener("DOMContentLoaded",initBatchModal);
