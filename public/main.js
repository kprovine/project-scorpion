const REFRESH_INTERVAL = 5 * 60 * 1000;
const COLLAPSED_STORY_COUNT = 5;
const COLLECTION_ITEM_LIMIT = 5;
const HEADLINE_STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
  "has", "have", "in", "is", "it", "of", "on", "or", "that", "the",
  "this", "to", "was", "were", "will", "with"
]);

let topStories = [];
const cardResultsById = new Map();
const expandedCardIds = new Set();
const expandedCollectionIds = new Set();
let isRefreshing = false;
let temporaryCardCount = 0;
let toastTimeoutId = null;

const cards = Object.entries(window.CARD_REGISTRY).map(([id, data]) => ({
  id,
  title: data.title,
  renderer: data.renderer,
  contributesToTopStories: data.contributesToTopStories,
  maxItems: data.maxItems,
  providers: data.providers
}));
const topStoryCardIds = new Set(
  cards
    .filter((card) => card.contributesToTopStories)
    .map((card) => card.id)
);

const CARD_COLORS = {
  global: "#b97855",
  gaming: "#7a6e9b",
  sports: "#66856c",
  markets: "#ad8752"
};

const COLLECTION_COLORS = {
  favorites: "#c79042",
  gaming: "#7a6e9b",
  sports: "#66856c",
  markets: "#ad8752"
};

const FAVORITE_SOURCE_IDS = new Set(["ign", "espn", "cnbc"]);
const FAVORITE_SOURCE_ORDER = ["ign", "espn", "cnbc"];
const WORKSPACE_CARD_ORDER = ["gaming", "sports", "markets"];

// 1. Dashboard and rendering

function createDashboard() {
  const topStoriesSlot = document.getElementById("top-stories-slot");
  const cardGrid = document.getElementById("card-grid");

  topStoriesSlot.appendChild(createStoryCardShell({
    id: "global",
    title: "Top Stories",
    kicker: "Across your Collection",
    isTopStories: true
  }));

  const workspaceCards = [...cards].sort((first, second) =>
    WORKSPACE_CARD_ORDER.indexOf(first.id) - WORKSPACE_CARD_ORDER.indexOf(second.id)
  );
  workspaceCards.forEach((card) => {
    cardGrid.appendChild(createStoryCardShell({
      id: card.id,
      title: card.title,
      kicker: `${card.providers.length} sources`
    }));
  });

  const addCardButton = document.createElement("button");
  addCardButton.className = "add-card-button";
  addCardButton.id = "add-card";
  addCardButton.type = "button";
  addCardButton.innerHTML = `
    <span class="add-card-icon" aria-hidden="true">+</span>
    <strong>Add Card</strong>
    <small>Make room for something new</small>
  `;
  cardGrid.appendChild(addCardButton);
}

function createStoryCardShell({ id, title, kicker, isTopStories = false }) {
  const card = document.createElement("article");
  card.className = `workspace-card${isTopStories ? " top-stories-card" : ""}`;
  card.id = id;
  card.style.setProperty("--card-color", CARD_COLORS[id] || CARD_COLORS.global);

  const heading = document.createElement("div");
  heading.className = "card-heading";
  heading.innerHTML = `
    <div class="card-title-group">
      <span class="card-accent" aria-hidden="true"></span>
      <div>
        <h3></h3>
        <span class="card-kicker"></span>
      </div>
    </div>
    <div class="feed-status">Loading sources…</div>
  `;
  heading.querySelector("h3").textContent = title;
  heading.querySelector(".card-kicker").textContent = kicker;

  const feed = document.createElement("div");
  feed.className = "feed";

  const footer = document.createElement("footer");
  footer.className = "card-footer";
  const toggle = document.createElement("button");
  toggle.className = "card-toggle";
  toggle.type = "button";
  toggle.dataset.cardId = id;
  toggle.setAttribute("aria-expanded", "false");
  toggle.textContent = "Show More";
  footer.appendChild(toggle);

  card.append(heading, feed, footer);
  return card;
}

