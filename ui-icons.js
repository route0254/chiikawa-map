/* Shared line icons. UI only; saved data and actions stay in their existing modules. */
(function(root){
function createIcon(name) {
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');svg.classList.add('chiikatsu-icon');
  const shapes={bookmark:'M6 3h12v18l-6-4-6 4Z',check:'M5 12l4 4L19 6',visit:'M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM8 12l3 3 5-6',search:'M16 16l5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',location:'M12 21s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12ZM15 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',calendar:'M4 5h16v16H4ZM4 10h16M8 3v4M16 3v4',clock:'M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM12 7v5l3 2',share:'M12 16V3M7 8l5-5 5 5M5 13v8h14v-8',plan:'M5 6h14M5 12h14M5 18h9',info:'M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM12 11v6M12 7v1',close:'M6 6l12 12M18 6 6 18',up:'M6 15l6-6 6 6',down:'M6 9l6 6 6-6',data:'M5 3h10l4 4v14H5ZM15 3v5h4M8 13h8M8 17h6',globe:'M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM4 12h16M12 4c-5 5-5 11 0 16 5-5 5-11 0-16' };
  const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',shapes[name]||shapes.bookmark);svg.append(path);return svg;
}


function decorateAction(element,name) {
 if(element?.classList.contains('site-nav-link'))return;
 if(!element || element.querySelector('.chiikatsu-icon'))return;
 const slot=element.querySelector(':scope > [aria-hidden="true"]');
 if(slot)slot.replaceChildren(createIcon(name));
 else {
  const first=[...element.childNodes].find(node=>node.nodeType===Node.TEXT_NODE);
  if(first)first.textContent=first.textContent.replace(/^[^\p{L}\p{N}]+/u,'');
  element.prepend(createIcon(name));
 }
 element.classList.add('chiikatsu-action');
}
root.ChiikatsuUI={icon:createIcon,decorateAction};
})(window);
