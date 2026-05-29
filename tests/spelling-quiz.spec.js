const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { describe, test, beforeEach, afterEach } = require("node:test");

const core = require("../app-core.js");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");

const words = [
  "cat",
  "dog",
  "sun",
  "moon",
  "tree",
  "fish",
  "book",
  "star",
  "to",
  "for",
];

let originalRandom;

beforeEach(() => {
  core.resetIdsForTests();
  originalRandom = Math.random;
});

afterEach(() => {
  Math.random = originalRandom;
});

describe("spelling quiz generation clarifications", () => {
  test("accepts flexible unique spelling word lists from user input", () => {
    const parsed = core.parseWords(" Cat \ndog,dog\nsun!\nmoon\ntree\nfish\nbook\nstar\nto\nfor\nextra");

    assert.deepEqual(parsed, [...words, "extra"]);
    assert.equal(core.MIN_WORDS, 3);
  });

  test("generates 26 questions from the original 10-word example", () => {
    const questions = core.buildQuestions(words);

    assert.equal(questions.length, 26);
    assert.equal(questions.filter((question) => question.kind === "fill").length, 6);
    assert.equal(questions.filter((question) => question.kind === "start").length, 5);
    assert.equal(questions.filter((question) => question.kind === "unscramble").length, 5);
    assert.equal(questions.filter((question) => question.kind === "image").length, 5);
    assert.equal(questions.filter((question) => question.kind === "spell").length, 5);
  });

  test("scales the question mix for smaller and larger lists", () => {
    assert.deepEqual(core.getQuestionPlan(3), {
      fill: 2,
      start: 2,
      unscramble: 2,
      image: 2,
      spell: 1,
      total: 9,
    });
    assert.deepEqual(core.getQuestionPlan(12), {
      fill: 6,
      start: 6,
      unscramble: 6,
      image: 6,
      spell: 6,
      total: 30,
    });
  });

  test("prioritizes image questions for visual words and spell questions for all words", () => {
    assert.deepEqual(core.getQuestionPlan(5, 2), {
      fill: 4,
      start: 4,
      unscramble: 4,
      image: 1,
      spell: 2,
      total: 15,
    });

    const entries = [
      { word: "cat", emoji: "🐱" },
      { word: "dog", emoji: "🐶" },
      { word: "because", emoji: "" },
      { word: "their", emoji: "" },
      { word: "friend", emoji: "" },
    ];
    const questions = core.buildQuestions(entries);
    const nonVisualWords = new Set(["because", "their", "friend"]);
    const spellQuestions = questions.filter((question) => question.kind === "spell");

    assert.equal(questions.filter((question) => question.kind === "image").length, 1);
    assert.equal(spellQuestions.length, 2);
    assert.ok(spellQuestions.some((question) => nonVisualWords.has(question.word)));
    assert.ok(
      questions.some((question) => nonVisualWords.has(question.word) && question.kind !== "image"),
    );
  });

  test("every generated question has exactly 3 unique answer options including the answer", () => {
    const questions = core.buildQuestions(words);

    for (const question of questions) {
      assert.equal(question.options.length, 3);
      assert.equal(new Set(question.options).size, 3);
      assert.ok(question.options.includes(question.answer));
    }
  });

  test("missing-letter questions blank more letters as words get longer", () => {
    assert.equal(core.missingLetterCount("cat"), 1);
    assert.equal(core.missingLetterCount("plant"), 1);
    assert.equal(core.missingLetterCount("friend"), 2);
    assert.equal(core.missingLetterCount("classroom"), 3);

    const question = core.makeFillBlankQuestion("classroom", words, 0);
    const blankCount = [...question.prompt].filter((character) => character === "_").length;

    assert.equal(question.kind, "fill");
    assert.equal(question.typeLabel, "What word matches?");
    assert.equal(blankCount, 3);
    assert.equal(question.answer, "classroom");
    assert.ok(question.options.includes("classroom"));
  });

  test("missing-letter options do not include multiple words that fit the same blank", () => {
    Math.random = () => 0;
    const entries = ["cap", "map", "lap", "tap", "dog"].map((word) => ({ word, emoji: "" }));
    const question = core.makeFillBlankQuestion(entries[0], entries, 0);
    const matchingOptions = question.options.filter((option) =>
      core.matchesFillPrompt(option, question.prompt),
    );

    assert.deepEqual(matchingOptions, [question.answer]);
  });

  test("missing-letter questions can scramble which letter positions are missing", () => {
    Math.random = () => 0;
    const firstPrompt = core.makeFillBlankQuestion("classroom", words, 0).prompt;

    Math.random = () => 0.99;
    const secondPrompt = core.makeFillBlankQuestion("classroom", words, 0).prompt;

    assert.equal([...firstPrompt].filter((character) => character === "_").length, 3);
    assert.equal([...secondPrompt].filter((character) => character === "_").length, 3);
    assert.notEqual(firstPrompt, secondPrompt);
  });

  test("start-letter questions ask for a starting letter and the answer starts with it", () => {
    const question = core.makeStartLetterQuestion("tree", words, 0);

    assert.equal(question.kind, "start");
    assert.equal(question.typeLabel, "Which word starts with t?");
    assert.equal(question.prompt, "T");
    assert.equal(question.answer[0], "t");
  });

  test("image questions show an emoji without a question-mark prompt or answer text", () => {
    const question = core.makeImageQuestion("cat", words, 0);

    assert.equal(question.kind, "image");
    assert.equal(question.typeLabel, "What word is this?");
    assert.equal(question.prompt, "");
    assert.equal(question.emoji, "🐱");
    assert.equal(question.word, "cat");
    assert.ok(question.options.includes("cat"));
  });

  test("unscramble questions start scrambled and resolve over the 10 second answer window", () => {
    const question = core.makeUnscrambleQuestion("spelling", words, 0);

    assert.equal(question.kind, "unscramble");
    assert.equal(question.typeLabel, "What word is unscrambling?");
    assert.equal(question.scrambleFrames.length, core.ANSWER_SECONDS + 1);
    assert.notEqual(question.scrambleFrames[0], "spelling");
    assert.equal(question.scrambleFrames.at(-1), "spelling");
    assert.equal(question.prompt, question.scrambleFrames[0]);
    assert.ok(question.options.includes("spelling"));
    assert.notEqual(question.scrambleFrames[core.ANSWER_SECONDS - 3], "spelling");
    assert.equal(question.scrambleFrames[core.ANSWER_SECONDS - 2], "spelling");
    for (let index = 1; index < question.scrambleFrames.length; index += 1) {
      const changed = [...question.scrambleFrames[index]].filter(
        (letter, letterIndex) => letter !== question.scrambleFrames[index - 1][letterIndex],
      );
      assert.ok(changed.length <= 2);
    }
  });

  test("two-letter unscramble questions do not reveal until the final two seconds", () => {
    const frames = core.buildUnscrambleFrames("to");

    assert.equal(frames.length, core.ANSWER_SECONDS + 1);
    assert.notEqual(frames[0], "to");
    assert.ok(frames.slice(0, core.ANSWER_SECONDS - 2).every((frame) => frame !== "to"));
    assert.equal(frames[core.ANSWER_SECONDS - 2], "to");
  });

  test("word match distractors prefer similar words over unrelated options", () => {
    const similar = core.similarWords("cap", ["dog", "map", "tap", "sun", "cat"], 2);

    assert.ok(similar.every((word) => ["lap", "map", "tap", "cat"].includes(word)));
    assert.ok(!similar.includes("dog"));
    assert.ok(!similar.includes("sun"));
  });

  test("unscramble questions prefer words with at least 3 letters", () => {
    const questions = core.buildQuestions(words);
    const unscrambleWords = questions
      .filter((question) => question.kind === "unscramble")
      .map((question) => question.word);

    assert.equal(unscrambleWords.length, 5);
    assert.ok(unscrambleWords.every((word) => word.length > 2));
  });

  test("unknown words do not receive random fallback emojis", () => {
    assert.equal(core.getEmoji("madeupword", 0), "");
  });

  test("question generation can use reviewed visual clues instead of guessed emojis", () => {
    const entries = core.normalizeQuestionEntries(words, {
      cat: "A",
      dog: "B",
      sun: "C",
      moon: "D",
      tree: "E",
      fish: "F",
      book: "G",
      star: "H",
      to: "I",
      for: "J",
    });
    const questions = core.buildQuestions(entries);

    assert.equal(entries.find((entry) => entry.word === "cat").emoji, "A");
    assert.equal(questions.filter((question) => question.kind === "image").length, 5);
    assert.equal(questions.filter((question) => question.kind === "spell").length, 5);
    assert.ok(questions.every((question) => question.emoji));
  });

  test("known sample words still receive editable suggested visual clues", () => {
    const entries = core.normalizeQuestionEntries(words);

    assert.equal(entries.length, 10);
    assert.equal(entries.filter((entry) => entry.emoji).length, 9);
    assert.equal(entries.find((entry) => entry.word === "for").emoji, "");
  });

  test("timing is 10 seconds to answer and 5 seconds to show the answer", () => {
    assert.equal(core.ANSWER_SECONDS, 10);
    assert.equal(core.REVEAL_SECONDS, 5);
  });
});

