(function () {
  'use strict';

  // --- Constants ---
  var FFT_SIZE = 2048;
  var HOP_SIZE = 512;
  var SAMPLE_RATE = 44100; // will be overridden by actual buffer rate

  // Frequency band edges mapping to lanes
  // Lane 0 (Red):    20-250 Hz   (bass)
  // Lane 1 (Blue):   250-1000 Hz (low-mid)
  // Lane 2 (Green):  1000-4000 Hz (high-mid)
  // Lane 3 (Yellow): 4000-16000 Hz (treble)
  var BAND_EDGES = [20, 250, 1000, 4000, 16000];

  // Difficulty presets
  var DIFFICULTY = {
    Easy:   { minSpacing: 0.4,  maxNotesPerSec: 2, thresholdMult: 1.8 },
    Medium: { minSpacing: 0.25, maxNotesPerSec: 4, thresholdMult: 1.4 },
    Hard:   { minSpacing: 0.15, maxNotesPerSec: 8, thresholdMult: 1.1 }
  };

  // Note names per lane for generated charts
  var LANE_NOTES = ['C3', 'E4', 'G4', 'C5'];

  // --- Hann window ---
  function createHannWindow(size) {
    var w = new Float32Array(size);
    for (var i = 0; i < size; i++) {
      w[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (size - 1)));
    }
    return w;
  }

  // --- Radix-2 FFT (in-place, iterative) ---
  function fft(reOut, imOut, reIn, N) {
    // Bit-reversal permutation
    var bits = Math.log2(N) | 0;
    for (var i = 0; i < N; i++) {
      var j = 0;
      for (var b = 0; b < bits; b++) {
        j = (j << 1) | ((i >> b) & 1);
      }
      reOut[i] = reIn[j];
      imOut[i] = 0;
    }

    // Cooley-Tukey butterfly
    for (var size = 2; size <= N; size *= 2) {
      var half = size / 2;
      var angle = -2 * Math.PI / size;
      for (var i = 0; i < N; i += size) {
        for (var k = 0; k < half; k++) {
          var cos = Math.cos(angle * k);
          var sin = Math.sin(angle * k);
          var idx1 = i + k;
          var idx2 = i + k + half;
          var tRe = reOut[idx2] * cos - imOut[idx2] * sin;
          var tIm = reOut[idx2] * sin + imOut[idx2] * cos;
          reOut[idx2] = reOut[idx1] - tRe;
          imOut[idx2] = imOut[idx1] - tIm;
          reOut[idx1] += tRe;
          imOut[idx1] += tIm;
        }
      }
    }
  }

  // --- Mono mixdown ---
  function mixToMono(audioBuffer) {
    var channels = audioBuffer.numberOfChannels;
    var length = audioBuffer.length;
    var mono = new Float32Array(length);

    for (var c = 0; c < channels; c++) {
      var data = audioBuffer.getChannelData(c);
      for (var i = 0; i < length; i++) {
        mono[i] += data[i];
      }
    }

    if (channels > 1) {
      var scale = 1 / channels;
      for (var i = 0; i < length; i++) {
        mono[i] *= scale;
      }
    }

    return mono;
  }

  // --- Frequency bin to band index ---
  function binToBand(bin, sampleRate, fftSize) {
    var freq = bin * sampleRate / fftSize;
    for (var b = 0; b < 4; b++) {
      if (freq >= BAND_EDGES[b] && freq < BAND_EDGES[b + 1]) {
        return b;
      }
    }
    return -1; // outside range
  }

  // --- Compute band-split spectral flux ---
  function computeSpectralFlux(mono, sampleRate) {
    var hannWindow = createHannWindow(FFT_SIZE);
    var numFrames = Math.floor((mono.length - FFT_SIZE) / HOP_SIZE) + 1;
    if (numFrames < 2) return [[], [], [], []];

    // Precompute bin-to-band mapping
    var halfN = FFT_SIZE / 2;
    var binBands = new Int8Array(halfN);
    for (var b = 0; b < halfN; b++) {
      binBands[b] = binToBand(b, sampleRate, FFT_SIZE);
    }

    var flux = [
      new Float32Array(numFrames),
      new Float32Array(numFrames),
      new Float32Array(numFrames),
      new Float32Array(numFrames)
    ];

    var prevMag = [
      new Float32Array(halfN),
      new Float32Array(halfN),
      new Float32Array(halfN),
      new Float32Array(halfN)
    ];
    // Store magnitude per band per bin (only bins in that band)
    // Actually, simpler: store full previous magnitude spectrum, split during flux calc
    var prevSpectrum = new Float32Array(halfN);

    var reIn = new Float32Array(FFT_SIZE);
    var reOut = new Float32Array(FFT_SIZE);
    var imOut = new Float32Array(FFT_SIZE);

    for (var frame = 0; frame < numFrames; frame++) {
      var offset = frame * HOP_SIZE;

      // Apply window and copy to input
      for (var i = 0; i < FFT_SIZE; i++) {
        reIn[i] = mono[offset + i] * hannWindow[i];
      }

      // FFT
      fft(reOut, imOut, reIn, FFT_SIZE);

      // Compute magnitude and band-split flux
      for (var b = 0; b < halfN; b++) {
        var mag = Math.sqrt(reOut[b] * reOut[b] + imOut[b] * imOut[b]);
        var band = binBands[b];
        if (band >= 0) {
          // Half-wave rectified spectral flux
          var diff = mag - prevSpectrum[b];
          if (diff > 0) {
            flux[band][frame] += diff;
          }
        }
        prevSpectrum[b] = mag;
      }
    }

    return flux;
  }

  // --- Adaptive threshold + peak picking ---
  function detectOnsets(flux, sampleRate, thresholdMult) {
    var numFrames = flux[0].length;
    var hopTime = HOP_SIZE / sampleRate;
    var medianWindow = 15; // frames for local median
    var halfWin = Math.floor(medianWindow / 2);
    var onsets = [];

    for (var band = 0; band < 4; band++) {
      var f = flux[band];
      var temp = [];

      for (var i = 1; i < numFrames - 1; i++) {
        // Local median for adaptive threshold
        var start = Math.max(0, i - halfWin);
        var end = Math.min(numFrames, i + halfWin + 1);
        var window = [];
        for (var j = start; j < end; j++) {
          window.push(f[j]);
        }
        window.sort(function (a, b) { return a - b; });
        var median = window[Math.floor(window.length / 2)];
        var threshold = median * thresholdMult + 0.001;

        // Peak picking: must be local maximum and above threshold
        if (f[i] > threshold && f[i] > f[i - 1] && f[i] >= f[i + 1]) {
          temp.push({
            time: i * hopTime,
            lane: band,
            strength: f[i]
          });
        }
      }

      // Add to combined onsets
      for (var k = 0; k < temp.length; k++) {
        onsets.push(temp[k]);
      }
    }

    // Sort by time
    onsets.sort(function (a, b) { return a.time - b.time; });
    return onsets;
  }

  // --- Post-processing: spacing enforcement, note cap ---
  function postProcess(onsets, difficulty, duration) {
    var settings = DIFFICULTY[difficulty] || DIFFICULTY.Medium;
    var minSpacing = settings.minSpacing;
    var maxNotesPerSec = settings.maxNotesPerSec;
    var globalMinSpacing = 0.08; // 80ms absolute minimum

    // Sort by strength (strongest first) for priority picking
    var sorted = onsets.slice().sort(function (a, b) { return b.strength - a.strength; });

    // Max total notes
    var maxTotal = Math.floor(duration * maxNotesPerSec);
    var picked = [];
    var laneLast = [-Infinity, -Infinity, -Infinity, -Infinity];

    // Greedily pick strongest onsets respecting spacing
    for (var i = 0; i < sorted.length && picked.length < maxTotal; i++) {
      var o = sorted[i];
      // Check per-lane spacing
      if (o.time - laneLast[o.lane] < minSpacing) continue;

      // Check global spacing against all picked notes
      var tooClose = false;
      for (var j = 0; j < picked.length; j++) {
        if (Math.abs(picked[j].time - o.time) < globalMinSpacing) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;

      picked.push(o);
      laneLast[o.lane] = o.time;
    }

    // Sort by time for final output
    picked.sort(function (a, b) { return a.time - b.time; });
    return picked;
  }

  // --- Fallback: generate beat-aligned random notes ---
  function generateFallbackNotes(duration, difficulty) {
    var settings = DIFFICULTY[difficulty] || DIFFICULTY.Medium;
    var interval = settings.minSpacing * 2;
    var notes = [];
    var time = 1.0; // start 1 second in

    while (time < duration - 1.0) {
      notes.push({
        time: time,
        lane: Math.floor(Math.random() * 4),
        note: LANE_NOTES[Math.floor(Math.random() * 4)]
      });
      time += interval;
    }
    return notes;
  }

  // --- BPM estimation from inter-onset intervals ---
  function estimateBPM(onsets) {
    if (onsets.length < 3) return 120;

    var intervals = [];
    for (var i = 1; i < onsets.length; i++) {
      var dt = onsets[i].time - onsets[i - 1].time;
      if (dt > 0.1 && dt < 2.0) {
        intervals.push(dt);
      }
    }

    if (intervals.length === 0) return 120;

    intervals.sort(function (a, b) { return a - b; });
    var medianInterval = intervals[Math.floor(intervals.length / 2)];
    var bpm = Math.round(60 / medianInterval);

    // Clamp to reasonable range
    while (bpm < 60) bpm *= 2;
    while (bpm > 200) bpm /= 2;

    return Math.round(bpm);
  }

  // --- Main analysis function ---
  function analyze(audioBuffer, fileName, options) {
    options = options || {};
    var difficulty = options.difficulty || 'Medium';
    var sampleRate = audioBuffer.sampleRate || SAMPLE_RATE;
    var duration = audioBuffer.duration;
    var settings = DIFFICULTY[difficulty] || DIFFICULTY.Medium;

    // 1. Mono mixdown
    var mono = mixToMono(audioBuffer);

    // 2-3. STFT + band-split spectral flux
    var flux = computeSpectralFlux(mono, sampleRate);

    // 4. Onset detection
    var onsets = detectOnsets(flux, sampleRate, settings.thresholdMult);

    // 5. Post-processing
    var processed = postProcess(onsets, difficulty, duration);

    // 7. Fallback if no onsets
    var notes;
    if (processed.length === 0) {
      notes = generateFallbackNotes(duration, difficulty);
    } else {
      // Convert onsets to note objects
      notes = [];
      for (var i = 0; i < processed.length; i++) {
        notes.push({
          time: processed[i].time,
          lane: processed[i].lane,
          note: LANE_NOTES[processed[i].lane]
        });
      }
    }

    // 8. BPM estimation
    var bpm = estimateBPM(processed.length > 0 ? processed : notes);

    // Clean title from filename
    var title = fileName || 'Imported Song';
    title = title.replace(/\.[^/.]+$/, ''); // strip extension
    title = title.replace(/[_-]/g, ' ');    // replace separators
    title = title.replace(/\b\w/g, function (c) { return c.toUpperCase(); }); // title case

    return {
      id: 'custom_' + Date.now(),
      title: title,
      artist: 'Imported',
      bpm: bpm,
      difficulty: difficulty,
      duration: duration,
      notes: notes,
      audioBuffer: audioBuffer,
      isCustom: true
    };
  }

  window.SongAnalyzer = {
    analyze: analyze
  };
})();
