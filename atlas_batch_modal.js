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
    const mode=document.getElementById("selMode").value,c1T=document.getElementById("bmCol1Title"),c2T=document.getElementById("bmCol2Title");
    const tList=document.getElementById("bmTerrList"),mList=document.getElementById("bmMetList"),yList=document.getElementById("bmYrList");
    if(c1T)c1T.textContent=mode==="bench"?"Эталонное МО (кого сравниваем):":(mode==="passport"?"1. Выбор охвата МО":"1. Территории");
    if(c2T)c2T.textContent=mode==="bench"?"Группа сравнения (с кем сравниваем):":(mode==="passport"?"2. Состав паспорта":"2. Показатели и блоки");
    document.getElementById("bmAllTerr").parentElement.style.display=(mode==="bench"||mode==="passport")?"none":"";
    document.getElementById("bmAllMet").parentElement.style.display=(mode==="bench"||mode==="passport")?"none":"";
    document.getElementById("bmAllYr").parentElement.style.display=(mode==="grid"||mode==="table")?"none":"";
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
    const isCoh=(mode==="grid"||mode==="table"||document.getElementById("selBase").value==="coh"),cohRegs=new Set(GEO.features.filter(f=>f.properties.coh&&f.properties._map_status==="В_выборке").map(f=>f.properties.region));
    tList.innerHTML='<label class="bm-grp"><input type="checkbox" class="bm-t-chk" data-fo="RF" data-reg="ALL" checked> Российская Федерация (вся РФ)</label>';
    DATA.fos.forEach(fo=>{tList.insertAdjacentHTML("beforeend",'<label class="bm-grp"><input type="checkbox" class="bm-t-chk" data-fo="'+fo+'" data-reg="ALL"> '+fo+' ФО (целиком)</label>');(DATA.fo_to_regs[fo]||Array.of()).forEach(reg=>{if(!isCoh||cohRegs.has(reg))tList.insertAdjacentHTML("beforeend",'<label class="bm-item"><input type="checkbox" class="bm-t-chk" data-fo="'+fo+'" data-reg="'+reg+'"> '+reg+'</label>');});});
    mList.innerHTML="";const curM=document.getElementById("selMetric").value,grps=Array.of();
    DATA.metrics.forEach(m=>{if((mode==="table"||mode==="grid")&&(m.cat||m.is_cat))return;let g=grps.find(x=>x.name===m.group);if(!g){g={name:m.group,items:Array.of()};grps.push(g);}g.items.push(m);});
    grps.forEach((g,gi)=>{const gId="bmGrp_"+gi;mList.insertAdjacentHTML("beforeend",'<label class="bm-grp"><input type="checkbox" class="bm-g-chk" data-gid="'+gId+'"> '+g.name+'</label>');g.items.forEach(m=>{if(m.id==="ЭК-01"||m.id==="СЦ-01"||m.id==="УЭ-01")mList.insertAdjacentHTML("beforeend",'<div style="font-weight:bold;font-size:11.5px;color:#0369a1;padding:3px 0 1px 8px;">'+(m.id==="ЭК-01"?"Экологический блок (ЭК-01 — ЭК-13)":(m.id==="СЦ-01"?"Социальный блок (СЦ-01 — СЦ-13)":"Управленческо-экономический блок (УЭ-01 — УЭ-13)"))+'</div>');mList.insertAdjacentHTML("beforeend",'<label class="bm-item"><input type="checkbox" class="bm-m-chk" data-gid="'+gId+'" value="'+m.id+'" '+(m.id===curM?"checked":"")+'> '+m.id+' — '+m.title+'</label>');});});
    const curY=document.getElementById("selYear").value;
    yList.innerHTML=(mode==="grid"||mode==="table")?'<div style="color:#475569;padding:4px;">Весь период (2019–2024 гг.)</div>':(!isCoh?'<label class="bm-item"><input type="checkbox" class="bm-y-chk" value="2024" checked disabled> 2024 г. (срез)</label>':Array.of("2019","2020","2021","2022","2023","2024").map(y=>'<label class="bm-item"><input type="checkbox" class="bm-y-chk" value="'+y+'" '+(y===curY?"checked":"")+'> '+y+' г.</label>').join(""));
    modal.querySelectorAll(".bm-g-chk").forEach(gc=>{gc.onchange=()=>{modal.querySelectorAll('.bm-m-chk[data-gid="'+gc.dataset.gid+'"]').forEach(mc=>mc.checked=gc.checked);updSum();};});
    document.getElementById("bmAllTerr").onchange=e=>{modal.querySelectorAll(".bm-t-chk").forEach(c=>c.checked=e.target.checked);updSum();};
    document.getElementById("bmAllMet").onchange=e=>{modal.querySelectorAll(".bm-m-chk,.bm-g-chk").forEach(c=>c.checked=e.target.checked);updSum();};
    document.getElementById("bmAllYr").onchange=e=>{modal.querySelectorAll(".bm-y-chk:not(:disabled)").forEach(c=>c.checked=e.target.checked);updSum();};
    modal.querySelectorAll("input[type=checkbox]").forEach(c=>c.addEventListener("change",updSum));updSum();modal.classList.add("open");
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
  return tasks;
}
document.addEventListener("DOMContentLoaded",initBatchModal);
