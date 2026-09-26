// Quant puzzle bank (BUILD_SPEC.md 8.2): classic folk puzzles in our own words, with checkable
// answers. `answer` is hidden until the owner submits or asks; `answerNote` explains it.
// Answers accept equivalent forms (fractions, decimals within 0.5%, expressions such as `1/e`),
// checked by lib/quant/answerCheck.ts. `answer: null` marks open-ended puzzles, graded by Claude
// or self-graded against the note. After the spec table come original puzzles added in Phase 5.
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

  // Original puzzles beyond the spec table (Phase 5). Every checkable answer is recomputed
  // independently in tests/seed/quant.test.ts.

  // Probability
  puzzle({
    id: "q-three-different",
    title: "Three different faces",
    topicId: "prob.foundations",
    concepts: ["sample-spaces-and-events", "math.combinatorics.counting-principles"],
    difficulty: "easy",
    prompt:
      "You roll three fair dice. What is the probability that all three show different numbers?",
    answer: "5/9",
    answerNote:
      "Count ordered outcomes: 6 choices for the first die, 5 for the second and 4 for the third give 120 of the 216 equally likely outcomes. 120/216 = 5/9, about 0.556.",
  }),
  puzzle({
    id: "q-red-pair",
    title: "At least one red card",
    topicId: "prob.foundations",
    concepts: ["conditional-probability"],
    difficulty: "medium",
    prompt:
      "Two cards are dealt from a well-shuffled standard deck of 52. You are told that at least one of them is red. What is the probability that both are red?",
    answer: "25/77",
    answerNote:
      'P(both red) = (26/52)(25/51) = 25/102, and by symmetry P(both black) = 25/102, so P(at least one red) = 77/102. The conditional probability is (25/102)/(77/102) = 25/77, about 0.325. Being told only "at least one" leaves more possibilities than being told a specific card is red, which would give 25/51.',
  }),
  puzzle({
    id: "q-spam-flag",
    title: "Flagged as spam",
    topicId: "prob.foundations",
    concepts: ["bayes-theorem"],
    difficulty: "easy",
    prompt:
      "Forty percent of the email reaching an inbox is spam. A filter flags 90% of spam and 2% of genuine email. An email has just been flagged. What is the probability that it is spam?",
    answer: "30/31",
    answerNote:
      "Out of 1,000 emails, 400 are spam and 360 of them are flagged; 600 are genuine and 12 of them are flagged. So 360 of the 372 flagged emails are spam: 360/372 = 30/31, about 0.968.",
  }),
  puzzle({
    id: "q-two-positives",
    title: "Two positive tests",
    topicId: "prob.foundations",
    concepts: ["bayes-theorem", "independence"],
    difficulty: "medium",
    prompt:
      "A condition affects 1 in 200 people. A test detects it 95% of the time and wrongly flags 4% of healthy people. Someone tests positive on two tests whose results are independent given whether they have the condition. What is the probability that they have it?",
    answer: "9025/12209",
    answerNote:
      "Work in odds. The prior odds are 1 to 199, and each positive result multiplies them by 0.95/0.04 = 23.75, so two results give 1 × 23.75² to 199, about 564.06 to 199. The probability is 564.06/763.06, exactly (0.005 × 0.95²)/(0.005 × 0.95² + 0.995 × 0.04²) = 9025/12209, about 0.739. One positive alone gives only about 0.107. The answer relies on the two errors being independent; repeating the same flawed test often isn't.",
  }),
  puzzle({
    id: "q-lift-stops",
    title: "Lift stops",
    topicId: "prob.random-variables",
    concepts: ["indicator-variables", "linearity-of-expectation"],
    difficulty: "medium",
    prompt:
      "A lift leaves the ground floor with 8 passengers. Each gets off at one of the 10 floors above, chosen independently and uniformly at random. What is the expected number of floors at which the lift stops?",
    answer: "10*(1-0.9^8)",
    answerNote:
      "Let I_k be 1 if someone gets off at floor k. Nobody chooses floor k with probability 0.9^8, so E[I_k] = 1 − 0.9^8 ≈ 0.570. By linearity, the expected number of stops is 10(1 − 0.9^8) ≈ 5.70, even though the indicators are dependent.",
  }),
  puzzle({
    id: "q-couples-table",
    title: "Couples side by side",
    topicId: "prob.random-variables",
    concepts: ["indicator-variables", "linearity-of-expectation"],
    difficulty: "medium",
    prompt:
      "Ten couples sit down at random around a round table with 20 seats. What is the expected number of couples who end up sitting next to each other?",
    answer: "20/19",
    answerNote:
      "Wherever one partner sits, the other is equally likely to be in any of the 19 other seats, and 2 of those are neighbors, so each couple sits together with probability 2/19. By linearity, 10 × 2/19 = 20/19, about 1.05.",
  }),
  puzzle({
    id: "q-four-heads",
    title: "Four heads in a row",
    topicId: "puzzles.probability",
    concepts: ["coin-and-dice-games", "prob.markov.markov-chains"],
    difficulty: "medium",
    prompt:
      "You flip a fair coin 10 times. What is the probability of seeing at least four heads in a row somewhere in the sequence?",
    answer: "251/1024",
    answerNote:
      "Count the sequences without four heads in a row. Such a sequence ends in T, TH, THH or THHH after a shorter valid sequence, so a(n) = a(n−1) + a(n−2) + a(n−3) + a(n−4) with a(0..3) = 1, 2, 4, 8. That gives 15, 29, 56, 108, 208, 401 and a(10) = 773. The answer is 1 − 773/1024 = 251/1024, about 0.245.",
  }),
  puzzle({
    id: "q-total-six",
    title: "Landing on six",
    topicId: "prob.expected-value",
    concepts: ["first-step-analysis"],
    difficulty: "hard",
    prompt:
      "You roll a fair die again and again, keeping a running total. What is the probability that the total equals exactly 6 at some point?",
    answer: "16807/46656",
    answerNote:
      "Let p(n) be the probability that the total ever equals n, with p(0) = 1. Conditioning on the last roll before reaching n gives p(n) = (p(n−1) + … + p(n−6))/6, counting only terms with n − k ≥ 0. Then p(1) = 1/6, and for n up to 6 each step multiplies by 7/6, so p(6) = 7^5/6^6 = 16807/46656, about 0.360. For large n, p(n) tends to 1/3.5 = 2/7, one over the average roll.",
  }),
  puzzle({
    id: "q-socks-three",
    title: "Three socks",
    topicId: "prob.distributions",
    concepts: ["negative-binomial-and-hypergeometric"],
    difficulty: "easy",
    prompt:
      "A drawer holds 6 black and 4 white socks. You take out 3 at random without looking. What is the probability that exactly 2 of them are black?",
    answer: "1/2",
    answerNote:
      "Hypergeometric: C(6,2) × C(4,1) / C(10,3) = 15 × 4 / 120 = 1/2. The draws are without replacement, so the binomial formula would be wrong here.",
  }),
  puzzle({
    id: "q-bus-wait",
    title: "Waiting for a bus",
    topicId: "prob.distributions",
    concepts: ["exponential-distribution", "prob.stochastic.poisson-processes"],
    difficulty: "easy",
    prompt:
      "Buses arrive at a stop as a Poisson process, on average one every 10 minutes. You reach the stop at a random moment. What is your expected wait, in minutes?",
    answer: "10",
    answerNote:
      "The gaps are exponential and memoryless, so the time until the next bus is exponential with mean 10 minutes no matter when you arrive. This is the inspection paradox: the gap you land in averages 20 minutes, twice the typical gap.",
  }),
  puzzle({
    id: "q-red-taxis",
    title: "Two red taxis first",
    topicId: "prob.stochastic",
    concepts: ["poisson-processes"],
    difficulty: "medium",
    prompt:
      "Red taxis pass a corner as a Poisson process at 4 per hour, and blue taxis independently at 2 per hour. What is the probability that two red taxis pass before the first blue one?",
    answer: "4/9",
    answerNote:
      "Merged, the taxis form one Poisson process at 6 per hour, and each taxi is red with probability 4/6 = 2/3, independently of the others. So the first two taxis are both red with probability (2/3)² = 4/9.",
  }),
  puzzle({
    id: "q-box-weights",
    title: "Heavy load",
    topicId: "prob.limits",
    concepts: ["central-limit-theorem"],
    difficulty: "medium",
    prompt:
      "Boxes from a factory weigh 20 kg on average with a standard deviation of 2 kg, independently of each other. Using the normal approximation, what is the probability that 100 boxes weigh more than 2,040 kg in total? (Answer to three significant figures.)",
    answer: "0.02275",
    answerNote:
      "The total has mean 100 × 20 = 2,000 kg and standard deviation 2 × √100 = 20 kg. 2,040 kg is 2 standard deviations above the mean, and P(Z > 2) = 1 − Φ(2) ≈ 0.0228. The approximation assumes independent weights and a sum of many of them; it is least reliable far in the tail.",
  }),
  puzzle({
    id: "q-six-duel",
    title: "First to roll a six",
    topicId: "prob.foundations",
    concepts: ["law-of-total-probability", "prob.distributions.geometric-distribution"],
    difficulty: "easy",
    prompt:
      "Two players take turns rolling a fair die, and the first to roll a 6 wins. What is the probability that the player who rolls first wins?",
    answer: "6/11",
    answerNote:
      "Let p be the first player's chance. They win at once with probability 1/6; if both miss (probability 25/36) the game restarts. So p = 1/6 + (25/36)p, which gives p = 6/11, about 0.545.",
  }),
  puzzle({
    id: "q-rescale-maximum",
    title: "Unknown upper limit",
    topicId: "prob.statistics",
    concepts: ["sampling-and-estimators", "maximum-likelihood-estimation"],
    difficulty: "medium",
    prompt:
      "A machine outputs numbers uniformly between 0 and an unknown limit θ. Four independent outputs have a largest value of 8. The largest value tends to underestimate θ. What is the unbiased estimate of θ that rescales it?",
    answer: "10",
    answerNote:
      "The maximum M of n uniform draws on [0, θ] has E[M] = nθ/(n + 1), so (n + 1)M/n is unbiased. With n = 4 and M = 8 that is 5 × 8/4 = 10. The maximum likelihood estimate is 8 itself, which is biased low.",
  }),
  puzzle({
    id: "q-dice-variance",
    title: "Spread of three dice",
    topicId: "prob.random-variables",
    concepts: ["variance-and-standard-deviation"],
    difficulty: "easy",
    prompt: "What is the variance of the total of three fair dice?",
    answer: "35/4",
    answerNote:
      "One die has variance E[X²] − E[X]² = 91/6 − 49/4 = 35/12. The dice are independent, so the variances add: 3 × 35/12 = 35/4 = 8.75.",
  }),
  puzzle({
    id: "q-rod-distance",
    title: "Two points on a rod",
    topicId: "prob.continuous",
    concepts: ["geometric-probability", "joint-distributions"],
    difficulty: "easy",
    prompt:
      "Two points are chosen independently and uniformly on a rod 1 meter long. What is the expected distance between them, in meters?",
    answer: "1/3",
    answerNote:
      "E|X − Y| is the integral of |x − y| over the unit square. By symmetry it is twice the integral over x > y: 2 × ∫₀¹ ∫₀ˣ (x − y) dy dx = 2 × ∫₀¹ x²/2 dx = 1/3.",
  }),
  puzzle({
    id: "q-longest-piece",
    title: "Longest piece",
    topicId: "prob.continuous",
    concepts: ["classic-continuous-problems", "prob.distributions.order-statistics"],
    difficulty: "hard",
    prompt:
      "A 1-meter stick is broken at two independent, uniformly random points. What is the expected length of the longest of the three pieces?",
    answer: "11/18",
    answerNote:
      "The three pieces are like the gaps of 2 uniform points, and for such gaps P(longest ≤ x) is known by inclusion-exclusion. Integrating P(longest > x) from 0 to 1 gives 11/18, about 0.611. A neat general fact: for n pieces the expected longest is (1/n)(1 + 1/2 + … + 1/n), here (1/3)(11/6) = 11/18.",
  }),
  puzzle({
    id: "q-sunny-days",
    title: "Sunny in the long run",
    topicId: "prob.markov",
    concepts: ["stationary-distributions"],
    difficulty: "easy",
    prompt:
      "A sunny day is followed by another sunny day with probability 0.8, and a rainy day is followed by a sunny day with probability 0.4. In the long run, what fraction of days are sunny?",
    answer: "2/3",
    answerNote:
      "The stationary share s satisfies s = 0.8s + 0.4(1 − s), so 0.6s = 0.4 and s = 2/3. Equivalently, the flow from sunny to rainy (0.2s) balances the flow back (0.4(1 − s)).",
  }),
  puzzle({
    id: "q-repeat-roll",
    title: "Same number twice running",
    topicId: "prob.expected-value",
    concepts: ["waiting-time-problems"],
    difficulty: "easy",
    prompt:
      "You roll a fair die until two consecutive rolls show the same number. What is the expected number of rolls?",
    answer: "7",
    answerNote:
      "After the first roll, each new roll matches the previous one with probability 1/6, whatever the previous one was. So the number of further rolls is geometric with mean 6, and the total is 1 + 6 = 7.",
  }),
  puzzle({
    id: "q-black-before-red",
    title: "Black cards before the first red",
    topicId: "prob.random-variables",
    concepts: ["indicator-variables", "linearity-of-expectation"],
    difficulty: "medium",
    prompt:
      "You turn over cards from a shuffled standard deck until the first red card appears. What is the expected number of black cards you see before it?",
    answer: "26/27",
    answerNote:
      "Each black card comes before all 26 red cards with probability 1/27, since among that black card and the 26 reds, each is equally likely to be first. By linearity, 26 × 1/27 = 26/27, just under 1.",
  }),
  puzzle({
    id: "q-keep-or-redraw",
    title: "Keep or redraw",
    topicId: "prob.expected-value",
    concepts: ["optimal-stopping", "expected-value-of-games"],
    difficulty: "medium",
    prompt:
      "You are shown a number drawn uniformly between 0 and 1. You may keep it, or throw it away and take a second draw, which you must keep. With the best strategy, what is this game worth?",
    answer: "5/8",
    answerNote:
      "A second draw is worth 1/2 on average, so keep the first number exactly when it beats 1/2. The value is E[max(U, 1/2)] = (1/2)(1/2) + (1/2)(3/4) = 5/8.",
  }),
  puzzle({
    id: "q-biased-ruin",
    title: "Favorable ruin",
    topicId: "prob.markov",
    concepts: ["gamblers-ruin"],
    difficulty: "medium",
    prompt:
      "You have 2 chips and play rounds that win or lose one chip, winning each round with probability 0.6. You stop when you have 0 or 4 chips. What is the probability that you reach 4?",
    answer: "9/13",
    answerNote:
      "With r = q/p = 2/3, the chance of reaching N from i is (1 − r^i)/(1 − r^N) = (1 − 4/9)/(1 − 16/81) = (5/9)/(65/81) = 9/13, about 0.692. A fair game would give 2/4.",
  }),

  // Math
  puzzle({
    id: "q-handshakes",
    title: "Handshakes",
    topicId: "math.combinatorics",
    concepts: ["permutations-and-combinations"],
    difficulty: "easy",
    prompt:
      "Twelve people at a meeting each shake hands once with everyone else. How many handshakes are there?",
    answer: "66",
    answerNote:
      "Each handshake is a pair of people, so the count is C(12, 2) = 12 × 11 / 2 = 66. Counting 11 handshakes per person counts every handshake twice.",
  }),
  puzzle({
    id: "q-sweets",
    title: "Sharing sweets",
    topicId: "math.combinatorics",
    concepts: ["stars-and-bars"],
    difficulty: "easy",
    prompt:
      "You hand out 10 identical sweets to 4 children so that every child gets at least one. In how many ways can you do it?",
    answer: "84",
    answerNote:
      "Give each child one sweet first, then share the remaining 6 freely: stars and bars gives C(6 + 3, 3) = C(9, 3) = 84. Equivalently, choose 3 of the 9 gaps between 10 sweets in a row.",
  }),
  puzzle({
    id: "q-rising-digits",
    title: "Rising digits",
    topicId: "math.combinatorics",
    concepts: ["permutations-and-combinations"],
    difficulty: "medium",
    prompt:
      "How many 5-digit numbers have digits that strictly increase from left to right, like 13579?",
    answer: "126",
    answerNote:
      "Zero can't appear: it would have to come first. Any choice of 5 different digits from 1 to 9 can be written in increasing order in exactly one way, so the answer is C(9, 5) = 126.",
  }),
  puzzle({
    id: "q-letters",
    title: "Letters in the wrong envelopes",
    topicId: "math.combinatorics",
    concepts: ["inclusion-exclusion"],
    difficulty: "easy",
    prompt:
      "Four letters are placed at random into four addressed envelopes, one letter each. What is the probability that no letter is in its own envelope?",
    answer: "3/8",
    answerNote:
      "By inclusion-exclusion, the number of arrangements with no fixed point is 4! × (1 − 1 + 1/2 − 1/6 + 1/24) = 9. So the probability is 9/24 = 3/8, already close to the large-n limit 1/e ≈ 0.368.",
  }),
  puzzle({
    id: "q-robot-routes",
    title: "Routes below the diagonal",
    topicId: "math.combinatorics",
    concepts: ["catalan-numbers"],
    difficulty: "medium",
    prompt:
      "A robot moves from the bottom-left to the top-right corner of a 5 by 5 grid of blocks, one block right or one block up at a time. How many routes never rise above the diagonal joining those corners?",
    answer: "42",
    answerNote:
      "Routes that may touch but never cross the diagonal are counted by the Catalan number C₅ = C(10, 5)/6 = 252/6 = 42. The reflection argument: each bad route reflects to a route to a shifted corner, and there are C(10, 4) = 210 of those, so 252 − 210 = 42.",
  }),
  puzzle({
    id: "q-last-digit",
    title: "Last digit of a power",
    topicId: "math.number-theory",
    concepts: ["modular-arithmetic-for-puzzles"],
    difficulty: "easy",
    prompt: "What is the last digit of 7^2026?",
    answer: "9",
    answerNote:
      "Last digits of powers of 7 cycle with period 4: 7, 9, 3, 1. Since 2026 leaves remainder 2 when divided by 4, the last digit matches 7² = 49, so it is 9.",
  }),
  puzzle({
    id: "q-factorial-zeros",
    title: "Zeros at the end of 100!",
    topicId: "math.number-theory",
    concepts: ["divisibility-and-primes"],
    difficulty: "easy",
    prompt: "How many zeros are at the end of 100! (100 factorial)?",
    answer: "24",
    answerNote:
      "Each trailing zero needs a factor 10 = 2 × 5, and factors of 2 are plentiful, so count the 5s: 100/5 = 20 multiples of 5, plus 100/25 = 4 multiples of 25 that contribute a second 5. Total 24.",
  }),
  puzzle({
    id: "q-bouncing-ball",
    title: "Bouncing ball",
    topicId: "math.number-theory",
    concepts: ["series-and-sums"],
    difficulty: "medium",
    prompt:
      "A ball dropped from 10 meters always bounces back to 60% of the height it fell from. Treating the bounces as going on forever, what total distance does it travel, in meters?",
    answer: "40",
    answerNote:
      "The first fall is 10 m. Each later bounce goes up and down the same height: 6, 3.6, 2.16, … a geometric series with sum 6/(1 − 0.6) = 15. Total 10 + 2 × 15 = 40 m.",
  }),
  puzzle({
    id: "q-up-then-down",
    title: "Up 20%, down 20%",
    topicId: "math.mental",
    concepts: ["fractions-decimals-and-percentages"],
    difficulty: "easy",
    prompt:
      "A price rises by 20% and later falls by 20%. What is the overall percentage change? (Answer with a % sign, for example 5%.)",
    answer: "-4%",
    answerNote:
      "The multipliers combine: 1.2 × 0.8 = 0.96, so the price ends 4% lower. The fall applies to a larger base than the rise did.",
  }),
  puzzle({
    id: "q-river-fence",
    title: "Fence by a river",
    topicId: "math.calculus",
    concepts: ["derivatives-and-optimization"],
    difficulty: "easy",
    prompt:
      "A farmer has 100 meters of fence to enclose a rectangle beside a straight river; the river side needs no fence. What is the largest area possible, in square meters?",
    answer: "1250",
    answerNote:
      "With two sides of length x perpendicular to the river, the side along it is 100 − 2x and the area is x(100 − 2x). The derivative 100 − 4x is zero at x = 25, giving 25 × 50 = 1,250 m². Without the river it would be a square.",
  }),
  puzzle({
    id: "q-density-tail",
    title: "Upper half of a density",
    topicId: "math.calculus",
    concepts: ["integrals-in-probability"],
    difficulty: "easy",
    prompt:
      "A random variable has density 3x² on the interval from 0 to 1. What is the probability that it exceeds 1/2?",
    answer: "7/8",
    answerNote:
      "The distribution function is F(x) = x³, so P(X > 1/2) = 1 − (1/2)³ = 7/8. This is the largest of three independent uniforms, which exceeds 1/2 unless all three fall below it.",
  }),
  puzzle({
    id: "q-eigenvalue",
    title: "Largest eigenvalue",
    topicId: "math.linear-algebra",
    concepts: ["eigenvalues-and-eigenvectors"],
    difficulty: "easy",
    prompt: "What is the largest eigenvalue of the 2 by 2 matrix with rows (2, 1) and (1, 2)?",
    answer: "3",
    answerNote:
      "The characteristic equation is (2 − λ)² − 1 = 0, so λ = 1 or 3. The eigenvector for 3 is (1, 1), which the matrix maps to (3, 3). As a covariance matrix, this is the variance along the first principal direction.",
  }),
  puzzle({
    id: "q-sock-colors",
    title: "A matching pair in the dark",
    topicId: "math.combinatorics",
    concepts: ["pigeonhole-principle"],
    difficulty: "easy",
    prompt:
      "A dark drawer holds socks in 5 colors, with plenty of each. How many socks must you take out to be sure of a matching pair?",
    answer: "6",
    answerNote:
      "Five socks can all differ in color, one per color. A sixth must repeat a color, by the pigeonhole principle, so 6 is enough and 5 is not.",
  }),
  puzzle({
    id: "q-cut-chessboard",
    title: "Dominoes on a cut board",
    topicId: "math.proofs",
    concepts: ["invariants-and-monovariants", "math.number-theory.parity-and-invariants"],
    difficulty: "medium",
    prompt:
      "Two diagonally opposite corner squares are removed from a chessboard. Can 31 dominoes, each covering two neighboring squares, cover the remaining 62 squares exactly? (Answer yes or no.)",
    answer: "no",
    answerNote:
      "Opposite corners have the same color, so the cut board has 30 squares of one color and 32 of the other. Every domino covers one square of each color, so 31 dominoes always cover 31 of each. No tiling exists.",
  }),
  puzzle({
    id: "q-fermi-tea",
    title: "Office tea and coffee",
    topicId: "math.mental",
    concepts: ["fermi-estimation"],
    difficulty: "medium",
    prompt:
      "Estimate how many cups of tea and coffee an office of 300 people drinks in a year. Show your structure.",
    answer: null,
    answerNote:
      "One structure: 300 people × about 80% who drink them × about 2.5 cups per working day × about 230 working days ≈ 140,000 cups. State each assumption, check the order of magnitude (hundreds of cups a day sounds right for 300 people), and give a range such as 100,000 to 200,000.",
  }),

  // Puzzles
  puzzle({
    id: "q-nine-coins",
    title: "One heavy coin in nine",
    topicId: "puzzles.logic",
    concepts: ["weighing-puzzles"],
    difficulty: "easy",
    prompt:
      "Nine coins look identical, but one is slightly heavier than the rest. What is the fewest balance weighings that always finds the heavy coin?",
    answer: "2",
    answerNote:
      "Weigh 3 against 3. If one side is heavier, the coin is among those 3; if they balance, it is among the other 3. Then weigh 1 against 1 in that group the same way. Each weighing has 3 outcomes, so 1 weighing can't separate 9 cases, and 2 are needed.",
  }),
  puzzle({
    id: "q-poison-two-rounds",
    title: "Poison with two rounds",
    topicId: "puzzles.logic",
    concepts: ["poisoned-bottles-and-binary-encoding"],
    difficulty: "hard",
    prompt:
      "One of 240 bottles is poisoned. A taster who drinks poison shows symptoms exactly 24 hours later. You have 48 hours, so tasters can drink in two rounds. What is the fewest tasters that always identifies the poisoned bottle?",
    answer: "5",
    answerNote:
      "Each taster now has three outcomes: symptoms after round 1, symptoms after round 2, or none. Write each bottle number in base 3 with 5 digits (3⁵ = 243 ≥ 240). In round 1, each taster drinks from the bottles with a 1 in their digit; in round 2, the tasters still well drink from those with a 2. The outcomes spell out the poisoned bottle's digits. Four tasters give only 81 outcomes, too few.",
  }),
  puzzle({
    id: "q-five-pirates",
    title: "Five pirates share gold",
    topicId: "puzzles.logic",
    concepts: ["pirates-and-backward-induction"],
    difficulty: "hard",
    prompt:
      "Five pirates of strict seniority share 100 gold coins. The most senior pirate still aboard proposes a split and everyone votes; it passes if at least half vote yes, the proposer included. Otherwise the proposer walks the plank and the next pirate proposes. Each pirate wants first to survive, then as much gold as possible, and, other things equal, prefers to see others walk the plank. How many coins does the most senior pirate keep?",
    answer: "98",
    answerNote:
      "Work backward. With 2 pirates the senior keeps all 100 with their own vote. With 3, the senior buys the most junior with 1 coin (99, 0, 1). With 4, the senior buys the second-most-junior with 1 (99, 0, 1, 0). With 5, the senior needs two more votes and buys the pirates who would get nothing next round, the third and fifth, with 1 coin each: 98, 0, 1, 0, 1.",
  }),
  puzzle({
    id: "q-hat-line",
    title: "Hats in a line",
    topicId: "puzzles.logic",
    concepts: ["hat-and-prisoner-puzzles", "math.number-theory.parity-and-invariants"],
    difficulty: "medium",
    prompt:
      "Ten people stand in a line, each wearing a black or white hat. Each sees the hats of everyone in front of them but not their own or those behind. Starting from the back, each person says one color aloud, and everyone hears it. They agree on a plan beforehand. How many can they guarantee to name their own hat color correctly?",
    answer: "9",
    answerNote:
      'The person at the back says "black" if they see an odd number of black hats and "white" otherwise. Everyone else can then work out their own hat from that parity, the hats they see and the colors already called. The back person\'s own hat is never seen by anyone, so they can\'t be guaranteed: 9 is the best possible.',
  }),
  puzzle({
    id: "q-hands-meet",
    title: "When the hands meet",
    topicId: "puzzles.logic",
    concepts: ["clocks-and-angles"],
    difficulty: "medium",
    prompt:
      "How many minutes after 1:00 do the hour and minute hands of a clock first point in the same direction?",
    answer: "60/11",
    answerNote:
      "The minute hand turns 6 degrees a minute and the hour hand 0.5. At 1:00 the hour hand is 30 degrees ahead, so the minute hand catches up after 30/5.5 = 60/11 minutes, about 5 minutes 27 seconds. The hands meet every 12/11 hours, 11 times in 12 hours.",
  }),
  puzzle({
    id: "q-take-134",
    title: "Take 1, 3 or 4",
    topicId: "puzzles.games",
    concepts: ["take-away-games"],
    difficulty: "medium",
    prompt:
      "A pile has 30 stones. Two players take turns removing 1, 3 or 4 stones, and whoever takes the last stone wins. Does the first player win with perfect play? (Answer yes or no.)",
    answer: "no",
    answerNote:
      "Label positions from 0 upward: a position is losing if every move leads to a winning one. The losing positions are 0, 2, 7, 9, 14, 16, 21, 23, 28, 30, …: exactly the numbers leaving remainder 0 or 2 when divided by 7. Since 30 = 4 × 7 + 2, the first player loses against perfect play.",
  }),
  puzzle({
    id: "q-three-eggs",
    title: "Three eggs, 100 floors",
    topicId: "puzzles.logic",
    concepts: ["egg-drop"],
    difficulty: "hard",
    prompt:
      "You have three identical eggs and a 100-floor building. What is the fewest drops that always finds the highest floor from which an egg survives the fall?",
    answer: "9",
    answerNote:
      "With d drops and e eggs you can cover f(d, e) = f(d − 1, e − 1) + f(d − 1, e) + 1 floors: the first drop's floor, what the broken branch covers below it and what the unbroken branch covers above. For 3 eggs, f(d, 3) = C(d, 1) + C(d, 2) + C(d, 3): f(8, 3) = 92 is too few, and f(9, 3) = 129 is enough. So 9 drops.",
  }),
  puzzle({
    id: "q-five-hikers",
    title: "Five hikers and one lamp",
    topicId: "puzzles.logic",
    concepts: ["river-crossing-and-bridge-puzzles"],
    difficulty: "hard",
    prompt:
      "Five hikers must cross a narrow bridge at night with one lamp. At most two cross at a time, walking at the slower one's pace, and the lamp must be carried on every crossing. They take 1, 3, 6, 8 and 12 minutes. What is the shortest total time?",
    answer: "29",
    answerNote:
      "Send the two slowest together, using the two fastest as lamp carriers: 1 and 3 cross (3), 1 returns (1), 8 and 12 cross (12), 3 returns (3), 1 and 3 cross (3), 1 returns (1), then 1 and 6 cross (6). Total 29. A search over all crossing sequences confirms nothing is faster; letting 1 escort everyone takes 32.",
  }),
  puzzle({
    id: "q-guards",
    title: "One question for two guards",
    topicId: "puzzles.logic",
    concepts: ["liars-and-truth-tellers"],
    difficulty: "medium",
    prompt:
      "Two doors: one leads out, the other doesn't. Each has a guard; one guard always tells the truth and the other always lies, and you don't know which is which. You may ask one guard one yes-or-no question. What do you ask?",
    answer: null,
    answerNote:
      'Point at a door and ask either guard: "If I asked the other guard whether this door leads out, would they say yes?" Both guards answer the opposite of the truth (one truthfully reports a lie, the other lies about a truth), so take the door if the answer is no. Another option: "Would you say yes if I asked you whether this door leads out?" Both guards then answer yes exactly when it does.',
  }),
  puzzle({
    id: "q-knockout",
    title: "Knockout matches",
    topicId: "puzzles.logic",
    concepts: ["25-horses-and-tournament-puzzles"],
    difficulty: "easy",
    prompt:
      "A knockout tournament has 100 players; when a round has an odd number of players, one of them gets a free pass. How many matches are played to find the winner?",
    answer: "99",
    answerNote:
      "Every match knocks out exactly one player, and 99 players must be knocked out, so there are 99 matches whatever the byes. Counting round by round (50 + 25 + 12 + 6 + 3 + 2 + 1) gives the same total.",
  }),

  // Markets
  puzzle({
    id: "q-die-payout",
    title: "Paid twice the die",
    topicId: "markets.betting",
    concepts: ["expected-value-decisions"],
    difficulty: "easy",
    prompt:
      "A game costs 5 to play. You roll a fair die and receive twice the number shown. What is your expected profit per game?",
    answer: "2",
    answerNote:
      "The expected payout is 2 × 3.5 = 7, so the expected profit is 7 − 5 = 2 per game. A positive expected value is necessary but not sufficient for a good bet: stake size and risk matter too.",
  }),
  puzzle({
    id: "q-kelly-two-to-one",
    title: "Kelly at 2 to 1",
    topicId: "markets.betting",
    concepts: ["kelly-criterion"],
    difficulty: "medium",
    prompt:
      "A bet pays 2 to 1, so you win 2 for each 1 staked, and it wins 40% of the time. What fraction of your bankroll does the Kelly criterion stake?",
    answer: "0.1",
    answerNote:
      "Kelly stakes f = p − q/b = 0.4 − 0.6/2 = 0.1, the fraction that maximizes the expected logarithm of wealth, 0.4 ln(1 + 2f) + 0.6 ln(1 − f). The edge per unit staked is 0.4 × 2 − 0.6 = 0.2, divided by the odds 2.",
  }),
  puzzle({
    id: "q-put-from-call",
    title: "Put from a call",
    topicId: "markets.options",
    concepts: ["put-call-parity"],
    difficulty: "medium",
    prompt:
      "A stock that pays no dividends trades at 100. A one-year European call with strike 100 costs 10.45, and the risk-free rate is 5% a year, continuously compounded. What should the matching European put cost?",
    answer: "10.45 - 100 + 100*e^(-0.05)",
    answerNote:
      "Put-call parity: C − P = S − K e^(−rT), so P = C − S + K e^(−rT) = 10.45 − 100 + 100 e^(−0.05) ≈ 10.45 − 100 + 95.12 = 5.57. Any other price allows a riskless profit by trading the call, the put, the stock and a bond.",
  }),
  puzzle({
    id: "q-sharpe",
    title: "A fund's Sharpe ratio",
    topicId: "markets.pricing",
    concepts: ["sharpe-ratio-and-risk-adjusted-returns"],
    difficulty: "easy",
    prompt:
      "A fund returns 9% a year on average with 15% annual volatility, and the risk-free rate is 3%. What is its Sharpe ratio?",
    answer: "0.4",
    answerNote:
      "Sharpe ratio = (return − risk-free rate)/volatility = (9% − 3%)/15% = 0.4. It measures excess return per unit of risk, so leverage doesn't change it.",
  }),
  puzzle({
    id: "q-two-asset-volatility",
    title: "Two assets, half each",
    topicId: "markets.pricing",
    concepts: ["diversification-and-correlation", "math.linear-algebra.covariance-matrices"],
    difficulty: "medium",
    prompt:
      "Two assets each have 20% annual volatility, and their returns have correlation 0.5. What is the volatility of a portfolio split equally between them?",
    answer: "sqrt(0.03)",
    answerNote:
      "Variance = 0.5² × 0.04 + 0.5² × 0.04 + 2 × 0.5 × 0.5 × 0.5 × 0.2 × 0.2 = 0.01 + 0.01 + 0.01 = 0.03, so the volatility is √0.03 ≈ 17.3%. Lower correlation diversifies more: at correlation 0 it would be about 14.1%.",
  }),
  puzzle({
    id: "q-three-payments",
    title: "Three yearly payments",
    topicId: "markets.pricing",
    concepts: ["time-value-of-money"],
    difficulty: "easy",
    prompt:
      "You will receive 100 at the end of each of the next three years. At a 10% annual discount rate, what are these payments worth today?",
    answer: "100/1.1 + 100/1.1^2 + 100/1.1^3",
    answerNote:
      "Discount each payment by 1.1 per year: 90.91 + 82.64 + 75.13 ≈ 248.69. The annuity formula gives the same: 100 × (1 − 1.1^(−3))/0.1.",
  }),
  puzzle({
    id: "q-second-price",
    title: "Bidding in a second-price auction",
    topicId: "markets.game-theory",
    concepts: ["auctions"],
    difficulty: "easy",
    prompt:
      "In a sealed-bid second-price auction, the highest bidder wins and pays the second-highest bid. The item is worth exactly 50 to you. What should you bid?",
    answer: "50",
    answerNote:
      "Bid your true value. Your bid only decides whether you win, not what you pay. Bidding more can only add wins at a price above 50, which lose money; bidding less can only give up wins at a price below 50, which were profitable.",
  }),
  puzzle({
    id: "q-zero-sum-value",
    title: "Value of a small game",
    topicId: "markets.game-theory",
    concepts: ["zero-sum-games-and-mixed-strategies"],
    difficulty: "hard",
    prompt:
      "You and an opponent choose at the same time: you pick A or B, they pick X or Y. You win 3 for (A, X), lose 1 for (A, Y), lose 2 for (B, X) and win 1 for (B, Y); they get the opposite. With both playing optimally, what is the game worth to you per round?",
    answer: "1/7",
    answerNote:
      "No pure choice is stable, so mix. Choosing A with probability p makes the opponent indifferent when 3p − 2(1 − p) = −p + (1 − p), so p = 3/7. Your expected payoff is then 5p − 2 = 1/7. The opponent's matching mix plays X with probability 2/7 and holds you to 1/7 as well.",
  }),
  puzzle({
    id: "q-log-insurance",
    title: "What insurance is worth",
    topicId: "markets.betting",
    concepts: ["utility-and-risk-aversion"],
    difficulty: "hard",
    prompt:
      "Your wealth is 100 and you face a 50% chance of losing 50. If you value wealth by its logarithm, what is the most you would pay for insurance that removes the loss entirely?",
    answer: "100 - sqrt(5000)",
    answerNote:
      "Without insurance your expected log wealth is 0.5 ln 100 + 0.5 ln 50 = ln √5000, so the certain wealth you value equally is √5000 ≈ 70.71. You would pay up to 100 − 70.71 ≈ 29.29, more than the expected loss of 25; the extra 4.29 is the price of risk aversion.",
  }),
  puzzle({
    id: "q-card-total-market",
    title: "Market on three cards",
    topicId: "markets.making",
    concepts: ["making-a-market", "prob.random-variables.variance-and-standard-deviation"],
    difficulty: "medium",
    prompt:
      "Make a two-sided market on the total of three cards dealt from a shuffled standard deck, counting an ace as 1 and a jack, queen and king as 11, 12 and 13. How would you move it after seeing the first card?",
    answer: null,
    answerNote:
      "Each card averages 7, so the fair value is 21. One card has variance (13² − 1)/12 = 14; drawing without replacement gives 3 × 14 × 49/51 ≈ 40.4 for the total, a standard deviation of about 6.4. Quote around 21, for example 20 bid at 22 offered. After seeing a first card c, the fair value becomes c + 2 × (364 − c)/51, since the other 51 cards average (364 − c)/51; a king moves it to about 26.8, and the spread can tighten because less is unknown.",
  }),
];
