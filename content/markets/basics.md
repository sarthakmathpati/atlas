---
topic: markets.basics
name: "Market basics"
subject: markets
order: 1
prereqs: []
---

## markets.basics.asset-classes
name: "Asset classes"
importance: must
scope: "stocks, bonds, futures, options, currencies"

## markets.basics.order-books
name: "Order books"
importance: must
prereqs: [markets.basics.asset-classes]
scope: "bids, asks, spread, depth"

## markets.basics.order-types
name: "Order types"
importance: must
prereqs: [markets.basics.order-books]
scope: "market, limit, stop orders"

## markets.basics.liquidity-and-market-makers
name: "Liquidity and market makers"
importance: must
prereqs: [markets.basics.order-books]
scope: "who provides prices and why"

## markets.basics.how-exchanges-match-orders
name: "How exchanges match orders"
importance: important
prereqs: [markets.basics.order-books]
scope: "price-time priority"
