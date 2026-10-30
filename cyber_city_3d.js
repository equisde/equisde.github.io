/**
 * ============================================================================
 * PARALLAX CYBER-CITY 3D // OPEN-WORLD ACTION & HACKING ENGINE v3.0
 * Architecture: Three.js WebGL2 + Procedural City + Multi-Vehicle Physics
 * Watch Dogs Style Hacking + In-Game Cyberdeck Scripting IDE + Multiplayer Ready
 * Author: Rodrigo Carrasco (Parallax / equisde) & IMXNOOBX Alliance
 * ============================================================================
 */

(function() {
  'use strict';

  class CyberCity3DEngine {
    constructor() {
      this.container = null;
      this.canvas = null;
      this.renderer = null;
      this.scene = null;
      this.camera = null;
      this.clock = new THREE.Clock();

      // World Settings
      this.citySize = 500; // 500x500 meter grid
      this.buildings = [];
      this.roads = [];
      this.trafficLights = [];
      this.securityCameras = [];
      this.powerSubstations = [];
      this.npcVehicles = [];
      this.npcPedestrians = [];
      this.hackParticles = [];
      this.waterMesh = null;

      // Active Camera Mode
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
        space: false,
        hack: false,
        camToggle: false
      };
      this.mouse = { isDown: false, prevX: 0, prevY: 0 };

      // Player & Vehicle State
      this.player = {
        username: localStorage.getItem('ow_github_user') || 'equisde',
        avatarUrl: `https://github.com/${localStorage.getItem('ow_github_user') || 'equisde'}.png`,
        mesh: null,
        nameTagMesh: null,
        vehicleType: 'supercar', // 'foot', 'supercar', 'bike', 'bicycle', 'jet', 'hovercraft', 'parachute', 'submarine'
        pos: new THREE.Vector3(0, 0, 0),
        vel: new THREE.Vector3(0, 0, 0),
        rot: new THREE.Euler(0, 0, 0, 'YXZ'),
        speed: 0,
        maxSpeed: 45, // m/s (~160 km/h)
        accel: 28,
        brake: 35,
        turnSpeed: 2.2,
        nitro: 100,
        isNitro: false,
        driftFactor: 0,
        altitude: 0, // for jet / parachute
        pitch: 0,
        roll: 0,
        yaw: 0,
        cyberCredits: 2500,
        hacksExecuted: 0
      };

      // Vehicle Meshes Pool
      this.vehicleMeshes = {};

      // Watch Dogs Profiler Hacking State
      this.currentTarget = null;
      this.isHackingActive = false;
      this.blackoutTimer = 0;

      // In-Game IDE & Multiplayer
      this.isIDEOpen = false;
      this.simulatedPeers = [];
      this.socket = null; // Heroku WebSocket instance if online

      // Sound Engine Integration
      this.audioCtx = null;
    }

    init(containerId, canvasId) {
      this.container = document.getElementById(containerId);
      this.canvas = document.getElementById(canvasId);
      if (!this.container || !this.canvas) return;

      const width = this.container.clientWidth || 800;
      const height = this.container.clientHeight || 560;

      // 1. Scene, Camera & WebGL Renderer
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x04060c);
      this.scene.fog = new THREE.FogExp2(0x04060c, 0.004);

      this.camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1500);
      this.camera.position.set(0, 10, 20);

      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.1;

      // 2. Setup Lighting
      this.setupLighting();

      // 3. Build Procedural City
      this.buildCityGroundAndRoads();
      this.buildSkyscrapers();
      this.buildWaterBay();
      this.buildAirportRunway();
      this.buildTrafficLights();
      this.buildSecurityCameras();
      this.buildPowerSubstations();
      this.buildIMXNOOBXFortress();

      // 4. Build Vehicles and Player Rig
      this.buildPlayerAndVehicles();

      // 5. Build NPCs & Traffic
      this.buildNPCs();

      // 6. Setup Inputs & Events
      this.setupInputListeners();

      // 7. Initialize Audio & Radar
      this.initRadar();
      this.initSimulatedPeers();
      this.checkUrlForGitHubOAuth();

      // 8. Start Game Loop
      this.animate = this.animate.bind(this);
      requestAnimationFrame(this.animate);

      console.log('⚡ [PARALLAX CYBER-CITY 3D] Engine initialized successfully.');
    }

    setupLighting() {
      // Ambient cyber blue light
      const hemiLight = new THREE.HemisphereLight(0x00f0ff, 0x110022, 0.45);
      this.scene.add(hemiLight);

      // Main directional moonlight
      const moonLight = new THREE.DirectionalLight(0xddeeff, 0.9);
      moonLight.position.set(100, 250, 100);
      moonLight.castShadow = true;
      moonLight.shadow.mapSize.width = 2048;
      moonLight.shadow.mapSize.height = 2048;
      moonLight.shadow.camera.near = 10;
      moonLight.shadow.camera.far = 600;
      const d = 180;
      moonLight.shadow.camera.left = -d;
      moonLight.shadow.camera.right = d;
      moonLight.shadow.camera.top = d;
      moonLight.shadow.camera.bottom = -d;
      moonLight.shadow.bias = -0.0005;
      this.scene.add(moonLight);

      // Neon Plaza Accent Light
      const plazaLight = new THREE.PointLight(0xff007f, 1.5, 90);
      plazaLight.position.set(0, 15, 0);
      this.scene.add(plazaLight);
    }

    buildCityGroundAndRoads() {
      // Ground plane
      const groundGeo = new THREE.PlaneGeometry(this.citySize, this.citySize, 32, 32);
      const groundMat = new THREE.MeshStandardMaterial({
        color: 0x090d18,
        roughness: 0.85,
        metalness: 0.2
      });
      const ground = new THREE.Mesh(groundGeo, groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      this.scene.add(ground);

      // Main Grand Avenue (North-South: Z axis)
      const nsRoadGeo = new THREE.PlaneGeometry(28, this.citySize);
      const roadMat = new THREE.MeshStandardMaterial({
        color: 0x111622,
        roughness: 0.7,
        metalness: 0.3
      });
      const nsRoad = new THREE.Mesh(nsRoadGeo, roadMat);
      nsRoad.rotation.x = -Math.PI / 2;
      nsRoad.position.y = 0.02;
      nsRoad.receiveShadow = true;
      this.scene.add(nsRoad);

      // Main Grand Boulevard (East-West: X axis)
      const ewRoadGeo = new THREE.PlaneGeometry(this.citySize, 28);
      const ewRoad = new THREE.Mesh(ewRoadGeo, roadMat);
      ewRoad.rotation.x = -Math.PI / 2;
      ewRoad.position.y = 0.03;
      ewRoad.receiveShadow = true;
      this.scene.add(ewRoad);

      // Neon Road Markings (Cyan and Gold glowing strips)
      const lineMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
      for (let z = -240; z <= 240; z += 12) {
        const lineGeo = new THREE.PlaneGeometry(0.8, 6);
        const line = new THREE.Mesh(lineGeo, lineMat);
        line.rotation.x = -Math.PI / 2;
        line.position.set(0, 0.05, z);
        this.scene.add(line);
      }
    }

    buildSkyscrapers() {
      // Procedural Window Grid Canvas Texture
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#0a0e1a';
      ctx.fillRect(0, 0, 256, 512);

      // Windows
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

      // Spawn Buildings in grid blocks
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
            building.castShadow = true;
            building.receiveShadow = true;
            this.scene.add(building);
            this.buildings.push(building);

            // Neon Rooftop Accent Border
            const roofBorderGeo = new THREE.BoxGeometry(w + 0.4, 1.2, d + 0.4);
            const roofColor = idx % 2 === 0 ? 0x00f0ff : 0xff007f;
            const roofMat = new THREE.MeshBasicMaterial({ color: roofColor });
            const roofBorder = new THREE.Mesh(roofBorderGeo, roofMat);
            roofBorder.position.set(bPos.x + ox, h + 0.6, bPos.z + oz);
            this.scene.add(roofBorder);
          }
        }
      });
    }

    buildWaterBay() {
      // Western Water Area (X: -250 to -170)
      const waterGeo = new THREE.PlaneGeometry(90, this.citySize);
      const waterMat = new THREE.MeshStandardMaterial({
        color: 0x003366,
        roughness: 0.1,
        metalness: 0.9,
        transparent: true,
        opacity: 0.85
      });
      this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
      this.waterMesh.rotation.x = -Math.PI / 2;
      this.waterMesh.position.set(-205, -1.2, 0);
      this.scene.add(this.waterMesh);

      // Water Floor for Submarine Exploration
      const seaFloorGeo = new THREE.PlaneGeometry(90, this.citySize);
      const seaFloorMat = new THREE.MeshStandardMaterial({ color: 0x020712, roughness: 0.9 });
      const seaFloor = new THREE.Mesh(seaFloorGeo, seaFloorMat);
      seaFloor.rotation.x = -Math.PI / 2;
      seaFloor.position.set(-205, -28, 0);
      this.scene.add(seaFloor);
    }

    buildAirportRunway() {
      // North-East Runway (X: 160 to 240, Z: -200 to -50)
      const runwayGeo = new THREE.PlaneGeometry(26, 180);
      const runwayMat = new THREE.MeshStandardMaterial({ color: 0x1a2130, roughness: 0.6 });
      const runway = new THREE.Mesh(runwayGeo, runwayMat);
      runway.rotation.x = -Math.PI / 2;
      runway.position.set(190, 0.04, -120);
      this.scene.add(runway);

      // Runway threshold lights
      for (let z = -205; z <= -35; z += 15) {
        const lightP = new THREE.PointLight(0x00ff66, 0.4, 25);
        lightP.position.set(176, 0.5, z);
        this.scene.add(lightP);
        const lightR = new THREE.PointLight(0x00f0ff, 0.4, 25);
        lightR.position.set(204, 0.5, z);
        this.scene.add(lightR);
      }
    }

    buildTrafficLights() {
      // 8 Hackable Intersection Traffic Lights
      const coords = [
        { x: -16, z: -16 }, { x: 16, z: -16 },
        { x: -16, z: 16 }, { x: 16, z: 16 },
        { x: -16, z: -90 }, { x: 16, z: -90 },
        { x: -16, z: 90 }, { x: 16, z: 90 }
      ];

      coords.forEach((c, idx) => {
        const group = new THREE.Group();
        group.position.set(c.x, 0, c.z);

        // Pole
        const poleGeo = new THREE.CylinderGeometry(0.2, 0.2, 7);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x222938 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.y = 3.5;
        group.add(pole);

        // Light Box
        const boxGeo = new THREE.BoxGeometry(0.8, 2.2, 0.8);
        const box = new THREE.Mesh(boxGeo, poleMat);
        box.position.set(0, 6.2, 0);
        group.add(box);

        // Red & Green Bulbs
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
          phase: 'RED', // RED, GREEN
          redBulb,
          greenBulb,
          pos: group.position,
          exploit: 'RACE_CONDITION // PHASE_OVERRIDE'
        });
      });
    }

    buildSecurityCameras() {
      // 6 Hackable Surveillance CCTV Cameras
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

        const bodyGeo = new THREE.BoxGeometry(0.6, 0.5, 1.2);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0f1522 });
        const camMesh = new THREE.Mesh(bodyGeo, bodyMat);
        group.add(camMesh);

        // Lens
        const lensGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.3);
        const lensMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });
        const lens = new THREE.Mesh(lensGeo, lensMat);
        lens.rotation.x = Math.PI / 2;
        lens.position.z = 0.65;
        group.add(lens);

        // Laser scan cone
        const coneGeo = new THREE.ConeGeometry(4, 14, 16, 1, true);
        const coneMat = new THREE.MeshBasicMaterial({
          color: 0xff0033,
          transparent: true,
          opacity: 0.12,
          wireframe: true
        });
        const scanCone = new THREE.Mesh(coneGeo, coneMat);
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
      // 4 Hackable Electrical Substations
      const pCoords = [
        { x: 30, z: -30 }, { x: -30, z: 30 },
        { x: 90, z: 30 }, { x: -90, z: -30 }
      ];

      pCoords.forEach((c, idx) => {
        const group = new THREE.Group();
        group.position.set(c.x, 0, c.z);

        const boxGeo = new THREE.BoxGeometry(3, 4, 2.5);
        const boxMat = new THREE.MeshStandardMaterial({ color: 0x1e2738, roughness: 0.5 });
        const box = new THREE.Mesh(boxGeo, boxMat);
        box.position.y = 2;
        group.add(box);

        // High Voltage Warning Plate
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
      // Central VIP Outpost for IMXNOOBX
      const outpostGroup = new THREE.Group();
      outpostGroup.position.set(50, 0, 50);

      // Main Bastion Tower
      const towerGeo = new THREE.CylinderGeometry(8, 10, 16, 8);
      const towerMat = new THREE.MeshStandardMaterial({
        color: 0x0d121f,
        roughness: 0.3,
        metalness: 0.8
      });
      const tower = new THREE.Mesh(towerGeo, towerMat);
      tower.position.y = 8;
      outpostGroup.add(tower);

      // Rotating Radar Dish
      const dishGeo = new THREE.SphereGeometry(3.5, 16, 8, 0, Math.PI);
      const dishMat = new THREE.MeshBasicMaterial({ color: 0xffd700, wireframe: true });
      this.radarDish = new THREE.Mesh(dishGeo, dishMat);
      this.radarDish.position.set(0, 18, 0);
      outpostGroup.add(this.radarDish);

      // Gold Holographic Banner
      const bannerGeo = new THREE.PlaneGeometry(16, 3);
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
      bCtx.font = 'bold 36px monospace';
      bCtx.textAlign = 'center';
      bCtx.fillText('⚡ IMXNOOBX WEAPONRY ⚡', 256, 75);

      const bannerTex = new THREE.CanvasTexture(bannerCanvas);
      const bannerMesh = new THREE.Mesh(bannerGeo, new THREE.MeshBasicMaterial({ map: bannerTex }));
      bannerMesh.position.set(0, 14, 8.5);
      outpostGroup.add(bannerMesh);

      this.scene.add(outpostGroup);
    }

    buildPlayerAndVehicles() {
      // Root Player Container
      this.player.mesh = new THREE.Group();
      this.player.pos.set(0, 0.5, 20);
      this.player.mesh.position.copy(this.player.pos);
      this.scene.add(this.player.mesh);

      // Build Vehicle Models into vehicleMeshes dict
      this.vehicleMeshes.foot = this.createHumanoidModel();
      this.vehicleMeshes.supercar = this.createSupercarModel();
      this.vehicleMeshes.bike = this.createMotorbikeModel();
      this.vehicleMeshes.bicycle = this.createBicycleModel();
      this.vehicleMeshes.jet = this.createJetModel();
      this.vehicleMeshes.hovercraft = this.createHovercraftModel();
      this.vehicleMeshes.parachute = this.createParachuteModel();
      this.vehicleMeshes.submarine = this.createSubmarineModel();

      // Attach active vehicle
      this.applyVehicleMesh(this.player.vehicleType);

      // Overhead 3D Holographic GitHub Nameplate
      this.createOverheadNameplate();
    }

    createHumanoidModel() {
      const group = new THREE.Group();

      // Torso
      const torsoGeo = new THREE.BoxGeometry(0.8, 1.2, 0.5);
      const cyberArmorMat = new THREE.MeshStandardMaterial({ color: 0x0a101d, metalness: 0.8, roughness: 0.3 });
      const torso = new THREE.Mesh(torsoGeo, cyberArmorMat);
      torso.position.y = 1.3;
      group.add(torso);

      // Head & Neon Visor
      const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      const head = new THREE.Mesh(headGeo, cyberArmorMat);
      head.position.y = 2.15;
      group.add(head);

      const visorGeo = new THREE.BoxGeometry(0.52, 0.18, 0.25);
      const visorMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
      const visor = new THREE.Mesh(visorGeo, visorMat);
      visor.position.set(0, 2.15, 0.2);
      group.add(visor);

      // Limbs
      const limbMat = new THREE.MeshStandardMaterial({ color: 0x1a2333 });
      const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.0, 0.25), limbMat);
      lArm.position.set(-0.6, 1.2, 0);
      group.add(lArm);

      const rArm = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.0, 0.25), limbMat);
      rArm.position.set(0.6, 1.2, 0);
      group.add(rArm);

      const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.1, 0.3), limbMat);
      lLeg.position.set(-0.25, 0.55, 0);
      group.add(lLeg);

      const rLeg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.1, 0.3), limbMat);
      rLeg.position.set(0.25, 0.55, 0);
      group.add(rLeg);

      return group;
    }

    createSupercarModel() {
      const car = new THREE.Group();

      // Main Chassis (Low-poly cyberpunk wedge)
      const bodyGeo = new THREE.BoxGeometry(2.3, 0.7, 4.8);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x0d1527,
        roughness: 0.2,
        metalness: 0.85
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.55;
      body.castShadow = true;
      car.add(body);

      // Cabin / Glass Cockpit
      const cabinGeo = new THREE.BoxGeometry(1.8, 0.6, 2.2);
      const cabinMat = new THREE.MeshPhysicalMaterial({
        color: 0x00f0ff,
        roughness: 0.1,
        metalness: 0.9,
        transparent: true,
        opacity: 0.7
      });
      const cabin = new THREE.Mesh(cabinGeo, cabinMat);
      cabin.position.set(0, 1.05, -0.2);
      car.add(cabin);

      // Rear Spoiler / Wing
      const wingGeo = new THREE.BoxGeometry(2.4, 0.1, 0.6);
      const wingMat = new THREE.MeshStandardMaterial({ color: 0xff007f });
      const wing = new THREE.Mesh(wingGeo, wingMat);
      wing.position.set(0, 1.25, 2.1);
      car.add(wing);

      // 4 Wheels
      const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.4, 16);
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 });
      const rimMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

      const wheelPositions = [
        [-1.2, 0.45, 1.4], [1.2, 0.45, 1.4],
        [-1.2, 0.45, -1.4], [1.2, 0.45, -1.4]
      ];

      car.wheels = [];
      wheelPositions.forEach(pos => {
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

      // Front Headlights
      const hLightL = new THREE.SpotLight(0x00f0ff, 2.5, 40, Math.PI / 6, 0.3);
      hLightL.position.set(-0.8, 0.65, -2.4);
      hLightL.target.position.set(-0.8, 0, -20);
      car.add(hLightL);
      car.add(hLightL.target);

      const hLightR = new THREE.SpotLight(0x00f0ff, 2.5, 40, Math.PI / 6, 0.3);
      hLightR.position.set(0.8, 0.65, -2.4);
      hLightR.target.position.set(0.8, 0, -20);
      car.add(hLightR);
      car.add(hLightR.target);

      // Rear Red Taillight Bar
      const tailLight = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 0.15, 0.1),
        new THREE.MeshBasicMaterial({ color: 0xff0033 })
      );
      tailLight.position.set(0, 0.65, 2.45);
      car.add(tailLight);

      return car;
    }

    createMotorbikeModel() {
      const bike = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff007f, metalness: 0.8 });

      // Frame
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 2.2), bodyMat);
      frame.position.y = 0.65;
      bike.add(frame);

      // 2 Wheels
      const wMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
      const fWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.25, 16), wMat);
      fWheel.rotation.z = Math.PI / 2;
      fWheel.position.set(0, 0.4, -1.0);
      bike.add(fWheel);

      const rWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 16), wMat);
      rWheel.rotation.z = Math.PI / 2;
      rWheel.position.set(0, 0.45, 1.0);
      bike.add(rWheel);

      // Handlebars
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 0.08), bodyMat);
      bar.position.set(0, 1.1, -0.6);
      bike.add(bar);

      return bike;
    }

    createBicycleModel() {
      const bike = new THREE.Group();
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x38ef7d, metalness: 0.5 });

      // Slender tubes
      const topTube = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4), frameMat);
      topTube.rotation.x = Math.PI / 2;
      topTube.position.set(0, 0.8, 0);
      bike.add(topTube);

      // Wheels
      const wMat = new THREE.MeshBasicMaterial({ color: 0xaaaaaa, wireframe: true });
      const fWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.08, 12), wMat);
      fWheel.rotation.z = Math.PI / 2;
      fWheel.position.set(0, 0.35, -0.8);
      bike.add(fWheel);

      const rWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.08, 12), wMat);
      rWheel.rotation.z = Math.PI / 2;
      rWheel.position.set(0, 0.35, 0.8);
      bike.add(rWheel);

      return bike;
    }

    createJetModel() {
      const jet = new THREE.Group();
      const stealthMat = new THREE.MeshStandardMaterial({
        color: 0x161c2b,
        metalness: 0.9,
        roughness: 0.2
      });

      // Fuselage
      const body = new THREE.Mesh(new THREE.ConeGeometry(1.2, 7.5, 8), stealthMat);
      body.rotation.x = Math.PI / 2;
      body.position.y = 1.0;
      jet.add(body);

      // Delta Wings
      const wingGeo = new THREE.BoxGeometry(8.5, 0.12, 3.2);
      const wing = new THREE.Mesh(wingGeo, stealthMat);
      wing.position.set(0, 1.0, 0.5);
      jet.add(wing);

      // Twin Vertical Rudders
      const rudderMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff });
      const r1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.5, 1.2), rudderMat);
      r1.position.set(-1.2, 1.8, 2.5);
      r1.rotation.z = -0.2;
      jet.add(r1);

      const r2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.5, 1.2), rudderMat);
      r2.position.set(1.2, 1.8, 2.5);
      r2.rotation.z = 0.2;
      jet.add(r2);

      // Dual Glowing Afterburners
      const flameGeo = new THREE.ConeGeometry(0.5, 2.2, 12);
      const flameMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
      const f1 = new THREE.Mesh(flameGeo, flameMat);
      f1.rotation.x = -Math.PI / 2;
      f1.position.set(-0.6, 1.0, 3.8);
      jet.add(f1);

      const f2 = new THREE.Mesh(flameGeo, flameMat);
      f2.rotation.x = -Math.PI / 2;
      f2.position.set(0.6, 1.0, 3.8);
      jet.add(f2);

      return jet;
    }

    createHovercraftModel() {
      const craft = new THREE.Group();

      // Inflatable Cushion Skirt
      const skirtGeo = new THREE.TorusGeometry(2.4, 0.7, 12, 24);
      const skirtMat = new THREE.MeshStandardMaterial({ color: 0x1e273b, roughness: 0.9 });
      const skirt = new THREE.Mesh(skirtGeo, skirtMat);
      skirt.rotation.x = Math.PI / 2;
      skirt.scale.set(1.0, 1.6, 0.6);
      skirt.position.y = 0.6;
      craft.add(skirt);

      // Cockpit Deck
      const deck = new THREE.Mesh(
        new THREE.BoxGeometry(2.8, 0.5, 5.2),
        new THREE.MeshStandardMaterial({ color: 0x00f0ff, metalness: 0.7 })
      );
      deck.position.y = 0.9;
      craft.add(deck);

      // Twin Rear Propulsion Ducts
      const ductMat = new THREE.MeshStandardMaterial({ color: 0x111622 });
      const fan1 = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.6, 16), ductMat);
      fan1.rotation.x = Math.PI / 2;
      fan1.position.set(-0.9, 1.6, 1.9);
      craft.add(fan1);

      const fan2 = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.6, 16), ductMat);
      fan2.rotation.x = Math.PI / 2;
      fan2.position.set(0.9, 1.6, 1.9);
      craft.add(fan2);

      return craft;
    }

    createParachuteModel() {
      const chute = new THREE.Group();

      // Colorful Canopy
      const canopyGeo = new THREE.SphereGeometry(3.8, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
      const canopyMat = new THREE.MeshBasicMaterial({
        color: 0xff007f,
        wireframe: true,
        side: THREE.DoubleSide
      });
      const canopy = new THREE.Mesh(canopyGeo, canopyMat);
      canopy.position.y = 4.5;
      chute.add(canopy);

      // Suspension Lines
      const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
        const lx = Math.cos(a) * 3.5;
        const lz = Math.sin(a) * 3.5;
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 1.5, 0),
          new THREE.Vector3(lx, 4.5, lz)
        ]);
        chute.add(new THREE.Line(lineGeo, lineMat));
      }

      // Suspended Operative
      chute.add(this.createHumanoidModel());

      return chute;
    }

    createSubmarineModel() {
      const sub = new THREE.Group();
      const hullMat = new THREE.MeshStandardMaterial({
        color: 0x091424,
        metalness: 0.9,
        roughness: 0.2
      });

      // Hydrodynamic Hull
      const hull = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 6.5, 16), hullMat);
      hull.rotation.x = Math.PI / 2;
      hull.position.y = 1.0;
      sub.add(hull);

      // Conning Tower / Periscope
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 1.4), hullMat);
      tower.position.set(0, 2.2, 0);
      sub.add(tower);

      // Sonar / Headlight
      const sonarLight = new THREE.PointLight(0x00f0ff, 3.0, 50);
      sonarLight.position.set(0, 1.0, -3.5);
      sub.add(sonarLight);

      return sub;
    }

    applyVehicleMesh(type) {
      // Clear previous vehicle meshes from player root
      while (this.player.mesh.children.length > 0) {
        this.player.mesh.remove(this.player.mesh.children[0]);
      }

      this.player.vehicleType = type;
      const vModel = this.vehicleMeshes[type];
      if (vModel) {
        this.player.mesh.add(vModel);
      }

      // Re-attach overhead nameplate
      if (this.player.nameTagMesh) {
        this.player.mesh.add(this.player.nameTagMesh);
      }

      // Update vehicle specific stats
      if (type === 'foot') {
        this.player.maxSpeed = 8;
        this.player.accel = 15;
      } else if (type === 'bicycle') {
        this.player.maxSpeed = 14;
        this.player.accel = 12;
      } else if (type === 'supercar') {
        this.player.maxSpeed = 55;
        this.player.accel = 32;
      } else if (type === 'bike') {
        this.player.maxSpeed = 52;
        this.player.accel = 36;
      } else if (type === 'jet') {
        this.player.maxSpeed = 95;
        this.player.accel = 45;
        if (this.player.pos.y < 8) this.player.pos.y = 15;
      } else if (type === 'hovercraft') {
        this.player.maxSpeed = 38;
        this.player.accel = 24;
      } else if (type === 'parachute') {
        this.player.maxSpeed = 16;
        if (this.player.pos.y < 35) this.player.pos.y = 70;
      } else if (type === 'submarine') {
        this.player.maxSpeed = 22;
        this.player.accel = 15;
        this.player.pos.x = -200; // Place in water bay
        this.player.pos.y = -8;
      }

      this.updateVehicleChipsUI(type);
    }

    createOverheadNameplate() {
      const canvas = document.createElement('canvas');
      canvas.width = 384;
      canvas.height = 96;
      const ctx = canvas.getContext('2d');

      // Draw cyber badge
      ctx.fillStyle = 'rgba(6, 10, 20, 0.85)';
      ctx.fillRect(4, 4, 376, 88);
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 3;
      ctx.strokeRect(4, 4, 376, 88);

      ctx.fillStyle = '#00f0ff';
      ctx.font = 'bold 30px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`@${this.player.username}`, 192, 42);

      ctx.fillStyle = '#ffd700';
      ctx.font = '600 18px sans-serif';
      ctx.fillText('⚡ VERIFIED DEVSECOPS OPERATIVE', 192, 72);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
      this.player.nameTagMesh = new THREE.Sprite(spriteMat);
      this.player.nameTagMesh.scale.set(4, 1, 1);
      this.player.nameTagMesh.position.set(0, 3.8, 0);
      this.player.mesh.add(this.player.nameTagMesh);
    }

    updateNameplateUsername(newUsername) {
      this.player.username = newUsername;
      localStorage.setItem('ow_github_user', newUsername);
      if (this.player.nameTagMesh) {
        this.player.mesh.remove(this.player.nameTagMesh);
      }
      this.createOverheadNameplate();

      const userDisplay = document.getElementById('ow-display-username');
      const userAvatar = document.getElementById('ow-user-avatar');
      if (userDisplay) userDisplay.innerText = `@${newUsername}`;
      if (userAvatar) userAvatar.src = `https://github.com/${newUsername}.png`;
    }

    buildNPCs() {
      // 8 Autonomous NPC Cars driving in grid
      const carColors = [0xff007f, 0x00f0ff, 0xffd700, 0x38ef7d, 0x9d4edd];
      for (let i = 0; i < 8; i++) {
        const car = new THREE.Group();
        const col = carColors[i % carColors.length];
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(2.1, 0.7, 4.4),
          new THREE.MeshStandardMaterial({ color: col, metalness: 0.6 })
        );
        body.position.y = 0.55;
        car.add(body);

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
          dir: isNS ? (i < 4 ? 1 : -1) : (i < 4 ? 1 : -1),
          hackedSpeed: 0,
          exploit: 'CAN_BUS_OVERFLOW // REMOTE_ACCEL'
        });
      }

      // 10 Pedestrian Citizens
      for (let i = 0; i < 10; i++) {
        const ped = new THREE.Group();
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 1.4, 0.4),
          new THREE.MeshStandardMaterial({ color: 0x8899aa })
        );
        body.position.y = 0.9;
        ped.add(body);

        ped.position.set(
          (Math.random() - 0.5) * 160,
          0,
          (Math.random() - 0.5) * 160
        );
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
          case 'Backquote': case 'Tab':
            e.preventDefault();
            this.toggleCyberdeckIDE();
            break;
          case 'Digit1': this.applyVehicleMesh('foot'); break;
          case 'Digit2': this.applyVehicleMesh('supercar'); break;
          case 'Digit3': this.applyVehicleMesh('bike'); break;
          case 'Digit4': this.applyVehicleMesh('bicycle'); break;
          case 'Digit5': this.applyVehicleMesh('jet'); break;
          case 'Digit6': this.applyVehicleMesh('hovercraft'); break;
          case 'Digit7': this.applyVehicleMesh('parachute'); break;
          case 'Digit8': this.applyVehicleMesh('submarine'); break;
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

      // Mouse Orbit Camera
      this.canvas.addEventListener('mousedown', (e) => {
        this.mouse.isDown = true;
        this.mouse.prevX = e.clientX;
        this.mouse.prevY = e.clientY;
      });

      window.addEventListener('mouseup', () => {
        this.mouse.isDown = false;
      });

      window.addEventListener('mousemove', (e) => {
        if (!this.mouse.isDown) return;
        const dx = e.clientX - this.mouse.prevX;
        const dy = e.clientY - this.mouse.prevY;
        this.cameraOrbit.yaw -= dx * 0.005;
        this.cameraOrbit.pitch = Math.max(0.05, Math.min(1.2, this.cameraOrbit.pitch + dy * 0.005));
        this.mouse.prevX = e.clientX;
        this.mouse.prevY = e.clientY;
      });

      // Window Resize
      window.addEventListener('resize', () => {
        if (!this.container || !this.renderer || !this.camera) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight || 560;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
      });
    }

    updatePhysics(delta) {
      const p = this.player;

      // Steering
      if (this.keys.left) p.yaw += p.turnSpeed * delta;
      if (this.keys.right) p.yaw -= p.turnSpeed * delta;
      p.mesh.rotation.y = p.yaw;

      // Throttle & Acceleration
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

      // Handbrake drift
      if (this.keys.space && (p.vehicleType === 'supercar' || p.vehicleType === 'bike')) {
        p.driftFactor = Math.min(1.0, p.driftFactor + delta * 3);
        targetSpeed *= 0.4;
      } else {
        p.driftFactor = Math.max(0, p.driftFactor - delta * 2);
      }

      // Speed Interpolation
      p.speed = THREE.MathUtils.lerp(p.speed, targetSpeed, delta * 3.5);

      // Movement Vector
      const forwardDir = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), p.yaw);

      // Special Physics per Vehicle
      if (p.vehicleType === 'jet') {
        // Flight dynamics: climb/dive
        if (this.keys.forward) {
          p.pos.y = Math.min(220, p.pos.y + (this.keys.shift ? 15 : 6) * delta);
        }
        if (this.keys.backward) {
          p.pos.y = Math.max(3, p.pos.y - 12 * delta);
        }
      } else if (p.vehicleType === 'parachute') {
        // Controlled slow descent
        p.pos.y = Math.max(0.5, p.pos.y - 4.5 * delta);
        p.speed = Math.min(p.speed, 12);
      } else if (p.vehicleType === 'hovercraft') {
        // Levitating on air cushion (smooth 0.8m above ground)
        p.pos.y = 0.8 + Math.sin(Date.now() * 0.006) * 0.1;
      } else if (p.vehicleType === 'submarine') {
        // Depth controls in water
        if (this.keys.space) p.pos.y = Math.max(-25, p.pos.y - 8 * delta); // dive
        if (this.keys.shift) p.pos.y = Math.min(-1.5, p.pos.y + 8 * delta); // surface
      } else {
        // Ground lock
        p.pos.y = p.vehicleType === 'foot' ? 0 : 0.4;
      }

      // Apply forward velocity
      p.pos.addScaledVector(forwardDir, p.speed * delta);
      p.mesh.position.copy(p.pos);

      // Rotate car wheels
      if (p.vehicleType === 'supercar' && p.mesh.children[0]?.wheels) {
        p.mesh.children[0].wheels.forEach(w => {
          w.children[0].rotation.x += p.speed * delta * 2;
        });
      }

      // Update HUD
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

      // Chase Camera behind vehicle
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
      // NPC Cars Navigation & Hacking Effect
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

      // Pedestrians Wandering
      this.npcPedestrians.forEach(p => {
        const dir = new THREE.Vector3().subVectors(p.targetPos, p.mesh.position);
        if (dir.length() < 2) {
          p.targetPos.set((Math.random() - 0.5) * 180, 0, (Math.random() - 0.5) * 180);
        } else {
          dir.normalize();
          p.mesh.position.addScaledVector(dir, p.speed * delta);
        }
      });

      // Security Camera Sweep
      this.securityCameras.forEach((cam, idx) => {
        const sweep = Math.sin(Date.now() * 0.001 + idx) * 0.45;
        cam.group.rotation.y = cam.baseAngle + sweep;
      });

      // Fortress Radar
      if (this.radarDish) {
        this.radarDish.rotation.y += delta * 1.5;
      }
    }

    updateWatchDogsProfiler() {
      // Raycast or distance check for hackables
      let closestTarget = null;
      let minDistance = 35; // 35 meter range

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
          car.hackedSpeed = 48; // Accelerate wildly
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
    }

    triggerCityBlackout(durationMs) {
      this.scene.fog.color.setHex(0x000205);
      this.renderer.toneMappingExposure = 0.3;
      this.showHackFeedToast('⚠️ SCADA OVERRIDE: CITYWIDE GRID BLACKOUT INITIATED');
      setTimeout(() => {
        this.scene.fog.color.setHex(0x04060c);
        this.renderer.toneMappingExposure = 1.1;
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
      if (modal) {
        modal.style.display = this.isIDEOpen ? 'flex' : 'none';
      }
    }

    executeCyberdeckScript() {
      const editor = document.getElementById('ide-code-editor');
      const consoleOut = document.getElementById('ide-console-output');
      if (!editor || !consoleOut) return;

      const code = editor.value;
      consoleOut.innerText = `> Executing script in sandboxed context...\n`;

      try {
        // Sandboxed API exposure
        const sandboxCity = {
          triggerBlackout: (d) => this.triggerCityBlackout(d),
          hackTrafficLights: (phase) => {
            this.trafficLights.forEach(l => {
              l.phase = phase === 'ALL_GREEN' ? 'GREEN' : 'RED';
            });
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
      if (!this.radarCanvas) return;
      this.radarCtx = this.radarCanvas.getContext('2d');
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

      // Radar circles
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 58, 0, Math.PI * 2);
      ctx.arc(cx, cy, 38, 0, Math.PI * 2);
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.stroke();

      // Draw Hackable Nodes
      ctx.fillStyle = '#00ff66';
      this.trafficLights.forEach(tl => {
        const rx = cx + (tl.pos.x - this.player.pos.x) * scale;
        const ry = cy + (tl.pos.z - this.player.pos.z) * scale;
        if (Math.hypot(rx - cx, ry - cy) < 55) {
          ctx.fillRect(rx - 2, ry - 2, 4, 4);
        }
      });

      // Draw NPC Vehicles
      ctx.fillStyle = '#ff007f';
      this.npcVehicles.forEach(v => {
        const rx = cx + (v.mesh.position.x - this.player.pos.x) * scale;
        const ry = cy + (v.mesh.position.z - this.player.pos.z) * scale;
        if (Math.hypot(rx - cx, ry - cy) < 55) {
          ctx.fillRect(rx - 2, ry - 2, 4, 4);
        }
      });

      // Draw Player Arrow in center
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-this.player.yaw);
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(-4, 5);
      ctx.lineTo(4, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    initSimulatedPeers() {
      // Simulated Allied Operatives on the Grid
      this.simulatedPeers = [
        { username: 'IMXNOOBX', vehicle: 'supercar', x: 45, z: 45 },
        { username: 'torvalds', vehicle: 'jet', x: 0, z: -100 },
        { username: 'antigravity', vehicle: 'bike', x: -50, z: 20 }
      ];
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

    animate() {
      requestAnimationFrame(this.animate);
      const delta = Math.min(this.clock.getDelta(), 0.1);

      this.updatePhysics(delta);
      this.updateCamera();
      this.updateNPCs(delta);
      this.updateWatchDogsProfiler();
      this.drawRadar();

      this.renderer.render(this.scene, this.camera);
    }
  }

  // Expose global instance
  window.cyberCityEngine = new CyberCity3DEngine();

  // Helper globals for buttons
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

    if (templates[tplKey]) {
      editor.value = templates[tplKey];
    }
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

    // Simulated NPC response
    setTimeout(() => {
      const respDiv = document.createElement('div');
      respDiv.className = 'chat-msg';
      respDiv.innerHTML = `<span class="c-user" style="color: #ffd700;">@IMXNOOBX:</span> [Grid Defense] Copy that @${user}. Node telemetry synchronized.`;
      msgBox.appendChild(respDiv);
      msgBox.scrollTop = msgBox.scrollHeight;
    }, 1200);
  };
})();
