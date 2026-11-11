/* ============================================================
   عملیات سایه — main.js
   نقطه شروع بازی: اتصال منوها و راه‌اندازی موتور
   ============================================================ */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  var engine = null;
  var ui = null;

  function initEngine() {
    if (engine) return;
    engine = new GameEngine($('game-container'));
    engine.init();
    ui = engine.ui;
    UI.current = ui;
    engine.startLoop();
  }

  function bindMenu() {
    // شروع سریع (ادامه بازی = اولین مرحله باز نشده)
    $('btn-continue').addEventListener('click', function () {
      AudioEngine.init(); AudioEngine.resume();
      var nextId = Math.min(SaveManager.data.unlockedMissions, MISSIONS.length);
      var mission = getMission(nextId);
      initEngine();
      ui.showScreen('screen-game');
      engine.startMission(mission);
      engine.requestPointerLock();
    });

    $('btn-levels').addEventListener('click', function () {
      ui.renderLevels();
      ui.showScreen('screen-levels');
    });

    $('btn-weapons').addEventListener('click', function () {
      ui.renderWeapons();
      ui.showScreen('screen-weapons');
    });

    $('btn-shop').addEventListener('click', function () {
      ui.renderShop();
      ui.showScreen('screen-shop');
    });

    $('btn-profile').addEventListener('click', function () {
      ui.renderProfile();
      ui.showScreen('screen-profile');
    });

    $('btn-daily').addEventListener('click', function () {
      ui.refreshMenu();
      ui.showScreen('screen-daily');
    });

    $('btn-achievements').addEventListener('click', function () {
      ui.renderAchievements();
      ui.showScreen('screen-achievements');
    });

    $('btn-settings').addEventListener('click', function () {
      ui.renderSettings();
      ui.showScreen('screen-settings');
    });

    $('btn-help').addEventListener('click', function () {
      ui.showScreen('screen-help');
    });

    $('btn-exit').addEventListener('click', function () {
      if (confirm('آیا می‌خواهید از بازی خارج شوید؟ (در نسخه وب، این صفحه بسته می‌شود)')) {
        window.close();
        ui.toast('برای خروج کامل، اپ را ببندید. تا دیدار بعد، سرباز! 🎖️', 3000);
      }
    });

    // دکمه‌های بازگشت
    var backButtons = document.querySelectorAll('[data-back]');
    for (var i = 0; i < backButtons.length; i++) {
      backButtons[i].addEventListener('click', function () {
        ui.refreshMenu();
        ui.showScreen('screen-menu');
      });
    }

    // دریافت پاداش روزانه
    $('btn-daily-claim').addEventListener('click', function () {
      var daily = SaveManager.getDaily();
      if (daily.kills >= 15 && !daily.rewardClaimed) {
        daily.rewardClaimed = true;
        SaveManager.addMoney(500);
        SaveManager.save();
        ui.refreshMenu();
        ui.toast('🎉 پاداش روزانه دریافت شد: ۵۰۰ پول', 3000);
        AudioEngine.playPickup();
      }
    });

    // مکث
    $('btn-resume').addEventListener('click', function () { engine.togglePause(); });
    $('btn-restart').addEventListener('click', function () {
      ui.hideEndScreens();
      engine.paused = false;
      engine.startMission(engine.mission);
      engine.requestPointerLock();
    });
    $('btn-quit').addEventListener('click', function () {
      ui.hideEndScreens();
      engine.exitMission();
    });

    // پایان مأموریت
    $('btn-next-mission').addEventListener('click', function () {
      ui.hideEndScreens();
      var next = getMission(engine.mission.id + 1);
      if (next) {
        engine.startMission(next);
        engine.requestPointerLock();
      } else {
        engine.exitMission();
      }
    });
    $('btn-complete-menu').addEventListener('click', function () {
      ui.hideEndScreens();
      engine.exitMission();
    });

    // شکست مأموریت
    $('btn-retry').addEventListener('click', function () {
      ui.hideEndScreens();
      engine.startMission(engine.mission);
      engine.requestPointerLock();
    });
    $('btn-fail-menu').addEventListener('click', function () {
      ui.hideEndScreens();
      engine.exitMission();
    });

    // ثبت Service Worker برای اجرای آفلاین (PWA)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }

    // شروع صدا با اولین لمس/کلیک (سیاست مرورگرها)
    document.addEventListener('touchstart', function () {
      AudioEngine.init(); AudioEngine.resume();
    }, { once: true });
    document.addEventListener('click', function () {
      AudioEngine.init(); AudioEngine.resume();
    }, { once: true });
  }

  function startMenuMusic() {
    AudioEngine.startMusic('menu');
  }

  document.addEventListener('DOMContentLoaded', function () {
    SaveManager.load();
    // ساخت موقت UI برای منوها (قبل از ساخت موتور سه‌بعدی)
    initEngine();
    bindMenu();
    ui.refreshMenu();
    ui.bindSettings();
    ui.showScreen('screen-menu');
    startMenuMusic();

    // جلوگیری از اسکرول صفحه هنگام بازی روی موبایل
    document.addEventListener('touchmove', function (e) {
      if (engine && engine.playing) e.preventDefault();
    }, { passive: false });
  });

  window.ShadowOperation = {
    getEngine: function () { return engine; },
    startMission: function (id) {
      var mission = getMission(id);
      if (!mission) return;
      initEngine();
      ui.showScreen('screen-game');
      engine.startMission(mission);
    }
  };
})();
