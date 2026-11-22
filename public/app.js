const tg = window.Telegram?.WebApp;
tg?.ready();
tg?.expand();
tg?.setHeaderColor?.('#090d13');
tg?.setBackgroundColor?.('#090d13');

const app = document.querySelector('#app');
const toast = document.querySelector('#toast');
const statsName = { hack: 'ВЗЛОМ', stealth: 'СКРЫТНОСТЬ', combat: 'БОЙ' };
let state = null;
let selectedClass = null;
let busy = false;
let soundEnabled = false;

async function api(path, body) {
  const telegramState = !tg ? 'sdk_missing' : tg.initData ? 'init_data_present' : 'init_data_empty';
  const headers = { 'Content-Type': 'application/json', 'X-Telegram-WebApp-State': telegramState, ...(tg?.version ? { 'X-Telegram-WebApp-Version': String(tg.version) } : {}), ...(tg?.initData ? { 'X-Telegram-Init-Data': tg.initData } : {}) };
  const response = await fetch(path, { method: body ? 'POST' : 'GET', headers, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Ошибка связи с сервером.');
  return data;
}

function notify(message) { toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2600); }
function initials(name) { return (name || 'NC').split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase(); }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
function xpPercent(profile) { return Math.min(100, profile.xp / profile.nextLevelXp * 100); }

function render() {
  const p = state.profile;
  if (!p.classId) return renderClassPicker();
  if (p.activeRun) return renderMission();
  if (state.result) return renderResult();
  return renderDashboard();
}

function renderClassPicker() {
  app.innerHTML = `<section class="hero"><span class="eyebrow">НОВАЯ ЛИЧНОСТЬ // РЕГИСТРАЦИЯ</span><h1>ГОРОД НЕ<br>ЖДЁТ.</h1><p class="subhead">Выбери специализацию. Она задаст твой подход к работе — изменить решение позже не получится.</p></section><div class="section-heading"><span class="section-label">01 / СПЕЦИАЛИЗАЦИЯ</span><span class="step-count">ВЫБЕРИ ОДНУ</span></div><div class="grid class-grid">${state.classes.map((item, i) => `<button class="class-card ${selectedClass === item.id ? 'selected' : ''}" data-class="${item.id}"><div class="class-card-head"><span class="class-number">0${i + 1} // ${item.name}</span><span class="class-cta">↗</span></div><h3>${item.title}</h3><p>${item.description}</p><div class="skill-list">${Object.entries(item.stats).map(([key, val]) => `<span class="skill-chip">${statsName[key]} ${val}</span>`).join('')}</div></button>`).join('')}</div><button class="button full" id="choose-class" ${selectedClass ? '' : 'disabled'}>ЗАКРЕПИТЬ ЛИЧНОСТЬ <span class="btn-arrow">→</span></button>`;
  app.querySelectorAll('[data-class]').forEach(button => button.onclick = () => { selectedClass = button.dataset.class; renderClassPicker(); });
  app.querySelector('#choose-class').onclick = () => act(async () => { const data = await api('/api/class', { classId: selectedClass }); state.profile = data.profile; render(); notify('Личность закреплена. Добро пожаловать в Контур.'); });
}

function renderDashboard() {
  const p = state.profile;
  const implantInstalled = p.implants.includes('synapse-key');
  app.innerHTML = `<section class="hero"><span class="eyebrow">${escapeHtml(state.mission.district)}</span><h1>ГОРОД<br>СЛЫШИТ.</h1><p class="subhead">Каждый долг оставляет след. Каждый выбор меняет то, кто ответит на твой звонок.</p><div class="status-line"><span>СЕТЬ</span><strong>ЗАЩИЩЁННАЯ</strong><span>·</span><span>ФИКСЕР НА ЛИНИИ</span></div></section><section class="panel"><div class="profile-row"><div class="avatar">${escapeHtml(initials(p.displayName))}</div><div><div class="profile-name">${escapeHtml(p.displayName)}</div><div class="profile-class">${p.className} · ${p.classTitle}</div></div><div class="level">УР. ${p.level}</div></div><div class="xp-track"><span style="width:${xpPercent(p)}%"></span></div></section><div class="grid stats-grid"><div class="stat"><label>КРЕДИТЫ</label><strong class="acid">${p.credits}<small> ¤</small></strong></div><div class="stat"><label>РЕПУТАЦИЯ</label><strong>${p.reputation}</strong></div><div class="stat"><label>СОСТОЯНИЕ</label><strong>${p.hp}<small> HP</small></strong></div></div><div class="section-heading"><span class="section-label">АКТИВНАЯ РАБОТА</span><span class="step-count">ОПЛАТА 70–145 ¤</span></div><article class="mission-card"><div class="mission-card-top"><span class="tag">${escapeHtml(state.mission.district)}</span><span class="tag">3–5 МИН</span></div><h2>${escapeHtml(state.mission.title)}</h2><p class="mission-copy">${escapeHtml(state.mission.brief)}</p><button class="button" id="start-mission">ПРИНЯТЬ РАБОТУ <span class="btn-arrow">→</span></button></article><div class="section-heading"><span class="section-label">СНАРЯЖЕНИЕ</span><span class="step-count">${p.implants.length} / 3 СЛОТА</span></div><div class="grid two-col"><article class="panel"><div class="panel-title"><h3>Ключ синапса</h3><span class="implant-icon">⌘</span></div><p class="implant-desc">+1 к проверкам взлома. Небольшой инструмент для больших дверей.</p><button class="small-button" id="buy-implant" ${implantInstalled || p.credits < 90 ? 'disabled' : ''}>${implantInstalled ? 'УСТАНОВЛЕН ✓' : p.credits < 90 ? 'НУЖНО 90 ¤' : 'УСТАНОВИТЬ · 90 ¤'}</button></article><article class="panel"><div class="panel-title"><h3>Прогресс</h3><span class="implant-icon">↗</span></div><p class="implant-desc">Миссий завершено: <strong>${p.completedMissions}</strong><br>До следующего уровня: <strong>${p.nextLevelXp - p.xp} XP</strong></p></article></div><div class="section-heading"><span class="section-label">ПОСЛЕДНИЕ ОПЕРАЦИИ</span><span class="step-count">${p.history.length} / 10</span></div><div class="panel history">${p.history.length ? p.history.map(item => `<div class="history-row"><span>${escapeHtml(item.title)}</span><span class="history-result">${item.success ? 'УСПЕХ' : 'ЧАСТИЧНО'} · +${item.credits} ¤</span></div>`).join('') : '<span class="muted">Записей пока нет. Первая работа ждёт.</span>'}</div>`;
  app.querySelector('#start-mission').onclick = () => act(async () => { const data = await api('/api/mission/start', {}); state.profile = data.profile; state.result = null; render(); });
  app.querySelector('#buy-implant').onclick = () => act(async () => { const data = await api('/api/implant/buy', {}); state.profile = data.profile; render(); notify('Ключ синапса установлен.'); });
}

function renderMission() {
  const run = state.profile.activeRun; const scene = state.mission.scenes[run.sceneIndex];
  if (!scene) { state.profile.activeRun = null; return render(); }
  const history = run.outcomes || [];
  app.innerHTML = `<div class="mission-header"><div><span class="eyebrow">${escapeHtml(state.mission.district)}</span><h2>${escapeHtml(state.mission.title)}</h2></div><span class="step-count">${String(run.sceneIndex + 1).padStart(2, '0')} / 03</span></div><div class="step-track">${state.mission.scenes.map((_, i) => `<i class="${i < run.sceneIndex ? 'done' : ''}"></i>`).join('')}</div>${history.length ? `<div class="outcome ${history.at(-1).success ? '' : 'failed'}">${escapeHtml(history.at(-1).line)}</div>` : ''}<article class="scene-card"><span class="eyebrow">СЦЕНА 0${run.sceneIndex + 1} // ${escapeHtml(scene.title)}</span><p>${escapeHtml(scene.text)}</p></article><div class="section-heading"><span class="section-label">ВЫБЕРИ ДЕЙСТВИЕ</span><span class="step-count">ПРОВЕРКА НА СЕРВЕРЕ</span></div><div class="choices">${scene.options.map(option => `<button class="choice" data-choice="${option.id}"><strong>${escapeHtml(option.label)}</strong><span>${escapeHtml(option.detail)}</span><span class="choice-arrow">↗</span></button>`).join('')}</div>`;
  app.querySelectorAll('[data-choice]').forEach(button => button.onclick = () => act(async () => {
    const data = await api('/api/mission/choice', { optionId: button.dataset.choice });
    state.profile = data.profile; state.lastOutcomes = [...(state.lastOutcomes || []), data.outcome];
    if (data.result) { state.result = data.result; state.lastOutcomes = null; }
    render();
  }));
}

function renderResult() {
  const r = state.result; const p = state.profile;
  app.innerHTML = `<section class="hero"><span class="eyebrow">ОПЕРАЦИЯ ЗАКРЫТА // ${r.clean ? 'БЕЗ СЛЕДОВ' : 'ОСТАВЛЕНЫ СЛЕДЫ'}</span><h1>${r.success ? 'ДАННЫЕ<br>ИЗВЛЕЧЕНЫ.' : 'ЧАСТИЧНЫЙ<br>УСПЕХ.'}</h1><p class="subhead">${r.clean ? 'Мара получила пакет. Корпоративная сеть пока не знает, кто заходил.' : 'Пакет у Мары, но корпорация заметила вмешательство. Улица уже обсуждает твоё имя.'}</p></section><article class="result-card"><div class="result-symbol">${r.success ? '✓' : '!'}</div><h2>${r.success ? 'РАБОТА ВЫПОЛНЕНА' : 'МИССИЯ ЗАВЕРШЕНА'}</h2><p class="muted">Успешных этапов: ${r.successes} / 3</p><div class="reward-grid"><div class="reward"><strong>+${r.credits}</strong><span>КРЕДИТЫ</span></div><div class="reward"><strong>+${r.xp}</strong><span>ОПЫТ</span></div><div class="reward"><strong>+${r.reputation}</strong><span>РЕПУТАЦИЯ</span></div></div><button class="button full" id="return">ВЕРНУТЬСЯ В УБЕЖИЩЕ <span class="btn-arrow">→</span></button></article><div class="section-heading"><span class="section-label">СОСТОЯНИЕ</span></div><div class="grid stats-grid"><div class="stat"><label>КРЕДИТЫ</label><strong class="acid">${p.credits} ¤</strong></div><div class="stat"><label>РЕПУТАЦИЯ</label><strong>${p.reputation}</strong></div><div class="stat"><label>ЗДОРОВЬЕ</label><strong>${p.hp} HP</strong></div></div>`;
  app.querySelector('#return').onclick = () => { state.result = null; state.lastOutcomes = null; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
}

async function act(callback) {
  if (busy) return; busy = true;
  app.querySelectorAll('button').forEach(button => button.disabled = true);
  try { await callback(); } catch (error) { notify(error.message); } finally { busy = false; }
}

document.querySelector('#sound-toggle').onclick = event => { soundEnabled = !soundEnabled; event.currentTarget.textContent = soundEnabled ? '◗' : '◖'; event.currentTarget.setAttribute('aria-label', soundEnabled ? 'Звук включён' : 'Звук выключен'); };

try { state = await api('/api/state'); render(); }
catch (error) { app.innerHTML = `<section class="hero"><span class="eyebrow">СОЕДИНЕНИЕ НЕ УСТАНОВЛЕНО</span><h1>СИГНАЛ<br>ПОТЕРЯН.</h1><p class="subhead">${escapeHtml(error.message)}</p><div class="notice">Для запуска в Telegram настрой HTTPS адрес Mini App в BotFather. Для локальной разработки выполни <code>npm start</code> и открой localhost.</div><button class="button" id="retry" style="margin-top:18px">ПОВТОРИТЬ <span class="btn-arrow">↻</span></button></section>`; app.querySelector('#retry').onclick = () => location.reload(); }
