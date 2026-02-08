// --- State ---
let stage = "loading"; // loading | intro | quiz | calculating | score | propose | done
let bank = { cute: [], memory: [] };
let config = null;

let selectedQuestions = [];
let currentIndex = 0;
let score = 0;

// --- Audio (iOS-safe: only starts on user tap) ---
const bgAudio = new Audio("assets/audio/bg.mp3");
bgAudio.loop = true;
bgAudio.volume = 0.32;

const clickAudio = new Audio("assets/audio/click.mp3");
clickAudio.volume = 0.45;

let musicEnabled = false;

// --- Elements ---
const appEl = document.getElementById("app");
const titleEl = document.getElementById("title");
const subtitleEl = document.getElementById("subtitle");
const textEl = document.getElementById("text");
const imageEl = document.getElementById("image");
const buttonsEl = document.getElementById("buttons");

const progressWrap = document.getElementById("progressWrap");
const progressLabel = document.getElementById("progressLabel");
const progressPct = document.getElementById("progressPct");
const progressFill = document.getElementById("progressFill");

const overlay = document.getElementById("overlay");
const fxLayer = document.getElementById("fxLayer");

// --- Helpers: shuffle/sample ---
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sampleN(arr, n) {
  return shuffle(arr).slice(0, Math.min(n, arr.length));
}

// --- Image preloading ---
function preloadImage(url) {
  try {
    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";
    img.src = url;
  } catch (_) {}
}

function preloadPageImages() {
  if (!config || !config.paths) return;
  preloadImage(config.paths.introImage);
  preloadImage(config.paths.scoreImage);
  preloadImage(config.paths.proposeImage);
}

// --- UI helpers ---
function setImage(path) {
  imageEl.src = path;

  // ✅ Preload next quiz image while user is on current question
  if (stage === "quiz" && selectedQuestions.length > 0) {
    const nextQ = selectedQuestions[currentIndex + 1];
    if (nextQ && config?.paths?.questionImageBase) {
      preloadImage(config.paths.questionImageBase + nextQ.image);
    }
  }
}

function clearButtons() {
  buttonsEl.innerHTML = "";
}

function disableAllButtons() {
  const btns = buttonsEl.querySelectorAll("button");
  btns.forEach(b => b.disabled = true);
}

function showOverlay(show) {
  if (show) overlay.classList.remove("hidden");
  else overlay.classList.add("hidden");
}

function showProgress(show) {
  if (show) progressWrap.classList.remove("hidden");
  else progressWrap.classList.add("hidden");
}

function updateProgress() {
  const total = selectedQuestions.length || 1;
  const currentHuman = Math.min(currentIndex + 1, total);
  const pct = Math.round((currentHuman / total) * 100);

  progressLabel.innerText = `Question ${currentHuman}/${total}`;
  progressPct.innerText = `${pct}%`;
  progressFill.style.width = `${pct}%`;
}

function setLetterMode(on) {
  if (on) appEl.classList.add("letterMode");
  else appEl.classList.remove("letterMode");
}

// --- Audio helpers ---
function tryStartMusic() {
  if (musicEnabled) return;
  bgAudio.play()
    .then(() => { musicEnabled = true; })
    .catch(() => {
      // On iOS this should succeed since called inside a button tap
    });
}

function playClick() {
  if (!musicEnabled) return;
  try {
    clickAudio.currentTime = 0;
    clickAudio.play().catch(() => {});
  } catch (_) {}
}

function addButton(label, cls, onClick) {
  const btn = document.createElement("button");
  btn.innerText = label;
  btn.className = cls;
  btn.onclick = (e) => {
    playClick();
    onClick(e);
  };
  buttonsEl.appendChild(btn);
  return btn;
}

// --- Quiz setup ---
function buildQuiz() {
  const cuteCount = config.sample.cute;
  const memoryCount = config.sample.memory;

  const chosenCute = sampleN(bank.cute, cuteCount);
  const chosenMemory = sampleN(bank.memory, memoryCount);

  selectedQuestions = chosenCute.concat(chosenMemory);
  if (config.shuffleFinalOrder) selectedQuestions = shuffle(selectedQuestions);

  currentIndex = 0;
  score = 0;
}

// --- Text helpers ---
function setTextPlain(text) {
  textEl.innerText = text;
}

function setTextLines(lines, baseDelayMs = 0, stepMs = 220) {
  textEl.innerHTML = "";
  lines.forEach((line, idx) => {
    const div = document.createElement("div");
    div.className = "line";
    div.style.animationDelay = `${baseDelayMs + idx * stepMs}ms`;
    div.textContent = line;
    textEl.appendChild(div);
  });
}

// --- FX helpers ---
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function burstFX() {
  const rect = appEl.getBoundingClientRect();
  const originX = rect.left + rect.width * 0.5;
  const originY = rect.top + rect.height * 0.82;

  // hearts
  const hearts = 18;
  for (let i = 0; i < hearts; i++) {
    const el = document.createElement("div");
    el.className = "fxHeart";
    el.textContent = "❤";

    const x = originX + rand(-140, 140);
    const y = originY + rand(-10, 30);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.fontSize = `${rand(16, 26)}px`;
    el.style.animationDuration = `${rand(900, 1350)}ms`;
    el.style.animationDelay = `${rand(0, 120)}ms`;

    fxLayer.appendChild(el);
    setTimeout(() => el.remove(), 1600);
  }

  // confetti
  const confetti = 22;
  for (let i = 0; i < confetti; i++) {
    const el = document.createElement("div");
    el.className = "fxConfetti";

    const x = originX + rand(-160, 160);
    const y = originY + rand(-40, 10);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.animationDuration = `${rand(1100, 1550)}ms`;
    el.style.animationDelay = `${rand(0, 90)}ms`;

    const palette = [
      "rgba(216,180,106,0.95)", // gold
      "rgba(255,255,255,0.85)", // ivory
      "rgba(200,180,255,0.70)"  // soft lilac
    ];
    el.style.background = palette[rand(0, palette.length - 1)];

    fxLayer.appendChild(el);
    setTimeout(() => el.remove(), 1700);
  }
}

