/* ========================================
   Frota Noronha — Logica principal (com banco)
   ======================================== */

const state = {
  driverId: null, driverName: '', pin: '',
  carId: null, carPlate: '', carModel: '',
  pecas: [], motoristas: [], carros: [],
  selectedPart: '', cost: '',
  offline: false,
  currentMaintId: null, inMaintenance: false,
  maintReason: '', maintDate: null,
  isNewDriver: false, role: 'driver'
};

function setRole(r) {
  state.role = r;
  if (r === 'driver') document.body.classList.add('driver-mode');
  else document.body.classList.remove('driver-mode');
}
function toggleAccordion(header) { header.parentElement.classList.toggle('open'); }

function show(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
  if (id === 'page-dash') refreshMaintBanner();
  if (id === 'page-admin') { setRole('gestor'); refreshGestorView(); }
  else if (id !== 'page-login') setRole('driver');
  if (id === 'page-history') loadHistory();
  if (id === 'page-alerts') loadAlerts();
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0,2).map(p => p[0].toUpperCase()).join('');
}
function carIcon(modelo) {
  const m = (modelo || '').toLowerCase();
  if (m.includes('hilux') || m.includes('strada') || m.includes('saveiro') || m.includes('s10')) return '\u{1F6FB}';
  if (m.includes('moto')) return '\u{1F3CD}\u{FE0F}';
  return '\u{1F697}';
}
function pecaIcone(nome) {
  const p = state.pecas.find(x => x.nome.toLowerCase() === (nome || '').toLowerCase());
  return p ? p.icone : null;
}
function formatShortDate(d) {
  const dt = d instanceof Date ? d : new Date(d);
  return String(dt.getDate()).padStart(2,'0') + '/' + String(dt.getMonth()+1).padStart(2,'0');
}
function formatMonthYear(d) {
  const meses = ['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  return meses[d.getMonth()] + ' ' + d.getFullYear();
}
function formatCents(cents) {
  const reais = Math.floor(cents / 100);
  const centsPart = String(cents % 100).padStart(2, '0');
  return reais.toLocaleString('pt-BR') + ',' + centsPart;
}

function renderDriverList() {
  const root = document.querySelector('#page-login .driver-list');
  if (!root) return;
  const cards = state.motoristas.map(m =>
    `<div class="driver-card" onclick='selectDriver(${JSON.stringify(m.id)}, ${JSON.stringify(m.nome)})'>
       <div class="avatar">${initials(m.nome)}</div>
       <div><div class="name">${escapeHtml(m.nome)}</div><div class="role">Motorista</div></div>
     </div>`
  ).join('');
  root.innerHTML = cards + `
    <div class="driver-card driver-card-new" onclick="showNewDriverInput()">
      <div class="avatar avatar-new">+</div>
      <div><div class="name">Nao estou na lista</div><div class="role">Tocar para escrever meu nome</div></div>
    </div>`;
}

function renderCarList() {
  const root = document.querySelector('#page-selectcar .car-grid');
  if (!root) return;
  const cards = state.carros.map(c => {
    let status = 'OK', statusClass = 'status-ok';
    if (c.status === 'manutencao') { status = 'manutencao'; statusClass = 'status-maint'; }
    else if (c.status === 'alerta') { status = 'alerta'; statusClass = 'status-alert'; }
    return `<div class="car-card" onclick='selectCar(${JSON.stringify(c.id)}, ${JSON.stringify(c.placa)}, ${JSON.stringify(c.modelo)})'>
              <div class="car-icon">${carIcon(c.modelo)}</div>
              <div class="car-info">
                <div class="car-plate">${escapeHtml(c.placa)}</div>
                <div class="car-model">${escapeHtml(c.modelo)}</div>
              </div>
              <span class="car-status ${statusClass}">${status}</span>
            </div>`;
  }).join('');
  root.innerHTML = cards || '<p class="lead">Nenhum carro cadastrado. Peca ao gestor.</p>';
}

function renderPartsGrid() {
  const root = document.querySelector('#page-parts .parts-grid');
  if (!root) return;
  const cards = state.pecas.map(p =>
    `<div class="part-card" onclick='selectPart(${JSON.stringify(p.nome)})'>
       <div class="part-icon">${p.icone || '\u{1F527}'}</div>
       <div class="part-name">${escapeHtml(p.nome)}</div>
     </div>`
  ).join('');
  root.innerHTML = cards + `
    <div class="part-card" onclick="selectOtherPart()">
      <div class="part-icon">+</div><div class="part-name">Outro</div>
    </div>`;
}

function renderHistory(servicos, observacoes, manutencoes) {
  const root = document.querySelector('#page-history .content');
  if (!root) return;
  const items = [];
  for (const s of servicos) {
    items.push({
      tipo: 'servico', data: new Date(s.data),
      icone: pecaIcone(s.peca_nome) || '\u{1F527}',
      title: s.peca_nome,
      meta: formatShortDate(s.data) + ' - ' + s.motorista_nome,
      cost: s.valor_centavos ? 'R$ ' + formatCents(s.valor_centavos) : ''
    });
  }
  for (const o of (observacoes || [])) {
    items.push({
      tipo: 'obs', data: new Date(o.data),
      icone: '\u{1F4AC}', title: 'Observacao',
      meta: formatShortDate(o.data) + ' - ' + o.motorista_nome, desc: o.texto
    });
  }
  for (const m of (manutencoes || [])) {
    items.push({
      tipo: 'maint', data: new Date(m.data_inicio),
      icone: '⚠️',
      title: m.ativa ? 'Em manutencao' : 'Manutencao concluida',
      meta: formatShortDate(m.data_inicio) + ' - ' + (m.motivo ? '"' + m.motivo.slice(0,60) + '"' : '')
    });
  }
  items.sort((a, b) => b.data - a.data);
  const groups = {};
  for (const it of items) {
    const key = formatMonthYear(it.data);
    (groups[key] = groups[key] || []).push(it);
  }
  if (items.length === 0) {
    root.innerHTML = '<p class="lead">Esse carro ainda nao tem nenhum registro.</p>';
    return;
  }
  let html = '';
  for (const month of Object.keys(groups)) {
    html += `<div class="list-section"><div class="list-title">${month}</div>`;
    for (const it of groups[month]) {
      const iconCls = it.tipo === 'maint' ? 'li-icon danger' : (it.tipo === 'obs' ? 'li-icon alert' : 'li-icon');
      html += `<div class="list-item readonly">
        <div class="${iconCls}">${it.icone}</div>
        <div class="li-content">
          <div class="li-title">${escapeHtml(it.title)}</div>
          <div class="li-meta">${escapeHtml(it.meta)}</div>
          ${it.desc ? `<div class="li-meta" style="margin-top:6px">${escapeHtml(it.desc)}</div>` : ''}
        </div>
        ${it.cost ? `<div class="li-cost">${it.cost}</div>` : ''}
      </div>`;
    }
    html += `</div>`;
  }
  root.innerHTML = html;
}

function renderAlerts(alertas) {
  const root = document.querySelector('#page-alerts .content');
  if (!root) return;
  if (alertas.length === 0) {
    root.innerHTML = '<div class="readonly-note"><div class="readonly-note-icon">✓</div><div>Sem alertas. Esse carro ta em dia.</div></div><div class="spacer"></div><button class="btn btn-secondary" onclick="show(\'page-dash\')">Voltar</button>';
    return;
  }
  let html = '';
  for (const a of alertas) {
    const cls = a.urgente ? 'alert-card urgent' : 'alert-card';
    const tag = a.urgente ? 'Urgente' : 'Em breve';
    html += `<div class="${cls}">
      <div class="ac-head">
        <div class="ac-title">${escapeHtml(a.titulo)}</div>
        <div class="ac-when">${escapeHtml(a.when)}</div>
      </div>
      <div class="ac-desc">${escapeHtml(a.descricao)}</div>
      <span class="ac-tag">${tag}</span>
    </div>`;
  }
  html += '<div class="spacer"></div><button class="btn btn-secondary" onclick="show(\'page-dash\')">Voltar</button>';
  root.innerHTML = html;
}

function selectDriver(driverId, name) {
  state.driverId = driverId; state.driverName = name;
  state.isNewDriver = false; state.pin = '';
  updatePinDisplay();
  document.getElementById('pinDriverName').textContent = name;
  show('page-pin');
}
function showNewDriverInput() {
  document.getElementById('newDriverInput').style.display = 'block';
  document.getElementById('newDriverName').focus();
}
function hideNewDriverInput() {
  document.getElementById('newDriverInput').style.display = 'none';
  document.getElementById('newDriverName').value = '';
}
function selectNewDriver() {
  const name = document.getElementById('newDriverName').value.trim();
  if (!name || name.length < 3) { alert('Escreva seu nome completo.'); return; }
  state.driverId = null; state.driverName = name; state.isNewDriver = true;
  const first = name.split(' ')[0];
  document.getElementById('dashDriver').innerHTML = first + ' <span class="new-badge">novo</span>';
  show('page-selectcar');
}

async function pin(d) {
  if (state.pin.length >= 4) return;
  state.pin += d;
  updatePinDisplay();
  if (state.pin.length === 4) {
    const ok = await dbCheckPin(state.driverId, state.pin);
    if (ok) {
      setTimeout(() => {
        document.getElementById('dashDriver').textContent = state.driverName.split(' ')[0];
        show('page-selectcar');
      }, 150);
    } else {
      const display = document.getElementById('pinDisplay');
      display.style.animation = 'shake 0.4s';
      setTimeout(() => { display.style.animation = ''; state.pin = ''; updatePinDisplay(); }, 400);
      alert('PIN incorreto. Tente de novo.');
    }
  }
}
function pinBack() { state.pin = state.pin.slice(0, -1); updatePinDisplay(); }
function pinClear() { state.pin = ''; updatePinDisplay(); }
function updatePinDisplay() {
  document.querySelectorAll('#pinDisplay .pin-dot').forEach((d, i) => d.classList.toggle('filled', i < state.pin.length));
}

async function selectCar(carId, placa, modelo) {
  state.carId = carId; state.carPlate = placa; state.carModel = modelo;
  document.getElementById('dashPlate').textContent = placa;
  document.getElementById('dashModel').textContent = modelo;
  document.getElementById('histCar').textContent = placa + ' - ' + modelo;
  document.getElementById('confirmCar').textContent = placa + ' - ' + modelo;
  document.getElementById('maintSubTitle').textContent = placa + ' - ' + modelo;
  const maint = await dbActiveMaintenance(carId);
  if (maint) {
    state.inMaintenance = true; state.currentMaintId = maint.id;
    state.maintReason = maint.motivo; state.maintDate = new Date(maint.data_inicio);
  } else {
    state.inMaintenance = false; state.currentMaintId = null;
    state.maintReason = ''; state.maintDate = null;
  }
  await updateAlertBadge();
  show('page-dash');
}

async function updateAlertBadge() {
  const alertas = await dbCalculateAlertas(state.carId);
  const badge = document.querySelector('#page-dash .tile-badge');
  if (badge) {
    if (alertas.length > 0) { badge.style.display = ''; badge.textContent = alertas.length; }
    else { badge.style.display = 'none'; }
  }
}

function selectPart(name) {
  state.selectedPart = name; state.cost = '';
  document.getElementById('costPartTitle').textContent = name;
  document.getElementById('confirmPart').textContent = name;
  updateCost();
  show('page-cost');
}
function selectOtherPart() {
  document.getElementById('otherPartName').value = '';
  show('page-other-part');
  setTimeout(() => document.getElementById('otherPartName').focus(), 100);
}
function confirmOtherPart() {
  const name = document.getElementById('otherPartName').value.trim();
  if (!name || name.length < 2) { alert('Escreva o nome da peca ou servico.'); return; }
  selectPart(name);
}
function costKey(d) { if (state.cost.length >= 7) return; state.cost += d; updateCost(); }
function costBack() { state.cost = state.cost.slice(0, -1); updateCost(); }
function costClear() { state.cost = ''; updateCost(); }
function updateCost() {
  let raw = state.cost || '0';
  let cents = raw.padStart(3, '0');
  let reais = cents.slice(0, -2).replace(/^0+(?=\d)/, '');
  let centsPart = cents.slice(-2);
  let formatted = (reais || '0') + ',' + centsPart;
  formatted = formatted.replace(/(\d)(?=(\d{3})+(,))/g, '$1.');
  document.getElementById('costValue').textContent = formatted;
  document.getElementById('confirmCost').textContent = 'R$ ' + formatted;
}

async function saveService() {
  const cents = parseInt(state.cost || '0', 10);
  const btn = event && event.target;
  if (btn) btn.disabled = true;
  try {
    const { error } = await dbCreateServico({
      carro_id: state.carId, motorista_id: state.driverId, motorista_nome: state.driverName,
      peca_nome: state.selectedPart, valor_centavos: cents, observacao: null
    });
    if (error) { alert('Nao consegui salvar. Tenta de novo daqui a pouco.\n\nDetalhe: ' + (error.message || 'erro')); return; }
    document.getElementById('savedTitle').textContent = 'Tudo salvo!';
    document.getElementById('savedMsg').textContent = 'O servico foi registrado no historico do carro.';
    show('page-saved');
    updateAlertBadge();
  } finally { if (btn) btn.disabled = false; }
}

async function loadHistory() {
  if (!state.carId) return;
  const [servicos, observacoes] = await Promise.all([
    dbListServicosByCarro(state.carId),
    dbListObservacoesByCarro(state.carId)
  ]);
  renderHistory(servicos, observacoes, []);
}

async function loadAlerts() {
  if (!state.carId) return;
  const alertas = await dbCalculateAlertas(state.carId);
  renderAlerts(alertas);
}

let recording = false;
const mockMsgs = [
  "O carro esta com um barulho estranho na hora de frear, parece que vem da roda da frente direita.",
  "Hoje o ar condicionado parou de gelar do nada, so sai ar quente. Acho que precisa olhar.",
  "Bateu uma pedra grande no parabrisa, ficou uma trinca pequena mas ta crescendo.",
  "O motor esta engasgando na subida, principalmente quando o tanque ta quase vazio."
];

function toggleVoice() {
  const btn = document.getElementById('voiceBtn');
  const lbl = document.getElementById('voiceLabel');
  const sub = document.getElementById('voiceSub');
  if (!recording) {
    recording = true; btn.classList.add('recording');
    lbl.textContent = 'Gravando... Tocar para parar'; sub.textContent = 'Pode falar';
  } else {
    recording = false; btn.classList.remove('recording');
    lbl.textContent = 'Tocar para falar'; sub.textContent = 'Eu transcrevo para texto';
    const msg = mockMsgs[Math.floor(Math.random() * mockMsgs.length)];
    document.getElementById('transcriptText').textContent = msg;
    document.getElementById('transcriptBox').style.display = 'block';
    document.getElementById('obsText').value = msg;
  }
}

async function saveObservation() {
  const txt = document.getElementById('obsText').value.trim();
  if (!txt) { alert('Escreva ou grave uma observacao antes de enviar.'); return; }
  const btn = event && event.target;
  if (btn) btn.disabled = true;
  try {
    const { error } = await dbCreateObservacao({
      carro_id: state.carId, motorista_id: state.driverId, motorista_nome: state.driverName,
      texto: txt, transcricao_audio: null
    });
    if (error) { alert('Nao consegui enviar a observacao. Tenta de novo.'); return; }
    document.getElementById('obsText').value = '';
    document.getElementById('transcriptBox').style.display = 'none';
    document.getElementById('savedTitle').textContent = 'Observacao enviada!';
    document.getElementById('savedMsg').innerHTML = 'A observacao foi guardada no historico do carro e enviada ao gestor.<br><br><small style="color:var(--ink-soft)">🔒 Ela nao pode mais ser apagada.</small>';
    show('page-saved');
  } finally { if (btn) btn.disabled = false; }
}

function toggleVoiceMaint() {
  const btn = document.getElementById('voiceBtnMaint');
  const lbl = document.getElementById('voiceLabelMaint');
  if (!recording) {
    recording = true; btn.classList.add('recording');
    lbl.textContent = 'Gravando... tocar para parar';
  } else {
    recording = false; btn.classList.remove('recording');
    lbl.textContent = 'Falar o motivo';
    const msg = mockMsgs[Math.floor(Math.random() * mockMsgs.length)];
    document.getElementById('transcriptTextMaint').textContent = msg;
    document.getElementById('transcriptBoxMaint').style.display = 'block';
    document.getElementById('maintReasonText').value = msg;
  }
}

async function putInMaintenance() {
  const reason = document.getElementById('maintReasonText').value.trim();
  if (!reason) { alert('Escreva ou grave o motivo antes de por em manutencao.'); return; }
  const btn = event && event.target;
  if (btn) btn.disabled = true;
  try {
    const { data, error } = await dbStartMaintenance({
      carro_id: state.carId, motorista_id: state.driverId, motorista_nome: state.driverName,
      motivo: reason, transcricao_audio: null
    });
    if (error) { alert('Nao consegui por em manutencao. Tenta de novo.'); return; }
    state.inMaintenance = true; state.currentMaintId = data.id;
    state.maintReason = reason; state.maintDate = new Date();
    show('page-maint-confirm');
    // Dispara e-mail automatico pro gestor (assincrono, nao bloqueia a UI)
    dbSendMaintenanceEmail({
      carro_placa: state.carPlate,
      carro_modelo: state.carModel,
      motorista_nome: state.driverName,
      motivo: reason,
      transcricao_audio: null
    }).then(r => {
      if (r.ok) console.log('[Frota] E-mail enviado:', r.sent + ' destinatarios');
      else console.warn('[Frota] Falha ao enviar e-mail');
    });
  } finally { if (btn) btn.disabled = false; }
}

async function gestorRemoveMaintenance(manutencaoId, carroId) {
  if (!confirm('Tirar esse carro da manutencao?')) return;
  const ok = await dbEndMaintenance(manutencaoId, carroId);
  if (ok) { alert('✓ Carro tirado da manutencao.'); refreshGestorView(); }
  else { alert('Erro ao tirar da manutencao. Tenta de novo.'); }
}

function refreshMaintBanner() {
  const holder = document.getElementById('maintBannerHolder');
  const tile = document.getElementById('maintTile');
  refreshMaintViews();
  if (state.inMaintenance) {
    holder.innerHTML = '<div class="maint-banner"><span class="maint-banner-icon">⚠️</span> Este carro esta em manutencao</div>';
    tile.classList.add('danger');
    tile.querySelector('.tile-label').textContent = 'Ver manutencao';
    tile.querySelector('.tile-sub').textContent = 'So o gestor pode tirar';
  } else {
    holder.innerHTML = '';
    tile.classList.remove('danger');
    tile.querySelector('.tile-label').textContent = 'Por o carro em manutencao';
    tile.querySelector('.tile-sub').textContent = 'Avisa o gestor por e-mail';
  }
}

function refreshMaintViews() {
  const inactive = document.getElementById('maintInactiveView');
  const active = document.getElementById('maintActiveView');
  if (state.inMaintenance) {
    inactive.style.display = 'none'; active.style.display = 'block';
    document.getElementById('maintReason').textContent = state.maintReason;
    document.getElementById('maintTitle').textContent = 'Em manutencao';
    document.getElementById('maintSince').textContent = state.maintDate ? state.maintDate.toLocaleDateString('pt-BR') : 'hoje';
  } else {
    inactive.style.display = 'block'; active.style.display = 'none';
    document.getElementById('maintTitle').textContent = 'Por em manutencao';
  }
}

async function refreshGestorView() {
  const maints = await dbAllActiveMaintenances();
  const alertEl = document.getElementById('gestorMaintAlert');
  const list = document.getElementById('gestorMaintList');
  const count = document.getElementById('gestorMaintCount');

  if (!maints || maints.length === 0) {
    if (alertEl) alertEl.style.display = 'none';
  } else {
    if (alertEl) alertEl.style.display = 'block';
    if (count) count.textContent = maints.length;
    let html = '';
    for (const m of maints) {
      const carro = m.carros || {};
      const inicio = new Date(m.data_inicio).toLocaleDateString('pt-BR');
      html += `<div class="ga-item">
        <div class="ga-item-title">${escapeHtml(carro.placa || '')} - ${escapeHtml(carro.modelo || '')}</div>
        <div class="ga-item-meta">Parado desde ${inicio} - "${escapeHtml(m.motivo || '')}"</div>
        <button class="btn btn-primary" style="margin-top:8px" onclick='gestorRemoveMaintenance(${JSON.stringify(m.id)}, ${JSON.stringify(carro.id || "")})'>✓ Tirar da manutencao</button>
      </div>`;
    }
    if (list) list.innerHTML = html;
    const oldBtn = alertEl ? alertEl.querySelector(':scope > button.btn-primary') : null;
    if (oldBtn) oldBtn.style.display = 'none';
  }

  const carrosBody = document.querySelector('#page-admin .accordion:nth-of-type(2) .accordion-body');
  if (carrosBody) {
    let html = '';
    for (const c of state.carros) {
      let badge = '<span class="car-status status-ok">OK</span>';
      if (c.status === 'manutencao') badge = '<span class="car-status status-maint">manutencao</span>';
      else if (c.status === 'alerta') badge = '<span class="car-status status-alert">alerta</span>';
      html += `<div class="list-item readonly">
        <div class="li-icon">${carIcon(c.modelo)}</div>
        <div class="li-content">
          <div class="li-title">${escapeHtml(c.placa)} - ${escapeHtml(c.modelo)}</div>
          <div class="li-meta">${c.status === 'manutencao' ? 'Parado' : 'Em operacao'}</div>
        </div>
        ${badge}
      </div>`;
    }
    html += '<button class="btn btn-ghost" style="margin-top:12px" onclick="alert(\'Cadastro de carros - em breve\')">+ Adicionar carro</button>';
    carrosBody.innerHTML = html;
    const countEl = document.querySelector('#page-admin .accordion:nth-of-type(2) .accordion-count');
    if (countEl) countEl.textContent = state.carros.length;
  }

  const motBody = document.querySelector('#page-admin .accordion:nth-of-type(3) .accordion-body');
  if (motBody) {
    let html = '';
    for (const m of state.motoristas) {
      html += `<div class="list-item">
        <div class="li-icon"><div class="avatar" style="width:44px;height:44px;font-size:18px">${initials(m.nome)}</div></div>
        <div class="li-content">
          <div class="li-title">${escapeHtml(m.nome)}</div>
          <div class="li-meta">Motorista - PIN cadastrado</div>
        </div>
        <div class="li-cost">✏️</div>
      </div>`;
    }
    html += '<button class="btn btn-ghost" style="margin-top:12px" onclick="alert(\'Cadastro de motoristas - em breve\')">+ Cadastrar motorista</button>';
    motBody.innerHTML = html;
    const countEl = document.querySelector('#page-admin .accordion:nth-of-type(3) .accordion-count');
    if (countEl) countEl.textContent = state.motoristas.length;
  }

  const pecaBody = document.querySelector('#page-admin .accordion:nth-of-type(4) .accordion-body');
  if (pecaBody) {
    let html = '';
    for (const p of state.pecas) {
      const prazo = [];
      if (p.km_troca) prazo.push((p.km_troca/1000).toLocaleString('pt-BR') + ' mil km');
      if (p.meses_troca) prazo.push(p.meses_troca + ' meses');
      const prazoStr = prazo.length ? 'A cada ' + prazo.join(' ou ') : 'Sem prazo definido';
      html += `<div class="list-item">
        <div class="li-icon">${p.icone || '🔧'}</div>
        <div class="li-content">
          <div class="li-title">${escapeHtml(p.nome)}</div>
          <div class="li-meta">${prazoStr}</div>
        </div>
        <div class="li-cost">✏️</div>
      </div>`;
    }
    html += '<button class="btn btn-ghost" style="margin-top:12px" onclick="alert(\'Cadastro de pecas - em breve\')">+ Adicionar peca</button>';
    pecaBody.innerHTML = html;
    const countEl = document.querySelector('#page-admin .accordion:nth-of-type(4) .accordion-count');
    if (countEl) countEl.textContent = state.pecas.length;
  }

  const emails = await dbListEmails();
  const emailBody = document.querySelector('#page-admin .accordion:nth-of-type(5) .accordion-body');
  if (emailBody) {
    let html = '';
    for (const e of emails) {
      html += `<div class="list-item">
        <div class="li-icon">📧</div>
        <div class="li-content">
          <div class="li-title">${escapeHtml(e.email)}</div>
          <div class="li-meta">${escapeHtml(e.nome || '-')}</div>
        </div>
        <div class="li-cost">✏️</div>
      </div>`;
    }
    html += '<button class="btn btn-ghost" style="margin-top:12px" onclick="alert(\'Cadastro de e-mails - em breve\')">+ Adicionar e-mail</button>';
    emailBody.innerHTML = html;
    const countEl = document.querySelector('#page-admin .accordion:nth-of-type(5) .accordion-count');
    if (countEl) countEl.textContent = emails.length;
  }
}

function toggleSim() { document.getElementById('simPanel').classList.toggle('show'); }
function toggleOffline() {
  state.offline = !state.offline;
  const ns = document.getElementById('netStatus');
  const on = document.getElementById('offlineNote');
  if (state.offline) {
    ns.classList.add('offline'); ns.innerHTML = '<span class="dot"></span> Sem internet';
    if (on) on.style.display = 'flex';
  } else {
    ns.classList.remove('offline'); ns.innerHTML = '<span class="dot"></span> Online';
    if (on) on.style.display = 'none';
  }
}
function simulateMaintReminder() {
  if (!state.inMaintenance) { alert('Para ver o lembrete, primeiro coloque um carro em manutencao.'); return; }
  alert('🔔 LEMBRETE DIARIO\n\nO carro ' + state.carPlate + ' ainda esta em manutencao desde ' + (state.maintDate ? state.maintDate.toLocaleDateString('pt-BR') : 'hoje') + '.\n\nMotivo: ' + state.maintReason);
}
function resetAll() {
  state.driverId = null; state.driverName = ''; state.carId = null;
  state.inMaintenance = false; state.maintReason = '';
  state.cost = ''; state.pin = ''; state.isNewDriver = false;
  hideNewDriverInput();
}

function syncNetworkStatus() {
  if (!navigator.onLine) {
    state.offline = true;
    const ns = document.getElementById('netStatus');
    const on = document.getElementById('offlineNote');
    if (ns) { ns.classList.add('offline'); ns.innerHTML = '<span class="dot"></span> Sem internet'; }
    if (on) on.style.display = 'flex';
  } else {
    state.offline = false;
    const ns = document.getElementById('netStatus');
    const on = document.getElementById('offlineNote');
    if (ns) { ns.classList.remove('offline'); ns.innerHTML = '<span class="dot"></span> Online'; }
    if (on) on.style.display = 'none';
  }
}
window.addEventListener('online', syncNetworkStatus);
window.addEventListener('offline', syncNetworkStatus);

function setTodayDate() {
  const days = ['domingo','segunda-feira','terca-feira','quarta-feira','quinta-feira','sexta-feira','sabado'];
  const months = ['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const now = new Date();
  const dateStr = days[now.getDay()] + ', ' + now.getDate() + ' de ' + months[now.getMonth()];
  document.getElementById('todayDate').textContent = dateStr;
  document.getElementById('dashSubDate').textContent = dateStr;
  document.getElementById('confirmDate').textContent = dateStr;
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('[Frota] SW registrado:', reg.scope))
        .catch(err => console.warn('[Frota] Erro ao registrar SW:', err));
    });
  }
}

