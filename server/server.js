/**
 * PARALLAX 3D CYBER-CITY // HEROKU MULTIPLAYER & GITHUB OAUTH SERVER
 * Author: Rodrigo Carrasco (Parallax / equisde)
 * Stack: Node.js 20, Express, Socket.IO, Axios
 */

require('dotenv').config();
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const cors = require('cors');
const axios = require('axios');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'https://itsparallax.me';
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';

// Middleware
app.use(express.json());
app.use(cors({
  origin: [CLIENT_ORIGIN, 'https://equisde.github.io', 'http://localhost:3000', 'http://127.0.0.1:5500'],
  credentials: true
}));

// In-Memory World State
const connectedPlayers = new Map();
const worldObjects = {
  blackoutActive: false,
  trafficPhase: 'AUTO', // AUTO, ALL_GREEN, ALL_RED
  hackedCameras: new Set()
};

// -------------------------------------------------------------
// REST API & GITHUB OAUTH 2.0 FLOW
// -------------------------------------------------------------
app.get('/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'PARALLAX_CYBER_CITY_AUTHORITATIVE_SERVER',
    playersOnline: connectedPlayers.size,
    worldState: {
      blackoutActive: worldObjects.blackoutActive,
      trafficPhase: worldObjects.trafficPhase,
      hackedCamerasCount: worldObjects.hackedCameras.size
    },
    clientOrigin: CLIENT_ORIGIN,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Root Landing Dashboard (Resolves "Cannot GET /" on Heroku)
app.get('/', (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PARALLAX CYBER-CITY // Heroku Server Grid</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --neon-cyan: #00f0ff;
      --neon-pink: #ff007f;
      --neon-green: #00ff66;
      --neon-gold: #ffd700;
      --bg-dark: #050811;
      --card-bg: rgba(10, 16, 30, 0.85);
      --border: rgba(0, 240, 255, 0.3);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg-dark);
      background-image:
        radial-gradient(circle at 50% 20%, rgba(0, 240, 255, 0.08) 0%, transparent 60%),
        linear-gradient(rgba(0, 240, 255, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 240, 255, 0.03) 1px, transparent 1px);
      background-size: 100% 100%, 30px 30px, 30px 30px;
      color: #e2e8f0;
      font-family: 'JetBrains Mono', monospace;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .c2-card {
      width: 100%;
      max-width: 780px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 14px;
      box-shadow: 0 0 40px rgba(0, 240, 255, 0.15), inset 0 0 20px rgba(0, 240, 255, 0.05);
      padding: 36px 32px;
      backdrop-filter: blur(12px);
    }
    .c2-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(0, 255, 102, 0.15);
      border: 1px solid var(--neon-green);
      color: var(--neon-green);
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.76rem;
      font-weight: 700;
      letter-spacing: 1px;
      margin-bottom: 16px;
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      background: var(--neon-green);
      border-radius: 50%;
      box-shadow: 0 0 10px var(--neon-green);
      animation: pulse 1.6s infinite ease-in-out;
    }
    @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.85); } }
    h1 {
      font-family: 'Orbitron', monospace;
      font-size: 1.85rem;
      font-weight: 900;
      color: #fff;
      letter-spacing: 1.5px;
      text-shadow: 0 0 15px rgba(0, 240, 255, 0.5);
      margin-bottom: 8px;
    }
    .c2-desc {
      color: #94a3b8;
      font-size: 0.88rem;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 14px;
      margin-bottom: 28px;
    }
    .stat-box {
      background: rgba(6, 11, 22, 0.8);
      border: 1px solid rgba(0, 240, 255, 0.18);
      border-radius: 8px;
      padding: 14px;
    }
    .stat-label { font-size: 0.7rem; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
    .stat-value { font-family: 'Orbitron', monospace; font-size: 1.3rem; font-weight: 700; color: var(--neon-cyan); margin-top: 4px; }
    .actions-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 8px;
    }
    .c2-btn {
      font-family: 'Orbitron', monospace;
      font-size: 0.82rem;
      font-weight: 700;
      letter-spacing: 1px;
      text-decoration: none;
      padding: 12px 20px;
      border-radius: 8px;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .btn-primary {
      background: linear-gradient(135deg, #00f0ff, #0077aa);
      color: #030814;
      border: 1px solid var(--neon-cyan);
      box-shadow: 0 0 20px rgba(0, 240, 255, 0.35);
    }
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 0 28px rgba(0, 240, 255, 0.65);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.04);
      color: var(--neon-cyan);
      border: 1px solid var(--border);
    }
    .btn-secondary:hover {
      background: rgba(0, 240, 255, 0.1);
      border-color: var(--neon-cyan);
    }
    .footer-note {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 0.72rem;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }
  </style>