function createStoryItem(item, index, { showCategory = false } = {}) {
  const story = document.createElement("article");
  story.className = "story-item";

  const rank = document.createElement("span");
  rank.className = "story-rank";
  rank.textContent = index + 1;

  const content = document.createElement("div");
  content.className = "story-content";

  const title = document.createElement(item.link ? "a" : "span");
  title.className = "story-title";
  title.textContent = item.title;
  if (item.link) {
    title.href = item.link;
    title.target = "_blank";
    title.rel = "noopener noreferrer";
  }
  content.appendChild(title);

  if (item.isHot) {
    content.appendChild(createStoryBadge("HOT", "hot"));
  }
  if (item.isNew) {
    content.appendChild(createStoryBadge("NEW", "new"));
  }

  const metadata = document.createElement("div");
  metadata.className = "story-metadata";
  if (showCategory) {
    const category = document.createElement("span");
    category.className = "story-category";
    category.textContent = item.category;
    metadata.append(category, createMetadataSeparator());
  }

  const source = document.createElement("span");
  source.textContent = item.sourceName;
  const published = document.createElement("span");
  published.textContent = formatPublishedAt(item.publishedAt);
  metadata.append(source, createMetadataSeparator(), published);
  content.appendChild(metadata);
  story.append(rank, content);

  requestAnimationFrame(() => {
    story.classList.add("show");

    if (item.isNew) {
      story.classList.add("new-flash");
      setTimeout(() => story.classList.remove("new-flash"), 4000);
    }
  });

  return story;
}

function createStoryBadge(text, variant) {
  const badge = document.createElement("span");
  badge.className = `story-badge ${variant}`;
  badge.textContent = text;
  return badge;
}

function createMetadataSeparator() {
  const separator = document.createElement("span");
  separator.textContent = "•";
  separator.setAttribute("aria-hidden", "true");
  return separator;
}

function renderStoryItems(feed, items, options) {
  const fragment = document.createDocumentFragment();

  items.forEach((item, index) => {
    fragment.appendChild(createStoryItem(item, index, options));
  });

  feed.replaceChildren(fragment);
}

function renderStoryListCard(card, result) {
  const feed = document.querySelector(`#${card.id} .feed`);
  if (!feed) return;

  const isExpanded = expandedCardIds.has(card.id);
  const visibleCount = isExpanded ? card.maxItems : COLLAPSED_STORY_COUNT;
  const items = [...result.items]
    .sort(compareStories)
    .slice(0, visibleCount);

  if (items.length === 0) {
    renderEmptyStoryState(feed);
    updateCardToggle(card.id, 0, card.maxItems);
    return;
  }

  renderStoryItems(feed, items);
  updateCardToggle(card.id, result.items.length, card.maxItems);
}

const cardRenderers = {
  "story-list": renderStoryListCard
};

function renderCard(card, result) {
  const renderer = cardRenderers[card.renderer];

  if (!renderer) {
    const feed = document.querySelector(`#${card.id} .feed`);
    if (feed) {
      feed.innerHTML = `
        <div style="color:#64748b;padding:10px 0;">
          Card renderer unavailable
        </div>
      `;
    }
    console.error(`Unsupported card renderer: ${card.renderer}`);
    return;
  }

  renderer(card, result);
}

function renderAllCards() {
  cards.forEach((card) => {
    const result = cardResultsById.get(card.id) || { items: [] };

    renderCard(card, result);
  });
}

function renderGlobalFeed() {
  const feed = document.querySelector("#global .feed");
  if (!feed) return;

  const isExpanded = expandedCardIds.has("global");
  const visibleCount = isExpanded ? 10 : COLLAPSED_STORY_COUNT;
  const rankedTopStories = [...topStories]
    .sort(compareStories)
    .slice(0, visibleCount);

  if (rankedTopStories.length === 0) {
    renderEmptyStoryState(feed);
    updateCardToggle("global", 0, 10);
    return;
  }

  renderStoryItems(feed, rankedTopStories, { showCategory: true });
  updateCardToggle("global", topStories.length, 10);
}

function renderEmptyStoryState(feed) {
  const empty = document.createElement("div");
  empty.className = "card-empty-state";
  empty.textContent = "No stories are available right now.";
  feed.replaceChildren(empty);
}

function updateCardToggle(cardId, itemCount, expandedLimit) {
  const toggle = document.querySelector(`[data-card-id="${cardId}"]`);
  if (!toggle) return;

  const hasMore = itemCount > COLLAPSED_STORY_COUNT;
  const isExpanded = expandedCardIds.has(cardId);
  toggle.hidden = !hasMore;
  toggle.setAttribute("aria-expanded", String(isExpanded));
  toggle.textContent = isExpanded ? "Show Less" : "Show More";

  if (isExpanded && itemCount > expandedLimit) {
    toggle.title = `Showing the top ${expandedLimit} stories`;
  } else {
    toggle.removeAttribute("title");
  }
}

function renderSkeleton(cardId, itemCount = COLLAPSED_STORY_COUNT) {
  const feed = document.querySelector(`#${cardId} .feed`);
  if (!feed) return;

  const fragment = document.createDocumentFragment();

  for (let index = 0; index < itemCount; index += 1) {
    const skeleton = document.createElement("div");
    skeleton.className = "skeleton-story";
    skeleton.innerHTML = `
      <span class="skeleton-rank"></span>
      <div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line short"></div>
      </div>
    `;
    fragment.appendChild(skeleton);
  }

  feed.replaceChildren(fragment);
}

