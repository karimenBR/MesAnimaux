/* ========================================================================
   MES ANIMEAUX — admin dashboard
   Not linked from any public page. Gate is a simple client-side password
   check (fine for a solo-owner shop on a trusted device; swap for real
   auth if this ever needs to be used by multiple staff members remotely).
   ======================================================================== */
const SESSION_KEY = 'ma_admin_session';

function initLogin(){
  const gate = document.getElementById('loginGate');
  const dash = document.getElementById('dashboard');
  const form = document.getElementById('loginForm');
  const err = document.getElementById('loginErr');

  function enter(){
    gate.style.display = 'none';
    dash.style.display = 'block';
    initDashboard();
  }

  if(sessionStorage.getItem(SESSION_KEY) === '1'){ enter(); return; }

  form.addEventListener('submit', e=>{
    e.preventDefault();
    const val = document.getElementById('loginPass').value;
    if(val === DB.getSettings().adminPassword){
      sessionStorage.setItem(SESSION_KEY, '1');
      err.textContent = '';
      enter();
    }else{
      err.textContent = 'Mot de passe incorrect.';
    }
  });
}

function initDashboard(){
  initTabs();
  initProductsTab();
  initBookingsTab();
  initSettingsTab();
  document.getElementById('logoutBtn').addEventListener('click', ()=>{
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
  });
}

function initTabs(){
  const btns = document.querySelectorAll('.tab-btn');
  btns.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      btns.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-panel').forEach(p=>p.style.display='none');
      document.getElementById('tab-'+btn.dataset.tab).style.display='block';
    });
  });
}

/* ---------------------------- PRODUCTS ---------------------------- */
function initProductsTab(){
  const form = document.getElementById('productForm');
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const dzText = dropzone.querySelector('span');
  const list = document.getElementById('productList');
  const editIdField = document.getElementById('editId');
  const resetBtn = document.getElementById('resetFormBtn');
  let currentImage = '';

  function setImage(dataUrl){
    currentImage = dataUrl;
    dropzone.style.backgroundImage = dataUrl ? `url('${dataUrl}')` : '';
    dropzone.classList.toggle('has-img', !!dataUrl);
    dzText.style.display = dataUrl ? 'none' : 'inline';
  }

  function readFile(file){
    if(!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result);
    reader.readAsDataURL(file);
  }

  ['dragenter','dragover'].forEach(evt=>{
    dropzone.addEventListener(evt, e=>{ e.preventDefault(); dropzone.classList.add('drag'); });
  });
  ['dragleave','drop'].forEach(evt=>{
    dropzone.addEventListener(evt, e=>{ e.preventDefault(); dropzone.classList.remove('drag'); });
  });
  dropzone.addEventListener('drop', e=>{
    const file = e.dataTransfer.files[0];
    readFile(file);
  });
  dropzone.addEventListener('click', ()=> fileInput.click());
  fileInput.addEventListener('change', e=> readFile(e.target.files[0]));

  function drawList(){
    const products = DB.getProducts();
    list.innerHTML = products.length ? '' : `<div class="empty-state">Aucun produit — ajoutez le premier avec le formulaire ci-dessus.</div>`;
    products.forEach(p=>{
      const card = document.createElement('div');
      card.className = 'admin-product-card';
      card.draggable = true;
      card.dataset.id = p.id;
      card.innerHTML = `
        <div class="drag-handle" title="Glisser pour réordonner">⠿⠿</div>
        <div class="ap-thumb" style="${p.image ? `background-image:url('${p.image}')` : ''}">${p.image ? '' : '🐾'}</div>
        <div class="ap-info">
          <b>${p.name}</b>
          <span>${p.category} · ${p.price.toFixed(2)} TND</span>
          <span class="status-pill ${p.stock ? 'confirmed' : 'cancelled'}">${p.stock ? 'En stock' : 'Rupture'}</span>
        </div>
        <div class="ap-actions">
          <button class="icon-btn edit-btn" title="Modifier">✎</button>
          <button class="icon-btn del-btn" title="Supprimer">🗑</button>
        </div>`;
      list.appendChild(card);

      card.querySelector('.edit-btn').addEventListener('click', ()=> loadIntoForm(p));
      card.querySelector('.del-btn').addEventListener('click', ()=>{
        if(confirm(`Supprimer "${p.name}" ?`)){ DB.deleteProduct(p.id); drawList(); }
      });
    });
    attachDragReorder(list);
  }

  function attachDragReorder(container){
    let dragEl = null;
    container.querySelectorAll('.admin-product-card').forEach(card=>{
      card.addEventListener('dragstart', ()=>{ dragEl = card; card.classList.add('dragging'); });
      card.addEventListener('dragend', ()=>{
        card.classList.remove('dragging');
        const ids = Array.from(container.querySelectorAll('.admin-product-card')).map(c=>c.dataset.id);
        DB.reorderProducts(ids);
      });
      card.addEventListener('dragover', e=>{
        e.preventDefault();
        const after = getDragAfterElement(container, e.clientY);
        if(!dragEl) return;
        if(after == null) container.appendChild(dragEl);
        else container.insertBefore(dragEl, after);
      });
    });
  }
  function getDragAfterElement(container, y){
    const els = [...container.querySelectorAll('.admin-product-card:not(.dragging)')];
    return els.reduce((closest, child)=>{
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height/2;
      if(offset < 0 && offset > closest.offset) return { offset, element: child };
      return closest;
    }, { offset: -Infinity }).element;
  }

  function loadIntoForm(p){
    editIdField.value = p.id;
    form.name.value = p.name;
    form.category.value = p.category;
    form.price.value = p.price;
    form.description.value = p.description || '';
    form.stock.checked = !!p.stock;
    setImage(p.image || '');
    document.getElementById('formTitle').textContent = 'Modifier le produit';
    document.getElementById('saveBtn').textContent = 'Enregistrer les modifications';
    window.scrollTo({ top: form.offsetTop - 100, behavior:'smooth' });
  }

  function clearForm(){
    form.reset();
    editIdField.value = '';
    setImage('');
    document.getElementById('formTitle').textContent = 'Ajouter un produit';
    document.getElementById('saveBtn').textContent = 'Ajouter à la boutique';
  }

  resetBtn.addEventListener('click', clearForm);

  form.addEventListener('submit', e=>{
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    DB.saveProduct({
      id: editIdField.value || undefined,
      name: data.name,
      category: data.category,
      price: parseFloat(data.price),
      description: data.description,
      stock: !!data.stock,
      image: currentImage
    });
    clearForm();
    drawList();
  });

  drawList();
}

