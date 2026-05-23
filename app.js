const {
  MIN_WORDS,
  ANSWER_SECONDS,
  REVEAL_SECONDS,
  sampleWords,
  parseWords,
  getEmoji,
  getQuestionPlan,
  readableOptions,
  buildQuestions,
} = window.SpellingQuizCore;

const SAVE_KEY = "spellingQuizSavedLists";
const DRAFT_KEY = "spellingQuizDraft";

const setupView = document.querySelector("#setupView");
const gameView = document.querySelector("#gameView");
const wordInput = document.querySelector("#wordInput");
const wordCount = document.querySelector("#wordCount");
const generateButton = document.querySelector("#generateButton");
const sampleButton = document.querySelector("#sampleButton");
const suggestVisualsButton = document.querySelector("#suggestVisualsButton");
const clearVisualsButton = document.querySelector("#clearVisualsButton");
const visualList = document.querySelector("#visualList");
const librarySelect = document.querySelector("#librarySelect");
const loadLibraryButton = document.querySelector("#loadLibraryButton");
const saveNameInput = document.querySelector("#saveNameInput");
const saveListButton = document.querySelector("#saveListButton");
const savedListSelect = document.querySelector("#savedListSelect");
const loadListButton = document.querySelector("#loadListButton");
const deleteListButton = document.querySelector("#deleteListButton");
const saveStatus = document.querySelector("#saveStatus");
const questionList = document.querySelector("#questionList");
const questionCount = document.querySelector("#questionCount");
const startButton = document.querySelector("#startButton");
const autoModeButton = document.querySelector("#autoModeButton");
const classroomModeButton = document.querySelector("#classroomModeButton");
const homeButton = document.querySelector("#homeButton");
const previousQuestionButton = document.querySelector("#previousQuestionButton");
const questionMenuButton = document.querySelector("#questionMenuButton");
const cornerNextButton = document.querySelector("#cornerNextButton");
const visualToggleButton = document.querySelector("#visualToggleButton");
const progressFill = document.querySelector("#progressFill");
const progressText = document.querySelector("#progressText");
const timer = document.querySelector("#timer");
const promptEmoji = document.querySelector("#promptEmoji");
const questionType = document.querySelector("#questionType");
const questionPrompt = document.querySelector("#questionPrompt");
const answerGrid = document.querySelector("#answerGrid");
const feedback = document.querySelector("#feedback");
const quizStage = document.querySelector("#quizStage");
const classroomControls = document.querySelector("#classroomControls");
const revealButton = document.querySelector("#revealButton");
const nextButton = document.querySelector("#nextButton");
const results = document.querySelector("#results");
const scoreText = document.querySelector("#scoreText");
const playAgainButton = document.querySelector("#playAgainButton");
const questionDrawer = document.querySelector("#questionDrawer");
const closeQuestionDrawerButton = document.querySelector("#closeQuestionDrawerButton");
const drawerQuestionList = document.querySelector("#drawerQuestionList");

let gameMode = "classroom";
let questions = [];
let activeQuestions = [];
let currentIndex = 0;
let score = 0;
let selected = false;
let tickId = null;
let visualHints = {};
let showVisualClues = true;

function getWords() {
  return parseWords(wordInput.value);
}

function getWordEntries() {
  return getWords().map((word) => ({
    word,
    emoji: visualHints[word] || "",
  }));
}

function getSavedLists() {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY)) || {};
  } catch {
    return {};
  }
}

function setSavedLists(savedLists) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(savedLists));
}

function setSaveStatus(message) {
  saveStatus.textContent = message;
}

function saveDraft() {
  const words = getWords();
  localStorage.setItem(
    DRAFT_KEY,
    JSON.stringify({
      words,
      visualHints: Object.fromEntries(words.map((word) => [word, visualHints[word] || ""])),
      saveName: saveNameInput.value,
    }),
  );
}

function loadDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY));
    if (!draft?.words?.length) return;
    wordInput.value = draft.words.join("\n");
    visualHints = draft.visualHints || {};
    saveNameInput.value = draft.saveName || "";
  } catch {
    localStorage.removeItem(DRAFT_KEY);
  }
}

function defaultListName() {
  const words = getWords();
  return words.length > 0 ? words.slice(0, 3).join(", ") : "Spelling list";
}

function renderSavedLists(selectedName = savedListSelect.value) {
  const savedLists = getSavedLists();
  const names = Object.keys(savedLists).sort((a, b) => a.localeCompare(b));
  savedListSelect.innerHTML = "";

  if (names.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No saved lists";
    savedListSelect.append(option);
  } else {
    names.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      savedListSelect.append(option);
    });
    savedListSelect.value = names.includes(selectedName) ? selectedName : names[0];
  }

  const hasSavedLists = names.length > 0;
  loadListButton.disabled = !hasSavedLists;
  deleteListButton.disabled = !hasSavedLists;
}

