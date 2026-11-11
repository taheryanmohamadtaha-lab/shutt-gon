/* ============================================================
   عملیات سایه — missions.js
   تعریف ۸ مرحله بازی: داستان، محیط، دشمنان و اهداف
   ============================================================ */
(function () {
  'use strict';

  var MISSIONS = [
    {
      id: 1,
      name: 'عملیات شروع',
      desc: 'آشنایی با کنترل‌ها و سلاح‌ها؛ پاک‌سازی منطقه تمرینی از چند سرباز دشمن.',
      briefing: 'گروهبان: «سرباز، به منطقه تمرینی نفوذ کن و نیروهای دشمن را از بین ببر. مراقب باش، آن‌ها مسلح‌اند!»',
      objectiveType: 'eliminate',           // eliminate | destroy | rescue | sniper | boss
      objectiveText: 'همه دشمنان را از بین ببرید',
      theme: 'mountain',
      mapSize: 90,
      enemies: { soldier: 5 },
      targets: 0, hostages: 0,
      timeLimit: 0,
      rewardMoney: 300, rewardXP: 120,
      night: false
    },
    {
      id: 2,
      name: 'حمله به پایگاه',
      desc: 'نفوذ به پایگاه کوهستانی دشمن و نابودی مخازن سوخت آن.',
      briefing: '«مخازن سوخت پایگاه را پیدا و منفجر کن. قبل از رسیدن نیروهای کمکی دشمن، کار را تمام کن!»',
      objectiveType: 'destroy',
      objectiveText: 'مخازن سوخت را نابود کنید',
      theme: 'mountain',
      mapSize: 110,
      enemies: { soldier: 6, rusher: 2 },
      targets: 3, hostages: 0,
      timeLimit: 240,
      rewardMoney: 500, rewardXP: 200,
      night: false
    },
    {
      id: 3,
      name: 'شهر متروکه',
      desc: 'مبارزه خیابانی در میان ساختمان‌های تخریب‌شده شهر.',
      briefing: '«شهر در اشغال دشمن است. خیابان به خیابان پیش برو و منطقه را پاک‌سازی کن.»',
      objectiveType: 'eliminate',
      objectiveText: 'همه دشمنان را از بین ببرید',
      theme: 'city',
      mapSize: 120,
      enemies: { soldier: 7, rusher: 3, sniper: 2 },
      targets: 0, hostages: 0,
      timeLimit: 0,
      rewardMoney: 700, rewardXP: 280,
      night: false
    },
    {
      id: 4,
      name: 'نجات گروگان‌ها',
      desc: 'سه گروگان در پایگاه بیابانی زندانی شده‌اند؛ آن‌ها را به منطقه امن برسانید.',
      briefing: '«گروگان‌ها را پیدا کنید و تا منطقه امن (نقطه سبز روی نقشه) اسکورت کنید. مراقب کمین دشمن باشید!»',
      objectiveType: 'rescue',
      objectiveText: 'گروگان‌ها را به منطقه امن برسانید',
      theme: 'desert',
      mapSize: 120,
      enemies: { soldier: 6, rusher: 2, sniper: 1 },
      targets: 0, hostages: 3,
      timeLimit: 0,
      rewardMoney: 900, rewardXP: 350,
      night: false
    },
    {
      id: 5,
      name: 'عملیات تک‌تیرانداز',
      desc: 'اهداف مشخص‌شده (علامت قرمز) را از فاصله دور حذف کنید.',
      briefing: '«چهار هدف کلیدی دشمن را از بین ببرید. تک‌تیرانداز «عقاب» در اختیار شماست. شکارچی، صبور باش!»',
      objectiveType: 'sniper',
      objectiveText: 'اهداف مشخص‌شده را حذف کنید',
      theme: 'forest',
      mapSize: 140,
      enemies: { soldier: 4, sniper: 4 },
      targets: 0, hostages: 0,
      markedCount: 4,
      timeLimit: 300,
      rewardMoney: 1100, rewardXP: 420,
      night: false,
      giveWeapon: 'sniper'
    },
    {
      id: 6,
      name: 'حمله شبانه',
      desc: 'مأموریت در تاریکی مطلق؛ از دید شبانه استفاده کنید.',
      briefing: '«شب، بهترین دوست یک نیروی ویژه است. دید شبانه را فعال کن و بی‌صدا پیش برو.»',
      objectiveType: 'eliminate',
      objectiveText: 'همه دشمنان را در تاریکی از بین ببرید',
      theme: 'port',
      mapSize: 120,
      enemies: { soldier: 6, sniper: 2, rusher: 3 },
      targets: 0, hostages: 0,
      timeLimit: 0,
      rewardMoney: 1300, rewardXP: 500,
      night: true
    },
    {
      id: 7,
      name: 'پایگاه زیرزمینی',
      desc: 'نبرد با نیروهای زرهی و تجهیزات پیشرفته دشمن در پایگاه زیرزمینی.',
      briefing: '«دشمن از زره‌های پیشرفته استفاده می‌کند. نارنجک و سلاح سنگین را فراموش نکن!»',
      objectiveType: 'eliminate',
      objectiveText: 'نیروهای زرهی دشمن را از بین ببرید',
      theme: 'underground',
      mapSize: 130,
      enemies: { armored: 5, heavy: 3, soldier: 4 },
      targets: 0, hostages: 0,
      timeLimit: 0,
      rewardMoney: 1700, rewardXP: 650,
      night: false
    },
    {
      id: 8,
      name: 'نبرد نهایی',
      desc: 'مواجهه با فرمانده دشمن؛ سرنوشت منطقه در دستان شماست.',
      briefing: '«فرمانده دشمن در پایگاه اصلی پنهان شده است. او را شکست بده و به جنگ پایان بده. موفق باشی، سرباز!»',
      objectiveType: 'boss',
      objectiveText: 'فرمانده دشمن را شکست دهید',
      theme: 'snow',
      mapSize: 140,
      enemies: { commander: 1, armored: 3, heavy: 2, sniper: 2, soldier: 4 },
      targets: 0, hostages: 0,
      timeLimit: 0,
      rewardMoney: 3000, rewardXP: 1200,
      night: false
    }
  ];

  function getMission(id) {
    for (var i = 0; i < MISSIONS.length; i++) {
      if (MISSIONS[i].id === id) return MISSIONS[i];
    }
    return null;
  }

  window.MISSIONS = MISSIONS;
  window.getMission = getMission;
})();
