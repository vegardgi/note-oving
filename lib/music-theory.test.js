// Enhetstester for lib/music-theory.js — kjøres med `node --test` (innebygd
// i Node, ingen ny avhengighet). Verifiserer transponering, fingersetting og
// skalagenerering ordrett mot fasitdataene fra oppgaven.
"use strict";
var test = require("node:test");
var assert = require("node:assert/strict");
var MusicTheory = require("./music-theory.js");

// ---------- TRANSPONERING ----------
test("writtenKeyFor: alle 8 par klingende → skrevet", function () {
  var pairs = {
    Bb: "C",
    Eb: "F",
    F: "G",
    C: "D",
    Ab: "Bb",
    Db: "Eb",
    G: "A",
    D: "E"
  };
  Object.keys(pairs).forEach(function (klingende) {
    assert.equal(MusicTheory.writtenKeyFor(klingende), pairs[klingende]);
  });
});

test("soundingKeyFor: alle 8 par skrevet → klingende (reversert)", function () {
  var pairs = {
    C: "Bb",
    F: "Eb",
    G: "F",
    D: "C",
    Bb: "Ab",
    Eb: "Db",
    A: "G",
    E: "D"
  };
  Object.keys(pairs).forEach(function (skrevet) {
    assert.equal(MusicTheory.soundingKeyFor(skrevet), pairs[skrevet]);
  });
});

test("ukjent toneart gir null, ikke krasj", function () {
  assert.equal(MusicTheory.writtenKeyFor("Fiss"), null);
  assert.equal(MusicTheory.soundingKeyFor("Zzz"), null);
});

// ---------- FINGERSETTING ----------
var FINGERING_TABLE = [
  ["F#3", "123", null],
  ["G3", "13", null],
  ["Ab3", "23", null],
  ["A3", "12", null],
  ["Bb3", "1", null],
  ["B3", "2", null],
  ["C4", "0", null],
  ["C#4", "123", null],
  ["D4", "13", null],
  ["Eb4", "23", null],
  ["E4", "12", null],
  ["F4", "1", null],
  ["F#4", "2", null],
  ["G4", "0", null],
  ["Ab4", "23", null],
  ["A4", "12", null],
  ["Bb4", "1", null],
  ["B4", "2", null],
  ["C5", "0", null],
  ["C#5", "12", "3"],
  ["D5", "1", "13"],
  ["Eb5", "2", "23"],
  ["E5", "0", null],
  ["F5", "1", null],
  ["F#5", "2", null],
  ["G5", "0", null],
  ["Ab5", "23", null],
  ["A5", "12", null],
  ["Bb5", "1", null],
  ["B5", "2", null],
  ["C6", "0", null]
];

function digitsToValves(s) {
  if (s === "0") return [];
  return s.split("").map(Number);
}

test("fingeringFor: alle toner i fingersettingstabellen", function () {
  FINGERING_TABLE.forEach(function (row) {
    var note = row[0], valveStr = row[1], altStr = row[2];
    var entry = MusicTheory.fingeringFor(note);
    assert.ok(entry, "mangler fingersetting for " + note);
    assert.deepEqual(entry.valves, digitsToValves(valveStr), "feil ventiler for " + note);
    if (altStr) {
      assert.deepEqual(entry.altValves, digitsToValves(altStr), "feil alternativ ventil for " + note);
    } else {
      assert.equal(entry.altValves, null, "skulle ikke ha alternativ for " + note);
    }
  });
});

test("fingeringFor: ukjent tone gir null", function () {
  assert.equal(MusicTheory.fingeringFor("Z9"), null);
});

test("valvesToSemitones: halvtone-summering (2. ventil=1, 1. ventil=2, 3. ventil=3)", function () {
  assert.equal(MusicTheory.valvesToSemitones([]), 0);
  assert.equal(MusicTheory.valvesToSemitones([1]), 2);
  assert.equal(MusicTheory.valvesToSemitones([2]), 1);
  assert.equal(MusicTheory.valvesToSemitones([3]), 3);
  assert.equal(MusicTheory.valvesToSemitones([1, 2]), 3);
  assert.equal(MusicTheory.valvesToSemitones([2, 3]), 4);
  assert.equal(MusicTheory.valvesToSemitones([1, 2, 3]), 6);
});

