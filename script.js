// public/script.js
(() => {
  const SVG_ID = "page";
  const BTN_SELECTOR = `#${SVG_ID} g[id^="button."]`;
  const DONE_KEY_PREFIX = "regulation_dailychecklist_state_";

  // Map button -> corresponding text index in the SVG (in your SVG, there are 11 <text> nodes, in order)
  const BUTTON_TO_TEXT_INDEX = {
    "button.1": 0,  // sunlight
    "button.2": 1,  // diaphragmatic breathing
    "button.3": 2,  // emotional connection with others
    "button.4": 3,  // movement
    "button.5": 4,  // setting boundaries
    "button.6": 5,  // decluttering
    "button.7": 6,  // awareness
    "button.8": 7,  // taking breaks
    "button.9": 8,  // saying "no"
    "button.10": 9, // probiotics + fiber
    "button.11": 10 // structure
  };

  // ---- helpers ----
  const pad2 = (n) => String(n).padStart(2, "0");

  const todayKey = () => {
    const d = new Date();
    return `${DONE_KEY_PREFIX}${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(
      d.getDate()
    )}`;
  };

  const getAllButtons = () => Array.from(document.querySelectorAll(BTN_SELECTOR));

  const loadState = () => {
    try {
      const raw = localStorage.getItem(todayKey());
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const saveState = (state) => {
    localStorage.setItem(todayKey(), JSON.stringify(state));
  };

  const isChecked = (g) => g.classList.contains("is-checked");

  const setChecked = (g, checked) => {
    g.classList.toggle("is-checked", checked);

    // accessibility (optional)
    g.setAttribute("role", "button");
    g.setAttribute("tabindex", "0");
    g.setAttribute("aria-pressed", checked ? "true" : "false");
  };

  const getButtonId = (g) => g.getAttribute("id"); // e.g. "button.1"

  // ---- text syncing ----
  const applyTextChecked = (svg, buttonId, checked) => {
    const idx = BUTTON_TO_TEXT_INDEX[buttonId];
    if (idx === undefined) return;

    const texts = svg.querySelectorAll("text");
    const t = texts[idx];
    if (!t) return;

    // toggle a class on the text
    t.classList.toggle("is-done", checked);

    // also enforce opacity directly (so it works even if CSS is stubborn)
    t.style.opacity = checked ? "0.5" : "1";
  };

  const syncAllTextsFromButtons = (svg) => {
    getAllButtons().forEach((g) => {
      const id = getButtonId(g);
      applyTextChecked(svg, id, isChecked(g));
    });
  };

  // ---- completion UI ----
  const ensureCongrats = () => {
    let el = document.getElementById("congrats-message");
    if (el) return el;

    el = document.createElement("div");
    el.id = "congrats-message";
    el.innerHTML = `
      <div class="line-1">You did good for today</div>
      <div class="line-2">See you tomorrow!</div>
    `;
    document.body.appendChild(el);
    return el;
  };

  const hideBoard = () => {
    const board = document.querySelector(".board");
    if (board) board.style.display = "none";
  };

  const showBoard = () => {
    const board = document.querySelector(".board");
    if (board) board.style.display = "";
  };

  const checkAllDone = () => {
    const buttons = getAllButtons();
    return buttons.length > 0 && buttons.every((g) => isChecked(g));
  };

  const applyCompletionState = () => {
    const congrats = ensureCongrats();
    if (checkAllDone()) {
      hideBoard();
      congrats.style.display = "flex";
    } else {
      showBoard();
      congrats.style.display = "none";
    }
  };

  // ---- reset timer (TEST: 5 seconds; production: midnight) ----
  const scheduleReset = () => {
    const TEST_MODE = false; // 👈 switch to false when done testing
    const ms = TEST_MODE
      ? 10000
      : (() => {
          const now = new Date();
          const midnight = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 1,
            0,
            0,
            0,
            0
          );
          return midnight.getTime() - now.getTime();
        })();

    setTimeout(() => {
      localStorage.removeItem(todayKey());

      // Uncheck all buttons
      getAllButtons().forEach((g) => setChecked(g, false));

      // Re-sync text opacity
      const svg = document.getElementById(SVG_ID);
      if (svg) syncAllTextsFromButtons(svg);

      // Show board again
      applyCompletionState();

      // Keep running daily
      scheduleReset();
    }, ms);
  };

  // ---- toggle logic ----
  const toggleButton = (svg, g) => {
    const id = getButtonId(g);
    const next = !isChecked(g);

    setChecked(g, next);
    applyTextChecked(svg, id, next);

    const newState = loadState();
    newState[id] = next;
    saveState(newState);

    applyCompletionState();
  };

  // ---- init ----
  const init = () => {
    const svg = document.getElementById(SVG_ID);
    if (!svg) {
      console.warn(`[dailychecklist] SVG #${SVG_ID} not found.`);
      return;
    }

    // ✅ improves mobile tapping inside SVG
    // (prevents browser gestures stealing the tap)
    svg.style.touchAction = "manipulation";

    // Load + apply saved state
    const state = loadState();
    getAllButtons().forEach((g) => {
      const id = getButtonId(g);
      setChecked(g, Boolean(state[id]));
    });

    // Sync text opacity based on loaded state
    syncAllTextsFromButtons(svg);

    // ✅ Pointer events: works for mouse + touch + pen (best option)
    svg.addEventListener("pointerup", (e) => {
      const g = e.target.closest(`g[id^="button."]`);
      if (!g) return;
      toggleButton(svg, g);
    });

    // Keyboard support (Enter / Space)
    svg.addEventListener("keydown", (e) => {
      const g = e.target.closest(`g[id^="button."]`);
      if (!g) return;

      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleButton(svg, g);
      }
    });

    applyCompletionState();
    scheduleReset();
  };

  // Wait for DOM
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
