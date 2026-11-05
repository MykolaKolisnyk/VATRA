/* VATRA shared outline icons — one central source, no repeated SVG paths in UI templates.
   24px optical grid; consistent round joins and 1.9px line weight. */
(()=>{
 'use strict';
 const GLYPHS={
 "profile": "<circle cx=\"12\" cy=\"8\" r=\"3.7\"/><path d=\"M4.8 20c.3-4.2 2.7-6.3 7.2-6.3s6.9 2.1 7.2 6.3\"/>",
 "friends": "<circle cx=\"8.7\" cy=\"8.5\" r=\"3.1\"/><path d=\"M2.5 20c.4-3.6 2.6-5.5 6.2-5.5s5.7 1.9 6.1 5.5\"/><path d=\"M15.5 5.5a3.2 3.2 0 0 1 0 6.3M17 14.8c2.8.4 4.2 2.2 4.5 5.2\"/>",
 "news": "<rect x=\"4\" y=\"3\" width=\"16\" height=\"18\" rx=\"2\"/><path d=\"M8 8h8M8 12h8M8 16h5\"/>",
 "home": "<path d=\"m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z\"/><path d=\"M9 21v-7h6v7\"/>",
 "message": "<path d=\"M4 4.5h16a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H9l-6 3V6.5a2 2 0 0 1 1-2Z\"/><path d=\"M8 10h8M8 14h5\"/>",
 "community": "<circle cx=\"12\" cy=\"7.5\" r=\"3\"/><path d=\"M5 19c.4-4 2.7-6.2 7-6.2s6.6 2.2 7 6.2\"/><path d=\"M4.6 8.8a2.4 2.4 0 1 0 0 4.8M19.4 8.8a2.4 2.4 0 1 1 0 4.8M1.7 20c.1-2.4 1.1-3.9 3.2-4.6M22.3 20c-.1-2.4-1.1-3.9-3.2-4.6\"/>",
 "photos": "<rect x=\"2.5\" y=\"3.5\" width=\"19\" height=\"17\" rx=\"3\"/><circle cx=\"8.5\" cy=\"9\" r=\"1.6\"/><path d=\"m4.8 18 5.1-5.3 3.2 3.1 2.6-2.3 3.6 4.5\"/>",
 "music": "<path d=\"M9 18V5l11-2v13M9 9l11-2\"/><ellipse cx=\"6\" cy=\"18.4\" rx=\"3\" ry=\"2.4\"/><ellipse cx=\"17\" cy=\"16.4\" rx=\"3\" ry=\"2.4\"/>",
 "video": "<rect x=\"2.5\" y=\"4.5\" width=\"19\" height=\"15\" rx=\"3\"/><path d=\"m10 9 5.5 3-5.5 3V9Z\"/>",
 "clips": "<rect x=\"6\" y=\"2\" width=\"12\" height=\"20\" rx=\"3.2\"/><path d=\"m10 8 5.1 4-5.1 4V8Z\"/>",
 "gift": "<rect x=\"3.2\" y=\"10\" width=\"17.6\" height=\"11\" rx=\"1.7\"/><path d=\"M2.3 7.6h19.4V11H2.3zM12 7.6V21\"/><path d=\"M12 7.6C7 7.3 5 5.7 6.4 3.5C8 1 11 4.3 12 7.6ZM12 7.6c5-.3 7-1.9 5.6-4.1C16 1 13 4.3 12 7.6Z\"/>",
 "bookmark": "<path d=\"M6 3.5h12v17l-6-4-6 4v-17Z\"/>",
 "file": "<path d=\"M6 2.5h8l5 5V21H6a2 2 0 0 1-2-2V4.5a2 2 0 0 1 2-2Z\"/><path d=\"M14 2.5V8h5\"/>",
 "settings": "<circle cx=\"12\" cy=\"12\" r=\"3.2\"/><path d=\"m10 2 4 0 .6 2.5 1.7.7 2.2-1.4 2.8 2.8-1.4 2.2.7 1.7L23 11v3l-2.4.5-.7 1.7 1.4 2.2-2.8 2.8-2.2-1.4-1.7.7L14 23h-4l-.6-2.5-1.7-.7-2.2 1.4-2.8-2.8 1.4-2.2-.7-1.7L1 14v-3l2.4-.5.7-1.7-1.4-2.2 2.8-2.8 2.2 1.4 1.7-.7L10 2Z\" transform=\"translate(0 -0.5) scale(.965) translate(.44 .44)\"/>",
 "support": "<path d=\"M4 13v-2a8 8 0 0 1 16 0v2\"/><rect x=\"2.5\" y=\"12\" width=\"4.5\" height=\"7\" rx=\"1.6\"/><rect x=\"17\" y=\"12\" width=\"4.5\" height=\"7\" rx=\"1.6\"/><path d=\"M19 19c0 2-2 3-5 3h-2\"/><rect x=\"9.5\" y=\"20.6\" width=\"3\" height=\"2.2\" rx=\"1.1\"/>",
 "search": "<circle cx=\"10.8\" cy=\"10.8\" r=\"7.2\"/><path d=\"m16.3 16.3 4.9 4.9\"/>",
 "bell": "<path d=\"M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4\"/>",
 "menu": "<path d=\"M4 7h16M4 12h16M4 17h16\"/>",
 "arrow-left": "<path d=\"m14.5 5-7 7 7 7\"/>",
 "arrow-right": "<path d=\"m9.5 5 7 7-7 7\"/>",
 "arrow-down": "<path d=\"m5 9 7 7 7-7\"/>",
 "chevron-up": "<path d=\"m5 15 7-7 7 7\"/>",
 "chevron-down": "<path d=\"m5 9 7 7 7-7\"/>",
 "play": "<path d=\"m8.5 5 11 7-11 7V5Z\"/>",
 "pause": "<path d=\"M8 5v14M16 5v14\"/>",
 "heart": "<path d=\"M12 21c-6.3-4.3-9.3-7.5-9.3-11.5 0-5.6 6.8-7.8 9.3-2.3 2.5-5.5 9.3-3.3 9.3 2.3C21.3 13.5 18.3 16.7 12 21Z\"/>",
 "share": "<path d=\"M12 16V3m-5 5 5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6\"/>",
 "open": "<path d=\"M13 4h7v7M20 4l-9 9\"/><path d=\"M19 14v5H5V5h5\"/>",
 "close": "<path d=\"M5 5 19 19M19 5 5 19\"/>",
 "expand": "<path d=\"M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5\"/>",
 "collapse": "<path d=\"M9 4v5H4M15 20v-5h5M9 9 3 3M15 15l6 6\"/>",
 "upload": "<path d=\"M12 16V3M7 8l5-5 5 5\"/><path d=\"M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4\"/>",
 "download": "<path d=\"M12 3v13m-5-5 5 5 5-5M4 17v3h16v-3\"/>",
 "plus": "<path d=\"M12 5v14M5 12h14\"/>",
 "check": "<path d=\"m4 12 5.2 5.2L20 6.5\"/>",
 "more": "<circle cx=\"5\" cy=\"12\" r=\"1\"/><circle cx=\"12\" cy=\"12\" r=\"1\"/><circle cx=\"19\" cy=\"12\" r=\"1\"/>",
 "calendar": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"16\" rx=\"2\"/><path d=\"M7 3v4m10-4v4M3 10h18\"/>",
 "pin": "<path d=\"M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z\"/><circle cx=\"12\" cy=\"10\" r=\"2.5\"/>",
 "camera": "<path d=\"M4 7h3l1.5-3h7L17 7h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z\"/><circle cx=\"12\" cy=\"13.5\" r=\"4\"/>",
 "education": "<path d=\"m2 9 10-5 10 5-10 5L2 9Z\"/><path d=\"M6 12v6c4 2.5 8 2.5 12 0v-6M22 9v9\"/>",
 "career": "<rect x=\"3\" y=\"7\" width=\"18\" height=\"14\" rx=\"2\"/><path d=\"M8 7V4h8v3M3 12h18\"/>",
 "star": "<path d=\"m12 2 3.1 6.6 7.1.9-5.1 4.9 1.3 7-6.4-3.4-6.4 3.4 1.3-7-5.1-4.9 7.1-.9L12 2Z\"/>",
 "shield": "<path d=\"m12 2 8 4v6c0 5-3 8-8 10-5-2-8-5-8-10V6l8-4Z\"/><path d=\"m9 12 2 2 4-4\"/>",
 "privacy": "<rect x=\"4\" y=\"10\" width=\"16\" height=\"11\" rx=\"2\"/><path d=\"M8 10V7a4 4 0 0 1 8 0v3\"/>",
 "language": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M3 12h18M12 3c3 3 4 6 4 9s-1 6-4 9c-3-3-4-6-4-9s1-6 4-9Z\"/>",
 "info": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 11v6M12 7h.01\"/>",
 "edit": "<path d=\"m16 4 4 4M4 20l4-1 12-12a3 3 0 0 0-4-4L4 15 4 20Z\"/>",
 "phone": "<rect x=\"6.5\" y=\"2.5\" width=\"11\" height=\"19\" rx=\"2.2\"/><path d=\"M11 18.5h2\"/>",
 "website": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M3 12h18M12 3a17 17 0 0 0 0 18M12 3a17 17 0 0 1 0 18\"/>",
 "message-square": "<path d=\"M3 5h18v13H9l-6 3V5Z\"/>",
 "playlist": "<path d=\"M3 6h12M3 11h12M3 16h9M19 11V4l3-.7v7.5\"/><ellipse cx=\"17\" cy=\"12\" rx=\"2.2\" ry=\"1.5\"/>",
 "album": "<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2.5\"/><circle cx=\"12\" cy=\"12\" r=\"5\"/><circle cx=\"12\" cy=\"12\" r=\"1\"/>",
 "artist": "<circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4 21c0-5 3-7.5 8-7.5s8 2.5 8 7.5\"/>",
 "gender": "<circle cx=\"10\" cy=\"14\" r=\"6\"/><path d=\"M14.4 9.6 21 3m-6 0h6v6\"/>",
 "document": "<path d=\"M6 3h9l4 4v14H6V3Z\"/><path d=\"M15 3v5h4M9 12h7m-7 4h7\"/>",
 "blocked": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M6 6l12 12\"/>",
 "sun": "<circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4\"/>",
 "quote": "<path d=\"M10 11H4v9h8V9H8M20 11h-6v9h8V9h-4\"/>",
 "game": "<path d=\"M7 8h10c2.4 0 3.8 1.6 4.5 4.1l1 4c.8 3.1-2.2 4.8-4.5 3l-2.7-2H8.7l-2.7 2c-2.3 1.8-5.3.1-4.5-3l1-4C3.2 9.6 4.6 8 7 8Z\"/><path d=\"M7 11v5M4.5 13.5h5M16.5 12h.01M19 14.5h.01\"/>",
 "list": "<path d=\"M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01\"/>",
 "leaf": "<path d=\"M20 4C10 5 4 7 4 15c0 4 4 6 7 4 7-4 7-10 9-15ZM6 20c2-6 5-9 11-12\"/>",
 "mute": "<path d=\"M3 9h4l5-4v14l-5-4H3V9ZM16 9l5 6m0-6-5 6\"/>",
 "volume": "<path d=\"M3 9h4l5-4v14l-5-4H3V9Z\"/><path d=\"M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12\"/>"
};
 const ALIASES=Object.freeze({
  notifications:'bell',appearance:'sun',contacts:'message',name:'profile',url:'website',
  life:'leaf',service:'shield',interests:'star',account:'privacy',documents:'document',
  head:'support',back:'arrow-left',track:'music',library:'playlist',news:'home',
  comments:'message',favorite:'heart',gifts:'gift',searchable:'search',videoClip:'clips'
 });
 const allowed=Object.freeze(Object.keys(GLYPHS));
 function mount(){
  if(document.getElementById('vatra-icon-sprite')||!document.body)return;
  const holder=document.createElement('div');
  holder.id='vatra-icon-sprite';
  holder.setAttribute('aria-hidden','true');
  holder.style.cssText='position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
  holder.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" focusable="false" aria-hidden="true"><defs>'+
   Object.entries(GLYPHS).map(([name,shape])=>'<symbol id="vatra-i-'+name+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'+shape+'</symbol>').join('')+
   '</defs></svg>';
  document.body.prepend(holder);
 }
 window.vatraIcon=(name,className='')=>{
  const resolved=Object.prototype.hasOwnProperty.call(GLYPHS,name)?name:ALIASES[name];
  const key=resolved&&Object.prototype.hasOwnProperty.call(GLYPHS,resolved)?resolved:'info';
  const extra=String(className).replace(/[^\w\s-]/g,'').trim();
  return '<svg class="vatra-icon'+(extra?' '+extra:'')+'" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor"><use href="#vatra-i-'+key+'"></use></svg>';
 };
 window.vatraIconNames=allowed;
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
})();
