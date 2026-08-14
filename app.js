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

function topItems(entries, max = 5) {
  const ignored = /^(tea|coffee|milk|bread|butter|jam|accompaniment|add)/i;
  const primary = entries.filter(([c]) => !ignored.test(c)).map(([, v]) => v);
  const fallback = entries.map(([, v]) => v);
  return (primary.length ? primary : fallback).slice(0, max);
}

function isSecondary(category) {
  return /tea|coffee|milk|bread|butter|jam|accompaniment|add/i.test(category);
}

function renderHero() {
  const now = indiaParts();
  const target = getDay(selectedDate);

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
        <span class="status">Based on India time</span>`;
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
    <div class="hero-items">${topItems(entries, 6).join(" • ")}</div>
    <span class="status">${selectedDate === now.date ? "Based on India time" : "Browse full menu below"}</span>`;
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
    <div class="menu-grid">
      ${entries
        .map(
          ([cat, item]) => `<div class="menu-row">
        <div class="category">${escapeHtml(cat)}</div>
        <div class="item ${isSecondary(cat) ? "secondary" : ""}">${escapeHtml(item)}</div>
      </div>`,
        )
        .join("")}
    </div>
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
          <span>${topItems(day.meals[m], 4).map(escapeHtml).join(" • ")}</span>
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
  else if (view === "tomorrow") {
    const idx = menu.findIndex((d) => d.date === selectedDate);
    const next = menu[Math.min(idx + 1, menu.length - 1)]?.date || selectedDate;
    $("#content").innerHTML = renderSingleDay(next);
  } else {
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

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  render();
}

init().catch((err) => {
  console.error(err);
  $("#content").innerHTML = `
    <div class="empty">
      <h3>Could not load menu</h3>
      <p>Check data/menu.json.</p>
    </div>`;
});
