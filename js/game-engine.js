/* ============================================================
   عملیات سایه — game-engine.js
   موتور سه‌بعدی: ساخت محیط، برخوردها، گلوله، انفجار، مأموریت
   ============================================================ */
(function () {
  'use strict';

  var THEMES = {
    mountain:    { sky: 0x87b5d6, fog: 0xa8c4d8, fogDensity: 0.012, ground: 0x6a7a5a, building: 0x8a8d7a, accent: 0x5a6b4f, light: 0xfff2d8, lightIntensity: 1.0, hemi: 0.7 },
    city:        { sky: 0xc9a86a, fog: 0xd8c49a, fogDensity: 0.014, ground: 0x8a7a68, building: 0x9a8a7a, accent: 0x6b5a4a, light: 0xffe0b0, lightIntensity: 0.95, hemi: 0.65 },
    desert:      { sky: 0xe8c88a, fog: 0xf0d8a8, fogDensity: 0.010, ground: 0xd8b878, building: 0xc8a868, accent: 0xa88858, light: 0xfff0c8, lightIntensity: 1.05, hemi: 0.75 },
    forest:      { sky: 0x5a7a6a, fog: 0x4a6a5a, fogDensity: 0.018, ground: 0x3f5a3f, building: 0x5a6a55, accent: 0x2f4a2f, light: 0xd8e8d0, lightIntensity: 0.8, hemi: 0.55 },
    port:        { sky: 0x2a3a4a, fog: 0x1a2a3a, fogDensity: 0.016, ground: 0x4a5a6a, building: 0x5a6a7a, accent: 0x3a4a5a, light: 0xbfd8ff, lightIntensity: 0.5, hemi: 0.3 },
    underground: { sky: 0x1a1a1e, fog: 0x0f0f12, fogDensity: 0.02, ground: 0x3a3a40, building: 0x4a4a52, accent: 0x2a2a30, light: 0xffd8a0, lightIntensity: 0.45, hemi: 0.25 },
    snow:        { sky: 0xb8d0e8, fog: 0xd8e8f8, fogDensity: 0.013, ground: 0xe8f0f8, building: 0x9ab0c8, accent: 0x6a8aaa, light: 0xffffff, lightIntensity: 0.9, hemi: 0.7 }
  };

  function makeGroundTexture(color) {
    var c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
    ctx.fillRect(0, 0, 256, 256);
    for (var i = 0; i < 2500; i++) {
      ctx.fillStyle = 'rgba(' + (Math.random() > 0.5 ? '255,255,255' : '0,0,0') + ',' + (Math.random() * 0.08) + ')';
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(24, 24);
    return tex;
  }

  function makeBuildingTexture(color) {
    var c = document.createElement('canvas');
    c.width = 128; c.height = 256;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
    ctx.fillRect(0, 0, 128, 256);
    for (var y = 10; y < 250; y += 22) {
      for (var x = 8; x < 120; x += 20) {
        ctx.fillStyle = Math.random() > 0.4 ? 'rgba(20,30,40,0.85)' : 'rgba(200,180,120,0.5)';
        ctx.fillRect(x, y, 12, 14);
      }
    }
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, 240, 128, 16);
    return new THREE.CanvasTexture(c);
  }

  function GameEngine(container) {
    this.container = container;
    this.time = 0;
    this.playing = false;
    this.paused = false;
    this.mission = null;
    this.enemies = [];
    this.shootables = [];
    this.obstacles = [];      // مش‌های مسدودکننده دید و گلوله
    this.colliders = [];      // AABB: {minX,maxX,minZ,maxZ}
    this.coverPoints = [];
    this.grenades = [];
    this.pickups = [];
    this.hostages = [];
    this.targets = [];        // مخازن قابل نابودی
    this.tracers = [];
    this.particles = [];
    this.kills = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.score = 0;
    this.missionTime = 0;
    this.objectiveState = {};
    this.nightVision = false;
    this.extractionZone = null;
    this._raycaster = new THREE.Raycaster();
    this._tmp = new THREE.Vector3();
    this._tmp2 = new THREE.Vector3();
    this._tmp3 = new THREE.Vector3();
    this._minimapTimer = 0;
    this._hudTimer = 0;
    this.initialized = false;
  }

  GameEngine.prototype = {
    init: function () {
      if (this.initialized) return;
      var settings = SaveManager.data.settings;

      this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      this.renderer.setPixelRatio(settings.quality === 'high' ? Math.min(window.devicePixelRatio, 2) : (settings.quality === 'medium' ? Math.min(window.devicePixelRatio, 1.5) : 1));
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.shadowMap.enabled = settings.shadows && settings.quality !== 'low';
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.container.appendChild(this.renderer.domElement);

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(settings.fov, window.innerWidth / window.innerHeight, 0.1, 600);

      this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.7);
      this.scene.add(this.hemiLight);
      this.sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
      this.sunLight.castShadow = this.renderer.shadowMap.enabled;
      this.sunLight.shadow.mapSize.set(1024, 1024);
      this.sunLight.shadow.camera.left = -80;
      this.sunLight.shadow.camera.right = 80;
      this.sunLight.shadow.camera.top = 80;
      this.sunLight.shadow.camera.bottom = -80;
      this.scene.add(this.sunLight);
      this.scene.add(this.sunLight.target);

      this.player = new Player(this);
      this.controls = new Controls(this);
      this.controls.bind();
      this.ui = new UI(this);

      window.addEventListener('resize', this._onResize.bind(this));
      this.initialized = true;
    },

    _onResize: function () {
      if (!this.renderer) return;
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    },

    applyQuality: function () {
      var q = SaveManager.data.settings.quality;
      this.renderer.setPixelRatio(q === 'high' ? Math.min(window.devicePixelRatio, 2) : (q === 'medium' ? Math.min(window.devicePixelRatio, 1.5) : 1));
      this.renderer.shadowMap.enabled = SaveManager.data.settings.shadows && q !== 'low';
      this.scene.traverse(function (o) { if (o.material) o.material.needsUpdate = true; });
    },

    // ============================================================
    // ساخت محیط مرحله
    // ============================================================
    buildWorld: function (mission) {
      // پاک‌سازی صحنه قبلی: همه چیز به‌جز نورها و بازیکن حذف می‌شود
      var keep = [this.hemiLight, this.sunLight, this.sunLight.target, this.player.yawObj];
      for (var i = this.scene.children.length - 1; i >= 0; i--) {
        if (keep.indexOf(this.scene.children[i]) === -1) this.scene.remove(this.scene.children[i]);
      }

      this.enemies = [];
      this.shootables = [];
      this.obstacles = [];
      this.colliders = [];
      this.coverPoints = [];
      this.grenades = [];
      this.pickups = [];
      this.hostages = [];
      this.targets = [];
      this.tracers = [];
      this.particles = [];
      this.extractionZone = null;

      var theme = THEMES[mission.theme];
      var size = mission.mapSize;
      var half = size / 2;

      this.scene.background = new THREE.Color(theme.sky);
      this.scene.fog = new THREE.FogExp2(theme.fog, theme.fogDensity);

      this.hemiLight.color.setHex(theme.sky);
      this.hemiLight.intensity = theme.hemi;
      this.sunLight.color.setHex(theme.light);
      this.sunLight.intensity = theme.lightIntensity;
      this.sunLight.position.set(half * 0.6, 80, half * 0.4);
      this.sunLight.target.position.set(0, 0, 0);

      if (mission.night) {
        this.scene.background = new THREE.Color(0x050810);
        this.scene.fog = new THREE.FogExp2(0x050810, 0.02);
        this.hemiLight.intensity = 0.12;
        this.sunLight.intensity = 0.15;
        this.sunLight.color.setHex(0x8899ff);
      }

      // ---------- زمین ----------
      var groundMat = new THREE.MeshLambertMaterial({ map: makeGroundTexture(theme.ground) });
      var ground = new THREE.Mesh(new THREE.PlaneGeometry(size, size), groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      this.scene.add(ground);
      this.obstacles.push(ground);

      // ---------- دیوارهای محیطی ----------
      var wallMat = new THREE.MeshLambertMaterial({ color: theme.accent });
      var wallH = 4;
      var walls = [
        { x: 0, z: -half, w: size, d: 1 },
        { x: 0, z: half, w: size, d: 1 },
        { x: -half, z: 0, w: 1, d: size },
        { x: half, z: 0, w: 1, d: size }
      ];
      for (var wi = 0; wi < walls.length; wi++) {
        var w = walls[wi];
        var wall = new THREE.Mesh(new THREE.BoxGeometry(w.w, wallH, w.d), wallMat);
        wall.position.set(w.x, wallH / 2, w.z);
        wall.castShadow = true; wall.receiveShadow = true;
        this.scene.add(wall);
        this.obstacles.push(wall);
        this.colliders.push({ minX: w.x - w.w / 2, maxX: w.x + w.w / 2, minZ: w.z - w.d / 2, maxZ: w.z + w.d / 2 });
      }

      // ---------- ساختمان‌ها (چیدمان شبکه‌ای با حذف تصادفی) ----------
      var buildingTex = makeBuildingTexture(theme.building);
      var buildingMat = new THREE.MeshLambertMaterial({ map: buildingTex });
      var cell = 14;
      var placed = 0;
      for (var gx = -half + cell; gx < half - cell; gx += cell) {
        for (var gz = -half + cell; gz < half - cell; gz += cell) {
          // مرکز نقشه برای محل شروع بازیکن خالی بماند
          if (Math.abs(gx) < cell && Math.abs(gz) < cell) continue;
          if (Math.random() < 0.42) continue; // فضای خالی برای مسیرها
          var bw = 6 + Math.random() * 4;
          var bd = 6 + Math.random() * 4;
          var bh = 5 + Math.random() * 9;
          var b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), buildingMat);
          b.position.set(gx + (Math.random() - 0.5) * 2, bh / 2, gz + (Math.random() - 0.5) * 2);
          b.castShadow = true; b.receiveShadow = true;
          this.scene.add(b);
          this.obstacles.push(b);
          this.colliders.push({ minX: b.position.x - bw / 2, maxX: b.position.x + bw / 2, minZ: b.position.z - bd / 2, maxZ: b.position.z + bd / 2 });
          placed++;
        }
      }

      // ---------- سنگرها و جعبه‌ها (نقاط پوشش) ----------
      var crateMat = new THREE.MeshLambertMaterial({ color: 0x8a6a3a });
      var sandMat = new THREE.MeshLambertMaterial({ color: 0xc8b088 });
      for (var ci = 0; ci < 26; ci++) {
        var cx = (Math.random() - 0.5) * (size - 16);
        var cz = (Math.random() - 0.5) * (size - 16);
        if (Math.abs(cx) < 6 && Math.abs(cz) < 6) continue;
        var isSand = Math.random() < 0.5;
        var cw = isSand ? 2.4 : 1.4;
        var ch = isSand ? 1.0 : 1.4;
        var crate = new THREE.Mesh(new THREE.BoxGeometry(cw, ch, cw), isSand ? sandMat : crateMat);
        crate.position.set(cx, ch / 2, cz);
        crate.rotation.y = Math.random() * Math.PI;
        crate.castShadow = true; crate.receiveShadow = true;
        this.scene.add(crate);
        this.obstacles.push(crate);
        this.colliders.push({ minX: cx - cw / 2, maxX: cx + cw / 2, minZ: cz - cw / 2, maxZ: cz + cw / 2 });
        this.coverPoints.push(new THREE.Vector3(cx + cw / 2 + 0.8, 0, cz));
        this.coverPoints.push(new THREE.Vector3(cx - cw / 2 - 0.8, 0, cz));
        this.coverPoints.push(new THREE.Vector3(cx, 0, cz + cw / 2 + 0.8));
        this.coverPoints.push(new THREE.Vector3(cx, 0, cz - cw / 2 - 0.8));
      }

      // ---------- بشکه‌های انفجاری ----------
      var barrelMat = new THREE.MeshLambertMaterial({ color: 0xb03030 });
      for (var bi = 0; bi < 8; bi++) {
        var bx = (Math.random() - 0.5) * (size - 20);
        var bz = (Math.random() - 0.5) * (size - 20);
        if (Math.abs(bx) < 8 && Math.abs(bz) < 8) continue;
        var barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.1, 10), barrelMat);
        barrel.position.set(bx, 0.55, bz);
        barrel.castShadow = true;
        barrel.userData.explosive = true;
        barrel.userData.hp = 20;
        this.scene.add(barrel);
        this.obstacles.push(barrel);
        this.shootables.push(barrel);
        this.colliders.push({ minX: bx - 0.5, maxX: bx + 0.5, minZ: bz - 0.5, maxZ: bz + 0.5 });
        this.targets.push({ mesh: barrel, hp: 20, type: 'barrel', destroyed: false });
      }

      // ---------- درخت‌ها (در تم جنگل/کوهستان) ----------
      if (mission.theme === 'forest' || mission.theme === 'mountain') {
        var trunkMat = new THREE.MeshLambertMaterial({ color: 0x4a3520 });
        var leafMat = new THREE.MeshLambertMaterial({ color: mission.theme === 'forest' ? 0x1f4a1f : 0x3a5a3a });
        for (var ti = 0; ti < 30; ti++) {
          var tx = (Math.random() - 0.5) * (size - 14);
          var tz = (Math.random() - 0.5) * (size - 14);
          if (Math.abs(tx) < 7 && Math.abs(tz) < 7) continue;
          var tree = new THREE.Group();
          var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 2.5, 6), trunkMat);
          trunk.position.y = 1.25;
          var leaves = new THREE.Mesh(new THREE.ConeGeometry(1.6, 3.5, 7), leafMat);
          leaves.position.y = 4;
          tree.add(trunk, leaves);
          tree.position.set(tx, 0, tz);
          tree.castShadow = true;
          this.scene.add(tree);
          this.obstacles.push(trunk);
          this.colliders.push({ minX: tx - 0.4, maxX: tx + 0.4, minZ: tz - 0.4, maxZ: tz + 0.4 });
        }
      }

      // ---------- برج دیده‌بانی ----------
      if (mission.theme !== 'underground') {
        var towerMat = new THREE.MeshLambertMaterial({ color: 0x6a6a6a });
        var tower = new THREE.Group();
        var legs = new THREE.Mesh(new THREE.BoxGeometry(2, 7, 2), towerMat);
        legs.position.y = 3.5;
        var top = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.6, 3.4), towerMat);
        top.position.y = 7.8;
        tower.add(legs, top);
        tower.position.set(half * 0.55, 0, -half * 0.55);
        this.scene.add(tower);
        this.obstacles.push(legs, top);
        this.colliders.push({ minX: tower.position.x - 1, maxX: tower.position.x + 1, minZ: tower.position.z - 1, maxZ: tower.position.z + 1 });
      }

      // ---------- اهداف نابودی (مخازن سوخت) ----------
      if (mission.objectiveType === 'destroy') {
        var tankMat = new THREE.MeshLambertMaterial({ color: 0xd8d8d8 });
        var tankTopMat = new THREE.MeshLambertMaterial({ color: 0xb03030 });
        for (var di = 0; di < mission.targets; di++) {
          var angle = (di / mission.targets) * Math.PI * 2;
          var dx = Math.cos(angle) * half * 0.55;
          var dz = Math.sin(angle) * half * 0.55;
          var tank = new THREE.Group();
          var body = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 3.2, 12), tankMat);
          body.position.y = 1.6;
          var cap = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.65, 0.4, 12), tankTopMat);
          cap.position.y = 3.3;
          tank.add(body, cap);
          tank.position.set(dx, 0, dz);
          tank.traverse(function (o) { o.castShadow = true; });
          this.scene.add(tank);
          this.obstacles.push(body);
          body.userData.target = true;
          this.shootables.push(body);
          this.colliders.push({ minX: dx - 1.6, maxX: dx + 1.6, minZ: dz - 1.6, maxZ: dz + 1.6 });
          this.targets.push({ mesh: body, group: tank, hp: 150, type: 'tank', destroyed: false });
        }
      }

      // ---------- منطقه امن (نجات گروگان) ----------
      if (mission.objectiveType === 'rescue') {
        var zoneMat = new THREE.MeshBasicMaterial({ color: 0x2aff2a, transparent: true, opacity: 0.25 });
        var zone = new THREE.Mesh(new THREE.CircleGeometry(4, 24), zoneMat);
        zone.rotation.x = -Math.PI / 2;
        zone.position.set(0, 0.05, half * 0.35);
        this.scene.add(zone);
        this.extractionZone = { pos: zone.position.clone(), radius: 4, mesh: zone };
      }

      this.mapHalf = half;
      this.mapSize = size;
    },

    // ============================================================
    // شروع مأموریت
    // ============================================================
    startMission: function (mission) {
      this.mission = mission;
      this.kills = 0;
      this.shotsFired = 0;
      this.shotsHit = 0;
      this.score = 0;
      this.missionTime = 0;
      this.nightVision = false;
      this.objectiveState = { done: false };
      this.buildWorld(mission);

      // سلاح‌ها
      var primary = SaveManager.data.equipped.primary;
      var secondary = SaveManager.data.equipped.secondary;
      this.player.setupWeapons(primary, secondary, mission.giveWeapon || null);
      if (mission.giveWeapon && this.player.weapons[mission.giveWeapon]) {
        this.player.switchWeapon(mission.giveWeapon);
      }

      // موقعیت شروع بازیکن (رو به مرکز نقشه)
      var spawn = new THREE.Vector3(0, 0, this.mapHalf * 0.35);
      this.player.reset(spawn, 0);

      // ساخت دشمنان
      var enemyList = [];
      for (var type in mission.enemies) {
        for (var i = 0; i < mission.enemies[type]; i++) enemyList.push(type);
      }
      // در مأموریت تک‌تیرانداز، چند دشمن علامت‌دار می‌شوند
      var markedSet = {};
      if (mission.objectiveType === 'sniper') {
        var indices = [];
        for (var j = 0; j < enemyList.length; j++) indices.push(j);
        indices.sort(function () { return Math.random() - 0.5; });
        for (var m = 0; m < Math.min(mission.markedCount || 4, indices.length); m++) {
          markedSet[indices[m]] = true;
        }
      }
      for (var k = 0; k < enemyList.length; k++) {
        var pos = this.randomPointInMap(10);
        var enemy = new Enemy(enemyList[k], pos, this, { marked: !!markedSet[k] });
        this.enemies.push(enemy);
        this.scene.add(enemy.mesh);
      }

      // ساخت گروگان‌ها
      if (mission.objectiveType === 'rescue') {
        for (var h = 0; h < mission.hostages; h++) {
          var hpos = this.randomPointInMap(12);
          var hostage = this.buildHostage(hpos);
          this.hostages.push(hostage);
          this.scene.add(hostage.mesh);
        }
      }

      this.playing = true;
      this.paused = false;
      this.ui.onMissionStart(mission);
      AudioEngine.startAmbient();
      AudioEngine.startMusic('combat');
      this.ui.toast('مأموریت: ' + mission.objectiveText, 4000);
    },

    buildHostage: function (pos) {
      var g = new THREE.Group();
      var body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.32), new THREE.MeshLambertMaterial({ color: 0xd8d8d8 }));
      body.position.y = 1.1;
      var head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.3), new THREE.MeshLambertMaterial({ color: 0xc9a080 }));
      head.position.y = 1.65;
      var legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.75, 0.2), new THREE.MeshLambertMaterial({ color: 0x3a4a6a }));
      legL.position.set(-0.13, 0.38, 0);
      var legR = legL.clone(); legR.position.x = 0.13;
      g.add(body, head, legL, legR);
      g.position.copy(pos);
      return { mesh: g, following: false, rescued: false, walkCycle: 0 };
    },

    randomPointInMap: function (minDistFromCenter) {
      var half = this.mapHalf - 4;
      for (var tries = 0; tries < 20; tries++) {
        var x = (Math.random() - 0.5) * 2 * half;
        var z = (Math.random() - 0.5) * 2 * half;
        if (minDistFromCenter && Math.hypot(x, z) < minDistFromCenter) continue;
        var p = new THREE.Vector3(x, 0, z);
        if (!this.isPointBlocked(p, 1)) return p;
      }
      return new THREE.Vector3(half * 0.5, 0, -half * 0.5);
    },

    nearestCoverPoint: function (fromPos) {
      if (this.coverPoints.length === 0) return null;
      var best = null, bestD = Infinity;
      for (var i = 0; i < this.coverPoints.length; i++) {
        var d = fromPos.distanceToSquared(this.coverPoints[i]);
        if (d < bestD) { bestD = d; best = this.coverPoints[i]; }
      }
      return best;
    },

    // ============================================================
    // برخورد و خط دید
    // ============================================================
    isPointBlocked: function (p, radius) {
      for (var i = 0; i < this.colliders.length; i++) {
        var c = this.colliders[i];
        if (p.x > c.minX - radius && p.x < c.maxX + radius && p.z > c.minZ - radius && p.z < c.maxZ + radius) return true;
      }
      return false;
    },

    resolveCollision: function (pos, radius) {
      for (var i = 0; i < this.colliders.length; i++) {
        var c = this.colliders[i];
        if (pos.x > c.minX - radius && pos.x < c.maxX + radius && pos.z > c.minZ - radius && pos.z < c.maxZ + radius) {
          var dxl = pos.x - (c.minX - radius), dxr = (c.maxX + radius) - pos.x;
          var dzl = pos.z - (c.minZ - radius), dzr = (c.maxZ + radius) - pos.z;
          var min = Math.min(dxl, dxr, dzl, dzr);
          if (min === dxl) pos.x = c.minX - radius;
          else if (min === dxr) pos.x = c.maxX + radius;
          else if (min === dzl) pos.z = c.minZ - radius;
          else pos.z = c.maxZ + radius;
        }
      }
    },

    hasLineOfSight: function (from, to) {
      this._tmp.copy(to).sub(from);
      var dist = this._tmp.length();
      if (dist < 0.1) return true;
      this._tmp.normalize();
      this._raycaster.set(from, this._tmp);
      this._raycaster.far = dist;
      var hits = this._raycaster.intersectObjects(this.obstacles, false);
      return hits.length === 0;
    },

    // ============================================================
    // شلیک و انفجار
    // ============================================================
    fireBullet: function (origin, dir, weaponStats, shooter) {
      this.shotsFired++;
      this._raycaster.set(origin, dir);
      this._raycaster.far = weaponStats.range;
      var targets = this.shootables.concat(this.obstacles);
      var hits = this._raycaster.intersectObjects(targets, false);
      var endPoint = origin.clone().add(dir.clone().multiplyScalar(weaponStats.range));

      if (hits.length > 0) {
        var hit = hits[0];
        endPoint = hit.point.clone();
        var obj = hit.object;
        if (obj.userData.enemy && !obj.userData.enemy.dead) {
          this.shotsHit++;
          var isHead = obj.userData.part === 'head';
          var dmg = weaponStats.damage * (isHead ? 2 : 1);
          // افت آسیب در فاصله
          var dist = origin.distanceTo(hit.point);
          if (dist > weaponStats.range * 0.6) dmg *= 0.7;
          obj.userData.enemy.takeDamage(dmg, isHead, hit.point);
          this.spawnParticles(hit.point, isHead ? 0xcc2222 : 0xaa3333, 6, 2);
          if (isHead) AudioEngine.playHeadshot(); else AudioEngine.playHit();
          this.ui.showHitmarker(isHead);
        } else if (obj.userData.explosive) {
          this.damageTarget(obj, weaponStats.damage, hit.point);
          this.spawnParticles(hit.point, 0xffaa33, 5, 2);
        } else if (obj.userData.target) {
          this.damageTarget(obj, weaponStats.damage, hit.point);
          this.spawnParticles(hit.point, 0xffcc66, 5, 2);
        } else {
          this.spawnParticles(hit.point, 0xccccaa, 4, 1.5);
        }
      }

      this.spawnTracer(origin.clone().add(dir.clone().multiplyScalar(0.6)), endPoint, weaponStats.tracerColor);
    },

    enemyShoot: function (enemy, dist) {
      AudioEngine.playEnemyShoot();
      var from = enemy.eyePos(new THREE.Vector3());
      from.y = 1.35 * enemy.type.scale;
      var to = this.player.chestPos(new THREE.Vector3());
      // خطای تیراندازی بر اساس دقت و فاصله و حرکت بازیکن
      var hitChance = enemy.type.accuracy * (1 - Math.min(0.5, dist / 200));
      if (this.player.sprinting) hitChance *= 0.6;
      if (this.player.crouching) hitChance *= 0.75;
      var hit = Math.random() < hitChance;
      var end = to.clone();
      if (!hit) {
        end.x += (Math.random() - 0.5) * 3;
        end.y += (Math.random() - 0.5) * 2;
        end.z += (Math.random() - 0.5) * 3;
      }
      this.spawnTracer(from, end, 0xff6644);
      if (hit) {
        this.player.takeDamage(enemy.type.damage * (0.8 + Math.random() * 0.4));
      }
    },

    spawnTracer: function (from, to, color) {
      var geo = new THREE.BufferGeometry().setFromPoints([from, to]);
      var mat = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.9 });
      var line = new THREE.Line(geo, mat);
      this.scene.add(line);
      this.tracers.push({ line: line, life: 0.07 });
    },

    spawnParticles: function (pos, color, count, speed) {
      for (var i = 0; i < count; i++) {
        var geo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
        var mat = new THREE.MeshBasicMaterial({ color: color });
        var m = new THREE.Mesh(geo, mat);
        m.position.copy(pos);
        var vel = new THREE.Vector3((Math.random() - 0.5) * speed * 2, Math.random() * speed, (Math.random() - 0.5) * speed * 2);
        this.scene.add(m);
        this.particles.push({ mesh: m, vel: vel, life: 0.4 + Math.random() * 0.4, gravity: 6 });
      }
    },

    explode: function (pos, radius, damage) {
      AudioEngine.playExplosion();
      this.spawnParticles(pos, 0xff7722, 30, 8);
      this.spawnParticles(pos, 0xffcc44, 20, 6);
      this.spawnParticles(pos, 0x555555, 15, 4);
      var light = new THREE.PointLight(0xff8833, 3, radius * 3);
      light.position.copy(pos); light.position.y += 1;
      this.scene.add(light);
      this.particles.push({ mesh: light, vel: new THREE.Vector3(), life: 0.25, gravity: 0, isLight: true });

      // آسیب به دشمنان
      for (var i = 0; i < this.enemies.length; i++) {
        var e = this.enemies[i];
        if (e.dead) continue;
        var d = e.mesh.position.distanceTo(pos);
        if (d < radius) {
          e.takeDamage(damage * (1 - d / radius), false, e.mesh.position);
          if (e.dead) {
            SaveManager.data.stats.grenadeKills++;
          }
        }
      }
      // آسیب به بازیکن
      var pd = this.player.position.distanceTo(pos);
      if (pd < radius) {
        this.player.takeDamage(damage * 0.7 * (1 - pd / radius));
      }
      // انفجار زنجیره‌ای: بشکه‌ها و مخازن نزدیک هم منفجر می‌شوند
      for (var ti = 0; ti < this.targets.length; ti++) {
        var tg = this.targets[ti];
        if (tg.destroyed) continue;
        var tp = tg.mesh.getWorldPosition(new THREE.Vector3());
        if (tp.distanceTo(pos) < radius + 2) {
          this.damageTarget(tg.mesh, 999, tp);
        }
      }
      // لرزش دوربین
      if (pd < radius * 2) this.player.shake = Math.min(this.player.shake + 0.15, 0.3);
    },

    spawnGrenade: function (start, dir) {
      var mesh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshLambertMaterial({ color: 0x2a4a2a }));
      mesh.position.copy(start);
      this.scene.add(mesh);
      var vel = dir.clone().multiplyScalar(14);
      vel.y += 3;
      this.grenades.push({ mesh: mesh, vel: vel, fuse: 1.6 });
    },

    damageTarget: function (mesh, damage, hitPoint) {
      for (var i = 0; i < this.targets.length; i++) {
        var t = this.targets[i];
        if (t.mesh === mesh && !t.destroyed) {
          t.hp -= damage;
          if (t.hp <= 0) {
            t.destroyed = true;
            var pos = t.mesh.getWorldPosition(new THREE.Vector3());
            this.explode(pos, t.type === 'tank' ? 9 : 5, t.type === 'tank' ? 120 : 80);
            if (t.group) this.scene.remove(t.group); else this.scene.remove(t.mesh);
            // حذف از لیست‌های برخورد تا دیوار نامرئی نماند
            this.obstacles = this.obstacles.filter(function (o) { return o !== t.mesh; });
            this.shootables = this.shootables.filter(function (o) { return o !== t.mesh; });
            this.score += 200;
            this.ui.toast('هدف نابود شد! +۲۰۰ امتیاز', 2000);
            this.checkObjectives();
          }
          return;
        }
      }
    },

    // ============================================================
    // دشمنان و رویدادها
    // ============================================================
    spawnReinforcements: function (nearPos, count) {
      for (var i = 0; i < count; i++) {
        var pos = nearPos.clone();
        pos.x += (Math.random() - 0.5) * 10;
        pos.z += (Math.random() - 0.5) * 10;
        pos.y = 0;
        this.resolveCollision(pos, 0.5);
        var type = Math.random() < 0.5 ? 'soldier' : 'rusher';
        var enemy = new Enemy(type, pos, this, {});
        enemy.alertLevel = 2;
        enemy.state = 'combat';
        enemy.lastKnownPlayerPos.copy(this.player.position);
        this.enemies.push(enemy);
        this.scene.add(enemy.mesh);
      }
      this.ui.toast('⚠️ نیروهای کمکی دشمن رسیدند!', 2500);
      AudioEngine.playAlarm();
    },

    onEnemyAlerted: function (enemy) {
      // اولین هشدار: نمایش نشانگر
      this.ui.showAlertIndicator();
    },

    onEnemyKilled: function (enemy, isHeadshot, hitPoint) {
      this.kills++;
      SaveManager.data.stats.kills++;
      if (isHeadshot) SaveManager.data.stats.headshots++;
      SaveManager.addDailyKill();
      var baseScore = isHeadshot ? 150 : 100;
      this.score += baseScore;
      SaveManager.addMoney(25 + Math.floor(Math.random() * 20));
      SaveManager.addXP(isHeadshot ? 15 : 10);
      AudioEngine.playKill();
      this.spawnParticles(enemy.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0)), 0xaa2222, 10, 3);

      // دراپ آیتم
      var roll = Math.random();
      if (roll < 0.18) this.dropPickup(enemy.mesh.position, 'medkit');
      else if (roll < 0.45) this.dropPickup(enemy.mesh.position, 'ammo');

      // دستاوردها
      if (this.kills === 1) this.checkAchievement('first_kill', 'اولین شکار');
      if (this.kills === 10) this.checkAchievement('killer10', 'شکارچی حرفه‌ای');
      if (this.kills === 50) this.checkAchievement('killer50', 'افسانه سایه');
      if (isHeadshot) this.checkAchievement('headshot', 'تک‌تیرانداز دقیق');

      this.ui.updateHUD();
      this.checkObjectives();
    },

    checkAchievement: function (id, name) {
      if (SaveManager.unlockAchievement(id)) {
        this.ui.toast('🏆 دستاورد باز شد: ' + name, 3500);
        AudioEngine.playRankUp();
      }
    },

    removeEnemy: function (enemy) {
      this.scene.remove(enemy.mesh);
      var idx = this.enemies.indexOf(enemy);
      if (idx !== -1) this.enemies.splice(idx, 1);
      var sIdx = this.shootables.indexOf(enemy.mesh);
      // مش‌های فرزند هم در shootables هستند؛ پاک‌سازی کامل:
      enemy.mesh.traverse(function (o) {
        var si = -1;
        // پیدا کردن در آرایه shootables
      });
      this.shootables = this.shootables.filter(function (o) { return o.userData.enemy !== enemy; });
    },

    dropPickup: function (pos, type) {
      var color = type === 'medkit' ? 0xffffff : 0xffcc33;
      var mesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.4), new THREE.MeshLambertMaterial({ color: color }));
      mesh.position.set(pos.x, 0.4, pos.z);
      if (type === 'medkit') {
        var cross = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.1), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
        cross.position.y = 0.15;
        mesh.add(cross);
      }
      this.scene.add(mesh);
      this.pickups.push({ mesh: mesh, type: type, life: 30, spin: 0 });
    },

    // ============================================================
    // اهداف مأموریت
    // ============================================================
    checkObjectives: function () {
      if (!this.mission || this.objectiveState.done) return;
      var m = this.mission;
      var complete = false;

      if (m.objectiveType === 'eliminate') {
        complete = this.enemies.filter(function (e) { return !e.dead; }).length === 0;
      } else if (m.objectiveType === 'destroy') {
        complete = this.targets.filter(function (t) { return t.type === 'tank' && t.destroyed; }).length >= m.targets;
      } else if (m.objectiveType === 'sniper') {
        complete = this.enemies.filter(function (e) { return e.marker && !e.dead; }).length === 0;
      } else if (m.objectiveType === 'boss') {
        complete = this.enemies.filter(function (e) { return e.isBoss && !e.dead; }).length === 0;
      } else if (m.objectiveType === 'rescue') {
        complete = this.hostages.length > 0 && this.hostages.every(function (h) { return h.rescued; });
      }

      if (complete) this.completeMission();
    },

    getObjectiveProgress: function () {
      var m = this.mission;
      if (!m) return '';
      if (m.objectiveType === 'eliminate') {
        var alive = this.enemies.filter(function (e) { return !e.dead; }).length;
        return 'دشمنان باقی‌مانده: ' + alive;
      }
      if (m.objectiveType === 'destroy') {
        var done = this.targets.filter(function (t) { return t.type === 'tank' && t.destroyed; }).length;
        return 'مخازن نابود شده: ' + done + ' / ' + m.targets;
      }
      if (m.objectiveType === 'sniper') {
        var marked = this.enemies.filter(function (e) { return e.marker && !e.dead; }).length;
        return 'اهداف باقی‌مانده: ' + marked;
      }
      if (m.objectiveType === 'boss') {
        var boss = this.enemies.filter(function (e) { return e.isBoss; })[0];
        if (boss) return 'سلامتی فرمانده: ' + Math.max(0, Math.round(boss.hp / boss.maxHp * 100)) + '٪';
        return 'فرمانده شکست خورد!';
      }
      if (m.objectiveType === 'rescue') {
        var rescued = this.hostages.filter(function (h) { return h.rescued; }).length;
        return 'گروگان‌های نجات‌یافته: ' + rescued + ' / ' + this.hostages.length;
      }
      return '';
    },

    completeMission: function () {
      if (this.objectiveState.done) return;
      this.objectiveState.done = true;
      this.playing = false;
      var m = this.mission;

      // محاسبه امتیاز نهایی
      var accuracy = this.shotsFired > 0 ? this.shotsHit / this.shotsFired : 0;
      var accBonus = Math.round(accuracy * 300);
      var timeBonus = 0;
      if (m.timeLimit > 0) timeBonus = Math.round(Math.max(0, (m.timeLimit - this.missionTime)) * 2);
      var totalScore = this.score + accBonus + timeBonus + 500;

      SaveManager.addMoney(m.rewardMoney);
      SaveManager.addXP(m.rewardXP);
      SaveManager.data.totalScore += totalScore;
      SaveManager.data.stats.missionsDone++;
      SaveManager.data.unlockedMissions = Math.max(SaveManager.data.unlockedMissions, Math.min(m.id + 1, MISSIONS.length));
      var prev = SaveManager.data.completedMissions[m.id];
      if (!prev || totalScore > prev.bestScore) {
        SaveManager.data.completedMissions[m.id] = { bestScore: totalScore, bestTime: Math.round(this.missionTime) };
      }
      SaveManager.save();

      if (m.id === 8) this.checkAchievement('champion', 'قهرمان عملیات سایه');
      if (m.id === 4) this.checkAchievement('rescuer', 'نجات‌دهنده');

      AudioEngine.playWin();
      AudioEngine.stopMusic();
      this.ui.showMissionComplete({
        score: totalScore,
        kills: this.kills,
        accuracy: Math.round(accuracy * 100),
        time: Math.round(this.missionTime),
        money: m.rewardMoney,
        xp: m.rewardXP
      });
    },

    onPlayerDeath: function () {
      this.playing = false;
      AudioEngine.playLose();
      AudioEngine.stopMusic();
      this.ui.showMissionFailed();
    },

    failMission: function (reason) {
      if (this.objectiveState.done) return;
      this.objectiveState.done = true;
      this.playing = false;
      AudioEngine.playLose();
      AudioEngine.stopMusic();
      this.ui.showMissionFailed(reason);
    },

    togglePause: function (force) {
      if (!this.playing && !this.paused) return;
      this.paused = force === true ? true : !this.paused;
      this.ui.showPause(this.paused);
      if (this.paused) {
        if (document.pointerLockElement) document.exitPointerLock();
      } else {
        this.requestPointerLock();
      }
    },

    requestPointerLock: function () {
      if (this.controls.isTouch) return;
      var canvas = this.renderer.domElement;
      if (canvas.requestPointerLock) {
        try { canvas.requestPointerLock(); } catch (e) {}
      }
    },

    toggleNightVision: function () {
      if (!this.mission || !this.mission.night) return;
      this.nightVision = !this.nightVision;
      AudioEngine.playNightVision();
      this.ui.setNightVision(this.nightVision);
      if (this.nightVision) {
        this.hemiLight.intensity = 0.55;
        this.sunLight.intensity = 0.4;
      } else {
        this.hemiLight.intensity = 0.12;
        this.sunLight.intensity = 0.15;
      }
    },

    exitMission: function () {
      this.playing = false;
      this.paused = false;
      AudioEngine.stopMusic();
      AudioEngine.stopAmbient();
      AudioEngine.startMusic('menu');
      if (document.pointerLockElement) document.exitPointerLock();
      this.ui.showScreen('screen-menu');
      this.ui.refreshMenu();
    },

    // ============================================================
    // حلقه اصلی بازی
    // ============================================================
    startLoop: function () {
      var self = this;
      var lastTime = performance.now();
      function loop(now) {
        requestAnimationFrame(loop);
        var dt = Math.min(0.05, (now - lastTime) / 1000);
        lastTime = now;
        if (self.playing && !self.paused) {
          self.update(dt);
        }
        if (self.renderer) self.renderer.render(self.scene, self.camera);
      }
      requestAnimationFrame(loop);
    },

    update: function (dt) {
      this.time += dt;
      this.missionTime += dt;
      SaveManager.data.stats.playTime += dt;

      // ورودی
      var input = this.controls.poll();
      var look = this.controls.consumeLook();
      input.lookDX = look.dx;
      input.lookDY = look.dy;

      this.player.update(dt, input);

      // دشمنان
      for (var i = this.enemies.length - 1; i >= 0; i--) {
        this.enemies[i].update(dt);
      }

      // نارنجک‌ها
      for (var g = this.grenades.length - 1; g >= 0; g--) {
        var gr = this.grenades[g];
        gr.fuse -= dt;
        gr.vel.y -= 12 * dt;
        gr.mesh.position.add(gr.vel.clone().multiplyScalar(dt));
        if (gr.mesh.position.y < 0.12) {
          gr.mesh.position.y = 0.12;
          gr.vel.y *= -0.4;
          gr.vel.x *= 0.7; gr.vel.z *= 0.7;
        }
        if (gr.fuse <= 0) {
          this.explode(gr.mesh.position.clone(), 7, 110);
          this.scene.remove(gr.mesh);
          this.grenades.splice(g, 1);
        }
      }

      // ذرات
      for (var p = this.particles.length - 1; p >= 0; p--) {
        var pt = this.particles[p];
        pt.life -= dt;
        if (pt.life <= 0) {
          this.scene.remove(pt.mesh);
          this.particles.splice(p, 1);
          continue;
        }
        if (!pt.isLight) {
          pt.vel.y -= pt.gravity * dt;
          pt.mesh.position.add(pt.vel.clone().multiplyScalar(dt));
          if (pt.mesh.position.y < 0.03) pt.mesh.position.y = 0.03;
        }
      }

      // رد گلوله‌ها
      for (var t = this.tracers.length - 1; t >= 0; t--) {
        var tr = this.tracers[t];
        tr.life -= dt;
        tr.line.material.opacity = Math.max(0, tr.life / 0.07);
        if (tr.life <= 0) {
          this.scene.remove(tr.line);
          this.tracers.splice(t, 1);
        }
      }

      // آیتم‌ها
      for (var pk = this.pickups.length - 1; pk >= 0; pk--) {
        var pickup = this.pickups[pk];
        pickup.life -= dt;
        pickup.spin += dt * 2;
        pickup.mesh.rotation.y = pickup.spin;
        pickup.mesh.position.y = 0.4 + Math.sin(this.time * 3 + pk) * 0.1;
        if (pickup.life <= 0) {
          this.scene.remove(pickup.mesh);
          this.pickups.splice(pk, 1);
          continue;
        }
        if (pickup.mesh.position.distanceTo(this.player.position) < 1.4) {
          if (pickup.type === 'medkit') {
            this.player.heal(40);
            this.ui.toast('➕ جعبه کمک‌های اولیه: +۴۰ سلامتی', 1500);
          } else {
            for (var wid in this.player.weapons) {
              this.player.weapons[wid].reserve += this.player.weapons[wid].stats.mag;
            }
            this.ui.toast('🔫 مهمات دریافت شد', 1500);
          }
          AudioEngine.playPickup();
          this.scene.remove(pickup.mesh);
          this.pickups.splice(pk, 1);
          this.ui.updateWeaponHUD();
        }
      }

      // گروگان‌ها
      if (this.mission.objectiveType === 'rescue') {
        for (var h = 0; h < this.hostages.length; h++) {
          var hostage = this.hostages[h];
          if (hostage.rescued) continue;
          var hp = hostage.mesh.position;
          var distP = hp.distanceTo(this.player.position);
          if (!hostage.following && distP < 2.2) {
            hostage.following = true;
            this.ui.toast('گروگان آزاد شد! او را به منطقه امن ببرید 🟢', 2500);
            AudioEngine.playRescue();
          }
          if (hostage.following) {
            var dir = this.player.position.clone().sub(hp);
            dir.y = 0;
            var d = dir.length();
            if (d > 1.6) {
              dir.normalize();
              hp.add(dir.multiplyScalar(3.4 * dt));
              this.resolveCollision(hp, 0.4);
              hostage.walkCycle += dt * 8;
              hostage.mesh.rotation.y = Math.atan2(dir.x, dir.z);
            }
            if (this.extractionZone && hp.distanceTo(this.extractionZone.pos) < this.extractionZone.radius) {
              hostage.rescued = true;
              hostage.mesh.visible = false;
              this.score += 300;
              this.ui.toast('✅ گروگان به منطقه امن رسید! +۳۰۰ امتیاز', 2500);
              AudioEngine.playRescue();
              this.checkObjectives();
            }
          }
        }
        // پالس منطقه امن
        if (this.extractionZone) {
          this.extractionZone.mesh.material.opacity = 0.2 + Math.sin(this.time * 3) * 0.1;
        }
      }

      // محدودیت زمانی
      if (this.mission.timeLimit > 0 && !this.objectiveState.done) {
        if (this.missionTime >= this.mission.timeLimit) {
          this.failMission('زمان مأموریت تمام شد!');
        }
      }

      // به‌روزرسانی HUD و نقشه کوچک
      this._hudTimer -= dt;
      if (this._hudTimer <= 0) {
        this._hudTimer = 0.1;
        this.ui.updateHUD();
        this.ui.drawMinimap();
      }
    }
  };

  window.GameEngine = GameEngine;
  window.THEMES = THEMES;
})();
