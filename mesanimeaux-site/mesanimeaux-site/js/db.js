/* ========================================================================
   MES ANIMEAUX — data layer
   Everything is stored in the browser via localStorage, under one root
   object, so the public site and the admin dashboard always read/write
   the exact same data. No server is required to run this site.
   ======================================================================== */
const DB = (() => {
  const KEY = 'ma_store_v1';

  const defaultData = () => ({
    settings: {
      shopName: 'MES ANIMEAUX',
      tagline: 'Animalerie & toilettage canin',
      phone: '+216 98 909 903',
      whatsapp: '21698909903',
      email: 'contact@mesanimeaux.tn',
      address: 'mes animeaux , mon jardain 9 rue de l environnement, Ksibet El Médiouni',
      mapsUrl: 'https://www.google.com/maps/place/Animalerie+MES+ANIMEAUX/@35.692247,10.8431738,17.75z/data=!4m6!3m5!1s0x1302122ca0b5a92f:0x9274b5b2b69d32b2!8m2!3d35.6911999!4d10.8440762',
      hours: [
        { day: 'Lundi – Vendredi', time: '09:00 – 20:00' },
        { day: 'Samedi', time: '09:00 – 20:00' },
        { day: 'Dimanche', time: '09:00 – 20:00' }
      ],
      // grooming schedule config
      openDays: [1,2,3,4,5,6,0], // 0=Sun..6=Sat, all open by default (Sun shorter via slotStart/End override below)
      slotStartHour: 9,
      slotEndHour: 20.0,
      slotDurationMin: 45,
      stations: 2, // how many dogs can be washed in parallel
      adminPassword: 'admin123'
    },
    products: [
      {
        id: 'p1', order: 1, name: 'Croquettes Adulte Poulet & Riz', category: 'Alimentation',
        price: 42.9, stock: true, image: '',
        description: 'Croquettes premium pour chien adulte, riche en protéines de poulet.'
      },
      {
        id: 'p2', order: 2, name: 'Griffoir Chat Sisal', category: 'Accessoires',
        price: 65, stock: true, image: '',
        description: 'Arbre à griffer en sisal naturel avec plateforme confort.'
      },
      {
        id: 'p3', order: 3, name: 'Shampooing Anti-Puces', category: 'Hygiène',
        price: 18.5, stock: true, image: '',
        description: 'Shampooing doux traitant, formule apaisante pour peau sensible.'
      },
      {
        id: 'p4', order: 4, name: 'Balle Interactive', category: 'Jouets',
        price: 12, stock: false, image: '',
        description: 'Balle rebondissante résistante pour longues sessions de jeu.'
      }
    ],
    bookings: []
  });

  function load(){
    try{
      const raw = localStorage.getItem(KEY);
      if(!raw) { const d = defaultData(); save(d); return d; }
      const parsed = JSON.parse(raw);
      // shallow-merge with defaults so newly added settings fields don't break old saves
      const d = defaultData();
      parsed.settings = Object.assign({}, d.settings, parsed.settings || {});
      parsed.products = parsed.products || d.products;
      parsed.bookings = parsed.bookings || [];
      return parsed;
    }catch(e){
      console.error('DB load error', e);
      const d = defaultData(); save(d); return d;
    }
  }

  function save(data){
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function uid(prefix){
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  }

  // ---- public API ----
  return {
    getSettings(){ return load().settings; },
    saveSettings(patch){
      const d = load(); d.settings = Object.assign({}, d.settings, patch); save(d); return d.settings;
    },
    getProducts(){ return load().products.slice().sort((a,b)=>a.order-b.order); },
    saveProduct(product){
      const d = load();
      if(product.id){
        const i = d.products.findIndex(p=>p.id===product.id);
        if(i>-1){ d.products[i] = Object.assign({}, d.products[i], product); save(d); return d.products[i]; }
      }
      const maxOrder = d.products.reduce((m,p)=>Math.max(m,p.order||0),0);
      const np = Object.assign({ id: uid('p'), order: maxOrder+1, stock:true, image:'' }, product);
      d.products.push(np); save(d); return np;
    },
    deleteProduct(id){
      const d = load(); d.products = d.products.filter(p=>p.id!==id); save(d);
    },
    reorderProducts(idsInOrder){
      const d = load();
      idsInOrder.forEach((id, idx)=>{
        const p = d.products.find(p=>p.id===id);
        if(p) p.order = idx+1;
      });
      save(d);
    },
    getBookings(){ return load().bookings.slice().sort((a,b)=> (a.date+a.time).localeCompare(b.date+b.time)); },
    getBookingsForDate(date){ return this.getBookings().filter(b=>b.date===date && b.status!=='cancelled'); },
    addBooking(booking){
      const d = load();
      const code = uid('rv').slice(-6).toUpperCase();
      const nb = Object.assign({
        id: uid('b'), status:'pending', code, createdAt: Date.now()
      }, booking);
      d.bookings.push(nb); save(d); return nb;
    },
    updateBookingStatus(id, status){
      const d = load();
      const b = d.bookings.find(b=>b.id===id);
      if(b){ b.status = status; save(d); }
      return b;
    },
    findBooking(phone, code){
      const d = load();
      return d.bookings.find(b => b.phone.replace(/\s+/g,'') === phone.replace(/\s+/g,'') && b.code.toUpperCase()===code.toUpperCase());
    },
    // capacity check: how many bookings already occupy this date+time
    slotUsage(date, time){
      return load().bookings.filter(b=>b.date===date && b.time===time && b.status!=='cancelled').length;
    },
    _raw(){ return load(); },
    _wipe(){ localStorage.removeItem(KEY); }
  };
})();
if(typeof module !== 'undefined') module.exports = DB;
