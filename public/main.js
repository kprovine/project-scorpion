
let globalStories = [];

let storyMap = new Map();

let itemState = {};

const categories = Object.entries(window.SOURCE_REGISTRY).map(([id, data]) => ({
  id,
  title: data.title,
  sources: data.sources.map(s => s.rss)
}));

// 1. helpers

function createDashboard() {
  const dashboard = document.getElementById("dashboard");

  const globalCard = document.createElement("div");
  globalCard.className = "card";
  globalCard.id = "global";

  globalCard.innerHTML = `
    <h3>🔥 Top Stories</h3>
    <div class="feed"></div>
  `;

  dashboard.appendChild(globalCard);

  categories.forEach(cat => {
    const card = document.createElement("div");
    card.className = "card";
    card.id = cat.id;

    card.innerHTML = `
      <h3>${cat.title}</h3>
      <div class="feed"></div>
    `;

    dashboard.appendChild(card);
  });
}

function createItem(text, index, link = null, score = 0, isHot = false, isNew = false) {

  const div = document.createElement("div");
  div.className = "item";

  // force reflow-friendly stagger timing
  setTimeout(() => {
    div.classList.add("show");
  }, index * 40); // stagger effect

  const timestamp = new Date().toLocaleTimeString();

  const content = link
    ? `<a href="${link}" target="_blank" style="color:inherit; text-decoration:none;">${text}</a>`
    : text;

    div.innerHTML = `
    <span class="rank">#${index + 1}</span>
    ${content}
    ${isHot ? '<span class="hot">HOT</span>' : ''}
    ${isNew ? '<span class="new">NEW</span>' : ''}
    <div class="timestamp">${timestamp}</div>
  `;

  return div;
}

function renderCategory(category, items) {

  const container = document.getElementById(category.id);
  if (!container) return;

  container.innerHTML = `<h3>${category.title}</h3>`;

  if (!items || items.length === 0) {
    container.innerHTML += `
      <div style="color:#64748b;padding:10px 0;">
        No stories
      </div>
    `;
    return;
  }

  items.forEach((item, index) => {

    const el = createItem(
      item.title,
      index,
      item.link,
      item.score,
      item.isHot
    );

    container.appendChild(el);

    setTimeout(() => {
      el.classList.add("show");
    }, index * 60);

  });
}

function renderAllCategories(allData) {

  const grouped = {};

  allData.forEach(item => {
    if (!grouped[item.category]) {
      grouped[item.category] = [];
    }
    grouped[item.category].push(item);
  });

  categories.forEach(cat => {
    renderCategory(cat, grouped[cat.id] || []);
  });
}

function renderGlobalFeed() {
  const container = document.getElementById("global");
  if (!container) return;

  // fade OUT old skeleton or old content (very subtle)
  container.style.opacity = 0.6;

  setTimeout(() => {
    container.innerHTML = "<h3>🔥 Top Stories</h3>";

    const top = globalStories
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    top.forEach((item, index) => {

      const id = `global:${normalizeTitle(item.title)}`;
      const state = getItemState(id);

      const isNew = (Date.now() - state.firstSeen) < 10 * 60 * 1000;

      const el = createItem(
        `[${item.category}] ${item.title}`,
        index,
        item.link,
        item.score,
        index < 3,
        isNew
      );

      container.appendChild(el);

      setTimeout(() => el.classList.add("show"), index * 40);
    });

    // fade back in
    container.style.opacity = 1;

  }, 80);
}

function streamGlobalFeed() {
  const container = document.getElementById("global");
  if (!container) return;

  const top = globalStories
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const header = container.querySelector("h3");

  top.forEach((item, index) => {

    const id = `global:${normalizeTitle(item.title)}`;
    const state = getItemState(id);

    if (state.renderedGlobal) return;
    state.renderedGlobal = true;

    const isNew =
      (Date.now() - state.firstSeen) < 10 * 60 * 1000;

    const el = createItem(
      `[${item.category}] ${item.title}`,
      index,
      item.link,
      item.score,
      index < 3,
      isNew
    );

    el.style.opacity = "0";
    el.style.transform = "translateY(-6px)";

    const feed = container.querySelector(".feed");
feed.prepend(el);

    requestAnimationFrame(() => {
      el.classList.add("show");
      el.classList.add("new-flash");
    });

    setTimeout(() => {
      el.classList.remove("new-flash");
    }, 4000);

  });
}

function streamCategories() {

  categories.forEach(cat => {

    const container = document.getElementById(cat.id);
    const feed = container.querySelector(".feed");
    if (!container) return;

    const header = container.querySelector("h3");

    const items = globalStories
      .filter(i => i.category === cat.id)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    items.forEach((item, index) => {

      const id = `${cat.id}:${normalizeTitle(item.title)}`;
      const state = getItemState(id);

      if (state.renderedCategories[cat.id]) return;
      state.renderedCategories[cat.id] = true;

      const isNew =
        (Date.now() - state.firstSeen) < 10 * 60 * 1000;

      const el = createItem(
        item.title,
        index,
        item.link,
        item.score,
        item.isHot,
        isNew
      );

      // IMPORTANT: start hidden
      el.style.opacity = "0";
      el.style.transform = "translateY(-6px)";

      const feed = container.querySelector(".feed");
feed.prepend(el);

      // animate in next frame
      requestAnimationFrame(() => {
        el.classList.add("show");
      });

    });

  });
}

