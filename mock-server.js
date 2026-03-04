// Local mock server — API + Angular static files
// Запуск: node mock-server.js
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const games = {};
const PORT = 3000;
const DIST = path.join(__dirname, 'dist', 'role-nowadays', 'browser');

// ── Static file serving ───────────────────────────────────────────────

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.mjs':  'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.svg':  'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.txt':  'text/plain',
};

function serveStatic(req, res) {
  let filePath = path.join(DIST, req.url.split('?')[0]);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST, 'index.html'); // Angular HTML5 routing
  }
  const ext = path.extname(filePath);
  const content = fs.readFileSync(filePath);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
  res.end(content);
}

// ── Session helpers ───────────────────────────────────────────────────

function parseCookies(req) {
  const list = {};
  (req.headers.cookie || '').split(';').forEach(c => {
    const [k, ...v] = c.trim().split('=');
    if (k) list[k.trim()] = decodeURIComponent(v.join('='));
  });
  return list;
}

function getSession(req) {
  return parseCookies(req)['mock_sid'] || null;
}

function parseBody(req) {
  return new Promise(resolve => {
    let raw = '';
    req.on('data', chunk => raw += chunk);
    req.on('end', () => { try { resolve(JSON.parse(raw)); } catch { resolve({}); } });
  });
}

function send(res, data, newSid) {
  const headers = { 'Content-Type': 'application/json' };
  if (newSid) headers['Set-Cookie'] = `mock_sid=${newSid}; Path=/; HttpOnly; SameSite=Lax`;
  res.writeHead(200, headers);
  res.end(JSON.stringify(data));
}

// ── Game logic ────────────────────────────────────────────────────────

const ROLE_TEAMS = { Mafia: 'mafia', Detective: 'city', Doctor: 'city', Villager: 'city' };

function isNightComplete(game) {
  const data = game.data;
  if (!data || data.phase !== 'night') return false;
  const alive = data.alive || [];
  const roles = data.roles || {};
  const night = data.night || {};

  const hasMafia      = alive.some(i => roles[String(i)] === 'Mafia');
  const hasDoctor     = alive.some(i => roles[String(i)] === 'Doctor');
  const hasDetective  = alive.some(i => roles[String(i)] === 'Detective');

  if (hasMafia     && night.mafiaTarget      == null) return false;
  if (hasDoctor    && night.doctorTarget     == null) return false;
  if (hasDetective && night.detectiveTarget  == null) return false;
  return true;
}

function resolveNight(game) {
  const data = JSON.parse(JSON.stringify(game.data));
  const { mafiaTarget, doctorTarget, detectiveTarget } = data.night;

  if (detectiveTarget != null) {
    const role = data.roles[String(detectiveTarget)];
    data.night.detectiveResult = ROLE_TEAMS[role] === 'mafia' ? 'mafia' : 'village';
  }

  data.eliminated = null;

  if (mafiaTarget != null) {
    if (doctorTarget === mafiaTarget) {
      data.log.push(`Раунд ${data.round}: Лікар врятував гравця ${mafiaTarget + 1}.`);
    } else {
      data.eliminated = mafiaTarget;
      data.alive = data.alive.filter(i => i !== mafiaTarget);
      data.log.push(`Раунд ${data.round}: Гравець ${mafiaTarget + 1} (${data.roles[String(mafiaTarget)]}) загинув від руки мафії.`);
    }
  } else {
    data.log.push(`Раунд ${data.round}: Ніхто не загинув.`);
  }

  data.phase = 'day';
  data.phaseStartedAt = Date.now();
  data.votes = {};
  data.dayMessages = [];
  game.data = data;
}

function checkWin(game) {
  const data = game.data;
  const aliveRoles = (data.alive || []).map(i => data.roles[String(i)]);
  const mafiaCount   = aliveRoles.filter(r => ROLE_TEAMS[r] === 'mafia').length;
  const villageCount = aliveRoles.filter(r => ROLE_TEAMS[r] === 'city').length;
  if (mafiaCount === 0) return 'village';
  if (mafiaCount >= villageCount) return 'mafia';
  return null;
}

function resolveVoting(game, targetIdx) {
  const data = JSON.parse(JSON.stringify(game.data));
  data.eliminated = targetIdx;
  data.alive = data.alive.filter(i => i !== targetIdx);
  data.log.push(`Раунд ${data.round}: Гравець ${targetIdx + 1} (${data.roles[String(targetIdx)]}) усунений голосуванням.`);
  data.round += 1;
  data.phase = 'night';
  data.phaseStartedAt = Date.now();
  data.night = { mafiaTarget: null, doctorTarget: null, detectiveTarget: null, detectiveResult: null };
  data.votes = {};
  data.nightMessages = [];
  game.data = data;
}

