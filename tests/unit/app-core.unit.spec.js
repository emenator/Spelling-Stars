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
    for (let index = 1; index < question.scrambleFrames.length; index += 1) {
      const changed = [...question.scrambleFrames[index]].filter(
        (letter, letterIndex) => letter !== question.scrambleFrames[index - 1][letterIndex],
      );
      assert.ok(changed.length <= 2);
    }
  });
});
