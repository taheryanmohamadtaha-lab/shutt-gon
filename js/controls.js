/* ============================================================
   عملیات سایه — controls.js
   کنترل لمسی موبایل + کیبورد/ماوس دسکتاپ
   ============================================================ */
(function () {
  'use strict';

  function Controls(engine) {
    this.engine = engine;
    this.input = {
      forward: false, back: false, left: false, right: false,
      jump: false, firePressed: false,
      lookDX: 0, lookDY: 0
    };
    this.isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    this.joystick = { active: false, id: null, baseX: 0, baseY: 0, dx: 0, dy: 0 };
    this.lookTouch = { id: null, lastX: 0, lastY: 0 };
    this.crouchToggle = false;
    this.sprintToggle = false;
    this.adsToggle = false;
    this._keys = {};
    this._bound = false;
  }

  Controls.prototype = {
    bind: function () {
      if (this._bound) return;
      this._bound = true;
      var self = this;

      // ---------- کیبورد ----------
      window.addEventListener('keydown', function (e) {
        self._keys[e.code] = true;
        if (!self.engine.playing || self.engine.paused) return;
        switch (e.code) {
          case 'KeyR': self.engine.player.startReload(); break;
          case 'KeyG': self.engine.player.throwGrenade(); break;
          case 'Digit1': self.engine.player.switchWeapon(SaveManager.data.equipped.primary); break;
          case 'Digit2': self.engine.player.switchWeapon(SaveManager.data.equipped.secondary); break;
          case 'KeyC': self.toggleCrouch(); break;
          case 'KeyN': self.engine.toggleNightVision(); break;
          case 'Escape': self.engine.togglePause(); break;
        }
      });
      window.addEventListener('keyup', function (e) { self._keys[e.code] = false; });

      // ---------- ماوس ----------
      var canvas = this.engine.renderer.domElement;
      canvas.addEventListener('mousedown', function (e) {
        if (!self.engine.playing || self.engine.paused) return;
        if (e.button === 0) {
          self.input.firePressed = true;
          self.engine.player.triggerHeld = true;
        } else if (e.button === 2) {
          self.engine.player.ads = true;
        }
      });
      window.addEventListener('mouseup', function (e) {
        if (e.button === 0) self.engine.player.triggerHeld = false;
        if (e.button === 2) self.engine.player.ads = false;
      });
      canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      // کلیک روی صفحه برای قفل شدن مجدد ماوس (بعد از Esc)
      canvas.addEventListener('click', function () {
        if (self.engine.playing && !self.engine.paused && !self.isTouch && document.pointerLockElement !== canvas) {
          self.engine.requestPointerLock();
        }
      });
      document.addEventListener('mousemove', function (e) {
        if (!self.engine.playing || self.engine.paused) return;
        if (document.pointerLockElement === canvas) {
          self.input.lookDX += e.movementX || 0;
          self.input.lookDY += e.movementY || 0;
        }
      });
      document.addEventListener('pointerlockchange', function () {
        if (document.pointerLockElement !== canvas && self.engine.playing && !self.engine.paused && !self.isTouch) {
          self.engine.togglePause(true);
        }
      });

      // ---------- لمسی ----------
      this._bindTouch();
    },

    _bindTouch: function () {
      var self = this;
      var joyZone = document.getElementById('joystick-zone');
      var joyBase = document.getElementById('joystick-base');
      var joyKnob = document.getElementById('joystick-knob');
      var lookZone = document.getElementById('look-zone');

      function setKnob(dx, dy) {
        joyKnob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      }

      joyZone.addEventListener('touchstart', function (e) {
        e.preventDefault();
        var t = e.changedTouches[0];
        self.joystick.active = true;
        self.joystick.id = t.identifier;
        var rect = joyBase.getBoundingClientRect();
        self.joystick.baseX = rect.left + rect.width / 2;
        self.joystick.baseY = rect.top + rect.height / 2;
        self.joystick.dx = 0; self.joystick.dy = 0;
        setKnob(0, 0);
      }, { passive: false });

      joyZone.addEventListener('touchmove', function (e) {
        e.preventDefault();
        for (var i = 0; i < e.changedTouches.length; i++) {
          var t = e.changedTouches[i];
          if (t.identifier !== self.joystick.id) continue;
          var dx = t.clientX - self.joystick.baseX;
          var dy = t.clientY - self.joystick.baseY;
          var len = Math.hypot(dx, dy);
          var max = 55;
          if (len > max) { dx = dx / len * max; dy = dy / len * max; }
          self.joystick.dx = dx / max;
          self.joystick.dy = dy / max;
          setKnob(dx, dy);
        }
      }, { passive: false });

      function joyEnd(e) {
        for (var i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === self.joystick.id) {
            self.joystick.active = false;
            self.joystick.dx = 0; self.joystick.dy = 0;
            setKnob(0, 0);
          }
        }
      }
      joyZone.addEventListener('touchend', joyEnd);
      joyZone.addEventListener('touchcancel', joyEnd);

      lookZone.addEventListener('touchstart', function (e) {
        e.preventDefault();
        var t = e.changedTouches[0];
        self.lookTouch.id = t.identifier;
        self.lookTouch.lastX = t.clientX;
        self.lookTouch.lastY = t.clientY;
      }, { passive: false });

      lookZone.addEventListener('touchmove', function (e) {
        e.preventDefault();
        for (var i = 0; i < e.changedTouches.length; i++) {
          var t = e.changedTouches[i];
          if (t.identifier !== self.lookTouch.id) continue;
          self.input.lookDX += (t.clientX - self.lookTouch.lastX) * 2.2;
          self.input.lookDY += (t.clientY - self.lookTouch.lastY) * 2.2;
          self.lookTouch.lastX = t.clientX;
          self.lookTouch.lastY = t.clientY;
        }
      }, { passive: false });

      function lookEnd(e) {
        for (var i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === self.lookTouch.id) self.lookTouch.id = null;
        }
      }
      lookZone.addEventListener('touchend', lookEnd);
      lookZone.addEventListener('touchcancel', lookEnd);

      // ---------- دکمه‌های لمسی ----------
      function bindBtn(id, down, up) {
        var el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('touchstart', function (e) {
          e.preventDefault();
          el.classList.add('active');
          down();
        }, { passive: false });
        function end(e) {
          el.classList.remove('active');
          if (up) up();
        }
        el.addEventListener('touchend', end);
        el.addEventListener('touchcancel', end);
        // پشتیبانی ماوس برای تست روی دسکتاپ
        el.addEventListener('mousedown', function (e) { e.preventDefault(); down(); });
        el.addEventListener('mouseup', function () { if (up) up(); });
      }

      bindBtn('btn-fire',
        function () { self.input.firePressed = true; self.engine.player.triggerHeld = true; },
        function () { self.engine.player.triggerHeld = false; });
      bindBtn('btn-ads', function () { self.toggleAds(); });
      bindBtn('btn-reload', function () { self.engine.player.startReload(); });
      bindBtn('btn-jump', function () { self.input.jump = true; }, function () { self.input.jump = false; });
      bindBtn('btn-crouch', function () { self.toggleCrouch(); });
      bindBtn('btn-sprint', function () { self.toggleSprint(); });
      bindBtn('btn-weapon', function () {
        var p = self.engine.player;
        var next = p.currentWeaponId === SaveManager.data.equipped.primary
          ? SaveManager.data.equipped.secondary
          : SaveManager.data.equipped.primary;
        p.switchWeapon(next);
      });
      bindBtn('btn-grenade', function () { self.engine.player.throwGrenade(); });
      bindBtn('btn-pause', function () { self.engine.togglePause(); });
      bindBtn('btn-nightvision', function () { self.engine.toggleNightVision(); });
    },

    toggleCrouch: function () {
      this.crouchToggle = !this.crouchToggle;
      this.engine.player.crouching = this.crouchToggle;
      var el = document.getElementById('btn-crouch');
      if (el) el.classList.toggle('toggled', this.crouchToggle);
    },

    toggleSprint: function () {
      this.sprintToggle = !this.sprintToggle;
      var el = document.getElementById('btn-sprint');
      if (el) el.classList.toggle('toggled', this.sprintToggle);
    },

    toggleAds: function () {
      this.adsToggle = !this.adsToggle;
      this.engine.player.ads = this.adsToggle;
      var el = document.getElementById('btn-ads');
      if (el) el.classList.toggle('toggled', this.adsToggle);
    },

    // خواندن ورودی و تبدیل به حرکت (هر فریم صدا زده می‌شود)
    poll: function () {
      var k = this._keys;
      this.input.forward = !!(k['KeyW'] || k['ArrowUp']) || (this.joystick.active && this.joystick.dy < -0.25);
      this.input.back = !!(k['KeyS'] || k['ArrowDown']) || (this.joystick.active && this.joystick.dy > 0.25);
      this.input.left = !!(k['KeyA'] || k['ArrowLeft']) || (this.joystick.active && this.joystick.dx < -0.25);
      this.input.right = !!(k['KeyD'] || k['ArrowRight']) || (this.joystick.active && this.joystick.dx > 0.25);
      this.input.jump = !!(k['Space']) || this.input.jump;
      this.engine.player.sprinting = !!(k['ShiftLeft'] || k['ShiftRight']) || this.sprintToggle;
      this.engine.player.crouching = this.crouchToggle;
      return this.input;
    },

    consumeLook: function () {
      var dx = this.input.lookDX, dy = this.input.lookDY;
      this.input.lookDX = 0; this.input.lookDY = 0;
      return { dx: dx, dy: dy };
    }
  };

  window.Controls = Controls;
})();
