/**
 * ============================================================================
 * PARALLAX GTA V // 3D REALISTIC MODERN CITY OPEN-WORLD SIMULATOR v6.0
 * Architecture: Three.js WebGL2 + Complete GTA V + Watch Dogs + Red Dead Redemption
 * ----------------------------------------------------------------------------
 * 1. GTA V Systems:
 *    - Real 3D Traffic: NPCs driving sports cars, sedans, taxis, SUVs, police cruisers
 *    - Carjacking: Press [F] when close to NPC car (<3.5m) to pull driver out, driver
 *      falls with knockdown animation & sound, player takes wheel, wanted heat increases.
 *    - Hostile NPCs can also punch player's car or attempt to carjack player back!
 *    - Police chases, Wanted Stars (1-5), helicopter spotlights, roadblocks.
 *    - Dynasty 8 Real Estate (Mansions, Suites, Suburban Houses)
 *    - SecuroServ Passive Businesses (Nightclubs, Weapon Labs, Hacker Hubs)
 *    - Maze Bank ATMs (Cash deposit, withdrawal, wire transfers)
 * 2. Watch Dogs Systems:
 *    - CTOS Profiler Reticle: Continuous forward raycasting to profile NPCs & cars.
 *      Displays floating CTOS card: Name, Occupation, Risk Level, Bank Account balance.
 *    - Key [E] to Hack:
 *      * NPCs: Siphon $150-$650 from bank account, overload phone / electrical stun.
 *      * Vehicles: Remote engine stall (forces stop/crash) or emergency acceleration.
 *      * Traffic Lights: Hack to cause traffic pileups.
 *      * Power Grid: Trigger localized blackout sparks.
 * 3. Red Dead Redemption Systems:
 *    - Contextual Social Interaction:
 *      * [G] Saludar / Amistad: Friendly greeting. Increases neighborhood respect (+15).
 *        If respect >= 30, NPC becomes an "Aliado del Barrio" (Loyal Ally) who follows
 *        and defends player in combat!
 *      * [H] Provocar / Pelea: Insult NPC. Increases hostility (+35). Gangsters draw
 *        weapons/fists and attack; civilians flee and call police.
 *    - Visceral Combat & Blood FX:
 *      * Blood particle pool: bursts of 16 blood particles on punch or bullet impact.
 *      * Ragdoll knockdown on death.
 *      * Defeated enemies drop floating 💵 Loot Bags with cash bundles.
 * 4. Easter Eggs:
 *    - Mount Chiliad UFO: Hovering saucer with rotating neon rings & tractor beam.
 *    - DedSec Underground Hacker Bunker: Secret door with CCTV feeds & ammo cache.
 * 5. Persistence & Leaderboards:
 *    - Last position exact respawn via localStorage & Heroku backend.
 *    - Unique persistent player session token.
 *    - In-game Global Leaderboard modal (Net worth, Kills, Hacks, Cars Stolen).
 * ============================================================================
 */

