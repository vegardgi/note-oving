// ---------- MUSIKKTEORI FOR SKALATRENER (Bb-kornett) ----------
// Ren logikk, ingen DOM-/UI-avhengigheter, så den kan kjøres både under
// `node --test` (via require) og direkte i nettleseren (via <script>).
// All musikkfaglig data under er lagt inn ORDRETT fra oppgavespesifikasjonen
// (transponeringstabell, fingersettingstabell, fasit-skalalister) i stedet
// for å utledes — se enhetstestene i music-theory.test.js som verifiserer
// dem mot de samme fasitlistene.
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.MusicTheory = factory();
  }
})(typeof window !== "undefined" ? window : this, function () {
  "use strict";

  // ---------- TRANSPONERING (Bb-kornett klinger et heltrinn under skrevet) ----------
  // Skrevet toneart = klingende toneart + stor sekund opp. Tabellen er fasiten,
  // ikke beregnet generisk fra kvintsirkelen.
  var TRANSPOSITION_TABLE = {
    Bb: "C",
    Eb: "F",
    F: "G",
    C: "D",
    Ab: "Bb",
    Db: "Eb",
    G: "A",
    D: "E"
  };
  var SOUNDING_FOR_WRITTEN = {};
  Object.keys(TRANSPOSITION_TABLE).forEach(function (klingende) {
    SOUNDING_FOR_WRITTEN[TRANSPOSITION_TABLE[klingende]] = klingende;
  });

  function writtenKeyFor(klingendeToneart) {
    return TRANSPOSITION_TABLE[klingendeToneart] || null;
  }
  function soundingKeyFor(skrevetToneart) {
    return SOUNDING_FOR_WRITTEN[skrevetToneart] || null;
  }

  // ---------- FINGERSETTING (skrevet tonehøyde → ventiler, 0 = løs) ----------
  // Ventiler modellert som halvtoner: 2. ventil = 1, 1. ventil = 2, 3. ventil = 3.
  // "valves" er alltid skrevet med laveste/vanligste kombinasjon (12 fremfor 3),
  // alternativfingersetting (der oppgaven oppgir en) ligger i "altValves".
  var VALVE_SEMITONES = { 1: 2, 2: 1, 3: 3 };
  function valvesToSemitones(valves) {
    return valves.reduce(function (sum, v) {
      return sum + VALVE_SEMITONES[v];
    }, 0);
  }
  function parseValveString(s) {
    if (s === "0" || s === "") return [];
    return s.split("").map(function (c) {
      return parseInt(c, 10);
    });
  }
  function fingering(valveStr, altValveStr) {
    return {
      valves: parseValveString(valveStr),
      altValves: altValveStr ? parseValveString(altValveStr) : null
    };
  }

  var FINGERINGS = {
    // Oktav 3
    "F#3": fingering("123"),
    G3: fingering("13"),
    Ab3: fingering("23"),
    A3: fingering("12"),
    Bb3: fingering("1"),
    B3: fingering("2"),
    // Oktav 4
    C4: fingering("0"),
    "C#4": fingering("123"),
    D4: fingering("13"),
    Eb4: fingering("23"),
    E4: fingering("12"),
    F4: fingering("1"),
    "F#4": fingering("2"),
    G4: fingering("0"),
    Ab4: fingering("23"),
    A4: fingering("12"),
    Bb4: fingering("1"),
    B4: fingering("2"),
    // Oktav 5
    C5: fingering("0"),
    "C#5": fingering("12", "3"),
    D5: fingering("1", "13"),
    Eb5: fingering("2", "23"),
    E5: fingering("0"),
    F5: fingering("1"),
    "F#5": fingering("2"),
    G5: fingering("0"),
    Ab5: fingering("23"),
    A5: fingering("12"),
    Bb5: fingering("1"),
    B5: fingering("2"),
    // Oktav 6
    C6: fingering("0")
  };

  function fingeringFor(noteName) {
    return FINGERINGS[noteName] || null;
  }

  // ---------- SKALAGENERERING ----------
  // Skalaer bygges fra intervallmønstre (skrevet toneart), IKKE hardkodede
  // lister — men verifiseres note-for-note mot fasitlistene i oppgaven via
  // enhetstestene. Se generateScale() for algoritmen.
  var NATURAL_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  var LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
  var ACCIDENTAL_SYMBOL = { "-2": "bb", "-1": "b", 0: "", 1: "#", 2: "##" };

  // Hvert skalatrinn er {letterOffset, semitones}: letterOffset = hvor mange
  // bokstaver opp fra grunntonen (mod 7), semitones = kromatisk avstand fra
  // grunntonen. Blues har to trinn på samme bokstav-offset (b5 og ren 5).
  var SCALE_DEGREES = {
    major: {
      letterOffsets: [0, 1, 2, 3, 4, 5, 6],
      semitones: [0, 2, 4, 5, 7, 9, 11]
    },
    majorPentatonic: {
      letterOffsets: [0, 1, 2, 4, 5],
      semitones: [0, 2, 4, 7, 9]
    },
    minorPentatonic: {
      letterOffsets: [0, 2, 3, 4, 6],
      semitones: [0, 3, 5, 7, 10]
    },
    blues: {
      letterOffsets: [0, 2, 3, 4, 4, 6],
      semitones: [0, 3, 5, 6, 7, 10]
    }
  };

  function parseRootName(name) {
    var m = name.match(/^([A-G])(#{1,2}|b{1,2})?$/);
    if (!m) throw new Error("Ugyldig grunntone: " + name);
    var letter = m[1];
    var accSym = m[2] || "";
    var accVal = accSym === "#" ? 1 : accSym === "##" ? 2 : accSym === "b" ? -1 : accSym === "bb" ? -2 : 0;
    return { letter: letter, accVal: accVal, pc: ((NATURAL_PC[letter] + accVal) % 12 + 12) % 12 };
  }

  // Cb→B, Fb→E: appen skal aldri skrive Cb/Fb, heller ikke fra skalagenerering.
  function normalizeEnharmonic(noteName) {
    if (noteName === "Cb") return "B";
    if (noteName === "Fb") return "E";
    return noteName;
  }

  function generateScale(rootName, scaleType) {
    var degrees = SCALE_DEGREES[scaleType];
    if (!degrees) throw new Error("Ukjent skalatype: " + scaleType);
    var root = parseRootName(rootName);
    var rootLetterIndex = LETTERS.indexOf(root.letter);

    return degrees.letterOffsets.map(function (letterOffset, i) {
      var letter = LETTERS[(rootLetterIndex + letterOffset) % 7];
      var naturalPc = NATURAL_PC[letter];
      var targetPc = (root.pc + degrees.semitones[i]) % 12;
      var diff = ((targetPc - naturalPc) % 12 + 12) % 12;
      if (diff > 6) diff -= 12;
      var symbol = ACCIDENTAL_SYMBOL[diff];
      if (symbol === undefined) {
        throw new Error("Kan ikke stave " + letter + " mot måltone-pc " + targetPc);
      }
      return normalizeEnharmonic(letter + symbol);
    });
  }

  // ---------- REGISTER ----------
  // Øvelser/skalaer holder seg som standard innenfor dette (skrevet) registeret.
  // Fingersettingstabellen dekker et større register og brukes kun som oppslag.
  var REGISTER = { MIN: "G3", MAX: "G5" };

  return {
    TRANSPOSITION_TABLE: TRANSPOSITION_TABLE,
    writtenKeyFor: writtenKeyFor,
    soundingKeyFor: soundingKeyFor,
    VALVE_SEMITONES: VALVE_SEMITONES,
    valvesToSemitones: valvesToSemitones,
    FINGERINGS: FINGERINGS,
    fingeringFor: fingeringFor,
    SCALE_DEGREES: SCALE_DEGREES,
    generateScale: generateScale,
    normalizeEnharmonic: normalizeEnharmonic,
    REGISTER: REGISTER
  };
});