</head>
<body>
  <div class="c2-card">
    <div class="c2-badge">
      <div class="pulse-dot"></div>
      AUTHORITATIVE GRID ONLINE
    </div>
    <h1>PARALLAX CYBER-CITY // C2 NODE</h1>
    <p class="c2-desc">
      Servidor autoritativo de telemetría, WebSocket multijugador y autenticación GitHub OAuth para el mundo abierto 3D y simulador Watch Dogs de Parallax.
    </p>

    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-label">Operativos en Línea</div>
        <div class="stat-value" id="disp-players">${connectedPlayers.size}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Estado de Red</div>
        <div class="stat-value" style="color: var(--neon-green);" id="disp-grid">${worldObjects.blackoutActive ? 'BLACKOUT' : 'ACTIVO'}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Semáforos</div>
        <div class="stat-value" style="color: var(--neon-gold); font-size: 1.05rem;" id="disp-traffic">${worldObjects.trafficPhase}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Heroku Dyno</div>
        <div class="stat-value" style="font-size: 1.05rem;">ECO / NODE 20</div>
      </div>
    </div>

    <div class="actions-row">
      <a href="${CLIENT_ORIGIN}/game3d.html" target="_blank" class="c2-btn btn-primary" style="background: linear-gradient(135deg, #ffd700, #ff8800); color: #000; border-color: #ffd700; box-shadow: 0 0 20px rgba(255, 215, 0, 0.4);">
        🚀 JUGAR STANDALONE (PANTALLA COMPLETA) &rarr;
      </a>
      <a href="${CLIENT_ORIGIN}#arcade-module" class="c2-btn btn-secondary">
        🎮 JUGAR EN IT’SPARALLAX.ME
      </a>
      <a href="/auth/github" class="c2-btn btn-secondary">
        ⚡ CONECTAR CON GITHUB
      </a>
      <a href="/health" class="c2-btn btn-secondary" target="_blank">
        📡 TELEMETRÍA JSON
      </a>
    </div>

    <div class="footer-note">
      <span>Architect: <b>Rodrigo Carrasco (Parallax / equisde)</b> &middot; Alliance: <b>IMXNOOBX</b></span>
      <span>Heroku Student Pack Protected</span>
    </div>
  </div>

  <script>
    // Live update telemetry polling every 4 seconds
    setInterval(async () => {
      try {
        const res = await fetch('/health');
        if (res.ok) {
          const d = await res.json();
          document.getElementById('disp-players').textContent = d.playersOnline;
          document.getElementById('disp-grid').textContent = d.worldState?.blackoutActive ? 'BLACKOUT' : 'ACTIVO';
          document.getElementById('disp-traffic').textContent = d.worldState?.trafficPhase || 'AUTO';
        }
      } catch (e) {}
    }, 4000);
  </script>
