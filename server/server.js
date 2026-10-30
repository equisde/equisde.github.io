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
    timestamp: new Date().toISOString()
  });
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
