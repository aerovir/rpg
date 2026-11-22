import { createServer } from 'node:http';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const publicDir = join(root, 'public');
const dataDir = join(root, 'data');
const dataFile = join(dataDir, 'players.json');
const port = Number(process.env.PORT || 3000);
const botToken = process.env.BOT_TOKEN || '';
const production = process.env.NODE_ENV === 'production';
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };

const classes = {
  netrunner: { name: 'НЕТРАННЕР', title: 'Призрак в сети', stats: { hack: 3, stealth: 1, combat: 1 }, description: 'Взламывает контуры и читает систему изнутри.' },
  ghost: { name: 'ПРИЗРАК', title: 'Тихий вход', stats: { hack: 1, stealth: 3, combat: 1 }, description: 'Проходит незамеченным и не оставляет следов.' },
  enforcer: { name: 'БОЕЦ', title: 'Тяжёлый аргумент', stats: { hack: 1, stealth: 1, combat: 3 }, description: 'Выдерживает давление и решает проблемы напрямую.' },
};
const mission = {
  id: 'ghost-in-the-wire', title: 'Призрак в проводах', district: 'НИЖНИЙ КОНТУР · СЕКТОР 08',
  brief: 'Фиксер Мара просит вытащить фрагмент памяти из узла корпорации «Арасака». До смены охраны — семь минут.',
  scenes: [
    { id: 'approach', title: 'Подход', text: 'Узел стоит за фасадом закрытой клиники. На входе — камера с устаревшей прошивкой и один охранник.', options: [
      { id: 'hack', label: 'Подменить картинку камеры', skill: 'hack', difficulty: 2, detail: 'Взлом · риск цифрового следа' },
      { id: 'sneak', label: 'Пройти через сервисный люк', skill: 'stealth', difficulty: 2, detail: 'Скрытность · тихий маршрут' },
      { id: 'force', label: 'Отвлечь охрану силой', skill: 'combat', difficulty: 2, detail: 'Силовой вход · риск тревоги' },
    ] },
    { id: 'encounter', title: 'Контакт', text: 'Ты у стойки узла. Защитный процесс заметил чужое присутствие и начал блокировку.', options: [
      { id: 'hack', label: 'Переписать защитный процесс', skill: 'hack', difficulty: 3, detail: 'Взлом · нужен быстрый доступ' },
      { id: 'sneak', label: 'Извлечь носитель вручную', skill: 'stealth', difficulty: 2, detail: 'Точность · без лишнего шума' },
      { id: 'force', label: 'Отключить стойку вручную', skill: 'combat', difficulty: 3, detail: 'Силовой метод · возможен урон' },
    ] },
    { id: 'escape', title: 'Выход', text: 'Фрагмент памяти у тебя. Корпоративная сеть уже подняла тревогу — пора исчезать.', options: [
      { id: 'hack', label: 'Стереть цифровой след', skill: 'hack', difficulty: 2, detail: 'Взлом · чистый выход' },
      { id: 'sneak', label: 'Раствориться в потоке улицы', skill: 'stealth', difficulty: 2, detail: 'Скрытность · безопаснее всего' },
      { id: 'force', label: 'Пробиться через блокпост', skill: 'combat', difficulty: 3, detail: 'Силовой выход · высокий риск' },
    ] },
  ],
};

let players = {};
let writeQueue = Promise.resolve();

function freshPlayer(id, displayName = 'Наёмник') {
  return { id, displayName: String(displayName).slice(0, 40), classId: null, level: 1, xp: 0, credits: 120, reputation: 0, hp: 100, implants: [], completedMissions: 0, activeRun: null, history: [] };
}

