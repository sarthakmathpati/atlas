// A stand-in for Claude used with the fake `sample` capability (fakeClaude.ts): it recognises
// each prompt in lib/ai/prompts.ts by its instructions and answers in the right shape (text or
// JSON), using names and ids it finds in the prompt. Tests and the simulated artifact run use it;
// the app never imports it. The answers are placeholders, not tutoring content.
import type { SampleInput } from "./claude";

function allText(input: SampleInput): string {
  return typeof input === "string" ? input : input.map((t) => t.content).join("\n\n");
}

function lastUserTurn(input: SampleInput): string {
  if (typeof input === "string") return input;
  for (let i = input.length - 1; i >= 0; i--)
    if (input[i]!.role === "user") return input[i]!.content;
  return "";
}

function field(text: string, pattern: RegExp): string | undefined {
  return pattern.exec(text)?.[1]?.trim();
}

/** "- id: name" lines after a heading such as "Allowed pattern ids:". */
function idList(text: string, heading: string): { id: string; name: string }[] {
  const at = text.indexOf(heading);
  if (at < 0) return [];
  const out: { id: string; name: string }[] = [];
  for (const line of text
    .slice(at + heading.length)
    .split("\n")
    .slice(1)) {
    const m = /^- ([^:]+): (.+)$/.exec(line.trim());
    if (!m) {
      if (out.length) break;
      continue;
    }
    out.push({ id: m[1]!.trim(), name: m[2]!.trim() });
  }
  return out;
}

const json = (value: unknown) => JSON.stringify(value, null, 2);