describe("spelling quiz UI clarifications", () => {
  test("loads the shared core before the browser app script", () => {
    assert.match(html, /<script src="app-data\.js"><\/script>\s*<script src="app-core\.js"><\/script>\s*<script src="app\.js"><\/script>/);
  });

  test("describes the generated game as flexible for any word list", () => {
    assert.match(html, /Build a spelling game from your word list/);
  });

  test("offers auto and classroom modes with classroom as the default", () => {
    assert.match(html, /id="autoModeButton"[\s\S]*Auto/);
    assert.match(html, /id="classroomModeButton"[\s\S]*Classroom/);
    assert.match(app, /let gameMode = "classroom";/);
    assert.match(app, /function setMode\(mode\)/);
  });

  test("lets teachers review or clear visual clues before generating questions", () => {
    assert.match(html, /id="visualList"/);
    assert.match(html, /id="suggestVisualsButton"/);
    assert.match(html, /id="clearVisualsButton"/);
    assert.match(app, /function suggestVisualHints\(\)/);
    assert.match(app, /function renderVisualHints\(\)/);
    assert.match(app, /getEmoji\(word, index\)/);
    assert.match(app, /generateButton\.disabled = count < MIN_WORDS;/);
  });

  test("lets teachers load built-in 10-word classroom clusters", () => {
    assert.match(html, /id="librarySelect"/);
    assert.match(html, /id="loadLibraryButton"/);
    assert.match(app, /function renderLibraryLists\(\)/);
    assert.match(app, /function loadLibraryCluster\(\)/);
  });

  test("lets teachers delete a word from the visual clue review list", () => {
    assert.match(app, /function removeWord\(wordToRemove\)/);
    assert.match(app, /class="remove-word-button"/);
    assert.match(app, /aria-label="Delete \$\{word\}"/);
    assert.match(css, /\.remove-word-button\s*{/);
  });

  test("provides local save, load, and delete controls for word lists", () => {
    assert.match(html, /id="saveNameInput"/);
    assert.match(html, /id="saveListButton"/);
    assert.match(html, /id="savedListSelect"/);
    assert.match(html, /id="loadListButton"/);
    assert.match(html, /id="deleteListButton"/);
    assert.match(app, /const SAVE_KEY = "spellingQuizSavedLists";/);
    assert.match(app, /localStorage\.setItem\(SAVE_KEY/);
    assert.match(app, /localStorage\.getItem\(SAVE_KEY\)/);
  });

  test("saved lists include both words and reviewed visual clues", () => {
    assert.match(app, /words,/);
    assert.match(app, /visualHints: Object\.fromEntries\(words\.map/);
    assert.match(app, /wordInput\.value = saved\.words\.join\("\\n"\);/);
    assert.match(app, /visualHints = saved\.visualHints \|\| {};/);
  });

  test("lets the user remove generated questions that do not work", () => {
    assert.match(app, /className = "question-card"/);
    assert.match(app, /class="remove-button"/);
    assert.match(app, /questions = questions\.filter/);
  });

  test("has classroom reveal and next buttons plus a top-right next button", () => {
    assert.match(html, /id="cornerNextButton"[\s\S]*aria-label="Next question"/);
    assert.match(html, /id="revealButton"[\s\S]*Reveal answer/);
    assert.match(html, /id="nextButton"[\s\S]*Next question/);
    assert.match(app, /cornerNextButton\.addEventListener\("click", goNext\)/);
    assert.match(app, /revealButton\.addEventListener\("click", \(\) => revealAnswer\(null\)\)/);
    assert.match(app, /nextButton\.addEventListener\("click", goNext\)/);
  });

  test("classroom mode is teacher-paced instead of auto-revealing on timeout", () => {
    assert.match(app, /if \(gameMode === "auto"\) {[\s\S]*revealAnswer\(null\);[\s\S]*} else {[\s\S]*clearTimers\(\);/);
    assert.match(app, /if \(gameMode === "classroom"\) {[\s\S]*revealButton\.disabled = true;[\s\S]*nextButton\.disabled = false;/);
  });

  test("places the corner next button in the right side of the game topbar", () => {
    assert.match(html, /id="timer"[\s\S]*id="cornerNextButton"/);
    assert.match(css, /\.game-topbar\s*{[\s\S]*grid-template-columns:\s*64px 64px 64px minmax\(0, 1fr\) 82px 64px 64px;/);
  });

  test("has home, previous-question, and question drawer navigation", () => {
    assert.match(html, /id="homeButton"[\s\S]*aria-label="Home"/);
    assert.match(html, /id="previousQuestionButton"[\s\S]*aria-label="Previous question"/);
    assert.match(html, /id="questionMenuButton"[\s\S]*aria-label="Open question list"/);
    assert.match(html, /id="questionDrawer"/);
    assert.match(app, /function goPrevious\(\)/);
    assert.match(app, /function renderQuestionDrawer\(\)/);
  });

  test("autosaves setup edits locally as a draft", () => {
    assert.match(app, /const DRAFT_KEY = "spellingQuizDraft";/);
    assert.match(app, /function saveDraft\(\)/);
    assert.match(app, /function loadDraft\(\)/);
    assert.match(app, /localStorage\.setItem\(\s*DRAFT_KEY/);
  });

  test("autosaves edits back into loaded local datasets", () => {
    assert.match(app, /const LIBRARY_OVERRIDE_KEY = "spellingQuizLibraryOverrides";/);
    assert.match(app, /function persistLoadedDatasetEdits\(\)/);
    assert.match(app, /setLibraryOverrides\(overrides\)/);
    assert.match(app, /const override = getLibraryOverrides\(\)\[cluster\.id\];/);
    assert.match(app, /setSaveStatus\(`Autosaved "\$\{name\}"\.`\)/);
    assert.match(app, /function saveLocalState\(\)/);
  });

  test("lets teachers add custom questions beside the generated question set", () => {
    assert.match(html, /id="customQuestionForm"/);
    assert.match(html, /id="customQuestionInput"/);
    assert.match(html, /id="customAnswerInput"/);
    assert.match(app, /function addCustomQuestion\(event\)/);
    assert.match(app, /customQuestionForm\.addEventListener\("submit", addCustomQuestion\)/);
  });

  test("lets teachers change the answer countdown length", () => {
    assert.match(html, /id="answerSecondsInput"/);
    assert.match(app, /let answerSeconds = ANSWER_SECONDS;/);
    assert.match(app, /timer\.textContent = answerSeconds;/);
    assert.match(app, /answerSecondsInput\.addEventListener\("input"/);
  });

  test("lets teachers tune how many of each question type to generate", () => {
    assert.match(html, /id="questionMixPanel"/);
    assert.match(html, /id="mixFillInput"/);
    assert.match(html, /id="mixStartInput"/);
    assert.match(html, /id="mixUnscrambleInput"/);
    assert.match(html, /id="mixImageInput"/);
    assert.match(html, /id="mixSpellInput"/);
    assert.match(html, /id="resetMixButton"/);
    assert.match(css, /\.question-mix-panel\s*{/);
  });

  test("remembers the teacher's question mix and feeds it into generation", () => {
    assert.match(app, /const QUESTION_MIX_KEY = "spellingQuizQuestionMix";/);
    assert.match(app, /function refreshMixPanel\(\)/);
    assert.match(app, /function resetMix\(\)/);
    assert.match(app, /localStorage\.setItem\(QUESTION_MIX_KEY/);
    assert.match(app, /buildQuestions\(entries, \{\}, customMix\)/);
    assert.match(app, /resetMixButton\.addEventListener\("click", resetMix\)/);
  });

  test("tracks per-question results for sidebar marks and non-duplicated scoring", () => {
    assert.match(app, /activeQuestions = questions\.map\(\(question\) => \(\{ \.\.\.question, selectedAnswer: null, result: null \}\)\);/);
    assert.match(app, /function deriveScore\(\)/);
    assert.match(app, /question\.result = isCorrect \? "correct" : "incorrect";/);
    assert.match(app, /class="drawer-status \$\{question\.result \|\| ""\}"/);
  });

  test("keeps questions available when returning from the score page", () => {
    assert.match(app, /function showResults\(\) {[\s\S]*previousQuestionButton\.disabled = activeQuestions\.length === 0;[\s\S]*renderQuestionDrawer\(\);/);
    assert.match(app, /function renderCurrentQuestion\(\) {[\s\S]*quizStage\.classList\.remove\("hidden"\);[\s\S]*results\.classList\.add\("hidden"\);/);
  });

  test("celebrates correct answers with confetti", () => {
    assert.match(html, /id="confettiLayer"/);
    assert.match(css, /\.confetti-piece\s*{/);
    assert.match(app, /function launchConfetti\(\)/);
    assert.match(app, /if \(isCorrect\) launchConfetti\(\);/);
  });

  test("locks the game view to the screen without page scrolling", () => {
    assert.match(css, /body\.game-active\s*{[\s\S]*overflow:\s*hidden;/);
    assert.match(css, /body\.game-active \.game-view\s*{[\s\S]*height:\s*calc\(100dvh - 28px\);/);
  });

  test("has an in-game visual clue toggle that keeps image-only questions visible", () => {
    assert.match(html, /id="visualToggleButton"[\s\S]*aria-label="Hide visual clues"/);
    assert.match(app, /let showVisualClues = true;/);
    assert.match(app, /function shouldShowVisual\(question\) {[\s\S]*question\.kind === "image" \|\| question\.kind === "spell" \|\| showVisualClues;/);
    assert.match(app, /visualToggleButton\.addEventListener\("click", toggleVisualClues\)/);
  });

  test("uses a large dyslexia-friendly font centered on the game screen", () => {
    assert.match(html, /Atkinson\+Hyperlegible/);
    assert.match(css, /font-family:\s*"Atkinson Hyperlegible"/);
    assert.match(css, /\.quiz-stage\s*{[\s\S]*align-content:\s*safe center;[\s\S]*justify-items:\s*center;[\s\S]*text-align:\s*center;/);
    assert.match(css, /\.question-prompt\s*{[\s\S]*font-size:\s*clamp\(2\.8rem, 11vh, 7rem\);/);
  });

  test("keeps emoji prompts visible in compact classroom layouts", () => {
    assert.match(css, /@media \(max-height: 720px\)/);
    assert.match(css, /@media \(max-height: 720px\)[\s\S]*\.prompt-emoji\s*{[\s\S]*font-size:\s*clamp\(3\.4rem, 12vw, 6\.5rem\);/);
    assert.match(css, /@media \(max-height: 720px\)[\s\S]*\.classroom-controls \.primary-button\s*{[\s\S]*min-height:\s*54px;/);
  });

  test("hides the prompt line when an image question has no text prompt", () => {
    assert.match(app, /questionPrompt\.textContent = question\.prompt;/);
    assert.match(app, /questionPrompt\.classList\.toggle\("hidden", !question\.prompt\)/);
  });

  test("updates unscramble prompts during the answer countdown", () => {
    assert.match(app, /function updateUnscramblePrompt\(question, secondsLeft\)/);
    assert.match(app, /question\.kind !== "unscramble"/);
    assert.match(app, /question\.scrambleFrames/);
    assert.match(app, /updateUnscramblePrompt\(question, secondsLeft\)/);
  });
});
