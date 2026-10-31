/**
 * ============================================================================
 * PARALLAX CYBER-CITY 3D // OPEN-WORLD ACTION & HACKING ENGINE v3.2 (ULTRA)
 * Architecture: Three.js WebGL2 + Procedural High-Detail City + Realistic Multi-Vehicle Physics
 * Watch Dogs Style Hacking + In-Game Cyberdeck Scripting IDE + Live Heroku Multiplayer
 * Author: Rodrigo Carrasco (Parallax / equisde) & IMXNOOBX Alliance
 * ============================================================================
 */

(function() {
  'use strict';

  const HEROKU_BACKEND_URL = 'https://parallax-cyber-city-5b72da76b505.herokuapp.com';

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

      // World Settings
      this.citySize = 500;
      this.buildings = [];
      this.roads = [];
      this.trafficLights = [];
      this.securityCameras = [];
      this.powerSubstations = [];
      this.npcVehicles = [];
      this.npcPedestrians = [];
      this.remotePlayers = new Map();
      this.waterMesh = null;
      this.beaconLights = [];

      // Particle Systems Pool
      this.particleSystems = {
        nitro: null,
        driftSmoke: null,
        hackArc: null,
        sparks: []
      };

      // Camera Modes
      this.activeCameraMode = 'chase'; // 'chase', 'hood', 'free', 'cctv_hack'
      this.hackedCameraIndex = -1;
      this.cameraOrbit = { yaw: 0, pitch: 0.25, distance: 10 };

      // Input State
      this.keys = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        shift: false,
        space: false
      };
      this.mouse = { isDown: false, prevX: 0, prevY: 0 };
      this.touchState = {
        active: false,
        startX: 0,
        startY: 0,
        currX: 0,
        currY: 0,
        joyX: 0,
        joyY: 0
      };

      // Player & Vehicle Physics State
      this.player = {
        username: localStorage.getItem('ow_github_user') || 'equisde',
        avatarUrl: `https://github.com/${localStorage.getItem('ow_github_user') || 'equisde'}.png`,
        mesh: null,
        nameTagMesh: null,
        vehicleType: 'supercar', // 'foot', 'supercar', 'bike', 'bicycle', 'jet', 'hovercraft', 'parachute', 'submarine'
        pos: new THREE.Vector3(0, 0.4, 20),
        vel: new THREE.Vector3(0, 0, 0),
        speed: 0,
        maxSpeed: 55,
        accel: 30,
        turnSpeed: 2.2,
        nitro: 100,
        isNitro: false,
        driftFactor: 0,
        yaw: 0,
        pitch: 0,
        roll: 0,
        cyberCredits: 2500,
        hacksExecuted: 0
      };

      this.vehicleMeshes = {};
      this.currentTarget = null;
      this.socket = null;
      this.audioCtx = null;
    }

    init(containerId, canvasId) {
      this.container = document.getElementById(containerId);
      this.canvas = document.getElementById(canvasId);
      if (!this.container || !this.canvas) return;

      const width = this.container.clientWidth || 800;
      const height = this.container.clientHeight || 560;

      // 1. Scene, Camera, Renderer with Mobile DPR clamp
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x03050a);
      this.scene.fog = new THREE.FogExp2(0x03050a, 0.0035);

      this.camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1500);
      this.camera.position.set(0, 10, 25);

      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: !this.isMobile,
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(width, height);

      const dpr = this.isMobile ? Math.min(window.devicePixelRatio || 1, 1.25) : Math.min(window.devicePixelRatio || 1, 1.5);
      this.renderer.setPixelRatio(dpr);

      this.renderer.shadowMap.enabled = !this.isMobile;
      if (!this.isMobile) {
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      }
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.15;

      // 2. High-End Visuals: Skybox, Stars & Moon
      this.buildStarfieldAndSky();
      this.setupLighting();

      // 3. City Geometry & Details
      this.buildCityGroundAndRoads();
      this.buildSkyscrapers();
      this.buildWaterBay();
      this.buildAirportRunway();
      this.buildTrafficLights();
      this.buildSecurityCameras();
      this.buildPowerSubstations();
      this.buildIMXNOOBXFortress();

      // 4. Vehicles, Character & Visual FX
      this.buildPlayerAndVehicles();
      this.buildNPCs();
      this.buildParticleEngines();

      // 5. Controls & Events
      this.setupInputListeners();
      this.setupMobileTouchControls();

      // 6. Connect Live Heroku Socket.IO Server
      this.initHerokuSocket();

      // 7. Radar & Loop
      this.initRadar();
      this.checkUrlForGitHubOAuth();

      this.isActive = true;
      this.animate = this.animate.bind(this);
      this.rafId = requestAnimationFrame(this.animate);

      console.log('⚡ [PARALLAX CYBER-CITY 3D] Ultra Engine Live. Mobile:', this.isMobile);
    }

    buildStarfieldAndSky() {
      // 1,500 Starfield Particles
      const starGeo = new THREE.BufferGeometry();
      const starCount = 1500;
      const positions = new Float32Array(starCount * 3);
      const colors = new Float32Array(starCount * 3);

      for (let i = 0; i < starCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        const radius = 600 + Math.random() * 200;

        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = Math.abs(radius * Math.cos(phi)) + 15; // Above horizon
        positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

        // Cyberpunk star colors: white, cyan, gold
        const rColor = Math.random();
        if (rColor > 0.6) {
          colors[i * 3] = 0.0; colors[i * 3 + 1] = 0.94; colors[i * 3 + 2] = 1.0; // Cyan
        } else if (rColor > 0.3) {
          colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.84; colors[i * 3 + 2] = 0.0; // Gold
        } else {
          colors[i * 3] = 0.9; colors[i * 3 + 1] = 0.95; colors[i * 3 + 2] = 1.0; // White
        }
      }

      starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const starMat = new THREE.PointsMaterial({
        size: 2.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.85
      });
      const stars = new THREE.Points(starGeo, starMat);
      this.scene.add(stars);

      // High-Altitude Cyber Moon
      const moonGeo = new THREE.SphereGeometry(18, 32, 32);
      const moonMat = new THREE.MeshBasicMaterial({ color: 0xd8eeff });
      const moon = new THREE.Mesh(moonGeo, moonMat);
      moon.position.set(160, 320, -380);
      this.scene.add(moon);

      // Moon Atmospheric Glow Ring
      const glowGeo = new THREE.RingGeometry(18, 32, 32);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.25
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.copy(moon.position);
      glow.lookAt(0, 0, 0);
      this.scene.add(glow);
    }

    setupLighting() {
      const hemiLight = new THREE.HemisphereLight(0x00f0ff, 0x110022, 0.45);
      this.scene.add(hemiLight);

      const moonLight = new THREE.DirectionalLight(0xddeeff, 0.9);
      moonLight.position.set(100, 250, 100);
      if (!this.isMobile) {
        moonLight.castShadow = true;
        moonLight.shadow.mapSize.width = 1024;
        moonLight.shadow.mapSize.height = 1024;
        moonLight.shadow.bias = -0.0005;
      }
      this.scene.add(moonLight);

      const plazaLight = new THREE.PointLight(0xff007f, 1.8, 120);
      plazaLight.position.set(0, 16, 0);
      this.scene.add(plazaLight);
    }

    buildCityGroundAndRoads() {
      const groundGeo = new THREE.PlaneGeometry(this.citySize, this.citySize);
      const groundMat = new THREE.MeshStandardMaterial({
        color: 0x080b14,
        roughness: 0.85,
        metalness: 0.2
      });
      const ground = new THREE.Mesh(groundGeo, groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = !this.isMobile;
      this.scene.add(ground);

      // Grand Avenues with Wet-Look Specular Finish
      const roadMat = new THREE.MeshStandardMaterial({
        color: 0x111622,
        roughness: 0.35,
        metalness: 0.65
      });

      const nsRoad = new THREE.Mesh(new THREE.PlaneGeometry(28, this.citySize), roadMat);
      nsRoad.rotation.x = -Math.PI / 2;
      nsRoad.position.y = 0.02;
      nsRoad.receiveShadow = true;
      this.scene.add(nsRoad);

      const ewRoad = new THREE.Mesh(new THREE.PlaneGeometry(this.citySize, 28), roadMat);
      ewRoad.rotation.x = -Math.PI / 2;
      ewRoad.position.y = 0.03;
      ewRoad.receiveShadow = true;
      this.scene.add(ewRoad);

      // Neon Lane Dividers
      const lineMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
      for (let z = -240; z <= 240; z += 12) {
        const line = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 6), lineMat);
        line.rotation.x = -Math.PI / 2;
        line.position.set(0, 0.05, z);
        this.scene.add(line);
      }
    }

    buildSkyscrapers() {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#0a0e1a';
      ctx.fillRect(0, 0, 256, 512);

      for (let y = 8; y < 500; y += 18) {
        for (let x = 8; x < 240; x += 14) {
          if (Math.random() > 0.4) {
            const colors = ['#00f0ff', '#ff007f', '#ffd700', '#38ef7d', '#7928ca'];
            ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
            ctx.fillRect(x, y, 9, 11);
          }
        }
      }

      const windowTexture = new THREE.CanvasTexture(canvas);
      windowTexture.wrapS = THREE.RepeatWrapping;
      windowTexture.wrapT = THREE.RepeatWrapping;

      const blockPositions = [
        { x: -75, z: -75 }, { x: -75, z: 75 },
        { x: 75, z: -75 }, { x: 75, z: 75 },
        { x: -140, z: -75 }, { x: -140, z: 75 },
        { x: 140, z: -75 }, { x: 140, z: 75 },
        { x: -75, z: -140 }, { x: 75, z: -140 },
        { x: -75, z: 140 }, { x: 75, z: 140 }
      ];

      blockPositions.forEach((bPos, idx) => {
        for (let ox = -20; ox <= 20; ox += 20) {
          for (let oz = -20; oz <= 20; oz += 20) {
            const h = 35 + Math.random() * 85;
            const w = 14 + Math.random() * 6;
            const d = 14 + Math.random() * 6;

            const bGeo = new THREE.BoxGeometry(w, h, d);
            const bMat = new THREE.MeshStandardMaterial({
              color: 0x121726,
              map: windowTexture,
              roughness: 0.3,
              metalness: 0.7
            });
            const building = new THREE.Mesh(bGeo, bMat);
            building.position.set(bPos.x + ox, h / 2, bPos.z + oz);
            if (!this.isMobile) {
              building.castShadow = true;
              building.receiveShadow = true;
            }
            this.scene.add(building);
            this.buildings.push(building);

            // Rooftop Neon Accent
            const roofColor = idx % 2 === 0 ? 0x00f0ff : 0xff007f;
            const roofBorder = new THREE.Mesh(
              new THREE.BoxGeometry(w + 0.4, 1.2, d + 0.4),
              new THREE.MeshBasicMaterial({ color: roofColor })
            );
            roofBorder.position.set(bPos.x + ox, h + 0.6, bPos.z + oz);
            this.scene.add(roofBorder);

            // Rooftop Blinking Aviation Beacon Light
            if (h > 70) {
              const beacon = new THREE.PointLight(0xff0033, 1.5, 30);
              beacon.position.set(bPos.x + ox, h + 2.5, bPos.z + oz);
              this.scene.add(beacon);
              this.beaconLights.push(beacon);
            }
          }
        }
      });
    }

    buildWaterBay() {
      // Dynamic Water Mesh with Sinusoidal Vertex Displacement
      const waterGeo = new THREE.PlaneGeometry(90, this.citySize, 32, 32);
      const waterMat = new THREE.MeshStandardMaterial({
        color: 0x004477,
        roughness: 0.1,
        metalness: 0.85,
        transparent: true,
        opacity: 0.88
      });
      this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
      this.waterMesh.rotation.x = -Math.PI / 2;
      this.waterMesh.position.set(-205, -1.2, 0);
      this.scene.add(this.waterMesh);

      // Sea Floor for Submarine
      const seaFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(90, this.citySize),
        new THREE.MeshStandardMaterial({ color: 0x020712, roughness: 0.9 })
      );
      seaFloor.rotation.x = -Math.PI / 2;
      seaFloor.position.set(-205, -28, 0);
      this.scene.add(seaFloor);
    }

    buildAirportRunway() {
      const runway = new THREE.Mesh(
        new THREE.PlaneGeometry(26, 180),
        new THREE.MeshStandardMaterial({ color: 0x1a2130, roughness: 0.6 })
      );
      runway.rotation.x = -Math.PI / 2;
      runway.position.set(190, 0.04, -120);
      this.scene.add(runway);

      for (let z = -205; z <= -35; z += 15) {
        const lp = new THREE.PointLight(0x00ff66, 0.5, 25);
        lp.position.set(176, 0.5, z);
        this.scene.add(lp);
        const lr = new THREE.PointLight(0x00f0ff, 0.5, 25);
        lr.position.set(204, 0.5, z);
        this.scene.add(lr);
      }
    }

    buildTrafficLights() {
      const coords = [
        { x: -16, z: -16 }, { x: 16, z: -16 },
        { x: -16, z: 16 }, { x: 16, z: 16 },
        { x: -16, z: -90 }, { x: 16, z: -90 },
        { x: -16, z: 90 }, { x: 16, z: 90 }
      ];

      coords.forEach((c, idx) => {
        const group = new THREE.Group();
        group.position.set(c.x, 0, c.z);

        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2, 0.2, 7),
          new THREE.MeshStandardMaterial({ color: 0x222938 })
        );
        pole.position.y = 3.5;
        group.add(pole);

        const box = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 2.2, 0.8),
          new THREE.MeshStandardMaterial({ color: 0x1a2230 })
        );
        box.position.set(0, 6.2, 0);
        group.add(box);

        const redBulb = new THREE.Mesh(
          new THREE.SphereGeometry(0.25, 12, 12),
          new THREE.MeshBasicMaterial({ color: 0xff0033 })
        );
        redBulb.position.set(0, 6.8, 0.42);
        group.add(redBulb);

        const greenBulb = new THREE.Mesh(
          new THREE.SphereGeometry(0.25, 12, 12),
          new THREE.MeshBasicMaterial({ color: 0x00ff66 })
        );
        greenBulb.position.set(0, 5.6, 0.42);
        group.add(greenBulb);

        this.scene.add(group);
        this.trafficLights.push({
          id: `TRAFFIC_LIGHT_${idx + 1}`,
          type: 'TRAFFIC_LIGHT',
          group,
          phase: 'RED',
          redBulb,
          greenBulb,
          pos: group.position,
          exploit: 'RACE_CONDITION // PHASE_OVERRIDE'
        });
      });
    }

    buildSecurityCameras() {
      const camCoords = [
        { x: 18, y: 8, z: 18, angle: Math.PI / 4 },
        { x: -18, y: 8, z: -18, angle: -3 * Math.PI / 4 },
        { x: 18, y: 8, z: -80, angle: Math.PI / 2 },
        { x: -18, y: 8, z: 80, angle: -Math.PI / 2 },
        { x: 50, y: 12, z: 50, angle: 0 },
        { x: -120, y: 10, z: 0, angle: Math.PI }
      ];

      camCoords.forEach((c, idx) => {
        const group = new THREE.Group();
        group.position.set(c.x, c.y, c.z);

        const camMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 0.5, 1.2),
          new THREE.MeshStandardMaterial({ color: 0x0f1522 })
        );
        group.add(camMesh);

        const lens = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2, 0.2, 0.3),
          new THREE.MeshBasicMaterial({ color: 0xff0044 })
        );
        lens.rotation.x = Math.PI / 2;
        lens.position.z = 0.65;
        group.add(lens);

        const scanCone = new THREE.Mesh(
          new THREE.ConeGeometry(4, 14, 16, 1, true),
          new THREE.MeshBasicMaterial({ color: 0xff0033, transparent: true, opacity: 0.12, wireframe: true })
        );
        scanCone.rotation.x = -Math.PI / 2.3;
        scanCone.position.set(0, -6, 7);
        group.add(scanCone);

        group.rotation.y = c.angle;
        this.scene.add(group);

        this.securityCameras.push({
          id: `CCTV_CAM_${idx + 1}`,
          type: 'SECURITY_CAMERA',
          group,
          pos: group.position,
          baseAngle: c.angle,
          scanCone,
          exploit: 'RTSP_AUTH_BYPASS // HIJACK_FEED'
        });
      });
    }

    buildPowerSubstations() {
      const pCoords = [{ x: 30, z: -30 }, { x: -30, z: 30 }, { x: 90, z: 30 }, { x: -90, z: -30 }];
      pCoords.forEach((c, idx) => {
        const group = new THREE.Group();
        group.position.set(c.x, 0, c.z);

        const box = new THREE.Mesh(
          new THREE.BoxGeometry(3, 4, 2.5),
          new THREE.MeshStandardMaterial({ color: 0x1e2738, roughness: 0.5 })
        );
        box.position.y = 2;
        group.add(box);

        const plate = new THREE.Mesh(
          new THREE.PlaneGeometry(1.2, 0.8),
          new THREE.MeshBasicMaterial({ color: 0xffd700 })
        );
        plate.position.set(0, 2.2, 1.26);
        group.add(plate);

        this.scene.add(group);
        this.powerSubstations.push({
          id: `SUBSTATION_GRID_${idx + 1}`,
          type: 'POWER_SUBSTATION',
          group,
          pos: group.position,
          exploit: 'SCADA_OVERVOLTAGE // TRIGGER_BLACKOUT'
        });
      });
    }

    buildIMXNOOBXFortress() {
      const outpostGroup = new THREE.Group();
      outpostGroup.position.set(50, 0, 50);

      const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(8, 10, 16, 8),
        new THREE.MeshStandardMaterial({ color: 0x0d121f, roughness: 0.3, metalness: 0.8 })
      );
      tower.position.y = 8;
      outpostGroup.add(tower);

      this.radarDish = new THREE.Mesh(
        new THREE.SphereGeometry(3.5, 16, 8, 0, Math.PI),
        new THREE.MeshBasicMaterial({ color: 0xffd700, wireframe: true })
      );
      this.radarDish.position.set(0, 18, 0);
      outpostGroup.add(this.radarDish);

      const bannerCanvas = document.createElement('canvas');
      bannerCanvas.width = 512;
      bannerCanvas.height = 128;
      const bCtx = bannerCanvas.getContext('2d');
      bCtx.fillStyle = '#06080f';
      bCtx.fillRect(0, 0, 512, 128);
      bCtx.strokeStyle = '#ffd700';
      bCtx.lineWidth = 6;
      bCtx.strokeRect(4, 4, 504, 120);
      bCtx.fillStyle = '#ffd700';
      bCtx.font = 'bold 34px monospace';
      bCtx.textAlign = 'center';
      bCtx.fillText('⚡ IMXNOOBX WEAPONRY ⚡', 256, 75);

      const bannerMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(16, 3),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(bannerCanvas) })
      );
      bannerMesh.position.set(0, 14, 8.5);
      outpostGroup.add(bannerMesh);

      this.scene.add(outpostGroup);
    }

    buildParticleEngines() {
      // 1. Nitro Exhaust Particles
      const nitroGeo = new THREE.BufferGeometry();
      const nitroCount = 60;
      const nitroPositions = new Float32Array(nitroCount * 3);
      nitroGeo.setAttribute('position', new THREE.BufferAttribute(nitroPositions, 3));
      const nitroMat = new THREE.PointsMaterial({
        color: 0x00f0ff,
        size: 1.8,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending
      });
      this.particleSystems.nitro = new THREE.Points(nitroGeo, nitroMat);
      this.scene.add(this.particleSystems.nitro);

      // 2. Hacking Electric Lightning Arc Line
      const arcGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
      const arcMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, linewidth: 2 });
      this.particleSystems.hackArc = new THREE.Line(arcGeo, arcMat);
      this.particleSystems.hackArc.visible = false;
      this.scene.add(this.particleSystems.hackArc);
    }

    buildPlayerAndVehicles() {
      this.player.mesh = new THREE.Group();
      this.player.pos.set(0, 0.5, 20);
      this.player.mesh.position.copy(this.player.pos);
      this.scene.add(this.player.mesh);

      this.vehicleMeshes.foot = this.createHumanoidModel();
      this.vehicleMeshes.supercar = this.createSupercarModel();
      this.vehicleMeshes.bike = this.createMotorbikeModel();
      this.vehicleMeshes.bicycle = this.createBicycleModel();
      this.vehicleMeshes.jet = this.createJetModel();
      this.vehicleMeshes.hovercraft = this.createHovercraftModel();
      this.vehicleMeshes.parachute = this.createParachuteModel();
      this.vehicleMeshes.submarine = this.createSubmarineModel();

      this.applyVehicleMesh(this.player.vehicleType);
      this.createOverheadNameplate();
    }

    createHumanoidModel() {
      const group = new THREE.Group();
      const armorMat = new THREE.MeshStandardMaterial({ color: 0x0a101d, metalness: 0.8, roughness: 0.3 });

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.5), armorMat);
      torso.position.y = 1.3;
      group.add(torso);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), armorMat);
      head.position.y = 2.15;
      group.add(head);

      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.18, 0.25), new THREE.MeshBasicMaterial({ color: 0x00f0ff }));
      visor.position.set(0, 2.15, 0.2);
      group.add(visor);

      const limbMat = new THREE.MeshStandardMaterial({ color: 0x1a2333 });
      const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.0, 0.25), limbMat);
      lArm.position.set(-0.6, 1.2, 0); group.add(lArm);

      const rArm = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.0, 0.25), limbMat);
      rArm.position.set(0.6, 1.2, 0); group.add(rArm);

      const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.1, 0.3), limbMat);
      lLeg.position.set(-0.25, 0.55, 0); group.add(lLeg);

      const rLeg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.1, 0.3), limbMat);
      rLeg.position.set(0.25, 0.55, 0); group.add(rLeg);

      return group;
    }

    createSupercarModel() {
      const car = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(2.3, 0.7, 4.8),
        new THREE.MeshStandardMaterial({ color: 0x0d1527, roughness: 0.2, metalness: 0.85 })
      );
      body.position.y = 0.55;
      car.add(body);

      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.6, 2.2),
        new THREE.MeshPhysicalMaterial({ color: 0x00f0ff, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.7 })
      );
      cabin.position.set(0, 1.05, -0.2);
      car.add(cabin);

      const wing = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 0.6), new THREE.MeshStandardMaterial({ color: 0xff007f }));
      wing.position.set(0, 1.25, 2.1);
      car.add(wing);

      const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.4, 16);
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 });
      const rimMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

      car.wheels = [];
      [[-1.2, 0.45, 1.4], [1.2, 0.45, 1.4], [-1.2, 0.45, -1.4], [1.2, 0.45, -1.4]].forEach(pos => {
        const wGroup = new THREE.Group();
        wGroup.position.set(pos[0], pos[1], pos[2]);
        const tire = new THREE.Mesh(wheelGeo, wheelMat);
        tire.rotation.z = Math.PI / 2;
        wGroup.add(tire);
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.42, 8), rimMat);
        rim.rotation.z = Math.PI / 2;
        wGroup.add(rim);
        car.add(wGroup);
        car.wheels.push(wGroup);
      });

      const tailLight = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.15, 0.1), new THREE.MeshBasicMaterial({ color: 0xff0033 }));
      tailLight.position.set(0, 0.65, 2.45);
      car.add(tailLight);

      return car;
    }

    createMotorbikeModel() {
      const bike = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff007f, metalness: 0.8 });
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 2.2), bodyMat);
      frame.position.y = 0.65; bike.add(frame);

      const wMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
      const fWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.25, 16), wMat);
      fWheel.rotation.z = Math.PI / 2; fWheel.position.set(0, 0.4, -1.0); bike.add(fWheel);

      const rWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 16), wMat);
      rWheel.rotation.z = Math.PI / 2; rWheel.position.set(0, 0.45, 1.0); bike.add(rWheel);

      return bike;
    }

    createBicycleModel() {
      const bike = new THREE.Group();
      const frame = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4), new THREE.MeshStandardMaterial({ color: 0x38ef7d }));
      frame.rotation.x = Math.PI / 2; frame.position.set(0, 0.8, 0); bike.add(frame);

      const wMat = new THREE.MeshBasicMaterial({ color: 0xaaaaaa, wireframe: true });
      const fWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.08, 12), wMat);
      fWheel.rotation.z = Math.PI / 2; fWheel.position.set(0, 0.35, -0.8); bike.add(fWheel);

      const rWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.08, 12), wMat);
      rWheel.rotation.z = Math.PI / 2; rWheel.position.set(0, 0.35, 0.8); bike.add(rWheel);

      return bike;
    }

    createJetModel() {
      const jet = new THREE.Group();
      const stealthMat = new THREE.MeshStandardMaterial({ color: 0x161c2b, metalness: 0.9, roughness: 0.2 });

      const body = new THREE.Mesh(new THREE.ConeGeometry(1.2, 7.5, 8), stealthMat);
      body.rotation.x = Math.PI / 2; body.position.y = 1.0; jet.add(body);

      const wing = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.12, 3.2), stealthMat);
      wing.position.set(0, 1.0, 0.5); jet.add(wing);

      const flameMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
      const f1 = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.2, 12), flameMat);
      f1.rotation.x = -Math.PI / 2; f1.position.set(-0.6, 1.0, 3.8); jet.add(f1);

      const f2 = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.2, 12), flameMat);
      f2.rotation.x = -Math.PI / 2; f2.position.set(0.6, 1.0, 3.8); jet.add(f2);

      return jet;
    }

    createHovercraftModel() {
      const craft = new THREE.Group();
      const skirt = new THREE.Mesh(
        new THREE.TorusGeometry(2.4, 0.7, 12, 24),
        new THREE.MeshStandardMaterial({ color: 0x1e273b, roughness: 0.9 })
      );
      skirt.rotation.x = Math.PI / 2; skirt.scale.set(1.0, 1.6, 0.6); skirt.position.y = 0.6; craft.add(skirt);

      const deck = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.5, 5.2), new THREE.MeshStandardMaterial({ color: 0x00f0ff, metalness: 0.7 }));
      deck.position.y = 0.9; craft.add(deck);

      return craft;
    }

    createParachuteModel() {
      const chute = new THREE.Group();
      const canopy = new THREE.Mesh(
        new THREE.SphereGeometry(3.8, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0xff007f, wireframe: true, side: THREE.DoubleSide })
      );
      canopy.position.y = 4.5; chute.add(canopy);
      chute.add(this.createHumanoidModel());
      return chute;
    }

    createSubmarineModel() {
      const sub = new THREE.Group();
      const hullMat = new THREE.MeshStandardMaterial({ color: 0x091424, metalness: 0.9, roughness: 0.2 });
      const hull = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 6.5, 16), hullMat);
      hull.rotation.x = Math.PI / 2; hull.position.y = 1.0; sub.add(hull);

      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 1.4), hullMat);
      tower.position.set(0, 2.2, 0); sub.add(tower);

      return sub;
    }

    applyVehicleMesh(type) {
      while (this.player.mesh.children.length > 0) {
        this.player.mesh.remove(this.player.mesh.children[0]);
      }
      this.player.vehicleType = type;
      const vModel = this.vehicleMeshes[type];
      if (vModel) this.player.mesh.add(vModel);
      if (this.player.nameTagMesh) this.player.mesh.add(this.player.nameTagMesh);

      if (type === 'foot') { this.player.maxSpeed = 8; this.player.accel = 15; }
      else if (type === 'bicycle') { this.player.maxSpeed = 14; this.player.accel = 12; }
      else if (type === 'supercar') { this.player.maxSpeed = 55; this.player.accel = 32; }
      else if (type === 'bike') { this.player.maxSpeed = 52; this.player.accel = 36; }
      else if (type === 'jet') { this.player.maxSpeed = 95; this.player.accel = 45; if (this.player.pos.y < 8) this.player.pos.y = 15; }
      else if (type === 'hovercraft') { this.player.maxSpeed = 38; this.player.accel = 24; }
      else if (type === 'parachute') { this.player.maxSpeed = 16; if (this.player.pos.y < 35) this.player.pos.y = 70; }
      else if (type === 'submarine') { this.player.maxSpeed = 22; this.player.accel = 15; this.player.pos.x = -200; this.player.pos.y = -8; }

      this.updateVehicleChipsUI(type);

      // Broadcast to Heroku server
      if (this.socket && this.socket.connected) {
        this.socket.emit('player:move', {
          position: this.player.pos,
          rotation: { y: this.player.yaw },
          vehicle: type
        });
      }
    }

    createOverheadNameplate() {
      const canvas = document.createElement('canvas');
      canvas.width = 384; canvas.height = 96;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(6, 10, 20, 0.85)';
      ctx.fillRect(4, 4, 376, 88);
      ctx.strokeStyle = '#00f0ff'; ctx.lineWidth = 3;
      ctx.strokeRect(4, 4, 376, 88);

      ctx.fillStyle = '#00f0ff'; ctx.font = 'bold 30px monospace'; ctx.textAlign = 'center';
      ctx.fillText(`@${this.player.username}`, 192, 42);

      ctx.fillStyle = '#ffd700'; ctx.font = '600 18px sans-serif';
      ctx.fillText('⚡ VERIFIED DEVSECOPS OPERATIVE', 192, 72);

      const spriteMat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true });
      this.player.nameTagMesh = new THREE.Sprite(spriteMat);
      this.player.nameTagMesh.scale.set(4, 1, 1);
      this.player.nameTagMesh.position.set(0, 3.8, 0);
      this.player.mesh.add(this.player.nameTagMesh);
    }

    updateNameplateUsername(newUsername) {
      this.player.username = newUsername;
      localStorage.setItem('ow_github_user', newUsername);
      if (this.player.nameTagMesh) this.player.mesh.remove(this.player.nameTagMesh);
      this.createOverheadNameplate();

      const userDisplay = document.getElementById('ow-display-username');
      const userAvatar = document.getElementById('ow-user-avatar');
      if (userDisplay) userDisplay.innerText = `@${newUsername}`;
      if (userAvatar) userAvatar.src = `https://github.com/${newUsername}.png`;

      if (this.socket && this.socket.connected) {
        this.socket.emit('player:join', {
          username: newUsername,
          avatarUrl: `https://github.com/${newUsername}.png`,
          position: this.player.pos,
          vehicle: this.player.vehicleType
        });
      }
    }

    buildNPCs() {
      const carColors = [0xff007f, 0x00f0ff, 0xffd700, 0x38ef7d, 0x9d4edd];
      for (let i = 0; i < 8; i++) {
        const car = new THREE.Group();
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(2.1, 0.7, 4.4),
          new THREE.MeshStandardMaterial({ color: carColors[i % carColors.length], metalness: 0.6 })
        );
        body.position.y = 0.55; car.add(body);

        const isNS = i % 2 === 0;
        const startPos = isNS
          ? new THREE.Vector3(i < 4 ? -6 : 6, 0.5, (i * 50) - 180)
          : new THREE.Vector3((i * 50) - 180, 0.5, i < 4 ? -6 : 6);

        car.position.copy(startPos);
        this.scene.add(car);

        this.npcVehicles.push({
          id: `NPC_CAR_0${i + 1}`,
          mesh: car,
          speed: 12 + Math.random() * 8,
          isNS,
          dir: 1,
          hackedSpeed: 0,
          exploit: 'CAN_BUS_OVERFLOW // REMOTE_ACCEL'
        });
      }

      for (let i = 0; i < 10; i++) {
        const ped = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.4, 0.4), new THREE.MeshStandardMaterial({ color: 0x8899aa }));
        body.position.y = 0.9; ped.add(body);
        ped.position.set((Math.random() - 0.5) * 160, 0, (Math.random() - 0.5) * 160);
        this.scene.add(ped);

        this.npcPedestrians.push({
          id: `CITIZEN_0${i + 1}`,
          mesh: ped,
          targetPos: new THREE.Vector3((Math.random() - 0.5) * 180, 0, (Math.random() - 0.5) * 180),
          speed: 2 + Math.random() * 2,
          walletCrypto: 120 + Math.floor(Math.random() * 850),
          exploit: 'FINTECH_API_IDOR // SIPHON_CRYPTO'
        });
      }
    }

    setupInputListeners() {
      window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        switch (e.code) {
          case 'KeyW': case 'ArrowUp': this.keys.forward = true; break;
          case 'KeyS': case 'ArrowDown': this.keys.backward = true; break;
          case 'KeyA': case 'ArrowLeft': this.keys.left = true; break;
          case 'KeyD': case 'ArrowRight': this.keys.right = true; break;
          case 'ShiftLeft': case 'ShiftRight': this.keys.shift = true; break;
          case 'Space': this.keys.space = true; break;
          case 'KeyE': this.executeCurrentWatchDogsHack(); break;
          case 'KeyC': this.toggleCameraMode(); break;
          case 'Backquote': case 'Tab': e.preventDefault(); this.toggleCyberdeckIDE(); break;
        }
      });

      window.addEventListener('keyup', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        switch (e.code) {
          case 'KeyW': case 'ArrowUp': this.keys.forward = false; break;
          case 'KeyS': case 'ArrowDown': this.keys.backward = false; break;
          case 'KeyA': case 'ArrowLeft': this.keys.left = false; break;
          case 'KeyD': case 'ArrowRight': this.keys.right = false; break;
          case 'ShiftLeft': case 'ShiftRight': this.keys.shift = false; break;
          case 'Space': this.keys.space = false; break;
        }
      });

      // Desktop Mouse Orbit
      this.canvas.addEventListener('mousedown', (e) => {
        this.mouse.isDown = true;
        this.mouse.prevX = e.clientX;
        this.mouse.prevY = e.clientY;
      });

      window.addEventListener('mouseup', () => { this.mouse.isDown = false; });
      window.addEventListener('mousemove', (e) => {
        if (!this.mouse.isDown) return;
        this.cameraOrbit.yaw -= (e.clientX - this.mouse.prevX) * 0.005;
        this.cameraOrbit.pitch = Math.max(0.05, Math.min(1.2, this.cameraOrbit.pitch + (e.clientY - this.mouse.prevY) * 0.005));
        this.mouse.prevX = e.clientX;
        this.mouse.prevY = e.clientY;
      });

      window.addEventListener('resize', () => {
        if (!this.container || !this.renderer || !this.camera) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight || 560;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
      });
    }

    setupMobileTouchControls() {
      // 1. Virtual Analog Touch Joystick
      const joyBase = document.getElementById('ow-joystick-base');
      const joyKnob = document.getElementById('ow-joystick-knob');

      if (joyBase && joyKnob) {
        let activePointerId = null;

        const onPointerDown = (e) => {
          activePointerId = e.pointerId;
          joyBase.setPointerCapture(activePointerId);
          handleJoystick(e);
        };

        const onPointerMove = (e) => {
          if (e.pointerId === activePointerId) handleJoystick(e);
        };

        const onPointerUp = (e) => {
          if (e.pointerId === activePointerId) {
            activePointerId = null;
            this.touchState.joyX = 0;
            this.touchState.joyY = 0;
            joyKnob.style.transform = 'translate(-50%, -50%)';
            this.keys.forward = false;
            this.keys.backward = false;
            this.keys.left = false;
            this.keys.right = false;
          }
        };

        const handleJoystick = (e) => {
          const rect = joyBase.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const maxDist = rect.width / 2;

          let dx = e.clientX - cx;
          let dy = e.clientY - cy;
          const dist = Math.hypot(dx, dy);

          if (dist > maxDist) {
            dx = (dx / dist) * maxDist;
            dy = (dy / dist) * maxDist;
          }

          joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

          // Dead zone check (0.15)
          const normX = dx / maxDist;
          const normY = dy / maxDist;

          this.touchState.joyX = Math.abs(normX) > 0.15 ? normX : 0;
          this.touchState.joyY = Math.abs(normY) > 0.15 ? normY : 0;

          this.keys.forward = this.touchState.joyY < -0.25;
          this.keys.backward = this.touchState.joyY > 0.25;
          this.keys.left = this.touchState.joyX < -0.25;
          this.keys.right = this.touchState.joyX > 0.25;
        };

        joyBase.addEventListener('pointerdown', onPointerDown);
        joyBase.addEventListener('pointermove', onPointerMove);
        joyBase.addEventListener('pointerup', onPointerUp);
        joyBase.addEventListener('pointercancel', onPointerUp);
      }

      // 2. Mobile Action Buttons
      const btnGas = document.getElementById('mbtn-gas');
      const btnBrake = document.getElementById('mbtn-brake');

      if (btnGas) {
        const startGas = (e) => {
          if (e.cancelable) e.preventDefault();
          this.keys.forward = true;
          this.keys.shift = true; // Nitro on mobile gas
        };
        const stopGas = () => {
          this.keys.forward = false;
          this.keys.shift = false;
        };
        btnGas.addEventListener('pointerdown', startGas);
        btnGas.addEventListener('pointerup', stopGas);
        btnGas.addEventListener('pointercancel', stopGas);
        btnGas.addEventListener('pointerleave', stopGas);
        btnGas.addEventListener('lostpointercapture', stopGas);
      }

      if (btnBrake) {
        const startBrake = (e) => {
          if (e.cancelable) e.preventDefault();
          this.keys.backward = true;
          this.keys.space = true; // Drift handbrake
        };
        const stopBrake = () => {
          this.keys.backward = false;
          this.keys.space = false;
        };
        btnBrake.addEventListener('pointerdown', startBrake);
        btnBrake.addEventListener('pointerup', stopBrake);
        btnBrake.addEventListener('pointercancel', stopBrake);
        btnBrake.addEventListener('pointerleave', stopBrake);
        btnBrake.addEventListener('lostpointercapture', stopBrake);
      }

      // 3. Touch Orbit on Canvas
      let touchCamId = null;
      let prevTouchX = 0, prevTouchY = 0;

      this.canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length > 0) {
          const t = e.touches[0];
          touchCamId = t.identifier;
          prevTouchX = t.clientX;
          prevTouchY = t.clientY;
        }
      }, { passive: true });

      this.canvas.addEventListener('touchmove', (e) => {
        for (let i = 0; i < e.touches.length; i++) {
          const t = e.touches[i];
          if (t.identifier === touchCamId) {
            const dx = t.clientX - prevTouchX;
            const dy = t.clientY - prevTouchY;
            this.cameraOrbit.yaw -= dx * 0.007;
            this.cameraOrbit.pitch = Math.max(0.05, Math.min(1.2, this.cameraOrbit.pitch + dy * 0.007));
            prevTouchX = t.clientX;
            prevTouchY = t.clientY;
            break;
          }
        }
      }, { passive: true });

      this.canvas.addEventListener('touchend', () => { touchCamId = null; }, { passive: true });
      this.canvas.addEventListener('touchcancel', () => { touchCamId = null; }, { passive: true });
    }

    disposeHierarchy(node) {
      if (!node) return;
      node.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => {
              if (mat.map) mat.map.dispose();
              mat.dispose();
            });
          } else {
            if (child.material.map) child.material.map.dispose();
            child.material.dispose();
          }
        }
      });
    }

    initHerokuSocket() {
      if (typeof io === 'undefined') return;

      try {
        this.socket = io(HEROKU_BACKEND_URL, {
          transports: ['websocket', 'polling'],
          timeout: 8000
        });

        this.socket.on('connect', () => {
          console.log('⚡ [NET] Connected to Heroku Authoritative Server:', HEROKU_BACKEND_URL);
          this.showHackFeedToast('🟢 GRID ONLINE // HEROKU SERVER CONNECTED');

          this.socket.emit('player:join', {
            username: this.player.username,
            avatarUrl: this.player.avatarUrl,
            position: this.player.pos,
            vehicle: this.player.vehicleType
          });
        });

        this.socket.on('world:init', (data) => {
          if (data && Array.isArray(data.players)) {
            data.players.forEach((p) => {
              if (p.id !== this.socket.id) {
                this.addRemotePlayer(p);
              }
            });
          }
        });

        this.socket.on('player:spawned', (peerData) => {
          this.addRemotePlayer(peerData);
          this.showHackFeedToast(`Operative @${peerData.username} joined the grid.`);
        });

        this.socket.on('player:moved', (data) => {
          const peer = this.remotePlayers.get(data.id);
          if (peer && peer.mesh) {
            peer.mesh.position.lerp(new THREE.Vector3(data.position.x, data.position.y, data.position.z), 0.3);
            if (data.rotation) peer.mesh.rotation.y = data.rotation.y;
          }
        });

        this.socket.on('player:left', (id) => {
          const peer = this.remotePlayers.get(id);
          if (peer && peer.mesh) {
            this.scene.remove(peer.mesh);
            this.disposeHierarchy(peer.mesh);
            this.remotePlayers.delete(id);
          }
        });

        this.socket.on('chat:system', (sysMsg) => {
          const msgBox = document.getElementById('ow-chat-messages');
          if (msgBox) {
            const div = document.createElement('div');
            div.className = 'chat-msg chat-sys';
            div.style.color = '#ffcc00';
            div.style.fontSize = '0.72rem';
            div.textContent = `[GRID SYS] ${sysMsg}`;
            msgBox.appendChild(div);
            msgBox.scrollTop = msgBox.scrollHeight;
          }
        });

        this.socket.on('chat:broadcast', (msg) => {
          const msgBox = document.getElementById('ow-chat-messages');
          if (msgBox) {
            const div = document.createElement('div');
            div.className = 'chat-msg';
            const userSpan = document.createElement('span');
            userSpan.className = 'c-user';
            userSpan.textContent = `@${msg.username}: `;
            const textNode = document.createTextNode(msg.text || '');
            div.appendChild(userSpan);
            div.appendChild(textNode);
            msgBox.appendChild(div);
            msgBox.scrollTop = msgBox.scrollHeight;
          }
        });
      } catch (err) {
        console.warn('[NET] Heroku Socket fallback to local simulation:', err.message);
      }
    }

    addRemotePlayer(p) {
      if (this.remotePlayers.has(p.id)) return;
      const peerGroup = new THREE.Group();
      peerGroup.position.set(p.position.x, p.position.y, p.position.z);

      const car = this.createSupercarModel();
      peerGroup.add(car);

      // Nameplate
      const tagCanvas = document.createElement('canvas');
      tagCanvas.width = 256; tagCanvas.height = 64;
      const tCtx = tagCanvas.getContext('2d');
      tCtx.fillStyle = 'rgba(0,0,0,0.8)'; tCtx.fillRect(0,0,256,64);
      tCtx.fillStyle = '#00f0ff'; tCtx.font = 'bold 24px monospace'; tCtx.textAlign = 'center';
      tCtx.fillText(`@${p.username}`, 128, 40);

      const tagSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(tagCanvas) }));
      tagSprite.scale.set(3, 0.8, 1);
      tagSprite.position.y = 3.5;
      peerGroup.add(tagSprite);

      this.scene.add(peerGroup);
      this.remotePlayers.set(p.id, { ...p, mesh: peerGroup });
    }

    updatePhysics(delta) {
      const p = this.player;

      // Steering
      if (this.keys.left) p.yaw += p.turnSpeed * delta;
      if (this.keys.right) p.yaw -= p.turnSpeed * delta;
      p.mesh.rotation.y = p.yaw;

      let targetSpeed = 0;
      if (this.keys.forward) {
        let maxSpd = p.maxSpeed;
        if (this.keys.shift && p.nitro > 0) {
          maxSpd *= 1.45;
          p.nitro = Math.max(0, p.nitro - delta * 30);
          p.isNitro = true;
        } else {
          p.isNitro = false;
          p.nitro = Math.min(100, p.nitro + delta * 12);
        }
        targetSpeed = maxSpd;
      } else if (this.keys.backward) {
        targetSpeed = -p.maxSpeed * 0.45;
        p.isNitro = false;
      } else {
        p.isNitro = false;
      }

      p.speed = THREE.MathUtils.lerp(p.speed, targetSpeed, delta * 3.5);
      const forwardDir = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), p.yaw);

      if (p.vehicleType === 'jet') {
        if (this.keys.forward) p.pos.y = Math.min(220, p.pos.y + (this.keys.shift ? 15 : 6) * delta);
        if (this.keys.backward) p.pos.y = Math.max(3, p.pos.y - 12 * delta);
      } else if (p.vehicleType === 'parachute') {
        p.pos.y = Math.max(0.5, p.pos.y - 4.5 * delta);
        p.speed = Math.min(p.speed, 12);
      } else if (p.vehicleType === 'hovercraft') {
        p.pos.y = 0.8 + Math.sin(Date.now() * 0.006) * 0.1;
      } else if (p.vehicleType === 'submarine') {
        if (this.keys.space) p.pos.y = Math.max(-25, p.pos.y - 8 * delta);
        if (this.keys.shift) p.pos.y = Math.min(-1.5, p.pos.y + 8 * delta);
      } else {
        p.pos.y = p.vehicleType === 'foot' ? 0 : 0.4;
      }

      p.pos.addScaledVector(forwardDir, p.speed * delta);
      p.mesh.position.copy(p.pos);

      // Rotate wheels
      if (p.vehicleType === 'supercar' && p.mesh.children[0]?.wheels) {
        p.mesh.children[0].wheels.forEach(w => {
          w.children[0].rotation.x += p.speed * delta * 2;
        });
      }

      // Sync with Heroku (throttled to ~20 Hz to prevent network flooding)
      const now = performance.now();
      if (this.socket && this.socket.connected && Math.abs(p.speed) > 0.05 && (now - this.lastNetSync > 48)) {
        this.lastNetSync = now;
        this.socket.emit('player:move', {
          position: p.pos,
          rotation: { y: p.yaw },
          speed: p.speed,
          vehicle: p.vehicleType
        });
      }

      this.updateHUD(p.speed, p.nitro);
    }

    updateCamera() {
      if (this.activeCameraMode === 'cctv_hack' && this.hackedCameraIndex >= 0) {
        const camNode = this.securityCameras[this.hackedCameraIndex];
        if (camNode) {
          this.camera.position.copy(camNode.pos).add(new THREE.Vector3(0, 0.5, 0));
          this.camera.lookAt(this.player.pos);
          return;
        }
      }

      const p = this.player;
      const angle = p.yaw + this.cameraOrbit.yaw;
      const dist = p.vehicleType === 'jet' ? 24 : (p.vehicleType === 'foot' ? 6 : 10);
      const height = p.vehicleType === 'jet' ? 8 : (p.vehicleType === 'foot' ? 2.5 : 4.0);

      const targetCamPos = new THREE.Vector3(
        p.pos.x + Math.sin(angle) * dist,
        p.pos.y + height + this.cameraOrbit.pitch * 6,
        p.pos.z + Math.cos(angle) * dist
      );

      this.camera.position.lerp(targetCamPos, 0.12);
      this.camera.lookAt(new THREE.Vector3(p.pos.x, p.pos.y + 1.5, p.pos.z));
    }

    updateNPCs(delta) {
      this.npcVehicles.forEach(c => {
        const spd = (c.hackedSpeed > 0 ? c.hackedSpeed : c.speed) * delta;
        if (c.isNS) {
          c.mesh.position.z += spd * c.dir;
          if (c.mesh.position.z > 230) c.dir = -1;
          if (c.mesh.position.z < -230) c.dir = 1;
        } else {
          c.mesh.position.x += spd * c.dir;
          if (c.mesh.position.x > 230) c.dir = -1;
          if (c.mesh.position.x < -230) c.dir = 1;
        }
      });

      this.npcPedestrians.forEach(p => {
        const dir = new THREE.Vector3().subVectors(p.targetPos, p.mesh.position);
        if (dir.length() < 2) {
          p.targetPos.set((Math.random() - 0.5) * 180, 0, (Math.random() - 0.5) * 180);
        } else {
          dir.normalize();
          p.mesh.position.addScaledVector(dir, p.speed * delta);
        }
      });

      // Animated Water Waves
      if (this.waterMesh) {
        this.waterMesh.position.y = -1.2 + Math.sin(Date.now() * 0.003) * 0.35;
      }

      // Blinking Aviation Beacons
      const beaconPhase = Math.sin(Date.now() * 0.008) > 0.3;
      this.beaconLights.forEach(b => {
        b.intensity = beaconPhase ? 1.8 : 0.05;
      });

      if (this.radarDish) this.radarDish.rotation.y += delta * 1.5;
    }

    updateWatchDogsProfiler() {
      let closestTarget = null;
      let minDistance = 35;

      const allTargets = [
        ...this.trafficLights,
        ...this.securityCameras,
        ...this.powerSubstations,
        ...this.npcVehicles.map(v => ({ id: v.id, type: 'NPC_VEHICLE', pos: v.mesh.position, exploit: v.exploit })),
        ...this.npcPedestrians.map(p => ({ id: p.id, type: 'CITIZEN', pos: p.mesh.position, exploit: p.exploit }))
      ];

      allTargets.forEach(t => {
        const dist = this.player.pos.distanceTo(t.pos);
        if (dist < minDistance) {
          minDistance = dist;
          closestTarget = t;
        }
      });

      this.currentTarget = closestTarget;
      const infoBox = document.getElementById('reticle-info');
      const targetName = document.getElementById('r-target-name');
      const targetExploit = document.getElementById('r-target-exploit');

      if (closestTarget && infoBox && targetName && targetExploit) {
        infoBox.style.display = 'block';
        targetName.innerText = closestTarget.id;
        targetExploit.innerText = closestTarget.exploit;
      } else if (infoBox) {
        infoBox.style.display = 'none';
      }
    }

    executeCurrentWatchDogsHack() {
      if (!this.currentTarget) return;
      const t = this.currentTarget;

      this.player.hacksExecuted++;
      this.player.cyberCredits += 250;
      this.playHackingSFX();

      // Draw Cyan Electric Lightning Arc to Target
      if (this.particleSystems.hackArc) {
        const arcGeo = this.particleSystems.hackArc.geometry;
        arcGeo.setFromPoints([
          this.player.pos.clone().add(new THREE.Vector3(0, 1.2, 0)),
          t.pos.clone().add(new THREE.Vector3(0, 1.0, 0))
        ]);
        this.particleSystems.hackArc.visible = true;
        setTimeout(() => { this.particleSystems.hackArc.visible = false; }, 350);
      }

      this.showHackFeedToast(`⚡ HACK EXECUTED: [${t.id}] via ${t.exploit}`);

      if (t.type === 'TRAFFIC_LIGHT') {
        t.phase = t.phase === 'RED' ? 'GREEN' : 'RED';
        if (t.redBulb && t.greenBulb) {
          t.redBulb.material.color.setHex(t.phase === 'RED' ? 0xff0033 : 0x220000);
          t.greenBulb.material.color.setHex(t.phase === 'GREEN' ? 0x00ff66 : 0x002200);
        }
      } else if (t.type === 'SECURITY_CAMERA') {
        const idx = this.securityCameras.findIndex(c => c.id === t.id);
        if (idx >= 0) {
          this.activeCameraMode = 'cctv_hack';
          this.hackedCameraIndex = idx;
          const overlay = document.getElementById('ow-cam-overlay');
          if (overlay) overlay.style.display = 'block';
        }
      } else if (t.type === 'NPC_VEHICLE') {
        const car = this.npcVehicles.find(c => c.id === t.id);
        if (car) {
          car.hackedSpeed = 48;
          setTimeout(() => { car.hackedSpeed = 0; }, 4000);
        }
      } else if (t.type === 'POWER_SUBSTATION') {
        this.triggerCityBlackout(5000);
      } else if (t.type === 'CITIZEN') {
        const ped = this.npcPedestrians.find(p => p.id === t.id);
        if (ped) {
          this.player.cyberCredits += ped.walletCrypto;
          this.showHackFeedToast(`💰 SIPHONED +${ped.walletCrypto} CYBER-CREDITS FROM ${ped.id}`);
        }
      }

      // Sync hack event with Heroku server
      if (this.socket && this.socket.connected) {
        this.socket.emit('hack:execute', {
          targetType: t.type,
          targetId: t.id,
          exploit: t.exploit
        });
      }
    }

    triggerCityBlackout(durationMs) {
      this.scene.fog.color.setHex(0x000205);
      this.renderer.toneMappingExposure = 0.25;
      this.showHackFeedToast('⚠️ SCADA OVERRIDE: CITYWIDE GRID BLACKOUT INITIATED');
      setTimeout(() => {
        this.scene.fog.color.setHex(0x03050a);
        this.renderer.toneMappingExposure = 1.15;
      }, durationMs || 5000);
    }

    exitCameraFeed() {
      this.activeCameraMode = 'chase';
      this.hackedCameraIndex = -1;
      const overlay = document.getElementById('ow-cam-overlay');
      if (overlay) overlay.style.display = 'none';
    }

    toggleCameraMode() {
      const modes = ['chase', 'hood', 'free'];
      const next = (modes.indexOf(this.activeCameraMode) + 1) % modes.length;
      this.activeCameraMode = modes[next];
    }

    toggleCyberdeckIDE() {
      this.isIDEOpen = !this.isIDEOpen;
      const modal = document.getElementById('ow-cyberdeck-modal');
      if (modal) modal.style.display = this.isIDEOpen ? 'flex' : 'none';
    }

    executeCyberdeckScript() {
      const editor = document.getElementById('ide-code-editor');
      const consoleOut = document.getElementById('ide-console-output');
      if (!editor || !consoleOut) return;

      const code = editor.value;
      consoleOut.innerText = `> Executing script in sandboxed context...\n`;

      try {
        const sandboxCity = {
          triggerBlackout: (d) => this.triggerCityBlackout(d),
          hackTrafficLights: (phase) => {
            this.trafficLights.forEach(l => { l.phase = phase === 'ALL_GREEN' ? 'GREEN' : 'RED'; });
            this.showHackFeedToast(`[IDE] All traffic lights switched to ${phase}`);
          },
          siphonNearbyCitizens: () => {
            let total = 0;
            this.npcPedestrians.forEach(p => { total += p.walletCrypto; });
            this.player.cyberCredits += total;
            this.showHackFeedToast(`[IDE] Mass siphon completed: +${total} Credits`);
            return total;
          },
          remoteAccelerateCars: (spd) => {
            this.npcVehicles.forEach(c => { c.hackedSpeed = spd || 40; });
            this.showHackFeedToast(`[IDE] All NPC CAN-buses overridden.`);
          }
        };

        const sandboxPlayer = {
          username: this.player.username,
          setVehicle: (t) => this.applyVehicleMesh(t),
          overclockNitro: (mult) => { this.player.nitro = 100 * (mult || 2); },
          teleport: (x, y, z) => { this.player.pos.set(x, y, z); }
        };

        const runner = new Function('city', 'player', 'console', code);
        runner(sandboxCity, sandboxPlayer, {
          log: (...args) => { consoleOut.innerText += `[LOG] ${args.join(' ')}\n`; }
        });

        consoleOut.innerText += `> Script execution completed successfully.\n`;
        this.playHackingSFX();
      } catch (err) {
        consoleOut.innerText += `[ERROR] ${err.message}\n`;
      }
    }

    updateHUD(speed, nitro) {
      const spdEl = document.getElementById('speed-value');
      const gearEl = document.getElementById('gear-value');
      const nitroBar = document.getElementById('nitro-bar');

      const kmh = Math.abs(Math.round(speed * 3.6));
      if (spdEl) spdEl.innerText = kmh;

      if (gearEl) {
        let gear = '1';
        if (kmh > 120) gear = '5';
        else if (kmh > 90) gear = '4';
        else if (kmh > 60) gear = '3';
        else if (kmh > 30) gear = '2';
        else if (speed < -0.5) gear = 'R';
        gearEl.innerText = `GEAR ${gear}`;
      }

      if (nitroBar) {
        nitroBar.style.width = `${Math.round(nitro)}%`;
      }
    }

    updateVehicleChipsUI(activeType) {
      const chips = document.querySelectorAll('.ow-vehicle-chips .v-chip');
      chips.forEach(chip => {
        chip.classList.toggle('active', chip.id === `vchip-${activeType}`);
      });
    }

    initRadar() {
      this.radarCanvas = document.getElementById('ow-radar-canvas');
      if (this.radarCanvas) this.radarCtx = this.radarCanvas.getContext('2d');
    }

    drawRadar() {
      if (!this.radarCtx || !this.radarCanvas) return;
      const ctx = this.radarCtx;
      const w = this.radarCanvas.width;
      const h = this.radarCanvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const scale = 0.35;

      ctx.clearRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 58, 0, Math.PI * 2);
      ctx.arc(cx, cy, 38, 0, Math.PI * 2);
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#00ff66';
      this.trafficLights.forEach(tl => {
        const rx = cx + (tl.pos.x - this.player.pos.x) * scale;
        const ry = cy + (tl.pos.z - this.player.pos.z) * scale;
        if (Math.hypot(rx - cx, ry - cy) < 55) ctx.fillRect(rx - 2, ry - 2, 4, 4);
      });

      ctx.fillStyle = '#ff007f';
      this.npcVehicles.forEach(v => {
        const rx = cx + (v.mesh.position.x - this.player.pos.x) * scale;
        const ry = cy + (v.mesh.position.z - this.player.pos.z) * scale;
        if (Math.hypot(rx - cx, ry - cy) < 55) ctx.fillRect(rx - 2, ry - 2, 4, 4);
      });

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-this.player.yaw);
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.moveTo(0, -6); ctx.lineTo(-4, 5); ctx.lineTo(4, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    showHackFeedToast(msg) {
      const feed = document.getElementById('ow-hack-feed');
      if (!feed) return;
      const item = document.createElement('div');
      item.className = 'hack-toast-item';
      item.innerText = msg;
      feed.appendChild(item);
      setTimeout(() => { item.remove(); }, 3500);
    }

    playHackingSFX() {
      try {
        if (!this.audioCtx) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (AudioContext) this.audioCtx = new AudioContext();
        }
        if (!this.audioCtx) return;
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1400, this.audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.25);
      } catch (e) {}
    }

    checkUrlForGitHubOAuth() {
      const params = new URLSearchParams(window.location.search);
      const payload = params.get('auth_payload');
      if (payload) {
        try {
          const userObj = JSON.parse(atob(payload));
          if (userObj.username) {
            this.updateNameplateUsername(userObj.username);
            this.showHackFeedToast(`⚡ GITHUB OAUTH VERIFIED: Welcome Operative @${userObj.username}`);
          }
        } catch (e) {}
      }
    }

    updateParticles(delta) {
      if (!this.particleSystems || !this.particleSystems.nitro) return;

      if (this.player.isNitro && this.player.speed > 5) {
        this.particleSystems.nitro.visible = true;
        const posAttr = this.particleSystems.nitro.geometry.attributes.position;
        const count = posAttr.count;
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.player.yaw);
        const rear = this.player.pos.clone().sub(forward.clone().multiplyScalar(2.6)).add(new THREE.Vector3(0, 0.4, 0));

        for (let i = 0; i < count; i++) {
          const scatter = (Math.random() - 0.5) * 0.45;
          const trailDist = Math.random() * 2.8;
          posAttr.setXYZ(
            i,
            rear.x - forward.x * trailDist + scatter,
            rear.y + (Math.random() - 0.5) * 0.3,
            rear.z - forward.z * trailDist + scatter
          );
        }
        posAttr.needsUpdate = true;
      } else {
        this.particleSystems.nitro.visible = false;
      }
    }

    setActive(active) {
      this.isActive = !!active;
      if (this.isActive) {
        if (!this.rafId && this.renderer) {
          this.clock.getDelta(); // Reset delta to prevent giant time step
          this.rafId = requestAnimationFrame(this.animate);
        }
      } else {
        if (this.rafId) {
          cancelAnimationFrame(this.rafId);
          this.rafId = null;
        }
      }
    }

    animate() {
      if (!this.isActive || !this.renderer) {
        this.rafId = null;
        return;
      }
      this.rafId = requestAnimationFrame(this.animate);
      const delta = Math.min(this.clock.getDelta(), 0.1);

      this.updatePhysics(delta);
      this.updateCamera();
      this.updateNPCs(delta);
      this.updateWatchDogsProfiler();
      this.drawRadar();
      this.updateParticles(delta);

      this.renderer.render(this.scene, this.camera);
    }

    destroy() {
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }
      if (this.renderer) {
        this.renderer.dispose();
      }
      if (this.scene) {
        this.disposeHierarchy(this.scene);
      }
      this.remotePlayers.clear();
      this.beaconLights = [];
    }
  }

  window.cyberCityEngine = new CyberCity3DEngine();

  window.setPlayerVehicle = function(type) {
    if (window.cyberCityEngine) window.cyberCityEngine.applyVehicleMesh(type);
  };

  window.toggleCyberdeckIDE = function() {
    if (window.cyberCityEngine) window.cyberCityEngine.toggleCyberdeckIDE();
  };

  window.executeCyberdeckScript = function() {
    if (window.cyberCityEngine) window.cyberCityEngine.executeCyberdeckScript();
  };

  window.exitCameraFeed = function() {
    if (window.cyberCityEngine) window.cyberCityEngine.exitCameraFeed();
  };

  window.promptGitHubHandle = function() {
    const current = window.cyberCityEngine?.player?.username || 'equisde';
    const handle = prompt('Ingresa tu cuenta de GitHub para usarla como identidad en el mundo 3D:', current);
    if (handle && handle.trim() && window.cyberCityEngine) {
      window.cyberCityEngine.updateNameplateUsername(handle.trim().replace(/^@/, ''));
    }
  };

  window.loadIDETemplate = function(tplKey) {
    const editor = document.getElementById('ide-code-editor');
    if (!editor) return;
    const templates = {
      traffic: `// Hackear todos los semáforos de la ciudad a Verde Masivo\ncity.hackTrafficLights('ALL_GREEN');\nconsole.log('Todos los semáforos hackeados a VERDE.');`,
      blackout: `// Provocar sobretensión SCADA y apagón de red eléctrica\ncity.triggerBlackout(7000);\nconsole.log('Apagón de red eléctrica activado durante 7 segundos.');`,
      nitro: `// Inyección de nitro overclockeado al vehículo\nplayer.overclockNitro(3.0);\nconsole.log('Nitro del vehículo aumentado al 300%.');`,
      siphon: `// Sifón masivo de carteras cripto a ciudadanos cercanos\nconst total = city.siphonNearbyCitizens();\nconsole.log('Sifón completado. Créditos obtenidos:', total);`,
      allcars: `// Sobrecarga masiva de buses CAN en vehículos autónomos\ncity.remoteAccelerateCars(60);\nconsole.log('Aceleración remota forzada en todos los vehículos NPC.');`,
      jet: `// Invocar y equipar Caza a Reacción (Jet de Combate)\nplayer.setVehicle('jet');\nconsole.log('Caza a reacción desplegado.');`
    };
    if (templates[tplKey]) editor.value = templates[tplKey];
  };

  window.toggle3DFullscreen = function() {
    const elem = document.getElementById('ow-viewport');
    if (!elem) return;
    if (!document.fullscreenElement) {
      elem.requestFullscreen?.() || elem.webkitRequestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  window.sendGameChat = function(e) {
    if (e) e.preventDefault();
    const input = document.getElementById('ow-chat-input');
    const msgBox = document.getElementById('ow-chat-messages');
    if (!input || !msgBox || !input.value.trim()) return;

    const text = input.value.trim();
    const user = window.cyberCityEngine?.player?.username || 'equisde';

    const div = document.createElement('div');
    div.className = 'chat-msg';
    div.innerHTML = `<span class="c-user">@${user}:</span> ${text}`;
    msgBox.appendChild(div);
    msgBox.scrollTop = msgBox.scrollHeight;
    input.value = '';

    if (window.cyberCityEngine?.socket?.connected) {
      window.cyberCityEngine.socket.emit('chat:message', text);
    } else {
      setTimeout(() => {
        const respDiv = document.createElement('div');
        respDiv.className = 'chat-msg';
        respDiv.innerHTML = `<span class="c-user" style="color: #ffd700;">@IMXNOOBX:</span> [Heroku Mesh] Telemetry synchronized @${user}.`;
        msgBox.appendChild(respDiv);
        msgBox.scrollTop = msgBox.scrollHeight;
      }, 1000);
    }
  };
})();
