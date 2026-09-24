// Pattern drill prompts (BUILD_SPEC.md 8.3, F10): original 2 to 4 sentence mini-problems in
// everyday settings, never rewordings of known platform problems. Each names the pattern
// concept(s) that solve it and the key insight. The first id is the main answer; any further ids
// are also fully correct.
//
// Every one of the 90 DSA patterns is the main answer of at least three prompts
// (tests/seed/drills.test.ts checks this, the ids and the sentence counts).
import type { DrillPrompt } from "@/lib/types";

export const DRILL_PROMPTS: readonly DrillPrompt[] = [
  // Arrays
  {
    id: "drill-best-trading-days",
    text: "A shop records its profit or loss for each day of the year, and some days lose money. Find the run of consecutive days with the largest total profit to highlight in the annual report.",
    answerConceptIds: ["dsa.arrays.kadanes-algorithm"],
    keyInsight:
      "The best run ending today either extends yesterday's best run or starts fresh today, whichever is larger.",
    difficulty: "easy",
  },
  {
    id: "drill-food-court-ring",
    text: "A food court has stalls arranged in a ring, each with a daily profit or loss. A tenant may lease any run of adjacent stalls, and the run may wrap around the ring. Find the most profitable run.",
    answerConceptIds: ["dsa.arrays.kadanes-algorithm"],
    keyInsight:
      "A wrapping run is the total minus the worst non-wrapping run, so run Kadane for both the maximum and the minimum (and handle all-negative input).",
    difficulty: "medium",
  },
  {
    id: "drill-multiplier-streak",
    text: "A game awards a multiplier each round, such as 2, −1, 0 or 0.5. A streak scores the product of its multipliers. Find the best score over any run of consecutive rounds.",
    answerConceptIds: ["dsa.arrays.kadanes-algorithm"],
    keyInsight:
      "Track both the largest and the smallest product ending at each round, because a negative multiplier swaps them.",
    difficulty: "medium",
  },
  {
    id: "drill-parcel-three-zones",
    text: "A warehouse robot must arrange a row of parcels so that fragile ones come first, standard ones next and oversized ones last. It can swap two parcels but has no spare floor space, and it should pass along the row only once.",
    answerConceptIds: ["dsa.arrays.dutch-national-flag"],
    keyInsight:
      "Keep low, mid and high pointers; swap fragile parcels to the low region and oversized ones to the high region, and advance mid only past standard ones.",
    difficulty: "easy",
  },
  {
    id: "drill-scores-around-pass-mark",
    text: "You have a list of exam scores and a pass mark. Rearrange the list in place so that scores below the mark come first, scores equal to it next, and higher scores last, in one pass.",
    answerConceptIds: ["dsa.arrays.dutch-national-flag"],
    keyInsight: "This is a three-way partition around the pass mark with three pointers.",
    difficulty: "easy",
  },
  {
    id: "drill-quicksort-many-repeats",
    text: "Your quicksort slows to a crawl on a million ratings that only take the values 1 to 5. Change the partition step so values equal to the pivot are never processed again.",
    answerConceptIds: ["dsa.arrays.dutch-national-flag"],
    keyInsight:
      "Partition into less than, equal to and greater than the pivot in one pass, then recurse only on the outer two parts.",
    difficulty: "medium",
  },
  {
    id: "drill-cinema-ticket-misprint",
    text: "A cinema printed tickets numbered 1 to n for n seats, but one number was printed twice and another never printed. Given the n tickets collected, find both numbers using constant extra memory.",
    answerConceptIds: ["dsa.arrays.cyclic-sort"],
    keyInsight:
      "Swap each value v into index v − 1; afterwards the one slot holding the wrong value shows the duplicate and, by its position, the missing number.",
    difficulty: "medium",
  },
  {
    id: "drill-unclaimed-lockers",
    text: "A changing room has lockers numbered 1 to n, and a list records which locker each of n people claimed, with some lockers claimed more than once. List every locker nobody claimed, using no memory beyond the list and the output.",
    answerConceptIds: ["dsa.arrays.cyclic-sort"],
    keyInsight:
      "Cyclic sort places each claim at its own index; every index left holding a different number is an unclaimed locker.",
    difficulty: "medium",
  },
  {
    id: "drill-next-member-number",
    text: "A club gives each new member the smallest positive member number not already in use. The list of numbers in use is unsorted and contains junk entries such as 0, negatives and huge values. Find the next number to hand out in linear time and constant extra memory.",
    answerConceptIds: ["dsa.arrays.cyclic-sort"],
    keyInsight:
      "Only values 1 to n matter; swap each into index v − 1, ignore the rest, and the first index i not holding i + 1 gives the answer.",
    difficulty: "hard",
  },
  {
    id: "drill-class-election",
    text: "In a class election each student writes one name on a ballot, and one name is known to appear on more than half of them. Find that name in a single pass using only a couple of variables.",
    answerConceptIds: ["dsa.arrays.boyer-moore-majority-vote"],
    keyInsight:
      "Keep a candidate and a counter; a matching vote adds one, any other vote cancels one, and the majority survives the cancelling.",
    difficulty: "easy",
  },
  {
    id: "drill-heavy-traffic-sources",
    text: "A network monitor sees billions of source addresses and cannot store them, though it may read the log twice. Report every address that sends more than a third of all traffic.",
    answerConceptIds: ["dsa.arrays.boyer-moore-majority-vote"],
    keyInsight:
      "At most two values can exceed a third, so keep two candidates with counters, cancel triples of different values, then verify the counts in a second pass.",
    difficulty: "medium",
  },
  {
    id: "drill-survey-majority-check",
    text: "A survey's answers arrive as a long read-only list of product codes. Decide whether some code was chosen by a strict majority, and which one, without sorting or a hash map.",
    answerConceptIds: ["dsa.arrays.boyer-moore-majority-vote"],
    keyInsight:
      "The vote gives a candidate but doesn't prove a majority exists, so count the candidate in a second pass.",
    difficulty: "easy",
  },

  // Prefix sums
  {
    id: "drill-step-range-queries",
    text: "A fitness tracker stores the step count for every day of the year. The app must answer questions like “how many steps between 3 March and 18 April?” thousands of times a second.",
    answerConceptIds: ["dsa.prefix-sums.1d-prefix-sums"],
    keyInsight: "Precompute running totals once; any range total is one subtraction.",
    difficulty: "easy",
  },
  {
    id: "drill-balanced-carriage",
    text: "A train has carriages with known passenger counts. Find a carriage where the passengers in front of it equal the passengers behind it, so a conductor starting there has the same work both ways.",
    answerConceptIds: ["dsa.prefix-sums.1d-prefix-sums"],
    keyInsight:
      "With the grand total and a running prefix, the front is the prefix and the back is the total minus the prefix minus the carriage itself.",
    difficulty: "easy",
  },
  {
    id: "drill-bakery-before-after",
    text: "A bakery logs its sales for every hour of the day. For each hour, the manager wants the average of all hours before it and the average of all hours after it, to see when the afternoon slump starts.",
    answerConceptIds: ["dsa.prefix-sums.1d-prefix-sums"],
    keyInsight:
      "One pass of running totals gives the sum before each hour, and the total minus the running sum gives the sum after it.",
    difficulty: "easy",
  },
  {
    id: "drill-zero-net-stretches",
    text: "A budgeting app lists each day's net change to your balance, which can be positive or negative. Count how many stretches of consecutive days ended with no net change at all.",
    answerConceptIds: ["dsa.prefix-sums.prefix-sum-with-hash-map"],
    keyInsight:
      "A stretch sums to zero when two running totals are equal, so count earlier occurrences of each running total in a hash map.",
    difficulty: "medium",
  },
  {
    id: "drill-egg-cartons",
    text: "A farm collects eggs every hour and ships them in cartons of 7. Find the longest run of consecutive hours whose eggs fill cartons exactly, with none left over.",
    answerConceptIds: ["dsa.prefix-sums.prefix-sum-with-hash-map"],
    keyInsight:
      "Two running totals with the same remainder mod 7 bound a divisible run, so store the first hour each remainder appears.",
    difficulty: "medium",
  },
  {
    id: "drill-even-win-loss",
    text: "A player's match history is a list of wins and losses. Find the longest run of consecutive matches with exactly as many wins as losses.",
    answerConceptIds: ["dsa.prefix-sums.prefix-sum-with-hash-map"],
    keyInsight:
      "Count a win as +1 and a loss as −1; a balanced run lies between two equal running totals, so remember where each total first appeared.",
    difficulty: "medium",
  },
  {
    id: "drill-city-block-population",
    text: "A city map is a grid of blocks, each with a population count. Planners ask thousands of questions about how many people live inside a given rectangle of blocks.",
    answerConceptIds: ["dsa.prefix-sums.2d-prefix-sums"],
    keyInsight:
      "Precompute the total of every top-left rectangle; any rectangle then takes four lookups with inclusion and exclusion.",
    difficulty: "easy",
  },
  {
    id: "drill-photo-box-blur",
    text: "A photo editor's blur replaces every pixel with the average of the k × k square around it, clipped at the edges. It must stay fast even when k is large.",
    answerConceptIds: ["dsa.prefix-sums.2d-prefix-sums"],
    keyInsight:
      "A summed-area table gives each square's total in O(1), so the cost no longer depends on k.",
    difficulty: "medium",
  },
  {
    id: "drill-orchard-best-plot",
    text: "An orchard is a grid of trees with known yields. Find the square plot of side s with the highest total yield, checking every possible position.",
    answerConceptIds: ["dsa.prefix-sums.2d-prefix-sums"],
    keyInsight:
      "With a 2D prefix table each candidate square costs O(1), so trying every position is linear in the grid size.",
    difficulty: "medium",
  },
  {
    id: "drill-hotel-nightly-occupancy",
    text: "A hotel receives a million bookings, each covering a range of nights in the season. It needs the number of occupied rooms on every night.",
    answerConceptIds: ["dsa.prefix-sums.difference-arrays", "dsa.intervals.sweep-line"],
    keyInsight:
      "Add +1 on a booking's first night and −1 after its last; a running sum then gives each night's count.",
    difficulty: "easy",
  },
  {
    id: "drill-road-resurfacing",
    text: "A road crew receives thousands of instructions like “raise the road by 3 cm from metre 120 to metre 480” before anyone checks the result. Compute the final height change at every metre.",
    answerConceptIds: ["dsa.prefix-sums.difference-arrays"],
    keyInsight:
      "Record each instruction at its two ends only; one prefix sum at the end applies all of them.",
    difficulty: "easy",
  },
  {
    id: "drill-stage-lamp-limits",
    text: "A stage has n lamps, and a show script contains many commands of the form “turn lamps l to r up by x”. After the whole script, the engineer needs to know whether any lamp went past its maximum brightness.",
    answerConceptIds: ["dsa.prefix-sums.difference-arrays"],
    keyInsight:
      "Apply each range update in O(1) on a difference array, then rebuild the final values with one prefix pass and check the limits.",
    difficulty: "medium",
  },

  // Hashing
  {
    id: "drill-same-letter-tiles",
    text: "A teacher suspects two essays were built from the same set of letter tiles. Check whether two long texts use exactly the same letters the same number of times, ignoring spaces.",
    answerConceptIds: ["dsa.hashing.frequency-counting"],
    keyInsight:
      "Count letters in both texts and compare the counts; sorting also works but costs more.",
    difficulty: "easy",
  },
  {
    id: "drill-florist-orders",
    text: "A florist has today's stock of each flower type. Given a list of orders, each needing certain numbers of each flower, decide which orders could be filled on their own from today's stock.",
    answerConceptIds: ["dsa.hashing.frequency-counting"],
    keyInsight: "Count the stock once in a hash map, then compare each order's counts against it.",
    difficulty: "easy",
  },
  {
    id: "drill-favourite-fruit-groups",
    text: "A survey asked everyone for their three favourite fruits, in any order. Group together the people who picked the same three fruits, however they ordered them.",
    answerConceptIds: ["dsa.hashing.frequency-counting"],
    keyInsight:
      "Sort each answer (or count it) to make a canonical key, then group people by that key in a hash map.",
    difficulty: "easy",
  },
  {
    id: "drill-gift-card-pair",
    text: "A gift card is worth exactly 50 dollars, and you want to buy two different items from a long, unsorted price list that use it up exactly. Find such a pair in one pass.",
    answerConceptIds: ["dsa.hashing.complement-lookup"],
    keyInsight: "For each price p, check whether 50 − p has already been seen; if not, remember p.",
    difficulty: "easy",
  },
  {
    id: "drill-age-gap-pairs",
    text: "A mentoring scheme pairs people whose ages differ by exactly k years, where k is positive. Count how many such pairs exist in a list of ages that may contain repeats.",
    answerConceptIds: ["dsa.hashing.complement-lookup"],
    keyInsight:
      "Walk the list with a count map of ages seen so far and add the counts of age − k and age + k for each new age.",
    difficulty: "medium",
  },
  {
    id: "drill-stream-pair-target",
    text: "Numbers arrive one at a time. After each arrival, report whether any two numbers seen so far add up to a fixed target T.",
    answerConceptIds: ["dsa.hashing.complement-lookup"],
    keyInsight:
      "Keep a set of seen values; the new value x completes a pair exactly when T − x is already in it, and once true the answer stays true.",
    difficulty: "easy",
  },

  // Two pointers
  {
    id: "drill-sorted-budget-pair",
    text: "A price list is sorted from cheapest to most expensive. Find two items whose prices add up to exactly your budget, using no extra memory.",
    answerConceptIds: ["dsa.two-pointers.opposite-ends-pointers"],
    keyInsight:
      "Start at both ends; if the sum is too small move the left pointer up, if too large move the right pointer down.",
    difficulty: "easy",
  },
  {
    id: "drill-squared-temperatures",
    text: "An energy model needs the squares of a list of temperatures that is sorted but includes negatives. Produce the squares in sorted order in linear time.",
    answerConceptIds: ["dsa.two-pointers.opposite-ends-pointers"],
    keyInsight:
      "The largest squares sit at the two ends, so compare the ends and fill the result from the back.",
    difficulty: "easy",
  },
  {
    id: "drill-heaviest-pair-that-fits",
    text: "A bag can carry at most W kilograms and you have a sorted list of item weights. Find the heaviest pair of items that still fits.",
    answerConceptIds: ["dsa.two-pointers.opposite-ends-pointers"],
    keyInsight:
      "If the pair fits, record it and move the left pointer up to try heavier; otherwise move the right pointer down.",
    difficulty: "medium",
  },
  {
    id: "drill-dedupe-mailing-list",
    text: "A sorted mailing list contains repeated addresses. Remove the repeats in place so each address appears once, and return how many remain, without allocating another list.",
    answerConceptIds: ["dsa.two-pointers.same-direction-pointers"],
    keyInsight:
      "A write pointer marks the end of the kept part, and the read pointer copies each value that differs from the last kept one.",
    difficulty: "easy",
  },
  {
    id: "drill-blank-film-frames",
    text: "A film reel has blank frames mixed in among the photos. Move all blank frames to the end in place while keeping the photos in their original order.",
    answerConceptIds: ["dsa.two-pointers.same-direction-pointers"],
    keyInsight:
      "Copy each photo to the write position and advance it, then fill the rest with blanks (or swap as you go).",
    difficulty: "easy",
  },
  {
    id: "drill-two-readings-per-second",
    text: "A sensor log is a sorted list of timestamps in whole seconds, and some seconds have many readings. Keep at most two readings per second, in place.",
    answerConceptIds: ["dsa.two-pointers.same-direction-pointers"],
    keyInsight:
      "Keep a value only if it differs from the value two places behind the write pointer.",
    difficulty: "medium",
  },
  {
    id: "drill-digit-cube-loop",
    text: "A number game repeatedly replaces a number with the sum of the cubes of its digits, so the sequence must eventually repeat. Find the length of the loop it falls into, without storing the values seen.",
    answerConceptIds: ["dsa.two-pointers.fast-and-slow-pointers"],
    keyInsight:
      "Run a slow and a fast copy of the sequence until they meet inside the loop, then walk once around it to measure its length.",
    difficulty: "medium",
  },
  {
    id: "drill-double-booked-seat",
    text: "A read-only list of n + 1 seat assignments uses seat numbers 1 to n, so some seat was assigned more than once. Find a doubly assigned seat without changing the list and with constant extra memory.",
    answerConceptIds: ["dsa.two-pointers.fast-and-slow-pointers"],
    keyInsight:
      "Treat each value as a pointer to the next index; the repeated seat is where the resulting cycle starts, found with Floyd's algorithm.",
    difficulty: "hard",
  },
  {
    id: "drill-generator-cycle-entry",
    text: "A pseudo-random generator computes each value from the previous one with a fixed formula on 32-bit numbers, so it must eventually repeat. Find how many steps pass before it enters its cycle, without a hash set.",
    answerConceptIds: ["dsa.two-pointers.fast-and-slow-pointers"],
    keyInsight:
      "After the runners meet, restart one from the seed; stepping both at speed one, they meet at the cycle entry.",
    difficulty: "hard",
  },
  {
    id: "drill-combined-bus-timetable",
    text: "Two bus companies publish their departure times from the same stop, each list already sorted. Produce one combined timetable in order.",
    answerConceptIds: ["dsa.two-pointers.merging-sorted-sequences"],
    keyInsight: "Walk both lists with one pointer each, always taking the earlier departure.",
    difficulty: "easy",
  },
  {
    id: "drill-customers-of-both-stores",
    text: "Two stores each have a sorted list of customer ids. List the customers who shopped at both, in sorted order, using constant memory besides the output.",
    answerConceptIds: ["dsa.two-pointers.merging-sorted-sequences"],
    keyInsight:
      "Advance the pointer at the smaller id; when the ids match, record it and advance both.",
    difficulty: "easy",
  },
  {
    id: "drill-leaderboard-buffer-merge",
    text: "A leaderboard keeps its scores sorted in a fixed buffer with free slots at the end, exactly enough for today's sorted scores. Merge today's scores in without a second buffer.",
    answerConceptIds: ["dsa.two-pointers.merging-sorted-sequences"],
    keyInsight:
      "Fill from the back: compare the largest remaining score of each list and write it into the last free slot, so nothing is overwritten.",
    difficulty: "medium",
  },
  {
    id: "drill-common-free-time",
    text: "Two colleagues each have a sorted list of free time slots with no overlaps inside a list. Find every period when both are free.",
    answerConceptIds: [
      "dsa.two-pointers.merging-sorted-sequences",
      "dsa.intervals.merge-intervals",
    ],
    keyInsight:
      "Walk both lists; an overlap is from the later start to the earlier end, then advance whichever slot ends first.",
    difficulty: "medium",
  },
  {
    id: "drill-three-ingredient-calories",
    text: "A chef wants three ingredients whose calories add up to exactly 1,000, from a list that may contain repeated values. List every distinct combination of values once.",
    answerConceptIds: ["dsa.two-pointers.ksum"],
    keyInsight:
      "Sort, fix the first ingredient, find the other two with opposite-ends pointers, and skip equal neighbours to avoid repeats.",
    difficulty: "medium",
  },
  {
    id: "drill-four-friends-gift",
    text: "Four friends each pick a different item from a shared price list and want to spend exactly the gift budget together. Find every distinct set of four prices that works.",
    answerConceptIds: ["dsa.two-pointers.ksum"],
    keyInsight:
      "Sort, fix two items with nested loops, use two pointers for the last two, and skip duplicates at every level, for O(n³).",
    difficulty: "hard",
  },
  {
    id: "drill-trades-near-zero",
    text: "A trading desk has a list of trade profits, some negative. Find three trades whose combined profit is as close to zero as possible.",
    answerConceptIds: ["dsa.two-pointers.ksum"],
    keyInsight:
      "Sort, fix one trade, move two pointers inward based on the sign of the current total, and track the closest total seen.",
    difficulty: "medium",
  },

  // Sliding window
  {
    id: "drill-thermostat-average",
    text: "A thermostat logs the temperature every minute. After each reading it must show the average of the last 15 minutes, updating in constant time.",
    answerConceptIds: ["dsa.sliding-window.fixed-size-window"],
    keyInsight: "Add the newest reading and subtract the one leaving the window.",
    difficulty: "easy",
  },
  {
    id: "drill-scrambled-code-positions",
    text: "A long string of letters may contain a 5-letter code with its letters in any order. Find every position where a 5-letter stretch uses exactly the code's letters.",
    answerConceptIds: [
      "dsa.sliding-window.fixed-size-window",
      "dsa.sliding-window.window-with-counts",
    ],
    keyInsight:
      "Slide a window of the code's length, maintaining its letter counts and comparing them with the code's counts.",
    difficulty: "medium",
  },
  {
    id: "drill-busiest-day-of-viewing",
    text: "A streaming service counts viewers every hour for a year. Find the 24-hour period with the most viewers in total.",
    answerConceptIds: ["dsa.sliding-window.fixed-size-window"],
    keyInsight:
      "Keep the 24-hour total by adding the new hour and removing the hour from a day ago, tracking the maximum.",
    difficulty: "easy",
  },
  {
    id: "drill-delivery-minutes",
    text: "A delivery app logs how many orders arrive each minute. Find the longest stretch of consecutive minutes where the total stayed at or below 500 orders.",
    answerConceptIds: ["dsa.sliding-window.variable-size-window"],
    keyInsight:
      "All values are non-negative, so shrink from the left whenever the sum exceeds 500.",
    difficulty: "easy",
  },
  {
    id: "drill-shortest-fundraising-run",
    text: "A charity records the donations it receives each day. Find the shortest run of consecutive days that together raised at least 10,000 dollars.",
    answerConceptIds: ["dsa.sliding-window.variable-size-window"],
    keyInsight:
      "Donations are non-negative, so grow the window until it reaches the goal, then shrink from the left while it still holds, recording the shortest.",
    difficulty: "medium",
  },
  {
    id: "drill-study-streak-repairs",
    text: "A study log marks each day as studied or skipped. If up to 3 skipped days could be made up later, find the longest run of consecutive days that could count as a study streak.",
    answerConceptIds: ["dsa.sliding-window.variable-size-window"],
    keyInsight:
      "Grow the window while it holds at most 3 skipped days; when a fourth appears, move the left edge past the earliest skip.",
    difficulty: "medium",
  },
  {
    id: "drill-two-country-exhibits",
    text: "A museum hall has a row of exhibits, each labelled with its country. Find the longest stretch of consecutive exhibits that covers at most two countries.",
    answerConceptIds: ["dsa.sliding-window.window-with-counts"],
    keyInsight:
      "Keep a count per country inside the window; when a third country enters, shrink from the left until one count reaches zero.",
    difficulty: "medium",
  },
  {
    id: "drill-no-repeat-artist-run",
    text: "A radio playlist lists the artist of each song in order. Find the longest run of consecutive songs in which no artist appears twice.",
    answerConceptIds: ["dsa.sliding-window.window-with-counts"],
    keyInsight:
      "Track counts (or last positions) inside the window; when a repeat enters, move the left edge just past its previous copy.",
    difficulty: "easy",
  },
  {
    id: "drill-repaint-banner-tiles",
    text: "A banner is a line of coloured tiles, and you may repaint at most k of them. Find the longest stretch you can make a single colour.",
    answerConceptIds: ["dsa.sliding-window.window-with-counts"],
    keyInsight:
      "A window is fixable when its length minus its most common colour's count is at most k; keep counts and shrink when that fails.",
    difficulty: "medium",
  },
  {
    id: "drill-three-category-receipts",
    text: "A supermarket receipt lists the category of each item in the order it was scanned. Count the stretches of consecutive items that contain exactly 3 different categories.",
    answerConceptIds: ["dsa.sliding-window.exactly-k-via-at-most-k"],
    keyInsight:
      "Counting windows with at most K categories is a simple sliding window, and exactly 3 equals atMost(3) − atMost(2).",
    difficulty: "hard",
  },
  {
    id: "drill-four-active-hours",
    text: "A step counter marks each hour of the week as active or idle. Count the stretches of consecutive hours that contain exactly 4 active hours.",
    answerConceptIds: [
      "dsa.sliding-window.exactly-k-via-at-most-k",
      "dsa.prefix-sums.prefix-sum-with-hash-map",
    ],
    keyInsight:
      "exactly(4) = atMost(4) − atMost(3); counting running totals in a hash map also works.",
    difficulty: "medium",
  },
  {
    id: "drill-genre-range-promotion",
    text: "A bookshop records the genre of each sale in order. For a report, count the periods of consecutive sales in which between 2 and 4 different genres were sold.",
    answerConceptIds: ["dsa.sliding-window.exactly-k-via-at-most-k"],
    keyInsight: "A count in a range is a difference of two at-most counts: atMost(4) − atMost(1).",
    difficulty: "hard",
  },
  {
    id: "drill-market-street-recipe",
    text: "A recipe needs 2 eggs, 1 onion and 3 tomatoes, and each stall along a market street sells one item. Find the shortest stretch of consecutive stalls where you can buy everything the recipe needs.",
    answerConceptIds: ["dsa.sliding-window.minimum-window-substring"],
    keyInsight:
      "Track need and have counts; expand right until every need is met, then shrink left while still satisfied, recording the shortest.",
    difficulty: "medium",
  },
  {
    id: "drill-whole-team-seen",
    text: "A door camera logs which employee passes each minute. Find the shortest span of time in which every member of a given team was seen at least once.",
    answerConceptIds: ["dsa.sliding-window.minimum-window-substring"],
    keyInsight:
      "Count how many required people the window currently covers, expand until all are covered, and shrink while they still are.",
    difficulty: "medium",
  },
  {
    id: "drill-search-snippet",
    text: "A search engine shows a snippet of a document containing every search keyword. Find the shortest passage of consecutive words that contains all of them.",
    answerConceptIds: ["dsa.sliding-window.minimum-window-substring"],
    keyInsight:
      "Slide a window over the words, keeping per-keyword counts and the number of keywords present, and shrink whenever all are present.",
    difficulty: "medium",
  },

  // Binary search
  {
    id: "drill-phone-book-lookup",
    text: "A phone book app stores a million names in sorted order. Check whether a given name is present using about 20 comparisons.",
    answerConceptIds: ["dsa.binary-search.classic-binary-search"],
    keyInsight: "Halve the sorted range at each step; a million needs about 20 halvings.",
    difficulty: "easy",
  },
  {
    id: "drill-higher-lower-guessing",
    text: "A friend picks a secret number between 1 and a billion and answers each guess with higher, lower or correct. Give a strategy that always finishes within 30 guesses.",
    answerConceptIds: ["dsa.binary-search.classic-binary-search"],
    keyInsight:
      "Always guess the middle of the remaining range; each answer halves it, and 2³⁰ is more than a billion.",
    difficulty: "easy",
  },
  {
    id: "drill-huge-sorted-log",
    text: "A sorted log holds two billion event timestamps. Check whether an event happened at an exact time, making sure the index arithmetic can never overflow.",
    answerConceptIds: ["dsa.binary-search.classic-binary-search"],
    keyInsight:
      "Compute mid as lo + (hi − lo) / 2 in 64-bit indices and keep a clear invariant for lo and hi.",
    difficulty: "easy",
  },
  {
    id: "drill-houses-within-budget",
    text: "A property site keeps house prices in a sorted list. For each buyer's budget, count how many houses cost at most that amount.",
    answerConceptIds: ["dsa.binary-search.lower-and-upper-bound"],
    keyInsight: "The position of upper_bound(budget) is the number of prices at most the budget.",
    difficulty: "easy",
  },
  {
    id: "drill-students-with-score",
    text: "A sorted list of exam scores contains many repeated values. For any given score, report in logarithmic time how many students got exactly that score.",
    answerConceptIds: ["dsa.binary-search.lower-and-upper-bound"],
    keyInsight: "upper_bound(x) − lower_bound(x) is the number of copies of x.",
    difficulty: "easy",
  },
  {
    id: "drill-next-train",
    text: "A station timetable lists today's departure times in order. Given the time you reach the platform, find the next departure at or after it, or say there is none left today.",
    answerConceptIds: ["dsa.binary-search.lower-and-upper-bound"],
    keyInsight:
      "lower_bound finds the first time at or after your arrival; the end of the list means no train.",
    difficulty: "easy",
  },
  {
    id: "drill-rotated-conveyor-ids",
    text: "A circular conveyor holds item ids that were sorted when loaded, but the display starts at an arbitrary item, like 40, 51, 77, 3, 9, 22. Find a given id's position in logarithmic time.",
    answerConceptIds: ["dsa.binary-search.rotated-sorted-arrays"],
    keyInsight:
      "At each step one half around mid is sorted; check whether the target lies in that half's range to pick the side.",
    difficulty: "medium",
  },
  {
    id: "drill-least-loaded-server",
    text: "Servers in a ring are listed in increasing order of load, but the list you receive starts at an arbitrary server. Find the least loaded server in logarithmic time.",
    answerConceptIds: ["dsa.binary-search.rotated-sorted-arrays"],
    keyInsight:
      "Compare mid with the last element: if mid is larger, the minimum is to the right; otherwise it is at mid or to its left.",
    difficulty: "medium",
  },
  {
    id: "drill-rotated-with-repeats",
    text: "A sorted playlist of track numbers was rotated by a shuffle button, and some track numbers repeat. Decide whether track t is present, and explain why the worst case is no longer logarithmic.",
    answerConceptIds: ["dsa.binary-search.rotated-sorted-arrays"],
    keyInsight:
      "When the values at lo, mid and hi are equal you can't tell which half is sorted, so shrink both ends by one, which can cost O(n).",
    difficulty: "hard",
  },
  {
    id: "drill-printer-batches",
    text: "A print shop must print n documents in their given order on k printers, each printer taking one consecutive batch. Find the smallest possible number of pages for the busiest printer.",
    answerConceptIds: ["dsa.binary-search.binary-search-on-the-answer"],
    keyInsight:
      "Guess a limit M and check greedily whether k printers suffice; feasibility only improves as M grows, so binary search M.",
    difficulty: "medium",
  },
  {
    id: "drill-spread-out-routers",
    text: "A street has n possible spots for Wi-Fi routers at given positions, and you must install k routers. Place them so that the smallest distance between any two routers is as large as possible.",
    answerConceptIds: ["dsa.binary-search.binary-search-on-the-answer"],
    keyInsight:
      "Sort the spots, guess a distance D, and place routers greedily at least D apart; if k fit, try a larger D.",
    difficulty: "medium",
  },
  {
    id: "drill-oven-loaves",
    text: "A bakery has several ovens, and oven i bakes one loaf every t_i minutes. Find the least time needed to bake m loaves with all ovens working at once.",
    answerConceptIds: ["dsa.binary-search.binary-search-on-the-answer"],
    keyInsight:
      "In time T oven i makes floor(T / t_i) loaves, a total that only grows with T, so binary search the smallest T that reaches m.",
    difficulty: "medium",
  },
  {
    id: "drill-trail-summit",
    text: "A hiker's device records the altitude at each point of a trail, and neighbouring points never have equal altitude. Find any summit, a point higher than both its neighbours, in logarithmic time.",
    answerConceptIds: ["dsa.binary-search.peak-finding"],
    keyInsight:
      "Compare mid with mid + 1: if the trail climbs there, a summit lies to the right; otherwise one lies at mid or to its left.",
    difficulty: "medium",
  },
  {
    id: "drill-strongest-signal",
    text: "As a car drives past a tower, the signal strength strictly rises and then strictly falls. Find the moment of the strongest signal while reading as few samples as possible.",
    answerConceptIds: ["dsa.binary-search.peak-finding"],
    keyInsight:
      "Binary search on the slope: if the signal is rising at mid, the peak is to the right.",
    difficulty: "easy",
  },
  {
    id: "drill-heat-map-hot-spot",
    text: "A heat map grid of temperatures has no two neighbouring cells equal. Find any cell hotter than all four neighbours without scanning the whole grid.",
    answerConceptIds: ["dsa.binary-search.peak-finding"],
    keyInsight:
      "Take the hottest cell in the middle column and move toward a hotter neighbouring column, halving the columns each time.",
    difficulty: "hard",
  },

  // Sorting
  {
    id: "drill-thousandth-finisher",
    text: "A marathon has a million unsorted finishing times. Find the time of the runner who finished 1,000th, faster than sorting everything.",
    answerConceptIds: ["dsa.sorting.quickselect", "dsa.heaps.top-k-elements"],
    keyInsight:
      "Partition around a random pivot and continue only in the side that contains position 1,000: O(n) on average.",
    difficulty: "medium",
  },
  {
    id: "drill-median-income",
    text: "A statistics office has ten million unsorted household incomes. Find the median as fast as possible on average.",
    answerConceptIds: ["dsa.sorting.quickselect"],
    keyInsight: "Quickselect for the middle position; random pivots make the average linear.",
    difficulty: "medium",
  },
  {
    id: "drill-nearest-fifty-players",
    text: "A game server has the positions of 2 million players and needs the 50 closest to a point, in any order. Do it faster than sorting by distance.",
    answerConceptIds: ["dsa.sorting.quickselect", "dsa.heaps.top-k-elements"],
    keyInsight:
      "Quickselect by distance puts the 50 closest in the first 50 slots in average O(n); a max-heap of size 50 also works.",
    difficulty: "medium",
  },
  {
    id: "drill-ranking-disagreement",
    text: "Two critics each rank the same million films. Measure how much they disagree by counting the pairs of films the two put in opposite order.",
    answerConceptIds: ["dsa.sorting.merge-sort-counting"],
    keyInsight:
      "Write one ranking in the other's order and count inversions while merge sorting, in O(n log n).",
    difficulty: "hard",
  },
  {
    id: "drill-shorter-people-behind",
    text: "A queue of people is listed with their heights, front to back. For each person, count how many people behind them are shorter.",
    answerConceptIds: ["dsa.sorting.merge-sort-counting"],
    keyInsight:
      "During merge sort, when a left-half element is placed, the right-half elements already placed are exactly the shorter ones behind it.",
    difficulty: "hard",
  },
  {
    id: "drill-halving-price-pairs",
    text: "An analyst has years of daily prices for a stock. Count the pairs of days where the earlier price is more than twice the later price.",
    answerConceptIds: ["dsa.sorting.merge-sort-counting"],
    keyInsight:
      "Before merging two sorted halves, count with a forward-moving pointer how many right-half prices are below half of each left-half price.",
    difficulty: "hard",
  },

  // Strings
  {
    id: "drill-licence-plate-mirror",
    text: "A licence plate app flags plates that read the same forwards and backwards. Ignore dashes and spaces, and treat upper and lower case as the same.",
    answerConceptIds: ["dsa.strings.palindromes", "dsa.two-pointers.opposite-ends-pointers"],
    keyInsight:
      "Move two pointers inward from both ends, skipping characters that don't count and comparing the rest case-insensitively.",
    difficulty: "easy",
  },
  {
    id: "drill-mirror-line-of-poem",
    text: "A poet wants the longest stretch of a line of letters that reads the same forwards and backwards. Lines have up to a few thousand letters.",
    answerConceptIds: ["dsa.strings.palindromes"],
    keyInsight:
      "Expand around each of the 2n − 1 centres (letters and the gaps between them): O(n²) time and O(1) memory.",
    difficulty: "medium",
  },
  {
    id: "drill-one-typo-palindrome",
    text: "A word game accepts a word if deleting at most one letter makes it read the same both ways. Decide whether a given word is accepted.",
    answerConceptIds: ["dsa.strings.palindromes"],
    keyInsight:
      "Walk inward from both ends; at the first mismatch, try skipping either letter and check that the rest is a palindrome.",
    difficulty: "medium",
  },
  {
    id: "drill-log-search-worst-case",
    text: "A log viewer must find every occurrence of a pattern in a 50 MB file in guaranteed linear time. Nasty inputs, like searching for aaaab in a file of a's, must not slow it down.",
    answerConceptIds: ["dsa.string-algorithms.kmp-and-the-prefix-function"],
    keyInsight:
      "The prefix function says how far to fall back after a mismatch, so the text pointer never moves backwards: O(n + m).",
    difficulty: "medium",
  },
  {
    id: "drill-banner-motif",
    text: "A long banner was printed by repeating a short motif several times. Given the banner's text, find the shortest motif that could have produced it.",
    answerConceptIds: ["dsa.string-algorithms.kmp-and-the-prefix-function"],
    keyInsight:
      "With p the prefix function's last value, the candidate motif length is n − p; it works when it divides n, otherwise the motif is the whole banner.",
    difficulty: "hard",
  },
  {
    id: "drill-overlapping-tiles",
    text: "Wallpaper tiles carry a strip of symbols, and a new tile can start early if its beginning matches the end of the previous one. Find the longest overlap between a strip's start and its own end, shorter than the whole strip.",
    answerConceptIds: ["dsa.string-algorithms.kmp-and-the-prefix-function"],
    keyInsight:
      "That is exactly the last value of the prefix function: the longest proper prefix that is also a suffix.",
    difficulty: "medium",
  },
  {
    id: "drill-shared-fifty-words",
    text: "A plagiarism checker compares two long essays. Decide whether any sequence of 50 consecutive words appears in both.",
    answerConceptIds: ["dsa.string-algorithms.rolling-hash-and-rabin-karp"],
    keyInsight:
      "Hash every 50-word window of both essays with a rolling hash, match hashes through a set, and confirm candidates directly.",
    difficulty: "hard",
  },
  {
    id: "drill-longest-repeated-passage",
    text: "An editor wants the longest passage that appears at least twice in a long document, where the two copies may overlap. Find its length.",
    answerConceptIds: [
      "dsa.string-algorithms.rolling-hash-and-rabin-karp",
      "dsa.binary-search.binary-search-on-the-answer",
    ],
    keyInsight:
      "Binary search the length; for each length, a rolling hash set tells whether some window repeats.",
    difficulty: "hard",
  },
  {
    id: "drill-replayed-packet-chunks",
    text: "A network filter watches a byte stream for replayed data. Report every 12-byte chunk that has already occurred earlier in the stream, doing constant work per byte.",
    answerConceptIds: ["dsa.string-algorithms.rolling-hash-and-rabin-karp"],
    keyInsight:
      "Update the window's hash in O(1) by removing the outgoing byte and adding the incoming one, keep seen hashes in a set, and verify on a match.",
    difficulty: "medium",
  },

  // Backtracking
  {
    id: "drill-pizza-toppings",
    text: "A pizza place offers 8 optional toppings. List every combination a customer could order, from plain to everything.",
    answerConceptIds: ["dsa.backtracking.subsets", "dsa.bits.bitmask-enumeration"],
    keyInsight:
      "Each topping is in or out: recurse on include and exclude, or count a bitmask from 0 to 2⁸ − 1.",
    difficulty: "easy",
  },
  {
    id: "drill-exact-gift-card-basket",
    text: "A shopper has a 100-dollar gift card and a list of 15 items. Find every set of items whose prices total exactly 100.",
    answerConceptIds: ["dsa.backtracking.subsets", "dsa.bits.bitmask-enumeration"],
    keyInsight:
      "2¹⁵ is about 33,000, so trying every subset is fast, and branches can stop as soon as the total passes 100.",
    difficulty: "medium",
  },
  {
    id: "drill-packing-with-duplicates",
    text: "A packing list contains repeated items, such as two identical chargers. List every distinct selection of items to bring, without listing the same selection twice.",
    answerConceptIds: ["dsa.backtracking.subsets"],
    keyInsight:
      "Sort, and when choosing the next item at a given depth, skip any item equal to the one just tried at that depth.",
    difficulty: "medium",
  },
  {
    id: "drill-presentation-orders",
    text: "Six students will present their projects one after another. List every possible speaking order.",
    answerConceptIds: ["dsa.backtracking.permutations"],
    keyInsight:
      "Fill the order one slot at a time, marking a student as used and unmarking on the way back; there are 6 × 5 × 4 × 3 × 2 × 1 = 720 orders.",
    difficulty: "easy",
  },
  {
    id: "drill-lock-digit-rearrangements",
    text: "A lock shows the digits 1, 1, 2 and 3, and you may rearrange them into a code. List each distinct code exactly once.",
    answerConceptIds: ["dsa.backtracking.permutations"],
    keyInsight:
      "Sort the digits and skip a digit equal to the previous one when that previous copy isn't in use, so repeats don't create repeated codes.",
    difficulty: "medium",
  },
  {
    id: "drill-eight-shop-route",
    text: "A van leaves the depot, visits 8 shops once each, and returns. With so few shops, try the visiting orders to find the shortest route.",
    answerConceptIds: ["dsa.backtracking.permutations", "dsa.dp-advanced.bitmask-dp"],
    keyInsight:
      "Backtrack over orders and prune whenever a partial route is already longer than the best found; bitmask DP scales further.",
    difficulty: "medium",
  },
  {
    id: "drill-five-a-side-teams",
    text: "A coach must pick 5 players out of 12 for a match. List every possible team, where the order of picking doesn't matter.",
    answerConceptIds: ["dsa.backtracking.combinations"],
    keyInsight:
      "Choose players in increasing index order by passing a start index, so each team appears exactly once.",
    difficulty: "easy",
  },
  {
    id: "drill-coin-payments-listed",
    text: "A vending machine takes coins of 5, 10 and 25 cents, as many as you like. List every way to pay exactly 60 cents, ignoring the order of coins.",
    answerConceptIds: ["dsa.backtracking.combinations"],
    keyInsight:
      "Recurse with a start index that may stay on the same coin (reuse) but never goes back, so each multiset is listed once.",
    difficulty: "medium",
  },
  {
    id: "drill-card-trio-fifteen",
    text: "A magic trick needs three different cards numbered 1 to 9 whose values total 15. List every possible trio.",
    answerConceptIds: ["dsa.backtracking.combinations"],
    keyInsight:
      "Choose in increasing order from a start index and stop early when the total passes 15 or too few cards remain.",
    difficulty: "easy",
  },
  {
    id: "drill-tile-path-code-word",
    text: "A garden floor is a grid of lettered tiles. Decide whether a visitor can spell a code word by stepping between side-by-side tiles, never stepping on the same tile twice.",
    answerConceptIds: ["dsa.backtracking.grid-backtracking"],
    keyInsight:
      "DFS from each tile matching the first letter, marking a tile when you step on it and unmarking it when you back out.",
    difficulty: "medium",
  },
  {
    id: "drill-vacuum-full-coverage",
    text: "A robot vacuum starts at its dock in a small grid room with some furniture cells and must end at its charger. Count the routes that visit every free cell exactly once.",
    answerConceptIds: ["dsa.backtracking.grid-backtracking"],
    keyInsight:
      "Backtrack from the dock, marking and unmarking cells, and count a route only when the charger is reached with every free cell covered.",
    difficulty: "hard",
  },
  {
    id: "drill-gold-mine-grid",
    text: "A treasure map grid shows the gold in each cell, and some cells are empty. Starting from any gold cell and moving between neighbouring gold cells without revisiting any, collect as much gold as possible.",
    answerConceptIds: ["dsa.backtracking.grid-backtracking"],
    keyInsight:
      "Try each start with DFS, mark cells as you enter and restore them as you leave, and keep the best total.",
    difficulty: "medium",
  },
  {
    id: "drill-banquet-sightlines",
    text: "Eight diplomats must sit on an 8 × 8 grid of seats so that no two share a row, a column or a diagonal line. Find every arrangement.",
    answerConceptIds: ["dsa.backtracking.constraint-satisfaction"],
    keyInsight:
      "Place one diplomat per row, track used columns and both diagonal directions in sets or bitmasks, and backtrack on a clash.",
    difficulty: "medium",
  },
  {
    id: "drill-exam-slot-colouring",
    text: "Nine exams must each get one of 4 time slots, and some pairs of exams share students. Find an assignment where no student has two exams at once, if one exists.",
    answerConceptIds: ["dsa.backtracking.constraint-satisfaction"],
    keyInsight:
      "Assign exams one by one, trying only slots unused by conflicting exams, and take the most constrained exam first to prune early.",
    difficulty: "hard",
  },
  {
    id: "drill-number-grid-solver",
    text: "A number puzzle grid must be filled so that every row, column and box contains each digit once. Write a solver that finishes hard puzzles in a blink.",
    answerConceptIds: ["dsa.backtracking.constraint-satisfaction"],
    keyInsight:
      "Keep bitmasks of used digits per row, column and box, and always fill the empty cell with the fewest options next.",
    difficulty: "medium",
  },

  // Linked lists
  {
    id: "drill-reverse-the-train",
    text: "A train's carriages are linked front to back, and each carriage only knows the next one. Reverse the train in place using constant extra memory.",
    answerConceptIds: ["dsa.linked-lists.linked-list-reversal"],
    keyInsight: "Walk the list with previous and current pointers, flipping each next pointer.",
    difficulty: "easy",
  },
  {
    id: "drill-reverse-middle-songs",
    text: "A playlist is stored as a linked list of songs. Reverse only the songs from position 3 to position 7, leaving the rest in place.",
    answerConceptIds: ["dsa.linked-lists.linked-list-reversal"],
    keyInsight:
      "Walk to the node before the stretch (a dummy head helps), reverse the stretch, then reconnect both ends.",
    difficulty: "medium",
  },
  {
    id: "drill-reverse-page-batches",
    text: "A printer spools pages as a linked list. Reverse every batch of 4 pages in place, and leave a final batch of fewer than 4 as it is.",
    answerConceptIds: ["dsa.linked-lists.linked-list-reversal"],
    keyInsight:
      "Check that k nodes remain, reverse that group, link the previous group's tail to the new head, and continue.",
    difficulty: "hard",
  },
  {
    id: "drill-looping-clue-chain",
    text: "A scavenger hunt is a chain of clues, each pointing to the next, and someone suspects the chain loops back on itself. Check this with constant extra memory.",
    answerConceptIds: ["dsa.linked-lists.fast-and-slow-pointers-on-lists"],
    keyInsight:
      "Move one pointer one step and another two steps at a time; they meet only if there is a loop.",
    difficulty: "easy",
  },
  {
    id: "drill-middle-carriage",
    text: "A train is stored as a linked list of carriages. Find the middle carriage in one pass without counting the carriages first.",
    answerConceptIds: ["dsa.linked-lists.fast-and-slow-pointers-on-lists"],
    keyInsight: "When the fast pointer reaches the end, the slow pointer is at the middle.",
    difficulty: "easy",
  },
  {
    id: "drill-redirect-loop-start",
    text: "A chain of web page redirects eventually loops. Find the first page that is part of the loop, using constant memory.",
    answerConceptIds: ["dsa.linked-lists.fast-and-slow-pointers-on-lists"],
    keyInsight:
      "After slow and fast meet, restart one pointer from the head; moving both one step at a time, they meet at the loop's first page.",
    difficulty: "medium",
  },
  {
    id: "drill-linked-word-mirror",
    text: "A word is stored as a linked list of characters. Decide whether it reads the same both ways using constant extra memory.",
    answerConceptIds: [
      "dsa.linked-lists.fast-and-slow-pointers-on-lists",
      "dsa.linked-lists.linked-list-reversal",
    ],
    keyInsight:
      "Find the middle with slow and fast pointers, reverse the second half, compare the halves, then restore it.",
    difficulty: "medium",
  },

  // Stacks and queues
  {
    id: "drill-editor-bracket-check",
    text: "A code editor flags a line when its brackets (), [] and {} don't pair up properly. Decide whether a line is correctly bracketed.",
    answerConceptIds: ["dsa.stacks-queues.bracket-matching"],
    keyInsight:
      "Push each opening bracket; each closing one must match the top of the stack, and the stack must be empty at the end.",
    difficulty: "easy",
  },
  {
    id: "drill-markup-tags-closed",
    text: "A document uses opening and closing tags such as <b> and </b>. Check that every tag is closed and that tags close in the right order.",
    answerConceptIds: ["dsa.stacks-queues.bracket-matching"],
    keyInsight: "Treat tags like brackets: push a name on opening, pop and compare on closing.",
    difficulty: "medium",
  },
  {
    id: "drill-longest-well-formed-formula",
    text: "A formula was typed with some brackets missing, leaving a string of ( and ) characters. Find the length of the longest stretch that is correctly bracketed.",
    answerConceptIds: ["dsa.stacks-queues.bracket-matching"],
    keyInsight:
      "Push indices and keep the last unmatched ) as a base at the bottom; each match's length is the current index minus the new top.",
    difficulty: "hard",
  },
  {
    id: "drill-postfix-calculator",
    text: "An old calculator takes input in postfix order, where 3 4 + 2 × means (3 + 4) × 2. Evaluate such inputs.",
    answerConceptIds: ["dsa.stacks-queues.expression-evaluation"],
    keyInsight:
      "Push numbers; an operator pops two operands, applies itself and pushes the result.",
    difficulty: "easy",
  },
  {
    id: "drill-spreadsheet-formula",
    text: "A spreadsheet cell holds a formula like 7 + 3 × (10 − 4) / 2 with the usual precedence rules. Evaluate it without a built-in evaluator.",
    answerConceptIds: ["dsa.stacks-queues.expression-evaluation"],
    keyInsight:
      "Use a value stack and an operator stack; before pushing an operator, apply stacked operators of higher or equal precedence, and let brackets bound the work.",
    difficulty: "hard",
  },
  {
    id: "drill-budget-sum-with-brackets",
    text: "A budgeting app lets you type sums like 120 − (30 + 15) − (−5), using only plus, minus and brackets. Compute the result in one pass.",
    answerConceptIds: ["dsa.stacks-queues.expression-evaluation"],
    keyInsight:
      "Keep a running result and a sign; on an opening bracket push both, and on a closing bracket pop and combine.",
    difficulty: "medium",
  },
  {
    id: "drill-shrinking-letter-pairs",
    text: "A word game keeps deleting two identical letters that sit side by side, so xyyxz becomes z. Produce the final word in linear time.",
    answerConceptIds: ["dsa.stacks-queues.stack-based-string-processing"],
    keyInsight:
      "Push letters; if a letter equals the top of the stack, pop instead. The stack is the answer.",
    difficulty: "easy",
  },
  {
    id: "drill-tidy-folder-path",
    text: "A file browser receives paths like /home/./docs/../pics//2024/ and should show the simplest equivalent path. Produce that path.",
    answerConceptIds: ["dsa.stacks-queues.stack-based-string-processing"],
    keyInsight:
      "Split on slashes, push folder names, pop on .., ignore . and empty parts, then join what is left.",
    difficulty: "medium",
  },
  {
    id: "drill-nested-repeat-message",
    text: "A compressed message uses rules like 3[ab] for ababab, and rules can nest, as in 2[x3[y]]. Expand a message to its full text.",
    answerConceptIds: ["dsa.stacks-queues.stack-based-string-processing"],
    keyInsight:
      "On [ push the current text and the count; on ] pop them, repeat the inner text and append it to the popped text.",
    difficulty: "medium",
  },
  {
    id: "drill-single-lane-cars",
    text: "Cars on a single-lane track each drive left or right at the same speed and have a size. When a right-moving car meets a left-moving one, the smaller is destroyed, and equal sizes destroy each other. List the cars that remain.",
    answerConceptIds: ["dsa.stacks-queues.stack-based-string-processing"],
    keyInsight:
      "Keep survivors on a stack; a left-moving car fights the right-moving cars on top until it is destroyed or none are left.",
    difficulty: "medium",
  },

  // Monotonic stack and deque
  {
    id: "drill-next-higher-price-day",
    text: "A price tracker has a stock's closing price for each day. For every day, find the next day on which the price is strictly higher.",
    answerConceptIds: ["dsa.monotonic.monotonic-stack"],
    keyInsight:
      "Keep a stack of days still waiting, with falling prices; each new price resolves every lower price on top.",
    difficulty: "medium",
  },
  {
    id: "drill-shadow-ends",
    text: "Buildings stand in a row with known heights. For each building, find the nearest taller building to its left, where its morning shadow would end.",
    answerConceptIds: ["dsa.monotonic.monotonic-stack"],
    keyInsight:
      "Scan left to right with a stack of decreasing heights; pop anything not taller, and the top is the answer.",
    difficulty: "medium",
  },
  {
    id: "drill-parade-view-count",
    text: "People stand in a line facing right. A person can see someone further right if everyone standing between them is shorter than both. Count how many people each person can see.",
    answerConceptIds: ["dsa.monotonic.monotonic-stack"],
    keyInsight:
      "Scan from the right with a decreasing stack; each person sees everyone they pop, plus the next taller person still on the stack.",
    difficulty: "hard",
  },
  {
    id: "drill-skyline-billboard",
    text: "A skyline is a row of equally wide buildings with known heights. Find the largest rectangular billboard that fits entirely within the skyline, resting on the ground.",
    answerConceptIds: ["dsa.monotonic.largest-rectangle-in-histogram"],
    keyInsight:
      "The widest rectangle of each building's height reaches the nearest shorter buildings on both sides, which a monotonic stack finds in one pass.",
    difficulty: "hard",
  },
  {
    id: "drill-rocky-field-plot",
    text: "A field is a grid of usable and rocky cells. Find the largest rectangular plot made only of usable cells.",
    answerConceptIds: ["dsa.monotonic.largest-rectangle-in-histogram"],
    keyInsight:
      "Treat each row as the base of a histogram of usable cells stacked above it, and run the largest rectangle method on every row.",
    difficulty: "hard",
  },
  {
    id: "drill-team-output-score",
    text: "A team's score for a run of consecutive days is its lowest daily output times its total output over the run. Find the best score over all runs.",
    answerConceptIds: [
      "dsa.monotonic.largest-rectangle-in-histogram",
      "dsa.monotonic.monotonic-stack",
    ],
    keyInsight:
      "For each day as the minimum, extend to the nearest lower days on both sides with a monotonic stack and get the total from prefix sums.",
    difficulty: "hard",
  },
  {
    id: "drill-sum-of-coldest-days",
    text: "A weather archive has 100,000 daily temperatures. Compute the sum, over every run of consecutive days, of the coldest temperature in that run.",
    answerConceptIds: ["dsa.monotonic.contribution-technique"],
    keyInsight:
      "Count how many runs each day is the minimum of, using the nearest colder days on both sides, and add temperature × count.",
    difficulty: "hard",
  },
  {
    id: "drill-ticket-price-spreads",
    text: "A band's tour lists a ticket price for each night. For every run of consecutive nights, take the highest price minus the lowest, and add up these spreads.",
    answerConceptIds: ["dsa.monotonic.contribution-technique"],
    keyInsight:
      "The total is the sum of maximums minus the sum of minimums; count each price's share of both with monotonic stacks.",
    difficulty: "hard",
  },
  {
    id: "drill-dj-one-off-genres",
    text: "A DJ's set is a sequence of songs labelled by genre. For every run of consecutive songs, count the genres played exactly once in it, and add up these counts over all runs.",
    answerConceptIds: ["dsa.monotonic.contribution-technique"],
    keyInsight:
      "A song counts in every run where it is its genre's only copy: (distance to the previous same genre) × (distance to the next one).",
    difficulty: "hard",
  },
  {
    id: "drill-sixty-second-peak",
    text: "A sensor dashboard shows, every second, the highest reading of the last 60 seconds. Keep it updated in constant amortized time per reading.",
    answerConceptIds: ["dsa.monotonic.monotonic-deque"],
    keyInsight:
      "Keep a deque of indices with decreasing readings; drop smaller ones from the back and expired ones from the front, and read the maximum at the front.",
    difficulty: "medium",
  },
  {
    id: "drill-steady-vibration-run",
    text: "A machine logs vibration readings every second. Find the longest run of consecutive readings in which the highest and lowest reading differ by at most 5.",
    answerConceptIds: ["dsa.monotonic.monotonic-deque", "dsa.sliding-window.variable-size-window"],
    keyInsight:
      "Grow a window while tracking its maximum and minimum with two monotonic deques, and shrink from the left while they differ by more than 5.",
    difficulty: "hard",
  },
  {
    id: "drill-shortest-hundred-gain",
    text: "A stock's daily changes can be positive or negative. Find the shortest run of consecutive days whose total change is at least +100.",
    answerConceptIds: ["dsa.monotonic.monotonic-deque"],
    keyInsight:
      "Negatives break a plain window; keep running totals in an increasing deque and pop from the front while the current total beats the front by 100 or more.",
    difficulty: "hard",
  },

  // Heaps
  {
    id: "drill-top-ten-articles",
    text: "A news site has view counts for a million articles. Show the 10 most viewed articles of the day without sorting all of them.",
    answerConceptIds: ["dsa.heaps.top-k-elements", "dsa.sorting.quickselect"],
    keyInsight:
      "Keep a min-heap of size 10; a new article replaces the smallest only if it has more views, for O(n log 10).",
    difficulty: "medium",
  },
  {
    id: "drill-five-nearest-drivers",
    text: "A ride app knows the locations of 100,000 drivers. Find the 5 drivers closest to a rider.",
    answerConceptIds: ["dsa.heaps.top-k-elements", "dsa.sorting.quickselect"],
    keyInsight:
      "Keep a max-heap of size 5 by distance, and pop the farthest whenever it grows past 5.",
    difficulty: "easy",
  },
  {
    id: "drill-third-best-score-live",
    text: "Exam scores arrive one at a time. After each arrival, report the third highest score so far.",
    answerConceptIds: ["dsa.heaps.top-k-elements"],
    keyInsight: "Keep a min-heap of the best three; its top is the third highest.",
    difficulty: "easy",
  },
  {
    id: "drill-station-files-merge",
    text: "Twelve weather stations each send a file of readings sorted by time. Produce one combined file sorted by time without loading all the files at once.",
    answerConceptIds: ["dsa.heaps.k-way-merge"],
    keyInsight:
      "Keep a min-heap holding the next reading of each file; pop the earliest, write it, and push the next reading from the same file.",
    difficulty: "medium",
  },
  {
    id: "drill-every-library-range",
    text: "Each of k libraries has a sorted list of the book ids it owns. Find the smallest range of ids that includes at least one book from every library.",
    answerConceptIds: ["dsa.heaps.k-way-merge"],
    keyInsight:
      "Hold one pointer per list in a min-heap and track the current maximum; the range is heap minimum to maximum, and you advance the list that gave the minimum.",
    difficulty: "hard",
  },
  {
    id: "drill-twentieth-cheapest-in-grid",
    text: "A price grid has every row and every column sorted in increasing order. Find the 20th cheapest price.",
    answerConceptIds: ["dsa.heaps.k-way-merge", "dsa.binary-search.binary-search-on-the-answer"],
    keyInsight:
      "Treat rows as sorted lists: push each row's first price into a min-heap and pop 20 times, pushing the next price from the same row.",
    difficulty: "medium",
  },
  {
    id: "drill-live-median-age",
    text: "A live poll receives participants' ages one at a time. After each arrival, the dashboard shows the median age.",
    answerConceptIds: ["dsa.heaps.two-heaps"],
    keyInsight:
      "Keep the lower half in a max-heap and the upper half in a min-heap with sizes within one; the median sits at the tops.",
    difficulty: "medium",
  },
  {
    id: "drill-median-of-last-hundred-trades",
    text: "A trading screen shows the median price of the last 100 trades. It updates as each new trade arrives and the oldest one leaves.",
    answerConceptIds: ["dsa.heaps.two-heaps"],
    keyInsight:
      "Two heaps with lazy deletion (or two balanced ordered multisets) let the expiring trade leave while the halves stay balanced.",
    difficulty: "hard",
  },
  {
    id: "drill-balanced-draft-teams",
    text: "Players join a lobby one at a time with a skill rating. The lobby always splits them into a stronger half and a weaker half, differing in size by at most one, and shows the weakest player of the stronger half.",
    answerConceptIds: ["dsa.heaps.two-heaps"],
    keyInsight:
      "A max-heap for the weaker half and a min-heap for the stronger half; rebalance after each join and read the min-heap's top.",
    difficulty: "medium",
  },
  {
    id: "drill-clinic-rooms",
    text: "A clinic has appointments with start and end times. Find the fewest consulting rooms needed so that nobody waits.",
    answerConceptIds: ["dsa.heaps.scheduling-with-heaps", "dsa.intervals.sweep-line"],
    keyInsight:
      "Sort by start; a min-heap of end times shows which room frees first, so reuse it if it's free and open a new room otherwise.",
    difficulty: "medium",
  },
  {
    id: "drill-shortest-job-next",
    text: "A single processor receives jobs with arrival times and durations. Whenever it is free it runs the shortest job that is waiting. Output the order in which jobs finish.",
    answerConceptIds: ["dsa.heaps.scheduling-with-heaps"],
    keyInsight:
      "Sort by arrival, push arrived jobs into a min-heap by duration, pop the shortest when idle, and jump the clock forward when nothing waits.",
    difficulty: "medium",
  },
  {
    id: "drill-kitchen-cooldown",
    text: "A kitchen cooks one dish per time unit, and the same dish type needs a cool-down of n units before it can be cooked again. Find the least total time to cook every order, allowing idle units.",
    answerConceptIds: ["dsa.heaps.scheduling-with-heaps"],
    keyInsight:
      "Each unit, cook the available dish type with the most orders left (a max-heap), and park cooked types in a queue until their cool-down ends.",
    difficulty: "medium",
  },

  // Intervals
  {
    id: "drill-merged-busy-blocks",
    text: "A calendar gathers busy blocks from several apps, and many overlap or touch. Show a clean list where overlapping or touching blocks are combined.",
    answerConceptIds: ["dsa.intervals.merge-intervals"],
    keyInsight:
      "Sort by start, then extend the last combined block while the next block starts at or before its end.",
    difficulty: "easy",
  },
  {
    id: "drill-damaged-road-length",
    text: "Road inspectors list damaged stretches as start and end kilometres, unsorted and overlapping. Find the total length of damaged road.",
    answerConceptIds: ["dsa.intervals.merge-intervals"],
    keyInsight: "Merge the stretches after sorting by start, then add up the merged lengths.",
    difficulty: "easy",
  },
  {
    id: "drill-search-highlights",
    text: "A text editor highlights search matches as ranges of character positions, and ranges from several searches overlap. Produce the fewest highlight ranges to draw.",
    answerConceptIds: ["dsa.intervals.merge-intervals"],
    keyInsight:
      "Sort ranges by start and merge each one into the previous range whenever they overlap.",
    difficulty: "easy",
  },
  {
    id: "drill-new-room-booking",
    text: "A meeting room keeps a sorted list of booked slots with no overlaps. Add a new booking, combining it with any slots it overlaps, so the list stays sorted and overlap-free.",
    answerConceptIds: ["dsa.intervals.insert-interval"],
    keyInsight:
      "Copy slots that end before the new one, absorb every slot that overlaps it, then copy the rest: one linear pass.",
    difficulty: "medium",
  },
  {
    id: "drill-painted-fence-stretches",
    text: "A painter keeps a sorted list of fence stretches already painted, with no overlaps. After painting a new stretch, update the list so it still has no overlaps.",
    answerConceptIds: ["dsa.intervals.insert-interval"],
    keyInsight:
      "Stretches fully before or after the new one stay; every stretch it touches merges into one.",
    difficulty: "medium",
  },
  {
    id: "drill-release-address-range",
    text: "A network team keeps a sorted list of reserved address ranges with no overlaps. One range is released, and any reserved addresses inside it become free. Update the list.",
    answerConceptIds: ["dsa.intervals.insert-interval"],
    keyInsight:
      "Ranges fully before or after the released range stay; overlapping ones are trimmed to their parts outside it.",
    difficulty: "medium",
  },
  {
    id: "drill-cancel-meetings",
    text: "A meeting room has a list of requested bookings, and some of them overlap. Find the fewest meetings to cancel so the rest don't overlap.",
    answerConceptIds: ["dsa.intervals.interval-scheduling"],
    keyInsight: "Keep the meetings that end earliest; every overlap you skip is one cancellation.",
    difficulty: "medium",
  },
  {
    id: "drill-festival-shows",
    text: "A festival has shows with start and end times, and you can only be at one show at a time. Attend as many complete shows as possible.",
    answerConceptIds: ["dsa.intervals.interval-scheduling"],
    keyInsight:
      "Repeatedly pick the show that ends earliest among those starting after your last one ends.",
    difficulty: "easy",
  },
  {
    id: "drill-fewest-inspections",
    text: "Inspectors must check a set of time windows, and one inspection at time t covers every window containing t. Find the fewest inspections that cover all windows.",
    answerConceptIds: ["dsa.intervals.interval-scheduling"],
    keyInsight:
      "Sort by end; inspect at the end of the first uncovered window, which covers every window that starts by then.",
    difficulty: "medium",
  },
  {
    id: "drill-peak-online-users",
    text: "A server logs each user session's login and logout times. Find the largest number of users online at the same moment.",
    answerConceptIds: ["dsa.intervals.sweep-line", "dsa.prefix-sums.difference-arrays"],
    keyInsight:
      "Turn sessions into +1 and −1 events, sort by time (logouts first on ties), and track the running count.",
    difficulty: "easy",
  },
  {
    id: "drill-city-outline",
    text: "A city is drawn as rectangular buildings, each given by left edge, right edge and height. List the points where the height of the city's outline changes.",
    answerConceptIds: ["dsa.intervals.sweep-line"],
    keyInsight:
      "Sweep the building edges left to right, keeping active heights in a max-heap or multiset, and record a point whenever the maximum changes.",
    difficulty: "hard",
  },
  {
    id: "drill-triple-booked-periods",
    text: "A company calendar lists all meetings as start and end times. Find every period during which at least three meetings are running at once.",
    answerConceptIds: ["dsa.intervals.sweep-line"],
    keyInsight:
      "Sort start and end events and keep a running count; a period opens when the count reaches 3 and closes when it drops below.",
    difficulty: "medium",
  },

  // Greedy
  {
    id: "drill-frog-stepping-stones",
    text: "Stones cross a river in a row, and each stone says how many stones forward a frog may jump from it at most. Decide whether the frog can reach the last stone from the first.",
    answerConceptIds: ["dsa.greedy.reachability-greedy"],
    keyInsight:
      "Track the farthest stone reachable so far; if you ever stand beyond it, the frog is stuck.",
    difficulty: "medium",
  },
  {
    id: "drill-frog-fewest-jumps",
    text: "On the same river of stones, each stone gives the longest jump allowed from it. Find the fewest jumps the frog needs to reach the last stone.",
    answerConceptIds: ["dsa.greedy.reachability-greedy"],
    keyInsight:
      "Treat reachable ranges as levels: each jump extends the range to the farthest stone reachable from the current range.",
    difficulty: "medium",
  },
  {
    id: "drill-charging-loop-start",
    text: "An electric car drives a circular route past charging stations. Each station adds some charge, and each leg to the next station uses some. Find a starting station from which the car completes the loop, or say none exists.",
    answerConceptIds: ["dsa.greedy.reachability-greedy"],
    keyInsight:
      "A start exists if total charge covers total use; whenever the running charge goes negative, the start must be after the current station.",
    difficulty: "medium",
  },
  {
    id: "drill-two-car-ferry",
    text: "A ferry carries at most two cars per trip within a weight limit, and every car fits on its own. Find the fewest trips to carry all the cars.",
    answerConceptIds: ["dsa.greedy.greedy-with-sorting", "dsa.two-pointers.opposite-ends-pointers"],
    keyInsight:
      "Sort; pair the heaviest remaining car with the lightest if they fit together, otherwise send the heaviest alone.",
    difficulty: "medium",
  },
  {
    id: "drill-snack-sizes",
    text: "Each child is happy only with a snack of at least a certain size, and you have snacks of various sizes. Make as many children happy as possible.",
    answerConceptIds: ["dsa.greedy.greedy-with-sorting"],
    keyInsight:
      "Sort both lists and give each child, from least to most demanding, the smallest snack that satisfies them.",
    difficulty: "easy",
  },
  {
    id: "drill-two-office-relocation",
    text: "A company must send 2n new hires to two offices, n to each, and each hire has a relocation cost for each office. Minimise the total cost.",
    answerConceptIds: ["dsa.greedy.greedy-with-sorting"],
    keyInsight:
      "Sort hires by cost of office A minus cost of office B; send the first half to A and the rest to B.",
    difficulty: "medium",
  },
  {
    id: "drill-location-albums",
    text: "A photographer's shots are tagged with the location where each was taken, in order. Split the reel into as many consecutive albums as possible so that each location appears in only one album.",
    answerConceptIds: ["dsa.greedy.greedy-with-sorting"],
    keyInsight:
      "Record each location's last position, stretch the current album to the furthest last position seen, and cut when you reach it.",
    difficulty: "medium",
  },
  {
    id: "drill-no-back-to-back-artist",
    text: "A playlist has several songs per artist. Order it so that no two songs in a row are by the same artist, or say that it can't be done.",
    answerConceptIds: ["dsa.greedy.greedy-with-heaps"],
    keyInsight:
      "Always play the artist with the most songs left who didn't play last (a max-heap); it's impossible if one artist has more than half the songs, rounded up.",
    difficulty: "medium",
  },
  {
    id: "drill-startup-projects",
    text: "A startup can finish at most k projects, one after another. Each project needs a minimum amount of capital to start and adds its profit when done. Maximise the final capital.",
    answerConceptIds: ["dsa.greedy.greedy-with-heaps"],
    keyInsight:
      "Sort projects by required capital, move every affordable one into a max-heap by profit, and always take the most profitable.",
    difficulty: "hard",
  },
  {
    id: "drill-road-trip-fuel-stops",
    text: "A road trip passes fuel stations at known distances, each with a known amount of fuel. Starting with some fuel, find the fewest stops needed to reach the destination.",
    answerConceptIds: ["dsa.greedy.greedy-with-heaps"],
    keyInsight:
      "Drive as far as possible while remembering passed stations in a max-heap; when fuel runs out, refuel at the largest one passed.",
    difficulty: "hard",
  },

  // Trees
  {
    id: "drill-org-chart-print",
    text: "A company's org chart is a binary tree. Print everyone so that each manager comes before the people reporting to them.",
    answerConceptIds: ["dsa.trees.dfs-traversals"],
    keyInsight: "Preorder: visit the node, then its left subtree, then its right subtree.",
    difficulty: "easy",
  },
  {
    id: "drill-delete-folder-tree",
    text: "A folder tree must be deleted from a disk. A folder can only be deleted once everything inside it is gone.",
    answerConceptIds: ["dsa.trees.dfs-traversals"],
    keyInsight: "Postorder: finish all children before handling the node itself.",
    difficulty: "easy",
  },
  {
    id: "drill-prices-in-order-no-recursion",
    text: "A binary search tree of product prices must be printed in increasing order. The tree can be very deep, so recursion is not allowed.",
    answerConceptIds: ["dsa.trees.dfs-traversals", "dsa.bst.inorder-tricks"],
    keyInsight:
      "Iterative inorder with a stack: push the left spine, pop and visit, then move to the right child.",
    difficulty: "medium",
  },
  {
    id: "drill-generations-by-line",
    text: "A family tree is stored as a binary tree. Print it generation by generation, one line per generation.",
    answerConceptIds: ["dsa.trees.level-order-traversal"],
    keyInsight:
      "BFS with a queue, processing exactly the current queue size each round to separate the levels.",
    difficulty: "easy",
  },
  {
    id: "drill-servers-from-the-side",
    text: "A tree of servers is drawn with the root at the top. Standing to its right, list the server you would see at each depth.",
    answerConceptIds: ["dsa.trees.level-order-traversal"],
    keyInsight: "Go level by level; the last node processed on each level is the visible one.",
    difficulty: "medium",
  },
  {
    id: "drill-average-salary-per-level",
    text: "A company's hierarchy is stored as a tree with a salary at each node. Report the average salary at each level of the hierarchy.",
    answerConceptIds: ["dsa.trees.level-order-traversal"],
    keyInsight: "BFS by levels, summing salaries and counting people on each level.",
    difficulty: "easy",
  },
  {
    id: "drill-longest-router-path",
    text: "A network of routers forms a tree. Find the longest path, counted in links, between any two routers.",
    answerConceptIds: ["dsa.trees.bottom-up-tree-recursion"],
    keyInsight:
      "Each node returns its height; the longest path through a node is its left plus right heights, kept in a running best.",
    difficulty: "medium",
  },
  {
    id: "drill-best-investment-path",
    text: "A binary tree of investments has a gain or a loss at each node. Find the largest total along any path between two nodes, which need not pass through the root.",
    answerConceptIds: ["dsa.trees.bottom-up-tree-recursion"],
    keyInsight:
      "Each node returns its best downward path (dropping negative branches) and updates a global answer with left + node + right.",
    difficulty: "hard",
  },
  {
    id: "drill-balanced-mobile",
    text: "A hanging mobile is a binary tree of joints. It is balanced if, at every joint, the depths of its two sides differ by at most one. Check this in one pass.",
    answerConceptIds: ["dsa.trees.bottom-up-tree-recursion"],
    keyInsight:
      "Return each subtree's height, or −1 as a signal for unbalanced that passes straight up.",
    difficulty: "easy",
  },
  {
    id: "drill-decision-tree-hundred",
    text: "A decision tree gives points at every node. Decide whether some path from the root down to a leaf collects exactly 100 points.",
    answerConceptIds: ["dsa.trees.top-down-tree-recursion"],
    keyInsight:
      "Pass the remaining target down the recursion and check at each leaf whether it reached zero.",
    difficulty: "easy",
  },
  {
    id: "drill-top-rated-employees",
    text: "In a company tree, an employee is top rated if nobody on the chain of managers above them has a higher rating. Count the top-rated employees.",
    answerConceptIds: ["dsa.trees.top-down-tree-recursion"],
    keyInsight:
      "Pass the highest rating seen so far down the tree; a node counts if its rating is at least that.",
    difficulty: "medium",
  },
  {
    id: "drill-digit-path-numbers",
    text: "Each node of a tree holds a digit, and every path from the root to a leaf spells a number, such as 4 then 9 then 5 for 495. Add up all these numbers.",
    answerConceptIds: ["dsa.trees.top-down-tree-recursion"],
    keyInsight: "Pass value × 10 + digit down the tree and add the value at each leaf.",
    difficulty: "medium",
  },
  {
    id: "drill-seventh-customer-id",
    text: "A binary search tree stores customers by id. Find the 7th smallest id without collecting every id first.",
    answerConceptIds: ["dsa.bst.inorder-tricks"],
    keyInsight: "An inorder walk visits ids in sorted order, so stop at the 7th visit.",
    difficulty: "easy",
  },
  {
    id: "drill-next-date-button",
    text: "A calendar stores dates in a binary search tree. Build a next button that returns the dates in order, using memory proportional to the tree's height.",
    answerConceptIds: ["dsa.bst.inorder-tricks"],
    keyInsight:
      "Keep a stack of the left spine; next pops a node and pushes the left spine of its right child.",
    difficulty: "medium",
  },
  {
    id: "drill-swapped-prices",
    text: "Two prices in a binary search tree were swapped by mistake. Find them without copying the tree into a list.",
    answerConceptIds: ["dsa.bst.inorder-tricks"],
    keyInsight:
      "An inorder walk should be increasing, so the swapped pair shows up as one or two places where a value is smaller than the one before it.",
    difficulty: "hard",
  },

  // Tries
  {
    id: "drill-crossword-wildcards",
    text: "A crossword helper stores a dictionary and answers queries like c.t, where a dot stands for any letter. Answer many such queries quickly.",
    answerConceptIds: ["dsa.tries.trie-with-dfs"],
    keyInsight: "Store the words in a trie; on a dot, try every child with DFS.",
    difficulty: "medium",
  },
  {
    id: "drill-many-words-on-a-board",
    text: "A letter board is a grid, and a dictionary has thousands of words. Find every word that can be traced by moving between neighbouring cells without reusing a cell.",
    answerConceptIds: ["dsa.tries.trie-with-dfs", "dsa.backtracking.grid-backtracking"],
    keyInsight:
      "Put the words in a trie and run one grid search that follows trie children, pruning as soon as no word has the current prefix.",
    difficulty: "hard",
  },
  {
    id: "drill-three-suggestions",
    text: "A search box shows up to three suggestions in alphabetical order as each character is typed. Produce the suggestions after every keystroke.",
    answerConceptIds: ["dsa.tries.trie-with-dfs"],
    keyInsight:
      "Walk the trie down the typed prefix, then DFS its subtree in alphabetical order and stop after three words.",
    difficulty: "medium",
  },
  {
    id: "drill-most-different-device-ids",
    text: "A factory has a list of 32-bit device ids. Find the two ids whose XOR is as large as possible.",
    answerConceptIds: ["dsa.tries.bitwise-trie"],
    keyInsight:
      "Insert ids bit by bit from the top into a binary trie, and for each id greedily follow the opposite bit when it exists.",
    difficulty: "medium",
  },
  {
    id: "drill-capped-xor-queries",
    text: "A set of stored numbers answers queries of the form (x, m): the largest x XOR y over stored values y that are at most m. All queries are known in advance.",
    answerConceptIds: ["dsa.tries.bitwise-trie"],
    keyInsight:
      "Sort queries by m and values ascending, insert values into a bitwise trie up to each query's m, then answer it.",
    difficulty: "hard",
  },
  {
    id: "drill-best-xor-stretch",
    text: "A list of numbers is given. Find the run of consecutive numbers whose XOR of all elements is largest.",
    answerConceptIds: ["dsa.tries.bitwise-trie", "dsa.bits.xor-tricks"],
    keyInsight:
      "A run's XOR is prefix[j] XOR prefix[i], so insert prefixes into a bitwise trie and maximise each new prefix against it.",
    difficulty: "hard",
  },

  // Graph basics
  {
    id: "drill-fewest-introductions",
    text: "A social network records who knows whom. Find the fewest introductions needed to connect two people.",
    answerConceptIds: ["dsa.graph-basics.bfs"],
    keyInsight:
      "It's a shortest path with no weights: BFS from one person until the other is reached.",
    difficulty: "easy",
  },
  {
    id: "drill-stations-within-four-stops",
    text: "A metro map shows which stations are next to each other on a line. List every station reachable within 4 stops of your home station.",
    answerConceptIds: ["dsa.graph-basics.bfs"],
    keyInsight: "BFS level by level from home and stop after level 4.",
    difficulty: "easy",
  },
  {
    id: "drill-knight-moves",
    text: "A chess knight stands on one square of an 8 × 8 board. Find the fewest moves it needs to reach another given square.",
    answerConceptIds: ["dsa.graph-basics.bfs", "dsa.graph-basics.bfs-on-state-spaces"],
    keyInsight:
      "Squares are nodes and the up to 8 knight moves are edges, so BFS gives the minimum number of moves.",
    difficulty: "medium",
  },
  {
    id: "drill-friend-groups",
    text: "A list records which pairs of people are friends. Count the separate friend groups, where friends of friends belong to the same group.",
    answerConceptIds: [
      "dsa.graph-basics.dfs",
      "dsa.graph-basics.bfs",
      "dsa.mst-dsu.dsu-applications",
    ],
    keyInsight: "Start a DFS from each unvisited person; each new start is a new group.",
    difficulty: "easy",
  },
  {
    id: "drill-dependency-loop",
    text: "A package manager has a list of which packages depend on which. Decide whether the dependencies contain a loop, which would make installation impossible.",
    answerConceptIds: ["dsa.graph-basics.dfs", "dsa.graph-basics.topological-sort"],
    keyInsight: "DFS with three colours: reaching a node that is still in progress means a loop.",
    difficulty: "medium",
  },
  {
    id: "drill-copy-server-network",
    text: "A network of servers is stored with each server listing its neighbours. Make an independent copy of the whole network with the same connections.",
    answerConceptIds: ["dsa.graph-basics.dfs", "dsa.graph-basics.bfs"],
    keyInsight:
      "Traverse with a map from each original server to its copy; create the copy on first visit and reuse it afterwards.",
    difficulty: "medium",
  },
  {
    id: "drill-count-islands-photo",
    text: "A satellite photo is a grid of land and water cells. Count the islands, where land cells connect up, down, left and right.",
    answerConceptIds: ["dsa.graph-basics.grids-as-graphs"],
    keyInsight:
      "Each unvisited land cell starts a flood fill (DFS or BFS) that marks its whole island.",
    difficulty: "easy",
  },
  {
    id: "drill-paint-bucket",
    text: "A paint program's bucket tool recolours the clicked pixel and every connected pixel of the same colour. Implement it.",
    answerConceptIds: ["dsa.graph-basics.grids-as-graphs"],
    keyInsight:
      "Flood fill from the clicked pixel to neighbours of the original colour; do nothing if the new colour equals the old one, or it never stops.",
    difficulty: "easy",
  },
  {
    id: "drill-maze-shortest-exit",
    text: "A maze is a grid of walls and open cells with one entrance and one exit. Find the length of the shortest walk from the entrance to the exit.",
    answerConceptIds: ["dsa.graph-basics.grids-as-graphs", "dsa.graph-basics.bfs"],
    keyInsight:
      "BFS over open cells with bounds and wall checks; the first time you reach the exit gives the distance.",
    difficulty: "easy",
  },
  {
    id: "drill-nearest-mall-exit",
    text: "A shopping mall floor plan is a grid with several exits. For every walkable cell, compute the walking distance to the nearest exit.",
    answerConceptIds: ["dsa.graph-basics.multi-source-bfs"],
    keyInsight:
      "Put every exit in the queue at distance 0 and run one BFS; each cell is first reached from its nearest exit.",
    difficulty: "medium",
  },
  {
    id: "drill-spreading-forest-fire",
    text: "A fire starts at several places in a forest grid and spreads to neighbouring trees every minute. Find how many minutes until every tree has burned, or report that some tree never burns.",
    answerConceptIds: ["dsa.graph-basics.multi-source-bfs"],
    keyInsight:
      "Start BFS from all fires at once; the answer is the last level reached, or −1 if some tree is never visited.",
    difficulty: "medium",
  },
  {
    id: "drill-closest-hospital",
    text: "Some towns in a road network have hospitals, and every road takes the same time to drive. For every town, find which hospital is closest.",
    answerConceptIds: ["dsa.graph-basics.multi-source-bfs"],
    keyInsight:
      "Seed one BFS with every hospital and label each town with the hospital whose wave reaches it first.",
    difficulty: "medium",
  },
  {
    id: "drill-recipe-step-order",
    text: "A recipe comes with rules like “chop before frying”. Produce an order to do every step that respects all rules, or report that the rules contradict each other.",
    answerConceptIds: ["dsa.graph-basics.topological-sort"],
    keyInsight:
      "Kahn's algorithm: repeatedly take steps with no remaining prerequisites; if some are left over, there is a cycle.",
    difficulty: "medium",
  },
  {
    id: "drill-fewest-semesters",
    text: "A degree plan lists course prerequisites, and you may take any number of courses per semester. Find the fewest semesters needed to take every course.",
    answerConceptIds: ["dsa.graph-basics.topological-sort"],
    keyInsight:
      "Run Kahn's algorithm level by level; each level of courses with no remaining prerequisites is one semester.",
    difficulty: "medium",
  },
  {
    id: "drill-spreadsheet-recalc-order",
    text: "A spreadsheet has cells whose formulas use other cells. Find an order to recompute the cells so each is computed after every cell it uses.",
    answerConceptIds: ["dsa.graph-basics.topological-sort"],
    keyInsight:
      "Draw an edge from each used cell to the cell using it; any topological order works, and a cycle means a circular reference.",
    difficulty: "medium",
  },
  {
    id: "drill-two-rival-teams",
    text: "A teacher knows which pairs of students don't get along. Split the class into two teams so that no such pair is on the same team, or say it can't be done.",
    answerConceptIds: ["dsa.graph-basics.bipartite-check"],
    keyInsight:
      "Two-colour the conflict graph with BFS or DFS; an edge between two nodes of the same colour means it's impossible.",
    difficulty: "medium",
  },
  {
    id: "drill-two-shelf-chemicals",
    text: "A storeroom must place chemicals on two shelves, and a list says which pairs react dangerously. Decide whether the chemicals can be shelved so no reactive pair shares a shelf.",
    answerConceptIds: ["dsa.graph-basics.bipartite-check"],
    keyInsight:
      "It's possible exactly when the reaction graph can be two-coloured, which BFS or DFS checks in linear time.",
    difficulty: "medium",
  },
  {
    id: "drill-cross-group-matches",
    text: "A tournament planner has a list of scheduled matches between players. Decide whether the players can be split into two groups so that every match is between the groups.",
    answerConceptIds: ["dsa.graph-basics.bipartite-check"],
    keyInsight:
      "The split exists exactly when the match graph has no odd cycle, which a two-colouring detects.",
    difficulty: "medium",
  },
  {
    id: "drill-light-panel-presses",
    text: "A 3 × 3 light panel has a switch under each light, and pressing one toggles it and its side neighbours. Find the fewest presses that turn every light off from a given pattern.",
    answerConceptIds: ["dsa.graph-basics.bfs-on-state-spaces", "dsa.bits.bitmask-enumeration"],
    keyInsight:
      "Each 9-bit pattern is a state and each press an edge, so BFS from the start finds the fewest presses.",
    difficulty: "medium",
  },
  {
    id: "drill-measure-four-litres",
    text: "You have a 3-litre jug, a 5-litre jug and a tap. Using fill, empty and pour-into-the-other moves, find the fewest moves to have exactly 4 litres in one jug.",
    answerConceptIds: ["dsa.graph-basics.bfs-on-state-spaces"],
    keyInsight:
      "A state is the pair of amounts in the jugs; BFS over the six moves gives the shortest sequence.",
    difficulty: "medium",
  },
  {
    id: "drill-double-or-minus-one",
    text: "A machine shows a number and has two buttons: one doubles it and the other subtracts 1. The number must stay between 1 and 10,000. Find the fewest presses from a start number to a target.",
    answerConceptIds: ["dsa.graph-basics.bfs-on-state-spaces"],
    keyInsight:
      "Numbers are states and presses are edges; BFS within the bounds finds the fewest presses.",
    difficulty: "medium",
  },

  // Shortest paths
  {
    id: "drill-fastest-drive-times",
    text: "A map app knows the driving time of every road, and no time is negative. Find the fastest time from home to every other place.",
    answerConceptIds: ["dsa.shortest-paths.dijkstras-algorithm"],
    keyInsight: "Dijkstra with a min-heap, skipping stale heap entries.",
    difficulty: "easy",
  },
  {
    id: "drill-message-arrival",
    text: "A message starts at one server and travels along links, each with a delay. Find when the last server receives it, or report that some server never does.",
    answerConceptIds: ["dsa.shortest-paths.dijkstras-algorithm"],
    keyInsight:
      "Run Dijkstra from the source; the answer is the largest shortest time, or −1 if some server is unreachable.",
    difficulty: "medium",
  },
  {
    id: "drill-gentlest-hike",
    text: "A hiking map is a grid of heights. A route's effort is the largest height difference between two consecutive cells on it. Find the least-effort route from one corner to the opposite one.",
    answerConceptIds: [
      "dsa.shortest-paths.dijkstras-algorithm",
      "dsa.binary-search.binary-search-on-the-answer",
    ],
    keyInsight:
      "Run Dijkstra where a path's cost is its largest step instead of the sum; binary search on the effort with BFS also works.",
    difficulty: "hard",
  },
  {
    id: "drill-cheapest-three-flights",
    text: "Each city has flights with prices. Find the cheapest route from A to B using at most three flights.",
    answerConceptIds: [
      "dsa.graph-basics.bfs-on-state-spaces",
      "dsa.shortest-paths.dijkstras-algorithm",
    ],
    keyInsight:
      "Limit relaxation to k + 1 rounds (Bellman-Ford), or search over (city, flights used) states.",
    difficulty: "medium",
  },
  {
    id: "drill-arrow-grid-fixes",
    text: "Each cell of a grid city has an arrow pointing to a neighbouring cell. Following an arrow is free, and changing a cell's arrow costs 1. Find the least cost to get from the top-left cell to the bottom-right cell.",
    answerConceptIds: ["dsa.shortest-paths.0-1-bfs"],
    keyInsight:
      "Every move costs 0 or 1, so use a deque: push free moves to the front and paid moves to the back.",
    difficulty: "hard",
  },
  {
    id: "drill-hammer-through-walls",
    text: "In a maze, stepping into an open cell is free, but breaking into a wall cell takes one hammer blow. Find the fewest blows needed to get from the start to the exit.",
    answerConceptIds: ["dsa.shortest-paths.0-1-bfs"],
    keyInsight:
      "Moves cost 0 (open) or 1 (wall), so 0-1 BFS with a deque solves it in linear time.",
    difficulty: "medium",
  },
  {
    id: "drill-fewest-line-changes",
    text: "A rail network has several lines through shared stations. Riding along a line costs nothing, and each change of line costs 1. Find the fewest changes between two stations.",
    answerConceptIds: ["dsa.shortest-paths.0-1-bfs", "dsa.graph-basics.bfs-on-state-spaces"],
    keyInsight:
      "Use (station, line) states: riding along costs 0 and changing lines costs 1, then run 0-1 BFS.",
    difficulty: "medium",
  },

  // Disjoint set union
  {
    id: "drill-shared-contact-customers",
    text: "A shop's customer records sometimes share a phone number or an email address. Records that share any contact detail, directly or through other records, belong to the same customer. Count the customers.",
    answerConceptIds: ["dsa.mst-dsu.dsu-applications"],
    keyInsight:
      "Union records that share a detail (map each detail to the first record that had it) and count the distinct roots.",
    difficulty: "medium",
  },
  {
    id: "drill-roads-added-over-time",
    text: "Roads are built between towns one at a time. After each new road, report how many separate groups of connected towns there are.",
    answerConceptIds: ["dsa.mst-dsu.dsu-applications"],
    keyInsight:
      "Union-find with a group counter that drops by one whenever a road joins two different roots.",
    difficulty: "medium",
  },
  {
    id: "drill-extra-cable",
    text: "A network was wired as a tree, but one extra cable was added and created a loop. Given the cables in the order they were laid, find one you can remove to make the network a tree again.",
    answerConceptIds: ["dsa.mst-dsu.dsu-applications"],
    keyInsight:
      "Add cables one by one with union-find; the first cable whose ends already share a root closes the loop.",
    difficulty: "medium",
  },

  // Dynamic programming
  {
    id: "drill-one-two-three-steps",
    text: "A staircase has n steps, and you can climb 1, 2 or 3 steps at a time. Count the ways to reach the top.",
    answerConceptIds: ["dsa.dp-1d.linear-dp"],
    keyInsight:
      "ways(i) = ways(i − 1) + ways(i − 2) + ways(i − 3), keeping only the last three values.",
    difficulty: "easy",
  },
  {
    id: "drill-stepping-stone-costs",
    text: "A path of stepping stones has a cost for landing on each stone. You may step one or two stones at a time. Find the cheapest way to get from before the first stone to beyond the last.",
    answerConceptIds: ["dsa.dp-1d.linear-dp"],
    keyInsight: "best(i) = cost(i) + min(best(i − 1), best(i − 2)).",
    difficulty: "easy",
  },
  {
    id: "drill-lily-pad-heights",
    text: "A frog hops along lily pads of different heights, one or two pads at a time. Each hop costs the height difference between the two pads. Find the least total cost to reach the last pad.",
    answerConceptIds: ["dsa.dp-1d.linear-dp"],
    keyInsight: "dp(i) = min(dp(i − 1) + |h(i) − h(i − 1)|, dp(i − 2) + |h(i) − h(i − 2)|).",
    difficulty: "easy",
  },
  {
    id: "drill-donation-street",
    text: "A fundraiser visits a street of houses with known donation amounts, but neighbours compare notes, so you can't ask two houses side by side. Maximise the total donations.",
    answerConceptIds: ["dsa.dp-1d.take-or-skip-dp"],
    keyInsight: "best(i) = max(best(i − 1), best(i − 2) + amount(i)).",
    difficulty: "easy",
  },
  {
    id: "drill-donation-cul-de-sac",
    text: "The same fundraiser now visits houses around a circular cul-de-sac, where the first and last houses are neighbours. Maximise the total donations.",
    answerConceptIds: ["dsa.dp-1d.take-or-skip-dp"],
    keyInsight:
      "Solve the straight street twice, once without the first house and once without the last, and take the better.",
    difficulty: "medium",
  },
  {
    id: "drill-spicy-buffet",
    text: "At a buffet, taking a dish of spice level s earns s points, but then you may not take any dish of level s − 1 or s + 1. Maximise your points.",
    answerConceptIds: ["dsa.dp-1d.take-or-skip-dp"],
    keyInsight:
      "Total the points per level, then take or skip consecutive levels: best(s) = max(best(s − 1), best(s − 2) + total(s)).",
    difficulty: "medium",
  },
  {
    id: "drill-spy-digit-messages",
    text: "A spy encodes letters as numbers, a = 1 to z = 26, and sends messages as runs of digits with no separators. Count how many different messages a digit string could mean.",
    answerConceptIds: ["dsa.dp-1d.decoding-and-segmentation-dp"],
    keyInsight:
      "ways(i) adds ways(i − 1) if the last digit is 1 to 9, and ways(i − 2) if the last two digits form 10 to 26.",
    difficulty: "medium",
  },
  {
    id: "drill-split-domain-name",
    text: "A domain name like bestpizzainrome has no spaces. Decide whether it can be split into words from a given dictionary.",
    answerConceptIds: ["dsa.dp-1d.decoding-and-segmentation-dp"],
    keyInsight:
      "can(i) is true if some dictionary word ends at position i and can(start of that word) is true.",
    difficulty: "medium",
  },
  {
    id: "drill-fewest-words-message",
    text: "A text message was typed without spaces. Using a dictionary, find the fewest words it can be split into.",
    answerConceptIds: ["dsa.dp-1d.decoding-and-segmentation-dp"],
    keyInsight: "fewest(i) = min over dictionary words w ending at i of fewest(i − |w|) + 1.",
    difficulty: "medium",
  },
  {
    id: "drill-robot-blocked-paths",
    text: "A robot on a grid moves only right or down, and some cells are blocked. Count its paths from the top-left corner to the bottom-right corner.",
    answerConceptIds: ["dsa.dp-grid.grid-path-dp"],
    keyInsight: "paths(r, c) = paths(r − 1, c) + paths(r, c − 1), and zero on blocked cells.",
    difficulty: "easy",
  },
  {
    id: "drill-toll-grid-route",
    text: "A delivery grid charges a toll in each cell, and the van moves only right or down. Find the cheapest route from one corner to the opposite corner.",
    answerConceptIds: ["dsa.dp-grid.grid-path-dp"],
    keyInsight:
      "cost(r, c) = toll(r, c) + min(cost(r − 1, c), cost(r, c − 1)); one row of memory is enough.",
    difficulty: "easy",
  },
  {
    id: "drill-hiker-starting-energy",
    text: "A hiker crosses a grid moving only right or down. Some cells have snacks that add energy and others have climbs that cost energy. Find the least starting energy so the hiker's energy never drops to zero.",
    answerConceptIds: ["dsa.dp-grid.grid-path-dp"],
    keyInsight:
      "Fill the table backwards from the goal: need(r, c) = max(1, min(need right, need below) − cell).",
    difficulty: "hard",
  },
  {
    id: "drill-greenhouse-square",
    text: "A field grid marks each plot as usable or not. Find the largest square area of usable plots for a greenhouse.",
    answerConceptIds: ["dsa.dp-grid.square-submatrices"],
    keyInsight:
      "side(r, c) = 1 + min(top, left, top-left) on a usable cell; the answer is the largest side squared.",
    difficulty: "medium",
  },
  {
    id: "drill-count-lit-squares",
    text: "A display is a grid of pixels that are either lit or dark. Count every square block, of any size, whose pixels are all lit.",
    answerConceptIds: ["dsa.dp-grid.square-submatrices"],
    keyInsight:
      "Build the same side(r, c) table; each cell ends side(r, c) all-lit squares, so add up the table.",
    difficulty: "medium",
  },
  {
    id: "drill-single-colour-square",
    text: "A mosaic is a grid of black and white tiles. Find the largest square region made of tiles of one colour.",
    answerConceptIds: ["dsa.dp-grid.square-submatrices"],
    keyInsight:
      "Use side(r, c) = 1 + min of the three neighbours when all three have the same colour as the cell, else 1.",
    difficulty: "medium",
  },
  {
    id: "drill-hiking-pack",
    text: "A hiking pack holds 20 kg, and each item has a weight and a usefulness score. Each item can be packed at most once. Maximise the total usefulness.",
    answerConceptIds: ["dsa.dp-knapsack.0-1-knapsack"],
    keyInsight:
      "best[w] over capacities, looping weights downwards for each item so it is used at most once.",
    difficulty: "easy",
  },
  {
    id: "drill-film-festival-minutes",
    text: "A film festival streams its films on demand, and each film has a length and your rating of it. You have 600 minutes of viewing time. Choose films to maximise the total rating.",
    answerConceptIds: ["dsa.dp-knapsack.0-1-knapsack"],
    keyInsight:
      "Minutes are the capacity and ratings the values: a 0/1 knapsack with a downward loop over minutes.",
    difficulty: "medium",
  },
  {
    id: "drill-credits-and-memory",
    text: "A cloud budget allows 1,000 credits and 64 GB of memory in total. Each job needs some credits and some memory and has a value. Choose jobs to maximise the total value.",
    answerConceptIds: ["dsa.dp-knapsack.0-1-knapsack"],
    keyInsight:
      "Two capacities make the state (credits, memory); for each job, loop both downwards.",
    difficulty: "hard",
  },
  {
    id: "drill-heirs-equal-gold",
    text: "A pile of gold coins of various weights must be split between two heirs. Decide whether both can get exactly the same weight.",
    answerConceptIds: ["dsa.dp-knapsack.subset-sum-and-partition"],
    keyInsight:
      "If the total is even, ask whether some subset reaches half of it: a boolean knapsack.",
    difficulty: "medium",
  },
  {
    id: "drill-gain-or-lose-rounds",
    text: "A quiz has rounds worth known points, and each round is either won (points added) or lost (points subtracted). Count the ways to finish with exactly S points.",
    answerConceptIds: ["dsa.dp-knapsack.subset-sum-and-partition"],
    keyInsight:
      "If W is the set of won rounds, sum(W) = (total + S) / 2, so count subsets with that sum.",
    difficulty: "medium",
  },
  {
    id: "drill-close-relay-teams",
    text: "A group of runners, each with a personal time, must be split into two relay teams. Make the teams' total times as close as possible.",
    answerConceptIds: ["dsa.dp-knapsack.subset-sum-and-partition"],
    keyInsight:
      "Find every reachable subset total up to half the grand total; the best split uses the reachable total closest to half.",
    difficulty: "medium",
  },
  {
    id: "drill-fewest-coins-change",
    text: "A cashier has unlimited coins of a few odd values, such as 1, 7 and 10. Give change for an amount using the fewest coins, or say it can't be done.",
    answerConceptIds: ["dsa.dp-knapsack.unbounded-knapsack"],
    keyInsight:
      "min coins for each amount, looping amounts upwards so each coin can be reused; greedy fails for such values.",
    difficulty: "medium",
  },
  {
    id: "drill-ways-to-pay",
    text: "A ticket machine takes unlimited coins of given values. Count the ways to pay an amount, where the order of coins doesn't matter.",
    answerConceptIds: ["dsa.dp-knapsack.unbounded-knapsack"],
    keyInsight:
      "Loop coins in the outer loop and amounts upwards in the inner loop, so each combination is counted once.",
    difficulty: "medium",
  },
  {
    id: "drill-timber-cuts",
    text: "A sawmill can cut a plank of length n into pieces, and a piece of each length sells for a known price. Maximise the revenue from one plank.",
    answerConceptIds: ["dsa.dp-knapsack.unbounded-knapsack"],
    keyInsight:
      "best[len] = max over piece lengths p of price(p) + best[len − p], with every length reusable.",
    difficulty: "medium",
  },
  {
    id: "drill-age-and-height-line",
    text: "A photographer wants the largest group of people who can stand in a line where both age and height strictly increase from left to right. Any subset of the crowd may be chosen.",
    answerConceptIds: ["dsa.dp-subsequences.longest-increasing-subsequence"],
    keyInsight:
      "Sort by age, and by height descending within the same age, then find the longest strictly increasing run of heights in O(n log n).",
    difficulty: "hard",
  },
  {
    id: "drill-rising-price-days",
    text: "An analyst has a stock's price for every day. Find the largest set of days, not necessarily consecutive, on which the price strictly rises from each chosen day to the next.",
    answerConceptIds: ["dsa.dp-subsequences.longest-increasing-subsequence"],
    keyInsight:
      "Longest increasing subsequence: keep the smallest possible tail for each length and binary search where each price goes.",
    difficulty: "medium",
  },
  {
    id: "drill-shelf-reinsertions",
    text: "A librarian finds a shelf of books with distinct catalogue numbers out of order. Taking a book out and putting it back anywhere counts as one move. Find the fewest moves to sort the shelf.",
    answerConceptIds: ["dsa.dp-subsequences.longest-increasing-subsequence"],
    keyInsight:
      "Books in the longest increasing subsequence can stay, so the answer is n minus its length.",
    difficulty: "medium",
  },
  {
    id: "drill-trading-with-rest-day",
    text: "Given a stock's daily prices, you may buy and sell one share as often as you like, but after selling you must wait a day before buying again. Maximise the profit.",
    answerConceptIds: ["dsa.dp-subsequences.stock-trading-state-machine"],
    keyInsight:
      "Track three states per day, holding, just sold and resting, each computed from the previous day's states.",
    difficulty: "medium",
  },
  {
    id: "drill-trading-with-fee",
    text: "A broker charges a fixed fee on every sale. With daily prices and one share held at a time, trade as often as you like to maximise the profit.",
    answerConceptIds: ["dsa.dp-subsequences.stock-trading-state-machine"],
    keyInsight: "Two states, holding and not holding, paying the fee on each sale.",
    difficulty: "medium",
  },
  {
    id: "drill-two-trades-a-year",
    text: "You may make at most two complete buy-and-sell trades during a year of daily prices, holding one share at a time. Maximise the profit.",
    answerConceptIds: ["dsa.dp-subsequences.stock-trading-state-machine"],
    keyInsight:
      "Four states, after the first buy, first sell, second buy and second sell, each updated from the previous day.",
    difficulty: "hard",
  },
  {
    id: "drill-unchanged-lines",
    text: "Two versions of a document are lists of lines. Find the largest set of lines that appear in both versions in the same order, to show as unchanged in a comparison.",
    answerConceptIds: ["dsa.dp-strings.longest-common-subsequence"],
    keyInsight:
      "LCS table over line indices: a match extends the diagonal, otherwise take the better of dropping a line from either side.",
    difficulty: "medium",
  },
  {
    id: "drill-shared-itinerary",
    text: "Two friends' travel diaries list the cities each visited, in order. Find the longest sequence of cities that both visited in the same order, not necessarily back to back.",
    answerConceptIds: ["dsa.dp-strings.longest-common-subsequence"],
    keyInsight: "This is the longest common subsequence of the two lists, built with a 2D table.",
    difficulty: "medium",
  },
  {
    id: "drill-fewest-letters-to-mirror",
    text: "A word should read the same forwards and backwards. Find the fewest letters to insert anywhere in it to make that happen.",
    answerConceptIds: ["dsa.dp-strings.longest-common-subsequence"],
    keyInsight:
      "The answer is n minus the LCS of the word and its reverse, which is its longest palindromic subsequence.",
    difficulty: "hard",
  },
  {
    id: "drill-spell-check-ranking",
    text: "A spell checker ranks dictionary words by how many single-letter insertions, deletions or substitutions turn the typed word into them. Compute that number for one pair of words.",
    answerConceptIds: ["dsa.dp-strings.edit-distance"],
    keyInsight:
      "dist[i][j] = dist[i − 1][j − 1] if the letters match, otherwise 1 + the minimum of insert, delete and replace.",
    difficulty: "medium",
  },
  {
    id: "drill-weighted-sequence-alignment",
    text: "A lab tool aligns two genetic sequences, charging 1 for an insertion or deletion and 2 for a substitution. Find the cheapest alignment cost.",
    answerConceptIds: ["dsa.dp-strings.edit-distance"],
    keyInsight: "The edit distance table with weighted transitions.",
    difficulty: "medium",
  },
  {
    id: "drill-playlist-edits",
    text: "A playlist must be turned into another playlist. Each operation adds a song, removes a song, or replaces the song at a position. Find the fewest operations.",
    answerConceptIds: ["dsa.dp-strings.edit-distance"],
    keyInsight: "Treat songs as letters and compute the edit distance between the two lists.",
    difficulty: "medium",
  },
  {
    id: "drill-merge-stone-piles",
    text: "A row of stone piles must be merged into one pile. Each step merges two neighbouring piles and costs their combined size. Find the cheapest total cost.",
    answerConceptIds: ["dsa.dp-intervals.interval-dp"],
    keyInsight:
      "cost(i, j) = min over split k of cost(i, k) + cost(k + 1, j) + sum(i..j), filled by increasing length.",
    difficulty: "hard",
  },
  {
    id: "drill-matrix-bracketing",
    text: "A chain of matrices must be multiplied together in order. Choose where to put brackets to minimise the number of scalar multiplications.",
    answerConceptIds: ["dsa.dp-intervals.interval-dp"],
    keyInsight: "cost(i, j) = min over the last split k; iterate by chain length.",
    difficulty: "hard",
  },
  {
    id: "drill-log-cutting-order",
    text: "A log must be cut at several marked points, and each cut costs the length of the piece being cut. Choose the order of cuts to minimise the total cost.",
    answerConceptIds: ["dsa.dp-intervals.interval-dp"],
    keyInsight:
      "Between two neighbouring cut positions, try each mark as the first cut and add the piece's length; fill by increasing gap.",
    difficulty: "hard",
  },
  {
    id: "drill-party-without-bosses",
    text: "A company plans a party and knows each employee's fun score. Nobody wants to attend together with their direct manager. Using the org chart tree, maximise total fun.",
    answerConceptIds: ["dsa.dp-advanced.dp-on-trees"],
    keyInsight:
      "Each node returns two values, best with it invited and best without, and its parent combines them.",
    difficulty: "medium",
  },
  {
    id: "drill-cameras-in-rooms",
    text: "Rooms are connected like a binary tree, and a camera in a room watches that room, its parent and its children. Find the fewest cameras that watch every room.",
    answerConceptIds: ["dsa.dp-advanced.dp-on-trees"],
    keyInsight:
      "Each node reports a state (has a camera, covered, or needs cover), and cameras are placed from the leaves upwards.",
    difficulty: "hard",
  },
  {
    id: "drill-capital-region",
    text: "Cities form a tree of roads, each city with a population. Choose a connected group of at most k cities that includes the capital, maximising the total population.",
    answerConceptIds: ["dsa.dp-advanced.dp-on-trees"],
    keyInsight:
      "Each node returns best[size] for groups rooted at it, and children's arrays are merged like a knapsack.",
    difficulty: "hard",
  },
  {
    id: "drill-fifteen-shop-tour",
    text: "A courier must visit 15 shops once each and return to the depot, with a travel time between every pair. Find the fastest tour.",
    answerConceptIds: ["dsa.dp-advanced.bitmask-dp"],
    keyInsight:
      "Use states (set of shops visited, current shop): about 2¹⁵ × 15 states instead of 15 factorial orders.",
    difficulty: "hard",
  },
  {
    id: "drill-assign-workers-jobs",
    text: "Up to 20 workers must each take a different job, one job per worker, and every worker has a cost for every job. Minimise the total cost.",
    answerConceptIds: ["dsa.dp-advanced.bitmask-dp"],
    keyInsight:
      "Assign workers in order; the state is the set of jobs already taken, so dp[mask] tries each free job for the next worker.",
    difficulty: "hard",
  },
  {
    id: "drill-four-equal-teams",
    text: "Sixteen tasks with different durations must be split among 4 teams. Decide whether every team can get exactly the same total time.",
    answerConceptIds: ["dsa.dp-advanced.bitmask-dp"],
    keyInsight:
      "dp over subsets of tasks, storing how full the current team is; a task can join only if it doesn't overflow the target.",
    difficulty: "hard",
  },

  // Bits and math
  {
    id: "drill-guest-still-inside",
    text: "Every guest's badge number was logged once on entry and once on exit, except one guest who is still inside. Find that badge number using constant memory.",
    answerConceptIds: ["dsa.bits.xor-tricks"],
    keyInsight: "XOR all the numbers; pairs cancel, leaving the one without a partner.",
    difficulty: "easy",
  },
  {
    id: "drill-missing-invoice-number",
    text: "An accountant should have invoices numbered 0 to n, but one is missing from the list of n. Find it without extra memory and without any risk of overflow.",
    answerConceptIds: ["dsa.bits.xor-tricks"],
    keyInsight:
      "XOR every number from 0 to n with every number in the list; everything cancels except the missing one.",
    difficulty: "easy",
  },
  {
    id: "drill-two-unpaired-badges",
    text: "In a log where every badge appears twice, exactly two badges appear only once. Find both in linear time and constant memory.",
    answerConceptIds: ["dsa.bits.xor-tricks"],
    keyInsight:
      "XOR everything to get a XOR b, split the numbers by any set bit of that result, and XOR each group separately.",
    difficulty: "medium",
  },
  {
    id: "drill-band-set-list",
    text: "A band has 12 songs of known lengths and a 45-minute slot. Try every possible set of songs to find the one closest to 45 minutes without going over.",
    answerConceptIds: ["dsa.bits.bitmask-enumeration", "dsa.backtracking.subsets"],
    keyInsight: "Loop a mask from 0 to 2¹² − 1; bit i says whether song i is in the set.",
    difficulty: "easy",
  },
  {
    id: "drill-topping-sub-deals",
    text: "A pizza chain prices deals on sets of up to 15 toppings. For every possible order, it wants to look up every smaller topping set contained in it.",
    answerConceptIds: ["dsa.bits.bitmask-enumeration"],
    keyInsight:
      "sub = (sub − 1) & mask walks all submasks of a mask, and over all masks this takes 3ⁿ steps in total.",
    difficulty: "medium",
  },
  {
    id: "drill-forty-coins-target",
    text: "A collector has 40 coins and wants to know whether some selection totals exactly T. Trying all 2⁴⁰ selections is far too slow.",
    answerConceptIds: ["dsa.bits.bitmask-enumeration", "dsa.hashing.complement-lookup"],
    keyInsight:
      "Meet in the middle: list the 2²⁰ subset totals of each half, then look up T minus each total of one half among the other's.",
    difficulty: "hard",
  },
  {
    id: "drill-one-post-from-stream",
    text: "Posts flow past in a stream of unknown length, and you may store only one. By the end of the stream, you must hold a post chosen uniformly at random.",
    answerConceptIds: ["dsa.math.randomized-algorithms"],
    keyInsight:
      "Replace the stored post with the i-th post with probability 1/i; each post ends up chosen with probability 1/n.",
    difficulty: "medium",
  },
  {
    id: "drill-fair-card-shuffle",
    text: "A card game needs to shuffle a deck in place so every order is equally likely. It must run in linear time.",
    answerConceptIds: ["dsa.math.randomized-algorithms"],
    keyInsight:
      "Fisher-Yates: for i from the last card down, swap card i with a uniformly random position from 0 to i.",
    difficulty: "easy",
  },
  {
    id: "drill-ticket-lottery",
    text: "In a lottery, each person's chance of winning is proportional to the number of tickets they bought. Pick a winner quickly, many times over.",
    answerConceptIds: ["dsa.math.randomized-algorithms"],
    keyInsight:
      "Build prefix sums of ticket counts, draw a random number below the total, and binary search for its owner.",
    difficulty: "medium",
  },
  {
    id: "drill-die-to-ten",
    text: "You have a fair six-sided die but need a fair random number from 1 to 10. Describe how to get one.",
    answerConceptIds: ["dsa.math.randomized-algorithms"],
    keyInsight:
      "Roll twice for 36 equally likely outcomes, keep the first 30 (re-roll the rest), and map them evenly to 1 to 10.",
    difficulty: "medium",
  },
];
