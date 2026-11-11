/* ============================================================
   عملیات سایه — ui.js
   مدیریت صفحات منو، HUD بازی و تنظیمات (کاملاً فارسی)
   ============================================================ */
(function () {
  'use strict';

  var ACHIEVEMENTS = [
    { id: 'first_kill', name: 'اولین شکار', desc: 'اولین دشمن را از بین ببرید' },
    { id: 'killer10', name: 'شکارچی حرفه‌ای', desc: '۱۰ دشمن را از بین ببرید' },
    { id: 'killer50', name: 'افسانه سایه', desc: '۵۰ دشمن را از بین ببرید' },
    { id: 'headshot', name: 'تک‌تیرانداز دقیق', desc: 'یک هدشات بزنید' },
    { id: 'rescuer', name: 'نجات‌دهنده', desc: 'مأموریت نجات گروگان‌ها را کامل کنید' },
    { id: 'champion', name: 'قهرمان عملیات سایه', desc: 'فرمانده دشمن را شکست دهید' }
  ];

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function UI(engine) {
    this.engine = engine;
    this.toastTimer = null;
    this.alertTimer = null;
  }

  UI.prototype = {
    // ============================================================
    // مدیریت صفحات
    // ============================================================
    showScreen: function (id) {
      var screens = document.querySelectorAll('.screen');
      for (var i = 0; i < screens.length; i++) screens[i].classList.remove('active');
      var target = $(id);
      if (target) target.classList.add('active');
      if (id === 'screen-game') {
        $('hud').style.display = 'block';
      } else {
        $('hud').style.display = 'none';
      }
      AudioEngine.playClick();
    },

    refreshMenu: function () {
      var d = SaveManager.data;
      var rank = SaveManager.getRank();
      $('menu-rank').textContent = rank.name;
      $('menu-money').textContent = d.money.toLocaleString('fa-IR');
      $('menu-xp').textContent = d.xp.toLocaleString('fa-IR');
      $('menu-score').textContent = d.totalScore.toLocaleString('fa-IR');
      $('rank-progress').style.width = Math.round(rank.progress * 100) + '%';
      var daily = SaveManager.getDaily();
      $('daily-progress').textContent = 'امروز: ' + daily.kills + ' / ۱۵ کشته';
      $('btn-daily-claim').disabled = daily.rewardClaimed || daily.kills < 15;
      $('btn-daily-claim').textContent = daily.rewardClaimed ? 'پاداش دریافت شد ✅' : 'دریافت پاداش (۵۰۰ پول)';
    },

    // ============================================================
    // انتخاب مرحله
    // ============================================================
    renderLevels: function () {
      var list = $('levels-list');
      list.innerHTML = '';
      var unlocked = SaveManager.data.unlockedMissions;
      MISSIONS.forEach(function (m) {
        var isLocked = m.id > unlocked;
        var done = SaveManager.data.completedMissions[m.id];
        var card = el('div', 'level-card' + (isLocked ? ' locked' : ''));
        card.innerHTML =
          '<div class="level-num">مرحله ' + m.id + '</div>' +
          '<div class="level-name">' + m.name + '</div>' +
          '<div class="level-desc">' + m.desc + '</div>' +
          '<div class="level-obj">🎯 ' + m.objectiveText + '</div>' +
          (done ? '<div class="level-best">⭐ بهترین امتیاز: ' + done.bestScore.toLocaleString('fa-IR') + '</div>' : '') +
          (isLocked ? '<div class="level-lock">🔒 برای باز شدن، مرحله قبلی را کامل کنید</div>' : '');
        if (!isLocked) {
          var btn = el('button', 'btn btn-primary btn-block', 'شروع مأموریت');
          btn.addEventListener('click', function () {
            AudioEngine.init(); AudioEngine.resume();
            UI.current.showScreen('screen-game');
            UI.current.engine.startMission(m);
            UI.current.engine.requestPointerLock();
          });
          card.appendChild(btn);
        }
        list.appendChild(card);
      });
    },

    // ============================================================
    // انتخاب سلاح
    // ============================================================
    renderWeapons: function () {
      var list = $('weapons-list');
      list.innerHTML = '';
      var d = SaveManager.data;
      WEAPON_ORDER.forEach(function (wid) {
        var w = WEAPONS[wid];
        var owned = d.ownedWeapons.indexOf(wid) !== -1;
        var equipped = d.equipped.primary === wid || d.equipped.secondary === wid;
        var stats = getWeaponStats(wid);
        var card = el('div', 'weapon-card' + (equipped ? ' equipped' : ''));
        var stars = '';
        var up = stats.upgrades;
        var totalUp = up.dmg + up.acc + up.mag + up.rate;
        for (var s = 0; s < Math.floor(totalUp / 4); s++) stars += '⭐';
        card.innerHTML =
          '<div class="weapon-name">' + w.name + ' ' + stars + '</div>' +
          '<div class="weapon-desc">' + w.desc + '</div>' +
          '<div class="weapon-stats">' +
          '<span>آسیب: ' + stats.damage + '</span>' +
          '<span>خشاب: ' + stats.mag + '</span>' +
          '<span>سرعت: ' + stats.rpm + '</span>' +
          '<span>برد: ' + stats.range + '</span>' +
          '</div>';
        if (owned) {
          var btn = el('button', 'btn ' + (equipped ? 'btn-success' : 'btn-primary') + ' btn-block',
            equipped ? '✅ مجهز شده' : 'تجهیز');
          btn.disabled = equipped;
          btn.addEventListener('click', function () {
            if (w.slot === 'primary') d.equipped.primary = wid;
            else d.equipped.secondary = wid;
            SaveManager.save();
            UI.current.renderWeapons();
            UI.current.toast('سلاح «' + w.name + '» مجهز شد', 2000);
          });
          card.appendChild(btn);
        } else {
          var buyBtn = el('button', 'btn btn-warning btn-block', 'خرید: ' + w.price.toLocaleString('fa-IR') + ' پول');
          buyBtn.addEventListener('click', function () {
            if (d.money < w.price) { UI.current.toast('❌ پول کافی ندارید!', 2000); return; }
            d.money -= w.price;
            d.ownedWeapons.push(wid);
            if (w.slot === 'primary') d.equipped.primary = wid;
            else d.equipped.secondary = wid;
            SaveManager.save();
            UI.current.renderWeapons();
            UI.current.refreshMenu();
            UI.current.toast('🎉 سلاح «' + w.name + '» خریداری شد!', 2500);
            AudioEngine.playPickup();
          });
          card.appendChild(buyBtn);
        }
        list.appendChild(card);
      });
    },

    // ============================================================
    // فروشگاه و ارتقا
    // ============================================================
    renderShop: function () {
      var list = $('shop-list');
      list.innerHTML = '';
      var d = SaveManager.data;
      $('shop-money').textContent = d.money.toLocaleString('fa-IR');
      WEAPON_ORDER.forEach(function (wid) {
        var owned = d.ownedWeapons.indexOf(wid) !== -1;
        if (!owned) return;
        var stats = getWeaponStats(wid);
        var card = el('div', 'shop-card');
        card.innerHTML = '<div class="weapon-name">' + stats.name + '</div>';
        var upRow = el('div', 'upgrade-row');
        Object.keys(UPGRADE_TYPES).forEach(function (type) {
          var lvl = stats.upgrades[type] || 0;
          var cost = upgradeCost(wid, type);
          var btn = el('button', 'btn btn-small ' + (cost < 0 ? 'btn-success' : 'btn-warning'),
            UPGRADE_TYPES[type].name + ' ' + '●'.repeat(lvl) + '○'.repeat(MAX_UPGRADE - lvl) +
            (cost >= 0 ? '<br>' + cost.toLocaleString('fa-IR') + ' پول' : '<br>حداکثر'));
          btn.disabled = cost < 0;
          btn.title = UPGRADE_TYPES[type].desc;
          btn.addEventListener('click', function () {
            var res = buyUpgrade(wid, type);
            UI.current.toast(res.msg, 2000);
            if (res.ok) { AudioEngine.playPickup(); UI.current.renderShop(); UI.current.refreshMenu(); }
          });
          upRow.appendChild(btn);
        });
        card.appendChild(upRow);
        list.appendChild(card);
      });
    },

    // ============================================================
    // پروفایل
    // ============================================================
    renderProfile: function () {
      var d = SaveManager.data;
      var rank = SaveManager.getRank();
      var acc = d.stats.shots > 0 ? Math.round(d.stats.hits / d.stats.shots * 100) : 0;
      $('profile-content').innerHTML =
        '<div class="profile-box">' +
        '<div class="profile-rank">🎖️ درجه: ' + rank.name + '</div>' +
        '<div class="progress-bar"><div class="progress-fill" style="width:' + Math.round(rank.progress * 100) + '%"></div></div>' +
        '<div>تجربه: ' + d.xp.toLocaleString('fa-IR') + (rank.next ? ' — تا درجه «' + rank.next + '»: ' + Math.round(rank.progress * 100) + '٪' : ' (حداکثر درجه)') + '</div>' +
        '</div>' +
        '<div class="profile-stats">' +
        '<div>💀 کشته‌ها: ' + d.stats.kills.toLocaleString('fa-IR') + '</div>' +
        '<div>🎯 دقت تیراندازی: ' + acc + '٪</div>' +
        '<div>🎖️ مأموریت‌های کامل‌شده: ' + d.stats.missionsDone + '</div>' +
        '<div>💀 دفعات مرگ: ' + d.stats.deaths + '</div>' +
        '<div>🎯 هدشات‌ها: ' + d.stats.headshots + '</div>' +
        '<div>💣 کشته با نارنجک: ' + d.stats.grenadeKills + '</div>' +
        '<div>⭐ مجموع امتیاز: ' + d.totalScore.toLocaleString('fa-IR') + '</div>' +
        '<div>💰 پول: ' + d.money.toLocaleString('fa-IR') + '</div>' +
        '<div>⏱️ زمان بازی: ' + Math.floor(d.stats.playTime / 60) + ' دقیقه</div>' +
        '</div>';
    },

    // ============================================================
    // دستاوردها
    // ============================================================
    renderAchievements: function () {
      var list = $('achievements-list');
      list.innerHTML = '';
      var unlocked = SaveManager.data.achievements;
      ACHIEVEMENTS.forEach(function (a) {
        var has = !!unlocked[a.id];
        var card = el('div', 'achievement-card' + (has ? ' unlocked' : ' locked'));
        card.innerHTML = '<div class="ach-name">' + (has ? '🏆' : '🔒') + ' ' + a.name + '</div>' +
          '<div class="ach-desc">' + a.desc + '</div>';
        list.appendChild(card);
      });
    },

    // ============================================================
    // تنظیمات
    // ============================================================
    renderSettings: function () {
      var s = SaveManager.data.settings;
      $('set-quality').value = s.quality;
      $('set-sensitivity').value = s.sensitivity;
      $('set-sensitivity-val').textContent = s.sensitivity.toFixed(1);
      $('set-music').value = s.musicVolume;
      $('set-sfx').value = s.sfxVolume;
      $('set-vibration').checked = s.vibration;
      $('set-shadows').checked = s.shadows;
      $('set-fov').value = s.fov;
      $('set-fov-val').textContent = s.fov;
      $('set-btnscale').value = s.buttonScale;
      $('set-btnscale-val').textContent = Math.round(s.buttonScale * 100) + '٪';
      this.applyButtonScale();
    },

    applyButtonScale: function () {
      var scale = SaveManager.data.settings.buttonScale;
      var controls = document.querySelectorAll('#touch-controls .touch-btn');
      for (var i = 0; i < controls.length; i++) {
        controls[i].style.width = (64 * scale) + 'px';
        controls[i].style.height = (64 * scale) + 'px';
        controls[i].style.fontSize = (11 * scale) + 'px';
      }
      var fire = $('btn-fire');
      if (fire) { fire.style.width = (84 * scale) + 'px'; fire.style.height = (84 * scale) + 'px'; }
    },

    bindSettings: function () {
      var self = this;
      function save() { SaveManager.save(); }

      $('set-quality').addEventListener('change', function () {
        SaveManager.data.settings.quality = this.value; save();
        if (self.engine.initialized) self.engine.applyQuality();
      });
      $('set-sensitivity').addEventListener('input', function () {
        SaveManager.data.settings.sensitivity = parseFloat(this.value);
        $('set-sensitivity-val').textContent = parseFloat(this.value).toFixed(1); save();
      });
      $('set-music').addEventListener('input', function () {
        SaveManager.data.settings.musicVolume = parseFloat(this.value); save();
        AudioEngine.applyVolumes();
      });
      $('set-sfx').addEventListener('input', function () {
        SaveManager.data.settings.sfxVolume = parseFloat(this.value); save();
        AudioEngine.applyVolumes();
      });
      $('set-vibration').addEventListener('change', function () {
        SaveManager.data.settings.vibration = this.checked; save();
      });
      $('set-shadows').addEventListener('change', function () {
        SaveManager.data.settings.shadows = this.checked; save();
        if (self.engine.initialized) self.engine.applyQuality();
      });
      $('set-fov').addEventListener('input', function () {
        SaveManager.data.settings.fov = parseInt(this.value, 10);
        $('set-fov-val').textContent = this.value; save();
        if (self.engine.initialized && !self.engine.player.ads) {
          self.engine.camera.fov = parseInt(this.value, 10);
          self.engine.camera.updateProjectionMatrix();
        }
      });
      $('set-btnscale').addEventListener('input', function () {
        SaveManager.data.settings.buttonScale = parseFloat(this.value);
        $('set-btnscale-val').textContent = Math.round(parseFloat(this.value) * 100) + '٪';
        save(); self.applyButtonScale();
      });
      $('btn-reset-save').addEventListener('click', function () {
        if (confirm('آیا از حذف کامل پیشرفت بازی مطمئن هستید؟')) {
          SaveManager.reset();
          self.refreshMenu();
          self.toast('پیشرفت بازی حذف شد', 2000);
        }
      });
    },

    // ============================================================
    // HUD بازی
    // ============================================================
    onMissionStart: function (mission) {
      $('mission-name').textContent = mission.name;
      $('objective-text').textContent = mission.objectiveText;
      this.updateHUD();
      this.updateWeaponHUD();
      this.setNightVision(false);
      var nvBtn = $('btn-nightvision');
      if (nvBtn) nvBtn.style.display = mission.night ? 'flex' : 'none';
      this.showBriefing(mission);
    },

    showBriefing: function (mission) {
      $('briefing-text').textContent = mission.briefing;
      $('briefing-box').style.display = 'flex';
      var self = this;
      setTimeout(function () { $('briefing-box').style.display = 'none'; }, 5000);
    },

    updateHUD: function () {
      var engine = this.engine;
      if (!engine.player) return;
      var hp = Math.max(0, Math.round(engine.player.health));
      $('health-fill').style.width = hp + '%';
      $('health-text').textContent = hp;
      $('health-fill').style.background = hp > 50 ? '#4caf50' : (hp > 25 ? '#ff9800' : '#f44336');
      $('score-text').textContent = engine.score.toLocaleString('fa-IR');
      $('kills-text').textContent = engine.kills;
      $('objective-progress').textContent = engine.getObjectiveProgress();
      if (engine.mission && engine.mission.timeLimit > 0) {
        var left = Math.max(0, engine.mission.timeLimit - engine.missionTime);
        var mm = Math.floor(left / 60), ss = Math.floor(left % 60);
        $('timer-text').textContent = mm + ':' + (ss < 10 ? '0' : '') + ss;
        $('timer-box').style.display = 'block';
        $('timer-box').style.color = left < 30 ? '#ff4444' : '#fff';
      } else {
        $('timer-box').style.display = 'none';
      }
      $('grenade-count').textContent = engine.player.grenades;
    },

    updateWeaponHUD: function () {
      var p = this.engine.player;
      if (!p || !p.current()) return;
      var w = p.current();
      $('ammo-mag').textContent = w.ammoInMag;
      $('ammo-reserve').textContent = w.reserve;
      $('weapon-name').textContent = w.stats.name;
      $('reload-hint').style.display = p.reloading ? 'block' : 'none';
    },

    showHitmarker: function (isHead) {
      var hm = $('hitmarker');
      hm.style.color = isHead ? '#ff2222' : '#ffffff';
      hm.style.opacity = '1';
      hm.style.transform = 'translate(-50%,-50%) scale(' + (isHead ? 1.5 : 1.1) + ')';
      setTimeout(function () { hm.style.opacity = '0'; }, 120);
    },

    showDamage: function () {
      var v = $('damage-vignette');
      v.style.opacity = '0.85';
      setTimeout(function () { v.style.opacity = '0'; }, 250);
    },

    showAlertIndicator: function () {
      var a = $('alert-indicator');
      a.style.display = 'block';
      var self = this;
      clearTimeout(this.alertTimer);
      this.alertTimer = setTimeout(function () { a.style.display = 'none'; }, 1500);
    },

    setScope: function (on) {
      $('scope-overlay').style.display = on ? 'block' : 'none';
      $('crosshair').style.display = on ? 'none' : 'block';
    },

    setNightVision: function (on) {
      $('nightvision-overlay').style.display = on ? 'block' : 'none';
    },

    toast: function (msg, duration) {
      var t = $('toast');
      t.textContent = msg;
      t.style.display = 'block';
      t.style.opacity = '1';
      clearTimeout(this.toastTimer);
      var self = this;
      this.toastTimer = setTimeout(function () {
        t.style.opacity = '0';
        setTimeout(function () { t.style.display = 'none'; }, 300);
      }, duration || 2500);
    },

    // ============================================================
    // نقشه کوچک
    // ============================================================
    drawMinimap: function () {
      var canvas = $('minimap');
      if (!canvas || !this.engine.mission) return;
      var ctx = canvas.getContext('2d');
      var W = canvas.width, H = canvas.height;
      var half = this.engine.mapHalf;
      function toMap(x, z) {
        return [W / 2 + (x / half) * (W / 2), H / 2 + (z / half) * (H / 2)];
      }
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(10,20,10,0.75)';
      ctx.fillRect(0, 0, W, H);

      // منطقه امن
      if (this.engine.extractionZone) {
        var zp = toMap(this.engine.extractionZone.pos.x, this.engine.extractionZone.pos.z);
        ctx.fillStyle = '#2aff2a';
        ctx.beginPath(); ctx.arc(zp[0], zp[1], 5, 0, Math.PI * 2); ctx.fill();
      }
      // مخازن
      this.engine.targets.forEach(function (t) {
        if (t.type === 'tank' && !t.destroyed) {
          var p = toMap(t.mesh.position.x, t.mesh.position.z);
          ctx.fillStyle = '#ff8800';
          ctx.fillRect(p[0] - 3, p[1] - 3, 6, 6);
        }
      });
      // گروگان‌ها
      this.engine.hostages.forEach(function (h) {
        if (!h.rescued) {
          var p = toMap(h.mesh.position.x, h.mesh.position.z);
          ctx.fillStyle = '#66ccff';
          ctx.beginPath(); ctx.arc(p[0], p[1], 3, 0, Math.PI * 2); ctx.fill();
        }
      });
      // دشمنان
      this.engine.enemies.forEach(function (e) {
        if (e.dead) return;
        var p = toMap(e.mesh.position.x, e.mesh.position.z);
        ctx.fillStyle = e.marker ? '#ff2222' : '#ff5555';
        ctx.beginPath(); ctx.arc(p[0], p[1], e.marker ? 4 : 2.5, 0, Math.PI * 2); ctx.fill();
      });
      // بازیکن
      var pp = toMap(this.engine.player.position.x, this.engine.player.position.z);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(pp[0], pp[1], 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#4caf50';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(pp[0], pp[1], 6, 0, Math.PI * 2); ctx.stroke();
    },

    // ============================================================
    // مکث، پایان مأموریت
    // ============================================================
    showPause: function (on) {
      $('pause-menu').style.display = on ? 'flex' : 'none';
    },

    showMissionComplete: function (result) {
      $('complete-score').textContent = result.score.toLocaleString('fa-IR');
      $('complete-kills').textContent = result.kills;
      $('complete-accuracy').textContent = result.accuracy + '٪';
      var mm = Math.floor(result.time / 60), ss = result.time % 60;
      $('complete-time').textContent = mm + ':' + (ss < 10 ? '0' : '') + ss;
      $('complete-money').textContent = '+' + result.money.toLocaleString('fa-IR');
      $('complete-xp').textContent = '+' + result.xp.toLocaleString('fa-IR');
      $('mission-complete').style.display = 'flex';
      if (document.pointerLockElement) document.exitPointerLock();
    },

    showMissionFailed: function (reason) {
      $('fail-reason').textContent = reason || 'شما کشته شدید!';
      $('mission-failed').style.display = 'flex';
      if (document.pointerLockElement) document.exitPointerLock();
    },

    hideEndScreens: function () {
      $('mission-complete').style.display = 'none';
      $('mission-failed').style.display = 'none';
      $('pause-menu').style.display = 'none';
    }
  };

  UI.current = null;
  window.UI = UI;
  window.ACHIEVEMENTS = ACHIEVEMENTS;
})();
