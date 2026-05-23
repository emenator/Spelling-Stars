const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { describe, test } = require("node:test");

const root = path.resolve(__dirname, "../..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");

describe("static: source contracts", () => {
  test("loads local assets with relative paths for GitHub Pages", () => {
    assert.match(html, /<link rel="stylesheet" href="styles\.css" \/>/);
    assert.match(html, /<script src="app-data\.js"><\/script>/);
    assert.match(html, /<script src="app-core\.js"><\/script>/);
    assert.match(html, /<script src="app\.js"><\/script>/);
  });

  test("exposes classroom word-list clusters from the pasted dataset", () => {
    const data = fs.readFileSync(path.join(root, "app-data.js"), "utf8");

    assert.match(html, /id="librarySelect"/);
    assert.match(html, /id="loadLibraryButton"/);
    assert.match(app, /function loadLibraryCluster\(\)/);
    assert.match(data, /Cluster \$\{index \+ 1\}/);
    assert.match(data, /cat: "🐱"/);
    assert.match(data, /truck: "🚚"/);
    assert.match(data, /flag: "🏳️"/);
  });

  test("keeps classroom mode as the teacher-led default", () => {
    assert.match(html, /id="classroomModeButton"[\s\S]*Classroom/);
    assert.match(app, /let gameMode = "classroom";/);
    assert.match(app, /revealButton\.addEventListener\("click", \(\) => revealAnswer\(null\)\)/);
  });

  test("keeps visual clue suggestions available without requiring every word to have one", () => {
    assert.match(html, /id="suggestVisualsButton"/);
    assert.match(app, /function suggestVisualHints\(\)/);
    assert.match(app, /generateButton\.disabled = count < MIN_WORDS;/);
  });

  test("makes the sample list action obvious for first-time setup", () => {
    assert.match(html, /class="sample-button" id="sampleButton"/);
    assert.match(html, /Try sample list/);
    assert.match(css, /\.sample-button\s*{[\s\S]*background:\s*#dff7eb;/);
  });

  test("keeps the game readable and centered for projection", () => {
    assert.match(html, /Atkinson\+Hyperlegible/);
    assert.match(css, /\.quiz-stage\s*{[\s\S]*justify-items:\s*center;[\s\S]*text-align:\s*center;/);
    assert.match(css, /\.question-prompt\s*{[\s\S]*font-size:\s*clamp\(2\.8rem, 11vh, 7rem\);/);
  });
});
