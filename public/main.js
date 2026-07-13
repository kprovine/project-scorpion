const REFRESH_INTERVAL = 5 * 60 * 1000;
const HEADLINE_STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
  "has", "have", "in", "is", "it", "of", "on", "or", "that", "the",
  "this", "to", "was", "were", "will", "with"
]);

let globalStories = [];
const cardResultsById = new Map();
let isRefreshing = false;

const cards = Object.entries(window.CARD_REGISTRY).map(([id, data]) => ({
  id,
  title: data.title,
  renderer: data.renderer,
  contributesToTopStories: data.contributesToTopStories,
  maxItems: data.maxItems,
  providers: data.providers
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

  cards.forEach((cardConfig) => {
    const card = document.createElement("div");
    card.className = "card";
    card.id = cardConfig.id;
    card.innerHTML = `
      <h3>${cardConfig.title}</h3>
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

function renderCategory(card, items) {
  const feed = document.querySelector(`#${card.id} .feed`);
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
  cards.forEach((card) => {
    const items = [...(cardResultsById.get(card.id)?.items || [])]
      .sort(compareStories)
      .slice(0, card.maxItems);

    renderCategory(card, items);
  });
}

function renderGlobalFeed() {
  const feed = document.querySelector("#global .feed");
  if (!feed) return;

  const topStories = [...globalStories]
    .sort(compareStories)
    .slice(0, 10);

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
  cards.forEach((card) => renderSkeleton(card.id));
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

function renderRefreshStatuses(cardResults, updatedAt) {
  let unavailableSourceCount = 0;
  let cachedSourceCount = 0;
  let preservedCategoryCount = 0;

  cardResults.forEach((result) => {
    unavailableSourceCount += result.failedSources.length;
    cachedSourceCount += result.staleSources.length;
    if (result.preserved) preservedCategoryCount += 1;

    if (result.preserved) {
      renderFeedStatus(
        result.cardId,
        "Update failed • Showing previous stories",
        "error"
      );
      return;
    }

    if (result.items.length === 0) {
      renderFeedStatus(
        result.cardId,
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
      result.cardId,
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

function getSourceQualityBoost(source) {
  const weight = Number(source.qualityWeight);

  if (!Number.isFinite(weight)) return 0.5;
  return Math.min(1, Math.max(0, weight));
}

function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getHeadlineTokens(title) {
  return new Set(
    normalizeTitle(title)
      .split(" ")
      .filter((word) => word.length > 2 && !HEADLINE_STOP_WORDS.has(word))
  );
}

function areSimilarHeadlines(firstTitle, secondTitle) {
  const firstNormalized = normalizeTitle(firstTitle);
  const secondNormalized = normalizeTitle(secondTitle);

  if (firstNormalized === secondNormalized) return true;

  const firstTokens = getHeadlineTokens(firstTitle);
  const secondTokens = getHeadlineTokens(secondTitle);
  const smallerTokenCount = Math.min(firstTokens.size, secondTokens.size);

  if (smallerTokenCount < 4) return false;

  const sharedTokenCount = [...firstTokens]
    .filter((token) => secondTokens.has(token))
    .length;

  if (sharedTokenCount < 3) return false;

  const unionTokenCount = new Set([...firstTokens, ...secondTokens]).size;
  const jaccardSimilarity = sharedTokenCount / unionTokenCount;
  const containmentSimilarity = sharedTokenCount / smallerTokenCount;

  return jaccardSimilarity >= 0.6 || (
    sharedTokenCount >= 4 && containmentSimilarity >= 0.75
  );
}

function mergeDuplicateMetadata(primaryStory, duplicateStory) {
  const sourceNames = new Set([
    ...(primaryStory.sourceNames || [primaryStory.sourceName]),
    ...(duplicateStory.sourceNames || [duplicateStory.sourceName])
  ]);

  return {
    ...primaryStory,
    sourceNames: Array.from(sourceNames),
    sourceCount: sourceNames.size,
    duplicateCount: (primaryStory.duplicateCount || 1)
      + (duplicateStory.duplicateCount || 1)
  };
}

function deduplicateStories(stories) {
  const deduplicated = [];

  [...stories].sort(compareStories).forEach((story) => {
    const duplicateIndex = deduplicated.findIndex((existingStory) =>
      areSimilarHeadlines(existingStory.title, story.title)
    );

    if (duplicateIndex === -1) {
      deduplicated.push({
        ...story,
        sourceNames: story.sourceNames || [story.sourceName],
        sourceCount: story.sourceCount || 1,
        duplicateCount: story.duplicateCount || 1
      });
      return;
    }

    deduplicated[duplicateIndex] = mergeDuplicateMetadata(
      deduplicated[duplicateIndex],
      story
    );
  });

  return deduplicated;
}

function getPercentile(values, percentile) {
  if (values.length === 0) return 0;

  const sortedValues = [...values].sort((first, second) => first - second);
  const index = Math.max(
    0,
    Math.ceil(percentile * sortedValues.length) - 1
  );

  return sortedValues[index];
}

function calculateHotSignalScore(story) {
  const additionalSourceCount = Math.max(0, (story.sourceCount || 1) - 1);
  const crossSourceBoost = Math.min(3, additionalSourceCount * 1.5);

  return Number((story.score + crossSourceBoost).toFixed(2));
}

function applyHotDetection(stories) {
  if (stories.length === 0) return [];

  const storiesWithSignals = stories.map((story) => ({
    ...story,
    hotSignalScore: calculateHotSignalScore(story)
  }));
  const hotThreshold = getPercentile(
    storiesWithSignals.map((story) => story.hotSignalScore),
    0.8
  );

  return storiesWithSignals.map((story) => {
    const hasTimelyOrStrongEvidence = story.recencyBoost >= 1
      || story.sourceCount >= 2
      || story.baseScore >= 8;
    const hasMeaningfulSubstance = story.baseScore >= 3
      || story.sourceCount >= 2;

    return {
      ...story,
      isHot: story.hotSignalScore >= hotThreshold
        && hasTimelyOrStrongEvidence
        && hasMeaningfulSubstance
    };
  });
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

async function loadRSSProvider(provider, card, scoringTime) {
  const url = `/api/rss?url=${encodeURIComponent(provider.config.url)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { items: [], failed: true, stale: false };
    }

    const data = await response.json();
    const xmlText = data.xml;

    if (!xmlText || typeof xmlText !== "string" || !xmlText.includes("<item")) {
      return { items: [], failed: true, stale: false };
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
        const recencyBoost = calculateRecencyBoost(publishedAt, scoringTime);
        const sourceQualityBoost = getSourceQualityBoost(provider);

        return {
          title,
          link,
          baseScore,
          recencyBoost,
          sourceQualityBoost,
          score: baseScore + recencyBoost + sourceQualityBoost,
          category: card.id,
          sourceId: provider.id,
          sourceName: provider.name,
          publishedAt
        };
      })
      .filter((item) => item.title && item.link);

    return {
      items: normalizedItems,
      failed: normalizedItems.length === 0,
      stale: normalizedItems.length > 0 && Boolean(data.stale)
    };
  } catch (error) {
    console.error("RSS provider failed:", provider.config.url, error);
    return { items: [], failed: true, stale: false };
  }
}

const providerLoaders = {
  rss: loadRSSProvider
};

async function loadProvider(provider, card, scoringTime) {
  const loader = providerLoaders[provider.type];

  if (!loader) {
    console.error(`Unsupported provider type: ${provider.type}`);
    return { items: [], failed: true, stale: false };
  }

  return loader(provider, card, scoringTime);
}

async function loadCard(card, scoringTime) {
  const allItems = [];
  const failedSources = [];
  const staleSources = [];

  for (const provider of card.providers) {
    const result = await loadProvider(provider, card, scoringTime);

    if (result.failed) {
      failedSources.push(provider.name);
      continue;
    }

    if (result.stale) {
      staleSources.push(provider.name);
    }

    allItems.push(...result.items);
  }

  const cleaned = deduplicateStories(allItems)
    .slice(0, card.maxItems);

  return {
    cardId: card.id,
    items: cleaned,
    failedSources,
    staleSources,
    preserved: false
  };
}

function mergeStories(cardResults, previousKeys, isInitialLoad) {
  const deduplicatedStories = deduplicateStories(
    cardResults.flatMap((result) => result.items)
  );

  return applyHotDetection(deduplicatedStories).map((item) => {
    const key = normalizeTitle(item.title);

    return {
      ...item,
      isNew: !isInitialLoad && !previousKeys.has(key)
    };
  });
}

async function refreshDashboard({ isInitialLoad = false } = {}) {
  if (isRefreshing) return;

  isRefreshing = true;
  const previousKeys = new Set(
    globalStories.map((item) => normalizeTitle(item.title))
  );

  try {
    const scoringTime = Date.now();
    const cardResults = await Promise.all(
      cards.map((card) => loadCard(card, scoringTime))
    );

    cardResults.forEach((result) => {
      const previousStories = cardResultsById.get(result.cardId)?.items || [];

      if (result.items.length === 0 && previousStories.length > 0) {
        result.items = previousStories.map((item) => ({
          ...item,
          isNew: false
        }));
        result.preserved = true;
      }
    });

    globalStories = mergeStories(
      cardResults,
      previousKeys,
      isInitialLoad
    );

    cardResults.forEach((result) => {
      cardResultsById.set(result.cardId, {
        ...result,
        items: globalStories.filter((item) => item.category === result.cardId)
      });
    });

    renderAllCategories();
    renderGlobalFeed();
    renderRefreshStatuses(cardResults, new Date());
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
