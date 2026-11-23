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
  return String(s||"").replace(/\s*\([^)]*\)\s*/g," ").replace(/[^a-zA-Z0-9а-яА-ЯёЁ+_-]+/g,"_").replace(/_+/g,"_").replace(/^_|_$/g,"");
};
window._foShort = function(fo){
  const m = {"Центральный":"ЦФО","Северо-Западный":"СЗФО","Южный":"ЮФО","Северо-Кавказский":"СКФО","Приволжский":"ПФО","Уральский":"УФО","Сибирский":"СФО","Дальневосточный":"ДФО","RF":"РФ"};
  return m[fo] || window._cleanFilePart(fo);
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
  const base = parts.filter(Boolean).join("_") || "Документ";
  return opts.ext ? (base + "." + opts.ext) : base;
};
window.buildAtlasBatchName = function(opts){
  const parts = ["Пакет"];
  if(opts.doc) parts.push(window._cleanFilePart(opts.doc));
  if(opts.terr) parts.push(window._cleanFilePart(opts.terr));
  if(opts.met) parts.push(window._cleanFilePart(opts.met));
  if(opts.yr) parts.push(window._cleanFilePart(opts.yr));
  const base = parts.filter(Boolean).join("_");
  return opts.ext ? (base + "." + opts.ext) : base;
};
