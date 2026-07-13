// sources.js

window.SOURCE_REGISTRY = {
  sports: {
    title: "Sports",
    type: "feed",
    maxItems: 15,
    hotThreshold: 0.3,
    sources: [
      {
        id: "bbc_sport",
        name: "BBC Sport",
        qualityWeight: 1,
        rss: "https://feeds.bbci.co.uk/sport/rss.xml"
      },
      {
        id: "espn",
        name: "ESPN",
        qualityWeight: 0.75,
        rss: "https://www.espn.com/espn/rss/news"
      },
      {
        id: "guardian_sport",
        name: "The Guardian Sport",
        qualityWeight: 1,
        rss: "https://www.theguardian.com/sport/rss"
      }
    ]
  },

  gaming: {
    title: "Gaming",
    type: "feed",
    maxItems: 15,
    hotThreshold: 0.3,
    sources: [
      {
        id: "ars_technica",
        name: "Ars Technica",
        qualityWeight: 1,
        rss: "https://feeds.arstechnica.com/arstechnica/gaming"
      },
      {
        id: "ign",
        name: "IGN",
        qualityWeight: 0.5,
        rss: "https://feeds.feedburner.com/ign/all"
      },
      {
        id: "pc_gamer",
        name: "PC Gamer",
        qualityWeight: 0.75,
        rss: "https://www.pcgamer.com/rss/"
      }
    ]
  },

  markets: {
    title: "Markets",
    type: "feed",
    maxItems: 15,
    hotThreshold: 0.3,
    sources: [
      {
        id: "yahoo_finance",
        name: "Yahoo Finance",
        qualityWeight: 0.5,
        rss: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5EGSPC&region=US&lang=en-US"
      },
      {
        id: "cnbc",
        name: "CNBC",
        qualityWeight: 1,
        rss: "https://www.cnbc.com/id/100003114/device/rss/rss.html"
      },
      {
        id: "marketwatch",
        name: "MarketWatch",
        qualityWeight: 1,
        rss: "https://feeds.content.dowjones.io/public/rss/mw_topstories"
      }
    ]
  }
};