function renderSkeleton(categoryId) {
  const container = document.getElementById(categoryId);
  if (!container) return;

  container.innerHTML = `<h3>Loading...</h3>`;

  for (let i = 0; i < 6; i++) {
    const skeleton = document.createElement("div");
    skeleton.className = "item skeleton";

    skeleton.innerHTML = `
      <span class="rank">#</span>
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
    `;

    container.appendChild(skeleton);
  }
}

function renderTopStoriesSkeleton() {
  let container = document.getElementById("global");

  if (!container) {
    const dashboard = document.getElementById("dashboard");
    container = document.createElement("div");
    container.className = "card";
    container.id = "global";
    container.innerHTML = "<h3>🔥 Top Stories</h3>";
    dashboard.prepend(container);
  }

  container.innerHTML = "<h3>🔥 Top Stories</h3>";

  for (let i = 0; i < 8; i++) {
    const skeleton = document.createElement("div");
    skeleton.className = "skeleton-item";
    container.appendChild(skeleton);
  }
}

// 2. scoring + utils

function scoreHeadline(title) {

  const lower = title.toLowerCase();

  // 1. keyword signal
  const keywords = [
    "breaking", "win", "beats", "shock",
    "massive", "update", "deal", "record"
  ];

  let score = 0;

  for (const word of keywords) {
    if (lower.includes(word)) score += 2;
  }

  // 2. urgency signal (caps / intensity)
  if (title === title.toUpperCase() && title.length > 10) {
    score += 2;
  }

  // 3. length signal (very short = often noise, medium = best)
  if (title.length > 40 && title.length < 120) {
    score += 2;
  }

  // 4. entity signal (simple heuristic)
  if (/[A-Z][a-z]+/.test(title)) {
    score += 1;
  }

  // 5. novelty bonus (random small jitter so feeds don’t feel static)
  score += Math.random() * 0.5;

  return score;
}

function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getItemState(id) {
  if (!itemState[id]) {
    itemState[id] = {
      renderedGlobal: false,
      renderedCategories: {},
      firstSeen: Date.now()
    };
  }
  return itemState[id];
}

// 3. data layer

async function loadRSSFeed(category) {

  const allItems = [];

  for (const feedUrl of category.sources) {

    const url = `/api/rss?url=${encodeURIComponent(feedUrl)}`;

    try {
      const res = await fetch(url);

      if (!res.ok) continue;

      const data = await res.json();
      const xmlText = data.xml;

      if (!xmlText || typeof xmlText !== "string") continue;
      if (!xmlText.includes("<item")) continue;

      const parser = new DOMParser();
      const xml = parser.parseFromString(xmlText, "text/xml");

      const items = Array.from(xml.getElementsByTagName("item"));

      const cleaned = items
        .map(item => {
          const title = item.querySelector("title")?.textContent || "";
          const link = item.querySelector("link")?.textContent || "";

          return {
            title,
            link,
            score: scoreHeadline(title),
            category: category.id,
            source: feedUrl   
          };
        })
        .filter(i => i.title && i.link);

      allItems.push(...cleaned);

    } catch (err) {
      console.error(`Feed failed:`, feedUrl, err);
    }
  }

  let cleaned = allItems;

  cleaned.sort((a, b) => b.score - a.score);
  cleaned = cleaned.slice(0, 15);

  const hotCutoff = Math.max(1, Math.floor(cleaned.length * 0.3));

  cleaned = cleaned.map((item, index) => ({
    ...item,
    isHot: index < hotCutoff
  }));

  // -------------------------
  // DEDUPE 
  // -------------------------

  cleaned.forEach(item => {

    const key = normalizeTitle(item.title);

    if (!storyMap.has(key)) {
      storyMap.set(key, item);
    } else {
      const existing = storyMap.get(key);

      if (item.score > existing.score) {
        storyMap.set(key, {
          ...existing,
          ...item,
          score: item.score
        });
      }
    }
  });

  return cleaned;
}

// 4. boot

document.addEventListener("DOMContentLoaded", async () => {

  storyMap = new Map();
  globalStories = [];

  createDashboard();

  renderTopStoriesSkeleton?.();
  categories.forEach(cat => renderSkeleton(cat.id));

  await Promise.all(categories.map(loadRSSFeed));

  globalStories = Array.from(storyMap.values());

  renderAllCategories(globalStories);
  renderGlobalFeed();

  setInterval(() => {
    streamGlobalFeed();
    streamCategories();
  }, 60000);
});
