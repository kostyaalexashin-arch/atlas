let DIST_INITED = false;

function initDistControls(){
  if(DIST_INITED || !DATA || !GEO) return;
  DIST_INITED = true;
  const clSel = document.getElementById("dCluster");
  if(clSel){
    Object.keys(DATA.cluster_colors || {}).forEach(cn => clSel.add(new Option(cn, cn)));
  }
  Array.of("dCat", "dCluster", "dBins", "dSplitMode", "dScaleMode").forEach(id => {
    const el = document.getElementById(id);
    if(el) el.onchange = () => { if(document.getElementById("selMode")?.value === "dist") renderDistView(); };
  });
}

function getDistSample(isCoh, yr, fo, reg, catFilter, clustFilter){
  const seen = new Set(), res = [];
  GEO.features.forEach(f => {
    const p = f.properties;
    if(!p || p._map_status !== "В_выборке" || p._inset || seen.has(p.join_key)) return;
    seen.add(p.join_key);
    if(isCoh && !p.coh) return;
    if(fo !== "RF" && p.fo !== fo) return;
    if(reg !== "ALL" && p.region !== reg) return;
    const moCat = String(DATA.panel_cats?.[yr]?.[p.join_key] || p.cat || "5");
    if(catFilter !== "ALL" && moCat !== catFilter) return;
    const moClust = DATA.v2024?.["Кластер 2024"]?.[p.join_key] || DATA.panel?.["Кластер 2024"]?.["2024"]?.[p.join_key] || "";
    if(clustFilter !== "ALL" && moClust !== clustFilter) return;
    res.push(p);
  });
  return res;
}