async function initApp() {
  setTodayDate();
  setRole('driver');
  syncNetworkStatus();
  registerServiceWorker();
  try {
    const [motoristas, carros, pecas] = await Promise.all([
      dbListMotoristas(), dbListCarros(), dbListPecas()
    ]);
    state.motoristas = motoristas; state.carros = carros; state.pecas = pecas;
    renderDriverList(); renderCarList(); renderPartsGrid();
  } catch (e) {
    console.error('[Frota] Falha ao carregar dados iniciais:', e);
    const root = document.querySelector('#page-login .driver-list');
    if (root) root.innerHTML = '<div class="readonly-note"><div class="readonly-note-icon">⚠️</div><div>Nao consegui conectar ao banco. Verifique a internet e atualize a pagina.</div></div>';
  }
}

document.addEventListener('DOMContentLoaded', initApp);
ist(); renderPartsGrid();
  } catch (e) {
    console.error('[Frota] Falha ao carregar dados iniciais:', e);
    const root = document.querySelector('#page-login .driver-list');
    if (root) root.innerHTML = '<div class="readonly-note"><div class="readonly-note-icon">⚠️</div><div>Nao consegui conectar ao banco. Verifique a internet e atualize a pagina.</div></div>';
  }
}

document.addEventListener('DOMContentLoaded', initApp);
