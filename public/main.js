const REFRESH_INTERVAL = 5 * 60 * 1000;

let globalStories = [];
let isRefreshing = false;

const categories = Object.entries(window.SOURCE_REGISTRY).map(([id, data]) => ({
  id,
  title: data.title,
  sources: data.sources.map((source) => source.rss)
}));

// 1. Dashboard and rendering

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

  categories.forEach((category) => {
    const card = document.createElement("div");
    card.className = "card";
    card.id = category.id;
    card.innerHTML = `
      <h3>${category.title}</h3>
      <div class="feed"></div>
    `;
    dashboard.appendChild(card);
  });
}

function createItem(text, index, link = null, isHot = false, isNew = false) {
  const div = document.createElement("div");
  div.className = "item";

  const timestamp = new Date().toLocaleTimeString();
  const content = link
    ? `<a href="${link}" target="_blank" style="color:inherit; text-decoration:none;">${text}</a>`
    : text;

  div.innerHTML = `
    <span class="rank">#${index + 1}</span>
    ${content}
    ${isHot ? '<span class="hot">HOT</span>' : ""}
    ${isNew ? '<span class="new">NEW</span>' : ""}
    <div class="timestamp">${timestamp}</div>
  `;

  requestAnimationFrame(() => {
    div.classList.add("show");

    if (isNew) {
      div.classList.add("new-flash");
      setTimeout(() => div.classList.remove("new-flash"), 4000);
    }
  });

  return div;
}

function renderItems(feed, items, createText) {
  const fragment = document.createDocumentFragment();

  items.forEach((item, index) => {
    fragment.appendChild(
      createItem(
        createText(item),
        index,
        item.link,
        item.isHot,
        item.isNew
      )
    );
  });

  feed.replaceChildren(fragment);
}

function renderCategory(category, items) {
  const feed = document.querySelector(`#${category.id} .feed`);
  if (!feed) return;

  if (items.length === 0) {
    feed.innerHTML = `
      <div style="color:#64748b;padding:10px 0;">
        No stories
      </div>
    `;
    return;
  }

  renderItems(feed, items, (item) => item.title);
}

function renderAllCategories() {
  categories.forEach((category) => {
    const items = globalStories
      .filter((item) => item.category === category.id)
      .sort((a, b) => b.score - a.score)
      .slice(0, 15);

    renderCategory(category, items);
  });
}

function renderGlobalFeed() {
  const feed = document.querySelector("#global .feed");
  if (!feed) return;

  const topStories = [...globalStories]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((item, index) => ({
      ...item,
      isHot: index < 3
    }));

  if (topStories.length === 0) {
    feed.innerHTML = `
      <div style="color:#64748b;padding:10px 0;">
        No stories
      </div>
    `;
    return;
  }

  renderItems(
    feed,
    topStories,
    (item) => `[${item.category}] ${item.title}`
  );
}

function renderSkeleton(cardId, itemCount = 6) {
  const feed = document.querySelector(`#${cardId} .feed`);
  if (!feed) return;

  const fragment = document.createDocumentFragment();

  for (let index = 0; index < itemCount; index += 1) {
    const skeleton = document.createElement("div");
    skeleton.className = "item skeleton";
    skeleton.innerHTML = `
      <span class="rank">#</span>
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
    `;
    fragment.appendChild(skeleton);
  }

  feed.replaceChildren(fragment);
}

function renderLoadingState() {
  renderSkeleton("global", 8);
  categories.forEach((category) => renderSkeleton(category.id));
}

// 2. Scoring and normalization

function scoreHeadline(title) {
  const lower = title.toLowerCase();
  const keywords = [
    "breaking", "win", "beats", "shock",
    "massive", "update", "deal", "record"
  ];

  let score = 0;

  for (const word of keywords) {
    if (lower.includes(word)) score += 2;
  }

  if (title === title.toUpperCase() && title.length > 10) {
    score += 2;
  }

  if (title.length > 40 && title.length < 120) {
    score += 2;
  }

  if (/[A-Z][a-z]+/.test(title)) {
    score += 1;
  }

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

// 3. Feed loading and refresh

async function loadRSSFeed(category) {
  const allItems = [];

  for (const feedUrl of category.sources) {
    const url = `/api/rss?url=${encodeURIComponent(feedUrl)}`;

    try {
      const response = await fetch(url);
      if (!response.ok) continue;

      const data = await response.json();
      const xmlText = data.xml;

      if (!xmlText || typeof xmlText !== "string") continue;
      if (!xmlText.includes("<item")) continue;

      const parser = new DOMParser();
      const xml = parser.parseFromString(xmlText, "text/xml");
      const items = Array.from(xml.getElementsByTagName("item"));

      const normalizedItems = items
        .map((item) => {
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
        .filter((item) => item.title && item.link);

      allItems.push(...normalizedItems);
    } catch (error) {
      console.error("Feed failed:", feedUrl, error);
    }
  }

  const categoryStories = new Map();

  allItems.forEach((item) => {
    const key = normalizeTitle(item.title);
    const existing = categoryStories.get(key);

    if (!existing || item.score > existing.score) {
      categoryStories.set(key, item);
    }
  });

  const cleaned = Array.from(categoryStories.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);

  const hotCutoff = Math.max(1, Math.floor(cleaned.length * 0.3));

  return cleaned.map((item, index) => ({
    ...item,
    isHot: index < hotCutoff
  }));
}

function mergeStories(categoryResults, previousKeys, isInitialLoad) {
  const nextStoryMap = new Map();

  categoryResults.flat().forEach((item) => {
    const key = normalizeTitle(item.title);
    const existing = nextStoryMap.get(key);
    const story = {
      ...item,
      isNew: !isInitialLoad && !previousKeys.has(key)
    };

    if (!existing || story.score > existing.score) {
      nextStoryMap.set(key, story);
    }
  });

  return Array.from(nextStoryMap.values());
}

async function refreshDashboard({ isInitialLoad = false } = {}) {
  if (isRefreshing) return;

  isRefreshing = true;
  const previousKeys = new Set(
    globalStories.map((item) => normalizeTitle(item.title))
  );

  try {
    const categoryResults = await Promise.all(
      categories.map((category) => loadRSSFeed(category))
    );

    globalStories = mergeStories(
      categoryResults,
      previousKeys,
      isInitialLoad
    );

    renderAllCategories();
    renderGlobalFeed();
  } catch (error) {
    console.error("Dashboard refresh failed:", error);
  } finally {
    isRefreshing = false;
  }
}

// 4. Boot

document.addEventListener("DOMContentLoaded", async () => {
  createDashboard();
  renderLoadingState();

  await refreshDashboard({ isInitialLoad: true });

  setInterval(() => {
    refreshDashboard();
  }, REFRESH_INTERVAL);
});
