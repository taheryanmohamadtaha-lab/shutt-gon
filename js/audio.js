/* ============================================================
   عملیات سایه — audio.js
   موتور صدا با Web Audio API — تمام افکت‌ها به‌صورت سنتز شده
   (بدون نیاز به فایل صوتی خارجی، کاملاً آفلاین)
   ============================================================ */
(function () {
  'use strict';

  var AudioEngine = {
    ctx: null,
    master: null,
    sfxGain: null,
    musicGain: null,
    noiseBuffer: null,
    musicTimer: null,
    musicStep: 0,
    ambientNodes: null,
    initialized: false,

    init: function () {
      if (this.initialized) return;
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 1;
        this.master.connect(this.ctx.destination);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.connect(this.master);
        this.musicGain = this.ctx.createGain();
        this.musicGain.connect(this.master);

        // بافر نویز سفید برای افکت‌ها
        var len = this.ctx.sampleRate * 1;
        this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        var data = this.noiseBuffer.getChannelData(0);
        for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

        this.applyVolumes();
        this.initialized = true;
      } catch (e) { /* صدا پشتیبانی نمی‌شود */ }
    },

    resume: function () {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },

    applyVolumes: function () {
      if (!this.initialized) return;
      var s = SaveManager.data.settings;
      this.sfxGain.gain.value = s.sfxVolume;
      this.musicGain.gain.value = s.musicVolume * 0.6;
    },

    // ---------- ابزارهای پایه ----------
    _noise: function (dur, filterFreq, type, vol, when) {
      if (!this.initialized) return;
      var t = when || this.ctx.currentTime;
      var src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      src.loop = true;
      var filter = this.ctx.createBiquadFilter();
      filter.type = type || 'lowpass';
      filter.frequency.value = filterFreq || 1000;
      var gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol || 0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(filter); filter.connect(gain); gain.connect(this.sfxGain);
      src.start(t); src.stop(t + dur + 0.05);
    },

    _tone: function (freq, dur, type, vol, when, slideTo) {
      if (!this.initialized) return;
      var t = when || this.ctx.currentTime;
      var osc = this.ctx.createOscillator();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, t);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
      var gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol || 0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain); gain.connect(this.sfxGain);
      osc.start(t); osc.stop(t + dur + 0.05);
    },

    // ---------- افکت‌های بازی ----------
    playShoot: function (kind) {
      if (!this.initialized) return;
      switch (kind) {
        case 'sniper':
          this._noise(0.35, 3000, 'lowpass', 0.9);
          this._tone(120, 0.3, 'sawtooth', 0.5, null, 40);
          break;
        case 'shotgun':
          this._noise(0.25, 1800, 'lowpass', 1.0);
          this._tone(90, 0.2, 'square', 0.5, null, 35);
          break;
        case 'energy':
          this._tone(900, 0.18, 'sawtooth', 0.35, null, 200);
          this._tone(1400, 0.12, 'square', 0.2, null, 300);
          break;
        case 'pistol':
          this._noise(0.12, 2500, 'lowpass', 0.6);
          this._tone(180, 0.1, 'square', 0.3, null, 60);
          break;
        case 'lmg':
          this._noise(0.14, 1400, 'lowpass', 0.75);
          this._tone(110, 0.12, 'sawtooth', 0.4, null, 45);
          break;
        default: // rifle / smg
          this._noise(0.1, 2200, 'lowpass', 0.65);
          this._tone(150, 0.09, 'square', 0.35, null, 55);
      }
    },

    playEnemyShoot: function () {
      if (!this.initialized) return;
      this._noise(0.08, 1200, 'lowpass', 0.22);
    },

    playReload: function () {
      if (!this.initialized) return;
      var t = this.ctx.currentTime;
      this._noise(0.05, 3000, 'highpass', 0.3, t);
      this._noise(0.05, 2000, 'highpass', 0.3, t + 0.25);
      this._noise(0.07, 3500, 'highpass', 0.4, t + 0.55);
    },

    playEmptyClick: function () { this._tone(2000, 0.04, 'square', 0.15); },

    playHit: function () { this._tone(700, 0.06, 'square', 0.25, null, 400); },
    playHeadshot: function () {
      this._tone(1000, 0.08, 'square', 0.3, null, 500);
      this._noise(0.08, 4000, 'highpass', 0.2);
    },
    playKill: function () {
      this._tone(500, 0.12, 'square', 0.25, null, 150);
      this._noise(0.15, 800, 'lowpass', 0.3);
    },
    playHurt: function () {
      this._tone(140, 0.2, 'sawtooth', 0.4, null, 70);
      this._noise(0.15, 600, 'lowpass', 0.35);
    },
    playExplosion: function () {
      if (!this.initialized) return;
      this._noise(0.8, 500, 'lowpass', 1.0);
      this._tone(60, 0.7, 'sine', 0.9, null, 25);
      this._noise(0.4, 200, 'lowpass', 0.7, this.ctx.currentTime + 0.05);
    },
    playStep: function () { this._noise(0.05, 500, 'lowpass', 0.12); },
    playPickup: function () {
      this._tone(600, 0.08, 'sine', 0.3);
      if (!this.initialized) return;
      this._tone(900, 0.1, 'sine', 0.3, this.ctx.currentTime + 0.07);
    },
    playClick: function () { this._tone(1200, 0.04, 'square', 0.12); },
    playWin: function () {
      if (!this.initialized) return;
      var notes = [523, 659, 784, 1047];
      for (var i = 0; i < notes.length; i++) {
        this._tone(notes[i], 0.35, 'triangle', 0.35, this.ctx.currentTime + i * 0.14);
      }
    },
    playLose: function () {
      if (!this.initialized) return;
      var notes = [400, 350, 300, 200];
      for (var i = 0; i < notes.length; i++) {
        this._tone(notes[i], 0.4, 'sawtooth', 0.25, this.ctx.currentTime + i * 0.18);
      }
    },
    playRankUp: function () {
      if (!this.initialized) return;
      var notes = [659, 784, 988, 1319];
      for (var i = 0; i < notes.length; i++) {
        this._tone(notes[i], 0.25, 'triangle', 0.3, this.ctx.currentTime + i * 0.1);
      }
    },
    playAlarm: function () {
      if (!this.initialized) return;
      this._tone(880, 0.15, 'square', 0.2);
      this._tone(880, 0.15, 'square', 0.2, this.ctx.currentTime + 0.2);
    },
    playRescue: function () {
      this._tone(784, 0.15, 'sine', 0.3);
      if (!this.initialized) return;
      this._tone(1047, 0.25, 'sine', 0.3, this.ctx.currentTime + 0.12);
    },
    playGrenadeThrow: function () { this._noise(0.1, 1000, 'bandpass', 0.2); },
    playNightVision: function () { this._tone(1500, 0.1, 'sine', 0.2, null, 800); },

    // ---------- صدای محیطی (باد) ----------
    startAmbient: function () {
      if (!this.initialized || this.ambientNodes) return;
      try {
        var src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer; src.loop = true;
        var filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.value = 400;
        var gain = this.ctx.createGain(); gain.gain.value = 0.05;
        // نوسان ملایم باد
        var lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.15;
        var lfoGain = this.ctx.createGain(); lfoGain.gain.value = 0.025;
        lfo.connect(lfoGain); lfoGain.connect(gain.gain);
        src.connect(filter); filter.connect(gain); gain.connect(this.sfxGain);
        src.start(); lfo.start();
        this.ambientNodes = { src: src, lfo: lfo };
      } catch (e) {}
    },

    stopAmbient: function () {
      if (this.ambientNodes) {
        try { this.ambientNodes.src.stop(); this.ambientNodes.lfo.stop(); } catch (e) {}
        this.ambientNodes = null;
      }
    },

    // ---------- موسیقی رویه‌ای ----------
    startMusic: function (mode) {
      if (!this.initialized) return;
      this.stopMusic();
      this.musicStep = 0;
      var self = this;
      var bassNotes = mode === 'combat'
        ? [55, 55, 65.4, 55, 49, 55, 73.4, 82.4]
        : [65.4, 65.4, 73.4, 98, 65.4, 82.4, 73.4, 65.4];
      var leadNotes = mode === 'combat'
        ? [220, 0, 261.6, 0, 329.6, 0, 261.6, 196]
        : [261.6, 329.6, 392, 329.6, 261.6, 0, 329.6, 0];
      var stepDur = mode === 'combat' ? 0.22 : 0.3;

      this.musicTimer = setInterval(function () {
        if (!self.initialized) return;
        var t = self.ctx.currentTime;
        var i = self.musicStep % 8;
        // بیس
        var osc = self.ctx.createOscillator();
        osc.type = 'sawtooth'; osc.frequency.value = bassNotes[i];
        var f = self.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300;
        var g = self.ctx.createGain();
        g.gain.setValueAtTime(0.16, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + stepDur * 0.95);
        osc.connect(f); f.connect(g); g.connect(self.musicGain);
        osc.start(t); osc.stop(t + stepDur);
        // ملودی
        if (leadNotes[i] > 0) {
          var o2 = self.ctx.createOscillator();
          o2.type = 'triangle'; o2.frequency.value = leadNotes[i];
          var g2 = self.ctx.createGain();
          g2.gain.setValueAtTime(0.07, t);
          g2.gain.exponentialRampToValueAtTime(0.001, t + stepDur * 0.9);
          o2.connect(g2); g2.connect(self.musicGain);
          o2.start(t); o2.stop(t + stepDur);
        }
        // ضرب (کیک ملایم)
        if (i % 2 === 0) {
          var o3 = self.ctx.createOscillator();
          o3.type = 'sine'; o3.frequency.setValueAtTime(120, t);
          o3.frequency.exponentialRampToValueAtTime(40, t + 0.1);
          var g3 = self.ctx.createGain();
          g3.gain.setValueAtTime(0.25, t);
          g3.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
          o3.connect(g3); g3.connect(self.musicGain);
          o3.start(t); o3.stop(t + 0.13);
        }
        self.musicStep++;
      }, stepDur * 1000);
    },

    stopMusic: function () {
      if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
    }
  };

  window.AudioEngine = AudioEngine;
})();
