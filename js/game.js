(function () {
  'use strict';

  // --- Constants ---
  var STATES = { START: 0, SONG_SELECT: 1, PLAYING: 2, PAUSED: 3, RESULTS: 4 };
  var LANE_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f'];
  var LANE_COLORS_DIM = ['rgba(231,76,60,0.15)', 'rgba(52,152,219,0.15)', 'rgba(46,204,113,0.15)', 'rgba(241,196,15,0.15)'];
  var LANE_FLASH_COLORS = ['rgba(231,76,60,0.4)', 'rgba(52,152,219,0.4)', 'rgba(46,204,113,0.4)', 'rgba(241,196,15,0.4)'];
  var TRAVEL_TIME = 2.0;        // seconds for note to fall from top to hit zone
  var SCHEDULE_AHEAD = 3.0;     // pre-schedule audio this far ahead
  var HIT_ZONE_Y = 0.85;       // hit zone position as fraction of canvas height
  var PERFECT_WINDOW = 0.05;   // 50ms
  var GOOD_WINDOW = 0.12;      // 120ms
  var MISS_WINDOW = 0.18;      // 180ms
  var PERFECT_SCORE = 300;
  var GOOD_SCORE = 100;
  var MAX_MULTIPLIER = 10;
  var NOTE_WIDTH_FRAC = 0.7;   // note width as fraction of lane width
  var NOTE_HEIGHT = 28;
  var KEY_HEIGHT_FRAC = 0.12;   // piano key height as fraction of canvas

  // --- State ---
  var state = STATES.START;
  var canvas, ctx;
  var canvasW, canvasH, dpr;
  var currentSong = null;
  var songStartTime = 0;       // AudioContext time when song started
  var pauseElapsed = 0;        // elapsed song time when paused
  var songNotes = [];          // working copy with hit state
  var nextScheduleIdx = 0;     // index of next note to schedule audio for
  var score = 0;
  var combo = 0;
  var maxCombo = 0;
  var perfects = 0;
  var goods = 0;
  var misses = 0;
  var laneFlash = [0, 0, 0, 0];   // flash timers per lane
  var particles = [];
  var ratings = [];               // floating rating text animations
  var songFinished = false;

  // --- DOM refs ---
  var elHud, elScore, elCombo, elPauseBtn;
  var elProgressBar, elProgressFill;
  var screens = {};

  // --- Canvas setup ---
  function initCanvas() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvasW = window.innerWidth;
    canvasH = window.innerHeight;
    canvas.width = canvasW * dpr;
    canvas.height = canvasH * dpr;
    canvas.style.width = canvasW + 'px';
    canvas.style.height = canvasH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // --- Screen management ---
  function showScreen(id) {
    var ids = ['start-screen', 'select-screen', 'pause-screen', 'results-screen'];
    for (var i = 0; i < ids.length; i++) {
      screens[ids[i]].classList.toggle('hidden', ids[i] !== id);
    }
    var showHud = (id === null);
    elHud.classList.toggle('hidden', !showHud);
    elProgressBar.classList.toggle('hidden', !showHud);
  }

  function hideAllScreens() {
    showScreen(null);
  }

  // --- Song select population ---
  var currentFilter = 'All';

  function populateSongList() {
    var container = document.getElementById('song-list');
    container.innerHTML = '';

    // Import Song card at top
    var importCard = document.createElement('button');
    importCard.className = 'song-card-import';
    importCard.innerHTML =
      '<div class="song-info">' +
        '<div class="song-name">Import Song</div>' +
        '<div class="song-artist">Load an MP3 or audio file</div>' +
      '</div>' +
      '<span class="diff-import">+</span>';
    importCard.addEventListener('click', function () {
      document.getElementById('file-input').click();
    });
    container.appendChild(importCard);

    var songs = Songs.list;
    for (var i = 0; i < songs.length; i++) {
      (function (song) {
        if (currentFilter !== 'All' && song.difficulty !== currentFilter) return;
        var card = document.createElement('button');
        card.className = 'song-card';
        card.innerHTML =
          '<div class="song-info">' +
            '<div class="song-name">' + song.title + '</div>' +
            '<div class="song-artist">' + song.artist + '</div>' +
          '</div>' +
          '<span class="song-difficulty diff-' + song.difficulty + '">' + song.difficulty + '</span>';
        card.addEventListener('click', function () { startSong(song); });
        container.appendChild(card);
      })(songs[i]);
    }

    container.scrollTop = 0;
  }

  function initFilterTabs() {
    var tabs = document.querySelectorAll('.filter-tab');
    for (var i = 0; i < tabs.length; i++) {
      (function (tab) {
        tab.addEventListener('click', function () {
          for (var j = 0; j < tabs.length; j++) {
            tabs[j].classList.remove('active');
          }
          tab.classList.add('active');
          currentFilter = tab.getAttribute('data-filter');
          populateSongList();
        });
      })(tabs[i]);
    }
  }

  // --- Import handling ---
  function showImportProgress(show, msg) {
    var overlay = document.getElementById('import-overlay');
    var status = document.getElementById('import-status');
    if (show) {
      status.textContent = msg || 'Analyzing...';
      overlay.classList.remove('hidden');
    } else {
      overlay.classList.add('hidden');
    }
  }

  function handleFileImport(file) {
    if (!file) return;
    AudioEngine.init();
    showImportProgress(true, 'Decoding audio...');

    AudioEngine.decodeFile(file, function (err, audioBuffer) {
      if (err) {
        showImportProgress(false);
        alert('Could not decode audio file. Please try a different file.');
        return;
      }

      showImportProgress(true, 'Analyzing song...');

      // Use setTimeout to let UI update before heavy computation
      setTimeout(function () {
        try {
          var difficulty = document.getElementById('import-difficulty').value;
          var song = SongAnalyzer.analyze(audioBuffer, file.name, { difficulty: difficulty });
          showImportProgress(false);
          startSong(song);
        } catch (e) {
          showImportProgress(false);
          alert('Error analyzing song: ' + e.message);
        }
      }, 50);
    });
  }

  // --- Start a song ---
  function startSong(song) {
    currentSong = song;
    score = 0;
    combo = 0;
    maxCombo = 0;
    perfects = 0;
    goods = 0;
    misses = 0;
    particles = [];
    ratings = [];
    songFinished = false;
    laneFlash = [0, 0, 0, 0];

    // Deep copy notes with hit tracking
    songNotes = [];
    for (var i = 0; i < song.notes.length; i++) {
      var n = song.notes[i];
      songNotes.push({ time: n.time, lane: n.lane, note: n.note, hit: false, missed: false, scheduled: false });
    }
    nextScheduleIdx = 0;

    // Init audio and mark song start time
    AudioEngine.init();
    AudioEngine.resume();
    songStartTime = AudioEngine.now() + 0.5; // small delay before notes start

    // Start backing track for custom/imported songs
    if (song.audioBuffer) {
      AudioEngine.playBackingTrack(song.audioBuffer, songStartTime);
    }

    state = STATES.PLAYING;
    hideAllScreens();
    updateHud();
  }

  // --- Pause / Resume ---
  function pauseGame() {
    if (state !== STATES.PLAYING) return;
    pauseElapsed = AudioEngine.now() - songStartTime;
    AudioEngine.suspend();
    state = STATES.PAUSED;
    showScreen('pause-screen');
  }

  function resumeGame() {
    if (state !== STATES.PAUSED) return;
    AudioEngine.resume();
    songStartTime = AudioEngine.now() - pauseElapsed;
    // Re-schedule upcoming notes
    nextScheduleIdx = 0;
    for (var i = 0; i < songNotes.length; i++) {
      songNotes[i].scheduled = false;
      if (songNotes[i].hit || songNotes[i].missed) {
        songNotes[i].scheduled = true;
        nextScheduleIdx = i + 1;
      }
    }
    // Restart backing track from paused position
    if (currentSong && currentSong.audioBuffer) {
      AudioEngine.restartBackingTrack(songStartTime);
    }
    state = STATES.PLAYING;
    hideAllScreens();
  }

  function quitToMenu() {
    AudioEngine.stopBackingTrack();
    AudioEngine.suspend();
    state = STATES.SONG_SELECT;
    showScreen('select-screen');
  }

  // --- HUD ---
  function updateHud() {
    elScore.textContent = score;
    if (combo >= 2) {
      elCombo.textContent = combo + 'x Combo';
      elCombo.classList.remove('hidden');
    } else {
      elCombo.classList.add('hidden');
    }
  }

  // --- Input ---
  function getLaneFromX(x) {
    var laneW = canvasW / 4;
    var lane = Math.floor(x / laneW);
    return Math.max(0, Math.min(3, lane));
  }

  function handleLane(lane) {
    if (state !== STATES.PLAYING) return;

    // Flash effect
    laneFlash[lane] = 0.15;

    var elapsed = AudioEngine.now() - songStartTime;

    // Find nearest unhit note in this lane
    var bestIdx = -1;
    var bestDelta = Infinity;
    for (var i = 0; i < songNotes.length; i++) {
      var n = songNotes[i];
      if (n.lane !== lane || n.hit || n.missed) continue;
      var delta = Math.abs(n.time - elapsed);
      if (delta < bestDelta && delta < MISS_WINDOW) {
        bestDelta = delta;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) {
      // Empty tap - no penalty per design
      AudioEngine.playHitSound(lane);
      return;
    }

    var note = songNotes[bestIdx];
    note.hit = true;
    var hitY = canvasH * HIT_ZONE_Y;

    if (bestDelta <= PERFECT_WINDOW) {
      score += PERFECT_SCORE * Math.min(combo + 1, MAX_MULTIPLIER);
      combo++;
      perfects++;
      spawnParticles(lane, hitY, LANE_COLORS[lane], 12);
      addRating('PERFECT', lane, '#f39c12');
    } else if (bestDelta <= GOOD_WINDOW) {
      score += GOOD_SCORE * Math.min(combo + 1, MAX_MULTIPLIER);
      combo++;
      goods++;
      spawnParticles(lane, hitY, LANE_COLORS[lane], 6);
      addRating('GOOD', lane, '#2ecc71');
    }

    if (combo > maxCombo) maxCombo = combo;

    AudioEngine.playHitSound(lane);
    AudioEngine.playNote(note.note, 0.3);
    updateHud();
  }

  // Keyboard lane mapping: D F J K (standard rhythm game layout)
  var KEY_TO_LANE = { 'd': 0, 'f': 1, 'j': 2, 'k': 3 };

  function setupInput() {
    canvas.addEventListener('touchstart', function (e) {
      e.preventDefault();
      for (var i = 0; i < e.changedTouches.length; i++) {
        handleLane(getLaneFromX(e.changedTouches[i].clientX));
      }
    }, { passive: false });

    canvas.addEventListener('mousedown', function (e) {
      handleLane(getLaneFromX(e.clientX));
    });

    document.addEventListener('keydown', function (e) {
      var key = e.key.toLowerCase();
      if (key in KEY_TO_LANE) {
        if (e.repeat) return;
        handleLane(KEY_TO_LANE[key]);
      } else if (key === 'escape') {
        if (state === STATES.PLAYING) pauseGame();
        else if (state === STATES.PAUSED) resumeGame();
      }
    });
  }

  // --- Particles ---
  function spawnParticles(lane, y, color, count) {
    var laneW = canvasW / 4;
    var cx = lane * laneW + laneW / 2;
    for (var i = 0; i < count; i++) {
      particles.push({
        x: cx,
        y: y,
        vx: (Math.random() - 0.5) * 200,
        vy: (Math.random() - 1) * 180,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
        size: 3 + Math.random() * 4,
        color: color
      });
    }
  }

  function updateParticles(dt) {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 300 * dt; // gravity
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  // --- Rating popups ---
  function addRating(text, lane, color) {
    var laneW = canvasW / 4;
    ratings.push({
      text: text,
      x: lane * laneW + laneW / 2,
      y: canvasH * HIT_ZONE_Y - 40,
      life: 0.8,
      color: color
    });
  }

  function updateRatings(dt) {
    for (var i = ratings.length - 1; i >= 0; i--) {
      ratings[i].y -= 60 * dt;
      ratings[i].life -= dt;
      if (ratings[i].life <= 0) ratings.splice(i, 1);
    }
  }

  // --- Audio scheduling ---
  function scheduleAudio(elapsed) {
    var isCustom = currentSong && currentSong.isCustom;
    for (var i = nextScheduleIdx; i < songNotes.length; i++) {
      var n = songNotes[i];
      if (n.scheduled) continue;
      if (n.time > elapsed + SCHEDULE_AHEAD) break;
      n.scheduled = true;
      // Skip individual note playback for custom songs (backing track provides audio)
      if (!isCustom) {
        AudioEngine.playSongNote(n.note, songStartTime + n.time);
      }
      nextScheduleIdx = i + 1;
    }
  }

  // --- Miss detection ---
  function checkMisses(elapsed) {
    for (var i = 0; i < songNotes.length; i++) {
      var n = songNotes[i];
      if (n.hit || n.missed) continue;
      if (elapsed - n.time > MISS_WINDOW) {
        n.missed = true;
        misses++;
        combo = 0;
        score = Math.max(0, score - 100);
        AudioEngine.playMissSound();
        addRating('MISS', n.lane, '#e74c3c');
        updateHud();
      }
    }
  }

  // --- Check song end ---
  function checkSongEnd(elapsed) {
    if (songFinished) return;
    if (songNotes.length === 0) {
      songFinished = true;
      AudioEngine.stopBackingTrack();
      setTimeout(showResults, 500);
      return;
    }
    var lastNote = songNotes[songNotes.length - 1];
    if (elapsed > lastNote.time + 1.5) {
      songFinished = true;
      AudioEngine.stopBackingTrack();
      setTimeout(showResults, 500);
    }
  }

  // --- Results ---
  function showResults() {
    state = STATES.RESULTS;

    var total = perfects + goods + misses;
    var pct = total > 0 ? (perfects + goods) / total : 0;
    var grade, gradeClass;
    if (pct >= 0.95 && misses === 0) { grade = 'S'; gradeClass = 'grade-S'; }
    else if (pct >= 0.9) { grade = 'A'; gradeClass = 'grade-A'; }
    else if (pct >= 0.75) { grade = 'B'; gradeClass = 'grade-B'; }
    else if (pct >= 0.5) { grade = 'C'; gradeClass = 'grade-C'; }
    else { grade = 'F'; gradeClass = 'grade-F'; }

    var elGrade = document.getElementById('result-grade');
    elGrade.textContent = grade;
    elGrade.className = 'grade ' + gradeClass;
    document.getElementById('result-song').textContent = currentSong.title;
    document.getElementById('result-score').textContent = score;
    document.getElementById('stat-perfect').textContent = perfects;
    document.getElementById('stat-good').textContent = goods;
    document.getElementById('stat-miss').textContent = misses;
    document.getElementById('stat-combo').textContent = maxCombo;

    showScreen('results-screen');
  }

  // --- Rendering ---
  function render(elapsed) {
    ctx.clearRect(0, 0, canvasW, canvasH);

    var laneW = canvasW / 4;
    var hitY = canvasH * HIT_ZONE_Y;
    var keyH = canvasH * KEY_HEIGHT_FRAC;

    // Background lanes
    for (var i = 0; i < 4; i++) {
      var lx = i * laneW;

      // Lane background
      ctx.fillStyle = LANE_COLORS_DIM[i];
      ctx.fillRect(lx, 0, laneW, canvasH);

      // Lane flash
      if (laneFlash[i] > 0) {
        ctx.fillStyle = LANE_FLASH_COLORS[i];
        ctx.fillRect(lx, 0, laneW, canvasH);
      }

      // Lane separator
      if (i > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(lx, 0);
        ctx.lineTo(lx, canvasH);
        ctx.stroke();
      }
    }

    // Hit zone line
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, hitY);
    ctx.lineTo(canvasW, hitY);
    ctx.stroke();

    // Piano keys at bottom
    for (var i = 0; i < 4; i++) {
      var lx = i * laneW;
      var keyGrad = ctx.createLinearGradient(0, hitY, 0, hitY + keyH);
      keyGrad.addColorStop(0, LANE_COLORS[i]);
      keyGrad.addColorStop(1, 'rgba(0,0,0,0.5)');

      ctx.fillStyle = keyGrad;
      ctx.globalAlpha = laneFlash[i] > 0 ? 0.9 : 0.4;
      ctx.fillRect(lx + 2, hitY, laneW - 4, keyH);
      ctx.globalAlpha = 1.0;

      // Key border
      ctx.strokeStyle = LANE_COLORS[i];
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.5;
      ctx.strokeRect(lx + 2, hitY, laneW - 4, keyH);
      ctx.globalAlpha = 1.0;
    }

    // Falling notes
    var noteW = laneW * NOTE_WIDTH_FRAC;
    for (var i = 0; i < songNotes.length; i++) {
      var n = songNotes[i];
      if (n.hit || n.missed) continue;

      var progress = (elapsed - n.time + TRAVEL_TIME) / TRAVEL_TIME;
      if (progress < 0 || progress > 1.3) continue;

      var ny = progress * hitY - NOTE_HEIGHT / 2;
      var nx = n.lane * laneW + (laneW - noteW) / 2;

      // Pill shape
      var r = NOTE_HEIGHT / 2;
      ctx.fillStyle = LANE_COLORS[n.lane];
      ctx.shadowColor = LANE_COLORS[n.lane];
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(nx + r, ny);
      ctx.lineTo(nx + noteW - r, ny);
      ctx.arcTo(nx + noteW, ny, nx + noteW, ny + r, r);
      ctx.arcTo(nx + noteW, ny + NOTE_HEIGHT, nx + noteW - r, ny + NOTE_HEIGHT, r);
      ctx.lineTo(nx + r, ny + NOTE_HEIGHT);
      ctx.arcTo(nx, ny + NOTE_HEIGHT, nx, ny + r, r);
      ctx.arcTo(nx, ny, nx + r, ny, r);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      // Highlight streak
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.moveTo(nx + r, ny + 2);
      ctx.lineTo(nx + noteW - r, ny + 2);
      ctx.arcTo(nx + noteW - 2, ny + 2, nx + noteW - 2, ny + r, r - 2);
      ctx.lineTo(nx + noteW - 2, ny + NOTE_HEIGHT * 0.4);
      ctx.lineTo(nx + 2, ny + NOTE_HEIGHT * 0.4);
      ctx.lineTo(nx + 2, ny + r);
      ctx.arcTo(nx + 2, ny + 2, nx + r, ny + 2, r - 2);
      ctx.closePath();
      ctx.fill();
    }

    // Particles
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // Rating popups
    for (var i = 0; i < ratings.length; i++) {
      var r = ratings[i];
      var alpha = r.life / 0.8;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = r.color;
      ctx.font = 'bold 18px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(r.text, r.x, r.y);
    }
    ctx.globalAlpha = 1.0;
    ctx.textAlign = 'start';
  }

  // --- Game loop ---
  var lastFrameTime = 0;

  function gameLoop(timestamp) {
    requestAnimationFrame(gameLoop);

    if (state !== STATES.PLAYING) {
      // Still render canvas background when not playing
      if (state === STATES.START || state === STATES.SONG_SELECT) {
        renderIdleBackground(timestamp);
      }
      return;
    }

    var dt = lastFrameTime ? (timestamp - lastFrameTime) / 1000 : 0.016;
    dt = Math.min(dt, 0.05); // cap delta
    lastFrameTime = timestamp;

    var elapsed = AudioEngine.now() - songStartTime;

    // Schedule audio ahead
    scheduleAudio(elapsed);

    // Check misses
    checkMisses(elapsed);

    // Update effects
    for (var i = 0; i < 4; i++) {
      if (laneFlash[i] > 0) laneFlash[i] = Math.max(0, laneFlash[i] - dt);
    }
    updateParticles(dt);
    updateRatings(dt);

    // Render
    render(elapsed);

    // Progress bar
    var progress = Math.min(elapsed / currentSong.duration, 1);
    elProgressFill.style.width = (progress * 100) + '%';

    // Check song end
    checkSongEnd(elapsed);
  }

  function renderIdleBackground(timestamp) {
    ctx.clearRect(0, 0, canvasW, canvasH);

    // Animated gradient background
    var t = timestamp * 0.0005;
    var grad = ctx.createLinearGradient(0, 0, canvasW, canvasH);
    var hue1 = (t * 20) % 360;
    grad.addColorStop(0, 'hsl(' + hue1 + ', 30%, 8%)');
    grad.addColorStop(0.5, 'hsl(' + ((hue1 + 60) % 360) + ', 25%, 6%)');
    grad.addColorStop(1, 'hsl(' + ((hue1 + 120) % 360) + ', 30%, 8%)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Subtle floating particles
    var count = 15;
    for (var i = 0; i < count; i++) {
      var x = (Math.sin(t + i * 2.1) * 0.3 + 0.5) * canvasW;
      var y = (Math.cos(t * 0.7 + i * 1.7) * 0.3 + 0.5) * canvasH;
      var size = 2 + Math.sin(t + i) * 1;
      ctx.globalAlpha = 0.15 + Math.sin(t * 0.5 + i) * 0.1;
      ctx.fillStyle = LANE_COLORS[i % 4];
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // --- Init ---
  function init() {
    // Cache DOM refs
    elHud = document.getElementById('hud');
    elScore = document.getElementById('hud-score');
    elCombo = document.getElementById('hud-combo');
    elPauseBtn = document.getElementById('pause-btn');
    elProgressBar = document.getElementById('progress-bar');
    elProgressFill = document.getElementById('progress-fill');

    screens['start-screen'] = document.getElementById('start-screen');
    screens['select-screen'] = document.getElementById('select-screen');
    screens['pause-screen'] = document.getElementById('pause-screen');
    screens['results-screen'] = document.getElementById('results-screen');

    initCanvas();
    populateSongList();
    initFilterTabs();
    setupInput();

    // Button handlers
    document.getElementById('btn-play').addEventListener('click', function () {
      AudioEngine.init(); // user gesture
      state = STATES.SONG_SELECT;
      showScreen('select-screen');
    });

    document.getElementById('btn-back-start').addEventListener('click', function () {
      state = STATES.START;
      showScreen('start-screen');
    });

    elPauseBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      pauseGame();
    });

    document.getElementById('btn-resume').addEventListener('click', resumeGame);
    document.getElementById('btn-quit').addEventListener('click', quitToMenu);

    document.getElementById('btn-retry').addEventListener('click', function () {
      startSong(currentSong);
    });

    document.getElementById('btn-menu').addEventListener('click', function () {
      state = STATES.SONG_SELECT;
      showScreen('select-screen');
    });

    // File import handler
    document.getElementById('file-input').addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (file) handleFileImport(file);
      e.target.value = ''; // reset so same file can be re-selected
    });

    // Prevent context menu on long press
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    // Start game loop
    requestAnimationFrame(gameLoop);
  }

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