</body>
</html>`;
  res.send(html);
});

// Step 1: Initiate GitHub OAuth Login
app.get('/auth/github', (req, res) => {
  if (!GITHUB_CLIENT_ID) {
    return res.status(500).json({ error: 'GITHUB_CLIENT_ID not configured on Heroku' });
  }
  const redirectUri = `${req.protocol}://${req.get('host')}/auth/github/callback`;
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user`;
  res.redirect(githubAuthUrl);
});

// Step 2: GitHub OAuth Callback & Token Exchange
app.get('/auth/github/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.redirect(`${CLIENT_ORIGIN}?auth_error=no_code`);
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code
      },
      { headers: { Accept: 'application/json' } }
    );

    const accessToken = tokenResponse.data.access_token;
    if (!accessToken) {
      return res.redirect(`${CLIENT_ORIGIN}?auth_error=token_failed`);
    }

    // Fetch verified GitHub user profile
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const user = userResponse.data;
    const playerProfile = {
      username: user.login,
      name: user.name || user.login,
      avatarUrl: user.avatar_url,
      publicRepos: user.public_repos,
      followers: user.followers,
      authProvider: 'github'
    };

    // Redirect back to client with encrypted or base64 profile payload
    const encodedPayload = Buffer.from(JSON.stringify(playerProfile)).toString('base64');
    res.redirect(`${CLIENT_ORIGIN}?auth_payload=${encodedPayload}`);
  } catch (err) {
    console.error('OAuth Callback Error:', err.message);
    res.redirect(`${CLIENT_ORIGIN}?auth_error=exception`);
  }
});

// -------------------------------------------------------------
// WEBSOCKET MULTIPLAYER GATEWAY (SOCKET.IO)
// -------------------------------------------------------------
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log(`[NET] New Operative Connected: ${socket.id}`);

  // Send current world state
  socket.emit('world:init', {
    players: Array.from(connectedPlayers.values()),
    worldState: worldObjects
  });

  // Player joins the simulation
  socket.on('player:join', (data) => {
    const player = {
      id: socket.id,
      username: data.username || `Operative_${socket.id.substring(0, 5)}`,
      avatarUrl: data.avatarUrl || 'https://github.com/identicons/default.png',
      position: data.position || { x: 0, y: 1, z: 0 },
      rotation: data.rotation || { x: 0, y: 0, z: 0 },
      vehicle: data.vehicle || 'foot', // 'foot', 'supercar', 'bike', 'jet', 'hovercraft', 'sub'
      health: 100,
      cyberCredits: 500,
      hacksExecuted: 0
    };

    connectedPlayers.set(socket.id, player);

    // Broadcast to other players
    socket.broadcast.emit('player:spawned', player);
    io.emit('chat:system', `Operative [${player.username}] uplinked to the grid.`);
  });

  // High-frequency position & physics sync
  socket.on('player:move', (data) => {
    const player = connectedPlayers.get(socket.id);
    if (!player) return;

    player.position = data.position;
    player.rotation = data.rotation;
    player.velocity = data.velocity;
    player.vehicle = data.vehicle;
    player.animState = data.animState;

    // Relay to nearby clients (spatial broadcasting)
    socket.broadcast.emit('player:moved', {
      id: socket.id,
      position: player.position,
      rotation: player.rotation,
      velocity: player.velocity,
      vehicle: player.vehicle,
      animState: player.animState
    });
  });

  // Watch Dogs Hacking Events (Server Authoritative)
  socket.on('hack:execute', (data) => {
    const player = connectedPlayers.get(socket.id);
    const { targetType, targetId, exploit } = data;

    console.log(`[HACK] Player ${player?.username} triggered ${exploit} on ${targetType} [${targetId}]`);

    if (player) {
      player.hacksExecuted++;
      player.cyberCredits += 150;
    }

    // Process world consequences
    if (targetType === 'TRAFFIC_LIGHT') {
      worldObjects.trafficPhase = data.newPhase || 'ALL_GREEN';
    } else if (targetType === 'GRID_SUBSTATION') {
      worldObjects.blackoutActive = true;
      setTimeout(() => {
        worldObjects.blackoutActive = false;
        io.emit('world:blackout_ended');
      }, 7000);
    }

    // Broadcast hacking visual pulse to all players
    io.emit('hack:effect', {
      hackerId: socket.id,
      hackerName: player ? player.username : 'Unknown',
      targetType,
      targetId,
      exploit
    });
  });

  // In-Game Live Code IDE Execution Broadcast
  socket.on('script:run', (data) => {
    const player = connectedPlayers.get(socket.id);
    const { scriptName, codeOutput } = data;

    io.emit('script:executed', {
      author: player ? player.username : 'Operative',
      scriptName,
      output: codeOutput
    });
  });

  // Global In-Game Chat
  socket.on('chat:message', (text) => {
    const player = connectedPlayers.get(socket.id);
    const username = player ? player.username : 'Anonymous';
    io.emit('chat:broadcast', {
      id: socket.id,
      username,
      avatarUrl: player?.avatarUrl,
      text: String(text).substring(0, 150),
      timestamp: Date.now()
    });
  });

  // Disconnection
  socket.on('disconnect', () => {
    const player = connectedPlayers.get(socket.id);
    if (player) {
      io.emit('chat:system', `Operative [${player.username}] signal terminated.`);
    }
    connectedPlayers.delete(socket.id);
    socket.broadcast.emit('player:left', socket.id);
    console.log(`[NET] Operative Disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`⚡ PARALLAX CYBER-CITY SERVER LISTENING ON PORT ${PORT}`);
  console.log(`⚡ CLIENT ORIGIN: ${CLIENT_ORIGIN}`);
  console.log(`=======================================================`);
});