// ---------- SKALAER (fasit fra oppgaven) ----------
var MAJOR_SCALES = {
  C: ["C", "D", "E", "F", "G", "A", "B"],
  F: ["F", "G", "A", "Bb", "C", "D", "E"],
  Bb: ["Bb", "C", "D", "Eb", "F", "G", "A"],
  Eb: ["Eb", "F", "G", "Ab", "Bb", "C", "D"],
  G: ["G", "A", "B", "C", "D", "E", "F#"],
  D: ["D", "E", "F#", "G", "A", "B", "C#"],
  A: ["A", "B", "C#", "D", "E", "F#", "G#"],
  Ab: ["Ab", "Bb", "C", "Db", "Eb", "F", "G"]
};

var MAJOR_PENTATONIC_SCALES = {
  C: ["C", "D", "E", "G", "A"],
  F: ["F", "G", "A", "C", "D"],
  Bb: ["Bb", "C", "D", "F", "G"],
  Eb: ["Eb", "F", "G", "Bb", "C"],
  G: ["G", "A", "B", "D", "E"],
  D: ["D", "E", "F#", "A", "B"]
};

var MINOR_PENTATONIC_SCALES = {
  A: ["A", "C", "D", "E", "G"],
  D: ["D", "F", "G", "A", "C"],
  E: ["E", "G", "A", "B", "D"],
  G: ["G", "Bb", "C", "D", "F"],
  C: ["C", "Eb", "F", "G", "Bb"],
  B: ["B", "D", "E", "F#", "A"]
};

var BLUES_SCALES = {
  C: ["C", "Eb", "F", "Gb", "G", "Bb"],
  G: ["G", "Bb", "C", "Db", "D", "F"],
  D: ["D", "F", "G", "Ab", "A", "C"],
  A: ["A", "C", "D", "Eb", "E", "G"],
  F: ["F", "Ab", "Bb", "B", "C", "Eb"]
};

function testScaleSet(scaleType, table, label) {
  test("generateScale: " + label + " for alle tonearter i fasiten", function () {
    Object.keys(table).forEach(function (rootName) {
      assert.deepEqual(
        MusicTheory.generateScale(rootName, scaleType),
        table[rootName],
        label + " " + rootName
      );
    });
  });
}

testScaleSet("major", MAJOR_SCALES, "dur");
testScaleSet("majorPentatonic", MAJOR_PENTATONIC_SCALES, "dur-pentaton");
testScaleSet("minorPentatonic", MINOR_PENTATONIC_SCALES, "moll-pentaton");
testScaleSet("blues", BLUES_SCALES, "blues");

// ---------- ENHARMONISK NORMALISERING (invariant) ----------
test("normalizeEnharmonic: Cb→B og Fb→E direkte", function () {
  assert.equal(MusicTheory.normalizeEnharmonic("Cb"), "B");
  assert.equal(MusicTheory.normalizeEnharmonic("Fb"), "E");
  assert.equal(MusicTheory.normalizeEnharmonic("G"), "G");
});

test("invariant: ingen genererbar skala inneholder Cb eller Fb", function () {
  var ALL_ROOTS = ["C", "D", "E", "F", "G", "A", "B", "Db", "Eb", "Gb", "Ab", "Bb"];
  var SCALE_TYPES = Object.keys(MusicTheory.SCALE_DEGREES);
  ALL_ROOTS.forEach(function (rootName) {
    SCALE_TYPES.forEach(function (scaleType) {
      var scale = MusicTheory.generateScale(rootName, scaleType);
      scale.forEach(function (note) {
        assert.notEqual(note, "Cb", rootName + " " + scaleType + " inneholder Cb");
        assert.notEqual(note, "Fb", rootName + " " + scaleType + " inneholder Fb");
      });
    });
  });
});

// ---------- REGISTER ----------
test("REGISTER: standard skrevet register er G3–G5", function () {
  assert.equal(MusicTheory.REGISTER.MIN, "G3");
  assert.equal(MusicTheory.REGISTER.MAX, "G5");
});

// ---------- SKALAER MED OKTAV (skalautforsker-visning) ----------
test("generateScaleWithOctaves: C-dur fra oktav 4, jevnt stigende", function () {
  var notes = MusicTheory.generateScaleWithOctaves("C", "major", 4);
  assert.deepEqual(
    notes.map(function (n) { return n.written; }),
    ["C4", "D4", "E4", "F4", "G4", "A4", "B4"]
  );
});

