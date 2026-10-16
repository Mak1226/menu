const DATA_URL = "./data/menu.json";
const TZ = "Asia/Kolkata";

const mealMeta = {
  Breakfast: { icon: "☀️", start: 6.5, end: 10.0 },
  Lunch: { icon: "🍛", start: 12.0, end: 15.0 },
  "Evening Snacks": { icon: "☕", start: 16.0, end: 18.5 },
  Dinner: { icon: "🌙", start: 19.0, end: 22.5 },
};
const mealOrder = ["Breakfast", "Lunch", "Evening Snacks", "Dinner"];

let menu = [];
let selectedDate = null;
let view = "today";

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

function indiaParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .formatToParts(date)
    .reduce((o, p) => ((o[p.type] = p.value), o), {});

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour) + Number(parts.minute) / 60,
  };
}

function currentTimeText() {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date());
}

function niceDate(iso) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${iso}T12:00:00+05:30`));
}

function compactDate(iso) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${iso}T12:00:00+05:30`));
}

function getDay(iso) {
  return menu.find((d) => d.date === iso);
}

function getRelevantMeal(hour) {
  for (const name of mealOrder) {
    if (hour <= mealMeta[name].end) return name;
  }
  return null;
}

function itemPriority(meal, category) {
  const c = category.trim().toLowerCase();
  if (meal === "Breakfast") {
    if (c === "main dish -01") return 0;
    if (c === "main dish -02") return 1;
    if (c === "egg prep") return 2;
    if (c === "fruits") return 3;
    if (c.startsWith("side dish")) return 4;
  }
  if (meal === "Lunch" || meal === "Dinner") {
    if (c === "veggie 1") return 0;
    if (c === "veggie 2") return 1;
    if (c === "non-veg" || c === "non veg") return 2;
  }
  if (meal === "Evening Snacks") {
    if (c === "snacks") return 0;
    if (c === "accompaniment") return 1;
  }
  return 10;
}

function orderedItems(meal, entries) {
  return entries.map((entry, index) => ({ entry, index }))
    .sort((a, b) => itemPriority(meal, a.entry[0]) - itemPriority(meal, b.entry[0]) || a.index - b.index)
    .map(({ entry }) => entry);
}

function topItems(meal, entries, max = 5) {
  return orderedItems(meal, entries).map(([, item]) => item).slice(0, max);
}

function itemColor(meal, category) {
  const c = category.trim().toLowerCase();
  if (c === "non-veg" || c === "non veg") return "diet-nonveg";
  if (c === "dessert") return "dish-dessert";
  if (c === "veggie 1" || c === "veggie 2") return "diet-veg";
  if ((meal === "Breakfast" && c.startsWith("main dish")) ||
      (meal === "Evening Snacks" && c === "snacks")) return "dish-main";
  if (meal === "Breakfast" && c === "egg prep") return "dish-egg";
  if (meal === "Breakfast" && c === "fruits") return "dish-fruit";
  return "";
}

function itemGrid(meal, entries, hero = false) {
  if (!entries.length) return '<div class="hero-empty">No items listed for this meal.</div>';
  const ordered = orderedItems(meal, entries);
  const featured = ordered.filter(([c]) => itemPriority(meal, c) < 10);
  const rest = ordered.filter(([c]) => itemPriority(meal, c) >= 10);
  const tiles = (items) => items.map(([category, item]) => `
    <div class="${hero ? "hero-menu-item" : "menu-item-only"} ${itemColor(meal, category)}">
      ${itemPriority(meal, category) < 10 ? `<span class="item-category">${escapeHtml(category)}</span>` : ""}
      <span class="item-name">${escapeHtml(item)}</span>
    </div>`).join("");
  return `<div class="menu-items-grid featured-items">${tiles(featured)}</div>
    ${rest.length ? `<div class="also-served">Also served</div><div class="menu-items-grid">${tiles(rest)}</div>` : ""}`;
}

function renderHero() {
  const now = indiaParts();
  const target = getDay(selectedDate);
  $("#hero").classList.toggle("is-current", Boolean(target) && selectedDate === now.date && getRelevantMeal(now.hour) !== null);

  if (!target) {
    $("#hero").innerHTML = `
      <div class="date">${niceDate(selectedDate)}</div>
      <div class="kicker">Menu status</div>
      <h2>No menu available</h2>
      <div class="hero-items">Choose one of the available menu dates below.</div>`;
    return;
  }

  let relevant;
  if (selectedDate === now.date) {
    relevant = getRelevantMeal(now.hour);
    if (relevant === null) {
      $("#hero").innerHTML = `
        <div class="date">${niceDate(selectedDate)}</div>
        <div class="kicker">Today's meals are over</div>
        <h2>🌙 Dinner finished</h2>
        <div class="hero-items">Use Tomorrow or browse upcoming menus.</div>
        <span class="status">Current time: ${currentTimeText()}</span>`;
      return;
    }
  } else {
    relevant = "Breakfast";
  }

  const entries = target.meals[relevant] || [];
  $("#hero").innerHTML = `
    <div class="date">${niceDate(selectedDate)}</div>
    <div class="kicker">${selectedDate === now.date ? "Current / next meal" : "Selected day"}</div>
    <h2>${mealMeta[relevant]?.icon || "🍽️"} ${relevant}</h2>
    ${itemGrid(relevant, entries, true)}
    <span class="status">${selectedDate === now.date ? `Current time: ${currentTimeText()}` : "Browse full menu below"}</span>`;
}

