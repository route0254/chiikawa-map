/* Cosmetic consistency only. No saved-state, navigation or sharing algorithms. */
(function(){
  const main=document.querySelector('.journal-shell');
  const hero=main.querySelector('.journal-hero');
  const about=document.createElement('details');about.className='journal-about-drawer';
  const summary=document.createElement('summary');summary.append(ChiikatsuUI.icon('info'),document.createTextNode('手帳について・保存件数'));
  about.append(summary,hero);main.insertBefore(about,main.querySelector('.home-screen-card'));
  const activity=document.querySelector('#activity-view');
  activity.insertBefore(activity.querySelector('.recent-activity-panel'),activity.querySelector('.activity-summary-card'));
  document.querySelector('#plan-list').after(document.querySelector('.plan-actions'));
  function wrapWords(element){
    if(!element||element.dataset.wordsWrapped)return;
    element.dataset.wordsWrapped='true';
    for(const text of [...element.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE)){
      const parts=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('ja',{granularity:'word'}).segment(text.textContent)].map(part=>part.segment):[text.textContent];
      for(let i=parts.length-1;i>0;i--)if(/^[店館場]$/.test(parts[i])){parts[i-1]+=parts[i];parts.splice(i,1);}
      const fragment=document.createDocumentFragment();
      for(const part of parts){const span=document.createElement('span');span.className='journal-name-part';span.textContent=part;fragment.append(span);}
      text.replaceWith(fragment);
    }
  }
  for(const tab of document.querySelectorAll('.journal-tab'))for(const text of [...tab.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE&&node.textContent.trim())){
    const label=document.createElement('span');label.className='journal-tab-label';label.textContent=text.textContent.trim();
    const words={'わたしの足あと':['わたしの','足あと'],'今日のプラン':['今日の','プラン']}[label.textContent];
    if(words){label.replaceChildren();for(const word of words){const part=document.createElement('span');part.textContent=word;label.append(part);}}
    text.replaceWith(label);
  }
  const route=document.querySelector('#plan-route');
  for(const text of [...route.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE&&node.textContent.trim())){
    const label=document.createElement('span');label.className='journal-action-label';
    for(const word of ['地図アプリで','経路を開く']){const part=document.createElement('span');part.textContent=word;label.append(part);}text.replaceWith(label);
  }
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
      wrapWords(heading);
    }
    for(const button of document.querySelectorAll('.plan-stop-actions button')) {
      const label=button.getAttribute('aria-label')||'';const icon=label.includes('1つ前')?'up':label.includes('1つ後')?'down':'close';
      if(!button.querySelector('.chiikatsu-icon')){button.replaceChildren(ChiikatsuUI.icon(icon));button.classList.add('chiikatsu-action');}
    }
    decorate('.plan-stop-map','location');decorate('.plan-candidate button','plan');
    document.querySelectorAll('.plan-stop-copy strong,.plan-candidate-copy strong').forEach(wrapWords);
  }
  refresh();
  let pending=false;
  new MutationObserver(()=>{if(pending)return;pending=true;queueMicrotask(()=>{pending=false;refresh();});}).observe(document.querySelector('.journal-shell'),{childList:true,subtree:true});
})();