function renderDistView(){
  initDistControls();
  const box = document.getElementById("sheetBox");
  if(!box || !DATA || !GEO) return;

  const mId = document.getElementById("selMetric")?.value;
  let mMeta = DATA.metrics.find(m => m.id === mId) || DATA.metrics.at(0);
  if(mMeta && (mMeta.cat || mMeta.is_cat)){
    const firstNum = DATA.metrics.find(m => !(m.cat || m.is_cat) && /^(ЭК|СЦ|УЭ|Индекс|IQ)/.test(String(m.id)));
    if(firstNum){
      mMeta = firstNum;
      const sMet = document.getElementById("selMetric");
      if(sMet) sMet.value = firstNum.id;
    }
  }

  const isCoh = (document.getElementById("selBase")?.value === "coh");
  const yr = isCoh ? (document.getElementById("selYear")?.value || "2024") : "2024";
  const fo = document.getElementById("selFO")?.value || "RF";
  const reg = document.getElementById("selReg")?.value || "ALL";
  const catFilter = document.getElementById("dCat")?.value || "ALL";
  const clustFilter = document.getElementById("dCluster")?.value || "ALL";
  const binsCnt = Math.max(3, Math.min(12, Number(document.getElementById("dBins")?.value || 5)));
  const splitMode = document.getElementById("dSplitMode")?.value || "equal";
  const scaleMode = document.getElementById("dScaleMode")?.value || "global";

  const valMap = (!isCoh && yr === "2024") ? (DATA.v2024?.[mMeta.id] || {}) : (DATA.panel?.[mMeta.id]?.[yr] || {});
  const subMOs = getDistSample(isCoh, yr, fo, reg, catFilter, clustFilter);
  const subVals = subMOs.map(p => Number(valMap[p.join_key])).filter(v => !isNaN(v) && isFinite(v)).sort((a, b) => a - b);
  const refMOs = (scaleMode === "global") ? getDistSample(isCoh, yr, "RF", "ALL", "ALL", "ALL") : subMOs;
  const refVals = refMOs.map(p => Number(valMap[p.join_key])).filter(v => !isNaN(v) && isFinite(v)).sort((a, b) => a - b);

  const terrTitle = reg !== "ALL" ? reg : (fo === "RF" ? "Российская Федерация" : fo + " федеральный округ");
  const filterTags = [terrTitle];
  if(catFilter !== "ALL") filterTags.push(document.getElementById("dCat")?.selectedOptions?.text || "");
  if(clustFilter !== "ALL") filterTags.push("Кластер: " + clustFilter);
  filterTags.push(isCoh ? ("Когорта 193 МО, " + yr + " г.") : "Генеральный срез 2024 г.");

  box.innerHTML = "";
  box.style.display = "flex";
  box.style.flexDirection = "column";
  box.style.justifyContent = "space-between";
  box.style.overflow = "hidden";

  const hdr = document.createElement("div");
  hdr.className = "sheet-hdr";
  hdr.innerHTML = `<div class="hdr-met">${wrapTitle("Распределение МО: " + mMeta.title + " (" + yr + " г.)", 95)}</div>` +
                  `<div class="hdr-terr" style="font-size:13.5px;color:#334155;">${filterTags.join(" • ")} | Шкала: ${scaleMode === "global" ? "основная (вся РФ)" : "вспомогательная (по выборке)"} (${binsCnt} групп)</div>`;
  box.appendChild(hdr);

  if(!subVals.length || !refVals.length){
    const empty = document.createElement("div");
    empty.style.cssText = "flex:1;display:flex;align-items:center;justify-content:center;font-size:17px;color:#64748b;";
    empty.textContent = "Нет муниципальных образований с числовыми данными для выбранной комбинации фильтров.";
    box.appendChild(empty);
    return;
  }

  const edges = [];
  if(splitMode === "quantile" && refVals.length >= binsCnt){
    edges.push(refVals);
    for(let b = 1; b < binsCnt; b++){
      edges.push(refVals[Math.min(refVals.length - 1, Math.floor((b / binsCnt) * refVals.length))]);
    }
    edges.push(refVals[refVals.length - 1]);
  }else{
    const vmin = refVals;
    const vmax = (refVals[refVals.length - 1] > vmin) ? refVals[refVals.length - 1] : (vmin + 1e-6);
    const step = (vmax - vmin) / binsCnt;
    for(let b = 0; b <= binsCnt; b++) edges.push(vmin + b * step);
  }

  const counts = new Array(binsCnt).fill(0);
  subVals.forEach(v => {
    let idx = binsCnt - 1;
    for(let b = 0; b < binsCnt; b++){
      const isLast = (b === binsCnt - 1);
      if((v >= edges[b] && v < edges[b + 1]) || (isLast && v >= edges[b] && v <= edges[b + 1] + 1e-9)){
        idx = b;
        break;
      }
    }
    if(v < edges) idx = 0;
    counts[idx]++;
  });

  const dec = (mMeta.dec !== undefined && mMeta.dec !== null) ? mMeta.dec : 2;
  const rawPal = PALETTES[currentPal] || PALETTES["RdYlGn"];
  const pal = mMeta.inv ? rawPal.slice().reverse() : rawPal;

  const xLabels = [], barColors = [], barTexts = [], totalN = subVals.length;
  for(let b = 0; b < binsCnt; b++){
    const brL = (b === 0) ? "[" : "(";
    xLabels.push(`${brL}${fmtNum(edges[b], dec)}; ${fmtNum(edges[b + 1], dec)}]`);
    const u = binsCnt === 1 ? 0.5 : (b / (binsCnt - 1));
    barColors.push(pal[Math.min(pal.length - 1, Math.floor(u * pal.length))]);
    const pct = ((counts[b] / totalN) * 100).toFixed(1).replace(".", ",");
    barTexts.push(`<b>${counts[b]}</b> (${pct}%)`);
  }

  const chartDiv = document.createElement("div");
  chartDiv.id = "mapDiv";
  chartDiv.style.cssText = "width:100%;flex:1;min-height:0;";
  box.appendChild(chartDiv);

  const meanV = subVals.reduce((s, x) => s + x, 0) / totalN;
  const medV = (totalN % 2 === 1) ? subVals[Math.floor(totalN / 2)] : (subVals[totalN / 2 - 1] + subVals[totalN / 2]) / 2;
  const stdV = Math.sqrt(subVals.reduce((s, x) => s + Math.pow(x - meanV, 2), 0) / totalN);

  const statBar = document.createElement("div");
  statBar.className = "footer-grid";
  statBar.style.cssText = "height:auto;min-height:46px;padding:6px 12px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:4px;display:flex;justify-content:space-around;align-items:center;font-size:13.5px;flex-wrap:wrap;gap:12px;";
  statBar.innerHTML =
    `<span><b>Объём выборки (N):</b> ${totalN} МО</span>` +
    `<span><b>Среднее:</b> ${fmtNum(meanV, dec)}</span>` +
    `<span><b>Медиана:</b> ${fmtNum(medV, dec)}</span>` +
    `<span><b>Мин / Макс:</b> ${fmtNum(subVals, dec)} / ${fmtNum(subVals[totalN - 1], dec)}</span>` +
    `<span><b>Ст. отклонение:</b> ${fmtNum(stdV, dec)}</span>`;
  box.appendChild(statBar);

  const maxCnt = Math.max(...counts, 1);
  window._plotReady = Plotly.newPlot(chartDiv, [{
    type: "bar", x: xLabels, y: counts, text: barTexts, textposition: "outside", cliponaxis: false,
    textfont: { family: "Times New Roman", size: 13, color: "#111111" },
    marker: { color: barColors, line: { color: "#334155", width: 1.1 } },
    hovertemplate: "Интервал: <b>%{x}</b><br>Число МО: <b>%{y}</b><extra></extra>"
  }], {
    margin: { l: 58, r: 24, t: 28, b: 64 },
    height: Math.max(360, chartDiv.clientHeight || 520),
    font: { family: "Times New Roman", size: 13, color: "#111111" },
    xaxis: { title: { text: "Интервалы значений показателя (" + (scaleMode === "global" ? "основная шкала РФ" : "вспомогательная шкала выборки") + ")", font: { size: 14 } }, tickangle: binsCnt > 7 ? -22 : 0, linecolor: "#64748b", linewidth: 1 },
    yaxis: { title: { text: "Количество муниципальных образований, ед.", font: { size: 14 } }, range: [0, maxCnt * 1.16], gridcolor: "#e2e8f0", linecolor: "#64748b", linewidth: 1 },
    plot_bgcolor: "#ffffff", paper_bgcolor: "#ffffff", bargap: 0.18
  }, { responsive: true, displaylogo: false, modeBarButtonsToRemove: ["toImage"] });
}
