---
topic: markets.pricing
name: "Pricing and portfolios"
subject: markets
order: 5
prereqs: [markets.basics]
---

## markets.pricing.time-value-of-money
name: "Time value of money"
importance: must
scope: "discounting, present value, compounding"

## markets.pricing.no-arbitrage-pricing
name: "No-arbitrage pricing"
importance: must
prereqs: [markets.pricing.time-value-of-money]
scope: "forwards and futures"

## markets.pricing.diversification-and-correlation
name: "Diversification and correlation"
importance: important
scope: "portfolio variance"

## markets.pricing.sharpe-ratio-and-risk-adjusted-returns
name: "Sharpe ratio and risk-adjusted returns"
importance: important
prereqs: [markets.pricing.diversification-and-correlation]
scope: "Sharpe ratio and risk-adjusted returns"

## markets.pricing.value-at-risk
name: "Value at risk"
importance: advanced
scope: "Value at risk"