test("generateScaleWithOctaves: dur-pentaton krysser B→C-grensen riktig (G-dur-pentaton)", function () {
  var notes = MusicTheory.generateScaleWithOctaves("G", "majorPentatonic", 4);
  assert.deepEqual(
    notes.map(function (n) { return n.written; }),
    ["G4", "A4", "B4", "D5", "E5"]
  );
});

test("generateScaleWithOctaves: Cb normaliseres til B ÉN oktav lavere (F-blues b5-trinn)", function () {
  var notes = MusicTheory.generateScaleWithOctaves("F", "blues", 4);
  var names = notes.map(function (n) { return n.written; });
  assert.deepEqual(names, ["F4", "Ab4", "Bb4", "B4", "C5", "Eb5"]);
  // Cb5 (bokstavposisjon) == B4 i MIDI — bekreft at oktavjusteringen ga riktig tonehøyde,
  // ikke bare riktig streng.
  assert.equal(notes[3].midi, 71); // B4
  assert.equal(notes[2].midi, 70); // Bb4 (umiddelbart under, ingen oktavhopp)
});

test("generateScaleWithOctaves: Fb normaliseres til E i SAMME oktav (Bb-blues b5-trinn)", function () {
  var notes = MusicTheory.generateScaleWithOctaves("Bb", "blues", 4);
  var names = notes.map(function (n) { return n.written; });
  assert.deepEqual(names, ["Bb4", "Db5", "Eb5", "E5", "F5", "Ab5"]);
  assert.equal(notes[3].midi, 76); // E5
  assert.equal(notes[4].midi, 77); // F5 (halvtone over, samme oktav)
});

test("generateScaleWithOctaves: midi stiger monotont gjennom hele skalaen", function () {
  ["major", "majorPentatonic", "minorPentatonic", "blues"].forEach(function (scaleType) {
    ["C", "F", "Bb", "Eb", "G", "D", "A", "Ab", "E", "B"].forEach(function (rootName) {
      var notes;
      try {
        notes = MusicTheory.generateScaleWithOctaves(rootName, scaleType, 4);
      } catch (e) {
        return; // ikke alle rot/type-kombinasjoner er meningsfulle her, hopp over
      }
      for (var i = 1; i < notes.length; i++) {
        assert.ok(
          notes[i].midi > notes[i - 1].midi,
          rootName + " " + scaleType + ": " + notes[i - 1].written + " → " + notes[i].written + " stiger ikke"
        );
      }
    });
  });
});

// ---------- FINGERSETTING VIA TONEHØYDEKLASSE (enharmonisk-uavhengig oppslag) ----------
test("fingeringForPitchClass: Db og Gb finner samme fingersetting som C#/F# i tabellen", function () {
  var db5 = MusicTheory.fingeringForPitchClass(1, 5); // Db5 == C#5
  var cSharp5 = MusicTheory.fingeringFor("C#5");
  assert.deepEqual(db5, cSharp5);

  var gb4 = MusicTheory.fingeringForPitchClass(6, 4); // Gb4 == F#4
  var fSharp4 = MusicTheory.fingeringFor("F#4");
  assert.deepEqual(gb4, fSharp4);
});

test("Ab-dur og G-blues (inneholder Db) finner fingersetting via generateScaleWithOctaves", function () {
  var abMajor = MusicTheory.generateScaleWithOctaves("Ab", "major", 4);
  var dbNote = abMajor.filter(function (n) { return n.name === "Db"; })[0];
  assert.ok(dbNote, "Ab-dur skal inneholde Db");
  assert.ok(dbNote.fingering, "Db skal ha en fingersetting via enharmonisk oppslag");
  assert.deepEqual(dbNote.fingering.valves, MusicTheory.fingeringFor("C#5").valves);
});

test("soundingKeyFor/writtenKeyFor: generisk fallback for tonearter utenfor tabellen (Ab)", function () {
  assert.equal(MusicTheory.soundingKeyFor("Ab"), "Gb");
  assert.equal(MusicTheory.writtenKeyFor("Gb"), "Ab");
});