/* ---------------------------- BOOKINGS ---------------------------- */
function initBookingsTab(){
  const dateInput = document.getElementById('adminDate');
  const list = document.getElementById('bookingsList');
  const capNote = document.getElementById('capacityNote');
  const today = Booking.toDateStr(new Date());
  dateInput.value = today;

  const labels = { pending:'En attente', confirmed:'Confirmé', 'checked-in':'Enregistré', cancelled:'Annulé' };

  function draw(){
    const dateStr = dateInput.value;
    const bookings = DB.getBookings().filter(b=>b.date===dateStr);
    capNote.textContent = `${DB.getSettings().stations} postes disponibles par créneau · ${bookings.filter(b=>b.status!=='cancelled').length} rendez-vous ce jour`;
    list.innerHTML = bookings.length ? '' : `<div class="empty-state">Aucun rendez-vous pour cette date.</div>`;
    bookings.sort((a,b)=>a.time.localeCompare(b.time)).forEach(b=>{
      const row = document.createElement('div');
      row.className = 'booking-row';
      row.innerHTML = `
        <div class="br-time">${b.time}</div>
        <div class="br-info">
          <b>${b.petName}</b> <span class="muted">(${b.petType})</span> — ${b.service}
          <div class="muted">${b.ownerName} · ${b.phone} ${b.notes ? '· '+b.notes : ''}</div>
        </div>
        <span class="status-pill ${b.status}">${labels[b.status]}</span>
        <div class="br-actions"></div>`;
      const actions = row.querySelector('.br-actions');
      if(b.status==='pending'){
        actions.appendChild(makeBtn('Confirmer', ()=>{ DB.updateBookingStatus(b.id,'confirmed'); draw(); }));
      }
      if(b.status==='confirmed'){
        actions.appendChild(makeBtn('Check-in', ()=>{ DB.updateBookingStatus(b.id,'checked-in'); draw(); }));
      }
      if(b.status!=='cancelled' && b.status!=='checked-in'){
        actions.appendChild(makeBtn('Annuler', ()=>{ DB.updateBookingStatus(b.id,'cancelled'); draw(); }, true));
      }
      list.appendChild(row);
    });
  }
  function makeBtn(label, onClick, danger){
    const b = document.createElement('button');
    b.className = 'mini-btn' + (danger ? ' danger' : '');
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }
  dateInput.addEventListener('change', draw);
  draw();
}

/* ---------------------------- SETTINGS ---------------------------- */
function initSettingsTab(){
  const form = document.getElementById('settingsForm');
  const s = DB.getSettings();
  form.shopName.value = s.shopName;
  form.tagline.value = s.tagline;
  form.phone.value = s.phone;
  form.email.value = s.email;
  form.address.value = s.address;
  form.mapsUrl.value = s.mapsUrl;
  form.stations.value = s.stations;
  form.slotDurationMin.value = s.slotDurationMin;
  form.slotStartHour.value = s.slotStartHour;
  form.slotEndHour.value = s.slotEndHour;

  form.addEventListener('submit', e=>{
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    DB.saveSettings({
      shopName: data.shopName, tagline: data.tagline, phone: data.phone,
      email: data.email, address: data.address, mapsUrl: data.mapsUrl,
      stations: parseInt(data.stations), slotDurationMin: parseInt(data.slotDurationMin),
      slotStartHour: parseFloat(data.slotStartHour), slotEndHour: parseFloat(data.slotEndHour)
    });
    document.getElementById('settingsMsg').textContent = 'Paramètres enregistrés ✓';
    setTimeout(()=> document.getElementById('settingsMsg').textContent = '', 2500);
  });

  const pwForm = document.getElementById('passwordForm');
  pwForm.addEventListener('submit', e=>{
    e.preventDefault();
    const data = Object.fromEntries(new FormData(pwForm).entries());
    if(data.newPassword.length < 4){
      document.getElementById('pwMsg').textContent = 'Le mot de passe doit contenir au moins 4 caractères.';
      return;
    }
    DB.saveSettings({ adminPassword: data.newPassword });
    pwForm.reset();
    document.getElementById('pwMsg').textContent = 'Mot de passe mis à jour ✓';
    setTimeout(()=> document.getElementById('pwMsg').textContent = '', 2500);
  });
}
