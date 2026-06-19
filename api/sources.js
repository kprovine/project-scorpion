// sources.js

const SOURCE_REGISTRY = {
  sports: {
    title: "Sports",
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
        id: "reuters_sports",
        name: "Reuters Sports",
        rss: "https://www.reuters.com/rssFeed/sportsNews"
      }
    ]
  },

  gaming: {
    title: "Gaming",
    sources: [
      {
        id: "ars_technica",
        name: "Ars Technica",
        rss: "https://feeds.arstechnica.com/arstechnica/index"
      },
      {
        id: "ign",
        name: "IGN",
        rss: "https://www.ign.com/rss/articles"
      },
      {
        id: "polygon",
        name: "Polygon",
        rss: "https://www.polygon.com/rss/index.xml"
      }
    ]
  },

  markets: {
    title: "Markets",
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
        id: "reuters_business",
        name: "Reuters Business",
        rss: "https://www.reuters.com/rssFeed/businessNews"
      }
    ]
  }
};
