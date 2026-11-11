/* ============================================================
   عملیات سایه — player.js
   کنترلر بازیکن، مدل سلاح، شلیک، نارنجک و سلامتی
   ============================================================ */
(function () {
  'use strict';

  function buildWeaponModel(kind) {
    var g = new THREE.Group();
    var dark = new THREE.MeshLambertMaterial({ color: 0x222222 });
    var mid = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });
    var accent = new THREE.MeshLambertMaterial({ color: 0xcc7722 });
    var energyMat = new THREE.MeshBasicMaterial({ color: 0x66ccff });

    function box(w, h, d, m, x, y, z) {
      var b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      b.position.set(x, y, z);
      g.add(b);
      return b;
    }

    if (kind === 'pistol') {
      box(0.05, 0.09, 0.22, dark, 0, 0, -0.05);          // بدنه
      box(0.045, 0.14, 0.06, mid, 0, -0.1, 0.06);        // دسته
      box(0.02, 0.03, 0.02, accent, 0, 0.06, -0.14);     // مگسک
    } else if (kind === 'sniper') {
      box(0.06, 0.1, 0.85, dark, 0, 0, -0.2);            // لوله بلند
      box(0.07, 0.12, 0.3, mid, 0, -0.02, 0.15);         // بدنه
      box(0.05, 0.16, 0.06, mid, 0, -0.12, 0.2);         // دسته
      box(0.05, 0.05, 0.18, dark, 0, 0.09, 0.05);        // دوربین
      box(0.03, 0.08, 0.03, dark, 0, 0.13, 0.05);
    } else if (kind === 'shotgun') {
      box(0.07, 0.09, 0.7, dark, 0, 0, -0.15);
      box(0.08, 0.12, 0.25, mid, 0, -0.03, 0.18);
      box(0.075, 0.06, 0.3, accent, 0, -0.06, -0.2);     // پمپ چوبی
      box(0.05, 0.14, 0.06, mid, 0, -0.11, 0.22);
    } else if (kind === 'lmg') {
      box(0.09, 0.12, 0.8, dark, 0, 0, -0.2);
      box(0.14, 0.14, 0.2, mid, 0, -0.1, 0.05);         // جعبه فشنگ
      box(0.05, 0.16, 0.06, mid, 0, -0.13, 0.22);
      box(0.03, 0.1, 0.03, dark, 0, -0.12, -0.45);       // پایه
    } else if (kind === 'energy') {
      box(0.07, 0.11, 0.7, new THREE.MeshLambertMaterial({ color: 0x1a2a3a }), 0, 0, -0.15);
      box(0.03, 0.03, 0.5, energyMat, 0, 0.02, -0.4);    // نوار انرژی
      box(0.09, 0.09, 0.09, energyMat, 0, 0, -0.55);     // دهانه انرژی
      box(0.05, 0.14, 0.06, mid, 0, -0.11, 0.2);
    } else if (kind === 'smg') {
      box(0.06, 0.1, 0.55, dark, 0, 0, -0.1);
      box(0.05, 0.2, 0.07, mid, 0, -0.14, 0.05);         // خشاب بلند
      box(0.05, 0.14, 0.06, mid, 0, -0.11, 0.2);
      box(0.04, 0.04, 0.12, dark, 0, 0.07, -0.3);
    } else { // rifle
      box(0.06, 0.1, 0.7, dark, 0, 0, -0.15);
      box(0.05, 0.16, 0.07, mid, 0, -0.12, 0.1);         // خشاب
      box(0.05, 0.14, 0.06, mid, 0, -0.11, 0.22);
      box(0.04, 0.04, 0.14, dark, 0, 0.07, -0.35);
      box(0.065, 0.05, 0.2, accent, 0, -0.05, -0.3);     // دستگیره
    }
    return g;
  }

  function Player(engine) {
    this.engine = engine;
    this.yawObj = new THREE.Object3D();
    this.pitchObj = new THREE.Object3D();
    this.camera = engine.camera;
    this.pitchObj.position.y = 1.7;
    this.yawObj.add(this.pitchObj);
    this.pitchObj.add(this.camera);
    engine.scene.add(this.yawObj);

    this.position = this.yawObj.position;   // مرجع موقعیت
    this.yaw = 0;
    this.pitch = 0;
    this.velY = 0;
    this.onGround = true;
    this.health = 100;
    this.maxHealth = 100;
    this.dead = false;
    this.crouching = false;
    this.sprinting = false;
    this.ads = false;
    this.lastDamageTime = -10;
    this.stepTimer = 0;
    this.shake = 0;

    // سلاح‌ها
    this.weapons = {};       // { id: { stats, ammoInMag, reserve } }
    this.currentWeaponId = null;
    this.grenades = 3;
    this.fireCooldown = 0;
    this.reloading = false;
    this.reloadTimer = 0;
    this.triggerHeld = false;
    this.recoil = 0;
    this.bobCycle = 0;

    // مدل سلاح در دست (نسبت کوچک‌تر و خمیده مثل FPSهای حرفه‌ای)
    this.weaponGroup = new THREE.Group();
    this.camera.add(this.weaponGroup);
    this.weaponGroup.scale.set(0.62, 0.62, 0.62);
    this.weaponGroup.position.set(0.22, -0.2, -0.45);
    this.weaponGroup.rotation.set(0.06, 0.16, 0);
    this.muzzleFlash = null;
    this.muzzleLight = null;
    this.weaponModel = null;

    this._tmpV = new THREE.Vector3();
    this._tmpV2 = new THREE.Vector3();
  }

  Player.prototype = {
    chestPos: function (out) {
      out.copy(this.position);
      out.y = this.crouching ? 1.0 : 1.4;
      return out;
    },

    eyePos: function (out) {
      out.copy(this.position);
      out.y = this.crouching ? 1.1 : 1.7;
      return out;
    },

    setupWeapons: function (primaryId, secondaryId, extraWeapon) {
      this.weapons = {};
      var ids = [primaryId, secondaryId];
      if (extraWeapon && ids.indexOf(extraWeapon) === -1) ids.push(extraWeapon);
      for (var i = 0; i < ids.length; i++) {
        var st = getWeaponStats(ids[i]);
        this.weapons[ids[i]] = {
          stats: st,
          ammoInMag: st.mag,
          reserve: st.mag * 4
        };
      }
      this.grenades = 3;
      this.switchWeapon(primaryId);
    },

    current: function () {
      return this.weapons[this.currentWeaponId];
    },

    switchWeapon: function (id) {
      if (!this.weapons[id] || id === this.currentWeaponId) return;
      this.currentWeaponId = id;
      this.reloading = false;
      this.fireCooldown = 0.25;
      // تعویض مدل سلاح
      if (this.weaponModel) this.weaponGroup.remove(this.weaponModel);
      this.weaponModel = buildWeaponModel(this.current().stats.model);
      this.weaponGroup.add(this.weaponModel);
      // فلش دهانه
      if (this.muzzleFlash) this.weaponGroup.remove(this.muzzleFlash);
      var flashMat = new THREE.MeshBasicMaterial({ color: 0xffcc55, transparent: true, opacity: 0 });
      this.muzzleFlash = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 6), flashMat);
      this.muzzleFlash.rotation.x = -Math.PI / 2;
      this.muzzleFlash.position.set(0, 0.01, -0.75);
      this.weaponGroup.add(this.muzzleFlash);
      if (this.muzzleLight) this.camera.remove(this.muzzleLight);
      this.muzzleLight = new THREE.PointLight(0xffaa33, 0, 8);
      this.muzzleLight.position.set(0, 0, -1);
      this.camera.add(this.muzzleLight);
      this.engine.ui.updateWeaponHUD();
    },

    startReload: function () {
      var w = this.current();
      if (!w || this.reloading || w.ammoInMag >= w.stats.mag || w.reserve <= 0) return;
      this.reloading = true;
      this.reloadTimer = w.stats.reloadTime;
      AudioEngine.playReload();
    },

    finishReload: function () {
      var w = this.current();
      var need = w.stats.mag - w.ammoInMag;
      var take = Math.min(need, w.reserve);
      w.ammoInMag += take;
      w.reserve -= take;
      this.reloading = false;
      this.engine.ui.updateWeaponHUD();
    },

    throwGrenade: function () {
      if (this.grenades <= 0 || this.dead) return;
      this.grenades--;
      AudioEngine.playGrenadeThrow();
      var dir = new THREE.Vector3();
      this.camera.getWorldDirection(dir);
      var start = this.eyePos(new THREE.Vector3()).add(dir.clone().multiplyScalar(0.5));
      this.engine.spawnGrenade(start, dir);
      this.engine.ui.updateWeaponHUD();
    },

    shoot: function () {
      var w = this.current();
      if (!w || this.dead || this.reloading) return;
      var st = w.stats;
      if (w.ammoInMag <= 0) {
        AudioEngine.playEmptyClick();
        this.fireCooldown = 0.3;
        this.startReload();
        return;
      }
      w.ammoInMag--;
      this.fireCooldown = 60 / st.rpm;
      this.recoil = Math.min(this.recoil + st.kick * 3, 0.12);
      this.pitch += st.kick * 0.6;
      this.shake = Math.min(this.shake + st.kick * 0.5, 0.05);

      AudioEngine.playShoot(st.sound);
      SaveManager.data.stats.shots++;
      if (SaveManager.data.stats.shots % 10 === 0) SaveManager.save();

      // فلش دهانه
      this.muzzleFlash.material.opacity = 0.95;
      this.muzzleFlash.rotation.z = Math.random() * Math.PI;
      this.muzzleLight.intensity = 2.2;

      var origin = this.eyePos(new THREE.Vector3());
      var baseDir = new THREE.Vector3();
      this.camera.getWorldDirection(baseDir);
      var spread = st.spread * (this.ads ? 0.35 : 1) * (this.sprinting ? 2.2 : 1);

      for (var p = 0; p < st.pellets; p++) {
        var dir = baseDir.clone();
        dir.x += (Math.random() - 0.5) * 2 * spread;
        dir.y += (Math.random() - 0.5) * 2 * spread;
        dir.z += (Math.random() - 0.5) * 2 * spread;
        dir.normalize();
        this.engine.fireBullet(origin, dir, st, this);
      }

      this.engine.ui.updateWeaponHUD();
      if (w.ammoInMag === 0) this.startReload();
    },

    takeDamage: function (amount) {
      if (this.dead) return;
      this.health -= amount;
      this.lastDamageTime = this.engine.time;
      this.shake = Math.min(this.shake + 0.08, 0.2);
      AudioEngine.playHurt();
      this.engine.ui.showDamage();
      if (SaveManager.data.settings.vibration && navigator.vibrate) navigator.vibrate(60);
      if (this.health <= 0) {
        this.health = 0;
        this.die();
      }
    },

    heal: function (amount) {
      if (this.dead) return;
      this.health = Math.min(this.maxHealth, this.health + amount);
    },

    die: function () {
      this.dead = true;
      SaveManager.data.stats.deaths++;
      SaveManager.save();
      this.engine.onPlayerDeath();
    },

    reset: function (spawnPos, yaw) {
      this.position.set(spawnPos.x, 0, spawnPos.z);
      this.yaw = yaw || 0;
      this.pitch = 0;
      this.health = this.maxHealth;
      this.dead = false;
      this.velY = 0;
      this.crouching = false;
      this.ads = false;
      this.reloading = false;
      this.grenades = 3;
      for (var id in this.weapons) {
        var w = this.weapons[id];
        w.ammoInMag = w.stats.mag;
        w.reserve = w.stats.mag * 4;
      }
    },

    update: function (dt, input) {
      if (this.dead) return;
      var engine = this.engine;

      // ---------- چرخش دوربین ----------
      var sens = SaveManager.data.settings.sensitivity;
      this.yaw -= input.lookDX * 0.0022 * sens;
      this.pitch -= input.lookDY * 0.0022 * sens;
      this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));

      // ---------- حرکت ----------
      var speed = this.crouching ? 2.2 : (this.sprinting && !this.ads ? 6.5 : 4.2);
      var fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      var right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
      var move = new THREE.Vector3();
      if (input.forward) move.add(fwd);
      if (input.back) move.sub(fwd);
      if (input.left) move.sub(right);
      if (input.right) move.add(right);
      var moving = move.lengthSq() > 0;
      if (moving) {
        move.normalize().multiplyScalar(speed * dt);
        this.position.add(move);
        engine.resolveCollision(this.position, 0.5);
        // صدای قدم
        this.stepTimer -= dt * speed;
        if (this.stepTimer <= 0) {
          this.stepTimer = 2.2;
          AudioEngine.playStep();
        }
        this.bobCycle += dt * speed * 1.6;
      }

      // ---------- پرش و گرانش ----------
      if (input.jump && this.onGround && !this.crouching) {
        this.velY = 5.2;
        this.onGround = false;
      }
      if (!this.onGround) {
        this.velY -= 13 * dt;
        this.position.y += this.velY * dt;
        if (this.position.y <= 0) {
          this.position.y = 0;
          this.velY = 0;
          this.onGround = true;
        }
      }

      // ---------- اعمال چرخش ----------
      this.yawObj.rotation.y = this.yaw;
      var recoilPitch = this.recoil * 0.4;
      this.pitchObj.rotation.x = this.pitch + recoilPitch + (this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0);
      this.recoil *= Math.pow(0.001, dt); // بازگشت سریع لگد
      this.shake *= Math.pow(0.0001, dt);

      // ارتفاع چشم (خم شدن)
      var targetEye = this.crouching ? 1.1 : 1.7;
      this.pitchObj.position.y += (targetEye - this.pitchObj.position.y) * Math.min(1, dt * 10);

      // ---------- سلاح: نشانه‌گیری و لگد ----------
      var targetPos = this.ads ? new THREE.Vector3(0, -0.135, -0.35) : new THREE.Vector3(0.22, -0.2, -0.45);
      this.weaponGroup.position.lerp(targetPos, Math.min(1, dt * 12));
      // تاب خوردن سلاح هنگام راه رفتن
      if (moving && !this.ads) {
        this.weaponGroup.position.y += Math.sin(this.bobCycle) * 0.012;
        this.weaponGroup.position.x += Math.cos(this.bobCycle * 0.5) * 0.008;
      }
      // انیمیشن تعویض خشاب
      if (this.reloading) {
        this.reloadTimer -= dt;
        var t = 1 - Math.max(0, this.reloadTimer / this.current().stats.reloadTime);
        this.weaponGroup.rotation.x = Math.sin(t * Math.PI) * 0.5;
        if (this.reloadTimer <= 0) this.finishReload();
      } else {
        this.weaponGroup.rotation.x *= 0.8;
      }
      // لگد سلاح
      this.weaponGroup.position.z += this.recoil * 0.4;

      // محو شدن فلش دهانه
      if (this.muzzleFlash.material.opacity > 0) {
        this.muzzleFlash.material.opacity = Math.max(0, this.muzzleFlash.material.opacity - dt * 14);
      }
      this.muzzleLight.intensity = Math.max(0, this.muzzleLight.intensity - dt * 20);

      // ---------- شلیک ----------
      this.fireCooldown -= dt;
      if (this.triggerHeld && this.fireCooldown <= 0) {
        if (this.current().stats.auto || input.firePressed) {
          this.shoot();
        }
      }
      input.firePressed = false;

      // ---------- بازسازی سلامتی ----------
      if (engine.time - this.lastDamageTime > 6 && this.health < this.maxHealth) {
        this.health = Math.min(this.maxHealth, this.health + dt * 4);
      }

      // ---------- میدان دید هنگام نشانه‌گیری ----------
      var targetFov = this.ads ? this.current().stats.zoomFov : SaveManager.data.settings.fov;
      if (Math.abs(this.camera.fov - targetFov) > 0.1) {
        this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 10);
        this.camera.updateProjectionMatrix();
      }
      // نمایش دوربین تک‌تیرانداز
      this.engine.ui.setScope(this.ads && this.current().stats.model === 'sniper');
    }
  };

  window.Player = Player;
  window.buildWeaponModel = buildWeaponModel;
})();