async function loadPlayers() {
  await mkdir(dataDir, { recursive: true });
  try { players = JSON.parse(await readFile(dataFile, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; players = {}; }
}

function persist() {
  const snapshot = JSON.stringify(players, null, 2);
  writeQueue = writeQueue.then(() => writeFile(dataFile, snapshot));
  return writeQueue;
}

function safeEqual(a, b) {
  const left = Buffer.from(a); const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function validateTelegramUser(initData) {
  if (!botToken) return { user: null, reason: 'bot_token_missing' };
  if (!initData) return { user: null, reason: 'init_data_missing' };
  const params = new URLSearchParams(initData);
  const receivedHash = params.get('hash');
  if (!receivedHash || !/^[a-f0-9]{64}$/i.test(receivedHash)) return { user: null, reason: 'hash_missing_or_invalid' };
  params.delete('hash');
  const dataCheck = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expected = createHmac('sha256', secret).update(dataCheck).digest('hex');
  if (!safeEqual(expected, receivedHash.toLowerCase())) return { user: null, reason: 'hash_mismatch' };
  const authDate = Number(params.get('auth_date'));
  if (!Number.isFinite(authDate) || Math.abs(Date.now() / 1000 - authDate) > 86400) return { user: null, reason: 'auth_date_invalid_or_expired' };
  try {
    const user = JSON.parse(params.get('user') || 'null');
    return user?.id ? { user, reason: null } : { user: null, reason: 'user_missing' };
  } catch { return { user: null, reason: 'user_invalid_json' }; }
}

function getIdentity(req, url, requestId) {
  const initData = req.headers['x-telegram-init-data'];
  const validation = validateTelegramUser(initData);
  const user = validation.user;
  if (user?.id) return { id: `tg:${user.id}`, displayName: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || 'Наёмник' };
  if (!production && !botToken) return { id: 'dev:local', displayName: 'Локальный наёмник' };
  if (!production && url.searchParams.get('dev') === '1') return { id: 'dev:local', displayName: 'Локальный наёмник' };
  const rawClientState = req.headers['x-telegram-webapp-state'];
  const rawWebAppVersion = req.headers['x-telegram-webapp-version'];
  const clientState = typeof rawClientState === 'string' && /^[a-z_]{1,32}$/.test(rawClientState) ? rawClientState : 'not_reported';
  const webAppVersion = typeof rawWebAppVersion === 'string' && /^[0-9.]{1,20}$/.test(rawWebAppVersion) ? rawWebAppVersion : null;
  const userAgent = req.headers['user-agent'] || '';
  console.warn(JSON.stringify({
    event: 'telegram_auth_rejected', requestId, reason: validation.reason,
    initDataHeaderPresent: typeof initData === 'string' && initData.length > 0,
    initDataLength: typeof initData === 'string' ? initData.length : 0,
    clientState, webAppVersion, telegramUserAgent: /telegram/i.test(userAgent),
  }));
  return null;
}

function getPlayer(identity) {
  if (!players[identity.id]) players[identity.id] = freshPlayer(identity.id, identity.displayName);
  return players[identity.id];
}

function profileView(player) {
  const cls = player.classId ? classes[player.classId] : null;
  return { id: player.id, displayName: player.displayName, classId: player.classId, className: cls?.name || null, classTitle: cls?.title || null, stats: cls?.stats || null, level: player.level, xp: player.xp, nextLevelXp: player.level * 100, credits: player.credits, reputation: player.reputation, hp: player.hp, implants: player.implants, completedMissions: player.completedMissions, history: player.history.slice(0, 5), activeRun: player.activeRun };
}

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 16_000) throw new Error('Request too large'); }
  try { return JSON.parse(raw || '{}'); } catch { throw new Error('Invalid JSON'); }
}