function mealCard(name, entries, highlight = false) {
  return `<article class="meal-card ${highlight ? "current" : ""}">
    <div class="meal-head">
      <div class="meal-title">
        <span class="meal-icon">${mealMeta[name]?.icon || "🍽️"}</span>
        <div><h3>${name}</h3></div>
      </div>
      ${highlight ? '<span class="badge">CURRENT / NEXT</span>' : ""}
    </div>
    ${itemGrid(name, entries)}
  </article>`;
}

function renderSingleDay(iso) {
  const day = getDay(iso);
  if (!day)
    return `<div class="empty"><h3>No menu for ${compactDate(iso)}</h3><p>Choose an available date.</p></div>`;

  const now = indiaParts();
  const relevant = iso === now.date ? getRelevantMeal(now.hour) : "";

  return mealOrder
    .filter((m) => day.meals[m])
    .map((m) => mealCard(m, day.meals[m], m === relevant))
    .join("");
}

function renderWeek() {
  $("#content").classList.add("week-grid");
  $("#content").innerHTML = menu
    .map(
      (day) => `
    <article class="day-card" data-date="${day.date}">
      <h3>${compactDate(day.date)}</h3>
      <div class="day-date">${day.date}</div>
      <div class="day-meals">
        ${mealOrder
          .filter((m) => day.meals[m])
          .map(
            (m) => `<div class="day-meal">
          <strong>${mealMeta[m].icon} ${m}</strong>
          <span>${topItems(m, day.meals[m], 4).map(escapeHtml).join(" • ")}</span>
        </div>`,
          )
          .join("")}
      </div>
    </article>`,
    )
    .join("");

  $$(".day-card").forEach((card) =>
    card.addEventListener("click", () => {
      selectedDate = card.dataset.date;
      view = "today";
      syncControls();
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }),
  );
}

function render() {
  renderHero();
  $("#content").classList.remove("week-grid");
  $("#content").classList.remove("hidden");

  if (view === "week") renderWeek();
  else {
    $("#content").innerHTML = renderSingleDay(selectedDate);
  }
}

function escapeHtml(s = "") {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[c],
  );
}

function syncControls() {
  $$(".tab").forEach((b) =>
    b.classList.toggle("active", b.dataset.view === view),
  );
  $("#dateSelect").value = selectedDate;
}

async function init() {
  menu = await fetch(DATA_URL, { cache: "no-store" }).then((r) => r.json());
  menu.sort((a, b) => a.date.localeCompare(b.date));

  const now = indiaParts();
  selectedDate =
    getDay(now.date)?.date ||
    menu.find((d) => d.date >= now.date)?.date ||
    menu.at(-1)?.date;

  $("#dateSelect").innerHTML = menu
    .map((d) => `<option value="${d.date}">${compactDate(d.date)}</option>`)
    .join("");
  $("#dateSelect").value = selectedDate;

  $$(".tab").forEach((b) =>
    b.addEventListener("click", () => {
      view = b.dataset.view;
      if (view === "today" || view === "tomorrow") {
        const day = new Date(`${indiaParts().date}T12:00:00+05:30`);
        if (view === "tomorrow") day.setDate(day.getDate() + 1);
        selectedDate = indiaParts(day).date;
      }
      syncControls();
      render();
    }),
  );

  $("#dateSelect").addEventListener("change", (e) => {
    selectedDate = e.target.value;
    view = "today";
    syncControls();
    render();
  });

  let deferredPrompt;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    $("#installBtn").classList.remove("hidden");
  });

  $("#installBtn").addEventListener("click", async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt = null;
      $("#installBtn").classList.add("hidden");
    }
  });

  if ("serviceWorker" in navigator && !["localhost", "127.0.0.1"].includes(location.hostname)) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  render();

  setInterval(() => {
    if (selectedDate === indiaParts().date) renderHero();
  }, 30000);
}

init().catch((err) => {
  console.error(err);
  $("#content").innerHTML = `
    <div class="empty">
      <h3>Could not load menu</h3>
      <p>Check data/menu.json.</p>
    </div>`;
});