export function demoSampleResponder(input: SampleInput): string {
  const text = allText(input);
  const concept = field(text, /Name: (.+?) \(/) ?? "this concept";
  const problem = field(text, /## Problem\n(.+?) \(/) ?? "this problem";

  if (text.includes("Reply with the single word OK")) return "OK";

  const hint = /Give ONLY hint level (\d)/.exec(text);
  if (hint) {
    const level = Number(hint[1]);
    if (level === 1)
      return "Look at what you recompute on every step. Is there something you could remember as you go, so each step costs less?";
    if (level === 2)
      return "Use a **sliding window**: keep a left and a right edge, grow the right edge one step at a time, and move the left edge only when the window breaks the rule. Each element enters and leaves once.";
    return "1. Set left to 0 and an empty count table.\n2. For each right index, add the new element to the table.\n3. While the window breaks the rule, remove the element at left and move left forward.\n4. Record the window size if it is the best so far.\n5. Return the best size.";
  }

  if (text.includes("Review the learner's code for this problem")) {
    return json({
      verdict: "has bugs",
      correctnessConcerns: [
        { line: 7, issue: "The loop runs to i <= n, so it reads one element past the end." },
      ],
      timeComplexity: "O(n^2)",
      spaceComplexity: "O(1)",
      isOptimal: false,
      optimalComplexity: "O(n)",
      edgeCasesMissed: ["An empty input", "All elements equal"],
      betterApproach:
        "Keep a running window instead of restarting from each index, so every element is visited a constant number of times.",
      codeQuality: ["Name the loop bounds (n) once instead of calling size() in the condition."],
      suggestedInsight: "Grow the window on the right, shrink it on the left only when it breaks.",
      suggestedMistakeTags: ["Off-by-one", "Empty input"],
    });
  }

  if (text.includes("Trace the learner's code on this input")) {
    return [
      "Input traced: `nums = [2, 7, 11, 15], target = 9`.",
      "",
      "| Step | i | nums[i] | seen | Note |",
      "|---|---|---|---|---|",
      "| 1 | 0 | 2 | {2: 0} | 9 - 2 = 7 not seen yet |",
      "| 2 | 1 | 7 | {2: 0, 7: 1} | 9 - 7 = 2 found at index 0 |",
      "",
      "**Output:** `[0, 1]`",
      "",
      "This matches the expected answer.",
    ].join("\n");
  }

  if (text.includes("Grade the learner's explanation of")) {
    const followUp = text.includes("You then asked:");
    return json({
      score: followUp ? 5 : 4,
      correctPoints: ["You explained what it is and why it matters.", "Your example was accurate."],
      missingPoints: followUp ? [] : ["The time complexity and when it applies."],
      misconceptions: [],
      betterExplanation: `${concept} solves the problem by reusing work instead of repeating it. Start from the simplest case, keep only what the next step needs, and each step stays cheap. That is why it runs in linear time on this kind of input.`,
      followUpQuestion: `What is the time complexity of ${concept}, and why?`,
    });
  }

  if (text.includes("Write a quick quiz of")) {
    const ids = idList(text, "Concept ids to use:");
    const id = ids[0]?.id ?? "unknown";
    const name = ids[0]?.name ?? concept;
    return json([
      {
        type: "mcq",
        question: `Which statement about ${name} is true?`,
        options: [
          "It always needs extra memory proportional to the input.",
          "It reuses earlier work so each step stays cheap.",
          "It only works on sorted input.",
          "It is slower than brute force on large inputs.",
        ],
        answerIndex: 1,
        explanation: "Reusing work is the whole point; the other options are common myths.",
        conceptId: id,
      },
      {
        type: "mcq",
        question: `When is ${name} the wrong choice?`,
        options: [
          "When the input is huge",
          "When there is no work to reuse between steps",
          "When the input has duplicates",
          "When memory is plentiful",
        ],
        answerIndex: 1,
        explanation: "Without shared work there is nothing to save.",
        conceptId: ids[1]?.id ?? id,
      },
      {
        type: "short",
        question: `In one or two sentences, what is the key idea of ${name}?`,
        modelAnswer: "Keep the result of earlier steps so later steps don't redo them.",
        explanation: "An interviewer wants the idea before the details.",
        conceptId: id,
      },
      {
        type: "mcq",
        question: "What is the usual time complexity?",
        options: ["O(1)", "O(log n)", "O(n)", "O(n^2)"],
        answerIndex: 2,
        explanation: "Each element is handled a constant number of times.",
        conceptId: id,
      },
      {
        type: "short",
        question: "Name one edge case to test.",
        modelAnswer: "An empty input, or an input of one element.",
        explanation: "Small cases catch off-by-one mistakes.",
        conceptId: id,
      },
    ]);
  }

  if (text.includes("Grade each short answer against its model answer")) {
    const indexes = [...text.matchAll(/Question (\d+):/g)].map((m) => Number(m[1]));
    return json(
      indexes.map((index, i) => ({
        index,
        score: i === 0 ? 1 : 0.5,
        feedback: i === 0 ? "That's the key idea." : "Partly right: say why it matters too.",
      })),
    );
  }

  if (text.includes("named the pattern they would use")) {
    return json({
      patternCorrect: true,
      approachScore: 0.8,
      feedback: "Right pattern and a clear plan. Say when the left edge moves to make it complete.",
    });
  }

  if (text.includes("original pattern-recognition prompts")) {
    const allowed = idList(text, "Allowed pattern ids:");
    const pick = (i: number) => allowed[i % Math.max(1, allowed.length)]?.id ?? "unknown";
    return json(
      [
        "A cinema tracks how many seats are free in each row. Find the widest block of rows next to each other where every row has at least four free seats.",
        "A delivery van visits houses along one street. Given each house's parcel count, find how many runs of neighbouring houses add up to exactly one full van load.",
        "A choir lines up by height. For each singer, find how many places to the right the next taller singer stands.",
        "A library tracks which shelves hold a requested book. Find the shortest run of neighbouring shelves that covers every requested title.",
        "A bakery logs each hour's sales. Find the hour after which the total since opening first passes the day's target.",
      ].map((prompt, i) => ({
        text: prompt,
        answerConceptIds: [pick(i)],
        keyInsight:
          "Keep a running summary as you move, instead of starting over at each position.",
        difficulty: i % 2 ? "medium" : "easy",
      })),
    );
  }

  if (text.includes("Suggest the 1 to 3 patterns this problem most likely uses")) {
    const allowed = idList(text, "Allowed pattern ids:");
    const title = (field(text, /Problem: (.+)/) ?? "").toLowerCase();
    const words = title.split(/\W+/).filter((w) => w.length > 3);
    const match = allowed.filter((a) => words.some((w) => a.name.toLowerCase().includes(w)));
    const ids = (match.length ? match : allowed).slice(0, 2).map((a) => a.id);
    return json({ conceptIds: ids, difficulty: "medium" });
  }

  if (text.includes("For each mistake the learner keeps making")) {
    const labels = [...text.matchAll(/^- (.+?) \(/gm)].map((m) => m[1]!.trim());
    return json(
      labels.map((tag) => ({
        tag,
        howToAvoid: `Before running your code, check the case that causes “${tag.toLowerCase()}” on a tiny input.`,
      })),
    );
  }

  if (text.includes("Give feedback on this mock interview")) {
    const keys = [...text.matchAll(/"(\w+)": 1-5/g)].map((m) => m[1]!);
    const scores = Object.fromEntries(keys.map((k, i) => [k, [4, 3, 4, 3, 4][i % 5]!]));
    return json({
      scores,
      strengths: [
        "You asked clarifying questions before starting.",
        "You explained your approach before writing code.",
      ],
      improvements: [
        "Test your code on a small example out loud before saying you're done.",
        "State the time and space complexity without being asked.",
      ],
      hireSignal: "yes",
      summary:
        "A solid interview. You clarified the problem, found a workable approach and wrote mostly correct code. Walking through a test case earlier would have caught the edge case sooner. With cleaner testing this is a clear hire.",
    });
  }

  if (text.includes("Act as a friendly but rigorous interviewer")) {
    const last = lastUserTurn(input);
    const phase = /\[Phase: ([^|\]]+)/.exec(last)?.[1]?.trim() ?? "";
    const left = /(\d+) min left/.exec(last)?.[1];
    const kind = /for a (dsa|theory|design|behavioral) interview/.exec(text)?.[1] ?? "dsa";
    if (last.includes("time is up") || (left !== undefined && Number(left) <= 3))
      return "We're almost out of time, so let's stop here. Thanks, that was a good discussion. Do you have any questions for me?";
    if (/I'm ready to begin/.test(last)) {
      if (kind === "dsa")
        return "Hi, thanks for joining. Here's the problem, in my words: you get a list of daily temperatures, and for each day you want to know how many days you'd wait for a warmer one (0 if never). For example, 73, 74, 75 gives 1, 1, 0. What questions do you have before you start?";
      if (kind === "theory")
        return "Hi. Let's do some quick questions. First one: what happens, step by step, when a process calls fork()?";
      if (kind === "design")
        return "Hi, thanks for joining. Let's design this together. Before anything else, what requirements would you like to pin down?";
      return "Hi, great to meet you. Let's start simple: tell me about yourself.";
    }
    // Answers so far (the candidate's turns after the opening each start with the time note).
    const turn =
      typeof input === "string"
        ? 1
        : Math.max(
            1,
            input.filter((m) => m.role === "user" && m.content.startsWith("[Phase:")).length - 1,
          );
    if (kind === "theory") {
      const next = [
        "Next: what's the difference between a process and a thread, and what do threads share?",
        "Next: what happens in TCP's three-way handshake, and why three steps rather than two?",
        "Next: what does an index on a column cost you when you write to the table?",
        "Next: what's a deadlock, and which of its four conditions is easiest to break?",
      ];
      return `${turn % 3 === 0 ? "Close, but not quite: the key point is what each side knows afterwards." : "That's right."} ${next[(turn - 1) % next.length]}`;
    }
    if (kind === "design") {
      if (phase === "Requirements")
        return "Good. What scale should we design for? Give me rough numbers for reads and writes.";
      if (phase === "High-level design")
        return "Walk me through the main components and how one request flows through them.";
      if (phase === "Deep dive")
        return "Let's go deeper on storage. How would you split the data when one machine isn't enough?";
      return "What would you change if writes grew ten times? What would you give up?";
    }
    if (kind === "behavioral") {
      if (phase === "Introduction")
        return "Thanks. Tell me about a time you had to fix a hard problem under time pressure.";
      if (phase === "Questions")
        return "What exactly did you do yourself, and what did the others on the team do?";
      return "How did you know it worked? And what would you do differently next time?";
    }
    if (phase === "Clarify")
      return "Good question. Yes, assume the input fits in memory and can be empty. What approach comes to mind?";
    if (phase === "Approach")
      return "That works. What's its time complexity, and can you do better than checking every later day?";
    if (phase === "Code")
      return "Go ahead and write it in the editor, and talk me through it as you go.";
    if (phase === "Test")
      return "Walk me through your code on 73, 74, 75. What does the stack hold after each step?";
    if (phase === "Complexity") return "Right. And the space complexity in the worst case?";
    return "Nice. A follow-up: what changes if the temperatures arrive as a stream, one day at a time?";
  }

  if (text.includes("Review the learner's design against the rubric")) {
    // Score each rubric point by whether the design mentions its first long word.
    const rubricBlock = text.split("## Rubric")[1]?.split("## Learner's design")[0] ?? "";
    const design = (text.split("## Learner's design")[1] ?? "").toLowerCase();
    const points = rubricBlock
      .split("\n")
      .map((l) => l.replace(/^- /, "").trim())
      .filter(Boolean);
    const rubric = points.map((point) => {
      const key = point
        .toLowerCase()
        .split(/\W+/)
        .find((w) => w.length > 5);
      const hit = key ? design.includes(key) : false;
      return {
        point,
        score: hit ? 2 : 0,
        comment: hit
          ? "Covered with a concrete choice and a reason."
          : "Not discussed. Say what you'd do and why.",
      };
    });
    const covered = rubric.filter((r) => r.score === 2).length;
    const overall = Math.max(
      1,
      Math.min(5, Math.round(1 + (4 * covered) / Math.max(1, points.length))),
    );
    return json({
      rubric,
      missed: rubric.filter((r) => r.score === 0).map((r) => r.point),
      suggestions: [
        "Start from the requirements and state the numbers you design for.",
        "Name the trade-off you are making at each choice.",
      ],
      overall,
    });
  }

  if (text.includes("Critique this STAR story for a behavioral interview")) {
    const question = field(text, /Interview question: (.+)/) ?? "the question";
    return json({
      clarity: 4,
      specificity: 3,
      impact: 3,
      structure: 4,
      lengthNote:
        "About 1 minute 20 seconds when spoken at 140 words a minute, which fits. Spend fewer words on the situation and more on what you did.",
      tighterVersion: `In my second internship, our checkout page failed for about one order in fifty, and nobody owned the bug. I took it on: I added logging, traced it to a retry that charged twice, and wrote a fix with a test. Failures dropped to zero in a week, and I now add a retry test to every payment change. That is my answer to "${question}".`,
      tips: [
        "Open with one sentence of context, then go straight to your action.",
        "Put a number on the result: how many users, how much faster, how much less.",
        "End with what you learned or changed afterwards.",
      ],
    });
  }

  if (text.includes("Grade the learner's answer to this puzzle")) {
    // A longer answer with reasons reads as right; a one-liner as partly right.
    const answer = text.split("Learner's answer and reasoning:")[1]?.trim() ?? "";
    const full = answer.split(/\s+/).length >= 12;
    return json({
      correct: full,
      score: full ? 0.9 : 0.5,
      feedback: full
        ? "Right answer, and you said why it works. Name the key step in one sentence first next time."
        : "The idea is there, but say why it works and check the edge case.",
      idealReasoning:
        "State the key observation, show it holds whatever the unknowns are, then give the method step by step and check it on a small case.",
    });
  }

  if (text.includes("Write study material for the concept")) {
    return json({
      simple: `${concept} is like keeping a running tally instead of recounting from scratch every time something changes.`,
      interview: [
        `What it is: ${concept}, a way to reuse work between steps.`,
        "When to use it: repeated work over overlapping parts of the input.",
        "Complexity: usually linear time with a small, fixed amount of extra state.",
        "Pitfall: forgetting to update the state when an element leaves.",
      ],
      questions: [
        {
          q: `What problem does ${concept} solve?`,
          a: "It avoids redoing work that overlaps between steps.",
        },
        {
          q: "What is its usual time complexity?",
          a: "Linear, because each element is handled a constant number of times.",
        },
        {
          q: "Name a common mistake.",
          a: "Not removing an element's effect when it leaves the current range.",
        },
      ],
    });
  }

  if (text.includes("Explain a complete, optimal solution to this problem")) {
    return [
      `**Key insight.** For ${problem}, remember what you've seen so each lookup is O(1).`,
      "",
      "**Approach.** Walk the array once. For each value, check whether its complement is already stored; if so, you have the pair. Otherwise store the value with its index.",
      "",
      "```cpp",
      "std::vector<int> twoSum(const std::vector<int>& nums, int target) {",
      "    std::unordered_map<int, int> seen;  // value -> index",
      "    for (int i = 0; i < (int)nums.size(); ++i) {",
      "        auto it = seen.find(target - nums[i]);",
      "        if (it != seen.end()) return {it->second, i};",
      "        seen[nums[i]] = i;",
      "    }",
      "    return {};",
      "}",
      "```",
      "",
      "**Complexity.** O(n) time, O(n) space.",
      "",
      "**Edge cases.** Duplicates (store after checking), no answer (return empty).",
      "",
      "**Remember:** store what you've seen in a hash map.",
    ].join("\n");
  }

  const level = /Explain (.+?) at the (simple|interview|deep) level\./.exec(text);
  if (level) {
    if (level[2] === "simple")
      return `Think of ${level[1]} as a queue at a ticket counter: whoever arrived first is served first, so you always handle the nearest things before the farther ones.`;
    if (level[2] === "interview")
      return `- **What:** ${level[1]} in one line.\n- **Key fact:** it visits items in order of distance.\n- **Complexity:** O(V + E).\n- **Use it when:** you need the fewest steps.\n- **Pitfall:** mark items when you add them, not when you remove them.`;
    return `### Intuition\n\n${level[1]} works outward in layers.\n\n### Example\n\n| Step | Queue | Visited |\n|---|---|---|\n| 1 | A | A |\n| 2 | B, C | A, B, C |\n\n### Code\n\n\`\`\`cpp\n// sketch\nstd::queue<int> q;\n\`\`\`\n\n### Complexity\n\nO(V + E) time and O(V) space.`;
  }

  if (text.includes("Write a short, kind, specific reflection on the learner's week")) {
    const weakest = /Subject readiness, weakest first: (.+)\./.exec(text)?.[1] ?? "";
    const ids = [...weakest.matchAll(/\(([a-z]+)\)/g)].map((m) => m[1]!).slice(0, 2);
    const minutes = /Minutes studied: (\d+)/.exec(text)?.[1] ?? "some";
    return [
      `**What went well:** you put in ${minutes} minutes and kept showing up, which is what makes reviews stick.`,
      "",
      "**What to watch:** a few concepts started to fade. A short flashcard round early in the week brings them back before they slip further.",
      "",
      "**One suggestion:** start each session with the oldest due re-solve, then one new problem on your weakest pattern.",
      "",
      JSON.stringify({ focusSubjects: ids }),
    ].join("\n");
  }

  if (text.includes("Compress this revision sheet to about")) {
    // Keep the structure: headings, every list item (shortened), and code blocks as they are.
    const sheet = lastUserTurn(input);
    const out: string[] = [];
    let inCode = false;
    for (const line of sheet.split("\n")) {
      if (line.startsWith("```")) inCode = !inCode;
      if (inCode || line.startsWith("```") || line.startsWith("#")) out.push(line);
      else if (/^\s*[-*] /.test(line))
        out.push(line.length > 110 ? `${line.slice(0, 107).trimEnd()}…` : line);
      else if (!line.trim() && out.at(-1)?.trim()) out.push("");
    }
    return out.join("\n").trim();
  }

  if (text.includes("The learner is chatting with you")) {
    const last = lastUserTurn(input).toLowerCase();
    if (last.includes("quiz me"))
      return "Here's the first question: what does the queue guarantee about the order you visit things in? Take your time, then answer.";
    if (last.includes("simpler") || last.includes("simply"))
      return `Simply put: ${concept} handles the closest things first, like ripples spreading out from a stone dropped in a pond.`;
    if (last.includes("example"))
      return "Take a tiny grid with start S and goal G two steps away:\n\n| Step | Frontier |\n|---|---|\n| 0 | S |\n| 1 | neighbours of S |\n| 2 | G found |\n\nThe first time you reach G is the shortest way there.";
    if (last.includes("interviewer"))
      return `Interviewers usually ask what ${concept} guarantees, its complexity, and when you would pick something else. A strong answer states the idea in one line, then the trade-off.`;
    return `Good question. ${concept === "this concept" ? "This" : concept} comes down to one idea: do the cheap, certain work first and reuse it. Want an example or a quick question to check it?`;
  }

  return "OK";
}
