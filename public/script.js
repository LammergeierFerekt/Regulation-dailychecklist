// public/script.js
(() => {
  const SVG_ID = "page";
  const BTN_SELECTOR = `#${SVG_ID} g[id^="button."]`;
  const DONE_KEY_PREFIX = "regulation_dailychecklist_state_";

  // ---- helpers ----
  const pad2 = (n) => String(n).padStart(2, "0");
  const todayKey = () => {
    const d = new Date();
    return `${DONE_KEY_PREFIX}${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
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

    // accessibility (optional but nice)
    g.setAttribute("role", "button");
    g.setAttribute("tabindex", "0");
    g.setAttribute("aria-pressed", checked ? "true" : "false");
  };

  const getButtonId = (g) => g.getAttribute("id"); // e.g. "button.1"

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

  // ---- midnight reset ----
  const scheduleMidnightReset = () => {
    const TEST_MODE = true;   // 👈 set to false when done testing
  const ms = TEST_MODE ? 30000 : (() => {
    const now = new Date();
    const midnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0, 0, 0, 0
    );
    return midnight.getTime() - now.getTime();
  })();

    setTimeout(() => {
    localStorage.removeItem(todayKey());

    const buttons = getAllButtons();
    buttons.forEach(g => setChecked(g, false));

    applyCompletionState();
    scheduleMidnightReset();
  }, ms);
};

  // ---- init ----
  const init = () => {
    const svg = document.getElementById(SVG_ID);
    if (!svg) {
      console.warn(`[dailychecklist] SVG #${SVG_ID} not found.`);
      return;
    }

    // Load saved state for today
    const state = loadState();

    // Apply saved state
    const buttons = getAllButtons();
    buttons.forEach((g) => {
      const id = getButtonId(g);
      setChecked(g, Boolean(state[id]));
    });

    // Click handling (event delegation)
    svg.addEventListener("click", (e) => {
      const circle = e.target.closest("circle");
      const g = e.target.closest(`g[id^="button."]`);
      if (!g) return;

    

      // If you want ONLY circle clicks, uncomment next 2 lines:
      // if (!circle) return;

      const id = getButtonId(g);
      const next = !isChecked(g);
      setChecked(g, next);

      const newState = loadState();
      newState[id] = next;
      saveState(newState);

      applyCompletionState();
    });


    // // ✅ Mobile touch support (add ONCE, not inside click)
    // svg.addEventListener(
    // "touchstart",
    // (e) => {
    //     const g = e.target.closest(`g[id^="button."]`);
    //     if (!g) return;

    //     e.preventDefault(); // prevents ghost click on some browsers
    //     g.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    // },
    // { passive: false }
    // );


    // Keyboard support (Enter / Space)
    svg.addEventListener("keydown", (e) => {
      const g = e.target.closest(`g[id^="button."]`);
      if (!g) return;

      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const id = getButtonId(g);
        const next = !isChecked(g);
        setChecked(g, next);

        const newState = loadState();
        newState[id] = next;
        saveState(newState);

        applyCompletionState();
      }
    });

    applyCompletionState();
    scheduleMidnightReset();
  };

  // Wait for DOM
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
