const REFRESH_INTERVAL = 5 * 60 * 1000;

let globalStories = [];
let isRefreshing = false;

const categories = Object.entries(window.SOURCE_REGISTRY).map(([id, data]) => ({
  id,
  title: data.title,
  sources: data.sources
}));

// 1. Dashboard and rendering

function createDashboard() {
  const dashboard = document.getElementById("dashboard");

  const globalCard = document.createElement("div");
  globalCard.className = "card";
  globalCard.id = "global";
  globalCard.innerHTML = `
    <h3>🔥 Top Stories</h3>
    <div class="feed-status">Loading sources…</div>
    <div class="feed"></div>
  `;
  dashboard.appendChild(globalCard);

  categories.forEach((category) => {
    const card = document.createElement("div");
    card.className = "card";
    card.id = category.id;
    card.innerHTML = `
      <h3>${category.title}</h3>
      <div class="feed-status">Loading sources…</div>
      <div class="feed"></div>
    `;
    dashboard.appendChild(card);
  });
}

function createItem(text, index, item) {
  const div = document.createElement("div");
  div.className = "item";

  const content = item.link
    ? `<a href="${item.link}" target="_blank" style="color:inherit; text-decoration:none;">${text}</a>`
    : text;
  const metadata = `${item.sourceName} • ${formatPublishedAt(item.publishedAt)}`;

  div.innerHTML = `
    <span class="rank">#${index + 1}</span>
    ${content}
    ${item.isHot ? '<span class="hot">HOT</span>' : ""}
    ${item.isNew ? '<span class="new">NEW</span>' : ""}
    <div class="timestamp">${metadata}</div>
  `;

  requestAnimationFrame(() => {
    div.classList.add("show");

    if (item.isNew) {
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
        item
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
      .sort(compareStories)
      .slice(0, 15);

    renderCategory(category, items);
  });
}

function renderGlobalFeed() {
  const feed = document.querySelector("#global .feed");
  if (!feed) return;

  const topStories = [...globalStories]
    .sort(compareStories)
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

function formatUpdatedAt(updatedAt) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit"
  }).format(updatedAt);
}

function renderFeedStatus(cardId, message, state = "healthy") {
  const status = document.querySelector(`#${cardId} .feed-status`);
  if (!status) return;

  status.textContent = message;
  status.className = `feed-status ${state}`;
}

function renderRefreshStatuses(categoryResults, updatedAt) {
  let unavailableSourceCount = 0;
  let cachedSourceCount = 0;
  let preservedCategoryCount = 0;

  categoryResults.forEach((result) => {
    unavailableSourceCount += result.failedSources.length;
    cachedSourceCount += result.staleSources.length;
    if (result.preserved) preservedCategoryCount += 1;

    if (result.preserved) {
      renderFeedStatus(
        result.categoryId,
        "Update failed • Showing previous stories",
        "error"
      );
      return;
    }

    if (result.items.length === 0) {
      renderFeedStatus(
        result.categoryId,
        "Feed unavailable • Retrying automatically",
        "error"
      );
      return;
    }

    const details = [];
    if (result.failedSources.length > 0) {
      details.push(`${result.failedSources.length} source unavailable`);
    }
    if (result.staleSources.length > 0) {
      details.push(`${result.staleSources.length} source using cached data`);
    }

    const message = details.length > 0
      ? `Updated ${formatUpdatedAt(updatedAt)} • ${details.join(" • ")}`
      : `Updated ${formatUpdatedAt(updatedAt)}`;

    renderFeedStatus(
      result.categoryId,
      message,
      details.length > 0 ? "degraded" : "healthy"
    );
  });

  const globalDetails = [];
  if (preservedCategoryCount > 0) {
    globalDetails.push(`${preservedCategoryCount} category showing previous stories`);
  }
  if (unavailableSourceCount > 0) {
    globalDetails.push(`${unavailableSourceCount} source unavailable`);
  }
  if (cachedSourceCount > 0) {
    globalDetails.push(`${cachedSourceCount} source using cached data`);
  }

  const globalMessage = globalDetails.length > 0
    ? `Updated ${formatUpdatedAt(updatedAt)} • ${globalDetails.join(" • ")}`
    : `Updated ${formatUpdatedAt(updatedAt)}`;

  renderFeedStatus(
    "global",
    globalMessage,
    globalDetails.length > 0 ? "degraded" : "healthy"
  );
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

  return score;
}

