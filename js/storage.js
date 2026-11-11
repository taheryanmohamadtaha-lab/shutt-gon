/* ============================================================
   عملیات سایه — storage.js
   مدیریت ذخیره‌سازی پیشرفت بازی در LocalStorage
   ============================================================ */
(function () {
  'use strict';

  var SAVE_KEY = 'shadow_operation_save_v1';

  var RANKS = [
    { name: 'سرباز', xp: 0 },
    { name: 'سرباز یکم', xp: 200 },
    { name: 'استوار', xp: 500 },
    { name: 'گروهبان', xp: 1000 },
    { name: 'ستوان', xp: 1800 },
    { name: 'سروان', xp: 3000 },
    { name: 'سرگرد', xp: 5000 },
    { name: 'سرهنگ', xp: 8000 },
    { name: 'سرتیپ', xp: 12000 },
    { name: 'ژنرال', xp: 20000 }
  ];

  function defaultData() {
    return {
      xp: 0,
      money: 600,
      unlockedMissions: 1,            // تعداد مراحل باز شده
      completedMissions: {},          // { missionId: {bestScore, bestTime} }
      ownedWeapons: ['rifle', 'pistol'],
      equipped: { primary: 'rifle', secondary: 'pistol' },
      upgrades: {},                   // { weaponId: {dmg:0, acc:0, mag:0, rate:0} }
      settings: {
        quality: 'medium',            // low | medium | high
        sensitivity: 1.0,
        musicVolume: 0.5,
        sfxVolume: 0.8,
        vibration: true,
        shadows: true,
        fov: 75,
        buttonScale: 1.0
      },
      stats: {
        kills: 0, shots: 0, hits: 0, deaths: 0,
        missionsDone: 0, headshots: 0, grenadeKills: 0, playTime: 0
      },
      daily: { date: '', kills: 0, rewardClaimed: false },
      achievements: {},               // { id: true }
      totalScore: 0
    };
  }

  var SaveManager = {
    data: null,

    load: function () {
      try {
        var raw = localStorage.getItem(SAVE_KEY);
        if (raw) {
          var parsed = JSON.parse(raw);
          var def = defaultData();
          // ادغام با پیش‌فرض‌ها برای سازگاری با نسخه‌های بعدی
          for (var k in def) {
            if (parsed[k] === undefined) parsed[k] = def[k];
          }
          this.data = parsed;
        } else {
          this.data = defaultData();
          this.save();
        }
      } catch (e) {
        this.data = defaultData();
      }
      return this.data;
    },

    save: function () {
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); } catch (e) {}
    },

    reset: function () {
      this.data = defaultData();
      this.save();
    },

    // ---------- درجه نظامی ----------
    getRank: function () {
      var xp = this.data.xp, idx = 0;
      for (var i = 0; i < RANKS.length; i++) {
        if (xp >= RANKS[i].xp) idx = i;
      }
      var cur = RANKS[idx];
      var next = RANKS[idx + 1] || null;
      var progress = 1;
      if (next) progress = (xp - cur.xp) / (next.xp - cur.xp);
      return { index: idx, name: cur.name, next: next ? next.name : null, progress: progress, xp: xp };
    },

    addXP: function (amount) {
      var before = this.getRank().index;
      this.data.xp += amount;
      var after = this.getRank().index;
      this.save();
      if (after > before) {
        if (window.UI) UI.toast('تبریک! درجه شما به «' + this.getRank().name + '» ارتقا یافت 🎖️', 4000);
        if (window.AudioEngine) AudioEngine.playRankUp();
      }
    },

    addMoney: function (amount) {
      this.data.money = Math.max(0, this.data.money + amount);
      this.save();
    },

    // ---------- مأموریت روزانه ----------
    getDaily: function () {
      var today = new Date().toISOString().slice(0, 10);
      if (this.data.daily.date !== today) {
        this.data.daily = { date: today, kills: 0, rewardClaimed: false };
        this.save();
      }
      return this.data.daily;
    },

    addDailyKill: function () {
      var d = this.getDaily();
      d.kills++;
      this.save();
    },

    // ---------- دستاوردها ----------
    unlockAchievement: function (id) {
      if (!this.data.achievements[id]) {
        this.data.achievements[id] = true;
        this.save();
        return true;
      }
      return false;
    }
  };

  window.SaveManager = SaveManager;
  window.RANKS = RANKS;
})();
