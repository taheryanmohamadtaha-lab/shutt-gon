/* ============================================================
   عملیات سایه — enemies.js
   انواع دشمن، ساخت مدل سه‌بعدی و هوش مصنوعی
   ============================================================ */
(function () {
  'use strict';

  var ENEMY_TYPES = {
    soldier:   { name: 'سرباز',       hp: 100, speed: 3.2, damage: 8,  fireInterval: 1.1, burst: 3, range: 55, accuracy: 0.45, scale: 1.0,  color: 0x5a6b4f, preferredRange: 18 },
    rusher:    { name: 'مهاجم سریع',  hp: 70,  speed: 5.6, damage: 6,  fireInterval: 0.8, burst: 4, range: 40, accuracy: 0.35, scale: 0.95, color: 0x8a5a3a, preferredRange: 8 },
    sniper:    { name: 'تک‌تیرانداز', hp: 80,  speed: 2.6, damage: 35, fireInterval: 2.8, burst: 1, range: 110, accuracy: 0.75, scale: 1.0,  color: 0x3a4a5a, preferredRange: 45 },
    armored:   { name: 'نیروی زرهی',  hp: 320, speed: 2.4, damage: 12, fireInterval: 1.0, burst: 4, range: 60, accuracy: 0.5, scale: 1.15, color: 0x4a4a55, preferredRange: 20 },
    heavy:     { name: 'سلاح سنگین',  hp: 220, speed: 2.2, damage: 10, fireInterval: 0.55, burst: 8, range: 55, accuracy: 0.4, scale: 1.2,  color: 0x6b3a3a, preferredRange: 16 },
    commander: { name: 'فرمانده',     hp: 900, speed: 3.4, damage: 16, fireInterval: 0.7, burst: 6, range: 70, accuracy: 0.6, scale: 1.3,  color: 0x7a2a2a, preferredRange: 22 }
  };

  // متریال اختصاصی برای هر دشمن (تا افکت آسیب روی بقیه اثر نگذارد)
  function mat(color) {
    return new THREE.MeshLambertMaterial({ color: color });
  }

  // ساخت مدل ساده و اختصاصی سرباز از مکعب‌ها
  function buildEnemyMesh(typeKey) {
    var t = ENEMY_TYPES[typeKey];
    var g = new THREE.Group();
    var s = t.scale;

    var bodyMat = mat(t.color);
    var darkMat = mat(0x2a2a2a);
    var skinMat = mat(0xc9a080);

    // پاها
    var legL = new THREE.Mesh(new THREE.BoxGeometry(0.22 * s, 0.8 * s, 0.22 * s), darkMat);
    legL.position.set(-0.14 * s, 0.4 * s, 0);
    var legR = legL.clone(); legR.position.x = 0.14 * s;
    // بدن
    var body = new THREE.Mesh(new THREE.BoxGeometry(0.62 * s, 0.75 * s, 0.36 * s), bodyMat);
    body.position.y = 1.18 * s;
    // جلیقه
    var vest = new THREE.Mesh(new THREE.BoxGeometry(0.66 * s, 0.4 * s, 0.42 * s), darkMat);
    vest.position.y = 1.25 * s;
    // سر
    var head = new THREE.Mesh(new THREE.BoxGeometry(0.34 * s, 0.36 * s, 0.34 * s), skinMat);
    head.position.y = 1.75 * s;
    // کلاه‌خود
    var helmet = new THREE.Mesh(new THREE.BoxGeometry(0.42 * s, 0.2 * s, 0.42 * s), bodyMat);
    helmet.position.y = 1.95 * s;
    // دست‌ها و سلاح
    var armL = new THREE.Mesh(new THREE.BoxGeometry(0.16 * s, 0.5 * s, 0.16 * s), bodyMat);
    armL.position.set(-0.42 * s, 1.25 * s, 0.15 * s);
    armL.rotation.x = -0.9;
    var armR = armL.clone(); armR.position.x = 0.42 * s;
    var gun = new THREE.Mesh(new THREE.BoxGeometry(0.09 * s, 0.12 * s, 0.75 * s), darkMat);
    gun.position.set(0.1 * s, 1.35 * s, 0.45 * s);

    g.add(legL, legR, body, vest, head, helmet, armL, armR, gun);

    // برچسب قسمت‌های بدن برای هدشات
    head.userData.part = 'head';
    body.userData.part = 'body';
    vest.userData.part = 'body';
    helmet.userData.part = 'head';

    g.userData.parts = { legL: legL, legR: legR, head: head, body: body, gun: gun };
    return g;
  }

  // نوار سلامتی بالای سر دشمن (اسپریت)
  function makeHealthBar() {
    var canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 8;
    var tex = new THREE.CanvasTexture(canvas);
    var sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
    sprite.scale.set(1.1, 0.14, 1);
    sprite.position.y = 2.25;
    sprite.userData = { canvas: canvas, tex: tex };
    return sprite;
  }

  function drawHealthBar(sprite, ratio) {
    var c = sprite.userData.canvas, ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 64, 8);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, 64, 8);
    ctx.fillStyle = ratio > 0.5 ? '#4caf50' : (ratio > 0.25 ? '#ff9800' : '#f44336');
    ctx.fillRect(1, 1, 62 * Math.max(0, ratio), 6);
    sprite.userData.tex.needsUpdate = true;
  }

  // علامت هدف (برای مأموریت تک‌تیرانداز)
  function makeMarker(color) {
    var canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    var ctx = canvas.getContext('2d');
    ctx.strokeStyle = color || '#ff2222';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(32, 32, 22, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(32, 2); ctx.lineTo(32, 18);
    ctx.moveTo(32, 46); ctx.lineTo(32, 62);
    ctx.moveTo(2, 32); ctx.lineTo(18, 32);
    ctx.moveTo(46, 32); ctx.lineTo(62, 32);
    ctx.stroke();
    var tex = new THREE.CanvasTexture(canvas);
    var sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
    sprite.scale.set(0.7, 0.7, 1);
    sprite.position.y = 2.7;
    return sprite;
  }

  function Enemy(typeKey, position, engine, opts) {
    opts = opts || {};
    this.typeKey = typeKey;
    this.type = ENEMY_TYPES[typeKey];
    this.engine = engine;
    this.hp = this.type.hp * (opts.hpMul || 1);
    this.maxHp = this.hp;
    this.dead = false;
    this.state = 'patrol';           // patrol | alert | combat | retreat
    this.mesh = buildEnemyMesh(typeKey);
    this.mesh.position.copy(position);
    this.healthBar = makeHealthBar();
    this.mesh.add(this.healthBar);
    drawHealthBar(this.healthBar, 1);
    this.marker = null;
    if (opts.marked) {
      this.marker = makeMarker();
      this.mesh.add(this.marker);
    }
    this.radius = 0.45 * this.type.scale;
    this.speed = this.type.speed * (0.9 + Math.random() * 0.2);
    this.yaw = Math.random() * Math.PI * 2;
    this.patrolTarget = null;
    this.lastKnownPlayerPos = new THREE.Vector3();
    this.losTimer = Math.random() * 0.2;
    this.hasLOS = false;
    this.shootCooldown = 1 + Math.random();
    this.burstLeft = 0;
    this.burstPause = 0;
    this.strafeDir = Math.random() < 0.5 ? 1 : -1;
    this.strafeTimer = 0;
    this.coverTimer = 0;
    this.coverTarget = null;
    this.walkCycle = Math.random() * 10;
    this.flashTimer = 0;
    this.calledReinforcements = false;
    this.deathTimer = 0;
    this.alertLevel = 0;             // 0 = بی‌خبر، 1 = مشکوک، 2 = آگاه
    this.isBoss = typeKey === 'commander';
    this.waveStage = 0;

    // ثبت مش‌ها برای برخورد گلوله
    var self = this;
    this.mesh.traverse(function (o) {
      if (o.isMesh) {
        o.userData.enemy = self;
        engine.shootables.push(o);
      }
    });
  }

  Enemy.prototype = {
    eyePos: function (out) {
      out.copy(this.mesh.position);
      out.y = 1.7 * this.type.scale;
      return out;
    },

    takeDamage: function (amount, isHeadshot, hitPoint) {
      if (this.dead) return;
      this.hp -= amount;
      this.flashTimer = 0.12;
      this.alertLevel = 2;
      this.state = this.hp < this.maxHp * 0.25 && !this.isBoss ? 'retreat' : 'combat';
      this.lastKnownPlayerPos.copy(this.engine.player.position);
      drawHealthBar(this.healthBar, this.hp / this.maxHp);

      // درخواست نیروی کمکی (فرمانده و زرهی)
      if ((this.isBoss || this.typeKey === 'armored') && !this.calledReinforcements && this.hp < this.maxHp * 0.5) {
        this.calledReinforcements = true;
        this.engine.spawnReinforcements(this.mesh.position, this.isBoss ? 3 : 2);
      }

      // موج‌های باس
      if (this.isBoss) {
        var ratio = this.hp / this.maxHp;
        if (ratio < 0.66 && this.waveStage === 0) { this.waveStage = 1; this.engine.spawnReinforcements(this.mesh.position, 3); }
        if (ratio < 0.33 && this.waveStage === 1) { this.waveStage = 2; this.engine.spawnReinforcements(this.mesh.position, 4); }
      }

      if (this.hp <= 0) this.die(isHeadshot, hitPoint);
    },

    die: function (isHeadshot, hitPoint) {
      this.dead = true;
      this.deathTimer = 0;
      this.engine.onEnemyKilled(this, isHeadshot, hitPoint);
    },

    update: function (dt) {
      var engine = this.engine;
      var player = engine.player;
      var pos = this.mesh.position;

      // انیمیشن مرگ: افتادن
      if (this.dead) {
        this.deathTimer += dt;
        this.mesh.rotation.x = Math.min(Math.PI / 2, this.deathTimer * 4);
        this.mesh.position.y = Math.max(0, 0.3 - this.deathTimer * 0.2);
        if (this.deathTimer > 4) {
          engine.removeEnemy(this);
        }
        return;
      }

      // فلش قرمز هنگام آسیب (فقط هنگام تغییر وضعیت، نه هر فریم)
      if (this.flashTimer > 0) {
        this.flashTimer -= dt;
        if (!this._flashOn) {
          this._flashOn = true;
          this.mesh.traverse(function (o) {
            if (o.isMesh && o.material && o.material.emissive) o.material.emissive.setHex(0x661111);
          });
        }
      } else if (this._flashOn) {
        this._flashOn = false;
        this.mesh.traverse(function (o) {
          if (o.isMesh && o.material && o.material.emissive) o.material.emissive.setHex(0x000000);
        });
      }

      var distToPlayer = pos.distanceTo(player.position);
      var playerAlive = !player.dead;

      // بررسی خط دید (با فاصله زمانی برای بهینه‌سازی)
      this.losTimer -= dt;
      if (this.losTimer <= 0) {
        this.losTimer = 0.15 + Math.random() * 0.1;
        this.hasLOS = playerAlive && engine.hasLineOfSight(this.eyePos(new THREE.Vector3()), player.chestPos(new THREE.Vector3()));
        if (this.hasLOS) {
          this.lastKnownPlayerPos.copy(player.position);
          if (this.alertLevel < 2) {
            this.alertLevel = 2;
            this.state = 'combat';
            engine.onEnemyAlerted(this);
          }
        } else if (this.alertLevel === 2 && distToPlayer > 60) {
          this.alertLevel = 1;
          this.state = 'alert';
        }
      }

      var moveTarget = null;
      var desiredSpeed = this.speed;
      var faceTarget = null;

      switch (this.state) {
        case 'patrol': {
          if (!this.patrolTarget || pos.distanceTo(this.patrolTarget) < 1.5) {
            this.patrolTarget = engine.randomPointInMap(6);
          }
          moveTarget = this.patrolTarget;
          desiredSpeed = this.speed * 0.4;
          // دید محیطی: اگر بازیکن نزدیک باشد مشکوک می‌شود
          if (playerAlive && distToPlayer < 14 && this.hasLOS) {
            this.alertLevel = 1;
            this.state = 'alert';
          }
          break;
        }
        case 'alert': {
          moveTarget = this.lastKnownPlayerPos;
          desiredSpeed = this.speed * 0.8;
          faceTarget = this.lastKnownPlayerPos;
          if (this.hasLOS) { this.state = 'combat'; this.alertLevel = 2; }
          if (pos.distanceTo(this.lastKnownPlayerPos) < 2) {
            this.alertLevel = 0; this.state = 'patrol';
          }
          break;
        }
        case 'retreat': {
          // عقب‌نشینی به سمت دورترین نقطه از بازیکن
          var away = pos.clone().sub(player.position).normalize().multiplyScalar(10).add(pos);
          moveTarget = away;
          desiredSpeed = this.speed * 1.1;
          faceTarget = player.position;
          if (this.hp > this.maxHp * 0.4) this.state = 'combat';
          break;
        }
        case 'combat': {
          faceTarget = player.position;
          var pref = this.type.preferredRange;
          var toPlayer = player.position.clone().sub(pos);
          toPlayer.y = 0;
          var dist = toPlayer.length();
          toPlayer.normalize();

          this.strafeTimer -= dt;
          if (this.strafeTimer <= 0) {
            this.strafeTimer = 1.5 + Math.random() * 2;
            this.strafeDir = Math.random() < 0.5 ? 1 : -1;
          }

          // پناه گرفتن گاه‌به‌گاه
          this.coverTimer -= dt;
          if (this.coverTimer <= 0 && this.typeKey !== 'rusher') {
            this.coverTimer = 4 + Math.random() * 4;
            this.coverTarget = engine.nearestCoverPoint(pos);
          }
          if (this.coverTarget) {
            moveTarget = this.coverTarget;
            desiredSpeed = this.speed * 0.9;
            if (pos.distanceTo(this.coverTarget) < 1.2) this.coverTarget = null;
          } else if (dist > pref + 6) {
            moveTarget = player.position;                    // نزدیک شو
            desiredSpeed = this.speed;
          } else if (dist < pref - 6) {
            moveTarget = pos.clone().sub(toPlayer.multiplyScalar(10)); // دور شو
            desiredSpeed = this.speed * 0.8;
          } else {
            // حرکت عرضی (استراف)
            var side = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x).multiplyScalar(this.strafeDir * 6);
            moveTarget = pos.clone().add(side);
            desiredSpeed = this.speed * 0.55;
          }
          break;
        }
      }

      // ---------- حرکت ----------
      var moving = false;
      if (moveTarget) {
        var dir = moveTarget.clone().sub(pos);
        dir.y = 0;
        var d = dir.length();
        if (d > 0.3) {
          dir.normalize();
          // اجتناب از موانع: اگر جلوی دشمن دیوار است، به پهلو برو
          var probe = pos.clone().add(dir.clone().multiplyScalar(1.2));
          if (engine.isPointBlocked(probe, this.radius)) {
            var sideDir = new THREE.Vector3(-dir.z, 0, dir.x);
            dir.add(sideDir.multiplyScalar(0.8)).normalize();
          }
          pos.add(dir.multiplyScalar(desiredSpeed * dt));
          engine.resolveCollision(pos, this.radius);
          moving = true;
          // چرخش به سمت حرکت یا هدف
          var lookAt = faceTarget || moveTarget;
          this.yaw = Math.atan2(lookAt.x - pos.x, lookAt.z - pos.z);
        }
      } else if (faceTarget) {
        this.yaw = Math.atan2(faceTarget.x - pos.x, faceTarget.z - pos.z);
      }
      this.mesh.rotation.y = this.yaw;

      // انیمیشن راه رفتن (تاب خوردن پاها)
      if (moving) {
        this.walkCycle += dt * desiredSpeed * 2.2;
        var swing = Math.sin(this.walkCycle) * 0.5;
        this.mesh.userData.parts.legL.rotation.x = swing;
        this.mesh.userData.parts.legR.rotation.x = -swing;
      } else {
        this.mesh.userData.parts.legL.rotation.x *= 0.8;
        this.mesh.userData.parts.legR.rotation.x *= 0.8;
      }

      // ---------- تیراندازی ----------
      if (this.state === 'combat' && this.hasLOS && playerAlive && distToPlayer < this.type.range) {
        this.shootCooldown -= dt;
        if (this.shootCooldown <= 0) {
          if (this.burstLeft <= 0) {
            this.burstLeft = this.type.burst;
            this.burstPause = this.type.fireInterval * (2 + Math.random() * 2);
          }
          this.burstLeft--;
          this.shootCooldown = this.type.fireInterval;
          engine.enemyShoot(this, distToPlayer);
          if (this.burstLeft <= 0) this.shootCooldown = this.burstPause;
        }
      } else {
        this.shootCooldown = Math.max(this.shootCooldown - dt, 0.3);
      }

      // علامت هدف بالا و پایین
      if (this.marker) {
        this.marker.position.y = 2.7 + Math.sin(engine.time * 3) * 0.1;
      }
    }
  };

  window.ENEMY_TYPES = ENEMY_TYPES;
  window.Enemy = Enemy;
  window.buildEnemyMesh = buildEnemyMesh;
})();
