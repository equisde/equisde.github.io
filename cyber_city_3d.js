/**
 * ============================================================================
 * PARALLAX GTA ONLINE // 1:1 SURGICAL REPLICA ENGINE v9.0
 * Architecture: Three.js WebGL2 + Complete GTA Online HUD, Eyefind & Parking
 * ----------------------------------------------------------------------------
 * 1. EXACT GTA ONLINE HUD & METERS:
 *    - Top-right Cash in green ($ 1,500) & Bank balance ($ 50,000) with animated
 *      +$... and -$... floating delta indicator.
 *    - Weapon ammo counter [12 / 180] & 5 Wanted Stars blinking red/grey.
 *    - Top-center Blue RP bar & Rank Badge (RANK 24) with leveling up banner.
 *    - Bottom-left Minimap with green HP, blue Armor, and yellow Stamina bars.
 *    - Dynamic District Tag: LOS SANTOS - VINEWOOD BOULEVARD / DEL PERRO / etc.
 * 2. INTERACTION MENU [M]:
 *    - Canonical GTA Online dark vertical menu in top-left:
 *      * Vehículos: Solicitar vehículo personal, Devolver a garaje, Control de puertas.
 *      * SecuroServ: Modo Director Ejecutivo VIP.
 *      * Inventario: Snacks (curación inmediata +25 HP) & Chalecos (+50 Armor).
 *      * Modo Pasivo: Activar / Desactivar.
 *      * Suicidio ($500).
 * 3. EYEFIND INTERNET BROWSER & VEHICLE PURCHASING:
 *    - Legendary Motorsport, Southern San Andreas Super Autos, Elitás, DockTease.
 *    - View vehicle specs, select color, buy vehicle -> delivered to private garage.
 * 4. REAL VEHICLE PARKING & STREET PERSISTENCE:
 *    - When player exits vehicle [F], the car STAYS EXACTLY WHERE PARKED on the street
 *      with engine & lights turned off. Player can walk away and re-enter anytime!
 *    - NPC drivers also stop at red lights, exit parked vehicles and walk onto sidewalks.
 * 5. GUNFIRE PANIC RADIUS:
 *    - Gunshots cause pedestrians in 45m radius to scream and flee, and NPC drivers
 *      to floor the accelerator in panic.
 * ============================================================================
 */