function renderLibraryLists() {
  const clusters = window.SpellingQuizData?.clusters || [];
  librarySelect.innerHTML = '<option value="">Choose a cluster</option>';
  clusters.forEach((cluster) => {
    const option = document.createElement("option");
    option.value = cluster.id;
    option.textContent = cluster.name;
    librarySelect.append(option);
  });
  loadLibraryButton.disabled = clusters.length === 0;
}

function loadLibraryCluster() {
  const cluster = window.SpellingQuizData?.clusters?.find((item) => item.id === librarySelect.value);
  if (!cluster) return;

  wordInput.value = cluster.words.join("\n");
  visualHints = { ...cluster.visualHints };
  saveNameInput.value = cluster.name;
  questions = [];
  renderVisualHints();
  renderQuestionList();
  updateWordCount();
  setSaveStatus(`Loaded ${cluster.name}.`);
  saveDraft();
}

function saveCurrentList() {
  const words = getWords();
  if (words.length === 0) {
    setSaveStatus("Add words before saving.");
    return;
  }

  const name = saveNameInput.value.trim() || defaultListName();
  const savedLists = getSavedLists();
  savedLists[name] = {
    words,
    visualHints: Object.fromEntries(words.map((word) => [word, visualHints[word] || ""])),
    savedAt: new Date().toISOString(),
  };
  setSavedLists(savedLists);
  saveNameInput.value = name;
  renderSavedLists(name);
  setSaveStatus(`Saved "${name}".`);
  saveDraft();
}

function loadSelectedList() {
  const name = savedListSelect.value;
  const saved = getSavedLists()[name];
  if (!saved) return;

  wordInput.value = saved.words.join("\n");
  visualHints = saved.visualHints || {};
  saveNameInput.value = name;
  renderVisualHints();
  updateWordCount();
  questions = [];
  renderQuestionList();
  setSaveStatus(`Loaded "${name}".`);
  saveDraft();
}

function deleteSelectedList() {
  const name = savedListSelect.value;
  if (!name) return;

  const savedLists = getSavedLists();
  delete savedLists[name];
  setSavedLists(savedLists);
  renderSavedLists();
  setSaveStatus(`Deleted "${name}".`);
}

function updateWordCount() {
  const words = getWords();
  const count = words.length;
  const visualCount = words.filter((word) => visualHints[word]).length;
  const questionPlan = getQuestionPlan(count, visualCount);
  const wordLabel = count === 1 ? "word" : "words";
  wordCount.textContent =
    count >= MIN_WORDS
      ? `${count} ${wordLabel} entered · ${visualCount} optional visual clues · ${questionPlan.total} questions`
      : `${count} ${wordLabel} entered · add ${MIN_WORDS - count} more to generate`;
  generateButton.disabled = count < MIN_WORDS;
}

function removeWord(wordToRemove) {
  const remainingWords = getWords().filter((word) => word !== wordToRemove);
  wordInput.value = remainingWords.join("\n");
  delete visualHints[wordToRemove];
  questions = [];
  renderVisualHints();
  renderQuestionList();
  updateWordCount();
  saveDraft();
}

function suggestVisualHints() {
  getWords().forEach((word, index) => {
    const suggestion = getEmoji(word, index);
    if (suggestion && !visualHints[word]) {
      visualHints[word] = suggestion;
    }
  });
  renderVisualHints();
  updateWordCount();
  saveDraft();
}

function renderVisualHints() {
  const words = getWords();
  const activeWords = new Set(words);
  visualHints = Object.fromEntries(
    Object.entries(visualHints).filter(([word]) => activeWords.has(word)),
  );

  words.forEach((word, index) => {
    if (!(word in visualHints)) {
      visualHints[word] = getEmoji(word, index);
    }
  });

  if (words.length === 0) {
    visualList.innerHTML = '<p class="empty-state">Enter words to review visual clues.</p>';
    return;
  }

  visualList.innerHTML = "";
  words.forEach((word) => {
    const row = document.createElement("div");
    row.className = "visual-row";
    row.innerHTML = `
      <span class="visual-word">${word}</span>
      <input class="visual-input" aria-label="Visual clue for ${word}" value="${visualHints[word]}" maxlength="4" />
      <button class="remove-word-button" type="button" aria-label="Delete ${word}">×</button>
    `;
    const input = row.querySelector("input");
    const removeButton = row.querySelector("button");
    input.addEventListener("input", () => {
      visualHints[word] = input.value.trim();
      updateWordCount();
      saveDraft();
    });
    removeButton.addEventListener("click", () => removeWord(word));
    visualList.append(row);
  });
}

