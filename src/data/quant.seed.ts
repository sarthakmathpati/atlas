// Quant puzzle bank (BUILD_SPEC.md 8.2): classic folk puzzles in our own words, with checkable
// answers. `answer` is hidden until the owner submits or asks; `answerNote` explains it.
// Answers accept equivalent forms (fractions, decimals within 0.5%, expressions such as `1/e`),
// checked by lib/quant/answerCheck.ts. `answer: null` marks open-ended puzzles, graded by Claude
// or self-graded against the note. More original puzzles are added in Phase 5.
import type { Difficulty, SeedProblem } from "@/lib/types";

interface Puzzle {
  id: string;
  title: string;
  topicId: string;
  concepts: string[]; // relative to topicId unless they contain a dot
  difficulty: Difficulty;
  prompt: string;
  answer: string | null;
  answerNote: string;
}

function puzzle(p: Puzzle): SeedProblem {
  return {
    id: p.id,
    source: "quant",
    title: p.title,
    difficulty: p.difficulty,
    topicId: p.topicId,
    conceptIds: p.concepts.map((c) => (c.includes(".") ? c : `${p.topicId}.${c}`)),
    prompt: p.prompt,
    answer: p.answer,
    answerNote: p.answerNote,
  };
}

export const QUANT_PUZZLES: readonly SeedProblem[] = [
  puzzle({
    id: "q-hh",
    title: "Two heads in a row",
    topicId: "prob.expected-value",
    concepts: ["waiting-time-problems", "first-step-analysis"],
    difficulty: "medium",
    prompt:
      "You flip a fair coin until you see two heads in a row. On average, how many flips does it take?",
    answer: "6",
    answerNote:
      "Let a be the expected flips from scratch and b the expected flips after one head. Then a = 1 + (a + b)/2 and b = 1 + a/2, because a tail sends you back to the start. Solving gives b = 4 and a = 6.",
  }),
  puzzle({
    id: "q-ht",
    title: "Head then tail",
    topicId: "prob.expected-value",
    concepts: ["waiting-time-problems", "first-step-analysis"],
    difficulty: "easy",
    prompt:
      "You flip a fair coin until you see a head immediately followed by a tail. On average, how many flips?",
    answer: "4",
    answerNote:
      "Wait for the first head (2 flips on average). After that, a tail finishes the pattern and another head keeps you waiting in the same state, so you need 2 more flips on average. Total 4. Compare with HH: a miss there sends you back to the start.",
  }),
  puzzle({
    id: "q-first-six",
    title: "Waiting for a six",
    topicId: "prob.distributions",
    concepts: ["geometric-distribution"],
    difficulty: "easy",
    prompt: "You roll a fair die until the first 6 appears. What is the expected number of rolls?",
    answer: "6",
    answerNote:
      "The number of rolls is geometric with success probability p = 1/6, and a geometric variable has mean 1/p = 6.",
  }),
  puzzle({
    id: "q-all-faces",
    title: "See every face",
    topicId: "prob.expected-value",
    concepts: ["coupon-collector-problem"],
    difficulty: "medium",
    prompt:
      "You roll a fair die until every face has appeared at least once. Expected number of rolls?",
    answer: "14.7",
    answerNote:
      "Coupon collector: after seeing k faces, a new face appears with probability (6 − k)/6, so that stage takes 6/(6 − k) rolls on average. Summing, 6 × (1 + 1/2 + 1/3 + 1/4 + 1/5 + 1/6) = 14.7.",
  }),
  puzzle({
    id: "q-birthday-23",
    title: "Birthday twins among 23",
    topicId: "puzzles.probability",
    concepts: ["birthday-problem"],
    difficulty: "easy",
    prompt:
      "23 people, birthdays uniform over 365 days. Probability that at least two share a birthday?",
    answer: "0.507",
    answerNote:
      "Compute the complement: all 23 birthdays differ with probability (365 × 364 × … × 343) / 365^23 ≈ 0.493, so a shared birthday has probability about 0.507. There are 253 pairs, which is why it is so likely.",
  }),
  puzzle({
    id: "q-monty",
    title: "Monty Hall",
    topicId: "puzzles.probability",
    concepts: ["monty-hall-and-its-variants", "prob.foundations.conditional-probability"],
    difficulty: "easy",
    prompt:
      "Three doors, one prize. You pick a door; the host, who knows where the prize is, opens another door with no prize and offers a switch. Probability of winning if you switch?",
    answer: "2/3",
    answerNote:
      "Your first pick is right with probability 1/3, and the host's reveal doesn't change that. Switching wins exactly when your first pick was wrong, which happens with probability 2/3.",
  }),
  puzzle({
    id: "q-stick",
    title: "Broken stick triangle",
    topicId: "prob.continuous",
    concepts: ["classic-continuous-problems", "geometric-probability"],
    difficulty: "medium",
    prompt:
      "A stick is broken at two independent uniformly random points. Probability the three pieces form a triangle?",
    answer: "1/4",
    answerNote:
      "Three pieces form a triangle exactly when every piece is shorter than half the stick. In the unit square of the two break points, that region has area 1/4.",
  }),
  puzzle({
    id: "q-max-two-uniform",
    title: "Larger of two uniforms",
    topicId: "prob.distributions",
    concepts: ["order-statistics", "uniform-distribution"],
    difficulty: "medium",
    prompt: "Expected value of the larger of two independent Uniform(0,1) numbers?",
    answer: "2/3",
    answerNote: "P(max ≤ x) = x², so the density is 2x and E[max] = ∫₀¹ 2x² dx = 2/3.",
  }),
  puzzle({
    id: "q-min-n-uniform",
    title: "Smallest of n uniforms",
    topicId: "prob.distributions",
    concepts: ["order-statistics"],
    difficulty: "medium",
    prompt: "Expected value of the smallest of n independent Uniform(0,1) numbers?",
    answer: "1/(n+1)",
    answerNote:
      "P(min > x) = (1 − x)^n, and E[min] = ∫₀¹ P(min > x) dx = 1/(n + 1). Intuition: n points cut [0, 1] into n + 1 gaps of equal expected length.",
  }),
  puzzle({
    id: "q-ruin-prob",
    title: "Reach 10 before 0",
    topicId: "prob.markov",
    concepts: ["gamblers-ruin"],
    difficulty: "medium",
    prompt:
      "You start with 3 rupees and bet 1 rupee on fair coin flips until you have 0 or 10. Probability you reach 10?",
    answer: "3/10",
    answerNote:
      "In a fair game your expected wealth stays at 3. If p is the chance of ending at 10, then 10p + 0(1 − p) = 3, so p = 3/10.",
  }),
  puzzle({
    id: "q-ruin-time",
    title: "How long until ruin or 10",
    topicId: "prob.markov",
    concepts: ["gamblers-ruin", "prob.expected-value.first-step-analysis"],
    difficulty: "hard",
    prompt: "In the game above, what is the expected number of flips until it ends?",
    answer: "21",
    answerNote:
      "For a fair walk between 0 and N starting at i, the expected duration is i(N − i). First-step analysis gives D(i) = 1 + (D(i − 1) + D(i + 1))/2 with D(0) = D(N) = 0, solved by i(N − i). Here 3 × 7 = 21.",
  }),
  puzzle({
    id: "q-hats",
    title: "Hat check",
    topicId: "prob.random-variables",
    concepts: ["indicator-variables", "linearity-of-expectation"],
    difficulty: "easy",
    prompt:
      "n people put hats in a pile and each takes one at random. Expected number who get their own hat?",
    answer: "1",
    answerNote:
      "Let Xᵢ be 1 if person i gets their own hat; P(Xᵢ = 1) = 1/n. By linearity, the expected total is n × 1/n = 1, even though the Xᵢ are dependent.",
  }),
  puzzle({
    id: "q-derangement",
    title: "Nobody gets their own hat",
    topicId: "math.combinatorics",
    concepts: ["inclusion-exclusion"],
    difficulty: "medium",
    prompt: "In the hat game, as n grows large, what is the probability nobody gets their own hat?",
    answer: "1/e",
    answerNote:
      "Inclusion-exclusion gives the share of derangements as 1 − 1/1! + 1/2! − 1/3! + … ± 1/n!, which tends to 1/e ≈ 0.368.",
  }),
  puzzle({
    id: "q-two-children",
    title: "At least one boy",
    topicId: "prob.foundations",
    concepts: ["conditional-probability"],
    difficulty: "easy",
    prompt: "A family has two children and at least one is a boy. Probability both are boys?",
    answer: "1/3",
    answerNote:
      'Equally likely families: BB, BG, GB, GG. "At least one boy" leaves BB, BG, GB, and only one of those three is BB.',
  }),
  puzzle({
    id: "q-disease-test",
    title: "Positive test",
    topicId: "prob.foundations",
    concepts: ["bayes-theorem", "law-of-total-probability"],
    difficulty: "medium",
    prompt:
      "A disease affects 1% of people. A test catches 99% of sick people and wrongly flags 5% of healthy people. You test positive. Probability you are sick?",
    answer: "1/6",
    answerNote:
      "P(positive) = 0.01 × 0.99 + 0.99 × 0.05 = 0.0594. P(sick | positive) = 0.0099 / 0.0594 = 1/6 ≈ 0.167. The low base rate means most positives are false alarms.",
  }),
  puzzle({
    id: "q-sum-seven",
    title: "Two dice make seven",
    topicId: "prob.foundations",
    concepts: ["sample-spaces-and-events"],
    difficulty: "easy",
    prompt: "Probability that two fair dice sum to 7?",
    answer: "1/6",
    answerNote:
      "Six of the 36 equally likely outcomes sum to 7: (1,6), (2,5), (3,4), (4,3), (5,2), (6,1).",
  }),
  puzzle({
    id: "q-reroll-once",
    title: "Roll with one reroll",
    topicId: "prob.expected-value",
    concepts: ["expected-value-of-games", "optimal-stopping"],
    difficulty: "medium",
    prompt:
      "You roll a die and are paid its value, but you may reroll once and must accept the second roll. With the best strategy, what is the game worth?",
    answer: "4.25",
    answerNote:
      "A reroll is worth 3.5, so keep 4, 5 or 6 and reroll 1, 2 or 3. Value = (4 + 5 + 6)/6 + (3/6) × 3.5 = 2.5 + 1.75 = 4.25.",
  }),
  puzzle({
    id: "q-reroll-twice",
    title: "Roll with two rerolls",
    topicId: "prob.expected-value",
    concepts: ["optimal-stopping", "expected-value-of-games"],
    difficulty: "medium",
    prompt:
      "Same game but you may roll up to three times, taking the last roll you choose to stop at. Value of the game?",
    answer: "14/3",
    answerNote:
      "With two rolls left the game is worth 4.25, so on the first roll keep only 5 or 6. Value = (5 + 6)/6 + (4/6) × 4.25 = 11/6 + 17/6 = 14/3 ≈ 4.667.",
  }),
  puzzle({
    id: "q-first-ace",
    title: "Turning cards until an ace",
    topicId: "prob.random-variables",
    concepts: ["indicator-variables", "linearity-of-expectation"],
    difficulty: "hard",
    prompt:
      "A standard deck is shuffled. Expected number of cards you turn over up to and including the first ace?",
    answer: "53/5",
    answerNote:
      "The 4 aces split the 48 other cards into 5 gaps, and each non-ace lands in the first gap (before every ace) with probability 1/5. So you expect 48/5 non-aces before the first ace, plus the ace itself: 1 + 48/5 = 53/5 = 10.6.",
  }),
  puzzle({
    id: "q-meeting",
    title: "Meeting within 15 minutes",
    topicId: "prob.continuous",
    concepts: ["classic-continuous-problems", "geometric-probability"],
    difficulty: "medium",
    prompt:
      "Two friends each arrive at a uniformly random time between 12:00 and 1:00 and wait 15 minutes for the other. Probability they meet?",
    answer: "7/16",
    answerNote:
      "Plot both arrival times in a unit square. They miss each other when the times differ by more than 1/4 hour: two corner triangles with total area (3/4)² = 9/16. So they meet with probability 7/16.",
  }),
  puzzle({
    id: "q-uniform-sum-one",
    title: "Uniforms until the sum passes 1",
    topicId: "prob.expected-value",
    concepts: ["waiting-time-problems", "prob.random-variables.expectation"],
    difficulty: "hard",
    prompt:
      "You keep adding independent Uniform(0,1) numbers until the total exceeds 1. Expected count of numbers drawn?",
    answer: "e",
    answerNote:
      "The first n numbers sum to at most 1 with probability 1/n!. So P(N > n) = 1/n!, and E[N] = Σ P(N > n) over n ≥ 0 = 1 + 1 + 1/2! + 1/3! + … = e ≈ 2.718.",
  }),
  puzzle({
    id: "q-max-two-dice",
    title: "Larger of two dice",
    topicId: "prob.random-variables",
    concepts: ["expectation"],
    difficulty: "easy",
    prompt: "Expected value of the larger of two fair dice?",
    answer: "161/36",
    answerNote:
      "P(max ≤ k) = (k/6)², so P(max = k) = (2k − 1)/36. E = Σ k(2k − 1)/36 = 161/36 ≈ 4.472.",
  }),
  puzzle({
    id: "q-six-in-four",
    title: "A six in four rolls",
    topicId: "prob.foundations",
    concepts: ["axioms-and-basic-rules", "independence"],
    difficulty: "easy",
    prompt: "Probability of at least one 6 in four rolls of a fair die?",
    answer: "671/1296",
    answerNote:
      "Complement: no six in four rolls has probability (5/6)⁴ = 625/1296, so the answer is 671/1296 ≈ 0.518.",
  }),
  puzzle({
    id: "q-runs",
    title: "Runs in ten flips",
    topicId: "prob.random-variables",
    concepts: ["indicator-variables", "linearity-of-expectation"],
    difficulty: "medium",
    prompt: "Expected number of runs (maximal blocks of equal outcomes) in 10 fair coin flips?",
    answer: "5.5",
    answerNote:
      "The first flip starts a run, and each of the other 9 flips starts a new run when it differs from the previous flip, with probability 1/2. Expected runs = 1 + 9 × 1/2 = 5.5.",
  }),
  puzzle({
    id: "q-second-smallest",
    title: "Middle of three uniforms",
    topicId: "prob.distributions",
    concepts: ["order-statistics"],
    difficulty: "medium",
    prompt: "Expected value of the middle one of three independent Uniform(0,1) numbers?",
    answer: "1/2",
    answerNote:
      "By symmetry (replace each x with 1 − x), the middle value is equally likely to be above or below 1/2, so its mean is 1/2. In general the kth of n has mean k/(n + 1) = 2/4.",
  }),
  puzzle({
    id: "q-ants",
    title: "Ants on a pole",
    topicId: "puzzles.probability",
    concepts: ["ants-on-a-pole-and-similar-symmetry-tricks"],
    difficulty: "medium",
    prompt:
      "Many ants sit on a 1-meter pole, each walking left or right at 1 meter per minute. When two meet, both turn around. What is the longest possible time before every ant has fallen off? (Answer in minutes.)",
    answer: "1",
    answerNote:
      "Two ants bouncing off each other look exactly like two ants passing through each other, only with labels swapped. So each ant effectively walks straight, and no one needs more than 1 minute to walk off.",
  }),
  puzzle({
    id: "q-lockers",
    title: "100 lockers",
    topicId: "puzzles.logic",
    concepts: [
      "math.number-theory.divisibility-and-primes",
      "puzzles.method.how-to-attack-a-brainteaser",
    ],
    difficulty: "easy",
    prompt:
      "100 closed lockers. Person k toggles every kth locker, for k = 1 to 100. How many lockers end open?",
    answer: "10",
    answerNote:
      "Locker m is toggled once per divisor of m. Divisors pair up (d and m/d) except for square roots, so only perfect squares have an odd number of divisors: 1, 4, 9, …, 100. That is 10 lockers.",
  }),
  puzzle({
    id: "q-poison",
    title: "One poisoned bottle",
    topicId: "puzzles.logic",
    concepts: ["poisoned-bottles-and-binary-encoding", "dsa.bits.bitmask-enumeration"],
    difficulty: "medium",
    prompt:
      "1,000 bottles, exactly one poisoned. A tester shows symptoms 24 hours after drinking any poison. Minimum testers needed to find the bottle in 24 hours?",
    answer: "10",
    answerNote:
      "Number the bottles in binary. Tester i drinks from every bottle whose bit i is 1. The set of testers who get sick spells the poisoned bottle's number. 2¹⁰ = 1,024 ≥ 1,000, while 9 testers can distinguish only 512 bottles.",
  }),
  puzzle({
    id: "q-twelve-coins",
    title: "Twelve coins, one fake",
    topicId: "puzzles.logic",
    concepts: ["weighing-puzzles"],
    difficulty: "hard",
    prompt:
      "12 coins, one counterfeit that is either heavier or lighter. Minimum balance weighings to find it and say whether it is heavier or lighter?",
    answer: "3",
    answerNote:
      "There are 24 possibilities (12 coins × heavier or lighter). Each weighing has 3 outcomes, so 2 weighings give at most 9 and 3 give 27 ≥ 24. A careful scheme starting with 4 against 4 achieves 3.",
  }),
  puzzle({
    id: "q-ropes",
    title: "Two burning ropes",
    topicId: "puzzles.logic",
    concepts: ["burning-ropes-and-measuring-time"],
    difficulty: "easy",
    prompt:
      "Two ropes each take exactly 60 minutes to burn but burn unevenly. How do you measure exactly 45 minutes?",
    answer: null,
    answerNote:
      "Light rope A at both ends and rope B at one end. Rope A burns out after 30 minutes, whatever its unevenness. At that moment light B's other end: its remaining 30 minutes of burning now take 15. When B burns out, 45 minutes have passed.",
  }),
  puzzle({
    id: "q-egg-drop",
    title: "Two eggs, 100 floors",
    topicId: "puzzles.logic",
    concepts: ["egg-drop", "dsa.dp-foundations.designing-dp-states"],
    difficulty: "hard",
    prompt:
      "Two identical eggs and a 100-floor building. Minimum number of drops that guarantees finding the highest safe floor?",
    answer: "14",
    answerNote:
      "With d drops and two eggs you can cover d + (d − 1) + … + 1 = d(d + 1)/2 floors: drop the first egg at floor d, then d + (d − 1), and so on, and use the second egg to scan the gap. The smallest d with d(d + 1)/2 ≥ 100 is 14.",
  }),
  puzzle({
    id: "q-bridge",
    title: "Bridge and torch",
    topicId: "puzzles.logic",
    concepts: ["river-crossing-and-bridge-puzzles"],
    difficulty: "medium",
    prompt:
      "Four people cross a bridge at night with one torch; at most two cross at a time at the slower person's pace. Their times are 1, 2, 5 and 10 minutes. Minimum total time? (Answer in minutes.)",
    answer: "17",
    answerNote:
      "1 and 2 cross (2), 1 returns (1), 5 and 10 cross together (10), 2 returns (2), 1 and 2 cross (2): 17. The key is sending the two slowest together.",
  }),
  puzzle({
    id: "q-horses",
    title: "25 horses",
    topicId: "puzzles.logic",
    concepts: ["25-horses-and-tournament-puzzles"],
    difficulty: "medium",
    prompt: "25 horses, races of 5, no timer. Minimum races to find the three fastest?",
    answer: "7",
    answerNote:
      "Race 5 groups (5 races), then race the 5 winners (race 6); the winner of race 6 is the fastest. The only candidates left for 2nd and 3rd are 5 horses: the 2nd and 3rd of that race, the 2nd and 3rd from the fastest horse's group, and the 2nd from the runner-up's group. Race 7 settles it.",
  }),
  puzzle({
    id: "q-clock",
    title: "Clock hands at 3:15",
    topicId: "puzzles.logic",
    concepts: ["clocks-and-angles"],
    difficulty: "easy",
    prompt: "Angle between the hour and minute hands at 3:15? (Answer in degrees.)",
    answer: "7.5",
    answerNote:
      "The minute hand is at 90°. The hour hand moves 0.5° per minute, so it is at 90° + 15 × 0.5° = 97.5°. The difference is 7.5°.",
  }),
  puzzle({
    id: "q-nim",
    title: "Nim with 3, 4 and 5",
    topicId: "puzzles.games",
    concepts: ["nim-and-impartial-games", "dsa.bits.xor-tricks"],
    difficulty: "medium",
    prompt:
      "Nim with heaps of 3, 4 and 5; players alternate removing any number from one heap; taking the last object wins. Does the first player win with perfect play? (Answer yes or no.)",
    answer: "yes",
    answerNote:
      "A position is losing for the player to move exactly when the XOR of the heap sizes is 0. Here 3 XOR 4 XOR 5 = 2, not 0, so the first player wins, for example by taking 2 from the heap of 3 to make the XOR 0.",
  }),
  puzzle({
    id: "q-twenty-one",
    title: "Take 1 to 3 from 21",
    topicId: "puzzles.games",
    concepts: ["take-away-games"],
    difficulty: "easy",
    prompt:
      "21 coins; players alternately take 1 to 3; whoever takes the last coin wins. Who wins, and what is the first move?",
    answer: null,
    answerNote:
      "Multiples of 4 are losing positions for the player to move. The first player wins: take 1 to leave 20, then always answer the opponent's k with 4 − k, keeping a multiple of 4.",
  }),
  puzzle({
    id: "q-kelly",
    title: "Kelly on an even-money bet",
    topicId: "markets.betting",
    concepts: ["kelly-criterion"],
    difficulty: "easy",
    prompt:
      "A bet pays even money and you win it 60% of the time. What fraction of your bankroll does the Kelly criterion bet?",
    answer: "0.2",
    answerNote:
      "For even odds, Kelly bets f = p − q = 0.6 − 0.4 = 0.2 of the bankroll. In general f = (bp − q)/b for net odds b.",
  }),
  puzzle({
    id: "q-dice-market",
    title: "Market on two dice",
    topicId: "markets.making",
    concepts: ["making-a-market", "adverse-selection"],
    difficulty: "medium",
    prompt:
      "Make a two-sided market on the sum of two dice, then explain how you'd adjust after someone lifts your offer.",
    answer: null,
    answerNote:
      "The fair value is 7 (standard deviation about 2.4), so quote around it, for example 6.5 bid at 7.5 offered, tighter if you are confident. If someone lifts your offer they may know something or think the value is higher: raise both quotes and consider widening until you learn more, while keeping track of your short position.",
  }),
  puzzle({
    id: "q-fermi-cars",
    title: "Cars in a big city",
    topicId: "math.mental",
    concepts: ["fermi-estimation"],
    difficulty: "medium",
    prompt: "Estimate the number of cars in a city of 20 million people. Show your structure.",
    answer: null,
    answerNote:
      "One clear structure: 20 million people is about 5 million households; perhaps 30% own a car and a few own two, so about 1.8 million household cars, plus commercial vehicles and taxis (say 20% more): roughly 2 million. What matters is the structure and stating assumptions; a range within a factor of about 2 is good.",
  }),
  puzzle({
    id: "q-sqrt50",
    title: "Square root of 50",
    topicId: "math.mental",
    concepts: ["approximations"],
    difficulty: "easy",
    prompt: "Estimate the square root of 50 to two decimal places without a calculator.",
    answer: "7.07",
    answerNote:
      "Start at 7 (49). One Newton step: √50 ≈ 7 + (50 − 49)/(2 × 7) = 7 + 1/14 ≈ 7.071. So about 7.07.",
  }),
  puzzle({
    id: "q-envelopes",
    title: "Two envelopes",
    topicId: "puzzles.probability",
    concepts: ["two-envelopes-and-paradoxes"],
    difficulty: "medium",
    prompt:
      'Two envelopes, one holds twice the other. You open one and see X. "Switching gives 1.25X on average," says a friend. What is wrong with the argument?',
    answer: null,
    answerNote:
      "The argument treats X as fixed and assumes the other envelope is equally likely to hold 2X or X/2 whatever X is. That would need a uniform prior over all amounts, which cannot exist. Without seeing X, if the envelopes hold A and 2A, switching gains A or loses A with equal chance, so it's worth nothing on average.",
  }),
];
