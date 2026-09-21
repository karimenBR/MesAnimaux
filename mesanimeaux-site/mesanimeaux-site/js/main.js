/* ========================================================================
   MES ANIMEAUX — shared site chrome (header, footer, mobile nav)
   ======================================================================== */
(function(){
  const s = DB.getSettings();

  const logo = `<img style="height:40px; border-radius:50%;" src="assets/logos/WhatsApp Image 2026-07-27 at 2.27.40 PM.JPG" alt="MES ANIMEAUX logo">`;

  function el(html){ const t=document.createElement('template'); t.innerHTML=html.trim(); return t.content.firstChild; }

  function buildHeader(active){
    const links = [
      ['index.html','Accueil'],
      ['boutique.html','Boutique'],
      ['toilettage.html','Toilettage']
    ];
    const header = el(`
      <header class="site-header">
        <nav class="wrap nav">
          <a href="index.html" class="brand">${logo} ${s.shopName}</a>
          <div class="nav-links" id="navLinks">
            ${links.map(([href,label])=>`<a href="${href}" ${active===href?'class="active"':''}>${label}</a>`).join('')}
            <a href="toilettage.html#booking-form" class="nav-cta">Prendre RDV</a>
          </div>
          <button class="burger" id="burgerBtn" aria-label="Menu">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h16M4 18h16" stroke="#1F3A2E" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        </nav>
      </header>
    `);
    document.body.prepend(header);
    header.querySelector('#burgerBtn').addEventListener('click', ()=>{
      header.querySelector('#navLinks').classList.toggle('open');
    });
  }

  function buildFooter(){
    const footer = el(`
      <footer>
        <div class="wrap">
          <div class="foot-grid">
            <div>
              <a href="index.html" class="brand" style="color:#ffff;margin-bottom:12px;">${logo} ${s.shopName}</a>
              <p style="max-width:36ch; color:#fff;">${s.tagline}. Alimentation, accessoires et toilettage pour vos compagnons, avec des conseils sincères.</p>
            </div>
            <div>
              <h4>Contact</h4>
              <p><a style="color:#fff;" href="tel:${s.phone.replace(/\s+/g,'')}">${s.phone}</a></p>
              <p><a style="color:#fff;" href="mailto:${s.email}">${s.email}</a></p>
              <p><a style="color:#fff;" href="${s.mapsUrl}" target="_blank" rel="noopener">${s.address}</a></p>
            </div>
            <div>
              <h4>Horaires</h4>
              <ul class="hours-list" style="border:0;">
                ${s.hours.map(h=>`<li style="border-bottom-color:rgba(255,255,255,.14);"><span>${h.day}</span><b style="color:#fff;">${h.time}</b></li>`).join('')}
              </ul>
            </div>
          </div>
          <div class="foot-bottom">
            <span>© ${new Date().getFullYear()} ${s.shopName}. Tous droits réservés à KarimenBR.</span>
            <span>Fait avec soin à Monastir, Tunisie</span>
          </div>
        </div>
      </footer>
    `);
    document.body.appendChild(footer);
  }

  window.SITE = { buildHeader, buildFooter, settings: s };
})();