function renderQuestionList() {
  const kept = questions.length;
  questionCount.textContent = `${kept} kept`;
  startButton.disabled = kept === 0;

  if (kept === 0) {
    questionList.innerHTML = '<p class="empty-state">No questions kept yet.</p>';
    return;
  }

  questionList.innerHTML = "";
  questions.forEach((question, index) => {
    const visual = question.emoji || "No visual clue";
    const card = document.createElement("article");
    card.className = "question-card";
    card.innerHTML = `
      <span class="badge">${index + 1}</span>
      <div>
        <strong>${question.typeLabel}</strong>
        <p>${visual} ${question.prompt || question.word} · ${readableOptions(question.options)}</p>
      </div>
      <button class="remove-button" type="button" aria-label="Remove question">×</button>
    `;
    card.querySelector("button").addEventListener("click", () => {
      questions = questions.filter((item) => item.id !== question.id);
      renderQuestionList();
    });
    questionList.append(card);
  });
}

function generateQuestions() {
  const entries = getWordEntries();
  if (entries.length < MIN_WORDS) return;
  questions = buildQuestions(entries);
  renderQuestionList();
  renderQuestionDrawer();
}

function setMode(mode) {
  gameMode = mode;
  autoModeButton.classList.toggle("active", mode === "auto");
  classroomModeButton.classList.toggle("active", mode === "classroom");
}

function clearTimers() {
  window.clearInterval(tickId);
  tickId = null;
}

function startGame() {
  activeQuestions = [...questions];
  currentIndex = 0;
  score = 0;
  setupView.classList.add("hidden");
  document.body.classList.add("game-active");
  gameView.classList.remove("hidden");
  results.classList.add("hidden");
  quizStage.classList.remove("hidden");
  renderCurrentQuestion();
}

function renderCurrentQuestion() {
  clearTimers();
  selected = false;
  feedback.textContent = "";
  cornerNextButton.classList.remove("hidden");
  classroomControls.classList.add("hidden");
  revealButton.disabled = false;
  nextButton.disabled = true;

  if (currentIndex >= activeQuestions.length) {
    showResults();
    return;
  }

  const question = activeQuestions[currentIndex];
  const progress = (currentIndex / activeQuestions.length) * 100;
  progressFill.style.width = `${progress}%`;
  progressText.textContent = `Question ${currentIndex + 1} of ${activeQuestions.length}`;
  previousQuestionButton.disabled = currentIndex === 0;
  timer.textContent = ANSWER_SECONDS;
  renderQuestionVisual(question);
  questionType.textContent = question.typeLabel;
  questionPrompt.textContent = question.prompt;
  questionPrompt.classList.toggle("hidden", !question.prompt);
  answerGrid.innerHTML = "";

  question.options.forEach((option) => {
    const button = document.createElement("button");
    button.className = "answer-button";
    button.type = "button";
    button.textContent = option;
    button.addEventListener("click", () => chooseAnswer(option));
    answerGrid.append(button);
  });

  if (gameMode === "classroom") {
    classroomControls.classList.remove("hidden");
  }
  renderQuestionDrawer();

  let secondsLeft = ANSWER_SECONDS;
  tickId = window.setInterval(() => {
    secondsLeft -= 1;
    timer.textContent = Math.max(0, secondsLeft);
    updateUnscramblePrompt(question, secondsLeft);
    if (secondsLeft <= 0) {
      if (gameMode === "auto") {
        revealAnswer(null);
      } else {
        clearTimers();
      }
    }
  }, 1000);
}

function shouldShowVisual(question) {
  return question.kind === "image" || showVisualClues;
}

function renderQuestionVisual(question = activeQuestions[currentIndex]) {
  const visible = question && question.emoji && shouldShowVisual(question);
  promptEmoji.textContent = visible ? question.emoji : "";
  promptEmoji.classList.toggle("hidden", !visible);
  visualToggleButton.classList.toggle("active", showVisualClues);
  visualToggleButton.setAttribute(
    "aria-label",
    showVisualClues ? "Hide visual clues" : "Show visual clues",
  );
}

function toggleVisualClues() {
  showVisualClues = !showVisualClues;
  renderQuestionVisual();
}

function updateUnscramblePrompt(question, secondsLeft) {
  if (question.kind !== "unscramble") return;

  const elapsedSeconds = ANSWER_SECONDS - Math.max(0, secondsLeft);
  questionPrompt.textContent =
    question.scrambleFrames[Math.min(elapsedSeconds, question.scrambleFrames.length - 1)];
}

function chooseAnswer(option) {
  if (selected) return;
  revealAnswer(option);
}

