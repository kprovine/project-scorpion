// Card configuration. The filename stays sources.js during the incremental refactor.

window.CARD_REGISTRY = {
  sports: {
    title: "Sports",
    renderer: "story-list",
    contributesToTopStories: true,
    maxItems: 15,
    providers: [
      {
        id: "bbc_sport",
        type: "rss",
        name: "BBC Sport",
        qualityWeight: 1,
        config: {
          url: "https://feeds.bbci.co.uk/sport/rss.xml"
        }
      },
      {
        id: "espn",
        type: "rss",
        name: "ESPN",
        qualityWeight: 0.75,
        config: {
          url: "https://www.espn.com/espn/rss/news"
        }
      },
      {
        id: "guardian_sport",
        type: "rss",
        name: "The Guardian Sport",
        qualityWeight: 1,
        config: {
          url: "https://www.theguardian.com/sport/rss"
        }
      }
    ]
  },

  gaming: {
    title: "Gaming",
    renderer: "story-list",
    contributesToTopStories: true,
    maxItems: 15,
    providers: [
      {
        id: "ars_technica",
        type: "rss",
        name: "Ars Technica",
        qualityWeight: 1,
        config: {
          url: "https://feeds.arstechnica.com/arstechnica/gaming"
        }
      },
      {
        id: "ign",
        type: "rss",
        name: "IGN",
        qualityWeight: 0.5,
        config: {
          url: "https://feeds.feedburner.com/ign/all"
        }
      },
      {
        id: "pc_gamer",
        type: "rss",
        name: "PC Gamer",
        qualityWeight: 0.75,
        config: {
          url: "https://www.pcgamer.com/rss/"
        }
      }
    ]
  },

  markets: {
    title: "Markets",
    renderer: "story-list",
    contributesToTopStories: true,
    maxItems: 15,
    providers: [
      {
        id: "yahoo_finance",
        type: "rss",
        name: "Yahoo Finance",
        qualityWeight: 0.5,
        config: {
          url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5EGSPC&region=US&lang=en-US"
        }
      },
      {
        id: "cnbc",
        type: "rss",
        name: "CNBC",
        qualityWeight: 1,
        config: {
          url: "https://www.cnbc.com/id/100003114/device/rss/rss.html"
        }
      },
      {
        id: "marketwatch",
        type: "rss",
        name: "MarketWatch",
        qualityWeight: 1,
        config: {
          url: "https://feeds.content.dowjones.io/public/rss/mw_topstories"
        }
      }
    ]
  }
};
