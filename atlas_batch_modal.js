function initBatchModal(){
  const modal=document.getElementById("batchModal"),btnOpen=document.getElementById("btnOpenBatch"),btnClose=document.getElementById("btnCloseBatch");
  if(!modal||!btnOpen)return;
  const updSum=()=>{
    const tCnt=modal.querySelectorAll(".bm-t-chk:checked").length,mCnt=modal.querySelectorAll(".bm-m-chk:checked").length,yCnt=Math.max(1,modal.querySelectorAll(".bm-y-chk:checked").length);
    const mode=document.getElementById("selMode")?.value||"single",mult=(mode==="single"&&document.getElementById("selBase")?.value==="coh")?yCnt:1;
    document.getElementById("bmSummary").textContent="Выбрано позиций: "+(tCnt*mCnt*mult)+" (территорий: "+tCnt+", показателей: "+mCnt+")";
  };
  btnOpen.onclick=()=>{
    const mode=document.getElementById("selMode").value;
    if(mode==="bench"||mode==="passport"){alert("Для режимов Паспорт и Бенчмаркинг используйте кнопки PNG / PDF в левой панели.");return;}
    const tList=document.getElementById("bmTerrList"),mList=document.getElementById("bmMetList"),yList=document.getElementById("bmYrList");
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
    document.getElementById("bmAllTerr").checked=false;document.getElementById("bmAllTerr").onchange=e=>{modal.querySelectorAll(".bm-t-chk").forEach(c=>c.checked=e.target.checked);updSum();};
    document.getElementById("bmAllMet").checked=false;document.getElementById("bmAllMet").onchange=e=>{modal.querySelectorAll(".bm-m-chk,.bm-g-chk").forEach(c=>c.checked=e.target.checked);updSum();};
    document.getElementById("bmAllYr").checked=false;document.getElementById("bmAllYr").onchange=e=>{modal.querySelectorAll(".bm-y-chk:not(:disabled)").forEach(c=>c.checked=e.target.checked);updSum();};
    modal.querySelectorAll("input[type=checkbox]").forEach(c=>c.addEventListener("change",updSum));
    updSum();modal.classList.add("open");
  };
  btnClose.onclick=()=>modal.classList.remove("open");
  document.getElementById("bmRunZip").onclick=()=>runCustomBatchExport("zip");
  document.getElementById("bmRunPdf").onclick=()=>runCustomBatchExport("pdf");
}
document.addEventListener("DOMContentLoaded",initBatchModal);
