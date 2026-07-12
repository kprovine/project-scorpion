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
        rss: "https://feeds.bbci.co.uk/sport/rss.xml"
      },
      {
        id: "espn",
        name: "ESPN",
        rss: "https://www.espn.com/espn/rss/news"
      },
      {
        id: "guardian_sport",
        name: "The Guardian Sport",
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
        rss: "https://feeds.arstechnica.com/arstechnica/gaming"
      },
      {
        id: "ign",
        name: "IGN",
        rss: "https://feeds.feedburner.com/ign/all"
      },
      {
        id: "pc_gamer",
        name: "PC Gamer",
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
        rss: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5EGSPC&region=US&lang=en-US"
      },
      {
        id: "cnbc",
        name: "CNBC",
        rss: "https://www.cnbc.com/id/100003114/device/rss/rss.html"
      },
      {
        id: "marketwatch",
        name: "MarketWatch",
        rss: "https://feeds.content.dowjones.io/public/rss/mw_topstories"
      }
    ]
  }
};
