/**
 * ============================================================================
 * PARALLAX GTA V // 3D REALISTIC MODERN CITY OPEN-WORLD SIMULATOR v4.5
 * Architecture: Three.js WebGL2 + Real GLB 3D Models (Vehicles, Aircraft, Buildings, Characters)
 * PBR Automotive Environment Reflections (PMREM) + Flight Physics + On-Foot Weapons & SWAT Pursuit
 * Author: Rodrigo Carrasco (Parallax / equisde) & IMXNOOBX Alliance
 * ============================================================================
 */

(function() {
  'use strict';

  const HEROKU_BACKEND_URL = 'https://parallax-cyber-city-5b72da76b505.herokuapp.com';

  // Comprehensive GTA V Model Manifest (CC0 & Permissive Open Source Models)
  const MODEL_MANIFEST = {
    // GTA Style Vehicles & Aircraft
    'gta-sports-car': 'assets/models/gta-sports-car.glb',
    'gta-police-car': 'assets/models/gta-police-car.glb',
    'gta-bus': 'assets/models/gta-bus.glb',
    'helicopter': 'assets/models/helicopter.glb',
    'jet-fighter': 'assets/models/jet-fighter.glb',
    'motorbike': 'assets/models/motorbike.glb',
    'sedan': 'assets/models/sedan.glb',
    'sedan-sports': 'assets/models/sedan-sports.glb',
    'suv': 'assets/models/suv.glb',
    'police': 'assets/models/police.glb',
    'taxi': 'assets/models/taxi.glb',
    'truck': 'assets/models/truck.glb',
    'ambulance': 'assets/models/ambulance.glb',

    // Characters (GTA V Archetypes)
    'char-gangster': 'assets/models/char-gangster.glb',
    'char-street': 'assets/models/char-street.glb',
    'char-swat': 'assets/models/char-swat.glb',
    'char-female-street': 'assets/models/char-female-street.glb',
    'character-male': 'assets/models/character-male.glb',
    'character-female': 'assets/models/character-female.glb',

    // Weapons
    'weapon-pistol': 'assets/models/weapon-pistol.glb',
    'weapon-rifle': 'assets/models/weapon-rifle.glb',

    // Architecture & Nature
    'building-tower-1': 'assets/models/building-tower-1.glb',
    'building-tower-2': 'assets/models/building-tower-2.glb',
    'building-a': 'assets/models/building-a.glb',
    'building-b': 'assets/models/building-b.glb',
    'building-c': 'assets/models/building-c.glb',
    'building-d': 'assets/models/building-d.glb',
    'building-skyscraper-a': 'assets/models/building-skyscraper-a.glb',
    'building-skyscraper-b': 'assets/models/building-skyscraper-b.glb',
    'building-skyscraper-c': 'assets/models/building-skyscraper-c.glb',
    'tree-oak': 'assets/models/tree-oak.glb',
    'tree-palm': 'assets/models/tree-palm.glb',
    'tree-pine': 'assets/models/tree-pine.glb',
    'tree-default': 'assets/models/tree-default.glb',

    // Street Props
    'prop-stop-sign': 'assets/models/prop-stop-sign.glb',
    'prop-traffic-light': 'assets/models/prop-traffic-light.glb',
    'lamp-post': 'assets/models/lamp-post.glb',
    'traffic-cone': 'assets/models/traffic-cone.glb',
    'barrier': 'assets/models/barrier.glb'
  };

  class CyberCity3DEngine {
    constructor() {
      this.container = null;
      this.canvas = null;
      this.renderer = null;
      this.scene = null;
      this.camera = null;
      this.clock = new THREE.Clock();
      this.rafId = null;
      this.lastNetSync = 0;
      this.isActive = false;

      // Mobile & Performance
      this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (window.innerWidth <= 768);

      // Model Library Cache
      this.modelCache = new Map();
      this.modelsLoading = 0;
      this.modelsLoaded = 0;

      // World Settings & Entities
      this.citySize = 500;
      this.buildings = [];
      this.greenAreas = [];
      this.roads = [];
      this.trafficLights = [];
      this.npcVehicles = [];
      this.npcPedestrians = [];
      this.remotePlayers = new Map();
      this.waterMesh = null;
      this.clouds = [];
      this.gasStations = [];
      this.cyberShops = [];
      this.giantTVs = [];
      this.tvNewsFeeds = [
        "LSPD: ALERTA ROJA EN DOWNTOWN. PATRULLAS PERSIGUEN CONVOY SOSPECHOSO.",
        "WEAZEL NEWS: TRÁFICO INTENSO EN LA GRAN AVENIDA NORTE-SUR.",
        "NOTICIAS 7: ACCIDENTE EN LA COSTA OESTE. LLEGAN AMBULANCIAS AL LUGAR.",
        "BOLSA DE VALORES: PARALLAX CORP ALCANZA RÉCORD TRAS NUEVO CIBERDECK.",
        "CLIMA: DÍA SOLEADO Y DESPEJADO EN LOS SANTOS. MÁXIMA DE 29°C."
      ];
      this.currentNewsIndex = 0;
      this.newsTimer = 0;

      // Player State (GTA V Style: Car, Aircraft or On-Foot)
      this.player = {
        mode: 'car', // 'car', 'aircraft' or 'foot'
        vehicleType: 'gta-sports-car',
        pos: new THREE.Vector3(0, 0.45, 20),
        vel: new THREE.Vector3(0, 0, 0),
        yaw: 0,
        pitch: 0,
        roll: 0,
        speed: 0,
        maxSpeed: 52,
        accel: 30,
        brake: 38,
        reverseMaxSpeed: 18,
        turnSpeed: 2.4,
        altitude: 0.45,
        targetAltitude: 0.45,
        rotorMesh: null,
        rotorAngle: 0,
        nitro: 100,
        isNitro: false,
        fuel: 100,
        battery: 100,
        hp: 100,
        armor: 100,
        credits: 350,
        wantedLevel: 0,
        wantedHeat: 0,
        mesh: null,
        vehicleGroup: null,
        characterGroup: null,
        heldWeapon: null,
        parkedCarPos: new THREE.Vector3(0, 0.45, 20),
        parkedCarYaw: 0,
        parkedCarMesh: null,
        wheels: [],
        footSpeed: 0,
        footWalkSpeed: 7.5,
        footRunSpeed: 14.5,
        footAnimTime: 0,
        isJumping: false,
        jumpVelY: 0,
        username: 'equisde',
        role: 'CYBER-OPERATOR // ARCHITECT',
        avatar: 'https://avatars.githubusercontent.com/u/10322304?v=4'
      };

      // Weapons, Projectiles & Police Cruisers
      this.projectiles = [];
      this.policeUnits = [];
      this.swatUnits = [];

      // Audio Synthesis
      this.audioCtx = null;

      // Input Controls
      this.keys = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        shift: false,
        space: false,
        hack: false,
        enterVehicle: false
      };
      this.touchState = { gas: false, brake: false, dx: 0, dy: 0, active: false };

      // Multiplayer
      this.socket = null;
      this.localId = 'usr_' + Math.random().toString(36).substring(2, 9);
      this.blackoutUntil = 0;
    }

    init(containerId, canvasId) {
      this.container = document.getElementById(containerId);
      this.canvas = document.getElementById(canvasId);
      if (!this.container || !this.canvas) return;

      const width = this.container.clientWidth || window.innerWidth;
      const height = this.container.clientHeight || window.innerHeight;

      // 1. Renderer Setup (Daylight PBR, ToneMapping & PCF Shadows)
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: !this.isMobile,
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isMobile ? 1.5 : 2.0));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.2;
      this.renderer.outputEncoding = THREE.sRGBEncoding;

      // 2. Scene & Camera Setup
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1000);

      // 3. Atmosphere & Daylight Lighting (Normal Realistic Modern City)
      this.buildDaytimeSkyAndSun();
      this.setupLighting();

      // 4. Preload Real 3D Models
      this.preloadGLBModels();

      // 5. Urban Layout (Roads, Blocks, Parks, Water)
      this.buildCityGroundAndRoads();
      this.buildModernCityBlocks();
      this.buildCentralParkAndPlaza();
      this.buildUrbanGreenery();
      this.buildGasStations();
      this.buildCyberShops();
      this.buildGiantTVBillboards();
      this.buildWaterBay();
      this.buildTrafficLights();

      // 6. Player, Vehicles & NPCs
      this.buildPlayerAndVehicles();
      this.buildNPCs();

      // 7. Inputs & Networking
      this.setupInputListeners();
      this.setupMobileTouchControls();
      this.initHerokuSocket();
      this.initRadar();
      this.checkUrlForGitHubOAuth();

      this.isActive = true;
      this.animate = this.animate.bind(this);
      this.rafId = requestAnimationFrame(this.animate);

      console.log('⚡ [PARALLAX GTA V 3D] Real Modern City Engine Live. Mobile:', this.isMobile);
    }

    // =========================================================================
    // AUDIO SYNTHESIS ENGINE (WEB AUDIO API)
    // =========================================================================
    initAudio() {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.audioCtx = new AudioContext();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    }

    playGunSound() {
      this.initAudio();
      if (!this.audioCtx) return;
      try {
        const t = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(420, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.12);
        gain.gain.setValueAtTime(0.45, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(t);
        osc.stop(t + 0.12);
      } catch (e) {}
    }

    playCrashSound() {
      this.initAudio();
      if (!this.audioCtx) return;
      try {
        const t = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(120, t);
        osc.frequency.exponentialRampToValueAtTime(25, t + 0.28);
        gain.gain.setValueAtTime(0.55, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.28);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(t);
        osc.stop(t + 0.28);
      } catch (e) {}
    }

    // =========================================================================
    // MODEL LIBRARY (GLTF/GLB LOADER & CACHING)
    // =========================================================================
    preloadGLBModels() {
      if (typeof THREE.GLTFLoader === 'undefined') {
        setTimeout(() => this.preloadGLBModels(), 400);
        return;
      }

      const loader = new THREE.GLTFLoader();
      const keys = Object.keys(MODEL_MANIFEST);
      this.modelsLoading = keys.length;

      keys.forEach(key => {
        const url = MODEL_MANIFEST[key];
        loader.load(
          url,
          (gltf) => {
            gltf.scene.traverse((child) => {
              if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                if (child.material) {
                  child.material.envMapIntensity = 1.6;
                  // Automotive High-Gloss Reflection
                  if (key.includes('car') || key.includes('sedan') || key.includes('suv') || key.includes('police')) {
                    child.material.metalness = Math.max(0.75, child.material.metalness || 0.85);
                    child.material.roughness = Math.min(0.25, child.material.roughness || 0.2);
                  }
                }
              }
            });
            this.modelCache.set(key, gltf.scene);
            this.modelsLoaded++;
            this.onModelReady(key);
          },
          undefined,
          (err) => {
            this.modelsLoaded++;
          }
        );
      });
    }

    getModel(name) {
      if (this.modelCache.has(name)) {
        return this.modelCache.get(name).clone(true);
      }
      return null;
    }

    onModelReady(name) {
      if (name === this.player.vehicleType || (name === 'char-gangster' && this.player.mode === 'foot')) {
        this.applyVehicleMesh(this.player.vehicleType);
      }
    }

    // =========================================================================
    // ATMOSPHERE, DAYLIGHT & PBR ENVIRONMENT REFLECTIONS (PMREM)
    // =========================================================================
    buildDaytimeSkyAndSun() {
      this.scene.fog = new THREE.FogExp2(0xcde8ff, 0.0022);

      const skyGeo = new THREE.SphereGeometry(650, 32, 24);
      const skyCanvas = document.createElement('canvas');
      skyCanvas.width = 128; skyCanvas.height = 512;
      const sCtx = skyCanvas.getContext('2d');
      const grad = sCtx.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0.0, '#1d5ec9');
      grad.addColorStop(0.4, '#4a90e2');
      grad.addColorStop(0.85, '#aed5fc');
      grad.addColorStop(1.0, '#e2effd');
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 128, 512);

      const skyTex = new THREE.CanvasTexture(skyCanvas);
      const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, depthWrite: false });
      const skyDome = new THREE.Mesh(skyGeo, skyMat);
      this.scene.add(skyDome);

      // Glowing Sun
      const sunGeo = new THREE.SphereGeometry(18, 16, 16);
      const sunMat = new THREE.MeshBasicMaterial({ color: 0xfffae8 });
      const sunMesh = new THREE.Mesh(sunGeo, sunMat);
      sunMesh.position.set(160, 260, 110);
      this.scene.add(sunMesh);

      // Cumulus Clouds
      const cloudMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.95,
        metalness: 0.05,
        transparent: true,
        opacity: 0.88,
        flatShading: true
      });

      for (let i = 0; i < 24; i++) {
        const cloudGroup = new THREE.Group();
        const numPuffs = 4 + Math.floor(Math.random() * 5);
        for (let p = 0; p < numPuffs; p++) {
          const r = 12 + Math.random() * 18;
          const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), cloudMat);
          puff.position.set((p - numPuffs / 2) * 16, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 14);
          cloudGroup.add(puff);
        }
        cloudGroup.position.set(
          (Math.random() - 0.5) * 600,
          180 + Math.random() * 60,
          (Math.random() - 0.5) * 600
        );
        cloudGroup.userData = { speed: 1.2 + Math.random() * 1.8 };
        this.clouds.push(cloudGroup);
        this.scene.add(cloudGroup);
      }
    }

    setupLighting() {
      // 1. Sun Directional Light with Shadows
      const sunLight = new THREE.DirectionalLight(0xfff8ee, 1.95);
      sunLight.position.set(160, 260, 110);
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.width = this.isMobile ? 1024 : 2048;
      sunLight.shadow.mapSize.height = this.isMobile ? 1024 : 2048;
      sunLight.shadow.bias = -0.0004;

      const d = 220;
      sunLight.shadow.camera.left = -d;
      sunLight.shadow.camera.right = d;
      sunLight.shadow.camera.top = d;
      sunLight.shadow.camera.bottom = -d;
      sunLight.shadow.camera.near = 10;
      sunLight.shadow.camera.far = 700;
      this.scene.add(sunLight);
      this.sunLight = sunLight;

      // 2. Dual Hemisphere Light
      const hemiLight = new THREE.HemisphereLight(0x7ec2f7, 0x516642, 0.9);
      this.scene.add(hemiLight);

      // 3. Ambient Fill Light
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.38);
      this.scene.add(ambientLight);

      // 4. PBR Equirectangular Environment Map (PMREM) for Realistic Car Reflections
      try {
        const pmremGen = new THREE.PMREMGenerator(this.renderer);
        pmremGen.compileEquirectangularShader();

        const envCanvas = document.createElement('canvas');
        envCanvas.width = 1024; envCanvas.height = 512;
        const eCtx = envCanvas.getContext('2d');

        const eGrad = eCtx.createLinearGradient(0, 0, 0, 512);
        eGrad.addColorStop(0.0, '#1d4ed8');
        eGrad.addColorStop(0.4, '#38bdf8');
        eGrad.addColorStop(0.5, '#fef08a');
        eGrad.addColorStop(0.54, '#64748b');
        eGrad.addColorStop(1.0, '#1e293b');
        eCtx.fillStyle = eGrad;
        eCtx.fillRect(0, 0, 1024, 512);

        // Sun disc glare reflection
        eCtx.fillStyle = '#ffffff';
        eCtx.beginPath();
        eCtx.arc(380, 200, 48, 0, Math.PI * 2);
        eCtx.fill();

        // City skyline silhouettes for reflections
        eCtx.fillStyle = '#475569';
        for (let b = 0; b < 1024; b += 28) {
          const h = 45 + Math.sin(b * 0.05) * 35 + (b % 15) * 4;
          eCtx.fillRect(b, 260 - h, 24, h);
        }

        const envTex = new THREE.CanvasTexture(envCanvas);
        const envMap = pmremGen.fromEquirectangular(envTex).texture;
        this.scene.environment = envMap;
        pmremGen.dispose();
      } catch (err) {
        console.warn('⚠️ PMREM Environment generator fallback:', err);
      }
    }

    // =========================================================================
    // ROADS & REALISTIC ASPHALT WITH ZEBRA CROSSINGS
    // =========================================================================
    buildCityGroundAndRoads() {
      const groundGeo = new THREE.PlaneGeometry(this.citySize * 1.5, this.citySize * 1.5);
      const groundMat = new THREE.MeshStandardMaterial({
        color: 0x3d4738,
        roughness: 0.95,
        metalness: 0.05
      });
      const ground = new THREE.Mesh(groundGeo, groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.02;
      ground.receiveShadow = true;
      this.scene.add(ground);

      const roadCanvas = document.createElement('canvas');
      roadCanvas.width = 512; roadCanvas.height = 512;
      const rCtx = roadCanvas.getContext('2d');

      rCtx.fillStyle = '#26282b';
      rCtx.fillRect(0, 0, 512, 512);

      for (let n = 0; n < 3500; n++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const shade = Math.floor(30 + Math.random() * 30);
        rCtx.fillStyle = `rgb(${shade},${shade},${shade})`;
        rCtx.fillRect(x, y, 2, 2);
      }

      rCtx.fillStyle = '#f5b700';
      rCtx.fillRect(251, 0, 3, 512);
      rCtx.fillRect(258, 0, 3, 512);

      rCtx.fillStyle = '#f1f5f9';
      for (let y = 0; y < 512; y += 48) {
        rCtx.fillRect(128, y, 4, 28);
        rCtx.fillRect(384, y, 4, 28);
      }

      rCtx.fillStyle = '#e2e8f0';
      rCtx.fillRect(12, 0, 4, 512);
      rCtx.fillRect(496, 0, 4, 512);

      const asphaltTex = new THREE.CanvasTexture(roadCanvas);
      asphaltTex.wrapS = THREE.RepeatWrapping;
      asphaltTex.wrapT = THREE.RepeatWrapping;

      const roadMat = new THREE.MeshStandardMaterial({
        map: asphaltTex,
        roughness: 0.82,
        metalness: 0.12
      });

      const roadWidth = 24;
      const avenueCoords = [-150, -75, 0, 75, 150];

      avenueCoords.forEach(x => {
        const roadGeo = new THREE.PlaneGeometry(roadWidth, 420);
        const tex = asphaltTex.clone();
        tex.repeat.set(1, 16);
        tex.needsUpdate = true;
        const mat = roadMat.clone();
        mat.map = tex;

        const road = new THREE.Mesh(roadGeo, mat);
        road.rotation.x = -Math.PI / 2;
        road.position.set(x, 0.01, 0);
        road.receiveShadow = true;
        this.scene.add(road);

        this.roads.push({ x, z: 0, dir: 'NS', minZ: -210, maxZ: 210, width: roadWidth });

        this.buildConcreteSidewalk(x - roadWidth / 2 - 2.5, 0, 5, 420);
        this.buildConcreteSidewalk(x + roadWidth / 2 + 2.5, 0, 5, 420);
      });

      avenueCoords.forEach(z => {
        const roadGeo = new THREE.PlaneGeometry(roadWidth, 420);
        const tex = asphaltTex.clone();
        tex.repeat.set(1, 16);
        tex.needsUpdate = true;
        const mat = roadMat.clone();
        mat.map = tex;

        const road = new THREE.Mesh(roadGeo, mat);
        road.rotation.x = -Math.PI / 2;
        road.rotation.z = Math.PI / 2;
        road.position.set(0, 0.012, z);
        road.receiveShadow = true;
        this.scene.add(road);

        this.roads.push({ x: 0, z, dir: 'EW', minX: -210, maxX: 210, width: roadWidth });

        this.buildConcreteSidewalk(0, z - roadWidth / 2 - 2.5, 420, 5);
        this.buildConcreteSidewalk(0, z + roadWidth / 2 + 2.5, 420, 5);
      });

      avenueCoords.forEach(ix => {
        avenueCoords.forEach(iz => {
          this.buildZebraCrossings(ix, iz, roadWidth);
        });
      });
    }

    buildConcreteSidewalk(x, z, width, length) {
      const walkGeo = new THREE.BoxGeometry(width, 0.22, length);
      const walkMat = new THREE.MeshStandardMaterial({
        color: 0xcfd8dc,
        roughness: 0.88,
        metalness: 0.08
      });
      const walk = new THREE.Mesh(walkGeo, walkMat);
      walk.position.set(x, 0.11, z);
      walk.receiveShadow = true;
      walk.castShadow = true;
      this.scene.add(walk);
    }

    buildZebraCrossings(cx, cz, roadWidth) {
      const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
      const offsets = [
        { x: 0, z: -(roadWidth / 2 + 3), w: roadWidth * 0.75, l: 3.2 },
        { x: 0, z: (roadWidth / 2 + 3), w: roadWidth * 0.75, l: 3.2 },
        { x: -(roadWidth / 2 + 3), z: 0, w: 3.2, l: roadWidth * 0.75 },
        { x: (roadWidth / 2 + 3), z: 0, w: 3.2, l: roadWidth * 0.75 }
      ];

      offsets.forEach(off => {
        const crossing = new THREE.Group();
        const numStripes = 7;
        const isHorizontal = off.w > off.l;
        for (let i = 0; i < numStripes; i++) {
          let stripe;
          if (isHorizontal) {
            stripe = new THREE.Mesh(new THREE.PlaneGeometry(1.6, off.l), whiteMat);
            stripe.position.x = (i - numStripes / 2 + 0.5) * 2.4;
          } else {
            stripe = new THREE.Mesh(new THREE.PlaneGeometry(off.w, 1.6), whiteMat);
            stripe.position.z = (i - numStripes / 2 + 0.5) * 2.4;
          }
          stripe.rotation.x = -Math.PI / 2;
          crossing.add(stripe);
        }
        crossing.position.set(cx + off.x, 0.025, cz + off.z);
        this.scene.add(crossing);
      });
    }

    // =========================================================================
    // MODERN CITY BLOCKS (REAL 3D BUILDINGS GLB + ARCHITECTURAL DETAILING)
    // =========================================================================
    buildModernCityBlocks() {
      const blockCoords = [
        { x: -112, z: -112 },
        { x: -37,  z: -112 },
        { x: 37,   z: -112 },
        { x: 112,  z: -112 },
        { x: -112, z: -37  },
        { x: -37,  z: -37  },
        { x: 37,   z: -37  },
        { x: 112,  z: -37  },
        { x: -112, z: 37   },
        { x: -37,  z: 37   },
        { x: 37,   z: 37   },
        { x: 112,  z: 37   },
        { x: -112, z: 112  },
        { x: -37,  z: 112  },
        { x: 37,   z: 112  },
        { x: 112,  z: 112  }
      ];

      blockCoords.forEach((bPos, idx) => {
        if (bPos.x === 37 && bPos.z === -112) return; // Dedicated Central Park

        const isDowntown = Math.abs(bPos.x) <= 37 && Math.abs(bPos.z) <= 37;
        const bGroup = new THREE.Group();
        bGroup.position.set(bPos.x, 0, bPos.z);

        const modelNames = isDowntown
          ? ['building-tower-1', 'building-tower-2', 'building-skyscraper-a', 'building-skyscraper-b']
          : ['building-a', 'building-b', 'building-c', 'building-d'];
        const chosen = modelNames[idx % modelNames.length];
        const glbModel = this.getModel(chosen);

        if (glbModel) {
          const scale = isDowntown ? 28.0 : 16.0;
          glbModel.scale.set(scale, scale, scale);
          bGroup.add(glbModel);
        } else {
          const bHeight = isDowntown ? (60 + Math.random() * 65) : (22 + Math.random() * 26);
          const bWidth = 36;
          const bDepth = 36;

          const facadeColors = [0xd1d5db, 0x9ca3af, 0xb0bec5, 0x8d6e63, 0x78909c, 0xc5cae9];
          const bMat = new THREE.MeshStandardMaterial({
            color: facadeColors[idx % facadeColors.length],
            roughness: 0.65,
            metalness: 0.25
          });

          const buildingMesh = new THREE.Mesh(new THREE.BoxGeometry(bWidth, bHeight, bDepth), bMat);
          buildingMesh.position.y = bHeight / 2;
          buildingMesh.castShadow = true;
          buildingMesh.receiveShadow = true;
          bGroup.add(buildingMesh);

          const winMat = new THREE.MeshStandardMaterial({ color: 0x64b5f6, roughness: 0.1, metalness: 0.9 });
          const numBands = Math.floor(bHeight / 4);
          for (let f = 1; f < numBands; f++) {
            const band = new THREE.Mesh(new THREE.BoxGeometry(bWidth + 0.2, 1.4, bDepth + 0.2), winMat);
            band.position.y = f * 4;
            bGroup.add(band);
          }
        }

        this.scene.add(bGroup);

        const halfSize = isDowntown ? 18 : 16;
        this.buildings.push({
          x: bPos.x,
          z: bPos.z,
          minX: bPos.x - halfSize,
          maxX: bPos.x + halfSize,
          minZ: bPos.z - halfSize,
          maxZ: bPos.z + halfSize,
          mesh: bGroup
        });
      });
    }

    // =========================================================================
    // CENTRAL PARK & CIVIC PLAZA
    // =========================================================================
    buildCentralParkAndPlaza() {
      const parkX = 37;
      const parkZ = -112;
      const parkSize = 65;

      const parkGroup = new THREE.Group();
      parkGroup.position.set(parkX, 0, parkZ);

      const grassGeo = new THREE.PlaneGeometry(parkSize, parkSize);
      const grassMat = new THREE.MeshStandardMaterial({
        color: 0x2e7d32,
        roughness: 0.9,
        metalness: 0.05
      });
      const grass = new THREE.Mesh(grassGeo, grassMat);
      grass.rotation.x = -Math.PI / 2;
      grass.position.y = 0.12;
      grass.receiveShadow = true;
      parkGroup.add(grass);

      // Fountain
      const pondGeo = new THREE.CylinderGeometry(9, 10, 0.8, 24);
      const rim = new THREE.Mesh(pondGeo, new THREE.MeshStandardMaterial({ color: 0xb0bec5, roughness: 0.7 }));
      rim.position.y = 0.4;
      parkGroup.add(rim);

      const waterDisc = new THREE.Mesh(
        new THREE.CircleGeometry(8.5, 24),
        new THREE.MeshStandardMaterial({ color: 0x0288d1, roughness: 0.1, metalness: 0.85 })
      );
      waterDisc.rotation.x = -Math.PI / 2;
      waterDisc.position.y = 0.78;
      parkGroup.add(waterDisc);

      const treeCoords = [
        [-22, -22], [-22, 22], [22, -22], [22, 22],
        [-15, 0], [15, 0], [0, -18], [0, 18],
        [-24, -8], [24, 8], [-8, 24], [8, -24]
      ];

      treeCoords.forEach((tc, idx) => {
        const treeType = idx % 2 === 0 ? 'tree-oak' : 'tree-pine';
        const treeModel = this.getModel(treeType);

        if (treeModel) {
          treeModel.position.set(tc[0], 0.12, tc[1]);
          const sc = idx % 2 === 0 ? 5.2 : 6.5;
          treeModel.scale.set(sc, sc, sc);
          parkGroup.add(treeModel);
        } else {
          const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.35, 0.5, 4.5, 8),
            new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9 })
          );
          trunk.position.set(tc[0], 2.25, tc[1]);
          trunk.castShadow = true;
          parkGroup.add(trunk);

          const crown = new THREE.Mesh(
            new THREE.DodecahedronGeometry(3.2, 1),
            new THREE.MeshStandardMaterial({ color: 0x1b5e20, roughness: 0.85 })
          );
          crown.position.set(tc[0], 5.8, tc[1]);
          crown.castShadow = true;
          parkGroup.add(crown);
        }
      });

      this.scene.add(parkGroup);
      this.greenAreas.push({ x: parkX, z: parkZ, radius: parkSize / 2, name: 'Central Park' });
    }

    // =========================================================================
    // CONTINUOUS URBAN GREENERY (MEDIANS & BOULEVARD TREES)
    // =========================================================================
    buildUrbanGreenery() {
      const medianGroup = new THREE.Group();
      const medGrass = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 0.28, 380),
        new THREE.MeshStandardMaterial({ color: 0x388e3c, roughness: 0.9 })
      );
      medGrass.position.set(0, 0.14, 0);
      medGrass.receiveShadow = true;
      medianGroup.add(medGrass);

      for (let z = -180; z <= 180; z += 24) {
        if (Math.abs(z) === 75 || Math.abs(z) === 150 || z === 0) continue;

        const palm = this.getModel('tree-palm');
        if (palm) {
          palm.position.set(0, 0.28, z);
          palm.scale.set(4.8, 4.8, 4.8);
          medianGroup.add(palm);
        }
      }
      this.scene.add(medianGroup);
      this.greenAreas.push({ x: 0, z: 0, radius: 190, isBoulevard: true });

      // Coastal Promenade
      const promGroup = new THREE.Group();
      const promWalk = new THREE.Mesh(
        new THREE.BoxGeometry(14, 0.35, 420),
        new THREE.MeshStandardMaterial({ color: 0xb0bec5, roughness: 0.8 })
      );
      promWalk.position.set(-188, 0.18, 0);
      promWalk.receiveShadow = true;
      promGroup.add(promWalk);

      for (let z = -190; z <= 190; z += 20) {
        const palm = this.getModel('tree-palm');
        if (palm) {
          palm.position.set(-192, 0.35, z);
          palm.scale.set(5.2, 5.2, 5.2);
          promGroup.add(palm);
        }
      }
      this.scene.add(promGroup);
      this.greenAreas.push({ x: -188, z: 0, radius: 210, isCoast: true });
    }

    // =========================================================================
    // GAS STATIONS, CYBERSHOPS & TV BILLBOARDS
    // =========================================================================
    buildGasStations() {
      const gsLocations = [
        { x: -75, z: 42, name: 'Estación Central Shell / CyberGas' },
        { x: 75, z: -42, name: 'Estación Express Highway' }
      ];

      gsLocations.forEach(loc => {
        const station = new THREE.Group();
        station.position.set(loc.x, 0, loc.z);

        const canopy = new THREE.Mesh(
          new THREE.BoxGeometry(22, 1.2, 14),
          new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.4, metalness: 0.6 })
        );
        canopy.position.y = 5.5;
        canopy.castShadow = true;
        station.add(canopy);

        const pillarMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
        [[-8, -5], [8, -5], [-8, 5], [8, 5]].forEach(p => {
          const col = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 5.5, 12), pillarMat);
          col.position.set(p[0], 2.75, p[1]);
          station.add(col);
        });

        [-4, 4].forEach(px => {
          const pump = new THREE.Mesh(
            new THREE.BoxGeometry(1.6, 2.4, 1.2),
            new THREE.MeshStandardMaterial({ color: 0xffb300, roughness: 0.3, metalness: 0.7 })
          );
          pump.position.set(px, 1.2, 0);
          pump.castShadow = true;
          station.add(pump);
        });

        this.scene.add(station);
        this.gasStations.push({ x: loc.x, z: loc.z, radius: 12, name: loc.name });
      });
    }

    buildCyberShops() {
      const shopLocations = [
        { x: 42, z: 75, name: 'Mercado Negro & CyberMod' },
        { x: -42, z: -75, name: 'Ammunation & CyberArmory' }
      ];

      shopLocations.forEach(loc => {
        const shop = new THREE.Group();
        shop.position.set(loc.x, 0, loc.z);

        const building = new THREE.Mesh(
          new THREE.BoxGeometry(16, 7, 14),
          new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.6 })
        );
        building.position.y = 3.5;
        building.castShadow = true;
        shop.add(building);

        const display = new THREE.Mesh(
          new THREE.PlaneGeometry(10, 3.5),
          new THREE.MeshBasicMaterial({ color: 0x00f0ff })
        );
        display.position.set(0, 2.5, 7.02);
        shop.add(display);

        this.scene.add(shop);
        this.cyberShops.push({ x: loc.x, z: loc.z, radius: 11, name: loc.name });
      });
    }

    buildGiantTVBillboards() {
      const tvLocs = [
        { x: 0, z: -75, rotY: 0 },
        { x: -75, z: 0, rotY: Math.PI / 2 },
        { x: 75, z: 0, rotY: -Math.PI / 2 }
      ];

      tvLocs.forEach(loc => {
        const billboard = new THREE.Group();
        billboard.position.set(loc.x, 18, loc.z);
        billboard.rotation.y = loc.rotY;

        const tvCanvas = document.createElement('canvas');
        tvCanvas.width = 1024; tvCanvas.height = 512;
        const ctx = tvCanvas.getContext('2d');
        ctx.fillStyle = '#0a0f1d'; ctx.fillRect(0, 0, 1024, 512);
        ctx.fillStyle = '#00f0ff'; ctx.font = 'bold 38px monospace';
        ctx.fillText('⚡ LSPD NEWS // TRANSMISIÓN EN VIVO', 40, 70);

        const tvTex = new THREE.CanvasTexture(tvCanvas);
        const screen = new THREE.Mesh(
          new THREE.PlaneGeometry(24, 12),
          new THREE.MeshBasicMaterial({ map: tvTex })
        );
        billboard.add(screen);

        this.scene.add(billboard);
        this.giantTVs.push({ group: billboard, canvas: tvCanvas, ctx, texture: tvTex, isHacked: false });
      });
    }

    updateTVBillboards(delta) {
      this.newsTimer += delta;
      if (this.newsTimer >= 6.0) {
        this.newsTimer = 0;
        this.currentNewsIndex = (this.currentNewsIndex + 1) % this.tvNewsFeeds.length;
        const headline = this.tvNewsFeeds[this.currentNewsIndex];

        this.giantTVs.forEach(tv => {
          const ctx = tv.ctx;
          ctx.fillStyle = tv.isHacked ? '#1a0033' : '#0a0f1d';
          ctx.fillRect(0, 0, 1024, 512);

          ctx.fillStyle = tv.isHacked ? '#ff007f' : '#00f0ff';
          ctx.font = 'bold 42px monospace';
          ctx.fillText(tv.isHacked ? '⚡ SEÑAL PIRATA // PARALLAX & IMXNOOBX' : '📺 WEAZEL NEWS // EN DIRECTO', 50, 80);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 32px sans-serif';
          ctx.fillText(headline, 50, 240);

          ctx.fillStyle = '#ffd700';
          ctx.font = '24px monospace';
          ctx.fillText(`HORA: ${new Date().toLocaleTimeString()} &middot; ESTADO RED: ONLINE`, 50, 420);

          tv.texture.needsUpdate = true;
        });
      }
    }

    buildWaterBay() {
      const waterGeo = new THREE.PlaneGeometry(180, 500);
      const waterMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        roughness: 0.12,
        metalness: 0.88,
        transparent: true,
        opacity: 0.92
      });
      this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
      this.waterMesh.rotation.x = -Math.PI / 2;
      this.waterMesh.position.set(-250, -0.4, 0);
      this.scene.add(this.waterMesh);
    }

    buildTrafficLights() {
      const intersections = [
        { x: 0, z: 0 },
        { x: 0, z: -75 },
        { x: 0, z: 75 },
        { x: -75, z: 0 },
        { x: 75, z: 0 }
      ];

      intersections.forEach(pos => {
        const tlGroup = new THREE.Group();
        tlGroup.position.set(pos.x + 10, 0, pos.z + 10);

        const propTL = this.getModel('prop-traffic-light');
        if (propTL) {
          propTL.scale.set(3.2, 3.2, 3.2);
          tlGroup.add(propTL);
        } else {
          const mast = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0.25, 6.5, 12),
            new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.8 })
          );
          mast.position.y = 3.25;
          mast.castShadow = true;
          tlGroup.add(mast);

          const box = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 2.2, 0.8),
            new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.9 })
          );
          box.position.set(0, 5.2, 0);
          tlGroup.add(box);
        }

        const redLens = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 12), new THREE.MeshBasicMaterial({ color: 0xff0033 }));
        redLens.position.set(0, 5.8, 0.42);
        tlGroup.add(redLens);

        const yellowLens = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 12), new THREE.MeshBasicMaterial({ color: 0x332200 }));
        yellowLens.position.set(0, 5.2, 0.42);
        tlGroup.add(yellowLens);

        const greenLens = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 12), new THREE.MeshBasicMaterial({ color: 0x003311 }));
        greenLens.position.set(0, 4.6, 0.42);
        tlGroup.add(greenLens);

        this.scene.add(tlGroup);
        this.trafficLights.push({
          group: tlGroup,
          state: 'RED',
          timer: 0,
          redLens,
          yellowLens,
          greenLens,
          x: pos.x,
          z: pos.z
        });
      });
    }

    updateTrafficLights(delta) {
      this.trafficLights.forEach(tl => {
        tl.timer += delta;
        if (tl.state === 'RED' && tl.timer > 8.0) {
          tl.state = 'GREEN';
          tl.timer = 0;
          tl.redLens.material.color.setHex(0x330000);
          tl.yellowLens.material.color.setHex(0x332200);
          tl.greenLens.material.color.setHex(0x00ff66);
        } else if (tl.state === 'GREEN' && tl.timer > 8.0) {
          tl.state = 'YELLOW';
          tl.timer = 0;
          tl.redLens.material.color.setHex(0x330000);
          tl.yellowLens.material.color.setHex(0xffbb00);
          tl.greenLens.material.color.setHex(0x003311);
        } else if (tl.state === 'YELLOW' && tl.timer > 2.5) {
          tl.state = 'RED';
          tl.timer = 0;
          tl.redLens.material.color.setHex(0xff0033);
          tl.yellowLens.material.color.setHex(0x332200);
          tl.greenLens.material.color.setHex(0x003311);
        }
      });
    }

    // =========================================================================
    // PLAYER & MULTI-VEHICLE (CARS, HELICOPTERS, JETS, MOTORBIKES, ON-FOOT)
    // =========================================================================
    buildPlayerAndVehicles() {
      const root = new THREE.Group();
      root.position.copy(this.player.pos);
      this.scene.add(root);
      this.player.mesh = root;

      this.applyVehicleMesh(this.player.vehicleType);
      this.createOverheadNameplate();
    }

    applyVehicleMesh(type) {
      this.player.vehicleType = type;

      while (this.player.mesh.children.length > 0) {
        this.player.mesh.remove(this.player.mesh.children[0]);
      }
      this.player.wheels = [];
      this.player.rotorMesh = null;

      if (type === 'foot' || type === 'swat' || this.player.mode === 'foot') {
        // ON-FOOT CHARACTER (Gangster Mobster, Street or SWAT)
        this.player.mode = 'foot';
        const modelKey = type === 'swat' ? 'char-swat' : 'char-gangster';
        const charModel = this.getModel(modelKey) || this.getModel('char-street') || this.getModel('character-male');

        if (charModel) {
          charModel.scale.set(4.5, 4.5, 4.5);
          charModel.rotation.y = Math.PI;
          this.player.mesh.add(charModel);
          this.player.characterGroup = charModel;

          // Attach 3D Weapon in hand
          const weaponModel = this.getModel('weapon-pistol') || this.getModel('weapon-rifle');
          if (weaponModel) {
            weaponModel.scale.set(1.4, 1.4, 1.4);
            weaponModel.position.set(0.45, 1.1, 0.4);
            weaponModel.rotation.set(0, Math.PI, 0);
            this.player.mesh.add(weaponModel);
            this.player.heldWeapon = weaponModel;
          }
        }

        this.spawnParkedVehicle(this.player.parkedCarPos, this.player.parkedCarYaw, 'gta-sports-car');
      } else {
        // VEHICLE OR AIRCRAFT MODE
        this.despawnParkedVehicle();

        if (type === 'helicopter' || type === 'jet-fighter') {
          this.player.mode = 'aircraft';
        } else {
          this.player.mode = 'car';
        }

        const model = this.getModel(type) || this.getModel('gta-sports-car') || this.getModel('sedan');
        if (model) {
          const sc = type === 'helicopter' ? 1.8 : (type === 'jet-fighter' ? 2.2 : (type === 'motorbike' ? 2.8 : 3.6));
          model.scale.set(sc, sc, sc);
          this.player.mesh.add(model);
          this.player.vehicleGroup = model;

          // Locate wheels or rotors
          model.traverse((child) => {
            if (child.name && child.name.toLowerCase().includes('wheel')) {
              this.player.wheels.push(child);
            }
            if (child.name && (child.name.toLowerCase().includes('rotor') || child.name.toLowerCase().includes('propeller'))) {
              this.player.rotorMesh = child;
            }
          });
        }
      }

      this.createOverheadNameplate();
      this.updateVehicleChipsUI(type);
    }

    spawnParkedVehicle(pos, yaw, type) {
      this.despawnParkedVehicle();
      const carModel = this.getModel(type) || this.getModel('gta-sports-car') || this.getModel('sedan');
      if (carModel) {
        carModel.position.copy(pos);
        carModel.rotation.y = yaw;
        carModel.scale.set(3.6, 3.6, 3.6);
        this.scene.add(carModel);
        this.player.parkedCarMesh = carModel;
      }
    }

    despawnParkedVehicle() {
      if (this.player.parkedCarMesh) {
        this.scene.remove(this.player.parkedCarMesh);
        this.player.parkedCarMesh = null;
      }
    }

    toggleVehicleOrFoot() {
      if (this.player.mode === 'car' || this.player.mode === 'aircraft') {
        this.player.parkedCarPos.copy(this.player.pos);
        this.player.parkedCarYaw = this.player.yaw;
        this.player.pos.x += Math.cos(this.player.yaw) * 2.5;
        this.player.speed = 0;
        this.player.vel.set(0, 0, 0);
        this.applyVehicleMesh('foot');
        this.addHackFeedToast('🚶 Te has bajado del vehículo. Modo a pie activo.');
      } else {
        const dist = this.player.pos.distanceTo(this.player.parkedCarPos);
        if (dist <= 6.5) {
          this.player.pos.copy(this.player.parkedCarPos);
          this.player.yaw = this.player.parkedCarYaw;
          this.applyVehicleMesh('gta-sports-car');
          this.addHackFeedToast('🚗 Te has subido al vehículo.');
        } else {
          this.addHackFeedToast('⚠️ Estás demasiado lejos de tu coche para subir.');
        }
      }
    }

    createOverheadNameplate() {
      const tagCanvas = document.createElement('canvas');
      tagCanvas.width = 256; tagCanvas.height = 64;
      const tCtx = tagCanvas.getContext('2d');
      tCtx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      tCtx.roundRect ? tCtx.roundRect(0, 0, 256, 64, 12) : tCtx.fillRect(0, 0, 256, 64);
      tCtx.fill();
      tCtx.strokeStyle = '#00f0ff';
      tCtx.lineWidth = 3;
      tCtx.stroke();
      tCtx.fillStyle = '#ffffff';
      tCtx.font = 'bold 24px monospace';
      tCtx.textAlign = 'center';
      tCtx.fillText(`@${this.player.username}`, 128, 42);

      const tagSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(tagCanvas) }));
      tagSprite.scale.set(3.2, 0.8, 1);
      tagSprite.position.y = 3.8;
      this.player.mesh.add(tagSprite);
    }

    // =========================================================================
    // WEAPONS, PROJECTILES & SWAT PURSUIT
    // =========================================================================
    fireWeapon() {
      const p = this.player;
      const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), p.yaw);
      const spawnPos = p.pos.clone().add(new THREE.Vector3(0, p.mode === 'foot' ? 1.4 : 0.8, 0)).addScaledVector(fwd, 1.8);

      const projGeo = new THREE.SphereGeometry(0.24, 8, 8);
      const projMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
      const bullet = new THREE.Mesh(projGeo, projMat);
      bullet.position.copy(spawnPos);
      this.scene.add(bullet);

      this.projectiles.push({
        mesh: bullet,
        vel: fwd.clone().multiplyScalar(135),
        life: 1.5
      });

      this.playGunSound();

      // Startle pedestrians in vicinity
      this.npcPedestrians.forEach(ped => {
        if (ped.mesh.position.distanceTo(p.pos) < 50) {
          ped.isPanicking = true;
          ped.speed = 7.2;
        }
      });

      // Increase Wanted Level
      p.wantedHeat += 25;
      if (p.wantedHeat >= 120) p.wantedLevel = 5;
      else if (p.wantedHeat >= 90) p.wantedLevel = 4;
      else if (p.wantedHeat >= 60) p.wantedLevel = 3;
      else if (p.wantedHeat >= 40) p.wantedLevel = 2;
      else if (p.wantedHeat >= 20) p.wantedLevel = 1;

      if (p.wantedLevel >= 1 && this.policeUnits.length === 0) {
        this.spawnPoliceCruiser();
      }
      if (p.wantedLevel >= 4 && this.swatUnits.length === 0) {
        this.spawnSwatSquad();
      }
    }

    updateProjectiles(delta) {
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const proj = this.projectiles[i];
        proj.life -= delta;
        proj.mesh.position.addScaledVector(proj.vel, delta);

        if (proj.life <= 0 || this.checkBuildingCollisions(proj.mesh.position, 0.4)) {
          this.scene.remove(proj.mesh);
          this.projectiles.splice(i, 1);
        }
      }
    }

    spawnPoliceCruiser() {
      const policeGroup = new THREE.Group();
      const pModel = this.getModel('gta-police-car') || this.getModel('police');
      if (pModel) {
        pModel.scale.set(3.6, 3.6, 3.6);
        policeGroup.add(pModel);
      }

      const redLight = new THREE.PointLight(0xff0000, 2.8, 30);
      redLight.position.set(-0.5, 2.2, 0);
      policeGroup.add(redLight);

      const blueLight = new THREE.PointLight(0x0000ff, 2.8, 30);
      blueLight.position.set(0.5, 2.2, 0);
      policeGroup.add(blueLight);

      const behind = new THREE.Vector3(0, 0, -65).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.player.yaw);
      policeGroup.position.copy(this.player.pos).add(behind);
      policeGroup.position.y = 0.45;
      this.scene.add(policeGroup);

      this.policeUnits.push({
        mesh: policeGroup,
        speed: 40,
        redLight,
        blueLight,
        sirenTimer: 0
      });

      this.addHackFeedToast('🚨 LSPD EN CAMINO: Patrullas policiales desplegadas.');
    }

    spawnSwatSquad() {
      const swatGroup = new THREE.Group();
      const sModel = this.getModel('char-swat');
      if (sModel) {
        sModel.scale.set(4.5, 4.5, 4.5);
        swatGroup.add(sModel);
      }
      swatGroup.position.copy(this.player.pos).add(new THREE.Vector3(-15, 0, -35));
      swatGroup.position.y = 0.22;
      this.scene.add(swatGroup);

      this.swatUnits.push({
        mesh: swatGroup,
        speed: 8.5
      });

      this.addHackFeedToast('⚠️ EQUIPO SWAT DESPLEGADO (NIVEL DE BÚSQUEDA 4+).');
    }

    updatePolice(delta) {
      if (this.policeUnits.length === 0) return;

      this.policeUnits.forEach(cop => {
        cop.sirenTimer += delta;
        const isRed = (Math.floor(cop.sirenTimer * 10) % 2) === 0;
        cop.redLight.intensity = isRed ? 3.5 : 0.2;
        cop.blueLight.intensity = isRed ? 0.2 : 3.5;

        const toPlayer = this.player.pos.clone().sub(cop.mesh.position);
        toPlayer.y = 0;
        const dist = toPlayer.length();

        if (dist > 3.5) {
          toPlayer.normalize();
          cop.mesh.position.addScaledVector(toPlayer, cop.speed * delta);
          cop.mesh.lookAt(this.player.pos.x, cop.mesh.position.y, this.player.pos.z);
        } else {
          this.player.hp = Math.max(0, this.player.hp - delta * 18);
          this.playCrashSound();
        }
      });
    }

    // =========================================================================
    // SMART TRAFFIC & PEDESTRIANS WITH REAL 3D GLB MODELS
    // =========================================================================
    buildNPCs() {
      const carTypes = ['gta-sports-car', 'taxi', 'suv', 'gta-bus', 'sedan', 'truck', 'ambulance'];
      const spawnTracks = [
        { roadX: -75, dirZ: 1, speed: 18 },
        { roadX: -75, dirZ: -1, speed: 16 },
        { roadX: 75,  dirZ: 1, speed: 20 },
        { roadX: 75,  dirZ: -1, speed: 19 },
        { roadZ: -75, dirX: 1, speed: 17 },
        { roadZ: 75,  dirX: -1, speed: 21 }
      ];

      for (let i = 0; i < 16; i++) {
        const track = spawnTracks[i % spawnTracks.length];
        const carType = carTypes[i % carTypes.length];
        const carGroup = new THREE.Group();

        const model = this.getModel(carType) || this.getModel('sedan');
        if (model) {
          const sc = carType === 'gta-bus' ? 2.5 : 3.5;
          model.scale.set(sc, sc, sc);
          carGroup.add(model);
        }

        let posX = track.roadX !== undefined ? track.roadX + (track.dirZ > 0 ? 4 : -4) : (Math.random() - 0.5) * 300;
        let posZ = track.roadZ !== undefined ? track.roadZ + (track.dirX > 0 ? -4 : 4) : (Math.random() - 0.5) * 300;
        carGroup.position.set(posX, 0.4, posZ);

        if (track.dirZ !== undefined) {
          carGroup.rotation.y = track.dirZ > 0 ? 0 : Math.PI;
        } else {
          carGroup.rotation.y = track.dirX > 0 ? -Math.PI / 2 : Math.PI / 2;
        }

        this.scene.add(carGroup);
        this.npcVehicles.push({
          mesh: carGroup,
          track,
          speed: track.speed,
          currentSpeed: track.speed,
          type: carType
        });
      }

      // Diverse Pedestrians (Gangsters, Street Civilians, Women)
      const pedTypes = ['char-gangster', 'char-street', 'char-female-street'];
      for (let p = 0; p < 20; p++) {
        const pedGroup = new THREE.Group();
        const pType = pedTypes[p % pedTypes.length];
        const pModel = this.getModel(pType) || this.getModel('character-male');

        if (pModel) {
          pModel.scale.set(4.5, 4.5, 4.5);
          pedGroup.add(pModel);
        }

        const sx = p % 2 === 0 ? -165 : 88;
        const sz = (p - 10) * 20;
        pedGroup.position.set(sx, 0.22, sz);

        this.scene.add(pedGroup);
        this.npcPedestrians.push({
          mesh: pedGroup,
          dirZ: p % 2 === 0 ? 1 : -1,
          speed: 2.2 + Math.random() * 1.5,
          isPanicking: false,
          animTime: Math.random() * 10
        });
      }
    }

    // =========================================================================
    // INPUT LISTENERS & CONTROLS
    // =========================================================================
    setupInputListeners() {
      window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        switch(e.code) {
          case 'KeyW': case 'ArrowUp': this.keys.forward = true; break;
          case 'KeyS': case 'ArrowDown': this.keys.backward = true; break;
          case 'KeyA': case 'ArrowLeft': this.keys.left = true; break;
          case 'KeyD': case 'ArrowRight': this.keys.right = true; break;
          case 'ShiftLeft': case 'ShiftRight': this.keys.shift = true; break;
          case 'Space':
            this.keys.space = true;
            if (this.player.mode === 'foot' && !this.player.isJumping) {
              this.player.isJumping = true;
              this.player.jumpVelY = 8.5;
            }
            break;
          case 'KeyF': case 'Enter':
            this.toggleVehicleOrFoot();
            break;
          case 'KeyE':
            this.executeCurrentWatchDogsHack();
            break;
          case 'KeyV':
            this.cycleVehicleType();
            break;
        }
      });

      window.addEventListener('keyup', (e) => {
        switch(e.code) {
          case 'KeyW': case 'ArrowUp': this.keys.forward = false; break;
          case 'KeyS': case 'ArrowDown': this.keys.backward = false; break;
          case 'KeyA': case 'ArrowLeft': this.keys.left = false; break;
          case 'KeyD': case 'ArrowRight': this.keys.right = false; break;
          case 'ShiftLeft': case 'ShiftRight': this.keys.shift = false; break;
          case 'Space': this.keys.space = false; break;
        }
      });
    }

    setupMobileTouchControls() {
      const gasBtn = document.getElementById('mbtn-gas');
      const brakeBtn = document.getElementById('mbtn-brake');

      if (gasBtn) {
        gasBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.touchState.gas = true; }, { passive: false });
        gasBtn.addEventListener('touchend', (e) => { e.preventDefault(); this.touchState.gas = false; }, { passive: false });
      }

      if (brakeBtn) {
        brakeBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.touchState.brake = true; }, { passive: false });
        brakeBtn.addEventListener('touchend', (e) => { e.preventDefault(); this.touchState.brake = false; }, { passive: false });
      }

      const base = document.getElementById('ow-joystick-base');
      const knob = document.getElementById('ow-joystick-knob');
      if (!base || !knob) return;

      const handleTouchMove = (e) => {
        const touch = e.touches[0];
        const rect = base.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        let dx = touch.clientX - centerX;
        let dy = touch.clientY - centerY;
        const dist = Math.hypot(dx, dy);
        const maxR = rect.width / 2;

        if (dist > maxR) {
          dx = (dx / dist) * maxR;
          dy = (dy / dist) * maxR;
        }

        knob.style.transform = `translate(${dx}px, ${dy}px)`;
        this.touchState.dx = dx / maxR;
        this.touchState.dy = dy / maxR;
        this.touchState.active = true;
      };

      const handleTouchEnd = () => {
        knob.style.transform = 'translate(0px, 0px)';
        this.touchState.dx = 0;
        this.touchState.dy = 0;
        this.touchState.active = false;
      };

      base.addEventListener('touchstart', (e) => { e.preventDefault(); handleTouchMove(e); }, { passive: false });
      base.addEventListener('touchmove', (e) => { e.preventDefault(); handleTouchMove(e); }, { passive: false });
      base.addEventListener('touchend', (e) => { e.preventDefault(); handleTouchEnd(); }, { passive: false });
      base.addEventListener('touchcancel', (e) => { e.preventDefault(); handleTouchEnd(); }, { passive: false });
    }

    cycleVehicleType() {
      const list = ['gta-sports-car', 'gta-police-car', 'helicopter', 'jet-fighter', 'motorbike', 'gta-bus', 'sedan', 'suv', 'foot', 'swat'];
      const curIdx = list.indexOf(this.player.vehicleType);
      const nextType = list[(curIdx + 1) % list.length];
      this.applyVehicleMesh(nextType);
    }

    // =========================================================================
    // MULTIPLAYER HEROKU SOCKET & OAUTH
    // =========================================================================
    initHerokuSocket() {
      if (typeof io === 'undefined') return;
      try {
        this.socket = io(HEROKU_BACKEND_URL, {
          transports: ['websocket', 'polling'],
          reconnectionAttempts: 4,
          timeout: 4000
        });

        this.socket.on('connect', () => {
          this.socket.emit('player_join', {
            id: this.localId,
            username: this.player.username,
            pos: this.player.pos,
            yaw: this.player.yaw,
            vehicleType: this.player.vehicleType
          });
        });

        this.socket.on('state_update', (peers) => {
          this.syncRemotePeers(peers);
        });
      } catch (err) {}
    }

    syncRemotePeers(peers) {
      if (!Array.isArray(peers)) return;
      peers.forEach(p => {
        if (p.id === this.localId) return;
        if (!this.remotePlayers.has(p.id)) {
          this.createRemotePeerMesh(p);
        } else {
          const peer = this.remotePlayers.get(p.id);
          if (peer.mesh) {
            peer.mesh.position.lerp(new THREE.Vector3(p.pos.x, p.pos.y, p.pos.z), 0.25);
            peer.mesh.rotation.y = p.yaw || 0;
          }
        }
      });
    }

    createRemotePeerMesh(p) {
      const peerGroup = new THREE.Group();
      const car = this.getModel(p.vehicleType || 'gta-sports-car') || this.getModel('sedan');
      if (car) {
        car.scale.set(3.5, 3.5, 3.5);
        peerGroup.add(car);
      }

      this.scene.add(peerGroup);
      this.remotePlayers.set(p.id, { ...p, mesh: peerGroup });
    }

    checkUrlForGitHubOAuth() {
      const urlParams = new URLSearchParams(window.location.search);
      const ghUser = urlParams.get('gh_user') || urlParams.get('user');
      if (ghUser) {
        this.player.username = ghUser.replace(/[^a-zA-Z0-9_\-]/g, '').substring(0, 24);
        this.player.avatar = `https://github.com/${this.player.username}.png`;
        this.createOverheadNameplate();
      }
    }

    // =========================================================================
    // PHYSICS, FLIGHT & COLLISIONS
    // =========================================================================
    updatePhysics(delta) {
      const p = this.player;

      if (p.mode === 'foot') {
        let moveX = 0;
        let moveZ = 0;
        if (this.keys.forward || this.touchState.gas || (this.touchState.active && this.touchState.dy < -0.2)) moveZ += 1;
        if (this.keys.backward || this.touchState.brake || (this.touchState.active && this.touchState.dy > 0.2)) moveZ -= 1;
        if (this.keys.left || (this.touchState.active && this.touchState.dx < -0.2)) p.yaw += 3.2 * delta;
        if (this.keys.right || (this.touchState.active && this.touchState.dx > 0.2)) p.yaw -= 3.2 * delta;

        p.mesh.rotation.y = p.yaw;
        const targetSpd = this.keys.shift ? p.footRunSpeed : p.footWalkSpeed;
        const isMoving = Math.abs(moveZ) > 0;
        p.footSpeed = isMoving ? targetSpd : 0;

        if (isMoving) {
          const moveDir = new THREE.Vector3(0, 0, moveZ).applyAxisAngle(new THREE.Vector3(0, 1, 0), p.yaw);
          const nextPos = p.pos.clone().addScaledVector(moveDir, p.footSpeed * delta);
          if (!this.checkBuildingCollisions(nextPos, 1.2)) {
            p.pos.copy(nextPos);
          }
          p.footAnimTime += delta * (this.keys.shift ? 16 : 8);
        }

        if (p.isJumping) {
          p.pos.y += p.jumpVelY * delta;
          p.jumpVelY -= 24 * delta;
          if (p.pos.y <= 0.22) {
            p.pos.y = 0.22;
            p.isJumping = false;
            p.jumpVelY = 0;
          }
        } else {
          p.pos.y = 0.22;
        }

        p.mesh.position.copy(p.pos);
        p.speed = p.footSpeed;
      } else if (p.mode === 'aircraft') {
        // --- HELICOPTER & JET FIGHTER FLIGHT PHYSICS ---
        if (this.keys.left || (this.touchState.active && this.touchState.dx < -0.2)) p.yaw += 2.0 * delta;
        if (this.keys.right || (this.touchState.active && this.touchState.dx > 0.2)) p.yaw -= 2.0 * delta;
        p.mesh.rotation.y = p.yaw;

        const isJet = p.vehicleType === 'jet-fighter';
        const maxFlightSpeed = isJet ? 85 : 36;

        if (this.keys.forward || this.touchState.gas) {
          p.speed = Math.min(maxFlightSpeed, p.speed + (isJet ? 45 : 22) * delta);
        } else if (this.keys.backward || this.touchState.brake) {
          p.speed = Math.max(isJet ? 15 : 0, p.speed - 25 * delta);
        } else {
          p.speed *= Math.pow(0.92, delta * 30);
        }

        // Lift & Altitude Controls
        if (this.keys.space || this.keys.shift) {
          p.targetAltitude = Math.min(95, p.targetAltitude + (isJet ? 28 : 16) * delta);
        } else if (this.keys.backward && p.targetAltitude > 2.0) {
          p.targetAltitude = Math.max(0.6, p.targetAltitude - 12 * delta);
        }

        p.pos.y += (p.targetAltitude - p.pos.y) * delta * 3.5;
        if (p.pos.y < 0.45) p.pos.y = 0.45;

        // Forward flight vector
        const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), p.yaw);
        p.pos.addScaledVector(fwd, p.speed * delta);
        p.mesh.position.copy(p.pos);

        // Spin Helicopter Rotors
        if (p.rotorMesh) {
          p.rotorMesh.rotation.y += delta * 45;
        }
      } else {
        // --- DRIVING VEHICLE PHYSICS ---
        if (this.keys.left || (this.touchState.active && this.touchState.dx < -0.2)) {
          p.yaw += p.turnSpeed * delta * (p.speed >= 0 ? 1 : -1);
        }
        if (this.keys.right || (this.touchState.active && this.touchState.dx > 0.2)) {
          p.yaw -= p.turnSpeed * delta * (p.speed >= 0 ? 1 : -1);
        }
        p.mesh.rotation.y = p.yaw;

        let targetSpeed = 0;
        if (this.keys.forward || this.touchState.gas || (this.touchState.active && this.touchState.dy < -0.2)) {
          let maxSpd = p.maxSpeed;
          if (this.keys.shift && p.nitro > 0) {
            maxSpd *= 1.45;
            p.nitro = Math.max(0, p.nitro - delta * 30);
          }
          targetSpeed = maxSpd;
          p.fuel = Math.max(0, p.fuel - delta * 0.12);
        } else if (this.keys.backward || this.touchState.brake || (this.touchState.active && this.touchState.dy > 0.2)) {
          targetSpeed = -p.reverseMaxSpeed;
        }

        if (targetSpeed > p.speed) {
          p.speed = Math.min(targetSpeed, p.speed + p.accel * delta);
        } else if (targetSpeed < p.speed) {
          p.speed = Math.max(targetSpeed, p.speed - p.brake * delta);
        }

        if (!this.keys.forward && !this.keys.backward && !this.touchState.gas && !this.touchState.brake && !this.touchState.active) {
          p.speed *= Math.pow(0.85, delta * 30);
          if (Math.abs(p.speed) < 0.2) p.speed = 0;
        }

        const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), p.yaw);
        const nextPos = p.pos.clone().addScaledVector(fwd, p.speed * delta);

        if (this.checkBuildingCollisions(nextPos, 2.2)) {
          p.speed = -p.speed * 0.35;
          p.hp = Math.max(0, p.hp - Math.abs(p.speed) * 0.4);
          this.playCrashSound();
        } else {
          p.pos.copy(nextPos);
        }
        p.mesh.position.copy(p.pos);

        p.wheels.forEach(w => {
          w.rotation.x += p.speed * delta * 2.5;
        });
      }

      if (p.mode === 'car' && p.battery < 100) {
        p.battery = Math.min(100, p.battery + delta * 2.2);
      }

      this.updateProximityPrompts();
    }

    checkBuildingCollisions(pos, radius) {
      if (pos.y > 45) return false; // Fly over buildings in helicopter/jet
      for (let i = 0; i < this.buildings.length; i++) {
        const b = this.buildings[i];
        if (pos.x + radius >= b.minX && pos.x - radius <= b.maxX &&
            pos.z + radius >= b.minZ && pos.z - radius <= b.maxZ) {
          return true;
        }
      }
      return false;
    }

    updateCamera() {
      const p = this.player;
      let targetCamPos, lookTarget;

      if (p.mode === 'foot') {
        const behind = new THREE.Vector3(0, 2.4, -4.8).applyAxisAngle(new THREE.Vector3(0, 1, 0), p.yaw);
        targetCamPos = p.pos.clone().add(behind);
        lookTarget = p.pos.clone().add(new THREE.Vector3(0, 1.8, 2.5).applyAxisAngle(new THREE.Vector3(0, 1, 0), p.yaw));
      } else if (p.mode === 'aircraft') {
        const behind = new THREE.Vector3(0, 6.5, -16.0).applyAxisAngle(new THREE.Vector3(0, 1, 0), p.yaw);
        targetCamPos = p.pos.clone().add(behind);
        lookTarget = p.pos.clone().add(new THREE.Vector3(0, 1.0, 8.0).applyAxisAngle(new THREE.Vector3(0, 1, 0), p.yaw));
      } else {
        const camDist = 9.5 + Math.abs(p.speed) * 0.12;
        const camHeight = 3.6 + Math.abs(p.speed) * 0.05;
        const behind = new THREE.Vector3(0, camHeight, -camDist).applyAxisAngle(new THREE.Vector3(0, 1, 0), p.yaw);
        targetCamPos = p.pos.clone().add(behind);
        lookTarget = p.pos.clone().add(new THREE.Vector3(0, 1.2, 5.0).applyAxisAngle(new THREE.Vector3(0, 1, 0), p.yaw));
      }

      this.camera.position.lerp(targetCamPos, 0.14);
      this.camera.lookAt(lookTarget);
    }

    updateNPCs(delta) {
      this.npcVehicles.forEach(npc => {
        if (npc.track.roadX !== undefined) {
          npc.mesh.position.z += npc.speed * npc.track.dirZ * delta;
          if (npc.mesh.position.z > 210) npc.mesh.position.z = -210;
          if (npc.mesh.position.z < -210) npc.mesh.position.z = 210;
        } else {
          npc.mesh.position.x += npc.speed * npc.track.dirX * delta;
          if (npc.mesh.position.x > 210) npc.mesh.position.x = -210;
          if (npc.mesh.position.x < -210) npc.mesh.position.x = 210;
        }
      });

      this.npcPedestrians.forEach(ped => {
        ped.mesh.position.z += ped.speed * ped.dirZ * delta;
        if (ped.mesh.position.z > 200) ped.dirZ = -1;
        if (ped.mesh.position.z < -200) ped.dirZ = 1;
        ped.mesh.rotation.y = ped.dirZ > 0 ? 0 : Math.PI;
      });
    }

    updateProximityPrompts() {
      const p = this.player;

      const fuelBtn = document.getElementById('hud-refuel-btn');
      if (fuelBtn) {
        let nearFuel = false;
        for (let gs of this.gasStations) {
          if (p.pos.distanceTo(new THREE.Vector3(gs.x, p.pos.y, gs.z)) <= gs.radius) {
            nearFuel = true;
            break;
          }
        }
        fuelBtn.style.display = nearFuel ? 'flex' : 'none';
      }

      const shopBtn = document.getElementById('hud-shop-btn');
      if (shopBtn) {
        let nearShop = false;
        for (let s of this.cyberShops) {
          if (p.pos.distanceTo(new THREE.Vector3(s.x, p.pos.y, s.z)) <= s.radius) {
            nearShop = true;
            break;
          }
        }
        shopBtn.style.display = nearShop ? 'flex' : 'none';
      }

      const carPrompt = document.getElementById('hud-vehicle-btn');
      if (carPrompt) {
        if (p.mode === 'foot') {
          const dist = p.pos.distanceTo(p.parkedCarPos);
          carPrompt.style.display = dist <= 6.5 ? 'flex' : 'none';
          carPrompt.innerHTML = '🚗 [F] SUBIR AL VEHÍCULO';
        } else {
          carPrompt.style.display = 'flex';
          carPrompt.innerHTML = '🚶 [F] BAJARSE DEL VEHÍCULO';
        }
      }
    }

    executeCurrentWatchDogsHack() {
      if (this.player.battery < 18) {
        this.addHackFeedToast('⚠️ Batería del cyberdeck insuficiente (mín. 18%).');
        return;
      }
      this.player.battery -= 18;
      this.player.credits += 45;
      this.hackAllTrafficLights('ALL_GREEN');
      this.addHackFeedToast('⚡ Hack ejecutado: Semáforos en Verde. +45₮ ganados.');
    }

    hackAllTrafficLights(mode) {
      this.trafficLights.forEach(tl => {
        tl.state = 'GREEN';
        tl.greenLens.material.color.setHex(0x00ff66);
        tl.redLens.material.color.setHex(0x330000);
        tl.yellowLens.material.color.setHex(0x332200);
      });
    }

    triggerCityBlackout(duration) {
      this.blackoutUntil = Date.now() + (duration || 6000);
      this.addHackFeedToast('⚡ BLACKOUT TOTAL: Subestaciones hackeadas.');
    }

    updateHUD() {
      const p = this.player;

      const spdElem = document.getElementById('speed-value');
      if (spdElem) spdElem.innerText = Math.round(Math.abs(p.speed) * 3.6);

      const gearElem = document.getElementById('gear-value');
      if (gearElem) {
        if (p.mode === 'aircraft') {
          gearElem.innerText = `ALT ${Math.round(p.pos.y)}M`;
        } else {
          if (p.speed < -0.5) gearElem.innerText = 'REV';
          else if (Math.abs(p.speed) < 0.5) gearElem.innerText = 'PARK';
          else if (Math.abs(p.speed) < 15) gearElem.innerText = 'GEAR 1';
          else if (Math.abs(p.speed) < 28) gearElem.innerText = 'GEAR 2';
          else if (Math.abs(p.speed) < 40) gearElem.innerText = 'GEAR 3';
          else gearElem.innerText = 'GEAR 4';
        }
      }

      const fuelBar = document.getElementById('hud-fuel-bar');
      const fuelVal = document.getElementById('hud-fuel-val');
      if (fuelBar) fuelBar.style.width = `${Math.round(p.fuel)}%`;
      if (fuelVal) fuelVal.innerText = `${Math.round(p.fuel)}%`;

      const batBar = document.getElementById('hud-battery-bar');
      const batVal = document.getElementById('hud-battery-val');
      if (batBar) batBar.style.width = `${Math.round(p.battery)}%`;
      if (batVal) batVal.innerText = `${Math.round(p.battery)}%`;

      const hpBar = document.getElementById('hud-hp-bar');
      const hpVal = document.getElementById('hud-hp-val');
      if (hpBar) hpBar.style.width = `${Math.round(p.hp)}%`;
      if (hpVal) hpVal.innerText = `${Math.round(p.hp)}%`;

      const credElem = document.getElementById('hud-credits-val');
      if (credElem) credElem.innerText = `${p.credits}₮`;

      const starElem = document.getElementById('hud-wanted-stars');
      if (starElem) {
        let stars = '';
        for (let s = 1; s <= 5; s++) {
          stars += s <= p.wantedLevel ? '★' : '☆';
        }
        starElem.innerText = stars;
        starElem.style.color = p.wantedLevel > 0 ? '#ff0055' : '#64748b';
      }
    }

    updateVehicleChipsUI(activeType) {
      document.querySelectorAll('.g3d-v-chip').forEach(c => {
        if (c.getAttribute('data-type') === activeType) c.classList.add('active');
        else c.classList.remove('active');
      });
    }

    addHackFeedToast(msg) {
      const feed = document.getElementById('ow-hack-feed');
      if (!feed) return;
      const item = document.createElement('div');
      item.className = 'hack-toast-item';
      item.innerText = msg;
      feed.appendChild(item);
      setTimeout(() => { item.remove(); }, 3500);
    }

    initRadar() {
      this.radarCanvas = document.getElementById('ow-radar-canvas');
      if (this.radarCanvas) {
        this.radarCanvas.width = 140;
        this.radarCanvas.height = 140;
        this.radarCtx = this.radarCanvas.getContext('2d');
      }
    }

    drawRadar() {
      if (!this.radarCtx) return;
      const ctx = this.radarCtx;
      const w = 140;
      const h = 140;
      const cx = 70;
      const cy = 70;
      const scale = 0.32;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#060d17';
      ctx.fillRect(0, 0, w, h);

      // Roads
      ctx.fillStyle = '#1e293b';
      this.roads.forEach(r => {
        if (r.dir === 'NS') {
          const rx = cx + (r.x - this.player.pos.x) * scale;
          ctx.fillRect(rx - 3, 0, 6, h);
        } else {
          const ry = cy + (r.z - this.player.pos.z) * scale;
          ctx.fillRect(0, ry - 3, w, 6);
        }
      });

      // Green Areas
      ctx.fillStyle = '#15803d';
      this.greenAreas.forEach(g => {
        const gx = cx + (g.x - this.player.pos.x) * scale;
        const gy = cy + (g.z - this.player.pos.z) * scale;
        ctx.beginPath();
        ctx.arc(gx, gy, (g.radius || 20) * scale, 0, Math.PI * 2);
        ctx.fill();
      });

      // Player Arrow
      ctx.fillStyle = '#00f0ff';
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-this.player.yaw);
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(5, 5);
      ctx.lineTo(-5, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
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
      this.updateProjectiles(delta);
      this.updatePolice(delta);
      this.updateTrafficLights(delta);
      this.updateTVBillboards(delta);
      this.updateCamera();
      this.updateHUD();
      this.drawRadar();

      this.clouds.forEach(c => {
        c.position.x += c.userData.speed * delta;
        if (c.position.x > 320) c.position.x = -320;
      });

      this.renderer.render(this.scene, this.camera);
    }
  }

  window.CyberCity3DEngine = CyberCity3DEngine;
  window.cyberCityEngine = new CyberCity3DEngine();
})();