function revealAnswer(option) {
  if (selected) return;
  selected = true;
  window.clearInterval(tickId);
  tickId = null;

  const question = activeQuestions[currentIndex];
  const isCorrect = option === question.answer;
  if (isCorrect) score += 1;

  [...answerGrid.children].forEach((button) => {
    button.disabled = true;
    if (button.textContent === question.answer) button.classList.add("correct");
    if (button.textContent === option && !isCorrect) button.classList.add("incorrect");
  });

  feedback.textContent = isCorrect
    ? `Correct: ${question.answer}`
    : `Answer: ${question.answer}`;
  timer.textContent = REVEAL_SECONDS;

  if (gameMode === "classroom") {
    revealButton.disabled = true;
    nextButton.disabled = false;
    return;
  }

  let secondsLeft = REVEAL_SECONDS;
  tickId = window.setInterval(() => {
    secondsLeft -= 1;
    timer.textContent = Math.max(0, secondsLeft);
    if (secondsLeft <= 0) {
      goNext();
    }
  }, 1000);
}

function goNext() {
  clearTimers();
  currentIndex += 1;
  renderCurrentQuestion();
}

function goPrevious() {
  if (currentIndex <= 0) return;
  clearTimers();
  currentIndex -= 1;
  renderCurrentQuestion();
}

function goToQuestion(index) {
  clearTimers();
  currentIndex = index;
  closeQuestionDrawer();
  renderCurrentQuestion();
}

function renderQuestionDrawer() {
  const drawerQuestions = activeQuestions.length ? activeQuestions : questions;
  drawerQuestionList.innerHTML = "";
  drawerQuestions.forEach((question, index) => {
    const button = document.createElement("button");
    button.className = "drawer-question-button";
    button.classList.toggle("active", index === currentIndex);
    button.type = "button";
    button.innerHTML = `
      <span>${index + 1}</span>
      <span>${question.typeLabel}<br>${question.emoji || ""} ${question.prompt || question.word}</span>
    `;
    button.addEventListener("click", () => goToQuestion(index));
    drawerQuestionList.append(button);
  });
}

function openQuestionDrawer() {
  renderQuestionDrawer();
  questionDrawer.classList.remove("hidden");
}

function closeQuestionDrawer() {
  questionDrawer.classList.add("hidden");
}

function showResults() {
  clearTimers();
  progressFill.style.width = "100%";
  cornerNextButton.classList.add("hidden");
  quizStage.classList.add("hidden");
  classroomControls.classList.add("hidden");
  results.classList.remove("hidden");
  timer.textContent = "✓";
  progressText.textContent = `Finished ${activeQuestions.length} questions`;
  scoreText.textContent = `Score: ${score} / ${activeQuestions.length}`;
}

function backToSetup() {
  clearTimers();
  document.body.classList.remove("game-active");
  closeQuestionDrawer();
  gameView.classList.add("hidden");
  setupView.classList.remove("hidden");
}

wordInput.addEventListener("input", () => {
  renderVisualHints();
  updateWordCount();
  saveDraft();
});
generateButton.addEventListener("click", generateQuestions);
sampleButton.addEventListener("click", () => {
  wordInput.value = sampleWords.join("\n");
  visualHints = {};
  renderVisualHints();
  updateWordCount();
  generateQuestions();
  saveDraft();
});
suggestVisualsButton.addEventListener("click", suggestVisualHints);
clearVisualsButton.addEventListener("click", () => {
  visualHints = Object.fromEntries(getWords().map((word) => [word, ""]));
  renderVisualHints();
  updateWordCount();
  saveDraft();
});
saveListButton.addEventListener("click", saveCurrentList);
loadListButton.addEventListener("click", loadSelectedList);
deleteListButton.addEventListener("click", deleteSelectedList);
loadLibraryButton.addEventListener("click", loadLibraryCluster);
autoModeButton.addEventListener("click", () => setMode("auto"));
classroomModeButton.addEventListener("click", () => setMode("classroom"));
startButton.addEventListener("click", startGame);
homeButton.addEventListener("click", backToSetup);
previousQuestionButton.addEventListener("click", goPrevious);
questionMenuButton.addEventListener("click", openQuestionDrawer);
closeQuestionDrawerButton.addEventListener("click", closeQuestionDrawer);
cornerNextButton.addEventListener("click", goNext);
visualToggleButton.addEventListener("click", toggleVisualClues);
revealButton.addEventListener("click", () => revealAnswer(null));
nextButton.addEventListener("click", goNext);
playAgainButton.addEventListener("click", startGame);

loadDraft();
renderVisualHints();
renderLibraryLists();
renderSavedLists();
updateWordCount();
