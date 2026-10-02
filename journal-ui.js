/* Cosmetic consistency only. No saved-state, navigation or sharing algorithms. */
(function(){
  const decorate=(selector,icon)=>document.querySelectorAll(selector).forEach(el=>ChiikatsuUI.decorateAction(el,icon));
  function refresh(){
    for(const [selector,icon] of [
      ['#calendar-tab,#plan-calendar,#calendar-share','calendar'],['#favorites-tab,.favorite-remove','bookmark'],['#plan-tab,#plan-optimize','plan'],['#activity-tab','visit'],
      ['#plan-share,#activity-share-image','share'],['#plan-route,#favorites-location','location'],['#save-shared-plan','bookmark']
    ])decorate(selector,icon);
    for(const link of document.querySelectorAll('.site-nav-link')) {
      const href=link.getAttribute('href')||'';
      ChiikatsuUI.decorateAction(link,href.includes('journal')?'bookmark':href.includes('official-links')?'globe':href==='./'?'location':'info');
    }
    for(const card of document.querySelectorAll('.favorite-card')) {
      const heading=card.querySelector('h3');ChiikatsuUI.decorateAction(heading,'bookmark');heading.querySelector('.chiikatsu-icon')?.classList.add('is-saved-mark');
      const remove=card.querySelector('.favorite-remove');remove?.classList.add('is-saved-action');
      for(const button of card.querySelectorAll('button:not(.favorite-remove)'))ChiikatsuUI.decorateAction(button,'plan');
      for(const link of card.querySelectorAll('.favorite-card-actions a'))ChiikatsuUI.decorateAction(link,link.textContent.includes('地図')?'location':'info');
    }
    for(const button of document.querySelectorAll('.plan-stop-actions button')) {
      const label=button.getAttribute('aria-label')||'';const icon=label.includes('1つ前')?'up':label.includes('1つ後')?'down':'close';
      if(!button.querySelector('.chiikatsu-icon')){button.replaceChildren(ChiikatsuUI.icon(icon));button.classList.add('chiikatsu-action');}
    }
    decorate('.plan-stop-map','location');decorate('.plan-candidate button','plan');
  }
  refresh();
  let pending=false;
  new MutationObserver(()=>{if(pending)return;pending=true;queueMicrotask(()=>{pending=false;refresh();});}).observe(document.querySelector('.journal-shell'),{childList:true,subtree:true});
})();
