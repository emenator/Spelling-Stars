const assert = require("node:assert/strict");
const { afterEach, beforeEach, describe, test } = require("node:test");
const core = require("../../app-core.js");

const words = ["cat", "dog", "sun", "moon", "tree", "fish", "book", "star", "to", "for"];
let originalRandom;

beforeEach(() => {
  core.resetIdsForTests();
  originalRandom = Math.random;
});

afterEach(() => {
  Math.random = originalRandom;
});

describe("unit: quiz generation engine", () => {
  test("parses flexible unique word lists", () => {
    assert.deepEqual(core.parseWords(" Cat \ndog,dog\nsun!\nextra"), ["cat", "dog", "sun", "extra"]);
    assert.equal(core.MIN_WORDS, 3);
  });

  test("preserves the original 10-word question mix with spell questions for all words", () => {
    const questions = core.buildQuestions(words);

    assert.equal(questions.length, 26);
    assert.equal(questions.filter((question) => question.kind === "fill").length, 6);
    assert.equal(questions.filter((question) => question.kind === "start").length, 5);
    assert.equal(questions.filter((question) => question.kind === "unscramble").length, 5);
    assert.equal(questions.filter((question) => question.kind === "image").length, 5);
    assert.equal(questions.filter((question) => question.kind === "spell").length, 5);
  });

  test("uses only visual words for image questions and any word for spell questions", () => {
    const entries = [
      { word: "cat", emoji: "🐱" },
      { word: "dog", emoji: "🐶" },
      { word: "because", emoji: "" },
      { word: "their", emoji: "" },
      { word: "friend", emoji: "" },
    ];
    const questions = core.buildQuestions(entries);
    const imageQuestions = questions.filter((question) => question.kind === "image");
    const spellQuestions = questions.filter((question) => question.kind === "spell");
    const nonVisualWords = new Set(["because", "their", "friend"]);

    assert.equal(questions.filter((question) => question.kind === "image").length, 1);
    assert.equal(spellQuestions.length, 2);
    assert.ok(imageQuestions.every((question) => question.emoji));
    assert.ok(imageQuestions.every((question) => !nonVisualWords.has(question.word)));
    assert.ok(spellQuestions.some((question) => nonVisualWords.has(question.word)));
  });

  test("misspell returns distinct plausible misspellings, never the real word", () => {
    Math.random = () => 0;
    const options = core.misspell("sun", 2);

    assert.equal(options.length, 2);
    assert.equal(new Set(options).size, 2);
    assert.ok(options.every((option) => option !== "sun"));
  });

  test("misspell still fills slots for very short words via the transposition fallback", () => {
    Math.random = () => 0;
    const options = core.misspell("to", 2);

    assert.equal(options.length, 2);
    assert.equal(new Set(options).size, 2);
    assert.ok(options.every((option) => option !== "to"));
  });

  test("misspell never surfaces an inappropriate word", () => {
    Math.random = () => 0;
    const options = core.misspell("as", 2);

    assert.ok(
      options.every((option) => core.INAPPROPRIATE_WORDS.every((bad) => !option.includes(bad))),
    );
  });

  test("uses the shared LDNOOBW profanity list for screening", () => {
    assert.ok(core.INAPPROPRIATE_WORDS.length > 100);
    assert.ok(["ass", "shit", "fuck"].every((bad) => core.INAPPROPRIATE_WORDS.includes(bad)));
  });

  test("spell questions show an emoji and ask the student to pick the real spelling", () => {
    Math.random = () => 0;
    const question = core.makeSpellQuestion({ word: "sun", emoji: "☀️" }, words, 0);

    assert.equal(question.kind, "spell");
    assert.equal(question.typeLabel, "How do you spell this word?");
    assert.equal(question.prompt, "");
    assert.equal(question.emoji, "☀️");
    assert.equal(question.answer, "sun");
    assert.equal(question.options.length, 3);
    assert.equal(new Set(question.options).size, 3);
    assert.ok(question.options.includes("sun"));
  });

  test("buildQuestions honors an exact custom mix, capped at eligible words", () => {
    const entries = words.map((word) => ({ word, emoji: core.getEmoji(word, 0) }));
    const mix = { fill: 3, start: 0, unscramble: 2, image: 0, spell: 4 };
    const questions = core.buildQuestions(entries, {}, mix);

    assert.equal(questions.filter((question) => question.kind === "fill").length, 3);
    assert.equal(questions.filter((question) => question.kind === "start").length, 0);
    assert.equal(questions.filter((question) => question.kind === "unscramble").length, 2);
    assert.equal(questions.filter((question) => question.kind === "image").length, 0);
    assert.equal(questions.filter((question) => question.kind === "spell").length, 4);
  });

  test("buildQuestions caps a custom mix at the number of eligible words", () => {
    const entries = [
      { word: "cat", emoji: "🐱" },
      { word: "dog", emoji: "🐶" },
      { word: "because", emoji: "" },
    ];
    const mix = { fill: 99, start: 0, unscramble: 0, image: 99, spell: 99 };
    const questions = core.buildQuestions(entries, {}, mix);

    assert.equal(questions.filter((question) => question.kind === "fill").length, 3);
    assert.equal(questions.filter((question) => question.kind === "image").length, 2);
    assert.equal(questions.filter((question) => question.kind === "spell").length, 3);
  });

  test("start-letter distractors never start with the prompt letter and prefer the list", () => {
    Math.random = () => 0;
    const entries = ["sun", "sit", "sock", "moon", "tree", "duck"].map((word) => ({
      word,
      emoji: "",
    }));
    const question = core.makeStartLetterQuestion(entries[0], entries, 0);
    const letter = question.answer[0];
    const distractors = question.options.filter((option) => option !== question.answer);

    assert.ok(distractors.every((option) => option[0] !== letter));
    assert.ok(distractors.every((option) => ["moon", "tree", "duck"].includes(option)));
  });

  test("unscramble distractors are never anagrams of the scrambled word", () => {
    Math.random = () => 0;
    const entries = ["stop", "spot", "tops", "moon", "tree", "duck"].map((word) => ({
      word,
      emoji: "",
    }));
    const question = core.makeUnscrambleQuestion(entries[0], entries, 0);
    const sorted = (value) => [...value].sort().join("");
    const distractors = question.options.filter((option) => option !== question.answer);

    assert.ok(distractors.every((option) => sorted(option) !== sorted(question.answer)));
  });

  test("creates tiered blanks by word length in missing-letter questions", () => {
    assert.equal(core.missingLetterCount("cat"), 1);
    assert.equal(core.missingLetterCount("plant"), 1);
    assert.equal(core.missingLetterCount("friend"), 2);
    assert.equal(core.missingLetterCount("classroom"), 3);

    const question = core.makeFillBlankQuestion("classroom", words, 0);

    assert.equal(question.kind, "fill");
    assert.equal([...question.prompt].filter((character) => character === "_").length, 3);
    assert.equal(question.answer, "classroom");
  });

  test("unscramble frames swap no more than two positions and end on the correct spelling", () => {
    const question = core.makeUnscrambleQuestion("spelling", words, 0);

    assert.equal(question.scrambleFrames.length, core.ANSWER_SECONDS + 1);
    assert.notEqual(question.scrambleFrames[0], "spelling");
    assert.equal(question.scrambleFrames.at(-1), "spelling");
    assert.notEqual(question.scrambleFrames[core.ANSWER_SECONDS - 3], "spelling");
    assert.equal(question.scrambleFrames[core.ANSWER_SECONDS - 2], "spelling");
    for (let index = 1; index < question.scrambleFrames.length; index += 1) {
      const changed = [...question.scrambleFrames[index]].filter(
        (letter, letterIndex) => letter !== question.scrambleFrames[index - 1][letterIndex],
      );
      assert.ok(changed.length <= 2);
    }
  });

  test("two-letter unscramble frames stay scrambled until two seconds before reveal", () => {
    const frames = core.buildUnscrambleFrames("to");

    assert.notEqual(frames[0], "to");
    assert.ok(frames.slice(0, core.ANSWER_SECONDS - 2).every((frame) => frame !== "to"));
    assert.equal(frames[core.ANSWER_SECONDS - 2], "to");
  });
});
