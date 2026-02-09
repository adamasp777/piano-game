(function () {
  'use strict';

  var ctx = null;
  var masterGain = null;

  var NOTE_FREQS = {
    'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61,
    'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
    'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23,
    'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
    'C5': 523.25, 'D5': 587.33, 'E5': 659.25,
    'Eb3': 155.56, 'Eb4': 311.13, 'Ab3': 207.65,
    'Bb3': 233.08, 'Bb4': 466.16,
    'F#3': 185.00, 'F#4': 369.99,
    'G#3': 207.65, 'G#4': 415.30,
    'Db4': 277.18, 'Db5': 554.37
  };

  function init() {
    if (ctx) return ctx;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(ctx.destination);
    return ctx;
  }

  function playNote(name, duration, startTime) {
    if (!ctx) init();
    var freq = NOTE_FREQS[name];
    if (!freq) return;
    var t = startTime || ctx.currentTime;
    var dur = duration || 0.4;

    var gainNode = ctx.createGain();
    gainNode.connect(masterGain);

    // ADSR envelope
    gainNode.gain.setValueAtTime(0, t);
    gainNode.gain.linearRampToValueAtTime(0.6, t + 0.01);
    gainNode.gain.linearRampToValueAtTime(0.3, t + 0.08);
    gainNode.gain.linearRampToValueAtTime(0.25, t + dur * 0.5);
    gainNode.gain.linearRampToValueAtTime(0, t + dur);

    // Fundamental
    var osc1 = ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.value = freq;
    osc1.connect(gainNode);
    osc1.start(t);
    osc1.stop(t + dur);

    // 2nd harmonic (softer)
    var g2 = ctx.createGain();
    g2.gain.value = 0.15;
    g2.connect(gainNode);
    var osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq * 2;
    osc2.connect(g2);
    osc2.start(t);
    osc2.stop(t + dur);

    // 3rd harmonic (very soft)
    var g3 = ctx.createGain();
    g3.gain.value = 0.05;
    g3.connect(gainNode);
    var osc3 = ctx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.value = freq * 3;
    osc3.connect(g3);
    osc3.start(t);
    osc3.stop(t + dur);
  }

  function playHitSound(lane) {
    if (!ctx) init();
    var freqs = [800, 1000, 1200, 1400];
    var t = ctx.currentTime;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freqs[lane] || 1000;
    g.gain.setValueAtTime(0.15, t);
    g.gain.linearRampToValueAtTime(0, t + 0.06);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  function playMissSound() {
    if (!ctx) init();
    var t = ctx.currentTime;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 80;
    g.gain.setValueAtTime(0.1, t);
    g.gain.linearRampToValueAtTime(0, t + 0.15);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  function playSongNote(name, time) {
    playNote(name, 0.5, time);
  }

  function now() {
    if (!ctx) init();
    return ctx.currentTime;
  }

  function suspend() {
    if (ctx && ctx.state === 'running') ctx.suspend();
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  window.AudioEngine = {
    init: init,
    playNote: playNote,
    playHitSound: playHitSound,
    playMissSound: playMissSound,
    playSongNote: playSongNote,
    now: now,
    suspend: suspend,
    resume: resume
  };
})();