function calculateRecencyBoost(publishedAt, referenceTime = Date.now()) {
  if (!publishedAt) return 0;

  const publishedTime = new Date(publishedAt).getTime();
  if (Number.isNaN(publishedTime)) return 0;

  const ageInHours = Math.max(
    0,
    (referenceTime - publishedTime) / (60 * 60 * 1000)
  );

  if (ageInHours >= 72) return 0;

  const boost = 3 * (1 - ageInHours / 72);
  return Number(boost.toFixed(2));
}

function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function compareStories(firstStory, secondStory) {
  const scoreDifference = secondStory.score - firstStory.score;
  if (scoreDifference !== 0) return scoreDifference;

  return normalizeTitle(firstStory.title).localeCompare(
    normalizeTitle(secondStory.title)
  );
}

function getElementText(item, tagNames) {
  for (const tagName of tagNames) {
    const value = item.getElementsByTagName(tagName)[0]?.textContent?.trim();
    if (value) return value;
  }

  return null;
}

function parsePublishedAt(item) {
  const dateText = getElementText(item, [
    "pubDate",
    "dc:date",
    "published",
    "updated"
  ]);

  if (!dateText) return null;

  const timestamp = Date.parse(dateText);
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
}

function formatPublishedAt(publishedAt) {
  if (!publishedAt) return "Publication time unavailable";

  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) return "Publication time unavailable";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

// 3. Feed loading and refresh

async function loadRSSFeed(category, scoringTime) {
  const allItems = [];
  const failedSources = [];
  const staleSources = [];

  for (const source of category.sources) {
    const url = `/api/rss?url=${encodeURIComponent(source.rss)}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        failedSources.push(source.name);
        continue;
      }

      const data = await response.json();
      const xmlText = data.xml;

      if (!xmlText || typeof xmlText !== "string" || !xmlText.includes("<item")) {
        failedSources.push(source.name);
        continue;
      }

      const parser = new DOMParser();
      const xml = parser.parseFromString(xmlText, "text/xml");
      const items = Array.from(xml.getElementsByTagName("item"));

      const normalizedItems = items
        .map((item) => {
          const title = item.querySelector("title")?.textContent || "";
          const link = item.querySelector("link")?.textContent || "";
          const publishedAt = parsePublishedAt(item);
          const baseScore = scoreHeadline(title);
          const recencyBoost = calculateRecencyBoost(
            publishedAt,
            scoringTime
          );

          return {
            title,
            link,
            baseScore,
            recencyBoost,
            score: baseScore + recencyBoost,
            category: category.id,
            sourceId: source.id,
            sourceName: source.name,
            publishedAt
          };
        })
        .filter((item) => item.title && item.link);

      if (normalizedItems.length === 0) {
        failedSources.push(source.name);
        continue;
      }

      if (data.stale) {
        staleSources.push(source.name);
      }

      allItems.push(...normalizedItems);
    } catch (error) {
      failedSources.push(source.name);
      console.error("Feed failed:", source.rss, error);
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
    .sort(compareStories)
    .slice(0, 15);

  const hotCutoff = Math.max(1, Math.floor(cleaned.length * 0.3));

  return {
    categoryId: category.id,
    items: cleaned.map((item, index) => ({
      ...item,
      isHot: index < hotCutoff
    })),
    failedSources,
    staleSources,
    preserved: false
  };
}

function mergeStories(categoryResults, previousKeys, isInitialLoad) {
  const nextStoryMap = new Map();

  categoryResults.flatMap((result) => result.items).forEach((item) => {
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
  const previousStoriesByCategory = new Map(
    categories.map((category) => [
      category.id,
      globalStories.filter((item) => item.category === category.id)
    ])
  );

  try {
    const scoringTime = Date.now();
    const categoryResults = await Promise.all(
      categories.map((category) => loadRSSFeed(category, scoringTime))
    );

    categoryResults.forEach((result) => {
      const previousStories = previousStoriesByCategory.get(result.categoryId) || [];

      if (result.items.length === 0 && previousStories.length > 0) {
        result.items = previousStories.map((item) => ({
          ...item,
          isNew: false
        }));
        result.preserved = true;
      }
    });

    globalStories = mergeStories(
      categoryResults,
      previousKeys,
      isInitialLoad
    );

    renderAllCategories();
    renderGlobalFeed();
    renderRefreshStatuses(categoryResults, new Date());
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