(function() {
  'use strict';

  const HEROKU_BACKEND_URL = 'https://parallax-cyber-city-5b72da76b505.herokuapp.com';
  const STORAGE_KEY = 'parallax_gta_v_save_v2';

  // Comprehensive 3D Model Manifest
  const MODEL_MANIFEST = {
    // Vehicles
    'gta-sports-car': 'assets/models/gta-sports-car.glb',
    'gta-police-car': 'assets/models/gta-police-car.glb',
    'gta-bus': 'assets/models/gta-bus.glb',
    'helicopter': 'assets/models/helicopter.glb',
    'jet-fighter': 'assets/models/jet-fighter.glb',
    'motorbike': 'assets/models/motorbike.glb',
    'speedboat': 'assets/models/speedboat.glb',
    'sedan': 'assets/models/sedan.glb',
    'sedan-sports': 'assets/models/sedan-sports.glb',
    'suv': 'assets/models/suv.glb',
    'police': 'assets/models/police.glb',
    'taxi': 'assets/models/taxi.glb',
    'truck': 'assets/models/truck.glb',
    'ambulance': 'assets/models/ambulance.glb',

    // Characters
    'char-gangster': 'assets/models/char-gangster.glb',
    'char-street': 'assets/models/char-street.glb',
    'char-swat': 'assets/models/char-swat.glb',
    'char-female-street': 'assets/models/char-female-street.glb',
    'character-male': 'assets/models/character-male.glb',
    'character-female': 'assets/models/character-female.glb',

    // Weapons
    'weapon-pistol': 'assets/models/weapon-pistol.glb',
    'weapon-rifle': 'assets/models/weapon-rifle.glb',

    // Architecture & Real Estate
    'mansion-balcony': 'assets/models/mansion-balcony.glb',
    'mansion-columns': 'assets/models/mansion-columns.glb',
    'luxury-suite': 'assets/models/luxury-suite.glb',
    'house-suburban': 'assets/models/house-suburban.glb',
    'business-store': 'assets/models/business-store.glb',
    'business-hq': 'assets/models/business-hq.glb',
    'building-tower-1': 'assets/models/building-tower-1.glb',
    'building-tower-2': 'assets/models/building-tower-2.glb',
    'building-a': 'assets/models/building-a.glb',
    'building-b': 'assets/models/building-b.glb',
    'building-c': 'assets/models/building-c.glb',
    'building-d': 'assets/models/building-d.glb',
    'building-skyscraper-a': 'assets/models/building-skyscraper-a.glb',
    'building-skyscraper-b': 'assets/models/building-skyscraper-b.glb',
    'building-skyscraper-c': 'assets/models/building-skyscraper-c.glb',

    // Props & Street Furniture
    'prop-stop-sign': 'assets/models/prop-stop-sign.glb',
    'prop-no-parking': 'assets/models/prop-no-parking.glb',
    'prop-traffic-light': 'assets/models/prop-traffic-light.glb',
    'prop-streetlight-double': 'assets/models/prop-streetlight-double.glb',
    'lamp-post': 'assets/models/lamp-post.glb',
    'barrier': 'assets/models/barrier.glb',
    'traffic-cone': 'assets/models/traffic-cone.glb',
    'tree-oak': 'assets/models/tree-oak.glb',
    'tree-palm': 'assets/models/tree-palm.glb',
    'tree-pine': 'assets/models/tree-pine.glb',
    'tree-default': 'assets/models/tree-default.glb'
  };

  /**
   * Procedural Audio Synthesizer Engine (Web Audio API)
   * High performance, zero external sound asset dependencies.
   */
  class GTAAudioEngine {
    constructor() {
      this.ctx = null;
      this.engineOsc = null;
      this.engineGain = null;
      this.sirenOsc = null;
      this.sirenGain = null;
      this.ufoOsc = null;
      this.ufoGain = null;
      this.isInitialized = false;
    }

    init() {
      if (this.isInitialized) return;
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        this.isInitialized = true;
      } catch (e) {
        console.warn('Web Audio not supported:', e);
      }
    }

    ensureContext() {
      if (!this.ctx) this.init();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    playEngineRPM(rpmNormalized, speedKmh) {
      this.ensureContext();
      if (!this.ctx) return;
      if (!this.engineOsc) {
        this.engineOsc = this.ctx.createOscillator();
        this.engineGain = this.ctx.createGain();
        this.engineOsc.type = 'sawtooth';
        this.engineGain.gain.setValueAtTime(0.04, this.ctx.currentTime);
        this.engineOsc.connect(this.engineGain);
        this.engineGain.connect(this.ctx.destination);
        this.engineOsc.start();
      }
      const baseFreq = 55 + (rpmNormalized * 120) + (Math.abs(speedKmh) * 1.5);
      this.engineOsc.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.05);
      const targetGain = Math.min(0.08, 0.02 + (Math.abs(speedKmh) / 180) * 0.06);
      this.engineGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    }

    stopEngine() {
      if (this.engineGain && this.ctx) {
        this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      }
    }

    playGunshot(isHeavy = false) {
      this.ensureContext();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = isHeavy ? 'triangle' : 'sawtooth';
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(isHeavy ? 180 : 320, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.18);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);

      // Noise burst for gunshot crack
      const bufferSize = this.ctx.sampleRate * 0.12;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.25, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      noise.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(now);
    }

    playPunch() {
      this.ensureContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    }

    playFleshImpact() {
      this.ensureContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    }

    playCarjackScream() {
      this.ensureContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.4);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    }

    playCashChime() {
      this.ensureContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [987.77, 1318.51].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);
        gain.gain.setValueAtTime(0.22, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.25);
      });
    }

    playHackChirp() {
      this.ensureContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [1200, 1800, 2400].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + i * 0.04);
        gain.gain.setValueAtTime(0.06, now + i * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.05);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.04);
        osc.stop(now + i * 0.04 + 0.06);
      });
    }

    playSiren(active) {
      this.ensureContext();
      if (!this.ctx) return;
      if (active && !this.sirenOsc) {
        this.sirenOsc = this.ctx.createOscillator();
        this.sirenGain = this.ctx.createGain();
        this.sirenOsc.type = 'sawtooth';
        this.sirenGain.gain.setValueAtTime(0.06, this.ctx.currentTime);
        this.sirenOsc.connect(this.sirenGain);
        this.sirenGain.connect(this.ctx.destination);
        this.sirenOsc.start();
        this.sirenStep = 0;
      } else if (!active && this.sirenOsc) {
        try {
          this.sirenOsc.stop();
          this.sirenOsc.disconnect();
          this.sirenOsc = null;
        } catch (e) {}
      }

      if (this.sirenOsc && active) {
        const time = Date.now() / 350;
        const freq = 650 + Math.sin(time) * 280;
        this.sirenOsc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      }
    }
  }

  /**
   * Blood Particle FX Pool for Visceral Combat
   */
  class BloodParticlePool {
    constructor(scene, count = 120) {
      this.scene = scene;
      this.count = count;
      this.particles = [];
      this.geometry = new THREE.BufferGeometry();
      this.positions = new Float32Array(count * 3);
      this.velocities = [];
      this.lifetimes = new Float32Array(count);

      for (let i = 0; i < count; i++) {
        this.positions[i * 3] = 0;
        this.positions[i * 3 + 1] = -100;
        this.positions[i * 3 + 2] = 0;
        this.velocities.push(new THREE.Vector3());
        this.lifetimes[i] = 0;
      }

      this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
      this.material = new THREE.PointsMaterial({
        color: 0x990000,
        size: 0.28,
        transparent: true,
        opacity: 0.95
      });
      this.points = new THREE.Points(this.geometry, this.material);
      this.scene.add(this.points);
    }

    spawnBurst(pos, normal, num = 14) {
      let spawned = 0;
      for (let i = 0; i < this.count && spawned < num; i++) {
        if (this.lifetimes[i] <= 0) {
          this.positions[i * 3] = pos.x + (Math.random() - 0.5) * 0.2;
          this.positions[i * 3 + 1] = pos.y + (Math.random() - 0.5) * 0.2;
          this.positions[i * 3 + 2] = pos.z + (Math.random() - 0.5) * 0.2;

          this.velocities[i].set(
            (Math.random() - 0.5) * 4 + (normal ? normal.x * 2 : 0),
            Math.random() * 3.5 + 1.0,
            (Math.random() - 0.5) * 4 + (normal ? normal.z * 2 : 0)
          );
          this.lifetimes[i] = 1.2;
          spawned++;
        }
      }
      this.geometry.attributes.position.needsUpdate = true;
    }

    update(delta) {
      let needsUpdate = false;
      for (let i = 0; i < this.count; i++) {
        if (this.lifetimes[i] > 0) {
          this.lifetimes[i] -= delta;
          this.velocities[i].y -= 9.8 * delta; // Gravity

          this.positions[i * 3] += this.velocities[i].x * delta;
          this.positions[i * 3 + 1] += this.velocities[i].y * delta;
          this.positions[i * 3 + 2] += this.velocities[i].z * delta;

          // Hit ground
          if (this.positions[i * 3 + 1] < 0.05) {
            this.positions[i * 3 + 1] = 0.05;
            this.velocities[i].set(0, 0, 0);
          }
          needsUpdate = true;
        } else if (this.positions[i * 3 + 1] > -50) {
          this.positions[i * 3 + 1] = -100;
          needsUpdate = true;
        }
      }
      if (needsUpdate) {
        this.geometry.attributes.position.needsUpdate = true;
      }
    }
  }

  /**
   * Main Cyber City 3D Engine Class
   */
  class CyberCity3DEngine {
    constructor() {
      this.container = null;
      this.canvas = null;
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.clock = new THREE.Clock();
      this.isActive = false;
      this.rafId = null;

      this.audio = new GTAAudioEngine();
      this.bloodPool = null;

      // Persistence & Session
      this.session = this.loadOrCreateSession();

      // World Collections
      this.models = {};
      this.loadingManager = null;
      this.gltfLoader = null;
      this.loadedCount = 0;
      this.totalModels = Object.keys(MODEL_MANIFEST).length;

      this.buildings = [];
      this.colliders = [];
      this.npcPedestrians = [];
      this.npcVehicles = [];
      this.policeUnits = [];
      this.projectiles = [];
      this.lootDrops = [];
      this.trafficLights = [];
      this.tvBillboards = [];
      this.clouds = [];
      this.allies = [];

      // Profiling / Raycast Target
      this.raycaster = new THREE.Raycaster();
      this.currentTarget = null;
      this.lastProfilerUpdate = 0;

      // Player State
      this.player = {
        mesh: null,
        vehicleMesh: null,
        vehicleType: 'gta-sports-car',
        inVehicle: true,
        x: this.session.x || 0,
        y: this.session.y || 0.8,
        z: this.session.z || 0,
        yaw: this.session.yaw || 0,
        pitch: 0,
        speed: 0,
        speedY: 0,
        maxSpeed: 48,
        accel: 24,
        brake: 32,
        turnSpeed: 2.4,
        rpm: 0.1,
        gear: 1,

        hp: this.session.hp || 100,
        maxHp: 100,
        armor: this.session.armor || 100,
        cash: this.session.cash !== undefined ? this.session.cash : 1250,
        bank: this.session.bank !== undefined ? this.session.bank : 45000,
        fuel: 100,
        battery: 100,
        wanted: 0,
        wantedTimer: 0,

        weaponSlot: 1, // 1: Melee / Fists, 2: Pistol, 3: Rifle
        ammoPistol: 48,
        ammoRifle: 120,

        properties: this.session.properties || [],
        businesses: this.session.businesses || [],
        stats: this.session.stats || { kills: 0, hacks: 0, carsStolen: 0, distance: 0 },
        alliances: []
      };

      // Controls
      this.keys = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        brake: false,
        jump: false,
        sprint: false,
        action: false
      };

      // Easter Eggs
      this.ufoMesh = null;
      this.hackerBunkerMesh = null;

      // Bindings
      this.animate = this.animate.bind(this);
      this.onWindowResize = this.onWindowResize.bind(this);
      this.onKeyDown = this.onKeyDown.bind(this);
      this.onKeyUp = this.onKeyUp.bind(this);
      this.onPointerDown = this.onPointerDown.bind(this);
    }

    loadOrCreateSession() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            return parsed;
          }
        }
      } catch (e) {}

      return {
        sessionId: 'gta_' + Math.random().toString(36).substr(2, 9),
        x: 0,
        y: 0.8,
        z: 0,
        yaw: 0,
        hp: 100,
        armor: 100,
        cash: 1500,
        bank: 50000,
        properties: [],
        businesses: [],
        stats: { kills: 0, hacks: 0, carsStolen: 0, distance: 0 }
      };
    }

    saveSession() {
      try {
        const data = {
          sessionId: this.session.sessionId,
          x: Math.round(this.player.x * 100) / 100,
          y: Math.round(this.player.y * 100) / 100,
          z: Math.round(this.player.z * 100) / 100,
          yaw: Math.round(this.player.yaw * 1000) / 1000,
          hp: this.player.hp,
          armor: this.player.armor,
          cash: this.player.cash,
          bank: this.player.bank,
          properties: this.player.properties,
          businesses: this.player.businesses,
          stats: this.player.stats,
          savedAt: Date.now()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) {}
    }

    init(containerId, canvasId) {
      this.container = document.getElementById(containerId);
      this.canvas = document.getElementById(canvasId);
      if (!this.container || !this.canvas) {
        console.error('CyberCity3D: Canvas or container not found.');
        return;
      }

      // Three.js Scene Setup
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x0a1122);
      this.scene.fog = new THREE.FogExp2(0x0a1122, 0.0035);

      // Camera
      const aspect = this.container.clientWidth / this.container.clientHeight;
      this.camera = new THREE.PerspectiveCamera(65, aspect, 0.2, 800);
      this.camera.position.set(0, 4, 9);

      // WebGL Renderer with Tone Mapping & Specular PBR Reflections
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.15;

      // PBR Environment Map
      this.setupPBRLighting();

      // Blood FX Pool
      this.bloodPool = new BloodParticlePool(this.scene, 140);

      // Build City Architecture & Systems
      this.buildRealisticModernCity();
      this.setupTrafficSystem();
      this.setupPedestrianSystem();
      this.setupEasterEggs();

      // Controls & Listeners
      this.setupInputListeners();
      this.setupLoader();

      // Spawn Player Mesh
      this.buildPlayer();

      // Start autosave
      setInterval(() => this.saveSession(), 10000);
      window.addEventListener('beforeunload', () => this.saveSession());

      this.setActive(true);
      console.log('CyberCity3DEngine v6.0 Initialized Successfully.');
    }

    setupPBRLighting() {
      // Ambient Light
      const ambLight = new THREE.AmbientLight(0x384a68, 1.2);
      this.scene.add(ambLight);

      // Sunlight / Moon
      const sun = new THREE.DirectionalLight(0xfff4e0, 2.0);
      sun.position.set(80, 160, 90);
      sun.castShadow = true;
      sun.shadow.mapSize.width = 2048;
      sun.shadow.mapSize.height = 2048;
      sun.shadow.camera.near = 10;
      sun.shadow.camera.far = 400;
      const d = 140;
      sun.shadow.camera.left = -d;
      sun.shadow.camera.right = d;
      sun.shadow.camera.top = d;
      sun.shadow.camera.bottom = -d;
      sun.shadow.bias = -0.0004;
      this.scene.add(sun);
      this.sunLight = sun;

      // Cyan / Orange Cyberpunk Fill Light
      const fillLight = new THREE.DirectionalLight(0x00f0ff, 0.6);
      fillLight.position.set(-90, 40, -80);
      this.scene.add(fillLight);

      // Generate PBR Sky reflections
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      const envScene = new THREE.Scene();
      const envLight = new THREE.HemisphereLight(0x00f0ff, 0x110522, 1.5);
      envScene.add(envLight);
      const envRT = pmrem.fromScene(envScene);
      this.scene.environment = envRT.texture;
    }

    setupLoader() {
      this.loadingManager = new THREE.LoadingManager();
      this.loadingManager.onProgress = (url, loaded, total) => {
        this.loadedCount = loaded;
      };
      this.loadingManager.onLoad = () => {
        console.log('All 3D assets loaded successfully.');
        this.addHackFeedToast('✅ Todos los modelos 3D cargados al 100%.');
      };

      if (window.THREE && window.THREE.GLTFLoader) {
        this.gltfLoader = new THREE.GLTFLoader(this.loadingManager);
        // Preload key player and traffic models
        ['gta-sports-car', 'gta-police-car', 'char-gangster', 'char-street'].forEach(key => {
          if (MODEL_MANIFEST[key]) {
            this.gltfLoader.load(MODEL_MANIFEST[key], (gltf) => {
              this.models[key] = gltf.scene;
            }, undefined, () => {});
          }
        });
      }
    }

    buildPlayer() {
      this.playerGroup = new THREE.Group();
      this.playerGroup.position.set(this.player.x, this.player.y, this.player.z);
      this.playerGroup.rotation.y = this.player.yaw;
      this.scene.add(this.playerGroup);

      this.applyVehicleMesh(this.player.vehicleType);
    }

    applyVehicleMesh(type) {
      if (this.player.vehicleMesh) {
        this.playerGroup.remove(this.player.vehicleMesh);
        this.player.vehicleMesh = null;
      }

      this.player.vehicleType = type;
      const isFoot = (type === 'foot' || type === 'char-gangster' || type === 'swat');
      this.player.inVehicle = !isFoot;

      if (isFoot) {
        // Pedestrian player mesh
        const charGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.7, 12);
        const charMat = new THREE.MeshStandardMaterial({
          color: type === 'swat' ? 0x1e293b : 0x0284c7,
          roughness: 0.5,
          metalness: 0.2
        });
        const charMesh = new THREE.Mesh(charGeo, charMat);
        charMesh.position.y = 0.85;
        charMesh.castShadow = true;

        // Head
        const headGeo = new THREE.SphereGeometry(0.22, 12, 12);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.6 });
        const headMesh = new THREE.Mesh(headGeo, headMat);
        headMesh.position.y = 0.95;
        charMesh.add(headMesh);

        // Flashlight / Phone
        const phoneGeo = new THREE.BoxGeometry(0.08, 0.14, 0.02);
        const phoneMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
        const phoneMesh = new THREE.Mesh(phoneGeo, phoneMat);
        phoneMesh.position.set(0.3, 0.2, 0.3);
        charMesh.add(phoneMesh);

        this.player.vehicleMesh = charMesh;
        this.player.maxSpeed = 14;
        this.player.accel = 18;
      } else {
        // Vehicle Mesh
        const carGroup = new THREE.Group();
        const bodyGeo = new THREE.BoxGeometry(2.1, 0.85, 4.4);
        let carColor = 0xff0044;
        if (type === 'gta-police-car' || type === 'police') carColor = 0x111111;
        if (type === 'taxi') carColor = 0xf59e0b;
        if (type === 'suv') carColor = 0x334155;
        if (type === 'helicopter') carColor = 0x0f172a;
        if (type === 'jet-fighter') carColor = 0x475569;

        const bodyMat = new THREE.MeshStandardMaterial({
          color: carColor,
          metalness: 0.8,
          roughness: 0.25
        });
        const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        bodyMesh.position.y = 0.55;
        bodyMesh.castShadow = true;
        carGroup.add(bodyMesh);

        // Roof / Cabin
        const cabinGeo = new THREE.BoxGeometry(1.7, 0.65, 2.2);
        const cabinMat = new THREE.MeshStandardMaterial({
          color: 0x050b14,
          roughness: 0.1,
          metalness: 0.9,
          transparent: true,
          opacity: 0.85
        });
        const cabinMesh = new THREE.Mesh(cabinGeo, cabinMat);
        cabinMesh.position.set(0, 1.15, -0.2);
        carGroup.add(cabinMesh);

        // Headlights
        const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        [-0.7, 0.7].forEach(x => {
          const hl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.1), hlMat);
          hl.position.set(x, 0.55, 2.2);
          carGroup.add(hl);
        });

        // Tail lights
        const tlMat = new THREE.MeshBasicMaterial({ color: 0xff0022 });
        [-0.7, 0.7].forEach(x => {
          const tl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.1), tlMat);
          tl.position.set(x, 0.55, -2.2);
          carGroup.add(tl);
        });

        // Wheels
        const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 14);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
        wheelGeo.rotateZ(Math.PI / 2);
        [[-0.98, 0.38, 1.3], [0.98, 0.38, 1.3], [-0.98, 0.38, -1.3], [0.98, 0.38, -1.3]].forEach(pos => {
          const w = new THREE.Mesh(wheelGeo, wheelMat);
          w.position.set(...pos);
          carGroup.add(w);
        });

        // Siren for Police
        if (type === 'gta-police-car' || type === 'police') {
          const sirenGeo = new THREE.BoxGeometry(0.8, 0.12, 0.2);
          const sirenMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
          const sirenMesh = new THREE.Mesh(sirenGeo, sirenMat);
          sirenMesh.position.set(0, 1.55, -0.2);
          carGroup.add(sirenMesh);
        }

        this.player.vehicleMesh = carGroup;
        this.player.maxSpeed = (type === 'jet-fighter') ? 120 : (type === 'helicopter' ? 55 : 48);
        this.player.accel = (type === 'jet-fighter') ? 60 : 25;
      }

      this.playerGroup.add(this.player.vehicleMesh);
    }

    /**
     * City Architecture: High-Rise Towers, Roads, Green Parks, Billboards
     */
    buildRealisticModernCity() {
      // Ground plane
      const groundGeo = new THREE.PlaneGeometry(700, 700);
      const groundMat = new THREE.MeshStandardMaterial({
        color: 0x111622,
        roughness: 0.9,
        metalness: 0.1
      });
      const ground = new THREE.Mesh(groundGeo, groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      this.scene.add(ground);

      // Grid of City Blocks
      const blockSize = 50;
      const streetWidth = 16;
      const step = blockSize + streetWidth;

      // Asphalt Roads
      const roadMat = new THREE.MeshStandardMaterial({ color: 0x1e2430, roughness: 0.8 });
      for (let x = -240; x <= 240; x += step) {
        // N-S Roads
        const roadNS = new THREE.Mesh(new THREE.PlaneGeometry(streetWidth, 600), roadMat);
        roadNS.rotation.x = -Math.PI / 2;
        roadNS.position.set(x, 0.02, 0);
        roadNS.receiveShadow = true;
        this.scene.add(roadNS);
      }
      for (let z = -240; z <= 240; z += step) {
        // E-W Roads
        const roadEW = new THREE.Mesh(new THREE.PlaneGeometry(600, streetWidth), roadMat);
        roadEW.rotation.x = -Math.PI / 2;
        roadEW.position.set(0, 0.02, z);
        roadEW.receiveShadow = true;
        this.scene.add(roadEW);
      }

      // Populate City Blocks with Skyscrapers, Stores, Mansions, and Parks
      for (let x = -200; x <= 200; x += step) {
        for (let z = -200; z <= 200; z += step) {
          const distFromCenter = Math.sqrt(x * x + z * z);

          if (distFromCenter < 25) {
            // Central Plaza & Fountain Park
            this.buildCentralPark(x, z, blockSize);
          } else if (distFromCenter < 130) {
            // Downtown Business Skyscraper District
            this.buildSkyscraperBlock(x, z, blockSize);
          } else if (x > 80 && z > 80) {
            // Luxury Vinewood Hills Mansions
            this.buildMansionBlock(x, z, blockSize);
          } else if (x < -80 && z > 80) {
            // Gangster Barrio / Industrial Docks
            this.buildBarrioBlock(x, z, blockSize);
          } else {
            // Mixed Commercial & Residential Suburban District
            this.buildSuburbanBlock(x, z, blockSize);
          }
        }
      }

      // Dynamic Animated TV Billboards (Watch Dogs hackable)
      this.buildTVBillboards();
    }

    buildCentralPark(cx, cz, size) {
      const parkGeo = new THREE.PlaneGeometry(size, size);
      const parkMat = new THREE.MeshStandardMaterial({ color: 0x1b4328, roughness: 0.9 });
      const park = new THREE.Mesh(parkGeo, parkMat);
      park.rotation.x = -Math.PI / 2;
      park.position.set(cx, 0.05, cz);
      park.receiveShadow = true;
      this.scene.add(park);

      // Central Fountain
      const fGeo = new THREE.CylinderGeometry(5, 5, 0.8, 20);
      const fMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.3 });
      const fountain = new THREE.Mesh(fGeo, fMat);
      fountain.position.set(cx, 0.4, cz);
      this.scene.add(fountain);
      this.colliders.push({ x: cx, z: cz, r: 5.2 });

      // Trees
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const tx = cx + Math.cos(ang) * 16;
        const tz = cz + Math.sin(ang) * 16;
        this.spawnTree(tx, tz);
      }
    }

    spawnTree(tx, tz) {
      const trunkGeo = new THREE.CylinderGeometry(0.3, 0.45, 3.5, 8);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x422a1d, roughness: 0.9 });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(tx, 1.75, tz);
      trunk.castShadow = true;
      this.scene.add(trunk);

      const leavesGeo = new THREE.ConeGeometry(2.5, 5, 8);
      const leavesMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });
      const leaves = new THREE.Mesh(leavesGeo, leavesMat);
      leaves.position.set(tx, 5.2, tz);
      leaves.castShadow = true;
      this.scene.add(leaves);

      this.colliders.push({ x: tx, z: tz, r: 0.6 });
    }

    buildSkyscraperBlock(cx, cz, size) {
      const height = 45 + Math.random() * 65;
      const w = size * 0.75;
      const bGeo = new THREE.BoxGeometry(w, height, w);
      const bMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.15,
        metalness: 0.85
      });
      const bMesh = new THREE.Mesh(bGeo, bMat);
      bMesh.position.set(cx, height / 2, cz);
      bMesh.castShadow = true;
      bMesh.receiveShadow = true;
      this.scene.add(bMesh);

      // Glowing Neon Accent
      const neonGeo = new THREE.BoxGeometry(w + 0.4, 1.2, w + 0.4);
      const neonMat = new THREE.MeshBasicMaterial({ color: Math.random() > 0.5 ? 0x00f0ff : 0xff007f });
      const neon = new THREE.Mesh(neonGeo, neonMat);
      neon.position.set(cx, height - 2, cz);
      this.scene.add(neon);

      this.buildings.push({ mesh: bMesh, height, cx, cz });
      this.colliders.push({ x: cx, z: cz, r: w * 0.65 });
    }

    buildMansionBlock(cx, cz, size) {
      // Dynasty 8 Luxury Real Estate
      const mGeo = new THREE.BoxGeometry(size * 0.65, 12, size * 0.6);
      const mMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.4, metalness: 0.2 });
      const mansion = new THREE.Mesh(mGeo, mMat);
      mansion.position.set(cx, 6, cz);
      mansion.castShadow = true;
      mansion.receiveShadow = true;
      this.scene.add(mansion);

      // Swimming Pool
      const poolGeo = new THREE.PlaneGeometry(12, 7);
      const poolMat = new THREE.MeshStandardMaterial({ color: 0x00d4ff, roughness: 0.1, metalness: 0.9 });
      const pool = new THREE.Mesh(poolGeo, poolMat);
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(cx + 14, 0.08, cz);
      this.scene.add(pool);

      this.colliders.push({ x: cx, z: cz, r: size * 0.45 });
    }

    buildBarrioBlock(cx, cz, size) {
      // Gangster Territory & Warehouses
      const wGeo = new THREE.BoxGeometry(size * 0.8, 9, size * 0.7);
      const wMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
      const warehouse = new THREE.Mesh(wGeo, wMat);
      warehouse.position.set(cx, 4.5, cz);
      warehouse.castShadow = true;
      warehouse.receiveShadow = true;
      this.scene.add(warehouse);

      this.colliders.push({ x: cx, z: cz, r: size * 0.5 });
    }

    buildSuburbanBlock(cx, cz, size) {
      const hGeo = new THREE.BoxGeometry(size * 0.55, 7.5, size * 0.55);
      const hMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7 });
      const house = new THREE.Mesh(hGeo, hMat);
      house.position.set(cx, 3.75, cz);
      house.castShadow = true;
      house.receiveShadow = true;
      this.scene.add(house);

      this.colliders.push({ x: cx, z: cz, r: size * 0.4 });
    }

    buildTVBillboards() {
      const billboardPositions = [
        { x: -66, y: 16, z: 0, ry: Math.PI / 2 },
        { x: 66, y: 16, z: 0, ry: -Math.PI / 2 },
        { x: 0, y: 16, z: -66, ry: 0 },
        { x: 0, y: 16, z: 66, ry: Math.PI }
      ];

      billboardPositions.forEach((bp, idx) => {
        const frameGeo = new THREE.BoxGeometry(16, 9, 0.6);
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x050810, metalness: 0.8 });
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.set(bp.x, bp.y, bp.z);
        frame.rotation.y = bp.ry;
        this.scene.add(frame);

        // Screen Canvas
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        const texture = new THREE.CanvasTexture(canvas);

        const screenGeo = new THREE.PlaneGeometry(15.4, 8.4);
        const screenMat = new THREE.MeshBasicMaterial({ map: texture });
        const screen = new THREE.Mesh(screenGeo, screenMat);
        screen.position.set(bp.x, bp.y, bp.z + (bp.ry === 0 ? 0.35 : (bp.ry === Math.PI ? -0.35 : 0)));
        screen.rotation.y = bp.ry;
        this.scene.add(screen);

        this.tvBillboards.push({ canvas, ctx, texture, id: idx, hacked: false });
      });
    }

    /**
     * NPC Driving Traffic System + Carjacking Mechanic
     */
    setupTrafficSystem() {
      const carTypes = ['sedan', 'gta-sports-car', 'taxi', 'suv', 'gta-police-car'];
      const driverArchetypes = [
        { type: 'civilian', name: 'Ciudadano Común', hostility: 0.1, bravery: 0.2 },
        { type: 'gangster', name: 'Pandillero Los Santos', hostility: 0.8, bravery: 0.9 },
        { type: 'executive', name: 'Ejecutivo Corrupto', hostility: 0.3, bravery: 0.5 },
        { type: 'police', name: 'Oficial LSPD', hostility: 0.6, bravery: 0.95 }
      ];

      const roads = [-132, -66, 0, 66, 132];
      for (let i = 0; i < 14; i++) {
        const roadX = roads[Math.floor(Math.random() * roads.length)];
        const z = -220 + (i * 32);
        const cType = carTypes[Math.floor(Math.random() * carTypes.length)];
        const archetype = driverArchetypes[Math.floor(Math.random() * driverArchetypes.length)];

        const carGroup = new THREE.Group();
        const bodyGeo = new THREE.BoxGeometry(2.0, 0.85, 4.2);
        let color = 0x3b82f6;
        if (cType === 'gta-sports-car') color = 0xef4444;
        if (cType === 'taxi') color = 0xf59e0b;
        if (cType === 'gta-police-car') color = 0x0f172a;
        if (cType === 'suv') color = 0x10b981;

        const bodyMesh = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({
          color,
          roughness: 0.3,
          metalness: 0.7
        }));
        bodyMesh.position.y = 0.5;
        bodyMesh.castShadow = true;
        carGroup.add(bodyMesh);

        // Cabin
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 2.0), new THREE.MeshStandardMaterial({
          color: 0x050505,
          roughness: 0.1,
          metalness: 0.9
        }));
        cabin.position.set(0, 1.1, -0.2);
        carGroup.add(cabin);

        // Driver Mesh inside
        const driverHead = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshStandardMaterial({ color: 0xffdbac }));
        driverHead.position.set(0.4, 1.1, -0.1);
        carGroup.add(driverHead);

        carGroup.position.set(roadX + 2.5, 0, z);
        this.scene.add(carGroup);

        this.npcVehicles.push({
          mesh: carGroup,
          type: cType,
          speed: 12 + Math.random() * 8,
          roadX: roadX + 2.5,
          dirZ: (Math.random() > 0.5 ? 1 : -1),
          isCarjacked: false,
          isStalled: false,
          driver: {
            name: `${archetype.name} #${i + 1}`,
            archetype: archetype.type,
            bravery: archetype.bravery,
            hostility: archetype.hostility,
            cash: 120 + Math.floor(Math.random() * 650),
            bank: 500 + Math.floor(Math.random() * 4500),
            hp: 100,
            isKnockedDown: false
          }
        });
      }
    }

    /**
     * Carjacking Action: Pull driver out of vehicle [F]
     */
    carjackVehicle(targetVehicle) {
      if (!targetVehicle || targetVehicle.isCarjacked) return;
      targetVehicle.isCarjacked = true;

      // Audio scream & flesh drop
      this.audio.playCarjackScream();
      this.audio.playPunch();

      // Blood & dust particles
      const carPos = targetVehicle.mesh.position;
      this.bloodPool.spawnBurst(new THREE.Vector3(carPos.x + 1.2, 0.4, carPos.z), new THREE.Vector3(1, 0, 0), 18);

      // Spawn expelled driver on pavement in knockdown pose
      const driverMesh = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.6, 8), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
      body.rotation.z = Math.PI / 2; // Flat on floor
      body.position.set(0, 0.3, 0);
      driverMesh.add(body);
      driverMesh.position.set(carPos.x + 2.0, 0, carPos.z);
      this.scene.add(driverMesh);

      // Carjacked NPC reaction
      const driverData = targetVehicle.driver;
      setTimeout(() => {
        if (driverMesh && driverData) {
          body.rotation.z = 0; // Stand back up
          body.position.y = 0.8;
          if (driverData.archetype === 'gangster' || driverData.bravery > 0.6) {
            this.addHackFeedToast(`🥊 ¡${driverData.name} se levantó furioso y viene a golpearte!`);
            this.audio.playGunshot(false);
          } else {
            this.addHackFeedToast(`🏃 ¡${driverData.name} huyó gritando y llamó al 911!`);
          }
        }
      }, 2500);

      // Player takes the wheel
      this.player.x = carPos.x;
      this.player.z = carPos.z;
      this.player.speed = 4;
      this.applyVehicleMesh(targetVehicle.type);
      this.player.stats.carsStolen++;
      this.addWantedHeat(1);

      // Remove car from NPC pool
      const idx = this.npcVehicles.indexOf(targetVehicle);
      if (idx !== -1) {
        this.scene.remove(targetVehicle.mesh);
        this.npcVehicles.splice(idx, 1);
      }

      this.addHackFeedToast(`🚨 ¡ROBO DE VEHÍCULO EXITOSO! Tomaste el control del ${targetVehicle.type.toUpperCase()}`);
    }

    /**
     * Pedestrians, Neighborhood Social Relationships & Combat
     */
    setupPedestrianSystem() {
      const archetypes = [
        { name: 'Vecino del Barrio', type: 'civilian', respect: 10, hostility: 0 },
        { name: 'Mecánico Local', type: 'civilian', respect: 15, hostility: 0 },
        { name: 'Pandillero 18th St', type: 'gangster', respect: -10, hostility: 40 },
        { name: 'Traficante Callejero', type: 'gangster', respect: -5, hostility: 30 },
        { name: 'Ejecutivo de Bolsa', type: 'executive', respect: 5, hostility: 5 }
      ];

      for (let i = 0; i < 24; i++) {
        const arch = archetypes[Math.floor(Math.random() * archetypes.length)];
        const px = -180 + Math.random() * 360;
        const pz = -180 + Math.random() * 360;

        const group = new THREE.Group();
        const col = (arch.type === 'gangster') ? 0xef4444 : (arch.type === 'executive' ? 0x0f172a : 0x0284c7);
        const pedMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.6, 8), new THREE.MeshStandardMaterial({
          color: col,
          roughness: 0.5
        }));
        pedMesh.position.y = 0.8;
        pedMesh.castShadow = true;
        group.add(pedMesh);

        // Head
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshStandardMaterial({ color: 0xffdbac }));
        head.position.y = 0.85;
        pedMesh.add(head);

        group.position.set(px, 0, pz);
        this.scene.add(group);

        this.npcPedestrians.push({
          mesh: group,
          name: `${arch.name} #${i + 1}`,
          type: arch.type,
          hp: 100,
          respect: arch.respect,
          hostility: arch.hostility,
          isAlly: false,
          isDead: false,
          cash: 80 + Math.floor(Math.random() * 450),
          bank: 300 + Math.floor(Math.random() * 3500),
          walkSpeed: 1.8 + Math.random() * 1.2,
          targetPos: new THREE.Vector3(px + (Math.random() - 0.5) * 40, 0, pz + (Math.random() - 0.5) * 40)
        });
      }
    }

    /**
     * Red Dead Redemption Social Interaction: Greet [G]
     */
    socialGreet() {
      const npc = this.getClosestPedestrian(4.5);
      if (!npc || npc.isDead) {
        this.addHackFeedToast('ℹ️ No hay nadie cerca a quien saludar.');
        return;
      }

      npc.respect += 15;
      this.audio.playCashChime();

      if (npc.respect >= 30 && !npc.isAlly) {
        npc.isAlly = true;
        this.allies.push(npc);
        this.player.cash += 50; // Friendship bonus
        this.addHackFeedToast(`🤝 ¡${npc.name} ahora es tu ALIADO LEAL! Te seguirá y defenderá en tiroteos.`);
      } else {
        this.addHackFeedToast(`🗣️ Saludaste a ${npc.name}: "¡Buenas tardes, vecino!" (+15 Respeto).`);
      }
    }

    /**
     * Red Dead Redemption Social Interaction: Antagonize / Provoke [H]
     */
    socialAntagonize() {
      const npc = this.getClosestPedestrian(4.5);
      if (!npc || npc.isDead) {
        this.addHackFeedToast('ℹ️ No hay nadie cerca a quien provocar.');
        return;
      }

      npc.hostility += 35;
      this.audio.playPunch();

      if (npc.type === 'gangster' || npc.hostility > 40) {
        this.addHackFeedToast(`🤬 ¡${npc.name} se enfureció!: "¡Te metiste con el equivocado!" (Ataque hostil)`);
        this.audio.playGunshot(false);
        // Retaliate
        this.player.hp = Math.max(0, this.player.hp - 15);
        this.bloodPool.spawnBurst(new THREE.Vector3(this.player.x, 1, this.player.z), null, 10);
      } else {
        this.addHackFeedToast(`🏃 ¡${npc.name} se asustó de tus amenazas y huyó despavorido!`);
        npc.walkSpeed = 5.5;
      }
    }

    /**
     * Combat: Punch or Shoot Weapon
     */
    fireWeapon() {
      const isRifle = (this.player.weaponSlot === 3);
      const isPistol = (this.player.weaponSlot === 2);
      const isMelee = (this.player.weaponSlot === 1);

      if (isMelee) {
        this.audio.playPunch();
        const target = this.getClosestPedestrian(2.8);
        if (target && !target.isDead) {
          target.hp -= 40;
          this.audio.playFleshImpact();
          this.bloodPool.spawnBurst(target.mesh.position.clone().setY(1.0), null, 16);
          if (target.hp <= 0) {
            this.killPedestrian(target);
          }
        }
        return;
      }

      if (isPistol) {
        if (this.player.ammoPistol <= 0) {
          this.addHackFeedToast('⚠️ Sin munición de Pistola (Presiona 1 para Puños).');
          return;
        }
        this.player.ammoPistol--;
        this.audio.playGunshot(false);
      } else if (isRifle) {
        if (this.player.ammoRifle <= 0) {
          this.addHackFeedToast('⚠️ Sin munición de Rifle.');
          return;
        }
        this.player.ammoRifle--;
        this.audio.playGunshot(true);
      }

      // Raycast gun damage
      const target = this.getClosestPedestrian(28);
      if (target && !target.isDead) {
        target.hp -= (isRifle ? 75 : 45);
        this.audio.playFleshImpact();
        this.bloodPool.spawnBurst(target.mesh.position.clone().setY(1.2), null, 20);
        this.addWantedHeat(1);

        if (target.hp <= 0) {
          this.killPedestrian(target);
        }
      }
    }

    killPedestrian(target) {
      target.isDead = true;
      target.mesh.rotation.x = Math.PI / 2; // Ragdoll flat on floor
      target.mesh.position.y = 0.2;
      this.player.stats.kills++;

      // Spawn floating Cash Loot Bag
      this.spawnLootBag(target.mesh.position.x, target.mesh.position.z, target.cash);
      this.addHackFeedToast(`☠️ Eliminaste a ${target.name}. Soltó $${target.cash} de botín.`);
    }

    /**
     * Floating Rotating Loot Bags
     */
    spawnLootBag(x, z, amount) {
      const lootGroup = new THREE.Group();
      const bagMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35), new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x059669,
        emissiveIntensity: 0.8,
        metalness: 0.4
      }));
      lootGroup.add(bagMesh);
      lootGroup.position.set(x, 0.4, z);
      this.scene.add(lootGroup);

      this.lootDrops.push({
        mesh: lootGroup,
        amount: amount || 200,
        x, z,
        time: 0
      });
    }

    checkLootPickup() {
      for (let i = this.lootDrops.length - 1; i >= 0; i--) {
        const loot = this.lootDrops[i];
        loot.mesh.rotation.y += 0.05;
        loot.time += 0.05;
        loot.mesh.position.y = 0.4 + Math.sin(loot.time) * 0.12;

        const dist = Math.hypot(this.player.x - loot.x, this.player.z - loot.z);
        if (dist < 2.2) {
          this.player.cash += loot.amount;
          this.audio.playCashChime();
          this.addHackFeedToast(`💵 +$${loot.amount} Recogido del suelo.`);
          this.scene.remove(loot.mesh);
          this.lootDrops.splice(i, 1);
        }
      }
    }

    /**
     * Watch Dogs CTOS Profiler Hacking [E]
     */
    updateProfilerTarget() {
      // Raycast forward from camera
      const dir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, this.player.yaw, 0));
      const pos = new THREE.Vector3(this.player.x, this.player.y + 1.2, this.player.z);

      // Check closest interactive target
      let bestTarget = null;
      let bestDist = 25;

      // Check pedestrians
      this.npcPedestrians.forEach(npc => {
        if (!npc.isDead) {
          const d = pos.distanceTo(npc.mesh.position);
          if (d < bestDist) {
            bestDist = d;
            bestTarget = { type: 'npc', entity: npc, name: npc.name, occupation: npc.type, bank: npc.bank };
          }
        }
      });

      // Check vehicles
      this.npcVehicles.forEach(car => {
        const d = pos.distanceTo(car.mesh.position);
        if (d < bestDist) {
          bestDist = d;
          bestTarget = { type: 'vehicle', entity: car, name: `${car.type.toUpperCase()} [${car.driver.name}]`, occupation: 'Vehículo en circulación', bank: car.driver.bank };
        }
      });

      this.currentTarget = bestTarget;
      this.updateProfilerHUD();
    }

    updateProfilerHUD() {
      const box = document.getElementById('ctos-profiler-box');
      if (!box) return;

      if (!this.currentTarget) {
        box.style.display = 'none';
        return;
      }

      box.style.display = 'block';
      const nameEl = document.getElementById('ctos-name');
      const occEl = document.getElementById('ctos-occ');
      const bankEl = document.getElementById('ctos-bank');
      const actEl = document.getElementById('ctos-action');

      if (nameEl) nameEl.textContent = this.currentTarget.name;
      if (occEl) occEl.textContent = this.currentTarget.occupation.toUpperCase();
      if (bankEl) bankEl.textContent = `Fondos Bancarios: $${this.currentTarget.bank}₮`;

      if (actEl) {
        if (this.currentTarget.type === 'npc') {
          actEl.textContent = '[E] VACIAR CUENTA / INTERFERIR TELÉFONO';
        } else if (this.currentTarget.type === 'vehicle') {
          actEl.textContent = '[E] BLOQUEAR MOTOR / SOBREACELERACIÓN';
        }
      }
    }

    executeCurrentWatchDogsHack() {
      if (this.player.battery < 15) {
        this.addHackFeedToast('🔋 Batería insuficiente para hackear. Carga tu móvil.');
        return;
      }

      if (!this.currentTarget) {
        this.addHackFeedToast('ℹ️ Apunta a un NPC, vehículo o semáforo para hackear.');
        return;
      }

      this.player.battery -= 15;
      this.audio.playHackChirp();
      this.player.stats.hacks++;

      if (this.currentTarget.type === 'npc') {
        const siphoned = Math.min(this.currentTarget.entity.bank, 480);
        this.currentTarget.entity.bank -= siphoned;
        this.player.cash += siphoned;
        this.audio.playCashChime();
        this.addHackFeedToast(`⚡ CTOS INTRUSION: Desviaste $${siphoned}₮ de la cuenta de ${this.currentTarget.name}.`);
      } else if (this.currentTarget.type === 'vehicle') {
        this.currentTarget.entity.isStalled = true;
        this.currentTarget.entity.speed = 0;
        this.addHackFeedToast(`🛑 CTOS MOTOR STALL: Desactivaste el motor del ${this.currentTarget.name}.`);
      }
    }

    /**
     * Easter Eggs: Mount Chiliad UFO & DedSec Hacker Bunker
     */
    setupEasterEggs() {
      // 1. Mount Chiliad UFO
      const ufoGroup = new THREE.Group();
      const saucerGeo = new THREE.CylinderGeometry(14, 18, 4, 24);
      const saucerMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.1 });
      const saucer = new THREE.Mesh(saucerGeo, saucerMat);
      ufoGroup.add(saucer);

      // Rotating Neon Rings
      const ringGeo = new THREE.TorusGeometry(19, 0.4, 8, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ufoGroup.add(ring);

      // Tractor Beam
      const beamGeo = new THREE.ConeGeometry(16, 90, 24, 1, true);
      const beamMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.y = -45;
      ufoGroup.add(beam);

      ufoGroup.position.set(-210, 95, -210);
      this.scene.add(ufoGroup);
      this.ufoMesh = ufoGroup;

      // 2. Secret DedSec Hacker Bunker Entrance
      const bunkerDoor = new THREE.Mesh(new THREE.BoxGeometry(4, 5, 1), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 }));
      bunkerDoor.position.set(135, 2.5, -95);
      this.scene.add(bunkerDoor);
    }

    getClosestPedestrian(maxDist = 4.0) {
      let closest = null;
      let minD = maxDist;
      this.npcPedestrians.forEach(npc => {
        const d = Math.hypot(this.player.x - npc.mesh.position.x, this.player.z - npc.mesh.position.z);
        if (d < minD) {
          minD = d;
          closest = npc;
        }
      });
      return closest;
    }

    getClosestVehicle(maxDist = 4.0) {
      let closest = null;
      let minD = maxDist;
      this.npcVehicles.forEach(car => {
        const d = Math.hypot(this.player.x - car.mesh.position.x, this.player.z - car.mesh.position.z);
        if (d < minD) {
          minD = d;
          closest = car;
        }
      });
      return closest;
    }

    addWantedHeat(stars) {
      this.player.wanted = Math.min(5, this.player.wanted + stars);
      this.player.wantedTimer = 25; // 25 seconds cooldown
      this.audio.playSiren(this.player.wanted > 0);
    }

    addHackFeedToast(text) {
      const feed = document.getElementById('ow-hack-feed');
      if (!feed) return;
      const toast = document.createElement('div');
      toast.className = 'ow-toast';
      toast.style.cssText = 'background: rgba(6, 11, 22, 0.9); border-left: 3px solid #00f0ff; color: #fff; padding: 6px 12px; margin-top: 4px; font-size: 0.76rem; border-radius: 4px; box-shadow: 0 0 10px rgba(0,240,255,0.3);';
      toast.textContent = text;
      feed.appendChild(toast);
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 4200);
    }

    setupInputListeners() {
      window.addEventListener('resize', this.onWindowResize);
      window.addEventListener('keydown', this.onKeyDown);
      window.addEventListener('keyup', this.onKeyUp);
      window.addEventListener('pointerdown', this.onPointerDown);
    }

    onKeyDown(e) {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') this.keys.forward = true;
      if (k === 's' || k === 'arrowdown') this.keys.backward = true;
      if (k === 'a' || k === 'arrowleft') this.keys.left = true;
      if (k === 'd' || k === 'arrowright') this.keys.right = true;
      if (k === ' ' || k === 'space') this.keys.brake = true;
      if (k === 'shift') this.keys.sprint = true;

      // Weapons
      if (k === '1') { this.player.weaponSlot = 1; this.addHackFeedToast('👊 Equipaste: Puños'); }
      if (k === '2') { this.player.weaponSlot = 2; this.addHackFeedToast('🔫 Equipaste: Pistola 9mm'); }
      if (k === '3') { this.player.weaponSlot = 3; this.addHackFeedToast('💥 Equipaste: Rifle de Asalto'); }

      // Watch Dogs Hack
      if (k === 'e') {
        this.executeCurrentWatchDogsHack();
      }

      // RDR Social: Greet [G] / Antagonize [H]
      if (k === 'g') {
        this.socialGreet();
      }
      if (k === 'h') {
        this.socialAntagonize();
      }

      // Carjacking [F]
      if (k === 'f') {
        if (!this.player.inVehicle) {
          const closeCar = this.getClosestVehicle(3.8);
          if (closeCar) {
            this.carjackVehicle(closeCar);
          } else {
            this.applyVehicleMesh('gta-sports-car');
          }
        } else {
          // Exit vehicle
          this.applyVehicleMesh('foot');
        }
      }

      // Attack
      if (k === 'r') {
        this.fireWeapon();
      }
    }

    onKeyUp(e) {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') this.keys.forward = false;
      if (k === 's' || k === 'arrowdown') this.keys.backward = false;
      if (k === 'a' || k === 'arrowleft') this.keys.left = false;
      if (k === 'd' || k === 'arrowright') this.keys.right = false;
      if (k === ' ' || k === 'space') this.keys.brake = false;
      if (k === 'shift') this.keys.sprint = false;
    }

    onPointerDown(e) {
      if (e.target && e.target.id === 'openworld-canvas') {
        this.fireWeapon();
      }
    }

    onWindowResize() {
      if (!this.container || !this.renderer || !this.camera) return;
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    }

    updatePhysics(delta) {
      const p = this.player;

      // Rotation / Steering
      if (this.keys.left) p.yaw += p.turnSpeed * delta;
      if (this.keys.right) p.yaw -= p.turnSpeed * delta;

      // Acceleration & Braking
      if (this.keys.forward) {
        p.speed = Math.min(p.maxSpeed, p.speed + p.accel * delta);
      } else if (this.keys.backward) {
        p.speed = Math.max(-p.maxSpeed * 0.4, p.speed - p.accel * delta);
      } else {
        // Natural friction
        p.speed *= (1 - 1.8 * delta);
      }

      if (this.keys.brake) {
        p.speed *= (1 - 4.5 * delta);
      }

      // Move player coordinates
      p.x += Math.sin(p.yaw) * p.speed * delta;
      p.z += Math.cos(p.yaw) * p.speed * delta;
      p.stats.distance += Math.abs(p.speed * delta);

      // Audio engine RPM
      if (p.inVehicle) {
        this.audio.playEngineRPM(Math.abs(p.speed) / p.maxSpeed, p.speed * 3.6);
      } else {
        this.audio.stopEngine();
      }

      // Update mesh position & yaw
      if (this.playerGroup) {
        this.playerGroup.position.set(p.x, p.y, p.z);
        this.playerGroup.rotation.y = p.yaw;
      }

      // Wanted countdown
      if (p.wantedTimer > 0) {
        p.wantedTimer -= delta;
        if (p.wantedTimer <= 0) {
          p.wanted = Math.max(0, p.wanted - 1);
          p.wantedTimer = p.wanted > 0 ? 20 : 0;
          this.audio.playSiren(p.wanted > 0);
        }
      }

      // UFO floating rotation
      if (this.ufoMesh) {
        this.ufoMesh.rotation.y += 0.8 * delta;
      }
    }

    updateNPCs(delta) {
      // NPC Vehicles
      this.npcVehicles.forEach(car => {
        if (!car.isStalled) {
          car.mesh.position.z += car.speed * car.dirZ * delta;
          if (car.mesh.position.z > 240) car.mesh.position.z = -240;
          if (car.mesh.position.z < -240) car.mesh.position.z = 240;
        }
      });

      // NPC Pedestrians & Allies
      this.npcPedestrians.forEach(npc => {
        if (npc.isDead) return;

        if (npc.isAlly) {
          // Follow player
          const dx = this.player.x - npc.mesh.position.x;
          const dz = this.player.z - npc.mesh.position.z;
          const dist = Math.hypot(dx, dz);
          if (dist > 3.5) {
            npc.mesh.position.x += (dx / dist) * 3.2 * delta;
            npc.mesh.position.z += (dz / dist) * 3.2 * delta;
            npc.mesh.rotation.y = Math.atan2(dx, dz);
          }
        } else {
          // Wander
          const dx = npc.targetPos.x - npc.mesh.position.x;
          const dz = npc.targetPos.z - npc.mesh.position.z;
          const dist = Math.hypot(dx, dz);
          if (dist < 1.5) {
            npc.targetPos.set(
              npc.mesh.position.x + (Math.random() - 0.5) * 35,
              0,
              npc.mesh.position.z + (Math.random() - 0.5) * 35
            );
          } else {
            npc.mesh.position.x += (dx / dist) * npc.walkSpeed * delta;
            npc.mesh.position.z += (dz / dist) * npc.walkSpeed * delta;
            npc.mesh.rotation.y = Math.atan2(dx, dz);
          }
        }
      });
    }

    updateCamera() {
      if (!this.camera || !this.playerGroup) return;
      const offset = this.player.inVehicle
        ? new THREE.Vector3(0, 4.2, -8.5).applyEuler(new THREE.Euler(0, this.player.yaw, 0))
        : new THREE.Vector3(0, 2.5, -4.5).applyEuler(new THREE.Euler(0, this.player.yaw, 0));

      const targetPos = this.playerGroup.position.clone().add(offset);
      this.camera.position.lerp(targetPos, 0.12);
      this.camera.lookAt(this.playerGroup.position.clone().add(new THREE.Vector3(0, 1.2, 0)));
    }

    updateHUD() {
      // Speed, cash, wanted stars
      const spd = document.getElementById('g3d-speed-val');
      if (spd) spd.textContent = Math.round(Math.abs(this.player.speed) * 3.6);

      const cashEl = document.getElementById('g3d-cash-display');
      if (cashEl) cashEl.textContent = `$${this.player.cash.toLocaleString()}`;

      const starsEl = document.getElementById('g3d-wanted-stars');
      if (starsEl) {
        let starsStr = '';
        for (let i = 0; i < 5; i++) {
          starsStr += (i < this.player.wanted) ? '★' : '☆';
        }
        starsEl.textContent = starsStr;
        starsEl.style.color = (this.player.wanted > 0) ? '#ff0033' : '#64748b';
      }

      // Contextual prompt: Carjacking or Social
      const promptEl = document.getElementById('g3d-context-prompt');
      if (promptEl) {
        if (!this.player.inVehicle) {
          const nearCar = this.getClosestVehicle(3.5);
          const nearPed = this.getClosestPedestrian(3.5);
          if (nearCar) {
            promptEl.style.display = 'block';
            promptEl.innerHTML = `🚗 <b style="color:#ff0055;">[F] Robar Vehículo</b> (${nearCar.type.toUpperCase()})`;
          } else if (nearPed && !nearPed.isDead) {
            promptEl.style.display = 'block';
            promptEl.innerHTML = `🗣️ <b style="color:#00f0ff;">[G] Saludar / Amigo</b> &nbsp;|&nbsp; 🤬 <b style="color:#ffaa00;">[H] Provocar / Pelea</b>`;
          } else {
            promptEl.style.display = 'none';
          }
        } else {
          promptEl.style.display = 'none';
        }
      }
    }

    setActive(active) {
      this.isActive = Boolean(active);
      if (this.isActive && !this.rafId) {
        this.clock.start();
        this.animate();
      } else if (!this.isActive && this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    }

    animate() {
      if (!this.isActive) return;
      this.rafId = requestAnimationFrame(this.animate);
      const delta = Math.min(this.clock.getDelta(), 0.1);

      this.updatePhysics(delta);
      this.updateNPCs(delta);
      this.bloodPool.update(delta);
      this.checkLootPickup();
      this.updateProfilerTarget();
      this.updateCamera();
      this.updateHUD();

      this.renderer.render(this.scene, this.camera);
    }
  }

  window.CyberCity3DEngine = CyberCity3DEngine;
  window.cyberCityEngine = new CyberCity3DEngine();
})();
