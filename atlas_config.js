// Единый типографический и макетный стандарт Атласа МО
window.ATLAS_STYLE = {
  fontFamily: "'Times New Roman', Times, serif",
  fonts: {
    title: "bold 44px 'Times New Roman'",
    subtitle: "bold 36px 'Times New Roman'",
    section: "bold 28px 'Times New Roman'",
    body: "24px 'Times New Roman'",
    bodyBold: "bold 24px 'Times New Roman'",
    micro: "bold 20px 'Times New Roman'"
  },
  colors: {
    text: "#111111",
    muted: "#334155",
    border: "#64748b",
    grid: "#cbd5e1",
    headerBg: "#eef3f8",
    corePink: "#e6007e"
  }
};

window._cleanFilePart = function(s){
  return String(s||"").replace(/\s*\([^)]*\)\s*/g," ").replace(/[^a-zA-Z0-9а-яА-ЯёЁ+,_-]+/g,"_").replace(/_+/g,"_").replace(/^_|_$/g,"");
};
window._foShort = function(fo){
  const s = String(fo || "").trim();
  if(!s || s === "RF" || s.includes("Российская")) return "0_РФ";
  if(s.includes("Центральный") || s === "ЦФО") return "1_ЦФО";
  if(s.includes("Северо-Западный") || s === "СЗФО") return "2_СЗФО";
  if(s.includes("Южный") || s === "ЮФО") return "3_ЮФО";
  if(s.includes("Северо-Кавказский") || s === "СКФО") return "4_СКФО";
  if(s.includes("Приволжский") || s === "ПФО") return "5_ПФО";
  if(s.includes("Уральский") || s === "УФО") return "6_УФО";
  if(s.includes("Сибирский") || s === "СФО") return "7_СФО";
  if(s.includes("Дальневосточный") || s === "ДФО") return "8_ДФО";
  return s;
};
window.buildAtlasFileName = function(opts){
  const parts = [];
  if(opts.doc) parts.push(window._cleanFilePart(opts.doc));
  if(opts.fo)  parts.push(window._foShort(opts.fo));
  if(opts.reg && opts.reg !== "ALL") parts.push(window._cleanFilePart(opts.reg));
  if(opts.mo){
    let moStr = window._cleanFilePart(opts.mo);
    if(opts.plus && Number(opts.plus) > 0) moStr += "_+" + Number(opts.plus);
    parts.push(moStr);
  }
  if(opts.met) parts.push(window._cleanFilePart(opts.met));
  if(opts.yr)  parts.push(window._cleanFilePart(opts.yr));
  if(opts.page !== undefined && opts.page !== null){
    parts.push("Стр" + String(opts.page).padStart(2, "0"));
  }
  parts.push(opts.dpi || window._getCurrentDpiTag());
  const base = parts.filter(Boolean).join("_") || "Документ";
  return opts.ext ? (base + "." + opts.ext) : base;
};
window.buildAtlasBatchName = function(opts){
  const parts = ["Пакет"];
  if(opts.doc) parts.push(window._cleanFilePart(opts.doc));
  if(opts.terr) parts.push(window._cleanFilePart(opts.terr));
  if(opts.met) parts.push(window._cleanFilePart(opts.met));
  if(opts.yr) parts.push(window._cleanFilePart(opts.yr));
  parts.push(opts.dpi || window._getCurrentDpiTag());
  const base = parts.filter(Boolean).join("_");
  return opts.ext ? (base + "." + opts.ext) : base;
};

window.formatYearsTag = function(yrs){
  const nums = Array.from(new Set((yrs || []).map(Number).filter(n => !isNaN(n)))).sort((a, b) => a - b);
  if(!nums.length) return "";
  const ranges = [];
  let st = nums[0], prev = nums[0];
  for(let i = 1; i < nums.length; i++){
    if(nums[i] === prev + 1){
      prev = nums[i];
    }else{
      ranges.push(st === prev ? String(st) : (st + "-" + prev));
      st = prev = nums[i];
    }
  }
  ranges.push(st === prev ? String(st) : (st + "-" + prev));
  return ranges.join(",");
};

window._getCurrentDpiTag = function(){
  const raw = document.getElementById("bmDpi")?.value || document.getElementById("selDpi")?.value || "1";
  const sc = Number(raw);
  if(!sc || isNaN(sc)) return "300dpi";
  return Math.round(300 * sc) + "dpi";
};

window.formatAtlasGroupLabel = function(rawGrp){
  const g = String(rawGrp || "").replace(/^5\.1\./, "5.").trim();
  if(g.startsWith("2.")) return "2. Цифровизация";
  if(g.startsWith("3.")) return "3. Интегральный индекс и его субиндексы";
  if(g.startsWith("4.")) return "4. Подблоки показателей";
  return g;
};

window.formatAtlasMetricLabel = function(m){
  if(!m) return "";
  const id = String(m.id || "").trim();
  const title = String(m.title || "").trim();
  if(/^(ЭК|СЦ|УЭ)-\d{2}$/.test(id) || /^(ЭК|СЦ|УЭ)-Подблок\s*\d+$/i.test(id)){
    return id + ": " + title;
  }
  return title || id;
};

(function(){
  const fixDec = () => {
    if(typeof DATA !== "undefined" && DATA && Array.isArray(DATA.metrics)){
      DATA.metrics.forEach(m => {
        if(m && (m.id === "УЭ-13" || m.id === "ЭК-13")) m.dec = 2;
      });
    }
  };
  fixDec();
  window.addEventListener("DOMContentLoaded", fixDec);
})();