(function() {
  'use strict';

  const HEROKU_BACKEND_URL = 'https://parallax-cyber-city-5b72da76b505.herokuapp.com';
  const STORAGE_KEY = 'parallax_gta_v_save_v2';

  const MODEL_MANIFEST = {
    // Land Vehicles
    'gta-sports-car': 'assets/models/gta-sports-car.glb',
    'gta-police-car': 'assets/models/gta-police-car.glb',
    'gta-bus': 'assets/models/gta-bus.glb',
    'sedan': 'assets/models/sedan.glb',
    'sedan-sports': 'assets/models/sedan-sports.glb',
    'suv': 'assets/models/suv.glb',
    'police': 'assets/models/police.glb',
    'taxi': 'assets/models/taxi.glb',
    'truck': 'assets/models/truck.glb',
    'ambulance': 'assets/models/ambulance.glb',
    'motorbike': 'assets/models/motorbike.glb',

    // Air & Water Vehicles
    'helicopter': 'assets/models/helicopter.glb',
    'jet-fighter': 'assets/models/jet-fighter.glb',
    'speedboat': 'assets/models/speedboat.glb',

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
    'building-tower-1': 'assets/models/building-tower-1.glb',
    'building-tower-2': 'assets/models/building-tower-2.glb',
    'building-skyscraper-a': 'assets/models/building-skyscraper-a.glb',
    'building-skyscraper-b': 'assets/models/building-skyscraper-b.glb',
    'building-skyscraper-c': 'assets/models/building-skyscraper-c.glb',
    'mansion-balcony': 'assets/models/mansion-balcony.glb',
    'mansion-columns': 'assets/models/mansion-columns.glb',
    'luxury-suite': 'assets/models/luxury-suite.glb',
    'house-suburban': 'assets/models/house-suburban.glb',
    'business-store': 'assets/models/business-store.glb',
    'business-hq': 'assets/models/business-hq.glb',

    // Props & Street Flora
    'tree-palm': 'assets/models/tree-palm.glb',
    'tree-oak': 'assets/models/tree-oak.glb',
    'tree-pine': 'assets/models/tree-pine.glb',
    'prop-traffic-light': 'assets/models/prop-traffic-light.glb',
    'prop-streetlight-double': 'assets/models/prop-streetlight-double.glb',
    'prop-stop-sign': 'assets/models/prop-stop-sign.glb',
    'prop-no-parking': 'assets/models/prop-no-parking.glb',
    'lamp-post': 'assets/models/lamp-post.glb',
    'barrier': 'assets/models/barrier.glb',
    'traffic-cone': 'assets/models/traffic-cone.glb'
  };

  function fitAndNormalizeGLB(model, targetSize, centerOrigin = true) {
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      const scale = targetSize / maxDim;
      model.scale.set(scale, scale, scale);
    }
    if (centerOrigin) {
      const center = new THREE.Vector3();
      box.getCenter(center);
      model.position.x -= center.x * model.scale.x;
      model.position.y -= box.min.y * model.scale.y;
      model.position.z -= center.z * model.scale.z;
    }
    model.traverse(node => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        if (node.material) {
          node.material.roughness = Math.min(node.material.roughness, 0.4);
          node.material.metalness = Math.max(node.material.metalness, 0.5);
          node.material.envMapIntensity = 1.35;
        }
      }
    });
    return model;
  }

  function createAsphaltRoadTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#1c222c';
    ctx.fillRect(0, 0, 1024, 1024);

    for (let i = 0; i < 28000; i++) {
      const val = Math.floor(Math.random() * 35) + 20;
      ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
      ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 2, 2);
    }

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(70, 0); ctx.lineTo(70, 1024);
    ctx.moveTo(954, 0); ctx.lineTo(954, 1024);
    ctx.stroke();

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 8;
    ctx.setLineDash([48, 36]);
    ctx.beginPath();
    ctx.moveTo(504, 0); ctx.lineTo(504, 1024);
    ctx.moveTo(520, 0); ctx.lineTo(520, 1024);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#f8fafc';
    for (let x = 110; x < 914; x += 45) {
      ctx.fillRect(x, 20, 26, 90);
      ctx.fillRect(x, 914, 26, 90);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  function createWaterTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0f3854';
    ctx.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 12) {
      ctx.fillStyle = (y % 24 === 0) ? '#1b5e7d' : '#0a2538';
      ctx.fillRect(0, y, 512, 8);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  function createSidewalkTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#64748b';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 4;
    for (let i = 0; i <= 512; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0); ctx.lineTo(i, 512);
      ctx.moveTo(0, i); ctx.lineTo(512, i);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  /**
   * Audio Engine (V8, Sirens, Radio, Squeal, Wasted, Cash Chime)
   */
  class GTAAudioEngine {
    constructor() {
      this.ctx = null;
      this.engineOsc = null;
      this.engineGain = null;
      this.sirenOsc = null;
      this.sirenGain = null;
      this.squealNoise = null;
      this.squealGain = null;
      this.heliOsc = null;
      this.heliGain = null;

      this.stations = [
        { name: 'LOS SANTOS ROCK RADIO', bpm: 128, style: 'rock' },
        { name: 'WEST COAST CLASSICS', bpm: 94, style: 'hiphop' },
        { name: 'RADIO MIRROR PARK', bpm: 120, style: 'synthwave' },
        { name: 'FLYLO CYBER FM', bpm: 140, style: 'bass' },
        { name: 'RADIO OFF', bpm: 0, style: 'off' }
      ];
      this.stationIdx = 0;
      this.radioInterval = null;
      this.isInitialized = false;
      this.audioReady = false;
      this.installUserGestureUnlock();
    }

    installUserGestureUnlock() {
      const unlock = () => {
        try {
          if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
          }
          if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().then(() => {
              this.audioReady = true;
              if (!this.radioInterval && this.stations[this.stationIdx].style !== 'off') {
                this.startRadioTrack();
              }
            }).catch(() => {});
          } else if (this.ctx && this.ctx.state === 'running') {
            this.audioReady = true;
          }
        } catch (e) {}
      };

      if (typeof window !== 'undefined') {
        ['pointerdown', 'keydown', 'touchstart', 'click'].forEach(evt => {
          window.addEventListener(evt, unlock, { once: true, passive: true });
        });
      }
    }

    init() {
      if (this.isInitialized && this.ctx) return;
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.ctx = new AudioContext();
          this.isInitialized = true;
          if (this.ctx.state === 'running') {
            this.audioReady = true;
            this.startRadioTrack();
          }
        }
      } catch (e) {}
    }

    ensureContext() {
      if (!this.ctx) this.init();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => {
          this.audioReady = true;
        }).catch(() => {});
      }
    }

    cycleRadioStation() {
      this.ensureContext();
      this.stationIdx = (this.stationIdx + 1) % this.stations.length;
      const st = this.stations[this.stationIdx];
      this.startRadioTrack();
      return st.name;
    }

    startRadioTrack() {
      if (this.radioInterval) {
        clearInterval(this.radioInterval);
        this.radioInterval = null;
      }
      const st = this.stations[this.stationIdx];
      if (st.style === 'off' || !this.ctx || this.ctx.state !== 'running') return;

      const beatMs = (60 / st.bpm) * 1000;
      let step = 0;
      this.radioInterval = setInterval(() => {
        if (!this.ctx || this.ctx.state !== 'running') {
          if (this.ctx && this.ctx.state === 'suspended') {
            clearInterval(this.radioInterval);
            this.radioInterval = null;
          }
          return;
        }
        const now = this.ctx.currentTime;
        step = (step + 1) % 16;

        if (step % 4 === 0) {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.frequency.setValueAtTime(140, now);
          osc.frequency.exponentialRampToValueAtTime(32, now + 0.12);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.15);
        }

        if (step === 4 || step === 12) {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(260, now);
          osc.frequency.exponentialRampToValueAtTime(70, now + 0.08);
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.1);
        }

        const notes = (st.style === 'rock') ? [55, 65, 73, 82] : [45, 48, 52, 58];
        const freq = notes[step % notes.length];
        const bOsc = this.ctx.createOscillator();
        const bGain = this.ctx.createGain();
        bOsc.type = (st.style === 'rock') ? 'sawtooth' : 'sine';
        bOsc.frequency.setValueAtTime(freq, now);
        bGain.gain.setValueAtTime(0.04, now);
        bGain.gain.exponentialRampToValueAtTime(0.001, now + (beatMs / 1000) * 0.8);
        bOsc.connect(bGain);
        bGain.connect(this.ctx.destination);
        bOsc.start(now);
        bOsc.stop(now + (beatMs / 1000) * 0.85);
      }, beatMs / 2);
    }

    playEngineRPM(rpmNormalized, speedKmh) {
      if (!this.ctx || this.ctx.state !== 'running') return;
      if (!this.engineOsc) {
        this.engineOsc = this.ctx.createOscillator();
        this.engineGain = this.ctx.createGain();
        this.engineOsc.type = 'sawtooth';
        this.engineGain.gain.setValueAtTime(0.04, this.ctx.currentTime);
        this.engineOsc.connect(this.engineGain);
        this.engineGain.connect(this.ctx.destination);
        this.engineOsc.start();
      }
      const baseFreq = 50 + (rpmNormalized * 140) + (Math.abs(speedKmh) * 1.6);
      this.engineOsc.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.04);
      const targetGain = Math.min(0.07, 0.02 + (Math.abs(speedKmh) / 160) * 0.05);
      this.engineGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.04);
    }

    stopEngine() {
      if (this.engineGain && this.ctx) {
        this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      }
    }

    playTireSqueal(active) {
      if (!this.ctx || this.ctx.state !== 'running') return;
      if (active && !this.squealNoise) {
        const bufferSize = this.ctx.sampleRate * 0.3;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;

        this.squealNoise = this.ctx.createBufferSource();
        this.squealNoise.buffer = buffer;
        this.squealNoise.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1600;
        filter.Q.value = 3;

        this.squealGain = this.ctx.createGain();
        this.squealGain.gain.setValueAtTime(0.07, this.ctx.currentTime);

        this.squealNoise.connect(filter);
        filter.connect(this.squealGain);
        this.squealGain.connect(this.ctx.destination);
        this.squealNoise.start();
      } else if (!active && this.squealNoise) {
        try {
          this.squealNoise.stop();
          this.squealNoise.disconnect();
          this.squealNoise = null;
        } catch (e) {}
      }
    }

    playHeliRotor(active) {
      if (!this.ctx || this.ctx.state !== 'running') return;
      if (active && !this.heliOsc) {
        this.heliOsc = this.ctx.createOscillator();
        this.heliGain = this.ctx.createGain();
        this.heliOsc.type = 'sawtooth';
        this.heliOsc.frequency.setValueAtTime(24, this.ctx.currentTime);
        this.heliGain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        this.heliOsc.connect(this.heliGain);
        this.heliGain.connect(this.ctx.destination);
        this.heliOsc.start();
      } else if (!active && this.heliOsc) {
        try {
          this.heliOsc.stop();
          this.heliOsc.disconnect();
          this.heliOsc = null;
        } catch (e) {}
      }
    }

    playWastedSound() {
      this.ensureContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(65, now);
      osc.frequency.exponentialRampToValueAtTime(18, now + 1.8);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 2.0);
    }

    playGunshot(isHeavy = false) {
      this.ensureContext();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = isHeavy ? 'triangle' : 'sawtooth';
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(isHeavy ? 190 : 340, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.18);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
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
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    }

    playCashChime() {
      this.ensureContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [987.77, 1318.51].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.2, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.25);
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
      if (!this.ctx || this.ctx.state !== 'running') return;
      if (active && !this.sirenOsc) {
        this.sirenOsc = this.ctx.createOscillator();
        this.sirenGain = this.ctx.createGain();
        this.sirenOsc.type = 'sawtooth';
        this.sirenGain.gain.setValueAtTime(0.06, this.ctx.currentTime);
        this.sirenOsc.connect(this.sirenGain);
        this.sirenGain.connect(this.ctx.destination);
        this.sirenOsc.start();
      } else if (!active && this.sirenOsc) {
        try {
          this.sirenOsc.stop();
          this.sirenOsc.disconnect();
          this.sirenOsc = null;
        } catch (e) {}
      }

      if (this.sirenOsc && active) {
        const freq = 680 + Math.sin(Date.now() / 320) * 260;
        this.sirenOsc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      }
    }
  }

  /**
   * Skidmarks & Burnout Smoke
   */
  class VehicleFXManager {
    constructor(scene) {
      this.scene = scene;
      this.skidmarks = [];
      const count = 40;
      this.smokeGeo = new THREE.BufferGeometry();
      this.smokePositions = new Float32Array(count * 3);
      this.smokeLifetimes = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        this.smokePositions[i * 3] = 0;
        this.smokePositions[i * 3 + 1] = -100;
        this.smokePositions[i * 3 + 2] = 0;
        this.smokeLifetimes[i] = 0;
      }
      this.smokeGeo.setAttribute('position', new THREE.BufferAttribute(this.smokePositions, 3));
      this.smokeMat = new THREE.PointsMaterial({ color: 0xcccccc, size: 0.65, transparent: true, opacity: 0.6 });
      this.smokePoints = new THREE.Points(this.smokeGeo, this.smokeMat);
      this.scene.add(this.smokePoints);
    }

    emitSmoke(pos) {
      for (let i = 0; i < 40; i++) {
        if (this.smokeLifetimes[i] <= 0) {
          this.smokePositions[i * 3] = pos.x + (Math.random() - 0.5) * 0.4;
          this.smokePositions[i * 3 + 1] = 0.25;
          this.smokePositions[i * 3 + 2] = pos.z + (Math.random() - 0.5) * 0.4;
          this.smokeLifetimes[i] = 0.9;
          break;
        }
      }
      this.smokeGeo.attributes.position.needsUpdate = true;
    }

    addSkidmark(x, z, yaw) {
      if (this.skidmarks.length > 60) {
        const old = this.skidmarks.shift();
        this.scene.remove(old);
      }
      const sm = new THREE.Mesh(
        new THREE.PlaneGeometry(0.32, 1.4),
        new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.7, depthWrite: false })
      );
      sm.rotation.x = -Math.PI / 2;
      sm.rotation.z = -yaw;
      sm.position.set(x, 0.04, z);
      this.scene.add(sm);
      this.skidmarks.push(sm);
    }

    update(delta) {
      let updateSmoke = false;
      for (let i = 0; i < 40; i++) {
        if (this.smokeLifetimes[i] > 0) {
          this.smokeLifetimes[i] -= delta;
          this.smokePositions[i * 3 + 1] += 0.8 * delta;
          this.smokePositions[i * 3] += (Math.random() - 0.5) * 0.2 * delta;
          updateSmoke = true;
        } else if (this.smokePositions[i * 3 + 1] > -50) {
          this.smokePositions[i * 3 + 1] = -100;
          updateSmoke = true;
        }
      }
      if (updateSmoke) this.smokeGeo.attributes.position.needsUpdate = true;
    }
  }

  /**
   * Blood Particle Pool
   */
  class BloodParticlePool {
    constructor(scene, count = 120) {
      this.scene = scene;
      this.count = count;
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

      this.geometry = new THREE.BufferGeometry();
      this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
      this.material = new THREE.PointsMaterial({ color: 0xaa0000, size: 0.32, transparent: true, opacity: 0.95 });
      this.points = new THREE.Points(this.geometry, this.material);
      this.scene.add(this.points);
    }

    spawnBurst(pos, normal, num = 16) {
      let spawned = 0;
      for (let i = 0; i < this.count && spawned < num; i++) {
        if (this.lifetimes[i] <= 0) {
          this.positions[i * 3] = pos.x + (Math.random() - 0.5) * 0.2;
          this.positions[i * 3 + 1] = pos.y + (Math.random() - 0.5) * 0.2;
          this.positions[i * 3 + 2] = pos.z + (Math.random() - 0.5) * 0.2;

          this.velocities[i].set(
            (Math.random() - 0.5) * 4.5 + (normal ? normal.x * 2 : 0),
            Math.random() * 3.8 + 1.2,
            (Math.random() - 0.5) * 4.5 + (normal ? normal.z * 2 : 0)
          );
          this.lifetimes[i] = 1.3;
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
          this.velocities[i].y -= 9.8 * delta;

          this.positions[i * 3] += this.velocities[i].x * delta;
          this.positions[i * 3 + 1] += this.velocities[i].y * delta;
          this.positions[i * 3 + 2] += this.velocities[i].z * delta;

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
      if (needsUpdate) this.geometry.attributes.position.needsUpdate = true;
    }
  }

  /**
   * Main Cyber City 3D Engine (GTA Online Surgical 1:1 Replica)
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
      this.fx = null;
      this.bloodPool = null;

      this.session = this.loadOrCreateSession();

      this.rawModels = {};
      this.pendingHolders = [];
      this.gltfLoader = null;

      this.buildings = [];
      this.colliders = [];
      this.npcPedestrians = [];
      this.npcVehicles = [];     // Land fleet
      this.npcAirUnits = [];      // Air fleet
      this.npcWaterUnits = [];    // Water fleet
      this.policeHelicopter = null;
      this.parkedVehicles = [];   // Street persistent parked cars!
      this.lootDrops = [];
      this.allies = [];

      // World & Atmosphere Simulation (24H Day/Night Cycle & Dynamic Weather)
      this.worldTime = 12.0; // Starts at 12:00 PM (Midday)
      this.timeSpeed = 0.05; // 1 real sec = 0.05 game hours (full 24h = ~8 real minutes)
      this.weatherState = 'CLEAR'; // 'CLEAR', 'RAIN', 'STORM', 'FOG'
      this.weatherTimer = 180;
      this.rainParticles = null;
      this.rainGeo = null;
      this.rainMat = null;
      this.rainPositions = null;
      this.roadMaterial = null;

      // Fuel & Gas Stations System
      this.gasStations = [];
      this.gasStationMeshes = [];

      // CCTV Surveillance Network (Watch Dogs)
      this.cctvCameras = [
        { id: 'cam_downtown', name: 'CAM-01 // DOWNTOWN FINANCIAL', x: -35, y: 13, z: 25, yaw: 0.8, pitch: -0.3 },
        { id: 'cam_bank', name: 'CAM-02 // MAZE BANK TOWER', x: 25, y: 17, z: -35, yaw: -1.2, pitch: -0.4 },
        { id: 'cam_gas', name: 'CAM-03 // RON OIL DOWNTOWN', x: -65, y: 11, z: 12, yaw: 2.4, pitch: -0.25 },
        { id: 'cam_vinewood', name: 'CAM-04 // VINEWOOD BLVD', x: 75, y: 13, z: 65, yaw: -0.6, pitch: -0.3 },
        { id: 'cam_rancho', name: 'CAM-05 // RANCHO VAGOS TURF', x: -70, y: 12, z: 125, yaw: 1.5, pitch: -0.35 },
        { id: 'cam_marina', name: 'CAM-06 // DEL PERRO MARINA', x: 135, y: 13, z: 55, yaw: -2.1, pitch: -0.28 }
      ];
      this.activeCCTV = null;
      this.cctvIndex = 0;
      this.cctvZoom = 1.0;
      this.cctvMeshes = [];

      // 24/7 Store Robbery System
      this.stores = [];
      this.activeRobbery = null;

      // Factions & Turf Wars (4 Gangs)
      this.factions = {
        vagos: { name: 'Los Santos Vagos', color: '#eab308', colorHex: 0xeab308, district: 'RANCHO & EL BURRO', x: -80, z: 110, control: 100 },
        families: { name: 'The Families', color: '#22c55e', colorHex: 0x22c55e, district: 'CHAMBERLAIN HILLS', x: 0, z: 80, control: 100 },
        sindicato: { name: 'Sindicato Portuario', color: '#06b6d4', colorHex: 0x06b6d4, district: 'DEL PERRO & DOCKS', x: 120, z: 60, control: 100 },
        merryweather: { name: 'Merryweather Tactical', color: '#ef4444', colorHex: 0xef4444, district: 'VINEWOOD & FINANCIAL', x: 60, z: -60, control: 100 }
      };
      this.playerOwnedTurfs = [];
      this.turfWarTimer = 0;
      this.activeTurfWar = null;

      // Destructible Hydrants & Pressurized Water
      this.hydrants = [];
      this.waterGeysers = [];

      // Dead Eye / Focus Mode (RDR2)
      this.isDeadEye = false;
      this.deadEyeMarked = [];

      this.cameraMode = 0;
      this.isWasted = false;
      this.isPassiveMode = false;
      this.currentTarget = null;

      // Player State with Level / RP System
      this.player = {
        group: null,
        chassis: null,
        vehicleMesh: null,
        vehicleType: 'gta-sports-car',
        inVehicle: true,

        // Rank & RP
        rank: this.session.rank || 24,
        rp: this.session.rp || 12450,
        rpToNext: this.session.rpToNext || 15000,

        // Tuning modifications
        tuning: {
          paintColor: 0xef4444,
          neonColor: 0x00f0ff,
          hasNeon: true,
          turbo: true
        },

        // Garaged Owned Vehicles
        garageVehicles: this.session.garageVehicles || [
          { type: 'gta-sports-car', name: 'Truffade Nero GT', plate: 'IMX-777' }
        ],

        x: this.session.x || 0,
        y: this.session.y || 0.8,
        z: this.session.z || 0,
        yaw: this.session.yaw || 0,
        pitch: 0,
        roll: 0,
        speed: 0,
        maxSpeed: 52,
        accel: 26,
        brake: 36,
        turnSpeed: 2.3,

        hp: this.session.hp || 100,
        armor: this.session.armor || 100,
        stamina: 100,
        cash: this.session.cash !== undefined ? this.session.cash : 1500,
        bank: this.session.bank !== undefined ? this.session.bank : 50000,
        fuel: this.session.fuel !== undefined ? this.session.fuel : 100,
        isStalled: false,
        battery: 100,
        wanted: 0,
        wantedTimer: 0,

        weaponSlot: 2, // 1: Melee, 2: Pistol, 3: Rifle
        ammoPistol: 48,
        ammoRifle: 180,

        snacks: 8,
        armors: 3,

        properties: this.session.properties || [],
        businesses: this.session.businesses || [],
        stats: this.session.stats || { kills: 0, hacks: 0, carsStolen: 0, distance: 0 }
      };

      this.keys = { forward: false, backward: false, left: false, right: false, brake: false };
      this.ufoMesh = null;
      this.socket = null;

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
          if (parsed && typeof parsed === 'object') return parsed;
        }
      } catch (e) {}

      return {
        sessionId: 'gta_' + Math.random().toString(36).substr(2, 9),
        rank: 24, rp: 12450, rpToNext: 15000,
        x: 0, y: 0.8, z: 0, yaw: 0,
        hp: 100, armor: 100, cash: 1500, bank: 50000,
        properties: [], businesses: [],
        garageVehicles: [{ type: 'gta-sports-car', name: 'Truffade Nero GT', plate: 'IMX-777' }],
        stats: { kills: 0, hacks: 0, carsStolen: 0, distance: 0 }
      };
    }

    saveSession() {
      try {
        const data = {
          sessionId: this.session.sessionId,
          rank: this.player.rank,
          rp: this.player.rp,
          rpToNext: this.player.rpToNext,
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
          garageVehicles: this.player.garageVehicles,
          stats: this.player.stats,
          savedAt: Date.now()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) {}
    }

    init(containerId, canvasId) {
      this.container = document.getElementById(containerId);
      this.canvas = document.getElementById(canvasId);
      if (!this.container || !this.canvas) return;

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x0a1122);
      this.scene.fog = new THREE.FogExp2(0x0a1122, 0.0032);

      const aspect = this.container.clientWidth / this.container.clientHeight;
      this.camera = new THREE.PerspectiveCamera(65, aspect, 0.2, 850);
      this.camera.position.set(0, 4.5, 9);

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
      this.renderer.toneMappingExposure = 1.2;

      this.setupLighting();

      this.fx = new VehicleFXManager(this.scene);
      this.bloodPool = new BloodParticlePool(this.scene, 140);

      this.setupModelRegistry();
      this.buildRealisticCity();
      this.setupGasStations();
      this.setupCCTVNetwork();
      this.setupStores();
      this.setupDestructibleHydrants();
      this.setupGangTurfs();
      this.setupFullFleetNPCTraffic();
      this.setupPedestrianSystem();
      this.setupEasterEggs();

      this.buildPlayer();
      this.setupMultiplayerSocket();
      this.setupInputListeners();

      setInterval(() => this.saveSession(), 10000);
      window.addEventListener('beforeunload', () => this.saveSession());

      this.setActive(true);
      console.log('GTA Online 1:1 Replica Engine v9.0 Running.');
    }

    setupLighting() {
      const amb = new THREE.AmbientLight(0x405578, 1.4);
      this.scene.add(amb);
      this.ambientLight = amb;

      const sun = new THREE.DirectionalLight(0xfff6e5, 2.2);
      sun.position.set(80, 160, 90);
      sun.castShadow = true;
      sun.shadow.mapSize.width = 2048;
      sun.shadow.mapSize.height = 2048;
      sun.shadow.camera.near = 10;
      sun.shadow.camera.far = 420;
      const d = 150;
      sun.shadow.camera.left = -d; sun.shadow.camera.right = d;
      sun.shadow.camera.top = d; sun.shadow.camera.bottom = -d;
      sun.shadow.bias = -0.0004;
      this.scene.add(sun);
      this.sunLight = sun;

      const fill = new THREE.DirectionalLight(0x00f0ff, 0.7);
      fill.position.set(-90, 40, -80);
      this.scene.add(fill);
      this.fillLight = fill;

      const pmrem = new THREE.PMREMGenerator(this.renderer);
      const envScene = new THREE.Scene();
      envScene.add(new THREE.HemisphereLight(0x00f0ff, 0x110522, 1.6));
      this.scene.environment = pmrem.fromScene(envScene).texture;

      this.setupDynamicAtmosphere();
    }

    setupDynamicAtmosphere() {
      // 1. Procedural Rain Particle System (2,500 particles)
      const rainCount = 2500;
      this.rainGeo = new THREE.BufferGeometry();
      this.rainPositions = new Float32Array(rainCount * 3);
      for (let i = 0; i < rainCount; i++) {
        this.rainPositions[i * 3] = (Math.random() - 0.5) * 120;
        this.rainPositions[i * 3 + 1] = Math.random() * 45;
        this.rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 120;
      }
      this.rainGeo.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));
      this.rainMat = new THREE.PointsMaterial({
        color: 0x93c5fd,
        size: 0.42,
        transparent: true,
        opacity: 0.0,
        depthWrite: false
      });
      this.rainParticles = new THREE.Points(this.rainGeo, this.rainMat);
      this.scene.add(this.rainParticles);

      // 2. Exponential Atmosphere Fog
      this.scene.fog = new THREE.FogExp2(0x7090b8, 0.0018);
    }

    updateDayNightAndWeather(delta) {
      // 1. Advance World Clock (24H Continuous Simulation)
      this.worldTime = (this.worldTime + delta * this.timeSpeed) % 24;

      // 2. Weather State Progression
      this.weatherTimer -= delta;
      if (this.weatherTimer <= 0) {
        const states = ['CLEAR', 'CLEAR', 'RAIN', 'STORM', 'FOG'];
        this.weatherState = states[Math.floor(Math.random() * states.length)];
        this.weatherTimer = 160 + Math.random() * 80;
        this.addHackFeedToast(`⛅ Clima meteorológico: ${this.weatherState}`);
      }

      // 3. Sun Orbital Trajectory & Atmosphere Lighting
      const sunAngle = (this.worldTime / 24) * Math.PI * 2 - Math.PI / 2;
      const sunHeight = Math.sin(sunAngle);
      const sunDistance = 220;

      if (this.sunLight) {
        this.sunLight.position.set(
          Math.cos(sunAngle) * sunDistance,
          Math.max(-20, sunHeight * sunDistance),
          Math.sin(sunAngle * 0.4) * 110
        );
      }

      const isNight = (this.worldTime < 5.5 || this.worldTime > 19.5);
      const isDuskDawn = (!isNight && (this.worldTime < 7.5 || this.worldTime > 18.0));

      if (isNight) {
        // Nighttime Moonlight & Deep Contrast
        if (this.sunLight) {
          this.sunLight.color.setHex(0x334466);
          this.sunLight.intensity = 0.38;
        }
        if (this.ambientLight) {
          this.ambientLight.color.setHex(0x152238);
          this.ambientLight.intensity = 0.8;
        }
        this.renderer.setClearColor(0x050a14);
        if (this.scene.fog) {
          this.scene.fog.color.setHex(0x050a14);
          this.scene.fog.density = 0.0028;
        }
        if (this.headlightL && this.player.inVehicle) {
          this.headlightL.intensity = 3.2;
          this.headlightR.intensity = 3.2;
        }
      } else if (isDuskDawn) {
        // Golden/Purple Sunset & Sunrise
        if (this.sunLight) {
          this.sunLight.color.setHex(0xff7733);
          this.sunLight.intensity = 1.6;
        }
        if (this.ambientLight) {
          this.ambientLight.color.setHex(0x5a3d52);
          this.ambientLight.intensity = 1.1;
        }
        this.renderer.setClearColor(0x3d2030);
        if (this.scene.fog) {
          this.scene.fog.color.setHex(0x3d2030);
          this.scene.fog.density = 0.0024;
        }
        if (this.headlightL && this.player.inVehicle) {
          this.headlightL.intensity = 1.8;
          this.headlightR.intensity = 1.8;
        }
      } else {
        // High Noon / Bright Daylight
        if (this.sunLight) {
          this.sunLight.color.setHex(0xfff8ee);
          this.sunLight.intensity = 2.4;
        }
        if (this.ambientLight) {
          this.ambientLight.color.setHex(0x405578);
          this.ambientLight.intensity = 1.4;
        }
        this.renderer.setClearColor(0x7090b8);
        if (this.scene.fog) {
          this.scene.fog.color.setHex(0x7090b8);
          this.scene.fog.density = (this.weatherState === 'FOG') ? 0.006 : 0.0018;
        }
        if (this.headlightL) {
          this.headlightL.intensity = 0.0;
          this.headlightR.intensity = 0.0;
        }
      }

      // 4. Rain & Storm Particles Simulation
      const isRaining = (this.weatherState === 'RAIN' || this.weatherState === 'STORM');
      if (this.rainParticles && this.rainMat) {
        if (isRaining) {
          this.rainMat.opacity = this.weatherState === 'STORM' ? 0.8 : 0.45;
          const pos = this.rainPositions;
          const px = this.player.x, pz = this.player.z;
          for (let i = 0; i < 2500; i++) {
            pos[i * 3 + 1] -= delta * 45;
            if (pos[i * 3 + 1] < 0) {
              pos[i * 3 + 1] = 42 + Math.random() * 4;
              pos[i * 3] = px + (Math.random() - 0.5) * 110;
              pos[i * 3 + 2] = pz + (Math.random() - 0.5) * 110;
            }
          }
          this.rainGeo.attributes.position.needsUpdate = true;

          // Wet asphalt reflections
          if (this.roadMaterial) {
            this.roadMaterial.roughness = 0.16;
            this.roadMaterial.metalness = 0.78;
          }
        } else {
          this.rainMat.opacity = 0.0;
          if (this.roadMaterial) {
            this.roadMaterial.roughness = 0.85;
            this.roadMaterial.metalness = 0.15;
          }
        }
      }
    }

    setupGasStations() {
      this.gasStations = [
        { id: 'ron_downtown', name: 'RON OIL DOWNTOWN', x: -65, z: 0, price: 50 },
        { id: 'ltd_east', name: 'LTD GASOLINE EAST', x: 75, z: -70, price: 50 },
        { id: 'globe_south', name: 'GLOBE OIL SOUTH', x: -65, z: 140, price: 50 },
        { id: 'xero_west', name: 'XERO GAS MARINA', x: 140, z: 70, price: 50 }
      ];

      this.gasStationMeshes = [];

      this.gasStations.forEach(gs => {
        const stationGroup = new THREE.Group();
        stationGroup.position.set(gs.x, 0, gs.z);

        // Canopy roof
        const canopyGeo = new THREE.BoxGeometry(22, 1.2, 14);
        const canopyMat = new THREE.MeshStandardMaterial({
          color: 0xd92626,
          roughness: 0.35,
          metalness: 0.5
        });
        const canopy = new THREE.Mesh(canopyGeo, canopyMat);
        canopy.position.set(0, 5.8, 0);
        canopy.castShadow = true;
        canopy.receiveShadow = true;
        stationGroup.add(canopy);

        // Canopy Pillars (Support columns)
        const pillarGeo = new THREE.CylinderGeometry(0.4, 0.4, 5.8, 16);
        const pillarMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5, metalness: 0.4 });
        [[-8, -4], [-8, 4], [8, -4], [8, 4]].forEach(([px, pz]) => {
          const pillar = new THREE.Mesh(pillarGeo, pillarMat);
          pillar.position.set(px, 2.9, pz);
          pillar.castShadow = true;
          stationGroup.add(pillar);
        });

        // Fuel Island Curb
        const islandGeo = new THREE.BoxGeometry(16, 0.35, 4.5);
        const islandMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 });
        const island = new THREE.Mesh(islandGeo, islandMat);
        island.position.set(0, 0.175, 0);
        island.receiveShadow = true;
        stationGroup.add(island);

        // 2 Fuel Dispenser Pumps
        [-4.5, 4.5].forEach(pumpX => {
          const pumpGroup = new THREE.Group();
          pumpGroup.position.set(pumpX, 0.35, 0);

          const baseGeo = new THREE.BoxGeometry(1.6, 2.4, 1.1);
          const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.7 });
          const pumpBase = new THREE.Mesh(baseGeo, baseMat);
          pumpBase.position.y = 1.2;
          pumpBase.castShadow = true;
          pumpGroup.add(pumpBase);

          // Digital meter screen
          const screenGeo = new THREE.PlaneGeometry(0.8, 0.5);
          const screenMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
          const screen = new THREE.Mesh(screenGeo, screenMat);
          screen.position.set(0, 1.5, 0.56);
          pumpGroup.add(screen);

          // Hose detail
          const nozzleGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8);
          const nozzleMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3 });
          const nozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
          nozzle.position.set(0.7, 1.1, 0);
          nozzle.rotation.z = Math.PI / 6;
          pumpGroup.add(nozzle);

          stationGroup.add(pumpGroup);
        });

        // Illuminated RON OIL Signboard
        const signCanvas = document.createElement('canvas');
        signCanvas.width = 512; signCanvas.height = 128;
        const sctx = signCanvas.getContext('2d');
        sctx.fillStyle = '#b91c1c';
        sctx.fillRect(0, 0, 512, 128);
        sctx.fillStyle = '#ffffff';
        sctx.font = 'bold 50px sans-serif';
        sctx.textAlign = 'center';
        sctx.textBaseline = 'middle';
        sctx.fillText('RON OIL 24H', 256, 64);
        const signTex = new THREE.CanvasTexture(signCanvas);
        const signMat = new THREE.MeshBasicMaterial({ map: signTex });
        const signGeo = new THREE.PlaneGeometry(10, 2.2);
        const signF = new THREE.Mesh(signGeo, signMat);
        signF.position.set(0, 5.8, 7.02);
        stationGroup.add(signF);
        const signB = new THREE.Mesh(signGeo, signMat);
        signB.position.set(0, 5.8, -7.02);
        signB.rotation.y = Math.PI;
        stationGroup.add(signB);

        // Ground Refueling Trigger Zone (Glowing Circle)
        const ringGeo = new THREE.RingGeometry(3.5, 4.0, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide, transparent: true, opacity: 0.65 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(0, 0.05, 0);
        stationGroup.add(ring);

        // Store building
        const store = this.instantiateGLB('business-store', 18, true);
        store.position.set(0, 0, -16);
        stationGroup.add(store);

        this.scene.add(stationGroup);
        this.gasStationMeshes.push(stationGroup);
      });
    }

    checkAndExecuteRefuel() {
      if (!this.gasStations) return false;
      const px = this.player.x, pz = this.player.z;
      for (let gs of this.gasStations) {
        const dist = Math.hypot(px - gs.x, pz - gs.z);
        if (dist < 7.5) {
          if (this.player.fuel >= 99.5) {
            this.addHackFeedToast(`⛽ ${gs.name}: Depósito ya está lleno (100%)`);
            return true;
          }
          const cost = gs.price || 50;
          if (this.player.cash >= cost) {
            this.addCash(-cost);
            this.player.fuel = 100.0;
            this.player.isStalled = false;
            this.audio.playCashChime();
            this.addHackFeedToast(`⛽ ${gs.name}: Repostaje completado (-$${cost}) Tanque lleno 100%`);
            return true;
          } else if (this.player.bank >= cost) {
            this.deductBank(cost);
            this.player.fuel = 100.0;
            this.player.isStalled = false;
            this.audio.playCashChime();
            this.addHackFeedToast(`⛽ ${gs.name}: Repostado con Maze Bank (-$${cost}) Tanque lleno 100%`);
            return true;
          } else {
            this.addHackFeedToast(`⚠️ FONDOS INSUFICIENTES: Necesitas $${cost} para repostar.`);
            return true;
          }
        }
      }
      return false;
    }

    setupCCTVNetwork() {
      this.cctvMeshes = [];
      const camBodyGeo = new THREE.BoxGeometry(0.6, 0.45, 0.85);
      const camBodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.8 });
      const lensGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.4, 16);
      const lensMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
      const ledMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });

      this.cctvCameras.forEach((cam, idx) => {
        const group = new THREE.Group();
        group.position.set(cam.x, cam.y, cam.z);
        group.rotation.y = cam.yaw;

        const body = new THREE.Mesh(camBodyGeo, camBodyMat);
        body.castShadow = true;
        group.add(body);

        const lens = new THREE.Mesh(lensGeo, lensMat);
        lens.rotation.x = Math.PI / 2;
        lens.position.set(0, 0, 0.5);
        group.add(lens);

        const led = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), ledMat);
        led.position.set(0.22, 0.16, 0.42);
        group.add(led);

        // Mount arm
        const armGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.2, 8);
        const arm = new THREE.Mesh(armGeo, camBodyMat);
        arm.position.set(0, -0.6, -0.3);
        group.add(arm);

        this.scene.add(group);
        this.cctvMeshes.push(group);
      });
    }

    enterCCTV(index = 0) {
      if (this.cctvCameras.length === 0) return;
      this.cctvIndex = (index + this.cctvCameras.length) % this.cctvCameras.length;
      this.activeCCTV = this.cctvCameras[this.cctvIndex];
      this.cctvZoom = 1.0;

      const overlay = document.getElementById('cctv-overlay');
      if (overlay) overlay.style.display = 'block';

      const nameEl = document.getElementById('cctv-cam-name');
      if (nameEl) nameEl.textContent = this.activeCCTV.name;

      this.audio.playHackChirp();
      this.addHackFeedToast(`📹 CONECTADO A CÁMARA ctOS: ${this.activeCCTV.name}`);
    }

    hopCCTV() {
      if (!this.activeCCTV) return;
      this.enterCCTV(this.cctvIndex + 1);
    }

    exitCCTV() {
      if (!this.activeCCTV) return;
      this.activeCCTV = null;
      const overlay = document.getElementById('cctv-overlay');
      if (overlay) overlay.style.display = 'none';

      this.camera.fov = 65;
      this.camera.updateProjectionMatrix();
      this.audio.playHackChirp();
      this.addHackFeedToast('📹 DESCONECTADO DE RED CCTV ctOS // VISTA RETORNADA');
    }

    setupStores() {
      this.stores = [
        {
          id: 'store_downtown',
          name: '24/7 DOWNTOWN SUPERMARKET',
          x: -65,
          z: -16,
          cashier: {
            x: -65,
            z: -16,
            intimidation: 0,
            state: 'IDLE',
            cashLoot: 2400,
            hasDroppedLoot: false,
            mesh: null
          }
        },
        {
          id: 'store_vinewood',
          name: '24/7 VINEWOOD CONVENIENCE',
          x: 75,
          z: -86,
          cashier: {
            x: 75,
            z: -86,
            intimidation: 0,
            state: 'IDLE',
            cashLoot: 3100,
            hasDroppedLoot: false,
            mesh: null
          }
        },
        {
          id: 'store_docks',
          name: '24/7 DEL PERRO HARBOR STORE',
          x: -65,
          z: 124,
          cashier: {
            x: -65,
            z: 124,
            intimidation: 0,
            state: 'IDLE',
            cashLoot: 1950,
            hasDroppedLoot: false,
            mesh: null
          }
        }
      ];

      this.stores.forEach(store => {
        // Cashier NPC behind counter
        const cashierMesh = this.instantiateGLB('character-male', 2.0, true);
        cashierMesh.position.set(store.cashier.x, 0, store.cashier.z);
        this.scene.add(cashierMesh);
        store.cashier.mesh = cashierMesh;

        // Counter Desk
        const counterGeo = new THREE.BoxGeometry(4.0, 1.1, 1.2);
        const counterMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
        const counter = new THREE.Mesh(counterGeo, counterMat);
        counter.position.set(store.cashier.x, 0.55, store.cashier.z + 1.2);
        counter.castShadow = true;
        this.scene.add(counter);

        // Cash Register
        const regGeo = new THREE.BoxGeometry(0.8, 0.5, 0.6);
        const regMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.8 });
        const reg = new THREE.Mesh(regGeo, regMat);
        reg.position.set(store.cashier.x, 1.35, store.cashier.z + 1.2);
        this.scene.add(reg);
      });
    }

    updateStoreRobberies(delta) {
      if (this.isWasted) return;
      const px = this.player.x, pz = this.player.z;
      const robberyHud = document.getElementById('store-robbery-hud');
      const robberyFill = document.getElementById('robbery-bar-fill');
      const robberyVal = document.getElementById('robbery-intimidation-val');
      const robberyStatus = document.getElementById('robbery-status-text');

      let inStoreZone = false;

      for (let store of this.stores) {
        const c = store.cashier;
        const dist = Math.hypot(px - c.x, pz - c.z);

        if (dist < 6.5) {
          inStoreZone = true;

          // Check if player has a firearm drawn
          const hasWeaponDrawn = (this.player.weaponSlot === 2 || this.player.weaponSlot === 3);

          if (hasWeaponDrawn && c.state !== 'ROBBED') {
            if (robberyHud) robberyHud.style.display = 'block';

            // Increase intimidation rapidly when aiming
            c.intimidation = Math.min(100, c.intimidation + delta * 38);

            if (robberyFill) robberyFill.style.width = `${c.intimidation}%`;
            if (robberyVal) robberyVal.textContent = `${Math.round(c.intimidation)}%`;

            if (c.mesh) {
              c.mesh.position.y = 0.15;
              c.mesh.rotation.y = Math.atan2(px - c.x, pz - c.z);
            }

            if (c.intimidation >= 100 && !c.hasDroppedLoot) {
              c.hasDroppedLoot = true;
              c.state = 'ROBBED';

              // Drop cash loot bag
              this.spawnLootBag(c.x, c.z + 1.2, c.cashLoot);
              this.audio.playCashChime();

              // Silent Alarm triggers 2 Wanted Stars
              this.addWantedHeat(2);
              this.addHackFeedToast(`🚨 ${store.name}: ¡El cajero pulsó la alarma silenciosa! Patrullas en camino.`);
              if (robberyStatus) robberyStatus.textContent = '¡BOTÍN EN EL MOSTRADOR! CÓGELO Y HUYE.';
            }
          } else if (c.state === 'ROBBED') {
            if (robberyStatus) robberyStatus.textContent = 'TIENDA ROBADA. POLICÍA EN CAMINO.';
          } else {
            // Weapon put away - intimidation decays
            c.intimidation = Math.max(0, c.intimidation - delta * 20);
            if (robberyFill) robberyFill.style.width = `${c.intimidation}%`;
            if (robberyVal) robberyVal.textContent = `${Math.round(c.intimidation)}%`;
          }
          break;
        }
      }

      if (!inStoreZone && robberyHud) {
        robberyHud.style.display = 'none';
      }
    }

    setupDestructibleHydrants() {
      this.hydrants = [
        { x: -18, z: -25, broken: false, mesh: null },
        { x: 18, z: 25, broken: false, mesh: null },
        { x: -55, z: 50, broken: false, mesh: null },
        { x: 55, z: -50, broken: false, mesh: null },
        { x: -88, z: 88, broken: false, mesh: null },
        { x: 88, z: -88, broken: false, mesh: null },
        { x: -18, z: 120, broken: false, mesh: null },
        { x: 120, z: -18, broken: false, mesh: null }
      ];

      const baseGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.9, 12);
      const topGeo = new THREE.SphereGeometry(0.26, 12, 12);
      const nozzleGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.7, 8);
      const hydMat = new THREE.MeshStandardMaterial({ color: 0xd92626, roughness: 0.35, metalness: 0.6 });

      this.hydrants.forEach(h => {
        const group = new THREE.Group();
        group.position.set(h.x, 0.45, h.z);

        const base = new THREE.Mesh(baseGeo, hydMat);
        base.castShadow = true;
        group.add(base);

        const top = new THREE.Mesh(topGeo, hydMat);
        top.position.y = 0.45;
        group.add(top);

        const nozzle = new THREE.Mesh(nozzleGeo, hydMat);
        nozzle.rotation.z = Math.PI / 2;
        nozzle.position.y = 0.25;
        group.add(nozzle);

        this.scene.add(group);
        h.mesh = group;
      });
    }

    burstHydrant(h) {
      if (h.broken) return;
      h.broken = true;

      if (h.mesh) {
        h.mesh.position.y = 1.4;
        h.mesh.rotation.x = Math.PI / 3;
        h.mesh.rotation.z = Math.PI / 4;
      }

      // Create pressurized vertical water geyser
      const count = 450;
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);
      const vels = new Float32Array(count * 3);

      for (let i = 0; i < count; i++) {
        pos[i * 3] = h.x + (Math.random() - 0.5) * 0.4;
        pos[i * 3 + 1] = Math.random() * 8.0;
        pos[i * 3 + 2] = h.z + (Math.random() - 0.5) * 0.4;

        vels[i * 3] = (Math.random() - 0.5) * 2.2;
        vels[i * 3 + 1] = 12 + Math.random() * 8;
        vels[i * 3 + 2] = (Math.random() - 0.5) * 2.2;
      }

      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({
        color: 0x93c5fd,
        size: 0.55,
        transparent: true,
        opacity: 0.8,
        depthWrite: false
      });

      const points = new THREE.Points(geo, mat);
      this.scene.add(points);

      this.waterGeysers.push({
        points,
        geo,
        pos,
        vels,
        originX: h.x,
        originZ: h.z,
        timer: 35
      });

      this.addHackFeedToast('🌊 ¡BOCA DE INCENDIO DESTROZADA! Géiser de agua presurizada.');
    }

    updateWaterGeysers(delta) {
      for (let i = this.waterGeysers.length - 1; i >= 0; i--) {
        const g = this.waterGeysers[i];
        g.timer -= delta;

        const pos = g.pos;
        const vels = g.vels;
        const count = pos.length / 3;

        for (let j = 0; j < count; j++) {
          pos[j * 3] += vels[j * 3] * delta;
          pos[j * 3 + 1] += vels[j * 3 + 1] * delta;
          pos[j * 3 + 2] += vels[j * 3 + 2] * delta;

          vels[j * 3 + 1] -= delta * 24;

          if (pos[j * 3 + 1] < 0.1) {
            pos[j * 3] = g.originX + (Math.random() - 0.5) * 0.4;
            pos[j * 3 + 1] = 0.2;
            pos[j * 3 + 2] = g.originZ + (Math.random() - 0.5) * 0.4;
            vels[j * 3 + 1] = 14 + Math.random() * 8;
          }
        }

        g.geo.attributes.position.needsUpdate = true;

        if (g.timer <= 0) {
          this.scene.remove(g.points);
          this.waterGeysers.splice(i, 1);
        }
      }
    }

    setupGangTurfs() {
      const gangConfigs = [
        { faction: 'vagos', x: -85, z: 105, weapon: 'weapon-pistol' },
        { faction: 'vagos', x: -75, z: 120, weapon: 'weapon-rifle' },
        { faction: 'families', x: 5, z: 85, weapon: 'weapon-pistol' },
        { faction: 'families', x: -10, z: 75, weapon: 'weapon-rifle' },
        { faction: 'sindicato', x: 125, z: 55, weapon: 'weapon-pistol' },
        { faction: 'sindicato', x: 115, z: 70, weapon: 'weapon-rifle' },
        { faction: 'merryweather', x: 65, z: -55, weapon: 'weapon-rifle' },
        { faction: 'merryweather', x: 55, z: -70, weapon: 'weapon-rifle' }
      ];

      gangConfigs.forEach(g => {
        const ped = {
          mesh: this.instantiateGLB('char-gangster', 2.0, true),
          name: `Pandillero (${g.faction.toUpperCase()})`,
          type: 'gangster',
          faction: g.faction,
          x: g.x,
          z: g.z,
          hp: 120,
          respect: -25,
          hostility: 60,
          isDead: false,
          isCrawling: false,
          isDisarmed: false,
          isAlly: false,
          isFleeing: false,
          walkSpeed: 1.2,
          speed: 1.2,
          dir: Math.random() * Math.PI * 2,
          targetPos: new THREE.Vector3(g.x + (Math.random() - 0.5) * 16, 0, g.z + (Math.random() - 0.5) * 16),
          cash: 250 + Math.floor(Math.random() * 400),
          bank: 1500 + Math.floor(Math.random() * 3000)
        };
        ped.mesh.position.set(g.x, 0, g.z);
        this.scene.add(ped.mesh);
        this.npcPedestrians.push(ped);
      });
    }

    triggerTurfWar(factionKey) {
      if (this.activeTurfWar) return;
      this.activeTurfWar = factionKey;

      const f = this.factions[factionKey];
      const banner = document.getElementById('turf-war-banner');
      const tag = document.getElementById('turf-war-faction-tag');

      if (banner) {
        banner.style.display = 'block';
        if (tag) tag.innerHTML = `Distrito: <b>${f.district}</b> (${f.name})<br/>Elimina los refuerzos para capturar el territorio.`;
        setTimeout(() => { banner.style.display = 'none'; }, 6000);
      }

      this.addHackFeedToast(`⚔️ GUERRA DE BANDAS INICIADA: ${f.name}`);
      this.addWantedHeat(1);
    }

    toggleDeadEye() {
      this.isDeadEye = !this.isDeadEye;
      const overlay = document.getElementById('dead-eye-overlay');
      if (overlay) overlay.style.display = this.isDeadEye ? 'block' : 'none';

      if (this.isDeadEye) {
        this.audio.playHackChirp();
        this.addHackFeedToast('🎯 DEAD EYE / FOCUS ACTIVADO // CÁMARA LENTA (0.25x)');
      } else {
        if (this.deadEyeMarked.length > 0) {
          this.deadEyeMarked.forEach(target => {
            this.killPedestrian(target, 'dead_eye');
          });
          this.deadEyeMarked = [];
          this.audio.playGunshot(true);
        }
        this.addHackFeedToast('🎯 DEAD EYE DESACTIVADO // DISPAROS EJECUTADOS');
      }
    }

    setupModelRegistry() {
      if (!window.THREE || !window.THREE.GLTFLoader) return;
      this.gltfLoader = new THREE.GLTFLoader();

      Object.keys(MODEL_MANIFEST).forEach(key => {
        this.gltfLoader.load(MODEL_MANIFEST[key], (gltf) => {
          this.rawModels[key] = gltf.scene;

          for (let i = this.pendingHolders.length - 1; i >= 0; i--) {
            const req = this.pendingHolders[i];
            if (req.key === key && req.holder) {
              while (req.holder.children.length > 0) req.holder.remove(req.holder.children[0]);
              const cloned = gltf.scene.clone(true);
              fitAndNormalizeGLB(cloned, req.targetSize, req.centerOrigin);
              req.holder.add(cloned);
              this.pendingHolders.splice(i, 1);
            }
          }

          if (this.player.vehicleType === key && this.player.chassis) {
            this.applyVehicleMesh(key);
          }
        }, undefined, () => {});
      });
    }

    instantiateGLB(key, targetSize, centerOrigin = true) {
      const group = new THREE.Group();
      if (this.rawModels[key]) {
        const cloned = this.rawModels[key].clone(true);
        fitAndNormalizeGLB(cloned, targetSize, centerOrigin);
        group.add(cloned);
      } else {
        this.pendingHolders.push({ holder: group, key, targetSize, centerOrigin });
        const proxy = new THREE.Mesh(
          new THREE.BoxGeometry(targetSize * 0.6, targetSize * 0.4, targetSize * 0.8),
          new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 })
        );
        proxy.position.y = (targetSize * 0.4) / 2;
        group.add(proxy);
      }
      return group;
    }

    buildPlayer() {
      this.playerGroup = new THREE.Group();
      this.playerGroup.position.set(this.player.x, this.player.y, this.player.z);
      this.playerGroup.rotation.y = this.player.yaw;
      this.scene.add(this.playerGroup);

      this.playerChassis = new THREE.Group();
      this.playerGroup.add(this.playerChassis);
      this.player.chassis = this.playerChassis;

      this.headlightL = new THREE.SpotLight(0xfffae0, 2.6, 60, Math.PI / 7, 0.45, 1.2);
      this.headlightR = new THREE.SpotLight(0xfffae0, 2.6, 60, Math.PI / 7, 0.45, 1.2);
      this.headlightL.position.set(-0.75, 0.6, -1.8);
      this.headlightR.position.set(0.75, 0.6, -1.8);

      const targetL = new THREE.Object3D(); targetL.position.set(-0.75, 0, -25);
      const targetR = new THREE.Object3D(); targetR.position.set(0.75, 0, -25);
      this.playerChassis.add(targetL); this.playerChassis.add(targetR);
      this.headlightL.target = targetL; this.headlightR.target = targetR;
      this.playerChassis.add(this.headlightL); this.playerChassis.add(this.headlightR);

      this.tailLight = new THREE.PointLight(0xff0022, 0.8, 8);
      this.tailLight.position.set(0, 0.65, 2.2);
      this.playerChassis.add(this.tailLight);

      this.underglowLight = new THREE.PointLight(this.player.tuning.neonColor, 2.0, 6);
      this.underglowLight.position.set(0, 0.2, 0);
      this.playerChassis.add(this.underglowLight);

      this.applyVehicleMesh(this.player.vehicleType);
    }

    applyVehicleMesh(type) {
      if (this.player.vehicleMesh) {
        this.playerChassis.remove(this.player.vehicleMesh);
        this.player.vehicleMesh = null;
      }

      this.player.vehicleType = type;
      const isFoot = (type === 'foot' || type === 'char-gangster' || type === 'char-street' || type === 'char-swat');
      this.player.inVehicle = !isFoot;

      if (isFoot) {
        const charKey = (type === 'foot') ? 'char-gangster' : type;
        this.player.vehicleMesh = this.instantiateGLB(charKey, 1.85, true);
        this.player.maxSpeed = 15;
        this.player.accel = 20;
        this.headlightL.intensity = 0;
        this.headlightR.intensity = 0;
        this.tailLight.intensity = 0;
        this.underglowLight.intensity = 0;
      } else {
        this.player.vehicleMesh = this.instantiateGLB(type, 4.6, true);
        this.player.maxSpeed = (type === 'jet-fighter') ? 120 : (type === 'helicopter' ? 55 : (this.player.tuning.turbo ? 58 : 52));
        this.player.accel = (type === 'jet-fighter') ? 60 : 26;
        this.headlightL.intensity = 2.6;
        this.headlightR.intensity = 2.6;
        this.tailLight.intensity = 0.8;
        this.underglowLight.intensity = this.player.tuning.hasNeon ? 2.2 : 0;
      }

      this.playerChassis.add(this.player.vehicleMesh);
    }

    buildRealisticCity() {
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(760, 760),
        new THREE.MeshStandardMaterial({ color: 0x0f141f, roughness: 0.95 })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      this.scene.add(ground);

      const waterTex = createWaterTexture();
      waterTex.repeat.set(2, 20);
      const canal = new THREE.Mesh(
        new THREE.PlaneGeometry(55, 660),
        new THREE.MeshStandardMaterial({ map: waterTex, roughness: 0.1, metalness: 0.85, color: 0x0099ff })
      );
      canal.rotation.x = -Math.PI / 2;
      canal.position.set(-270, 0.04, 0);
      this.scene.add(canal);

      const roadTex = createAsphaltRoadTexture();
      roadTex.repeat.set(1, 14);
      const roadMat = new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.85, metalness: 0.15 });
      this.roadMaterial = roadMat;

      const blockSize = 52;
      const streetWidth = 18;
      const step = blockSize + streetWidth;

      for (let x = -210; x <= 210; x += step) {
        const road = new THREE.Mesh(new THREE.PlaneGeometry(streetWidth, 640), roadMat);
        road.rotation.x = -Math.PI / 2;
        road.position.set(x, 0.02, 0);
        road.receiveShadow = true;
        this.scene.add(road);

        for (let z = -260; z <= 260; z += 35) {
          const pL = this.instantiateGLB('tree-palm', 7.5, true); pL.position.set(x - 10.5, 0, z); this.scene.add(pL);
          const pR = this.instantiateGLB('tree-palm', 7.5, true); pR.position.set(x + 10.5, 0, z); this.scene.add(pR);
        }
      }

      for (let z = -210; z <= 210; z += step) {
        const road = new THREE.Mesh(new THREE.PlaneGeometry(540, streetWidth), roadMat);
        road.rotation.x = -Math.PI / 2;
        road.rotation.z = Math.PI / 2;
        road.position.set(0, 0.02, z);
        road.receiveShadow = true;
        this.scene.add(road);
      }

      const swTex = createSidewalkTexture();
      swTex.repeat.set(4, 4);
      const swMat = new THREE.MeshStandardMaterial({ map: swTex, roughness: 0.75 });

      for (let x = -175; x <= 175; x += step) {
        for (let z = -175; z <= 175; z += step) {
          const sw = new THREE.Mesh(new THREE.BoxGeometry(blockSize, 0.3, blockSize), swMat);
          sw.position.set(x, 0.15, z);
          sw.receiveShadow = true;
          this.scene.add(sw);

          const dist = Math.hypot(x, z);
          if (dist < 40) {
            const grass = new THREE.Mesh(new THREE.PlaneGeometry(blockSize * 0.88, blockSize * 0.88), new THREE.MeshStandardMaterial({ color: 0x1b4328, roughness: 0.9 }));
            grass.rotation.x = -Math.PI / 2; grass.position.set(x, 0.32, z); this.scene.add(grass);

            const fountain = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 1, 20), new THREE.MeshStandardMaterial({ color: 0x334155 }));
            fountain.position.set(x, 0.8, z); this.scene.add(fountain);
          } else if (dist < 130) {
            const towerKey = (Math.random() > 0.5) ? 'building-tower-1' : 'building-tower-2';
            const tower = this.instantiateGLB(towerKey, 65 + Math.random() * 25, true);
            tower.position.set(x, 0.3, z); this.scene.add(tower);
            this.colliders.push({ x, z, r: blockSize * 0.45 });
          } else if (x > 80 && z > 80) {
            const mansion = this.instantiateGLB('mansion-balcony', 16, true);
            mansion.position.set(x, 0.3, z); this.scene.add(mansion);
            this.colliders.push({ x, z, r: blockSize * 0.4 });
          } else {
            const house = this.instantiateGLB('luxury-suite', 14, true);
            house.position.set(x, 0.3, z); this.scene.add(house);
            this.colliders.push({ x, z, r: blockSize * 0.38 });
          }
        }
      }
    }

    setupFullFleetNPCTraffic() {
      const landFleet = [
        'gta-sports-car', 'sedan-sports', 'gta-police-car', 'police',
        'sedan', 'taxi', 'suv', 'truck', 'ambulance', 'gta-bus', 'motorbike'
      ];
      const roads = [-140, -70, 0, 70, 140];

      landFleet.forEach((vType, idx) => {
        const roadX = roads[idx % roads.length];
        const z = -220 + (idx * 38);

        const carGroup = this.instantiateGLB(vType, (vType === 'gta-bus' || vType === 'truck') ? 7.2 : 4.4, true);
        carGroup.position.set(roadX + 3.2, 0, z);
        this.scene.add(carGroup);

        this.npcVehicles.push({
          mesh: carGroup,
          type: vType,
          speed: (vType === 'motorbike' || vType === 'gta-sports-car') ? 22 : 14,
          roadX: roadX + 3.2,
          dirZ: (idx % 2 === 0 ? 1 : -1),
          isCarjacked: false,
          isStalled: false,
          driver: {
            name: `Piloto de ${vType.toUpperCase()} #${idx + 1}`,
            archetype: (vType.includes('police')) ? 'police' : ((vType === 'gta-sports-car') ? 'gangster' : 'civilian'),
            cash: 150 + Math.floor(Math.random() * 650),
            bank: 800 + Math.floor(Math.random() * 4500),
            hp: 100
          }
        });
      });

      // Air Units
      const heli1 = this.instantiateGLB('helicopter', 8.5, true);
      heli1.position.set(40, 48, 40);
      this.scene.add(heli1);
      this.npcAirUnits.push({ mesh: heli1, type: 'helicopter', altitude: 48, radius: 120, angle: 0, speed: 0.4 });

      const jet = this.instantiateGLB('jet-fighter', 11.0, true);
      jet.position.set(0, 115, -300);
      this.scene.add(jet);
      this.npcAirUnits.push({ mesh: jet, type: 'jet-fighter', altitude: 115, speedZ: 65 });

      // Police Chopper (Searchlight Unit on 3+ Stars)
      const policeHeli = this.instantiateGLB('helicopter', 8.5, true);
      policeHeli.position.set(0, -100, 0);
      this.scene.add(policeHeli);

      const searchlight = new THREE.SpotLight(0xffffff, 4.0, 90, Math.PI / 6, 0.35, 1.0);
      policeHeli.add(searchlight);
      const sTarget = new THREE.Object3D();
      this.scene.add(sTarget);
      searchlight.target = sTarget;

      this.policeHelicopter = { mesh: policeHeli, light: searchlight, target: sTarget, active: false };

      // Water Units
      for (let s = 0; s < 2; s++) {
        const boat = this.instantiateGLB('speedboat', 4.8, true);
        boat.position.set(-270, 0.1, -120 + s * 240);
        this.scene.add(boat);
        this.npcWaterUnits.push({ mesh: boat, speedZ: (s === 0 ? 16 : -16), type: 'speedboat' });
      }
    }

    setupPedestrianSystem() {
      const charKeys = ['char-gangster', 'char-street', 'char-swat', 'char-female-street', 'character-male'];
      for (let i = 0; i < 24; i++) {
        const cKey = charKeys[i % charKeys.length];
        const px = -170 + Math.random() * 340;
        const pz = -170 + Math.random() * 340;

        const ped = this.instantiateGLB(cKey, 1.82, true);
        ped.position.set(px, 0, pz);
        this.scene.add(ped);

        this.npcPedestrians.push({
          mesh: ped,
          name: `Ciudadano #${i + 1}`,
          type: (cKey === 'char-gangster') ? 'gangster' : (cKey === 'char-swat' ? 'swat' : 'civilian'),
          hp: 100,
          respect: (cKey === 'char-gangster') ? -10 : 10,
          hostility: (cKey === 'char-gangster') ? 35 : 0,
          isAlly: false,
          isDead: false,
          isFleeing: false,
          cash: 100 + Math.floor(Math.random() * 500),
          bank: 450 + Math.floor(Math.random() * 3800),
          walkSpeed: 1.8 + Math.random() * 1.2,
          targetPos: new THREE.Vector3(px + (Math.random() - 0.5) * 40, 0, pz + (Math.random() - 0.5) * 40)
        });
      }
    }

    /**
     * RP & Leveling System
     */
    addRP(amount, reason = '') {
      this.player.rp += amount;
      if (this.player.rp >= this.player.rpToNext) {
        this.player.rank++;
        this.player.rpToNext = Math.round(this.player.rpToNext * 1.25);
        this.audio.playCashChime();
        this.addHackFeedToast(`⭐ ¡RANGO SUPERADO! Ahora eres RANGO ${this.player.rank}`);
      }
      this.updateRPBar();
    }

    updateRPBar() {
      const rankEl = document.getElementById('gta-rank-val');
      const fillEl = document.getElementById('gta-rp-fill');
      const ptsEl = document.getElementById('gta-rp-points');
      if (rankEl) rankEl.textContent = `RANK ${this.player.rank}`;
      if (fillEl) {
        const pct = Math.min(100, Math.round((this.player.rp / this.player.rpToNext) * 100));
        fillEl.style.width = `${pct}%`;
      }
      if (ptsEl) ptsEl.textContent = `${this.player.rp.toLocaleString()} / ${this.player.rpToNext.toLocaleString()} RP`;
    }

    addCash(amount) {
      this.player.cash += amount;
      this.triggerCashDelta(amount > 0 ? `+$${amount}` : `-$${Math.abs(amount)}`, amount > 0);
    }

    deductBank(amount) {
      this.player.bank -= amount;
      this.triggerCashDelta(`-$${amount}`, false);
    }

    triggerCashDelta(text, isPositive) {
      const deltaEl = document.getElementById('gta-cash-delta');
      if (!deltaEl) return;
      deltaEl.textContent = text;
      deltaEl.style.color = isPositive ? '#22c55e' : '#ef4444';
      deltaEl.style.opacity = '1';
      deltaEl.style.transform = 'translateY(0)';
      setTimeout(() => {
        deltaEl.style.opacity = '0';
        deltaEl.style.transform = 'translateY(-12px)';
      }, 1800);
    }

    /**
     * Real Street Persistence: Leaving Vehicle Parked Exactly Where Stopped
     */
    exitCurrentVehicle() {
      if (!this.player.inVehicle) return;

      const vType = this.player.vehicleType;
      const posX = this.player.x;
      const posZ = this.player.z;
      const posYaw = this.player.yaw;

      // Instantiate permanent parked car on street
      const parkedMesh = this.instantiateGLB(vType, 4.4, true);
      parkedMesh.position.set(posX, 0, posZ);
      parkedMesh.rotation.y = posYaw;
      this.scene.add(parkedMesh);

      this.parkedVehicles.push({
        mesh: parkedMesh,
        type: vType,
        x: posX,
        z: posZ,
        yaw: posYaw,
        tuning: Object.assign({}, this.player.tuning)
      });

      // Spawn player on foot next to driver door
      this.player.x = posX + Math.cos(posYaw) * 1.8;
      this.player.z = posZ - Math.sin(posYaw) * 1.8;
      this.player.speed = 0;
      this.applyVehicleMesh('foot');

      this.addHackFeedToast('🚗 Vehículo personal estacionado en la calle. Permanece aquí para reabordar.');
    }

    enterClosestParkedVehicle() {
      let closest = null, minD = 3.6;
      for (let i = 0; i < this.parkedVehicles.length; i++) {
        const pv = this.parkedVehicles[i];
        const d = Math.hypot(this.player.x - pv.x, this.player.z - pv.z);
        if (d < minD) { minD = d; closest = { vehicle: pv, index: i }; }
      }

      if (closest) {
        const pv = closest.vehicle;
        this.scene.remove(pv.mesh);
        this.parkedVehicles.splice(closest.index, 1);

        this.player.x = pv.x;
        this.player.z = pv.z;
        this.player.yaw = pv.yaw;
        this.player.speed = 0;
        this.player.tuning = pv.tuning;
        this.applyVehicleMesh(pv.type);
        this.addHackFeedToast(`🚘 Subiste a tu ${pv.type.toUpperCase()} estacionado.`);
        return true;
      }
      return false;
    }

    triggerWastedSequence() {
      if (this.isWasted) return;
      this.isWasted = true;

      this.audio.playWastedSound();
      const banner = document.getElementById('g3d-wasted-banner');
      if (banner) banner.style.display = 'flex';

      setTimeout(() => {
        this.player.x = 0;
        this.player.y = 0.8;
        this.player.z = 30;
        this.player.hp = 100;
        this.player.armor = 100;
        this.player.speed = 0;
        this.player.wanted = 0;
        this.deductBank(500);

        if (banner) banner.style.display = 'none';
        this.isWasted = false;
        this.addHackFeedToast('🏥 Has sido dado de alta del Hospital Central (-$500).');
      }, 3400);
    }

    applyCustomTuning(paintHex, neonHex, hasNeon, turbo) {
      this.player.tuning.paintColor = paintHex;
      this.player.tuning.neonColor = neonHex;
      this.player.tuning.hasNeon = hasNeon;
      this.player.tuning.turbo = turbo;

      if (this.underglowLight) {
        this.underglowLight.color.setHex(neonHex);
        this.underglowLight.intensity = hasNeon ? 2.5 : 0;
      }
      this.player.maxSpeed = turbo ? 60 : 52;
      this.audio.playCashChime();
      this.addRP(150, 'Tuning de Los Santos Customs');
      this.addHackFeedToast('🔧 ¡Modificaciones de Los Santos Customs aplicadas con éxito!');
    }


    /* ========================================================
     * GTA ONLINE: INTERACTION MENU & PERSONAL VEHICLES
     * ======================================================== */
    requestPersonalVehicle(vType) {
      // Determine vehicle type
      let targetType = vType;
      let targetName = 'Bólido Personal';
      if (!targetType && this.player.garageVehicles && this.player.garageVehicles.length > 0) {
        targetType = this.player.garageVehicles[0].type;
        targetName = this.player.garageVehicles[0].name || targetType;
      }
      if (!targetType) {
        targetType = 'gta-sports-car';
        targetName = 'Truffade Nero GT';
      }

      // Remove previous active personal vehicle from parked list to prevent duplicates
      for (let i = this.parkedVehicles.length - 1; i >= 0; i--) {
        if (this.parkedVehicles[i].isPersonal) {
          this.scene.remove(this.parkedVehicles[i].mesh);
          this.parkedVehicles.splice(i, 1);
        }
      }

      // Spawn 6m directly ahead on the street road
      const dist = 6.0;
      const sx = this.player.x - Math.sin(this.player.yaw) * dist;
      const sz = this.player.z - Math.cos(this.player.yaw) * dist;

      const vMesh = this.instantiateGLB(targetType, 4.4, true);
      vMesh.position.set(sx, 0, sz);
      vMesh.rotation.y = this.player.yaw;
      this.scene.add(vMesh);

      this.parkedVehicles.push({
        mesh: vMesh,
        type: targetType,
        name: targetName,
        x: sx,
        z: sz,
        yaw: this.player.yaw,
        isPersonal: true,
        tuning: Object.assign({}, this.player.tuning)
      });

      this.audio.playCashChime();
      this.addHackFeedToast(`🚘 Mecánico: "He dejado tu ${targetName.toUpperCase()} aparcado justo enfrente de ti en la calzada, jefe."`);
    }

    returnPersonalVehicle() {
      let returned = false;
      if (this.player.inVehicle) {
        this.exitCurrentVehicle();
      }
      for (let i = this.parkedVehicles.length - 1; i >= 0; i--) {
        if (this.parkedVehicles[i].isPersonal) {
          this.scene.remove(this.parkedVehicles[i].mesh);
          this.parkedVehicles.splice(i, 1);
          returned = true;
        }
      }
      if (returned) {
        this.audio.playCashChime();
        this.addHackFeedToast('🚗 Tu vehículo personal ha sido devuelto a tu garaje privado.');
      } else {
        this.addHackFeedToast('ℹ️ No tienes ningún vehículo personal desplegado en la calle.');
      }
    }

    toggleVehicleDoors() {
      this.audio.playCashChime();
      this.addHackFeedToast('🚪 Puertas del vehículo personal abiertas / cerradas remotamente.');
    }

    consumeSnack(type = 'egochaser') {
      if (this.player.hp >= 100) {
        this.addHackFeedToast('🍫 Ya tienes la salud al 100%.');
        return;
      }
      this.player.hp = Math.min(100, this.player.hp + 25);
      this.audio.playCashChime();
      this.addHackFeedToast('🍫 Consumiste EgoChaser (+25 Salud)');
    }

    equipBodyArmor(type = 'super_heavy') {
      if (this.player.armor >= 100) {
        this.addHackFeedToast('🛡️ Ya tienes el blindaje al 100%.');
        return;
      }
      this.player.armor = Math.min(100, this.player.armor + 50);
      this.audio.playCashChime();
      this.addHackFeedToast('🛡️ Equipaste Chaleco Superpesado (+50 Blindaje)');
    }

    togglePassiveMode() {
      this.player.isPassive = !this.player.isPassive;
      if (this.player.isPassive) {
        this.addHackFeedToast('🕊️ Modo Pasivo ACTIVADO: Eres inmune a ataques y no puedes portar armas.');
      } else {
        this.addHackFeedToast('⚔️ Modo Pasivo DESACTIVADO: Armamento y combate habilitados.');
      }
    }

    commitSuicide() {
      if (this.player.bank < 500 && this.player.cash < 500) {
        this.addHackFeedToast('❌ No tienes los $500 requeridos para suicidio.');
        return;
      }
      if (this.player.cash >= 500) {
        this.player.cash -= 500;
        this.triggerCashDelta('-$500', false);
      } else {
        this.deductBank(500);
      }
      this.player.hp = 0;
      this.triggerWastedSequence();
      this.addHackFeedToast('💀 Has decidido suicidarte (-$500)');
    }

    toggleSecuroServCEO() {
      this.player.isCEO = !this.player.isCEO;
      if (this.player.isCEO) {
        this.addRP(250, 'Registro como Director Ejecutivo');
        this.audio.playCashChime();
        this.addHackFeedToast('💼 ¡Registrado como Director Ejecutivo VIP de SecuroServ! Menú de organización habilitado.');
      } else {
        this.addHackFeedToast('💼 Te has retirado como Director Ejecutivo de SecuroServ.');
      }
    }

    /* ========================================================
     * GTA ONLINE: EYEFIND BROWSER & VEHICLE PURCHASING
     * ======================================================== */
    buyVehicleOnline(modelKey, modelName, price, brand) {
      if (this.player.bank < price) {
        this.addHackFeedToast(`❌ FONDOS INSUFICIENTES: Necesitas $${price.toLocaleString()} en Maze Bank.`);
        return false;
      }

      this.deductBank(price);
      this.addRP(400, `Compra en ${brand}`);

      const newVeh = {
        type: modelKey,
        name: modelName,
        price: price,
        plate: 'LS-' + Math.floor(100 + Math.random() * 899),
        brand: brand
      };
      if (!this.player.garageVehicles) this.player.garageVehicles = [];
      this.player.garageVehicles.push(newVeh);
      this.saveSession();

      this.audio.playCashChime();
      this.addHackFeedToast(`🎉 ¡Compra confirmada! ${modelName} enviado a tu Garaje.`);
      return true;
    }

    toggleInteractionMenu() {
      if (typeof window.toggleGTAInteractionMenu === 'function') {
        window.toggleGTAInteractionMenu();
      } else {
        const menu = document.getElementById('gta-interaction-menu');
        if (menu) menu.style.display = (menu.style.display === 'flex') ? 'none' : 'flex';
      }
    }

    callMechanicDelivery(vType) {
      this.applyVehicleMesh(vType);
      this.audio.playCashChime();
      this.addRP(50, 'Llamada al mecánico');
      this.addHackFeedToast(`🚘 Mecánico: "Aquí tienes tu ${vType.toUpperCase()}, jefe. Listo en la calle."`);
    }

    carjackVehicle(targetCar) {
      if (!targetCar || targetCar.isCarjacked) return;
      targetCar.isCarjacked = true;

      this.audio.playPunch();
      const pos = targetCar.mesh.position;
      this.bloodPool.spawnBurst(new THREE.Vector3(pos.x + 1.2, 0.4, pos.z), null, 18);

      const driverMesh = this.instantiateGLB('char-street', 1.8, true);
      driverMesh.rotation.z = Math.PI / 2;
      driverMesh.position.set(pos.x + 2.2, 0.1, pos.z);
      this.scene.add(driverMesh);

      const driverData = targetCar.driver;
      setTimeout(() => {
        if (driverMesh && driverData) {
          driverMesh.rotation.z = 0;
          if (driverData.archetype === 'gangster' || driverData.archetype === 'police') {
            this.addHackFeedToast(`🥊 ¡${driverData.name} se levantó furioso a atacarte!`);
            this.audio.playGunshot(false);
          } else {
            this.addHackFeedToast(`🏃 ¡${driverData.name} huyó aterrorizado!`);
          }
        }
      }, 2500);

      this.player.x = pos.x;
      this.player.z = pos.z;
      this.player.speed = 6;
      this.applyVehicleMesh(targetCar.type);
      this.player.stats.carsStolen++;
      this.addWantedHeat(1);
      this.addRP(50, 'Robo de vehículo');

      const idx = this.npcVehicles.indexOf(targetCar);
      if (idx !== -1) {
        this.scene.remove(targetCar.mesh);
        this.npcVehicles.splice(idx, 1);
      }
      this.addHackFeedToast(`🚨 ¡ROBO DE VEHÍCULO EXITOSO! Tomaste el volante del ${targetCar.type.toUpperCase()}`);
    }

    socialGreet() {
      const npc = this.getClosestPedestrian(4.5);
      if (!npc || npc.isDead) {
        this.addHackFeedToast('ℹ️ No hay transeúntes cerca a quienes saludar.');
        return;
      }
      npc.respect += 15;
      this.audio.playCashChime();
      this.addRP(25, 'Saludo respetuoso');
      if (npc.respect >= 30 && !npc.isAlly) {
        npc.isAlly = true;
        this.allies.push(npc);
        this.addCash(50);
        this.addHackFeedToast(`🤝 ¡${npc.name} ahora es tu ALIADO LEAL! Te seguirá y defenderá.`);
      } else {
        this.addHackFeedToast(`🗣️ Saludaste a ${npc.name}: "¡Buenas tardes, vecino!" (+15 Respeto).`);
      }
    }

    socialAntagonize() {
      const npc = this.getClosestPedestrian(4.5);
      if (!npc || npc.isDead) {
        this.addHackFeedToast('ℹ️ No hay transeúntes cerca a quienes provocar.');
        return;
      }
      npc.hostility += 35;
      this.audio.playPunch();
      if (npc.type === 'gangster' || npc.hostility > 40) {
        this.addHackFeedToast(`🤬 ¡${npc.name} se enfureció!: "¡Te metiste con el equivocado!" (Ataque hostil)`);
        this.audio.playGunshot(false);
        this.player.hp = Math.max(0, this.player.hp - 18);
        this.bloodPool.spawnBurst(new THREE.Vector3(this.player.x, 1, this.player.z), null, 12);
        if (this.player.hp <= 0) this.triggerWastedSequence();
      } else {
        this.addHackFeedToast(`🏃 ¡${npc.name} se asustó y salió huyendo!`);
        npc.walkSpeed = 5.2;
      }
    }

    fireWeapon() {
      const isRifle = (this.player.weaponSlot === 3);
      const isPistol = (this.player.weaponSlot === 2);
      const isMelee = (this.player.weaponSlot === 1);

      if (isMelee) {
        this.audio.playPunch();
        const target = this.getClosestPedestrian(2.8);
        if (target && !target.isDead) {
          target.hp -= 40;
          this.bloodPool.spawnBurst(target.mesh.position.clone().setY(1.0), null, 16);
          if (target.hp <= 0) this.killPedestrian(target);
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

      // Gunfire Panic
      this.triggerGunfirePanic(new THREE.Vector3(this.player.x, 0, this.player.z), 45);

      const target = this.getClosestPedestrian(30);
      if (target && !target.isDead) {
        const rand = Math.random();
        const hitZone = (this.isDeadEye || rand < 0.22) ? 'head' : (rand < 0.48 ? 'leg' : (rand < 0.70 ? 'arm' : 'torso'));
        target.hp -= (isRifle ? 75 : 45);
        this.bloodPool.spawnBurst(target.mesh.position.clone().setY(hitZone === 'head' ? 1.7 : (hitZone === 'leg' ? 0.35 : 1.1)), null, 20);
        this.addWantedHeat(1);
        if (target.hp <= 0 || hitZone === 'head') {
          this.killPedestrian(target, hitZone);
        } else if (hitZone === 'leg' || hitZone === 'arm') {
          this.killPedestrian(target, hitZone);
        }
      }
    }

    triggerGunfirePanic(center, radius) {
      this.npcPedestrians.forEach(npc => {
        if (!npc.isDead && Math.hypot(npc.mesh.position.x - center.x, npc.mesh.position.z - center.z) < radius) {
          npc.isFleeing = true;
          npc.walkSpeed = 6.0;
        }
      });
      this.npcVehicles.forEach(car => {
        if (Math.hypot(car.mesh.position.x - center.x, car.mesh.position.z - center.z) < radius) {
          car.speed = 26; // Floor gas in panic
        }
      });
    }

    killPedestrian(target, hitZone = 'torso') {
      if (target.isDead) return;

      if (hitZone === 'leg' && !target.isCrawling) {
        // Anatomical Damage: Leg shot causes collapse & crawling
        target.isCrawling = true;
        target.hp = Math.max(15, target.hp - 45);
        if (target.mesh) {
          target.mesh.rotation.x = Math.PI / 2.3;
          target.mesh.position.y = 0.25;
        }
        target.walkSpeed = 0.6;
        this.bloodPool.spawnBurst(target.mesh.position.clone().setY(0.3), null, 14);
        this.addHackFeedToast('💥 ¡DISPARO EN LA PIERNA! El sospechoso cae y gatea en el suelo.');
        return;
      }

      if (hitZone === 'arm' && !target.isDisarmed) {
        // Anatomical Damage: Arm shot disarms weapon
        target.isDisarmed = true;
        target.hp = Math.max(20, target.hp - 35);
        this.spawnLootBag(target.mesh.position.x, target.mesh.position.z, 250);
        this.bloodPool.spawnBurst(target.mesh.position.clone().setY(1.1), null, 10);
        this.addHackFeedToast('💥 ¡DESARME! Disparo en el brazo hace caer su arma.');
        return;
      }

      target.isDead = true;
      target.mesh.rotation.x = Math.PI / 2;
      target.mesh.position.y = 0.2;
      this.player.stats.kills++;
      const isHead = (hitZone === 'head');
      this.addRP(isHead ? 200 : 100, isHead ? '💀 HEADSHOT (+200 RP)' : 'Baja enemiga');
      this.spawnLootBag(target.mesh.position.x, target.mesh.position.z, target.cash || 80);
      this.addHackFeedToast(`☠️ Eliminaste a ${target.name || 'Enemigo'}. ${isHead ? '¡HEADSHOT CRÍTICO!' : ''}`);

      if (target.faction) {
        this.triggerTurfWar(target.faction);
      }
    }

    spawnLootBag(x, z, amount) {
      const lootGroup = new THREE.Group();
      const bag = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35), new THREE.MeshStandardMaterial({
        color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.8, metalness: 0.4
      }));
      lootGroup.add(bag);
      lootGroup.position.set(x, 0.4, z);
      this.scene.add(lootGroup);
      this.lootDrops.push({ mesh: lootGroup, amount: amount || 200, x, z, time: 0 });
    }

    checkLootPickup() {
      for (let i = this.lootDrops.length - 1; i >= 0; i--) {
        const loot = this.lootDrops[i];
        loot.mesh.rotation.y += 0.05;
        loot.time += 0.05;
        loot.mesh.position.y = 0.4 + Math.sin(loot.time) * 0.12;

        const dist = Math.hypot(this.player.x - loot.x, this.player.z - loot.z);
        if (dist < 2.2) {
          this.addCash(loot.amount);
          this.audio.playCashChime();
          this.addRP(25, 'Botín recogido');
          this.addHackFeedToast(`💵 +$${loot.amount} Recogido del botín.`);
          this.scene.remove(loot.mesh);
          this.lootDrops.splice(i, 1);
        }
      }
    }

    updateProfilerTarget() {
      const dir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, this.player.yaw, 0));
      const pos = new THREE.Vector3(this.player.x, this.player.y + 1.2, this.player.z);

      let bestTarget = null, bestDist = 28;
      this.npcPedestrians.forEach(npc => {
        if (!npc.isDead) {
          const d = pos.distanceTo(npc.mesh.position);
          if (d < bestDist) {
            bestDist = d;
            bestTarget = { type: 'npc', entity: npc, name: npc.name, occupation: npc.type, bank: npc.bank };
          }
        }
      });

      this.npcVehicles.forEach(car => {
        const d = pos.distanceTo(car.mesh.position);
        if (d < bestDist) {
          bestDist = d;
          bestTarget = { type: 'vehicle', entity: car, name: `${car.type.toUpperCase()}`, occupation: 'Vehículo en marcha', bank: car.driver.bank };
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
      if (bankEl) bankEl.textContent = `Cuenta: $${this.currentTarget.bank}₮`;
      if (actEl) {
        actEl.textContent = (this.currentTarget.type === 'npc')
          ? '[E] VACIAR CUENTA / DISRUPCIÓN'
          : '[E] BLOQUEAR MOTOR / ACCIDENTE';
      }
    }

    executeCurrentWatchDogsHack() {
      if (this.player.battery < 15) {
        this.addHackFeedToast('🔋 Batería insuficiente para hackear.');
        return;
      }
      if (!this.currentTarget) {
        this.addHackFeedToast('ℹ️ Apunta a un objetivo para hackear.');
        return;
      }
      this.player.battery -= 15;
      this.audio.playHackChirp();
      this.player.stats.hacks++;
      this.addRP(75, 'Hackeo exitoso');

      if (this.currentTarget.type === 'npc') {
        const siphoned = Math.min(this.currentTarget.entity.bank, 480);
        this.currentTarget.entity.bank -= siphoned;
        this.addCash(siphoned);
        this.audio.playCashChime();
        this.addHackFeedToast(`⚡ CTOS HACK: Desviaste $${siphoned}₮ de ${this.currentTarget.name}.`);
      } else if (this.currentTarget.type === 'vehicle') {
        this.currentTarget.entity.isStalled = true;
        this.currentTarget.entity.speed = 0;
        this.addHackFeedToast(`🛑 CTOS MOTOR STALL: Motor desactivado del ${this.currentTarget.name}.`);
      }
    }

    setupEasterEggs() {
      const ufoGroup = new THREE.Group();
      const saucer = new THREE.Mesh(
        new THREE.CylinderGeometry(14, 18, 4, 24),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.1 })
      );
      ufoGroup.add(saucer);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(19, 0.4, 8, 32),
        new THREE.MeshBasicMaterial({ color: 0x00f0ff })
      );
      ring.rotation.x = Math.PI / 2;
      ufoGroup.add(ring);

      ufoGroup.position.set(-210, 95, -210);
      this.scene.add(ufoGroup);
      this.ufoMesh = ufoGroup;
    }

    setupMultiplayerSocket() {
      if (typeof io !== 'undefined') {
        try {
          this.socket = io(HEROKU_BACKEND_URL, { reconnectionAttempts: 3, timeout: 3000 });
          this.socket.on('connect', () => {
            this.addHackFeedToast('🌐 Conectado a la Sesión Multijugador de GTA Online.');
          });
          this.socket.on('chat:message', (data) => {
            this.addChatMessage(data.sender, data.crewTag, data.text);
          });
        } catch (e) {}
      }
    }

    sendMultiplayerChatMessage(text) {
      if (!text || text.trim() === '') return;
      this.addChatMessage('@equisde', 'IMX', text);
      if (this.socket && this.socket.connected) {
        this.socket.emit('chat:send', { text, crewTag: 'IMX' });
      }
    }

    addChatMessage(sender, crewTag, text) {
      const feed = document.getElementById('g3d-chat-feed');
      if (!feed) return;
      const msg = document.createElement('div');
      msg.className = 'chat-msg';
      msg.innerHTML = `<span style="color:#ffd700; font-weight:700;">[${crewTag}]</span> <b style="color:#00f0ff;">${sender}</b>: ${text}`;
      feed.appendChild(msg);
      feed.scrollTop = feed.scrollHeight;
    }

    getClosestPedestrian(maxDist = 4.0) {
      let closest = null, minD = maxDist;
      this.npcPedestrians.forEach(npc => {
        const d = Math.hypot(this.player.x - npc.mesh.position.x, this.player.z - npc.mesh.position.z);
        if (d < minD) { minD = d; closest = npc; }
      });
      return closest;
    }

    getClosestVehicle(maxDist = 4.0) {
      let closest = null, minD = maxDist;
      this.npcVehicles.forEach(car => {
        const d = Math.hypot(this.player.x - car.mesh.position.x, this.player.z - car.mesh.position.z);
        if (d < minD) { minD = d; closest = car; }
      });
      return closest;
    }

    addWantedHeat(stars) {
      this.player.wanted = Math.min(5, this.player.wanted + stars);
      this.player.wantedTimer = 25;
      this.audio.playSiren(this.player.wanted > 0);
    }

    addHackFeedToast(text) {
      const feed = document.getElementById('ow-hack-feed');
      if (!feed) return;
      const toast = document.createElement('div');
      toast.style.cssText = 'background: rgba(6, 11, 22, 0.92); border-left: 3px solid #00f0ff; color: #fff; padding: 6px 12px; margin-top: 4px; font-size: 0.76rem; border-radius: 4px; box-shadow: 0 0 10px rgba(0,240,255,0.3);';
      toast.textContent = text;
      feed.appendChild(toast);
      setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 4200);
    }

    setupInputListeners() {
      window.addEventListener('resize', this.onWindowResize);
      window.addEventListener('keydown', this.onKeyDown);
      window.addEventListener('keyup', this.onKeyUp);
      window.addEventListener('pointerdown', this.onPointerDown);

      const unlockAudio = () => {
        if (this.audio) this.audio.ensureContext();
      };
      ['pointerdown', 'keydown', 'touchstart', 'click'].forEach(evt => {
        window.addEventListener(evt, unlockAudio, { once: true, passive: true });
      });
    }

    onKeyDown(e) {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') this.keys.forward = true;
      if (k === 's' || k === 'arrowdown') this.keys.backward = true;
      if (k === 'a' || k === 'arrowleft') this.keys.left = true;
      if (k === 'd' || k === 'arrowright') this.keys.right = true;
      if (k === ' ' || k === 'space') this.keys.brake = true;

      // Interaction Menu [M]
      if (k === 'm') {
        this.toggleInteractionMenu();
      }

      // Weapons
      if (k === '1') { this.player.weaponSlot = 1; this.addHackFeedToast('👊 Equipaste: Puños'); }
      if (k === '2') { this.player.weaponSlot = 2; this.addHackFeedToast('🔫 Equipaste: Pistola 9mm'); }
      if (k === '3') { this.player.weaponSlot = 3; this.addHackFeedToast('💥 Equipaste: Rifle de Asalto'); }

      // Radio Station [Q]
      // CCTV Hopping [C]
      if (k === 'c') {
        if (this.activeCCTV) this.hopCCTV();
        else this.enterCCTV(0);
      }

      // Exit CCTV [Escape] or [X]
      if (k === 'escape' || k === 'x') {
        if (this.activeCCTV) this.exitCCTV();
      }

      // RDR2 Dead Eye / Focus [CapsLock]
      if (k === 'capslock') {
        this.toggleDeadEye();
      }

      if (k === 'q') {
        const name = this.audio.cycleRadioStation();
        this.addHackFeedToast(`📻 [RADIO] ${name} ♫`);
      }

      // Camera Mode [V]
      if (k === 'v') {
        this.cameraMode = (this.cameraMode + 1) % 4;
        const modes = ['CÁMARA CERCANA', 'CÁMARA AUTOPISTA', 'PRIMERA PERSONA (MORRO)', 'CÁMARA CINEMÁTICA'];
        this.addHackFeedToast(`🎥 ${modes[this.cameraMode]}`);
      }

      // Chat Input [T]
      if (k === 't') {
        const input = document.getElementById('g3d-chat-input');
        if (input) { input.focus(); e.preventDefault(); }
      }

      if (k === 'e') {
        if (this.checkAndExecuteRefuel()) return;
        this.executeCurrentWatchDogsHack();
      }
      if (k === 'g') this.socialGreet();
      if (k === 'h') this.socialAntagonize();

      // Carjacking & Street Parking [F]
      if (k === 'f') {
        if (!this.player.inVehicle) {
          // Check parked car first
          if (!this.enterClosestParkedVehicle()) {
            const closeCar = this.getClosestVehicle(3.8);
            if (closeCar) this.carjackVehicle(closeCar);
            else this.applyVehicleMesh('gta-sports-car');
          }
        } else {
          // Leave car parked exactly where stopped!
          this.exitCurrentVehicle();
        }
      }

      if (k === 'r') this.fireWeapon();
    }

    onKeyUp(e) {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') this.keys.forward = false;
      if (k === 's' || k === 'arrowdown') this.keys.backward = false;
      if (k === 'a' || k === 'arrowleft') this.keys.left = false;
      if (k === 'd' || k === 'arrowright') this.keys.right = false;
      if (k === ' ' || k === 'space') this.keys.brake = false;
    }

    onPointerDown(e) {
      if (e.target && e.target.id === 'openworld-canvas') {
        this.fireWeapon();
      }
    }

    onWindowResize() {
      if (!this.container || !this.renderer || !this.camera) return;
      const w = this.container.clientWidth, h = this.container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    }

    updatePhysics(delta) {
      if (this.isWasted) return;
      const p = this.player;

      let steerAmount = 0;
      if (this.keys.left) { p.yaw += p.turnSpeed * delta; steerAmount = 1; }
      if (this.keys.right) { p.yaw -= p.turnSpeed * delta; steerAmount = -1; }

      let isBraking = false;
      let isAccelerating = false;

      // Aquaplaning reduction when raining
      const tireGrip = (this.weatherState === 'RAIN' || this.weatherState === 'STORM') ? 0.68 : 1.0;

      if (!p.isStalled) {
        if (this.keys.forward) {
          p.speed = Math.min(p.maxSpeed, p.speed + p.accel * tireGrip * delta);
          isAccelerating = true;
        } else if (this.keys.backward) {
          p.speed = Math.max(-p.maxSpeed * 0.4, p.speed - p.accel * tireGrip * delta);
          isBraking = true;
        } else {
          p.speed *= (1 - 1.8 * delta);
        }
      } else {
        // Engine stalled - deceleration to complete stop
        p.speed *= (1 - 3.2 * delta);
        if (Math.abs(p.speed) < 0.1) p.speed = 0;
      }

      if (this.keys.brake) {
        p.speed *= (1 - 4.8 * delta);
        isBraking = true;
      }

      p.x += Math.sin(p.yaw) * p.speed * delta;
      p.z += Math.cos(p.yaw) * p.speed * delta;
      p.stats.distance += Math.abs(p.speed * delta);

      // Destructible Hydrant Collisions
      if (this.hydrants) {
        for (let h of this.hydrants) {
          if (!h.broken && Math.hypot(p.x - h.x, p.z - h.z) < 2.6) {
            if (p.inVehicle && Math.abs(p.speed) > 4.5) {
              this.burstHydrant(h);
              p.speed *= 0.85; // Kinetic impact resistance
            }
          }
        }
      }

      // Chassis Suspension Simulation (Roll & Pitch)
      if (p.inVehicle && this.playerChassis) {
        const speedNorm = Math.abs(p.speed) / p.maxSpeed;
        const targetRoll = -steerAmount * speedNorm * 0.14;
        const targetPitch = (isBraking ? 0.09 : (isAccelerating ? -0.06 : 0)) * speedNorm;

        p.roll += (targetRoll - p.roll) * 0.2;
        p.pitch += (targetPitch - p.pitch) * 0.2;

        this.playerChassis.rotation.z = p.roll;
        this.playerChassis.rotation.x = p.pitch;

        const isSkidding = (this.keys.brake || Math.abs(steerAmount) > 0.8) && Math.abs(p.speed) > 14;
        if (isSkidding) {
          this.fx.addSkidmark(p.x, p.z, p.yaw);
          this.fx.emitSmoke(new THREE.Vector3(p.x, 0.2, p.z));
          this.audio.playTireSqueal(true);
        } else {
          this.audio.playTireSqueal(false);
        }

        // Dynamic Fuel Consumption
        if (p.fuel > 0) {
          const baseIdle = 0.015;
          const speedFactor = speedNorm * 0.038;
          const throttleFactor = isAccelerating ? 0.045 : 0.0;
          const cons = (baseIdle + speedFactor + throttleFactor) * delta;
          p.fuel = Math.max(0, p.fuel - cons);

          if (p.fuel <= 0) {
            p.isStalled = true;
            this.addHackFeedToast('⚠️ MOTOR CALADO: Sin combustible. Reposta en una gasolinera o desciende a pie [F].');
          }
        }

        if (p.isStalled) {
          this.audio.stopEngine();
        } else {
          this.audio.playEngineRPM(speedNorm, p.speed * 3.6);
        }
      } else {
        this.audio.stopEngine();
        this.audio.playTireSqueal(false);
      }

      if (this.playerGroup) {
        this.playerGroup.position.set(p.x, p.y, p.z);
        this.playerGroup.rotation.y = p.yaw;
      }

      // Wanted Countdown & Police Air Support Searchlight
      if (p.wantedTimer > 0) {
        p.wantedTimer -= delta;
        if (p.wantedTimer <= 0) {
          p.wanted = Math.max(0, p.wanted - 1);
          p.wantedTimer = p.wanted > 0 ? 20 : 0;
          this.audio.playSiren(p.wanted > 0);
          if (p.wanted === 0) this.addRP(200, 'Evasión policial');
        }
      }

      if (this.policeHelicopter) {
        if (p.wanted >= 3) {
          const ph = this.policeHelicopter;
          ph.mesh.position.set(p.x + 12, 38, p.z - 15);
          ph.mesh.rotation.y += 1.8 * delta;
          ph.target.position.set(p.x, p.y, p.z);
          ph.light.intensity = 4.5;
          this.audio.playHeliRotor(true);
        } else {
          this.policeHelicopter.light.intensity = 0;
          this.policeHelicopter.mesh.position.y = -100;
          this.audio.playHeliRotor(false);
        }
      }

      if (this.ufoMesh) this.ufoMesh.rotation.y += 0.8 * delta;
    }

    updateNPCs(delta) {
      this.npcVehicles.forEach(car => {
        if (!car.isStalled) {
          car.mesh.position.z += car.speed * car.dirZ * delta;
          if (car.mesh.position.z > 240) car.mesh.position.z = -240;
          if (car.mesh.position.z < -240) car.mesh.position.z = 240;
        }
      });

      this.npcAirUnits.forEach(air => {
        if (air.type === 'helicopter') {
          air.angle += air.speed * delta;
          air.mesh.position.x = Math.cos(air.angle) * air.radius;
          air.mesh.position.z = Math.sin(air.angle) * air.radius;
          air.mesh.rotation.y = -air.angle + Math.PI / 2;
        } else if (air.type === 'jet-fighter') {
          air.mesh.position.z += air.speedZ * delta;
          if (air.mesh.position.z > 360) air.mesh.position.z = -360;
        }
      });

      this.npcWaterUnits.forEach(boat => {
        boat.mesh.position.z += boat.speedZ * delta;
        if (boat.mesh.position.z > 280) boat.mesh.position.z = -280;
        if (boat.mesh.position.z < -280) boat.mesh.position.z = 280;
      });

      this.npcPedestrians.forEach(npc => {
        if (!npc || !npc.mesh || npc.isDead) return;

        // Defensive normalization for pedestrian navigation contracts
        if (!(npc.targetPos instanceof THREE.Vector3)) {
          npc.targetPos = new THREE.Vector3(
            npc.mesh.position.x + (Math.random() - 0.5) * 25,
            0,
            npc.mesh.position.z + (Math.random() - 0.5) * 25
          );
        }
        if (!Number.isFinite(npc.walkSpeed)) {
          npc.walkSpeed = (typeof npc.speed === 'number' && Number.isFinite(npc.speed)) ? npc.speed : 1.4;
        }

        // Vehicle impact ragdoll
        if (this.player.inVehicle && Math.abs(this.player.speed) > 4.5) {
          const carDist = Math.hypot(this.player.x - npc.mesh.position.x, this.player.z - npc.mesh.position.z);
          if (carDist < 2.6) {
            this.bloodPool.spawnBurst(npc.mesh.position.clone().setY(0.8), null, 24);
            npc.mesh.position.y += 1.6;
            npc.mesh.rotation.x = Math.PI / 2.2;
            this.killPedestrian(npc, 'torso');
            this.addWantedHeat(1);
            this.addHackFeedToast('🚗 ¡ATROPELLO! Peatón lanzado sobre el capó.');
            return;
          }
        }

        if (npc.isAlly) {
          const dx = this.player.x - npc.mesh.position.x;
          const dz = this.player.z - npc.mesh.position.z;
          const dist = Math.hypot(dx, dz);
          if (dist > 3.5) {
            npc.mesh.position.x += (dx / dist) * 3.2 * delta;
            npc.mesh.position.z += (dz / dist) * 3.2 * delta;
            npc.mesh.rotation.y = Math.atan2(dx, dz);
          }
        } else {
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

      if (this.activeCCTV) {
        this.camera.position.set(this.activeCCTV.x, this.activeCCTV.y, this.activeCCTV.z);
        const lookTarget = new THREE.Vector3(
          this.activeCCTV.x + Math.sin(this.activeCCTV.yaw) * 30,
          this.activeCCTV.y + this.activeCCTV.pitch * 30,
          this.activeCCTV.z + Math.cos(this.activeCCTV.yaw) * 30
        );
        this.camera.lookAt(lookTarget);
        this.camera.fov = 65 / (this.cctvZoom || 1.0);
        this.camera.updateProjectionMatrix();

        const tsEl = document.getElementById('cctv-cam-timestamp');
        if (tsEl) {
          const d = new Date();
          tsEl.textContent = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
        }
        return;
      }

      if (this.isWasted) {
        this.camera.position.lerp(new THREE.Vector3(this.player.x, 32, this.player.z + 10), 0.04);
        this.camera.lookAt(new THREE.Vector3(this.player.x, 0.4, this.player.z));
        return;
      }

      let offset;
      if (!this.player.inVehicle) {
        offset = new THREE.Vector3(0, 2.4, -4.2).applyEuler(new THREE.Euler(0, this.player.yaw, 0));
      } else {
        switch (this.cameraMode) {
          case 0: offset = new THREE.Vector3(0, 3.8, -7.8).applyEuler(new THREE.Euler(0, this.player.yaw, 0)); break;
          case 1: offset = new THREE.Vector3(0, 6.2, -12.5).applyEuler(new THREE.Euler(0, this.player.yaw, 0)); break;
          case 2: offset = new THREE.Vector3(0, 1.2, 0.5).applyEuler(new THREE.Euler(0, this.player.yaw, 0)); break;
          case 3: offset = new THREE.Vector3(6.5, 2.2, -4.5).applyEuler(new THREE.Euler(0, this.player.yaw, 0)); break;
        }
      }

      const targetPos = this.playerGroup.position.clone().add(offset);
      this.camera.position.lerp(targetPos, 0.14);
      this.camera.lookAt(this.playerGroup.position.clone().add(new THREE.Vector3(0, 1.1, 0)));

      const speedNorm = Math.abs(this.player.speed) / this.player.maxSpeed;
      const targetFOV = 65 + speedNorm * 16;
      this.camera.fov += (targetFOV - this.camera.fov) * 0.1;
      this.camera.updateProjectionMatrix();
    }

    drawRadarMinimap() {
      const radarCanvas = document.getElementById('ow-radar-canvas');
      if (!radarCanvas) return;
      const ctx = radarCanvas.getContext('2d');
      const w = radarCanvas.width, h = radarCanvas.height;
      const cx = w / 2, cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = 'rgba(6, 11, 22, 0.9)';
      ctx.beginPath();
      ctx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
      ctx.fill();

      // Gang Territory Sectors on Radar (Vagos, Families, Sindicato, Merryweather)
      if (this.factions) {
        ctx.save();
        ctx.globalAlpha = 0.22;
        Object.keys(this.factions).forEach(fKey => {
          const f = this.factions[fKey];
          const fx = cx + (f.x - this.player.x) * scale;
          const fy = cy + (f.z - this.player.z) * scale;
          ctx.fillStyle = f.color;
          ctx.beginPath();
          ctx.arc(fx, fy, 40 * scale, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 4;
      const scale = 0.55;

      const roads = [-140, -70, 0, 70, 140];
      roads.forEach(rx => {
        const sx = cx + (rx - this.player.x) * scale;
        if (sx >= 0 && sx <= w) { ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, h); ctx.stroke(); }
        const sy = cy + (rx - this.player.z) * scale;
        if (sy >= 0 && sy <= h) { ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(w, sy); ctx.stroke(); }
      });

      // Traffic Blips (White)
      ctx.fillStyle = '#ffffff';
      this.npcVehicles.forEach(car => {
        const bx = cx + (car.mesh.position.x - this.player.x) * scale;
        const by = cy + (car.mesh.position.z - this.player.z) * scale;
        if (Math.hypot(bx - cx, by - cy) < cx - 6) ctx.fillRect(bx - 2, by - 2, 4, 4);
      });

      // Parked Personal Vehicles Blips (Yellow)
      ctx.fillStyle = '#ffd700';
      this.parkedVehicles.forEach(pv => {
        const bx = cx + (pv.x - this.player.x) * scale;
        const by = cy + (pv.z - this.player.z) * scale;
        if (Math.hypot(bx - cx, by - cy) < cx - 6) ctx.fillRect(bx - 3, by - 3, 6, 6);
      });

      // Gas Station Blips (Orange pump icon ⛽)
      if (this.gasStations) {
        this.gasStations.forEach(gs => {
          const bx = cx + (gs.x - this.player.x) * scale;
          const by = cy + (gs.z - this.player.z) * scale;
          if (Math.hypot(bx - cx, by - cy) < cx - 6) {
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(bx, by, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 7px sans-serif';
            ctx.fillText('⛽', bx - 3.5, by + 2.5);
          }
        });
      }

      // Player Arrow
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-this.player.yaw);
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.moveTo(0, -7); ctx.lineTo(5, 5); ctx.lineTo(-5, 5); ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    updateHUD() {
      // Top-Right Cash & Bank Counter
      const cashEl = document.getElementById('gta-cash-val');
      if (cashEl) cashEl.textContent = `$ ${this.player.cash.toLocaleString()}`;

      const bankEl = document.getElementById('gta-bank-val');
      if (bankEl) bankEl.textContent = `$ ${this.player.bank.toLocaleString()}`;

      // World Clock (24H Format)
      const clockEl = document.getElementById('gta-clock-time');
      if (clockEl) {
        const hh = Math.floor(this.worldTime);
        const mm = Math.floor((this.worldTime % 1) * 60);
        clockEl.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
      }

      // Weather Badge
      const weatherEl = document.getElementById('gta-weather-badge');
      if (weatherEl) {
        const icons = {
          CLEAR: '☀️ DESPEJADO',
          RAIN: '🌧️ LLUVIA',
          STORM: '⛈️ TORMENTA',
          FOG: '🌫️ NIEBLA'
        };
        weatherEl.textContent = icons[this.weatherState] || this.weatherState;
      }

      // Wanted Stars
      const starsEl = document.getElementById('gta-stars');
      if (starsEl) {
        let starsStr = '';
        for (let i = 0; i < 5; i++) starsStr += (i < this.player.wanted) ? '★' : '☆';
        starsEl.textContent = starsStr;
        starsEl.style.color = (this.player.wanted > 0) ? '#ff0033' : '#64748b';
      }

      // Weapon ammo
      const ammoEl = document.getElementById('gta-ammo-val');
      const wNameEl = document.getElementById('gta-weapon-name');
      if (ammoEl) {
        if (this.player.weaponSlot === 1) {
          if (wNameEl) wNameEl.textContent = 'PUÑOS';
          ammoEl.textContent = '∞';
        } else if (this.player.weaponSlot === 2) {
          if (wNameEl) wNameEl.textContent = 'PISTOLA 9MM';
          ammoEl.textContent = `${this.player.ammoPistol} / 120`;
        } else if (this.player.weaponSlot === 3) {
          if (wNameEl) wNameEl.textContent = 'RIFLE DE ASALTO';
          ammoEl.textContent = `${this.player.ammoRifle} / 360`;
        }
      }

      // Bottom-Left Status Bars
      const hpFill = document.getElementById('bar-hp-fill');
      if (hpFill) hpFill.style.width = `${Math.max(0, this.player.hp)}%`;

      const armorFill = document.getElementById('bar-armor-fill');
      if (armorFill) armorFill.style.width = `${Math.max(0, this.player.armor)}%`;

      const staminaFill = document.getElementById('bar-stamina-fill');
      if (staminaFill) staminaFill.style.width = `${Math.max(0, this.player.stamina)}%`;

      // Fuel Bar & Meter
      const fuelWrap = document.getElementById('bar-fuel-wrap');
      const fuelFill = document.getElementById('bar-fuel-fill');
      const fuelVal = document.getElementById('gta-fuel-val');
      if (fuelWrap) {
        if (this.player.inVehicle) {
          fuelWrap.style.display = 'block';
          if (fuelVal) {
            fuelVal.style.display = 'block';
            fuelVal.textContent = `⛽ ${Math.round(this.player.fuel)}%`;
            fuelVal.style.color = (this.player.fuel < 15) ? '#ef4444' : ((this.player.fuel < 40) ? '#f59e0b' : '#22c55e');
          }
          if (fuelFill) {
            fuelFill.style.width = `${Math.max(0, this.player.fuel)}%`;
            if (this.player.fuel < 15) {
              fuelFill.style.background = '#ef4444';
              fuelFill.style.boxShadow = '0 0 6px #ef4444';
            } else if (this.player.fuel < 40) {
              fuelFill.style.background = '#f59e0b';
              fuelFill.style.boxShadow = '0 0 6px #f59e0b';
            } else {
              fuelFill.style.background = '#22c55e';
              fuelFill.style.boxShadow = '0 0 6px #22c55e';
            }
          }
        } else {
          fuelWrap.style.display = 'none';
          if (fuelVal) fuelVal.style.display = 'none';
        }
      }

      // Speedometer
      const spdEl = document.getElementById('g3d-speed-val');
      if (spdEl) spdEl.textContent = Math.round(Math.abs(this.player.speed) * 3.6);

      // District Tag based on coordinates
      const distEl = document.getElementById('gta-district-tag');
      if (distEl) {
        const px = this.player.x, pz = this.player.z;
        if (px > 80 && pz > 80) distEl.textContent = 'LOS SANTOS - VINEWOOD HILLS';
        else if (px < -60 && pz > 80) distEl.textContent = 'LOS SANTOS - RANCHO & EL BURRO';
        else if (px < -180) distEl.textContent = 'LOS SANTOS - DEL PERRO MARINA';
        else if (Math.hypot(px, pz) < 60) distEl.textContent = 'LOS SANTOS - LEGION SQUARE & DOWNTOWN';
        else distEl.textContent = 'LOS SANTOS - VINEWOOD BOULEVARD';
      }

      // Context Banner
      const promptEl = document.getElementById('g3d-context-prompt');
      if (promptEl) {
        if (!this.player.inVehicle) {
          // Check parked car
          let nearParked = null;
          for (let pv of this.parkedVehicles) {
            if (Math.hypot(this.player.x - pv.x, this.player.z - pv.z) < 3.5) { nearParked = pv; break; }
          }

          const nearCar = this.getClosestVehicle(3.5);
          const nearPed = this.getClosestPedestrian(3.5);

          // Check gas station proximity
          let nearStation = null;
          if (this.gasStations) {
            for (let gs of this.gasStations) {
              if (Math.hypot(this.player.x - gs.x, this.player.z - gs.z) < 7.5) { nearStation = gs; break; }
            }
          }

          if (nearStation) {
            promptEl.style.display = 'block';
            promptEl.innerHTML = `⛽ <b style="color:#f59e0b;">[E] REPOSTAR COMBUSTIBLE ($${nearStation.price})</b> - ${nearStation.name}`;
          } else if (nearParked) {
            promptEl.style.display = 'block';
            promptEl.innerHTML = `🚘 <b style="color:#ffd700;">[F] Subir a tu vehículo</b> (${nearParked.type.toUpperCase()})`;
          } else if (nearCar) {
            promptEl.style.display = 'block';
            promptEl.innerHTML = `🚗 <b style="color:#ff0055;">[F] Robar Vehículo</b> (${nearCar.type.toUpperCase()})`;
          } else if (nearPed && !nearPed.isDead) {
            promptEl.style.display = 'block';
            promptEl.innerHTML = `🗣️ <b style="color:#00f0ff;">[G] Saludar / Amigo</b> &nbsp;|&nbsp; 🤬 <b style="color:#ffaa00;">[H] Provocar / Pelea</b>`;
          } else {
            promptEl.style.display = 'none';
          }
        } else {
          let nearStation = null;
          if (this.gasStations) {
            for (let gs of this.gasStations) {
              if (Math.hypot(this.player.x - gs.x, this.player.z - gs.z) < 7.5) { nearStation = gs; break; }
            }
          }
          if (nearStation) {
            promptEl.style.display = 'block';
            promptEl.innerHTML = `⛽ <b style="color:#f59e0b;">[E] REPOSTAR COMBUSTIBLE ($${nearStation.price})</b> - ${nearStation.name}`;
          } else {
            promptEl.style.display = 'none';
          }
        }
      }

      this.updateRPBar();
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

      const effectiveDelta = this.isDeadEye ? delta * 0.25 : delta;
      this.updateDayNightAndWeather(effectiveDelta);
      this.updateStoreRobberies(effectiveDelta);
      this.updateWaterGeysers(effectiveDelta);
      this.updatePhysics(delta);
      this.updateNPCs(delta);
      this.fx.update(delta);
      this.bloodPool.update(delta);
      this.checkLootPickup();
      this.updateProfilerTarget();
      this.updateCamera();
      this.updateHUD();
      this.drawRadarMinimap();

      this.renderer.render(this.scene, this.camera);
    }
  }

  window.CyberCity3DEngine = CyberCity3DEngine;
  window.cyberCityEngine = new CyberCity3DEngine();
})();