function resolveTie(game) {
  const data = JSON.parse(JSON.stringify(game.data));
  data.eliminated = null;
  data.log.push(`Раунд ${data.round}: Нічия! Ніхто не усунений.`);
  data.round += 1;
  data.phase = 'night';
  data.phaseStartedAt = Date.now();
  data.night = { mafiaTarget: null, doctorTarget: null, detectiveTarget: null, detectiveResult: null };
  data.votes = {};
  data.nightMessages = [];
  game.data = data;
}

// ── Server ────────────────────────────────────────────────────────────

http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];

  // Статичні файли Angular (не API)
  if (!url.startsWith('/api/rnd')) {
    try { serveStatic(req, res); }
    catch { res.writeHead(404); res.end(); }
    return;
  }

  // Сесія (GET: з cookie, POST: з тіла _sid)
  let sid = getSession(req);
  let newSid = null;
  if (!sid) { sid = crypto.randomBytes(16).toString('hex'); newSid = sid; }

  // GET /api/rnd/games
  if (req.method === 'GET' && url === '/api/rnd/games') {
    send(res, Object.values(games), newSid);
    return;
  }

  const body = await parseBody(req);

  // Якщо клієнт надіслав _sid у тілі — використовуємо його
  if (body._sid) { sid = body._sid; newSid = null; }

  // POST /api/rnd/create
  if (req.method === 'POST' && url === '/api/rnd/create') {
    const id = crypto.randomBytes(12).toString('hex');
    const game = {
      _id: id,
      mode: body.mode || 'Classic',
      maxPlayers: Number(body.maxPlayers) || 8,
      creator: sid,
      players: [sid],
      nicknames: [String(body.nickname || 'Гравець 1').slice(0, 30)],
      pass: Math.floor(100000 + Math.random() * 900000),
      status: 'lobby',
      data: {},
    };
    games[id] = game;
    console.log(`[CREATE] ${id.slice(0,8)} mode=${game.mode} players=1/${game.maxPlayers}`);
    send(res, game, newSid);
    return;
  }

  // POST /api/rnd/join
  if (req.method === 'POST' && url === '/api/rnd/join') {
    const game = games[body._id];
    if (game && !game.players.includes(sid) && game.players.length < game.maxPlayers) {
      const playerNum = game.players.length + 1;
      game.players.push(sid);
      if (!game.nicknames) game.nicknames = [];
      game.nicknames.push(String(body.nickname || `Гравець ${playerNum}`).slice(0, 30));
      console.log(`[JOIN]   ${body._id.slice(0,8)} players=${game.players.length}/${game.maxPlayers}`);
      send(res, game, newSid);
    } else {
      send(res, false, newSid);
    }
    return;
  }

  // POST /api/rnd/update
  if (req.method === 'POST' && url === '/api/rnd/update') {
    const game = games[body._id];
    if (!game) { send(res, false, newSid); return; }

    const isPlayer = game.players.includes(sid);
    if (!isPlayer) { send(res, false, newSid); return; }

    // Старт гри — будь-який гравець
    if (game.status === 'lobby' && body.status === 'running' && body.data) {
      game.status = 'running';
      game.data = body.data;
      if (!game.data.phaseStartedAt) game.data.phaseStartedAt = Date.now();
      if (!game.data.votes) game.data.votes = {};
      console.log(`[START]  ${body._id.slice(0,8)} розпочато гравцем ${game.players.indexOf(sid) + 1}`);
      send(res, game, newSid);
      return;
    }

    if (game.status === 'running') {
      const phase = game.data?.phase;
      const playerIndex = game.players.indexOf(sid);

      // День → Голосування (ідемпотентно: тільки якщо ще 'day')
      if (body.data?.phase === 'voting' && phase === 'day') {
        game.data.phase = 'voting';
        game.data.phaseStartedAt = Date.now();
        game.data.votes = {};
        console.log(`[PHASE]  ${body._id.slice(0,8)} день→голосування`);
        send(res, game, newSid);
        return;
      }

      // Нічна дія
      if (phase === 'night') {
        const role = game.data?.roles?.[String(playerIndex)];
        const targetMap = { Mafia: 'mafiaTarget', Doctor: 'doctorTarget', Detective: 'detectiveTarget' };
        const field = targetMap[role];
        if (field && body.data?.night?.[field] !== undefined) {
          if (!game.data.night) game.data.night = {};
          game.data.night[field] = body.data.night[field];
          console.log(`[NIGHT]  ${body._id.slice(0,8)} ${role} → Гравець ${body.data.night[field] + 1}`);

          // Авторозв'язання ночі
          if (isNightComplete(game)) {
            resolveNight(game);
            console.log(`[AUTO]   ${body._id.slice(0,8)} ніч авторозв'язана → день`);
            const winner = checkWin(game);
            if (winner) {
              game.data.phase = 'finished';
              game.data.winner = winner;
              game.data.log.push(winner === 'village' ? 'Місто перемогло!' : 'Мафія перемогла!');
              game.status = 'finished';
              console.log(`[WIN]    ${body._id.slice(0,8)} переміг: ${winner}`);
            }
          }

          send(res, game, newSid);
          return;
        }
        send(res, false, newSid);
        return;
      }
    }

    send(res, false, newSid);
    return;
  }

  // POST /api/rnd/vote
  if (req.method === 'POST' && url === '/api/rnd/vote') {
    const game = games[body._id];
    if (!game) { send(res, false, newSid); return; }

    if (game.status !== 'running' || game.data?.phase !== 'voting') {
      send(res, false, newSid);
      return;
    }

    const voterIndex = game.players.indexOf(sid);
    if (voterIndex < 0 || !game.data.alive?.includes(voterIndex)) {
      send(res, false, newSid);
      return;
    }

    const targetIndex = Number(body.targetIndex);
    if (!game.data.alive?.includes(targetIndex)) {
      send(res, false, newSid);
      return;
    }

    if (!game.data.votes) game.data.votes = {};
    game.data.votes[String(voterIndex)] = targetIndex;
    console.log(`[VOTE]   ${body._id.slice(0,8)} Гравець ${voterIndex + 1} → Гравець ${targetIndex + 1}`);

    // Перевірка чи всі живі проголосували
    const alive = game.data.alive || [];
    const allVoted = alive.every(i => game.data.votes[String(i)] !== undefined);

    if (allVoted) {
      // Підрахунок голосів
      const voteCounts = {};
      alive.forEach(i => {
        const t = game.data.votes[String(i)];
        if (t !== undefined) voteCounts[t] = (voteCounts[t] || 0) + 1;
      });

      let maxVotes = 0;
      Object.values(voteCounts).forEach(c => { if (c > maxVotes) maxVotes = c; });
      const candidates = Object.keys(voteCounts).filter(k => voteCounts[k] === maxVotes).map(Number);
      if (candidates.length > 1) {
        resolveTie(game);
        console.log(`[TIE]    ${body._id.slice(0,8)} Нічия, ніхто не усунений`);
      } else {
        const eliminated = candidates[0];
        resolveVoting(game, eliminated);
        console.log(`[ELIM]   ${body._id.slice(0,8)} Гравець ${eliminated + 1} усунений`);
      }

      const winner = checkWin(game);
      if (winner) {
        game.data.phase = 'finished';
        game.data.winner = winner;
        game.data.log.push(winner === 'village' ? 'Місто перемогло!' : 'Мафія перемогла!');
        game.status = 'finished';
        console.log(`[WIN]    ${body._id.slice(0,8)} переміг: ${winner}`);
      }
    }

    send(res, game, newSid);
    return;
  }

  // POST /api/rnd/chat/day
  if (req.method === 'POST' && url === '/api/rnd/chat/day') {
    const game = games[body._id];
    if (!game || game.data?.phase !== 'day') { send(res, false, newSid); return; }
    const playerIndex = game.players.indexOf(sid);
    if (playerIndex < 0 || !game.data.alive?.includes(playerIndex)) { send(res, false, newSid); return; }
    if (!game.data.dayMessages) game.data.dayMessages = [];
    game.data.dayMessages.push({ sender: playerIndex, text: String(body.text).slice(0, 200) });
    send(res, game, newSid);
    return;
  }

  // POST /api/rnd/chat/night
  if (req.method === 'POST' && url === '/api/rnd/chat/night') {
    const game = games[body._id];
    if (!game || game.data?.phase !== 'night') { send(res, false, newSid); return; }
    const playerIndex = game.players.indexOf(sid);
    const role = game.data?.roles?.[String(playerIndex)];
    if (playerIndex < 0 || !game.data.alive?.includes(playerIndex) || role !== 'Mafia') {
      send(res, false, newSid); return;
    }
    if (!game.data.nightMessages) game.data.nightMessages = [];
    game.data.nightMessages.push({ sender: playerIndex, text: String(body.text).slice(0, 200) });
    send(res, game, newSid);
    return;
  }

  res.writeHead(404);
  res.end('"Not found"');

}).listen(PORT, () => {
  console.log(`\n✓ Server: http://localhost:${PORT}`);
  console.log(`  API:    http://localhost:${PORT}/api/rnd/games`);
  console.log(`  App:    http://localhost:${PORT}/\n`);
});
