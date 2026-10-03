/* Keep a map search when moving between site pages in this tab. */
(() => {
  const key = 'chiikawa-map-search-return-v1';
  const navigation=document.querySelector('.site-nav');
  const header=document.querySelector('.site-header');
  const main=document.querySelector('main');
  if(navigation)document.body.classList.add('with-site-navigation');
  const measure=()=>{
    const navigationHeight=navigation?.getBoundingClientRect().height || 100;
    const contentTop=(main?.getBoundingClientRect().top || 0) + window.scrollY;
    const fixedContentTop=contentTop-(document.body.classList.contains('navigation-flow')?navigationHeight:0);
    if(!document.body.classList.contains('home-map'))document.body.classList.toggle('navigation-flow', innerWidth<=680 && innerHeight-fixedContentTop-navigationHeight<240);
    document.documentElement.style.setProperty('--site-navigation-height', `${navigationHeight}px`);
    document.documentElement.style.setProperty('--site-header-height', `${header?.getBoundingClientRect().height || 56}px`);
    document.documentElement.style.setProperty('--site-content-top', `${contentTop}px`);
  };
  const observer=new ResizeObserver(measure);
  if(navigation)observer.observe(navigation);
  if(header)observer.observe(header);
  const notice=document.querySelector('.site-notice');if(notice)observer.observe(notice);
  measure();
  window.addEventListener('resize',measure);
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href]');
    if (!link || event.defaultPrevented) return;
    const target = new URL(link.href, location.href);
    if (target.origin !== location.origin) return;
    const home = new URL(document.body.classList.contains('spot-page') ? '../../' : './', location.href);
    try {
      if (document.body.classList.contains('home-map')) {
        if (target.pathname !== home.pathname && typeof getCurrentFiltersShareUrl === 'function') {
          sessionStorage.setItem(key, new URL(getCurrentFiltersShareUrl()).search);
        }
      } else if (target.pathname === home.pathname && (link.classList.contains('site-nav-link') || target.searchParams.has('spot'))) {
        const saved = new URLSearchParams(sessionStorage.getItem(key) || '');
        for (const [name, value] of saved) if (!target.searchParams.has(name)) target.searchParams.set(name, value);
        link.href = target.href;
      }
    } catch { /* Navigation remains available when browser storage is disabled. */ }
  });
})();
