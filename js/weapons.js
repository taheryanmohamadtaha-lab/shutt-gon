/* ============================================================
   عملیات سایه — weapons.js
   تعریف سلاح‌ها، آمار و هزینه‌های ارتقا
   ============================================================ */
(function () {
  'use strict';

  var WEAPONS = {
    rifle: {
      id: 'rifle', name: 'تفنگ تهاجمی «صاعقه»', slot: 'primary',
      desc: 'متعادل و قابل اعتماد؛ انتخابی عالی برای همه مأموریت‌ها.',
      price: 0, damage: 34, rpm: 600, mag: 30, reloadTime: 1.6,
      spread: 0.014, range: 140, auto: true, pellets: 1, zoomFov: 55,
      sound: 'rifle', tracerColor: 0xffe08a, kick: 0.012, model: 'rifle'
    },
    smg: {
      id: 'smg', name: 'مسلسل سبک «رعد»', slot: 'primary',
      desc: 'سرعت شلیک بسیار بالا؛ مرگبار در فاصله نزدیک.',
      price: 1200, damage: 17, rpm: 950, mag: 42, reloadTime: 1.8,
      spread: 0.022, range: 90, auto: true, pellets: 1, zoomFov: 58,
      sound: 'smg', tracerColor: 0xffe08a, kick: 0.008, model: 'smg'
    },
    lmg: {
      id: 'lmg', name: 'مسلسل سنگین «طوفان»', slot: 'primary',
      desc: 'خشاب بزرگ و قدرت تخریب بالا؛ برای نبردهای طولانی.',
      price: 2500, damage: 26, rpm: 560, mag: 80, reloadTime: 3.2,
      spread: 0.02, range: 130, auto: true, pellets: 1, zoomFov: 55,
      sound: 'lmg', tracerColor: 0xffc46b, kick: 0.016, model: 'lmg'
    },
    sniper: {
      id: 'sniper', name: 'تک‌تیرانداز «عقاب»', slot: 'primary',
      desc: 'یک گلوله، یک هدف. برد فوق‌العاده و آسیب کشنده.',
      price: 3000, damage: 160, rpm: 45, mag: 5, reloadTime: 2.6,
      spread: 0.002, range: 300, auto: false, pellets: 1, zoomFov: 22,
      sound: 'sniper', tracerColor: 0xffffff, kick: 0.05, model: 'sniper'
    },
    shotgun: {
      id: 'shotgun', name: 'شاتگان «برق»', slot: 'primary',
      desc: 'در فاصله نزدیک هیچ‌کس در امان نیست.',
      price: 1800, damage: 13, rpm: 75, mag: 6, reloadTime: 2.4,
      spread: 0.05, range: 45, auto: false, pellets: 8, zoomFov: 60,
      sound: 'shotgun', tracerColor: 0xffb36b, kick: 0.04, model: 'shotgun'
    },
    energy: {
      id: 'energy', name: 'سلاح ویژه «پرتوی سایه»', slot: 'primary',
      desc: 'فناوری پیشرفته یگان سایه؛ پرتو انرژی با نفوذ بالا.',
      price: 6000, damage: 48, rpm: 320, mag: 24, reloadTime: 2.0,
      spread: 0.008, range: 180, auto: true, pellets: 1, zoomFov: 50,
      sound: 'energy', tracerColor: 0x66ccff, kick: 0.01, model: 'energy'
    },
    pistol: {
      id: 'pistol', name: 'کلت «سایه»', slot: 'secondary',
      desc: 'سلاح کمکی سبک و سریع؛ همیشه همراه شماست.',
      price: 0, damage: 24, rpm: 350, mag: 12, reloadTime: 1.2,
      spread: 0.016, range: 80, auto: false, pellets: 1, zoomFov: 62,
      sound: 'pistol', tracerColor: 0xffe08a, kick: 0.014, model: 'pistol'
    }
  };

  var WEAPON_ORDER = ['rifle', 'smg', 'lmg', 'sniper', 'shotgun', 'energy', 'pistol'];

  // هزینه ارتقا برای هر سطح (۰ تا ۴)
  var UPGRADE_COSTS = [400, 800, 1500, 2500, 4000];
  var MAX_UPGRADE = 5;

  var UPGRADE_TYPES = {
    dmg:  { name: 'قدرت آسیب', desc: '+۱۰٪ آسیب در هر سطح' },
    acc:  { name: 'دقت', desc: '−۱۲٪ پراکندگی در هر سطح' },
    mag:  { name: 'ظرفیت خشاب', desc: '+۲۰٪ ظرفیت خشاب در هر سطح' },
    rate: { name: 'سرعت شلیک', desc: '+۸٪ سرعت شلیک در هر سطح' }
  };

  // محاسبه آمار نهایی سلاح با احتساب ارتقاها
  function getStats(weaponId) {
    var w = WEAPONS[weaponId];
    var up = (SaveManager.data.upgrades[weaponId]) || { dmg: 0, acc: 0, mag: 0, rate: 0 };
    return {
      id: w.id, name: w.name, slot: w.slot, desc: w.desc, price: w.price,
      damage: Math.round(w.damage * (1 + up.dmg * 0.10)),
      rpm: Math.round(w.rpm * (1 + up.rate * 0.08)),
      mag: Math.round(w.mag * (1 + up.mag * 0.20)),
      reloadTime: w.reloadTime,
      spread: w.spread * Math.pow(0.88, up.acc),
      range: w.range, auto: w.auto, pellets: w.pellets, zoomFov: w.zoomFov,
      sound: w.sound, tracerColor: w.tracerColor, kick: w.kick, model: w.model,
      upgrades: up
    };
  }

  function upgradeCost(weaponId, type) {
    var up = SaveManager.data.upgrades[weaponId] || { dmg: 0, acc: 0, mag: 0, rate: 0 };
    var lvl = up[type] || 0;
    if (lvl >= MAX_UPGRADE) return -1;
    return UPGRADE_COSTS[lvl];
  }

  function buyUpgrade(weaponId, type) {
    var cost = upgradeCost(weaponId, type);
    if (cost < 0) return { ok: false, msg: 'حداکثر سطح ارتقا رسیده است.' };
    if (SaveManager.data.money < cost) return { ok: false, msg: 'پول کافی ندارید.' };
    SaveManager.data.money -= cost;
    if (!SaveManager.data.upgrades[weaponId]) {
      SaveManager.data.upgrades[weaponId] = { dmg: 0, acc: 0, mag: 0, rate: 0 };
    }
    SaveManager.data.upgrades[weaponId][type]++;
    SaveManager.save();
    return { ok: true, msg: 'ارتقا انجام شد!' };
  }

  window.WEAPONS = WEAPONS;
  window.WEAPON_ORDER = WEAPON_ORDER;
  window.UPGRADE_TYPES = UPGRADE_TYPES;
  window.MAX_UPGRADE = MAX_UPGRADE;
  window.getWeaponStats = getStats;
  window.upgradeCost = upgradeCost;
  window.buyUpgrade = buyUpgrade;
})();
