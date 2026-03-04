// Local mock server — замінює api.webart.work для розробки
// Запуск: node mock-server.js
const http = require('http');
const crypto = require('crypto');

const games = {};
const PORT = 3000;
const ORIGIN = 'http://localhost:4200';

function parseCookies(req) {
  const list = {};
  const header = req.headers.cookie;
  if (!header) return list;
  header.split(';').forEach(c => {
    const [k, ...v] = c.trim().split('=');
    list[k.trim()] = decodeURIComponent(v.join('='));
  });
  return list;
}

function getSession(req) {
  const cookies = parseCookies(req);
  return cookies['mock_sid'] || null;
}

const CORS = {
  'Access-Control-Allow-Origin': ORIGIN,
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function send(res, data, newSid) {
  const headers = { 'Content-Type': 'application/json', ...CORS };
  if (newSid) {
    headers['Set-Cookie'] = `mock_sid=${newSid}; Path=/; HttpOnly; SameSite=Lax`;
  }
  res.writeHead(200, headers);
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise(resolve => {
    let raw = '';
    req.on('data', chunk => raw += chunk);
    req.on('end', () => { try { resolve(JSON.parse(raw)); } catch { resolve({}); } });
  });
}

http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    res.end();
    return;
  }

  let sid = getSession(req);
  let newSid = null;
  if (!sid) {
    sid = crypto.randomBytes(16).toString('hex');
    newSid = sid;
  }

  const url = req.url;

  // GET /api/rnd/games
  if (req.method === 'GET' && url === '/api/rnd/games') {
    send(res, Object.values(games), newSid);
    return;
  }

  const body = await parseBody(req);

  // POST /api/rnd/create
  if (req.method === 'POST' && url === '/api/rnd/create') {
    const id = crypto.randomBytes(12).toString('hex');
    const game = {
      _id: id,
      mode: body.mode || 'Classic',
      maxPlayers: Number(body.maxPlayers) || 8,
      creator: sid,
      players: [sid],
      pass: Math.floor(100000 + Math.random() * 900000),
      status: 'lobby',
      data: {},
    };
    games[id] = game;
    console.log(`[CREATE] ${id.slice(0, 8)} mode=${game.mode} sid=${sid.slice(0, 8)}`);
    send(res, game, newSid);
    return;
  }

  // POST /api/rnd/join
  if (req.method === 'POST' && url === '/api/rnd/join') {
    const game = games[body._id];
    if (game && !game.players.includes(sid) && game.players.length < game.maxPlayers) {
      game.players.push(sid);
      console.log(`[JOIN] ${body._id.slice(0, 8)} players=${game.players.length} sid=${sid.slice(0, 8)}`);
      send(res, game, newSid);
    } else {
      send(res, false, newSid);
    }
    return;
  }

  // POST /api/rnd/update
  if (req.method === 'POST' && url === '/api/rnd/update') {
    const game = games[body._id];
    if (game && game.creator === sid) {
      for (const field of Object.keys(body)) {
        if (field !== '_id') game[field] = body[field];
      }
      console.log(`[UPDATE] ${body._id.slice(0, 8)} status=${game.status} phase=${game.data?.phase ?? '-'}`);
      send(res, game, newSid);
    } else {
      send(res, false, newSid);
    }
    return;
  }

  res.writeHead(404, CORS);
  res.end('"Not found"');

}).listen(PORT, () => {
  console.log(`\n✓ Mock API: http://localhost:${PORT}`);
  console.log('  GET  /api/rnd/games');
  console.log('  POST /api/rnd/create');
  console.log('  POST /api/rnd/join');
  console.log('  POST /api/rnd/update\n');
});
