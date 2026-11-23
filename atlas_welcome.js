// Модуль управления стартовым экраном и навигацией по разделам атласа

window.toggleWelcomeBatchCats = function(){
  const row = document.getElementById('welcomeBatchSubRow');
  if(row) row.style.display = (row.style.display === 'none' || !row.style.display) ? 'grid' : 'none';
};

window.openBatchFromWelcome = function(targetMode){
  const sMode = document.getElementById('selMode');
  if(sMode && targetMode){
    sMode.value = targetMode;
    if(!sMode.value && sMode.options.length) sMode.selectedIndex = 0;
    if(typeof syncControls === 'function') syncControls();
  }
  const btnB = document.getElementById('btnOpenBatch') || document.querySelector('[onclick*="batch"], #btnBatch');
  if(btnB) btnB.click();
};

window.startAtlasMode = function(modeVal){
  window._welcomeDismissed = true;
  document.body.classList.remove('welcome-active');
  const sb = document.getElementById('mainSidebar') || document.querySelector('.sidebar');
  if(sb) sb.style.display = 'flex';
  const ov = document.getElementById('welcomeOverlay');
  if(ov) ov.style.display = 'none';
  const btnH = document.getElementById('btnGoHome');
  if(btnH) btnH.style.display = 'inline-block';
  const sMode = document.getElementById('selMode');
  if(sMode && modeVal){
    sMode.value = (modeVal === 'single') ? 'map' : modeVal;
    if(!sMode.value && sMode.options.length) sMode.selectedIndex = 0;
    if(typeof syncControls === 'function') syncControls();
  }
  if(typeof render === 'function') render();
};

window.returnToWelcome = function(){
  window._welcomeDismissed = false;
  document.body.classList.add('welcome-active');
  const sb = document.getElementById('mainSidebar') || document.querySelector('.sidebar');
  if(sb) sb.style.display = 'none';
  const ov = document.getElementById('welcomeOverlay');
  if(ov) ov.style.display = 'flex';
  const btnH = document.getElementById('btnGoHome');
  if(btnH) btnH.style.display = 'none';
  if(typeof renderRandomAtlasFact === 'function')void 0;};