function renderLoadingState() {
  renderSkeleton("global");
  cards.forEach((card) => renderSkeleton(card.id));
}

function toggleStoryCard(cardId) {
  if (expandedCardIds.has(cardId)) {
    expandedCardIds.delete(cardId);
  } else {
    expandedCardIds.add(cardId);
  }

  if (cardId === "global") {
    renderGlobalFeed();
    return;
  }

  const card = cards.find((candidate) => candidate.id === cardId);
  if (!card) return;
  renderCard(card, cardResultsById.get(cardId) || { items: [] });
}

function createCollection() {
  const collectionSections = document.getElementById("collection-sections");
  const favoriteProviders = cards
    .flatMap((card) => card.providers)
    .filter((provider) => FAVORITE_SOURCE_IDS.has(provider.id))
    .sort((first, second) =>
      FAVORITE_SOURCE_ORDER.indexOf(first.id)
      - FAVORITE_SOURCE_ORDER.indexOf(second.id)
    );
  const sections = [
    { id: "favorites", title: "Favorites", providers: favoriteProviders },
    ...["gaming", "sports", "markets"]
      .map((id) => cards.find((card) => card.id === id))
      .filter(Boolean)
      .map((card) => ({
        id: card.id,
        title: card.title,
        providers: card.providers
      }))
  ];

  sections.forEach((section) => {
    collectionSections.appendChild(createCollectionSection(section));
  });
}

function createCollectionSection(section) {
  const container = document.createElement("section");
  container.className = "collection-section";
  container.dataset.collectionSection = section.id;
  container.dataset.sourceNames = section.providers
    .map((provider) => provider.name.toLowerCase())
    .join(" ");

  const heading = document.createElement("h2");
  heading.className = "collection-section-heading";
  heading.innerHTML = `<span class="collection-dot" aria-hidden="true"></span>`;
  heading.style.setProperty("--section-color", COLLECTION_COLORS[section.id]);
  heading.appendChild(document.createTextNode(section.title));

  const list = document.createElement("ul");
  list.className = "collection-list";
  section.providers.forEach((provider, index) => {
    list.appendChild(createCollectionItem(provider, section.id, index));
  });

  container.append(heading, list);

  if (section.providers.length > COLLECTION_ITEM_LIMIT) {
    const toggle = document.createElement("button");
    toggle.className = "collection-more";
    toggle.type = "button";
    toggle.dataset.collectionToggle = section.id;
    toggle.textContent = "Show More";
    toggle.setAttribute("aria-expanded", "false");
    container.appendChild(toggle);
  }

  return container;
}

function createCollectionItem(provider, sectionId, index) {
  const item = document.createElement("li");
  item.className = "collection-item";
  item.dataset.sourceName = provider.name.toLowerCase();
  item.dataset.collectionIndex = index;
  item.hidden = index >= COLLECTION_ITEM_LIMIT;

  const avatar = document.createElement("span");
  avatar.className = "source-avatar";
  avatar.textContent = getSourceInitials(provider.name);
  avatar.style.setProperty(
    "--avatar-color",
    `color-mix(in srgb, ${COLLECTION_COLORS[sectionId]} 18%, white)`
  );
  avatar.style.setProperty("--avatar-ink", COLLECTION_COLORS[sectionId]);

  const name = document.createElement("span");
  name.textContent = provider.name;
  item.append(avatar, name);

  if (sectionId === "favorites") {
    const star = document.createElement("span");
    star.className = "favorite-star";
    star.textContent = "★";
    star.setAttribute("aria-label", "Favorite");
    item.appendChild(star);
  }

  return item;
}

