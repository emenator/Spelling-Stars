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
    "lap",
    "tap",
    "cap",
    "nap",
    "pan",
    "fan",
    "van",
    "ship",
    "shop",
    "chop",
    "truck",
    "duck",
    "stuck",
    "clock",
    "block",
    "rock",
  ];

  const INAPPROPRIATE_WORDS =
    (typeof require !== "undefined" ? require("./profanity.js") : root.SpellingProfanity) || [];

  const VOWEL_SWAPS = {
    a: ["e", "u"],
    e: ["a", "i"],
    i: ["e", "y"],
    o: ["u", "oo"],
    u: ["oo", "o"],
  };

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

  function getDatasetWords() {
    const clusters = root.SpellingQuizData?.clusters || [];
    return clusters.flatMap((cluster) => cluster.words || []);
  }

  function editDistance(left, right) {
    const rows = Array.from({ length: left.length + 1 }, () => Array(right.length + 1).fill(0));
    for (let row = 0; row <= left.length; row += 1) rows[row][0] = row;
    for (let column = 0; column <= right.length; column += 1) rows[0][column] = column;

    for (let row = 1; row <= left.length; row += 1) {
      for (let column = 1; column <= right.length; column += 1) {
        const cost = left[row - 1] === right[column - 1] ? 0 : 1;
        rows[row][column] = Math.min(
          rows[row - 1][column] + 1,
          rows[row][column - 1] + 1,
          rows[row - 1][column - 1] + cost,
        );
      }
    }

    return rows[left.length][right.length];
  }

  function similarityScore(target, candidate) {
    const lengthGap = Math.abs(target.length - candidate.length);
    const startsSame = target[0] === candidate[0] ? -2 : 0;
    const endingSize = Math.min(3, target.length, candidate.length);
    const endingsSame = target.slice(-endingSize) === candidate.slice(-endingSize) ? -4 : 0;
    const rhymeSame = target.slice(-2) === candidate.slice(-2) ? -3 : 0;
    return editDistance(target, candidate) + lengthGap + startsSame + endingsSame + rhymeSame;
  }

  function similarWords(correct, pool, count, isAllowed = () => true) {
    const candidates = [...pool, ...commonWords, ...getDatasetWords()]
      .map(normalizeWord)
      .filter((item) => item && item !== correct && isAllowed(item))
      .filter(unique);

    return candidates
      .map((item) => ({ item, score: similarityScore(correct, item) }))
      .sort((left, right) => left.score - right.score || left.item.localeCompare(right.item))
      .map(({ item }) => item)
      .slice(0, count);
  }

  function chooseDistractors(correct, pool, count, isAllowed = () => true) {
    return similarWords(correct, pool, count, isAllowed);
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

  function missingLetterCount(word) {
    if (word.length >= 9) return 3;
    if (word.length >= 6) return 2;
    return 1;
  }

  function makeFillBlankQuestion(entry, entries, index) {
    const word = getWord(entry);
    const words = entries.map(getWord);
    const chars = [...word];
    const letterIndexes = chars
      .map((letter, letterIndex) => (/[a-z]/.test(letter) ? letterIndex : null))
      .filter((letterIndex) => letterIndex !== null);
    const missingIndexes = shuffle(letterIndexes).slice(0, Math.min(missingLetterCount(word), letterIndexes.length));
    missingIndexes.forEach((missingIndex) => {
      chars[missingIndex] = "_";
    });
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
    const differsInLetter = (candidate) => candidate[0] !== letter;

    const listCandidates = words.filter((item) => item !== correct && differsInLetter(item));
    const fromList = [...listCandidates]
      .map((item) => ({ item, score: similarityScore(correct, item) }))
      .sort((left, right) => left.score - right.score || left.item.localeCompare(right.item))
      .map(({ item }) => item)
      .slice(0, 2);
    const distractors =
      fromList.length >= 2 ? fromList : chooseDistractors(correct, listCandidates, 2, differsInLetter);

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

  function isInappropriate(candidate) {
    return INAPPROPRIATE_WORDS.some((bad) => candidate.includes(bad));
  }

  function spellingVariants(word) {
    const variants = [];
    const letters = [...word];

    letters.forEach((letter, index) => {
      (VOWEL_SWAPS[letter] || []).forEach((replacement) => {
        variants.push(word.slice(0, index) + replacement + word.slice(index + 1));
      });
    });

    variants.push(`${word}e`);

    letters.forEach((letter, index) => {
      if (!"aeiou".includes(letter)) {
        variants.push(word.slice(0, index + 1) + letter + word.slice(index + 1));
      }
    });

    for (let index = 0; index < letters.length - 1; index += 1) {
      const swapped = [...letters];
      [swapped[index], swapped[index + 1]] = [swapped[index + 1], swapped[index]];
      variants.push(swapped.join(""));
    }

    return variants;
  }

  function misspell(word, count) {
    const seen = new Set([word]);
    const results = [];

    for (const variant of spellingVariants(word)) {
      if (results.length >= count) break;
      if (variant === word || seen.has(variant) || isInappropriate(variant)) continue;
      seen.add(variant);
      results.push(variant);
    }

    return results;
  }

  function makeSpellQuestion(entry, entries, index) {
    const word = getWord(entry);
    const distractors = misspell(word, 2);

    return {
      id: createId(),
      kind: "spell",
      word,
      emoji: getVisual(entry, index),
      typeLabel: "How do you spell this word?",
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
    const frames = [];
    const letters = [...word];
    const maxSwaps = Math.min(ANSWER_SECONDS, Math.max(1, letters.length - 1));
    const start = [...letters];

    for (let index = 0; index < maxSwaps; index += 1) {
      const from = index;
      const to = letters.length - 1 - index;
      if (from < to) {
        [start[from], start[to]] = [start[to], start[from]];
      }
    }

    if (start.join("") === word && letters.length > 2) {
      [start[1], start[2]] = [start[2], start[1]];
    }

    frames.push(start.join(""));
    const current = [...start];

    for (let step = 1; step <= ANSWER_SECONDS; step += 1) {
      const targetIndex = step === 1 ? 0 : current.findIndex((letter, index) => letter !== letters[index]);
      if (targetIndex >= 0) {
        const swapIndex = current.findIndex(
          (letter, index) => index !== targetIndex && letter === letters[targetIndex],
        );
        if (swapIndex >= 0) {
          [current[targetIndex], current[swapIndex]] = [current[swapIndex], current[targetIndex]];
        }
      }
      frames.push(current.join(""));
    }

    frames[frames.length - 1] = word;
    return frames;
  }

  function makeUnscrambleQuestion(entry, entries, index) {
    const word = getWord(entry);
    const words = entries.map(getWord);
    const sortedLetters = [...word].sort().join("");
    const notAnagram = (candidate) => [...candidate].sort().join("") !== sortedLetters;
    const distractors = chooseDistractors(word, words, 2, notAnagram);
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
        spell: 0,
        total: 0,
      };
    }

    const visual = Math.min(wordCount, Math.max(0, visualWordCount));
    const missingImageCount = wordCount - visual;
    const image = Math.ceil(visual / 2);
    const spell = Math.floor(visual / 2);
    const plan = {
      fill: scaledCount(wordCount, FILL_BLANK_COUNT) + Math.ceil(missingImageCount / 3),
      start: scaledCount(wordCount, START_LETTER_COUNT) + Math.floor(missingImageCount / 3),
      unscramble:
        scaledCount(wordCount, UNSCRAMBLE_COUNT) +
        missingImageCount -
        Math.ceil(missingImageCount / 3) -
        Math.floor(missingImageCount / 3),
      image,
      spell,
    };

    return {
      ...plan,
      total: plan.fill + plan.start + plan.unscramble + plan.image + plan.spell,
    };
  }

  function clampPlanToWords(mix, wordCount, visualCount) {
    const clamp = (value, max) => Math.min(Math.max(0, Math.floor(value) || 0), max);
    return {
      fill: clamp(mix.fill, wordCount),
      start: clamp(mix.start, wordCount),
      unscramble: clamp(mix.unscramble, wordCount),
      image: clamp(mix.image, visualCount),
      spell: clamp(mix.spell, visualCount),
    };
  }

  function buildQuestions(items, visualHints, mix) {
    const entries = normalizeQuestionEntries(items, visualHints);
    const visualEntries = entries.filter((entry) => entry.emoji);
    const questionPlan = mix
      ? clampPlanToWords(mix, entries.length, visualEntries.length)
      : getQuestionPlan(entries.length, visualEntries.length);
    const shuffledEntries = shuffle(entries);
    const fillEntries = shuffledEntries.slice(0, questionPlan.fill);
    const startEntries = shuffledEntries.slice(0, questionPlan.start);
    const longerEntries = shuffledEntries.filter((entry) => getWord(entry).length > 2);
    const unscrambleEntries = [
      ...longerEntries,
      ...shuffledEntries.filter((entry) => !longerEntries.includes(entry)),
    ].slice(0, questionPlan.unscramble);
    const imageEntries = shuffle(visualEntries).slice(0, questionPlan.image);
    const spellEntries = shuffle(visualEntries).slice(0, questionPlan.spell);
    const fill = fillEntries.map((entry, index) => makeFillBlankQuestion(entry, entries, index));
    const start = startEntries.map((entry, index) => makeStartLetterQuestion(entry, entries, index));
    const unscramble = unscrambleEntries.map((entry, index) =>
      makeUnscrambleQuestion(entry, entries, index),
    );
    const image = imageEntries.map((entry, index) => makeImageQuestion(entry, entries, index));
    const spell = spellEntries.map((entry, index) => makeSpellQuestion(entry, entries, index));
    return [...fill, ...start, ...unscramble, ...image, ...spell];
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
    missingLetterCount,
    makeStartLetterQuestion,
    makeUnscrambleQuestion,
    buildUnscrambleFrames,
    editDistance,
    similarityScore,
    similarWords,
    makeImageQuestion,
    INAPPROPRIATE_WORDS,
    misspell,
    makeSpellQuestion,
    resetIdsForTests,
  };

  root.SpellingQuizCore = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