// --- Boot ---
Promise.all([
  fetch("assets/data/questions.json").then(r => r.json()),
  fetch("assets/data/quiz_config.json").then(r => r.json())
]).then(([questionsJson, configJson]) => {
  bank = questionsJson;
  config = configJson;

  // ✅ Preload static page images immediately
  preloadPageImages();

  stage = "intro";
  render();
}).catch(err => {
  stage = "done";
  titleEl.innerText = "Oops";
  subtitleEl.innerText = "";
  setTextPlain("Couldn’t load data files. Run a local server (python3 -m http.server) and retry.");
  buttonsEl.innerHTML = "";
  console.error(err);
});

// --- Render ---
function render() {
  clearButtons();
  showOverlay(false);
  setLetterMode(false);

  const gfName = (config?.names?.gfName || "my love").trim();
  const yourName = (config?.names?.yourName || "").trim();

  if (stage === "intro") {
    showProgress(false);

    titleEl.innerText = "Flames Test 🔥";
    subtitleEl.innerText = `For ${gfName}.`;

    setImage(config.paths.introImage);

    setTextPlain(
      `Okay ${gfName}, quick flame check.\n` +
      `10 questions.\n` +
      `No cheating.\n\n` +
      `Ready?`
    );

    addButton("Start", "primary", () => {
      // ✅ Start button triggers music (iOS-safe)
      tryStartMusic();

      buildQuiz();

      // ✅ Preload first question image for instant start
      if (selectedQuestions[0] && config?.paths?.questionImageBase) {
        preloadImage(config.paths.questionImageBase + selectedQuestions[0].image);
      }

      stage = "quiz";
      render();
    });

    addButton("Not yet", "secondary", () => {
      setTextPlain(`No pressure, ${gfName}. Tap Start when you’re ready 🙂`);
    });

    return;
  }

  if (stage === "quiz") {
    showProgress(true);
    updateProgress();

    const q = selectedQuestions[currentIndex];

    titleEl.innerText = `Question ${currentIndex + 1}/${selectedQuestions.length}`;
    subtitleEl.innerText = ""; // no cute/memory subtitles

    setImage(config.paths.questionImageBase + q.image);
    setTextPlain(q.question);

    if (musicEnabled) bgAudio.volume = 0.28;

    q.options.forEach((opt, i) => {
      addButton(opt, "primary", (ev) => {
        const clickedBtn = ev?.currentTarget;
        if (clickedBtn) clickedBtn.classList.add("pressed");
        disableAllButtons();

        if (i === q.correctIndex) score++;

        currentIndex++;

        if (currentIndex >= selectedQuestions.length) {
          stage = "calculating";
          render();

          // 2.5 seconds waiting time
          setTimeout(() => {
            stage = "score";
            render();
          }, 2500);

          return;
        }

        setTimeout(() => render(), 120);
      });
    });

    return;
  }

  if (stage === "calculating") {
    showProgress(false);
    subtitleEl.innerText = "";
    titleEl.innerText = "One sec…";

    setImage(config.paths.scoreImage);
    setTextPlain("Calculating…");
    showOverlay(true);
    return;
  }

  if (stage === "score") {
    showProgress(false);
    subtitleEl.innerText = "";

    const percent = Math.round((score / selectedQuestions.length) * 100);

    titleEl.innerText = `Flame Sync: ${percent}%`;
    setImage(config.paths.scoreImage);

    setTextPlain(
      `${gfName}, we matched on ${score}/${selectedQuestions.length}.\n` +
      `But honestly… this test is just the warm-up.\n\n` +
      `One last thing…`
    );

    addButton("Continue →", "primary", () => {
      stage = "propose";
      render();
    });

    return;
  }

  if (stage === "propose") {
    showProgress(false);
    subtitleEl.innerText = "";
    setLetterMode(true);

    titleEl.innerText = "A question I really care about ❤️";
    setImage(config.paths.proposeImage);

    if (musicEnabled) bgAudio.volume = 0.22;

    const sign = yourName ? `— ${yourName}` : "";

    setTextLines([
      `${gfName},`,
      ``,
      `Being with you still feels like my favorite place to be.`,
      `You’re my love, my calm, my excitement, my home.`,
      ``,
      `So today I’m not asking something new.`,
      `I’m asking something deeper.`,
      ``,
      `Will you continue to be my love,`,
      `and love me for all our tomorrows?`,
      ``,
      sign
    ], 0, 220);

    addButton("Yes 💖", "primary", () => {
      burstFX();
      stage = "done";
      render();
    });

    return;
  }

  if (stage === "done") {
    showProgress(false);
    subtitleEl.innerText = "";
    setLetterMode(true);

    titleEl.innerText = "Always ❤️";
    setImage(config.paths.proposeImage);

    if (musicEnabled) bgAudio.volume = 0.24;

    setTextLines([
      `${gfName},`,
      ``,
      `Thank you for choosing me.`,
      `I choose you — always.`
    ], 0, 240);

    addButton("Retake the Flames Test 🔁", "secondary", () => {
      stage = "intro";
      render();
    });

    return;
  }
}
