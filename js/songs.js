(function () {
  'use strict';

  // Lane assignments: 0=Red, 1=Blue, 2=Green, 3=Yellow
  // Lanes roughly map to pitch ranges for visual consistency

  var songs = [
    {
      id: 'twinkle',
      title: 'Twinkle Twinkle Little Star',
      artist: 'Traditional',
      bpm: 100,
      difficulty: 'Easy',
      duration: 28,
      notes: [
        // "Twinkle twinkle little star"
        { time: 0.6, lane: 0, note: 'C4' },
        { time: 1.2, lane: 0, note: 'C4' },
        { time: 1.8, lane: 2, note: 'G4' },
        { time: 2.4, lane: 2, note: 'G4' },
        { time: 3.0, lane: 3, note: 'A4' },
        { time: 3.6, lane: 3, note: 'A4' },
        { time: 4.2, lane: 2, note: 'G4' },
        // "How I wonder what you are"
        { time: 5.4, lane: 1, note: 'F4' },
        { time: 6.0, lane: 1, note: 'F4' },
        { time: 6.6, lane: 1, note: 'E4' },
        { time: 7.2, lane: 1, note: 'E4' },
        { time: 7.8, lane: 0, note: 'D4' },
        { time: 8.4, lane: 0, note: 'D4' },
        { time: 9.0, lane: 0, note: 'C4' },
        // "Up above the world so high"
        { time: 10.2, lane: 2, note: 'G4' },
        { time: 10.8, lane: 2, note: 'G4' },
        { time: 11.4, lane: 1, note: 'F4' },
        { time: 12.0, lane: 1, note: 'F4' },
        { time: 12.6, lane: 1, note: 'E4' },
        { time: 13.2, lane: 1, note: 'E4' },
        { time: 13.8, lane: 0, note: 'D4' },
        // "Like a diamond in the sky"
        { time: 15.0, lane: 2, note: 'G4' },
        { time: 15.6, lane: 2, note: 'G4' },
        { time: 16.2, lane: 1, note: 'F4' },
        { time: 16.8, lane: 1, note: 'F4' },
        { time: 17.4, lane: 1, note: 'E4' },
        { time: 18.0, lane: 1, note: 'E4' },
        { time: 18.6, lane: 0, note: 'D4' },
        // "Twinkle twinkle little star" (reprise)
        { time: 19.8, lane: 0, note: 'C4' },
        { time: 20.4, lane: 0, note: 'C4' },
        { time: 21.0, lane: 2, note: 'G4' },
        { time: 21.6, lane: 2, note: 'G4' },
        { time: 22.2, lane: 3, note: 'A4' },
        { time: 22.8, lane: 3, note: 'A4' },
        { time: 23.4, lane: 2, note: 'G4' },
        // "How I wonder what you are"
        { time: 24.6, lane: 1, note: 'F4' },
        { time: 25.2, lane: 1, note: 'F4' },
        { time: 25.8, lane: 1, note: 'E4' },
        { time: 26.4, lane: 1, note: 'E4' },
        { time: 27.0, lane: 0, note: 'D4' },
        { time: 27.6, lane: 0, note: 'D4' },
        { time: 28.2, lane: 0, note: 'C4' }
      ]
    },
    {
      id: 'ode',
      title: 'Ode to Joy',
      artist: 'Beethoven',
      bpm: 120,
      difficulty: 'Medium',
      duration: 32,
      notes: [
        // Line 1: E E F G | G F E D
        { time: 0.5, lane: 1, note: 'E4' },
        { time: 1.0, lane: 1, note: 'E4' },
        { time: 1.5, lane: 1, note: 'F4' },
        { time: 2.0, lane: 2, note: 'G4' },
        { time: 2.5, lane: 2, note: 'G4' },
        { time: 3.0, lane: 1, note: 'F4' },
        { time: 3.5, lane: 1, note: 'E4' },
        { time: 4.0, lane: 0, note: 'D4' },
        // Line 2: C C D E | E D D
        { time: 4.5, lane: 0, note: 'C4' },
        { time: 5.0, lane: 0, note: 'C4' },
        { time: 5.5, lane: 0, note: 'D4' },
        { time: 6.0, lane: 1, note: 'E4' },
        { time: 6.5, lane: 1, note: 'E4' },
        { time: 7.0, lane: 0, note: 'D4' },
        { time: 7.75, lane: 0, note: 'D4' },
        // Line 3: E E F G | G F E D
        { time: 8.5, lane: 1, note: 'E4' },
        { time: 9.0, lane: 1, note: 'E4' },
        { time: 9.5, lane: 1, note: 'F4' },
        { time: 10.0, lane: 2, note: 'G4' },
        { time: 10.5, lane: 2, note: 'G4' },
        { time: 11.0, lane: 1, note: 'F4' },
        { time: 11.5, lane: 1, note: 'E4' },
        { time: 12.0, lane: 0, note: 'D4' },
        // Line 4: C C D E | D C C
        { time: 12.5, lane: 0, note: 'C4' },
        { time: 13.0, lane: 0, note: 'C4' },
        { time: 13.5, lane: 0, note: 'D4' },
        { time: 14.0, lane: 1, note: 'E4' },
        { time: 14.5, lane: 0, note: 'D4' },
        { time: 15.0, lane: 0, note: 'C4' },
        { time: 15.75, lane: 0, note: 'C4' },
        // Line 5 (bridge): D D E C | D E-F E C
        { time: 16.5, lane: 0, note: 'D4' },
        { time: 17.0, lane: 0, note: 'D4' },
        { time: 17.5, lane: 1, note: 'E4' },
        { time: 18.0, lane: 0, note: 'C4' },
        { time: 18.5, lane: 0, note: 'D4' },
        { time: 19.0, lane: 1, note: 'E4' },
        { time: 19.25, lane: 1, note: 'F4' },
        { time: 19.5, lane: 1, note: 'E4' },
        { time: 20.0, lane: 0, note: 'C4' },
        // Line 6: D E-F E D | C D G3
        { time: 20.5, lane: 0, note: 'D4' },
        { time: 21.0, lane: 1, note: 'E4' },
        { time: 21.25, lane: 1, note: 'F4' },
        { time: 21.5, lane: 1, note: 'E4' },
        { time: 22.0, lane: 0, note: 'D4' },
        { time: 22.5, lane: 0, note: 'C4' },
        { time: 23.0, lane: 0, note: 'D4' },
        { time: 23.5, lane: 2, note: 'G3' },
        // Line 7 (repeat): E E F G | G F E D
        { time: 24.5, lane: 1, note: 'E4' },
        { time: 25.0, lane: 1, note: 'E4' },
        { time: 25.5, lane: 1, note: 'F4' },
        { time: 26.0, lane: 2, note: 'G4' },
        { time: 26.5, lane: 2, note: 'G4' },
        { time: 27.0, lane: 1, note: 'F4' },
        { time: 27.5, lane: 1, note: 'E4' },
        { time: 28.0, lane: 0, note: 'D4' },
        // Line 8: C C D E | D C C
        { time: 28.5, lane: 0, note: 'C4' },
        { time: 29.0, lane: 0, note: 'C4' },
        { time: 29.5, lane: 0, note: 'D4' },
        { time: 30.0, lane: 1, note: 'E4' },
        { time: 30.5, lane: 0, note: 'D4' },
        { time: 31.0, lane: 0, note: 'C4' },
        { time: 31.75, lane: 0, note: 'C4' }
      ]
    },
    {
      id: 'furelise',
      title: 'Fur Elise',
      artist: 'Beethoven',
      bpm: 140,
      difficulty: 'Hard',
      duration: 28,
      notes: [
        // Opening motif: E5 Eb5 E5 Eb5 E5 B4 D5 C5
        { time: 0.43, lane: 3, note: 'E5' },
        { time: 0.64, lane: 3, note: 'Eb4' },
        { time: 0.86, lane: 3, note: 'E5' },
        { time: 1.07, lane: 3, note: 'Eb4' },
        { time: 1.28, lane: 3, note: 'E5' },
        { time: 1.50, lane: 2, note: 'B4' },
        { time: 1.71, lane: 2, note: 'D5' },
        { time: 1.93, lane: 2, note: 'C5' },
        // A3 (resolve)
        { time: 2.14, lane: 0, note: 'A3' },
        // C4 E4 A4
        { time: 2.57, lane: 0, note: 'C4' },
        { time: 2.78, lane: 1, note: 'E4' },
        { time: 3.00, lane: 2, note: 'A4' },
        // B4 (resolve)
        { time: 3.21, lane: 2, note: 'B4' },
        // E4 G#4 B4
        { time: 3.64, lane: 1, note: 'E4' },
        { time: 3.86, lane: 2, note: 'G#4' },
        { time: 4.07, lane: 2, note: 'B4' },
        // C5 (resolve)
        { time: 4.28, lane: 2, note: 'C5' },
        // Repeat motif: E5 Eb5 E5 Eb5 E5 B4 D5 C5
        { time: 4.71, lane: 3, note: 'E5' },
        { time: 4.93, lane: 3, note: 'Eb4' },
        { time: 5.14, lane: 3, note: 'E5' },
        { time: 5.36, lane: 3, note: 'Eb4' },
        { time: 5.57, lane: 3, note: 'E5' },
        { time: 5.78, lane: 2, note: 'B4' },
        { time: 6.00, lane: 2, note: 'D5' },
        { time: 6.21, lane: 2, note: 'C5' },
        // A3
        { time: 6.43, lane: 0, note: 'A3' },
        // C4 E4 A4
        { time: 6.86, lane: 0, note: 'C4' },
        { time: 7.07, lane: 1, note: 'E4' },
        { time: 7.28, lane: 2, note: 'A4' },
        // B4
        { time: 7.50, lane: 2, note: 'B4' },
        // E4 C5 B4 A4
        { time: 7.93, lane: 1, note: 'E4' },
        { time: 8.14, lane: 2, note: 'C5' },
        { time: 8.36, lane: 2, note: 'B4' },
        { time: 8.57, lane: 2, note: 'A4' },

        // Second section (descending passage)
        // E5 Eb5 E5 Eb5 E5 B4 D5 C5
        { time: 9.00, lane: 3, note: 'E5' },
        { time: 9.21, lane: 3, note: 'Eb4' },
        { time: 9.43, lane: 3, note: 'E5' },
        { time: 9.64, lane: 3, note: 'Eb4' },
        { time: 9.86, lane: 3, note: 'E5' },
        { time: 10.07, lane: 2, note: 'B4' },
        { time: 10.28, lane: 2, note: 'D5' },
        { time: 10.50, lane: 2, note: 'C5' },
        // A3
        { time: 10.71, lane: 0, note: 'A3' },
        // C4 E4 A4
        { time: 11.14, lane: 0, note: 'C4' },
        { time: 11.36, lane: 1, note: 'E4' },
        { time: 11.57, lane: 2, note: 'A4' },
        // B4
        { time: 11.78, lane: 2, note: 'B4' },
        // E4 G#4 B4
        { time: 12.21, lane: 1, note: 'E4' },
        { time: 12.43, lane: 2, note: 'G#4' },
        { time: 12.64, lane: 2, note: 'B4' },
        // C5
        { time: 12.86, lane: 2, note: 'C5' },

        // Middle section (more lyrical)
        // E5 Eb5 E5 Eb5 E5 B4 D5 C5
        { time: 13.28, lane: 3, note: 'E5' },
        { time: 13.50, lane: 3, note: 'Eb4' },
        { time: 13.71, lane: 3, note: 'E5' },
        { time: 13.93, lane: 3, note: 'Eb4' },
        { time: 14.14, lane: 3, note: 'E5' },
        { time: 14.36, lane: 2, note: 'B4' },
        { time: 14.57, lane: 2, note: 'D5' },
        { time: 14.78, lane: 2, note: 'C5' },
        // A3
        { time: 15.00, lane: 0, note: 'A3' },
        // C4 E4 A4
        { time: 15.43, lane: 0, note: 'C4' },
        { time: 15.64, lane: 1, note: 'E4' },
        { time: 15.86, lane: 2, note: 'A4' },
        // B4
        { time: 16.07, lane: 2, note: 'B4' },
        // E4 C5 B4 A4
        { time: 16.50, lane: 1, note: 'E4' },
        { time: 16.71, lane: 2, note: 'C5' },
        { time: 16.93, lane: 2, note: 'B4' },
        { time: 17.14, lane: 2, note: 'A4' },

        // Contrasting section (C major passage)
        // C4 D4 E4 F4
        { time: 17.78, lane: 0, note: 'C4' },
        { time: 18.21, lane: 0, note: 'D4' },
        { time: 18.64, lane: 1, note: 'E4' },
        { time: 19.07, lane: 1, note: 'F4' },
        // G4 A4 G4 F4
        { time: 19.50, lane: 2, note: 'G4' },
        { time: 19.93, lane: 3, note: 'A4' },
        { time: 20.36, lane: 2, note: 'G4' },
        { time: 20.78, lane: 1, note: 'F4' },
        // E4 D4 C4
        { time: 21.21, lane: 1, note: 'E4' },
        { time: 21.64, lane: 0, note: 'D4' },
        { time: 22.07, lane: 0, note: 'C4' },

        // Final motif return
        // E5 Eb5 E5 Eb5 E5 B4 D5 C5
        { time: 22.71, lane: 3, note: 'E5' },
        { time: 22.93, lane: 3, note: 'Eb4' },
        { time: 23.14, lane: 3, note: 'E5' },
        { time: 23.36, lane: 3, note: 'Eb4' },
        { time: 23.57, lane: 3, note: 'E5' },
        { time: 23.78, lane: 2, note: 'B4' },
        { time: 24.00, lane: 2, note: 'D5' },
        { time: 24.21, lane: 2, note: 'C5' },
        // A3
        { time: 24.43, lane: 0, note: 'A3' },
        // C4 E4 A4
        { time: 24.86, lane: 0, note: 'C4' },
        { time: 25.07, lane: 1, note: 'E4' },
        { time: 25.28, lane: 2, note: 'A4' },
        // B4
        { time: 25.50, lane: 2, note: 'B4' },
        // E4 C5 B4 A4 (final)
        { time: 25.93, lane: 1, note: 'E4' },
        { time: 26.14, lane: 2, note: 'C5' },
        { time: 26.36, lane: 2, note: 'B4' },
        { time: 26.78, lane: 2, note: 'A4' }
      ]
    }
  ];

  window.Songs = {
    list: songs,
    getById: function (id) {
      for (var i = 0; i < songs.length; i++) {
        if (songs[i].id === id) return songs[i];
      }
      return null;
    }
  };
})();
