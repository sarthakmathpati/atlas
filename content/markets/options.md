---
topic: markets.options
name: "Options"
subject: markets
order: 4
prereqs: [markets.basics, prob.distributions]
---

## markets.options.calls-and-puts
name: "Calls and puts"
importance: important
scope: "payoff diagrams"

## markets.options.put-call-parity
name: "Put-call parity"
importance: important
prereqs: [markets.options.calls-and-puts, markets.pricing.no-arbitrage-pricing]
scope: "the no-arbitrage relationship"

## markets.options.intrinsic-and-time-value
name: "Intrinsic and time value"
importance: important
prereqs: [markets.options.calls-and-puts]
scope: "Intrinsic and time value"

## markets.options.greeks-intuition
name: "Greeks intuition"
importance: important
prereqs: [markets.options.intrinsic-and-time-value]
scope: "delta, gamma, vega, theta"

## markets.options.black-scholes-intuition
name: "Black-Scholes intuition"
importance: advanced
prereqs: [markets.options.greeks-intuition]
scope: "assumptions and inputs"

## markets.options.implied-volatility-and-the-volatility-smile
name: "Implied volatility and the volatility smile"
importance: advanced
prereqs: [markets.options.black-scholes-intuition]
scope: "Implied volatility and the volatility smile"
