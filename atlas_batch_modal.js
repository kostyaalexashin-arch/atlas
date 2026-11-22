function initBatchModal(){
  const modal=document.getElementById("batchModal"),btnOpen=document.getElementById("btnOpenBatch"),btnClose=document.getElementById("btnCloseBatch");
  if(!modal||!btnOpen)return;
  const updSum=()=>{
    const mode=document.getElementById("selMode")?.value||"single";
    if(mode==="bench"){
      const baseK=document.getElementById("bmBenchBaseMO")?.value||"",scope=modal.querySelector('input[name="bmBenchScope"]:checked')?.value||"reg";
      const all=getBenchMOs(),baseMO=all.find(m=>m.key===baseK);
      let cnt=0;
      if(baseMO){
        if(scope==="cat")cnt=all.filter(m=>m.key!==baseMO.key&&m.cat===baseMO.cat).length;
        else if(scope==="fo")cnt=all.filter(m=>m.key!==baseMO.key&&m.fo===baseMO.fo).length;
        else cnt=all.filter(m=>m.key!==baseMO.key&&m.reg===baseMO.reg).length;
      }
      document.getElementById("bmSummary").textContent="Парных сравнений 1 на 1: "+cnt+" (по 2 листа каждое = "+(cnt*2)+" стр.)";
      return;
    }
    if(mode==="passport"){
      const cnt=getPassportBatchList().length;
      document.getElementById("bmSummary").textContent="Выбрано паспортов МО: "+cnt+" (по 1 листу А4)";
      return;
    }
    const tCnt=modal.querySelectorAll(".bm-t-chk:checked").length,mCnt=modal.querySelectorAll(".bm-m-chk:checked").length,yCnt=Math.max(1,modal.querySelectorAll(".bm-y-chk:checked").length);
    const mult=(mode==="single"&&document.getElementById("selBase")?.value==="coh")?yCnt:1;
    document.getElementById("bmSummary").textContent="Выбрано позиций: "+(tCnt*mCnt*mult)+" (территорий: "+tCnt+", показателей: "+mCnt+")";
  };
  btnOpen.onclick=()=>{
    const mode=document.getElementById("selMode").value;
    const tList=document.getElementById("bmTerrList"),mList=document.getElementById("bmMetList"),yList=document.getElementById("bmYrList");
    Array.of("bmAllTerr","bmAllMet","bmAllYr").forEach(id=>{const el=document.getElementById(id);if(el){el.checked=false;el.parentElement.style.display=(mode==="bench"||mode==="passport")?"none":"";}});
    if(mode==="bench"){
      initBenchControls();const all=getBenchMOs(),curK=BENCH_STATE.mainKey||(all.at(0)?.key||"");
      tList.innerHTML='<div style="font-weight:bold;margin-bottom:4px;">Эталонное МО (с кем сравниваем):</div><select id="bmBenchBaseMO" style="width:100%;height:30px;padding:2px 6px;">'+all.map(m=>'<option value="'+m.key+'" '+(m.key===curK?"selected":"")+'>'+m.full+'</option>').join("")+'</select><div style="font-size:11.5px;color:#475569;margin-top:8px;">Сравнение формируется строго <b>1 на 1</b> (эталонное МО против каждого МО выбранной группы по очереди).</div>';
      mList.innerHTML='<div style="font-weight:bold;margin-bottom:6px;">Группа сравнения (1 на 1):</div>'+
        '<label class="bm-item"><input type="radio" name="bmBenchScope" value="reg" checked> 1) Все МО внутри региона эталонного МО</label>'+
        '<label class="bm-item"><input type="radio" name="bmBenchScope" value="fo"> 2) Все МО внутри ФО эталонного МО</label>'+
        '<label class="bm-item"><input type="radio" name="bmBenchScope" value="cat"> 3) Все МО внутри категории эталонного МО</label>';
      const yr=document.getElementById("bYear")?.value||"2024";
      yList.innerHTML='<div style="padding:4px;">Год сравнения: <b>'+yr+' г.</b><br><span style="font-size:11px;color:#64748b;">(меняется в левой панели)</span></div>';
      modal.querySelectorAll("select,input").forEach(el=>el.addEventListener("change",updSum));
      updSum();modal.classList.add("open");return;
    }
    if(mode==="passport"){
      initPassportControls();const all=getPassMOs(),curMO=all.find(m=>m.key===PASS_STATE.key);
      const fos=Array.from(new Set(all.map(m=>m.fo))).sort((a,b)=>a.localeCompare(b,"ru"));
      const regs=Array.from(new Set(all.map(m=>m.reg))).sort((a,b)=>a.localeCompare(b,"ru"));
      tList.innerHTML='<div style="font-weight:bold;margin-bottom:4px;">Охват выгрузки паспортов:</div>'+
        '<label class="bm-item"><input type="radio" name="bmPassScope" value="reg" checked> Все МО выбранного региона</label>'+
        '<select id="bmPassReg" style="width:100%;height:28px;margin:2px 0 6px 0;">'+regs.map(r=>'<option value="'+r+'" '+(curMO&&curMO.reg===r?"selected":"")+'>'+r+'</option>').join("")+'</select>'+
        '<label class="bm-item"><input type="radio" name="bmPassScope" value="fo"> Все МО выбранного ФО</label>'+
        '<select id="bmPassFO" style="width:100%;height:28px;margin:2px 0 6px 0;">'+fos.map(f=>'<option value="'+f+'" '+(curMO&&curMO.fo===f?"selected":"")+'>'+f+' ФО</option>').join("")+'</select>'+
        '<label class="bm-item"><input type="radio" name="bmPassScope" value="cat"> По категории МО</label>'+
        '<select id="bmPassCat" style="width:100%;height:28px;margin:2px 0 6px 0;">'+Object.entries(PASS_CAT_NAMES).map(p=>'<option value="'+p.at(0)+'" '+(curMO&&curMO.cat===p.at(0)?"selected":"")+'>'+p.at(1)+'</option>').join("")+'</select>'+
        '<label class="bm-item"><input type="radio" name="bmPassScope" value="coh"> Все 193 МО динамической когорты</label>';
      mList.innerHTML='<div style="padding:6px;color:#334155;">В каждый паспорт автоматически включаются:<br>• Общая характеристика МО<br>• Диаграмма и таблица 4 субиндексов<br>• Диаграмма и таблица 9 подблоков<br>• Все 39 частных показателей (ЭК, СЦ, УЭ)</div>';
      const yr=document.getElementById("pYear")?.value||"2024";
      yList.innerHTML='<div style="padding:4px;">Год паспорта: <b>'+yr+' г.</b><br><span style="font-size:11px;color:#64748b;">(для некоргортных МО автоматически используется 2024 г.)</span></div>';
      modal.querySelectorAll("select,input").forEach(el=>el.addEventListener("change",updSum));
      updSum();modal.classList.add("open");return;
    }
    const isCoh=(mode==="grid"||mode==="table"||document.getElementById("selBase").value==="coh");
    const cohRegs=new Set(GEO.features.filter(f=>f.properties.coh&&f.properties._map_status==="В_выборке").map(f=>f.properties.region));
    tList.innerHTML='<label class="bm-grp"><input type="checkbox" class="bm-t-chk" data-fo="RF" data-reg="ALL" checked> Российская Федерация (вся РФ)</label>';
    DATA.fos.forEach(fo=>{
      tList.insertAdjacentHTML("beforeend",'<label class="bm-grp"><input type="checkbox" class="bm-t-chk" data-fo="'+fo+'" data-reg="ALL"> '+fo+' ФО (целиком)</label>');
      (DATA.fo_to_regs[fo]||Array.of()).forEach(reg=>{
        if(isCoh&&!cohRegs.has(reg))return;
        tList.insertAdjacentHTML("beforeend",'<label class="bm-item"><input type="checkbox" class="bm-t-chk" data-fo="'+fo+'" data-reg="'+reg+'"> '+reg+'</label>');
      });
    });
    mList.innerHTML="";const curM=document.getElementById("selMetric").value,grps=Array.of();
    DATA.metrics.forEach(m=>{
      if((mode==="table"||mode==="grid")&&(m.cat||m.is_cat))return;
      let g=grps.find(x=>x.name===m.group);if(!g){g={name:m.group,items:Array.of()};grps.push(g);}g.items.push(m);
    });
    grps.forEach((g,gi)=>{
      const gId="bmGrp_"+gi;
      mList.insertAdjacentHTML("beforeend",'<label class="bm-grp"><input type="checkbox" class="bm-g-chk" data-gid="'+gId+'"> '+g.name+'</label>');
      g.items.forEach(m=>{
        const chk=(m.id===curM)?"checked":"";
        mList.insertAdjacentHTML("beforeend",'<label class="bm-item"><input type="checkbox" class="bm-m-chk" data-gid="'+gId+'" value="'+m.id+'" '+chk+'> '+m.id+' — '+m.title+'</label>');
      });
    });
    yList.innerHTML="";const curY=document.getElementById("selYear").value;
    if(mode==="grid"||mode==="table"){yList.innerHTML='<div style="color:#475569;padding:4px;">Весь период (2019–2024 гг.)</div>';}
    else if(!isCoh){yList.innerHTML='<label class="bm-item"><input type="checkbox" class="bm-y-chk" value="2024" checked disabled> 2024 г. (срез)</label>';}
    else{Array.of("2019","2020","2021","2022","2023","2024").forEach(y=>yList.insertAdjacentHTML("beforeend",'<label class="bm-item"><input type="checkbox" class="bm-y-chk" value="'+y+'" '+(y===curY?"checked":"")+'> '+y+' г.</label>'));}
    modal.querySelectorAll(".bm-g-chk").forEach(gc=>{gc.onchange=()=>{modal.querySelectorAll('.bm-m-chk[data-gid="'+gc.dataset.gid+'"]').forEach(mc=>mc.checked=gc.checked);updSum();};});
    document.getElementById("bmAllTerr").onchange=e=>{modal.querySelectorAll(".bm-t-chk").forEach(c=>c.checked=e.target.checked);updSum();};
    document.getElementById("bmAllMet").onchange=e=>{modal.querySelectorAll(".bm-m-chk,.bm-g-chk").forEach(c=>c.checked=e.target.checked);updSum();};
    document.getElementById("bmAllYr").onchange=e=>{modal.querySelectorAll(".bm-y-chk:not(:disabled)").forEach(c=>c.checked=e.target.checked);updSum();};
    modal.querySelectorAll("input[type=checkbox]").forEach(c=>c.addEventListener("change",updSum));
    updSum();modal.classList.add("open");
  };
  btnClose.onclick=()=>modal.classList.remove("open");
  document.getElementById("bmRunZip").onclick=()=>runCustomBatchExport("zip");
  document.getElementById("bmRunPdf").onclick=()=>runCustomBatchExport("pdf");
}
function getPassportBatchList(){
  const modal=document.getElementById("batchModal"),all=getPassMOs();
  const sc=modal.querySelector('input[name="bmPassScope"]:checked')?.value||"reg";
  if(sc==="reg"){const r=document.getElementById("bmPassReg")?.value||"";return all.filter(m=>m.reg===r);}
  if(sc==="fo"){const f=document.getElementById("bmPassFO")?.value||"";return all.filter(m=>m.fo===f);}
  if(sc==="cat"){const c=document.getElementById("bmPassCat")?.value||"";return all.filter(m=>m.cat===c);}
  return all.filter(m=>m.coh);
}
document.addEventListener("DOMContentLoaded",initBatchModal);
