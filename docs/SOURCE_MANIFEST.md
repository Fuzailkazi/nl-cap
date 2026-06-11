# Source Manifest — Official URLs

**Project:** Mutual Fund Advisor Intelligence Suite · **AMC:** HDFC Mutual Fund · **Schemes:** HDFC Flexi Cap Fund, HDFC Mid-Cap Opportunities Fund, HDFC Balanced Advantage Fund, HDFC Liquid Fund

**35 official sources**, all verified **HTTP 200 on 2026-06-11** (machine-readable copy: [`data/source-manifest.json`](../data/source-manifest.json)).

Sources are official AMC (HDFC), regulator (SEBI), industry body (AMFI), and aggregator (Kuvera) pages. Compliance rule: the RAG ingestion never embeds an unverified source — every URL here was fetched and confirmed before use.

> **Ingestion note:** Kuvera pages are client-rendered (JavaScript), so static fetching extracts little text from them; they are listed as official references, while the *answerable* corpus is built mainly from the HDFC + AMFI + SEBI pages. General fee/expense-ratio knowledge enters the corpus via the Pillar-2 **Fee Explainer** (`doc_type='fee_explainer'`).

## HDFC Mutual Fund (AMC) — 18

| # | URL | Type | Scheme |
|---|-----|------|--------|
| 1 | https://www.hdfcfund.com/ | amc_page | — |
| 2 | https://www.hdfcfund.com/about-us | amc_page | — |
| 3 | https://www.hdfcfund.com/contact-us | amc_page | — |
| 4 | https://www.hdfcfund.com/statutory-disclosure/downloads | amc_page | — |
| 5 | https://www.hdfcfund.com/statutory-disclosure/portfolio/monthly-portfolio | amc_page | — |
| 6 | https://www.hdfcfund.com/information/notice-fortnightly-monthly-portfolios | amc_page | — |
| 7 | https://www.hdfcfund.com/mutual-funds/factsheets | factsheet | — |
| 8 | https://www.hdfcfund.com/mutual-funds/fund-documents/kim | kim | — |
| 9 | https://www.hdfcfund.com/mutual-funds/fund-documents/sid | sid | — |
| 10 | https://www.hdfcfund.com/explore/mutual-funds/hdfc-flexi-cap-fund/direct | amc_page | Flexi Cap |
| 11 | https://www.hdfcfund.com/explore/mutual-funds/hdfc-flexi-cap-fund/regular | amc_page | Flexi Cap |
| 12 | https://www.hdfcfund.com/explore/mutual-funds/hdfc-mid-cap-fund/direct | amc_page | Mid-Cap |
| 13 | https://www.hdfcfund.com/explore/mutual-funds/hdfc-mid-cap-fund/regular | amc_page | Mid-Cap |
| 14 | https://www.hdfcfund.com/explore/mutual-funds/hdfc-balanced-advantage-fund/direct | amc_page | Balanced Advantage |
| 15 | https://www.hdfcfund.com/explore/mutual-funds/hdfc-balanced-advantage-fund/regular | amc_page | Balanced Advantage |
| 16 | https://www.hdfcfund.com/explore/mutual-funds/hdfc-liquid-fund/direct | amc_page | Liquid |
| 17 | https://www.hdfcfund.com/explore/mutual-funds/hdfc-liquid-fund/regular | amc_page | Liquid |
| 18 | https://www.hdfcfund.com/mutual-fund-shorts/hdfc-flexi-cap-fund | amc_page | Flexi Cap |

## SEBI (Regulator) — 4

| # | URL | Type |
|---|-----|------|
| 19 | https://www.sebi.gov.in/ | sebi |
| 20 | https://www.sebi.gov.in/sebiweb/other/OtherAction.do?doRecognisedFpi=yes&intmId=14 | sebi |
| 21 | https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=1&ssid=3&smid=0 | sebi |
| 22 | https://investor.sebi.gov.in/ | sebi |

## AMFI (Industry Body) — 3

| # | URL | Type |
|---|-----|------|
| 23 | https://www.amfiindia.com/ | amfi |
| 24 | https://www.amfiindia.com/aboutamfi | amfi |
| 25 | https://www.amfiindia.com/net-asset-value/nav-history | amfi |

## Kuvera (Aggregator) — 10

| # | URL | Type | Scheme |
|---|-----|------|--------|
| 26 | https://kuvera.in/mutual-funds/hdfc-flexi-cap-fund-direct-growth | kuvera | Flexi Cap |
| 27 | https://kuvera.in/mutual-funds/hdfc-mid-cap-opportunities-fund-direct-growth | kuvera | Mid-Cap |
| 28 | https://kuvera.in/mutual-funds/hdfc-balanced-advantage-fund-direct-growth | kuvera | Balanced Advantage |
| 29 | https://kuvera.in/mutual-funds/hdfc-liquid-fund-direct-growth | kuvera | Liquid |
| 30 | https://kuvera.in/learn/what-is-expense-ratio | kuvera | — |
| 31 | https://kuvera.in/learn/direct-vs-regular-mutual-funds | kuvera | — |
| 32 | https://kuvera.in/learn/what-is-nav | kuvera | — |
| 33 | https://kuvera.in/learn/what-is-exit-load | kuvera | — |
| 34 | https://kuvera.in/learn/mutual-fund-taxation-in-india | kuvera | — |
| 35 | https://kuvera.in/learn/index-funds | kuvera | — |

---

**Totals:** HDFC 18 · SEBI 4 · AMFI 3 · Kuvera 10 = **35 verified official URLs.**
