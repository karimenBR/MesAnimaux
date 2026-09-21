/* ========================================================================
   MES ANIMEAUX — grooming appointment booking + live availability
   ======================================================================== */
const Booking = (() => {
  const s = () => DB.getSettings();

  function pad(n){ return n.toString().padStart(2,'0'); }
  function toDateStr(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }

  // Sunday runs a shorter day (09:00–13:00); every other open day uses the
  // full window configured in settings.
  function dayHours(dow){
    const st = s();
    if(dow === 0) return { start: 9, end: 20 };
    return { start: st.slotStartHour, end: st.slotEndHour };
  }

  function isOpen(dateStr){
    const dow = new Date(dateStr + 'T00:00:00').getDay();
    return s().openDays.includes(dow);
  }

  function generateSlots(dateStr){
    const dow = new Date(dateStr + 'T00:00:00').getDay();
    if(!s().openDays.includes(dow)) return [];
    const { start, end } = dayHours(dow);
    const dur = s().slotDurationMin;
    const slots = [];
    let mins = Math.round(start*60);
    const endMins = Math.round(end*60);
    while(mins + dur <= endMins){
      const h = Math.floor(mins/60), m = mins%60;
      slots.push(`${pad(h)}:${pad(m)}`);
      mins += dur;
    }
    // if the selected day is today, drop slots that have already passed
    const now = new Date();
    if(dateStr === toDateStr(now)){
      const nowMins = now.getHours()*60 + now.getMinutes();
      return slots.filter(t=>{
        const [h,m] = t.split(':').map(Number);
        return h*60+m > nowMins + 30; // 30 min buffer to prepare
      });
    }
    return slots;
  }

  function slotCapacity(){ return s().stations; }

  function availability(dateStr){
    return generateSlots(dateStr).map(time => {
      const used = DB.slotUsage(dateStr, time);
      return { time, used, capacity: slotCapacity(), full: used >= slotCapacity() };
    });
  }

  function minMaxDates(){
    const today = new Date();
    const max = new Date(); max.setDate(max.getDate()+30);
    return { min: toDateStr(today), max: toDateStr(max) };
  }

  return { toDateStr, isOpen, generateSlots, availability, minMaxDates, slotCapacity, dayHours };
})();

function initBookingPage(){
  const dateInput = document.getElementById('bookDate');
  const slotGrid = document.getElementById('slotGrid');
  const slotHint = document.getElementById('slotHint');
  const form = document.getElementById('bookingForm');
  const msgBox = document.getElementById('bookingMsg');
  const serviceOpts = document.querySelectorAll('.service-opt');
  let selectedTime = null;
  let selectedService = null;

  const { min, max } = Booking.minMaxDates();
  dateInput.min = min; dateInput.max = max; dateInput.value = min;

  serviceOpts.forEach(opt=>{
    opt.addEventListener('click', ()=>{
      serviceOpts.forEach(o=>o.classList.remove('selected'));
      opt.classList.add('selected');
      selectedService = { name: opt.dataset.name, price: opt.dataset.price };
    });
  });
  serviceOpts[0].click();

  function drawSlots(){
    selectedTime = null;
    const dateStr = dateInput.value;
    if(!Booking.isOpen(dateStr)){
      slotGrid.innerHTML = '';
      slotHint.textContent = "Fermé ce jour-là — merci de choisir une autre date.";
      return;
    }
    const slots = Booking.availability(dateStr);
    if(!slots.length){
      slotGrid.innerHTML = '';
      slotHint.textContent = "Plus aucun créneau disponible pour cette date.";
      return;
    }
    slotHint.textContent = `${Booking.slotCapacity()} postes de toilettage par créneau — choisissez une heure.`;
    slotGrid.innerHTML = slots.map(sl =>
      `<button type="button" class="slot ${sl.full?'full':''}" data-time="${sl.time}" ${sl.full?'disabled':''}>${sl.time}</button>`
    ).join('');
    slotGrid.querySelectorAll('.slot:not(.full)').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        slotGrid.querySelectorAll('.slot').forEach(b=>b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedTime = btn.dataset.time;
      });
    });
  }

  dateInput.addEventListener('change', drawSlots);
  drawSlots();

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    msgBox.innerHTML = '';
    const dateStr = dateInput.value;

    if(!Booking.isOpen(dateStr)){
      msgBox.innerHTML = `<div class="msg err">Nous sommes fermés à cette date. Merci de choisir un autre jour.</div>`;
      return;
    }
    if(!selectedTime){
      msgBox.innerHTML = `<div class="msg err">Merci de choisir un créneau horaire.</div>`;
      return;
    }
    // re-check availability at submit time in case another visitor just took the slot
    const used = DB.slotUsage(dateStr, selectedTime);
    if(used >= Booking.slotCapacity()){
      msgBox.innerHTML = `<div class="msg err">Ce créneau vient d'être réservé par quelqu'un d'autre. Merci d'en choisir un autre.</div>`;
      drawSlots();
      return;
    }

    const data = Object.fromEntries(new FormData(form).entries());
    const booking = DB.addBooking({
      ownerName: data.ownerName,
      phone: data.phone,
      petName: data.petName,
      petType: data.petType,
      service: selectedService.name,
      servicePrice: selectedService.price,
      notes: data.notes || '',
      date: dateStr,
      time: selectedTime
    });

    msgBox.innerHTML = `
      <div class="msg ok">
        Rendez-vous enregistré pour <b>${booking.petName}</b> le <b>${booking.date}</b> à <b>${booking.time}</b>.<br>
        Votre code de suivi : <span class="confirm-code">${booking.code}</span><br>
        Gardez-le avec votre numéro de téléphone pour vérifier votre statut.
      </div>`;
    form.reset();
    serviceOpts[0].click();
    drawSlots();
  });
}

function initLookup(){
  const form = document.getElementById('lookupForm');
  if(!form) return;
  const result = document.getElementById('lookupResult');
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const booking = DB.findBooking(data.phone, data.code);
    if(!booking){
      result.innerHTML = `<div class="msg err">Aucun rendez-vous trouvé avec ce téléphone et ce code.</div>`;
      return;
    }
    const labels = { pending:'En attente', confirmed:'Confirmé', 'checked-in':'Enregistré (arrivé)', cancelled:'Annulé' };
    result.innerHTML = `
      <div class="lookup-result">
        <p style="margin-bottom:8px;"><b>${booking.petName}</b> (${booking.petType}) — ${booking.service}</p>
        <p style="margin-bottom:8px;">📅 ${booking.date} à ${booking.time}</p>
        <span class="status-pill ${booking.status}">${labels[booking.status]}</span>
      </div>`;
  });
}