function resolveOption(player, scene, option) {
  const skill = player.classId ? classes[player.classId].stats[option.skill] : 0;
  const implantBonus = player.implants.includes('synapse-key') && option.skill === 'hack' ? 1 : 0;
  const roll = Math.floor(Math.random() * 3) + 1;
  const score = skill + implantBonus + roll;
  const success = score >= option.difficulty + 2;
  const critical = score >= option.difficulty + 4;
  return { scene: scene.id, choice: option.label, success, critical, score, difficulty: option.difficulty, line: success ? (critical ? 'Действие прошло идеально. Следов почти не осталось.' : 'План сработал. Ты продвигаешься к цели.') : 'Система сопротивляется. Ты всё же продвигаешься, но платишь за это.' };
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const requestId = randomUUID();
  const startedAt = Date.now();
  res.setHeader('X-Request-Id', requestId);
  res.on('finish', () => console.log(JSON.stringify({ event: 'http_request', requestId, method: req.method, path: url.pathname, status: res.statusCode, durationMs: Date.now() - startedAt })));
  if (url.pathname.startsWith('/api/')) {
    const identity = getIdentity(req, url, requestId);
    if (!identity) return json(res, 401, { error: 'Открой игру через Telegram Mini App.' });
    const player = getPlayer(identity);
    try {
      if (req.method === 'GET' && url.pathname === '/api/state') return json(res, 200, { profile: profileView(player), mission: { id: mission.id, title: mission.title, district: mission.district, brief: mission.brief, scenes: mission.scenes }, classes: Object.entries(classes).map(([id, item]) => ({ id, ...item })) });
      if (req.method === 'POST' && url.pathname === '/api/class') {
        const body = await readBody(req);
        if (!classes[body.classId]) return json(res, 400, { error: 'Неизвестный класс.' });
        if (player.classId && player.classId !== body.classId) return json(res, 409, { error: 'Класс уже выбран.' });
        player.classId = body.classId; await persist(); return json(res, 200, { profile: profileView(player) });
      }
      if (req.method === 'POST' && url.pathname === '/api/mission/start') {
        if (!player.classId) return json(res, 409, { error: 'Сначала выбери специализацию.' });
        if (player.activeRun) return json(res, 409, { error: 'Миссия уже начата.' });
        player.activeRun = { missionId: mission.id, sceneIndex: 0, outcomes: [], startedAt: Date.now() };
        await persist(); return json(res, 200, { profile: profileView(player) });
      }
      if (req.method === 'POST' && url.pathname === '/api/mission/choice') {
        const body = await readBody(req); const run = player.activeRun;
        if (!run || run.missionId !== mission.id) return json(res, 409, { error: 'Нет активной миссии.' });
        const scene = mission.scenes[run.sceneIndex];
        if (!scene) return json(res, 409, { error: 'Миссия уже завершена.' });
        const option = scene.options.find(item => item.id === body.optionId);
        if (!option) return json(res, 400, { error: 'Выбери доступное действие.' });
        const outcome = resolveOption(player, scene, option);
        run.outcomes.push(outcome); run.sceneIndex += 1;
        let result = null;
        if (run.sceneIndex >= mission.scenes.length) {
          const successes = run.outcomes.filter(item => item.success).length;
          const clean = run.outcomes.every(item => item.success);
          const credits = 70 + successes * 25;
          const xp = 45 + successes * 20;
          player.credits += credits; player.xp += xp; player.reputation += clean ? 3 : 1; player.completedMissions += 1;
          player.hp = Math.max(40, player.hp - run.outcomes.filter(item => !item.success).length * 12);
          while (player.xp >= player.level * 100) { player.xp -= player.level * 100; player.level += 1; }
          result = { success: successes >= 2, clean, successes, credits, xp, reputation: clean ? 3 : 1, outcomes: run.outcomes };
          player.history.unshift({ title: mission.title, at: new Date().toISOString(), success: result.success, credits });
          player.history = player.history.slice(0, 10); player.activeRun = null;
        }
        await persist(); return json(res, 200, { profile: profileView(player), outcome, nextScene: result ? null : mission.scenes[run.sceneIndex], result });
      }
      if (req.method === 'POST' && url.pathname === '/api/implant/buy') {
        const implant = { id: 'synapse-key', name: 'Ключ синапса', cost: 90 };
        if (!player.classId) return json(res, 409, { error: 'Сначала выбери специализацию.' });
        if (player.implants.includes(implant.id)) return json(res, 409, { error: 'Имплант уже установлен.' });
        if (player.credits < implant.cost) return json(res, 409, { error: 'Не хватает кредитов.' });
        player.credits -= implant.cost; player.implants.push(implant.id); await persist(); return json(res, 200, { profile: profileView(player) });
      }
      return json(res, 404, { error: 'Не найдено.' });
    } catch (error) { return json(res, error.message === 'Invalid JSON' ? 400 : 500, { error: error.message }); }
  }

  const requested = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
  const file = normalize(join(publicDir, requested));
  if (!file.startsWith(publicDir + '/') && file !== join(publicDir, 'index.html')) { res.writeHead(403); return res.end('Forbidden'); }
  try { const content = await readFile(file); res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' }); res.end(content); }
  catch { res.writeHead(404); res.end('Not found'); }
});

await loadPlayers();
server.listen(port, '0.0.0.0', () => console.log(`Cyberpunk Mini App listening on http://localhost:${port}`));
