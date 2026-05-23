(function attachCore(root) {
  const MIN_WORDS = 3;
  const BASE_WORD_COUNT = 10;
  const FILL_BLANK_COUNT = 5;
  const START_LETTER_COUNT = 5;
  const UNSCRAMBLE_COUNT = 5;
  const IMAGE_COUNT = 10;
  const ANSWER_SECONDS = 10;
  const REVEAL_SECONDS = 5;

  const sampleWords = [
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

  const emojiMap = {
    apple: "🍎",
    baby: "👶",
    ball: "⚽",
    banana: "🍌",
    bed: "🛏️",
    bee: "🐝",
    bird: "🐦",
    book: "📚",
    bus: "🚌",
    cake: "🍰",
    car: "🚗",
    cat: "🐱",
    clock: "🕒",
    cloud: "☁️",
    corn: "🌽",
    dog: "🐶",
    door: "🚪",
    duck: "🦆",
    egg: "🥚",
    fish: "🐟",
    flower: "🌸",
    for: "4️⃣",
    frog: "🐸",
    gift: "🎁",
    goat: "🐐",
    hat: "🎩",
    heart: "❤️",
    house: "🏠",
    key: "🔑",
    leaf: "🍃",
    lion: "🦁",
    moon: "🌙",
    nose: "👃",
    pen: "✏️",
    pig: "🐷",
    pizza: "🍕",
    rain: "🌧️",
    ring: "💍",
    rocket: "🚀",
    shoe: "👟",
    star: "⭐",
    sun: "☀️",
    table: "🪑",
    tiger: "🐯",
    to: "➡️",
    train: "🚆",
    tree: "🌳",
    water: "💧",
  };

  const commonWords = [
    "and",
    "for",
    "the",
    "you",
    "too",
    "see",
    "can",
    "run",
    "big",
    "red",
    "hop",
    "sit",
    "map",
    "jam",
    "box",
    "cup",
    "hat",
    "pen",
    "log",
    "bed",
  ];

  let idCounter = 0;

  function normalizeWord(word) {
    return word.trim().toLowerCase().replace(/[^a-z'-]/g, "");
  }

  function parseWords(input) {
    const seen = new Set();
    return input
      .split(/\n|,/)
      .map(normalizeWord)
      .filter((word) => /[a-z]/.test(word))
      .filter((word) => {
        if (seen.has(word)) return false;
        seen.add(word);
        return true;
      });
  }

  function shuffle(items) {
    return [...items].sort(() => Math.random() - 0.5);
  }

  function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function chooseDistractors(correct, pool, count, isAllowed = () => true) {
    const options = shuffle(pool.filter((item) => item !== correct && isAllowed(item)));
    const fallbacks = shuffle(commonWords.filter((item) => item !== correct && isAllowed(item)));
    return [...options, ...fallbacks].filter(unique).slice(0, count);
  }

  function createId() {
    idCounter += 1;
    return `question-${idCounter}`;
  }

  function unique(item, index, array) {
    return array.indexOf(item) === index;
  }

  function readableOptions(options) {
    return options.join(", ");
  }

  function getEmoji(word, index) {
    return emojiMap[word] || root.SpellingQuizData?.visualHints?.[word] || "";
  }

  function normalizeQuestionEntries(items, visualHints = {}) {
    return items.map((item, index) => {
      const word = typeof item === "string" ? item : item.word;
      const explicitEmoji = typeof item === "string" ? visualHints[word] : item.emoji;
      return {
        word,
        emoji: explicitEmoji ?? getEmoji(word, index),
      };
    });
  }

  function getWord(item) {
    return typeof item === "string" ? item : item.word;
  }

  function getVisual(item, index) {
    if (typeof item === "string") return getEmoji(item, index);
    return item.emoji || "";
  }

  function matchesFillPrompt(word, prompt) {
    if (word.length !== prompt.length) return false;
    return [...prompt].every((letter, index) => letter === "_" || letter === word[index]);
  }

  function makeFillBlankQuestion(entry, entries, index) {
    const word = getWord(entry);
    const words = entries.map(getWord);
    const chars = [...word];
    const letterIndexes = chars
      .map((letter, letterIndex) => (/[a-z]/.test(letter) ? letterIndex : null))
      .filter((letterIndex) => letterIndex !== null);
    const missingIndex = randomItem(letterIndexes);
    chars[missingIndex] = "_";
    const prompt = chars.join("");
    const distractors = chooseDistractors(
      word,
      words,
      2,
      (candidate) => !matchesFillPrompt(candidate, prompt),
    );

    return {
      id: createId(),
      kind: "fill",
      word,
      emoji: getVisual(entry, index),
      typeLabel: "What word matches?",
      prompt,
      options: shuffle([word, ...distractors]),
      answer: word,
    };
  }

  function makeStartLetterQuestion(entry, entries, index) {
    const word = getWord(entry);
    const words = entries.map(getWord);
    const letter = word[0];
    const sameLetter = words.filter((item) => item[0] === letter && item !== word);
    const correct = sameLetter[0] || word;
    const distractors = chooseDistractors(correct, words.filter((item) => item[0] !== letter), 2);

    const correctEntry = entries.find((item) => getWord(item) === correct) || entry;

    return {
      id: createId(),
      kind: "start",
      word: correct,
      emoji: getVisual(correctEntry, index),
      typeLabel: `Which word starts with ${letter}?`,
      prompt: letter.toUpperCase(),
      options: shuffle([correct, ...distractors]),
      answer: correct,
    };
  }

  function makeImageQuestion(entry, entries, index) {
    const word = getWord(entry);
    const words = entries.map(getWord);
    const distractors = chooseDistractors(word, words, 2);

    return {
      id: createId(),
      kind: "image",
      word,
      emoji: getVisual(entry, index),
      typeLabel: "What word is this?",
      prompt: "",
      options: shuffle([word, ...distractors]),
      answer: word,
    };
  }

  function scrambleLetters(word) {
    const letters = [...word];
    if (letters.length <= 1) return word;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const scrambled = shuffle(letters).join("");
      if (scrambled !== word) return scrambled;
    }

    return [...letters.slice(1), letters[0]].join("");
  }

  function buildUnscrambleFrames(word) {
    return Array.from({ length: ANSWER_SECONDS + 1 }, (_, elapsedSeconds) => {
      const correctCount = Math.ceil((elapsedSeconds / ANSWER_SECONDS) * word.length);
      const fixed = word.slice(0, correctCount);
      const remaining = word.slice(correctCount);
      return `${fixed}${scrambleLetters(remaining)}`;
    });
  }

  function makeUnscrambleQuestion(entry, entries, index) {
    const word = getWord(entry);
    const words = entries.map(getWord);
    const distractors = chooseDistractors(word, words, 2);
    const scrambleFrames = buildUnscrambleFrames(word);

    return {
      id: createId(),
      kind: "unscramble",
      word,
      emoji: getVisual(entry, index),
      typeLabel: "What word is unscrambling?",
      prompt: scrambleFrames[0],
      scrambleFrames,
      options: shuffle([word, ...distractors]),
      answer: word,
    };
  }

  function scaledCount(wordCount, baseCount) {
    if (wordCount <= 0) return 0;
    return Math.max(1, Math.round((wordCount / BASE_WORD_COUNT) * baseCount));
  }

  function getQuestionPlan(wordCount, visualWordCount = wordCount) {
    if (wordCount < MIN_WORDS) {
      return {
        fill: 0,
        start: 0,
        unscramble: 0,
        image: 0,
        total: 0,
      };
    }

    const image = Math.min(wordCount, Math.max(0, visualWordCount));
    const missingImageCount = wordCount - image;
    const plan = {
      fill: scaledCount(wordCount, FILL_BLANK_COUNT) + Math.ceil(missingImageCount / 3),
      start: scaledCount(wordCount, START_LETTER_COUNT) + Math.floor(missingImageCount / 3),
      unscramble:
        scaledCount(wordCount, UNSCRAMBLE_COUNT) +
        missingImageCount -
        Math.ceil(missingImageCount / 3) -
        Math.floor(missingImageCount / 3),
      image,
    };

    return {
      ...plan,
      total: plan.fill + plan.start + plan.unscramble + plan.image,
    };
  }

  function buildQuestions(items, visualHints) {
    const entries = normalizeQuestionEntries(items, visualHints);
    const visualEntries = entries.filter((entry) => entry.emoji);
    const questionPlan = getQuestionPlan(entries.length, visualEntries.length);
    const shuffledEntries = shuffle(entries);
    const fillEntries = shuffledEntries.slice(0, questionPlan.fill);
    const startEntries = shuffledEntries.slice(0, questionPlan.start);
    const longerEntries = shuffledEntries.filter((entry) => getWord(entry).length > 2);
    const unscrambleEntries = [
      ...longerEntries,
      ...shuffledEntries.filter((entry) => !longerEntries.includes(entry)),
    ].slice(0, questionPlan.unscramble);
    const imageEntries = shuffle(visualEntries).slice(0, questionPlan.image);
    const fill = fillEntries.map((entry, index) => makeFillBlankQuestion(entry, entries, index));
    const start = startEntries.map((entry, index) => makeStartLetterQuestion(entry, entries, index));
    const unscramble = unscrambleEntries.map((entry, index) =>
      makeUnscrambleQuestion(entry, entries, index),
    );
    const image = imageEntries.map((entry, index) => makeImageQuestion(entry, entries, index));
    return [...fill, ...start, ...unscramble, ...image];
  }

  function resetIdsForTests() {
    idCounter = 0;
  }

  const api = {
    MIN_WORDS,
    BASE_WORD_COUNT,
    FILL_BLANK_COUNT,
    START_LETTER_COUNT,
    UNSCRAMBLE_COUNT,
    IMAGE_COUNT,
    ANSWER_SECONDS,
    REVEAL_SECONDS,
    sampleWords,
    normalizeWord,
    parseWords,
    getEmoji,
    getQuestionPlan,
    normalizeQuestionEntries,
    readableOptions,
    buildQuestions,
    makeFillBlankQuestion,
    matchesFillPrompt,
    makeStartLetterQuestion,
    makeUnscrambleQuestion,
    buildUnscrambleFrames,
    makeImageQuestion,
    resetIdsForTests,
  };

  root.SpellingQuizCore = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
