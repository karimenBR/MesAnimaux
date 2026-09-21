/* ========================================================================
   MES ANIMEAUX — product rendering (homepage featured + full shop page)
   ======================================================================== */
function productCardHTML(p){
  const img = p.image
    ? `<div class="product-media" style="background-image:url('${p.image}')"></div>`
    : `<div class="product-media"><div class="noimg"><svg width="46" height="46" viewBox="0 0 48 48" fill="currentColor"><circle cx="24" cy="30" r="10"/><circle cx="10" cy="18" r="6"/><circle cx="38" cy="18" r="6"/><circle cx="16" cy="8" r="5"/><circle cx="32" cy="8" r="5"/></svg></div></div>`;
  return `
    <article class="product-card">
      ${img}
      <span class="product-tag ${p.stock ? '' : 'out'}">${p.stock ? 'Disponible' : 'Rupture'}</span>
      <div class="product-body">
        <span class="product-cat">${p.category}</span>
        <h3>${p.name}</h3>
        <p class="product-desc">${p.description || ''}</p>
        <div class="product-foot">
          <span class="price-tag">${p.price.toFixed(2)} <small>TND</small></span>
          <a href="tel:${DB.getSettings().phone.replace(/\s+/g,'')}" class="btn btn-outline" style="padding:8px 14px;font-size:13px;">Appeler</a>
        </div>
      </div>
    </article>`;
}

function renderFeatured(){
  const grid = document.getElementById('featuredGrid');
  if(!grid) return;
  const products = DB.getProducts().filter(p=>p.stock).slice(0,4);
  const all = DB.getProducts();
  const list = products.length ? products : all.slice(0,4);
  grid.innerHTML = list.length
    ? list.map(productCardHTML).join('')
    : `<div class="empty-state">La boutique s'agrandit bientôt — revenez vite !</div>`;
}

function renderShop(){
  const grid = document.getElementById('shopGrid');
  if(!grid) return;
  const products = DB.getProducts();
  const categories = ['Tous', ...Array.from(new Set(products.map(p=>p.category)))];
  const filterBar = document.getElementById('filterBar');
  let active = 'Tous';

  function draw(){
    const list = active==='Tous' ? products : products.filter(p=>p.category===active);
    grid.innerHTML = list.length
      ? list.map(productCardHTML).join('')
      : `<div class="empty-state">Aucun produit dans cette catégorie pour le moment.</div>`;
  }

  filterBar.innerHTML = categories.map(c =>
    `<button class="filter-chip ${c===active?'active':''}" data-cat="${c}">${c}</button>`).join('');
  filterBar.querySelectorAll('.filter-chip').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      active = btn.dataset.cat;
      filterBar.querySelectorAll('.filter-chip').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      draw();
    });
  });
  draw();
}
