(() => {
  'use strict';
  const ads = {
    enabled: false,
    publisher: '',  // ca-pub-XXXXXXXXXXXXXXXX
    slots: ['', '']  // numeric ad unit IDs, ordered by sidebar position
  };
  const nodes = [...document.querySelectorAll('.vatra-sidebar-ads [data-vatra-ad-slot]')];
  const validPublisher = /^ca-pub-\d{16}$/.test(ads.publisher);
  const validSlots = ads.slots.length === 2 && ads.slots.every(x => /^\d{8,}$/.test(x));
  if (!ads.enabled || !validPublisher || !validSlots || nodes.length !== 2) return;

  // A site using personalised ads must integrate the required consent system
  // before setting enabled=true. Ads are not loaded by default.
  const script = document.createElement('script');
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(ads.publisher);
  script.addEventListener('load', () => {
    nodes.forEach((node, index) => {
      const placement = document.createElement('ins');
      placement.className = 'adsbygoogle';
      placement.style.display = 'block';
      placement.dataset.adClient = ads.publisher;
      placement.dataset.adSlot = ads.slots[index];
      placement.dataset.adFormat = 'auto';
      placement.dataset.fullWidthResponsive = 'true';
      node.querySelector('.vatra-ad-placeholder')?.remove();
      node.append(placement);
      node.dataset.vatraAdActive = 'true';
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); }
      catch (err) { console.warn('VATRA advertising placement unavailable', err); }
    });
  });
  document.head.append(script);
})();
