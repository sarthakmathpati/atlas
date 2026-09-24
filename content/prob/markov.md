---
topic: prob.markov
name: "Markov chains and random walks"
subject: prob
order: 5
prereqs: [prob.expected-value, math.linear-algebra]
---

## prob.markov.markov-chains
name: "Markov chains"
importance: important
scope: "states, transition matrices, the Markov property"

## prob.markov.absorbing-chains
name: "Absorbing chains"
importance: important
prereqs: [prob.markov.markov-chains]
scope: "absorption probabilities and expected steps"

## prob.markov.gamblers-ruin
name: "Gambler's ruin"
importance: must
prereqs: [prob.expected-value.first-step-analysis]
scope: "probability of ruin, expected duration"

## prob.markov.stationary-distributions
name: "Stationary distributions"
importance: important
prereqs: [prob.markov.markov-chains]
scope: "long-run behavior"

## prob.markov.random-walks
name: "Random walks"
importance: important
prereqs: [prob.markov.gamblers-ruin]
scope: "symmetric walks, return probability, hitting times"