function getSourceInitials(name) {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

function filterCollection(query) {
  const normalizedQuery = query.trim().toLowerCase();
  const sections = document.querySelectorAll("[data-collection-section]");
  let visibleSectionCount = 0;

  sections.forEach((section) => {
    let visibleItemCount = 0;
    const sectionId = section.dataset.collectionSection;
    const isExpanded = expandedCollectionIds.has(sectionId);

    section.querySelectorAll(".collection-item").forEach((item) => {
      const matchesSearch = !normalizedQuery
        || item.dataset.sourceName.includes(normalizedQuery);
      const isWithinLimit = Number(item.dataset.collectionIndex) < COLLECTION_ITEM_LIMIT;
      const shouldShow = matchesSearch
        && (normalizedQuery || isExpanded || isWithinLimit);
      item.hidden = !shouldShow;
      if (shouldShow) visibleItemCount += 1;
    });

    section.hidden = visibleItemCount === 0;
    if (visibleItemCount > 0) visibleSectionCount += 1;

    const toggle = section.querySelector(".collection-more");
    if (toggle) {
      toggle.hidden = Boolean(normalizedQuery);
      toggle.textContent = isExpanded ? "Show Less" : "Show More";
      toggle.setAttribute("aria-expanded", String(isExpanded));
    }
  });

  document.getElementById("collection-empty").hidden = visibleSectionCount > 0;
}

function toggleCollectionSection(sectionId) {
  if (expandedCollectionIds.has(sectionId)) {
    expandedCollectionIds.delete(sectionId);
  } else {
    expandedCollectionIds.add(sectionId);
  }
  filterCollection(document.getElementById("collection-search").value);
}

function openSourceDialog() {
  const dialog = document.getElementById("source-dialog");
  if (!dialog.open) dialog.showModal();
}

function createTemporaryCard() {
  temporaryCardCount += 1;
  const cardGrid = document.getElementById("card-grid");
  const addCardButton = document.getElementById("add-card");
  const card = document.createElement("article");
  const cardId = `temporary-card-${temporaryCardCount}`;
  card.className = "workspace-card temporary-card just-added";
  card.id = cardId;
  card.innerHTML = `
    <div class="card-heading">
      <div class="card-title-group">
        <span class="card-accent" aria-hidden="true"></span>
        <div>
          <h3>New Card</h3>
          <span class="card-kicker">Ready for you</span>
        </div>
      </div>
      <span class="temporary-label">Temporary</span>
    </div>
    <div class="temporary-empty">
      <span aria-hidden="true">+</span>
      Sources and customization are coming in the next phase.
    </div>
    <footer class="card-footer">
      <button class="temporary-remove" type="button" data-remove-card="${cardId}">
        Remove Card
      </button>
    </footer>
  `;

  cardGrid.insertBefore(card, addCardButton);
  showToast("New Card added. It will reset when you refresh.");
  setTimeout(() => card.classList.remove("just-added"), 700);
}

function removeTemporaryCard(cardId) {
  const card = document.getElementById(cardId);
  if (!card) return;
  card.remove();
  showToast("Temporary card removed.");
}

function showToast(message) {
  const toast = document.getElementById("toast");
  window.clearTimeout(toastTimeoutId);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimeoutId = window.setTimeout(() => toast.classList.remove("show"), 3200);
}

function bindInterfaceEvents() {
  document.getElementById("open-source-dialog")
    .addEventListener("click", openSourceDialog);
  document.getElementById("collection-add")
    .addEventListener("click", openSourceDialog);
  document.getElementById("collection-search").addEventListener("input", (event) => {
    filterCollection(event.target.value);
  });
  document.getElementById("collection-sections").addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-collection-toggle]");
    if (toggle) toggleCollectionSection(toggle.dataset.collectionToggle);
  });
  document.getElementById("top-stories-slot").addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-card-id]");
    if (toggle) toggleStoryCard(toggle.dataset.cardId);
  });
  document.getElementById("card-grid").addEventListener("click", (event) => {
    const storyToggle = event.target.closest("[data-card-id]");
    if (storyToggle) {
      toggleStoryCard(storyToggle.dataset.cardId);
      return;
    }

    if (event.target.closest("#add-card")) {
      createTemporaryCard();
      return;
    }

    const removeButton = event.target.closest("[data-remove-card]");
    if (removeButton) removeTemporaryCard(removeButton.dataset.removeCard);
  });
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
    if (topStoryCardIds.has(result.cardId)) {
      unavailableSourceCount += result.failedSources.length;
      cachedSourceCount += result.staleSources.length;
      if (result.preserved) preservedCategoryCount += 1;
    }

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

function buildTopStories(cardResults, previousKeys, isInitialLoad) {
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
    topStories.map((item) => normalizeTitle(item.title))
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

    const topStoryCardResults = cardResults.filter((result) =>
      topStoryCardIds.has(result.cardId)
    );
    topStories = buildTopStories(
      topStoryCardResults,
      previousKeys,
      isInitialLoad
    );

    cardResults.forEach((result) => {
      cardResultsById.set(result.cardId, {
        ...result,
        items: topStoryCardIds.has(result.cardId)
          ? topStories.filter((item) => item.category === result.cardId)
          : result.items
      });
    });

    renderAllCards();
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
  createCollection();
  bindInterfaceEvents();
  renderLoadingState();

  await refreshDashboard({ isInitialLoad: true });

  setInterval(() => {
    refreshDashboard();
  }, REFRESH_INTERVAL);
});
