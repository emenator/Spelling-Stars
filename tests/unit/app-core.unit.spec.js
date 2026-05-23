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

  test("preserves the original 10-word question mix", () => {
    const questions = core.buildQuestions(words);

    assert.equal(questions.length, 25);
    assert.equal(questions.filter((question) => question.kind === "fill").length, 5);
    assert.equal(questions.filter((question) => question.kind === "start").length, 5);
    assert.equal(questions.filter((question) => question.kind === "unscramble").length, 5);
    assert.equal(questions.filter((question) => question.kind === "image").length, 10);
  });

  test("uses only visual words for image questions", () => {
    const entries = [
      { word: "cat", emoji: "🐱" },
      { word: "dog", emoji: "🐶" },
      { word: "because", emoji: "" },
      { word: "their", emoji: "" },
      { word: "friend", emoji: "" },
    ];
    const questions = core.buildQuestions(entries);
    const imageQuestions = questions.filter((question) => question.kind === "image");
    const nonVisualWords = new Set(["because", "their", "friend"]);

    assert.equal(imageQuestions.length, 2);
    assert.ok(imageQuestions.every((question) => question.emoji));
    assert.ok(
      questions.some((question) => nonVisualWords.has(question.word) && question.kind !== "image"),
    );
  });

  test("creates one blank in missing-letter questions", () => {
    const question = core.makeFillBlankQuestion("spelling", words, 0);

    assert.equal(question.kind, "fill");
    assert.equal([...question.prompt].filter((character) => character === "_").length, 1);
    assert.equal(question.answer, "spelling");
  });

  test("unscramble frames end on the correct spelling", () => {
    const question = core.makeUnscrambleQuestion("spelling", words, 0);

    assert.equal(question.scrambleFrames.length, core.ANSWER_SECONDS + 1);
    assert.notEqual(question.scrambleFrames[0], "spelling");
    assert.equal(question.scrambleFrames.at(-1), "spelling");
  });
});
