---
topic: career.behavioral
name: "Behavioral interviews"
subject: career
order: 1
prereqs: []
---

## career.behavioral.the-star-method
name: "The STAR method"
importance: must
scope: "situation, task, action, result"

### simple
STAR is a four-part shape for answering "tell me about a time" questions: the situation, your task, the actions you took and the result. It works like a good short film, with a quick setting, a clear goal, most of the screen time on what the main character does, and an ending you remember. Interviewers use what you did before to predict what you will do next, so one concrete story beats any general claim about yourself.

### interview
- **Situation**: one or two sentences on where and what was at stake. **Task**: your goal or responsibility. **Action**: what you did, step by step; this is most of the answer. **Result**: what changed, with a number if there is one, and what you learned.
- Say "I" for your part and name what others did honestly; the interviewer can only hire you.
- Choose actions that show judgment: why you chose that step, what you ruled out, how you checked it worked.
- End with a measured result, or concrete evidence when there is no number (who used it, what changed, what someone said).
- Aim for about two minutes, then stop and let the follow-ups come: what would you do differently, what did your manager say, how did you know it worked.
- Pitfalls: a long setup, "we" throughout, no result, a story where nothing was hard, blaming others, and inflating facts that a follow-up will expose.

### deep
#### Why a shape helps

Behavioral questions ask for evidence. Without a shape, answers drift into background and "we", and the time runs out before the result. STAR gives four slots in a fixed order, so you always reach the part being scored: what you did and what it changed.

#### A weak and a strong version, side by side

The question is "Tell me about a time you took ownership beyond your role." The story belongs to Kiran, a made-up final-year engineering student in India with two internships and a few projects; every person, company and number in these career articles is invented.

| Part | Weak version | Strong version |
|---|---|---|
| Situation | In my internship at a fintech company we had some issues with a reconciliation job. | On a fintech company's payments team, a nightly job matched our ledger against the bank's settlement file. It flagged about 40 mismatches a night, and an analyst spent the first hour of every morning checking them by hand. |
| Task | I had to help fix it. | My own project was a reporting dashboard, but the false alarms slowed the whole team. I asked my manager for two days to find the cause and promised to report back either way. |
| Action | We looked into the logs, found some problems with dates, fixed them and added tests. | I sampled 50 flagged pairs and saw that every false one was a payment made between midnight and 5:30 in the morning. The bank dated payments in Indian time and our ledger in UTC, so those payments landed on different days. I changed the job to compare both sides by the bank's business date, added tests for the minutes around midnight, and ran the new job beside the old one for a week before switching. |
| Result | After that it worked much better and the team was happy. | False mismatches fell from about 40 a night to 2, and both of those were real errors. The analyst got that hour back every morning, and the team now stores a timezone with every date field. I learned to look at the data before reading more code. |

#### What changed and why

- **The situation carries the stakes.** Forty false alarms and an hour of someone's morning make the rest worth hearing; company background does not.
- **The task shows ownership, not just effort.** The work wasn't assigned, and asking the manager first shows judgment. That is exactly what the question tests.
- **"I" replaced "we".** Kiran says what Kiran did and credits the analyst's role plainly.
- **Every action has a reason.** Sampling, spotting the pattern, running both jobs side by side: each step shows how Kiran thinks, and that is where follow-up questions dig.
- **The result is measured and outlasts the story.** A before and after, a change the team kept, and one sentence of learning.
- **Details make it believable.** "Between midnight and 5:30" is the kind of fact only someone who did the work remembers.

#### Delivering it

- Keep notes as a few bullets per part rather than a memorized script, so it sounds like you talking.
- Spend most of the time on Action. [Tell me about yourself](#/concept/career.behavioral.tell-me-about-yourself) shows how to time a spoken answer with a small program.
- Prepare for the follow-ups. "How did you know the fix was right?" is answered by the week of side-by-side runs; "What would you do differently?" by the lesson.
- When there is no number, give evidence you can describe: who used it, what stopped happening, what a reviewer said.

#### Common mistakes

- A long situation and no result.
- A story where you watched rather than acted, or where nothing was hard.
- Blaming people; describe the problem instead.
- Inventing or stretching facts. Interviewers probe details, and a story that falls apart costs more than a modest true one.
- One favourite story for every question. Build a [story bank](#/concept/career.behavioral.building-a-story-bank) so each question gets a fitting one.

Connects to: [building a story bank](#/concept/career.behavioral.building-a-story-bank), [company values questions](#/concept/career.behavioral.company-values-questions), [communicating in interviews](#/concept/dsa.problem-solving.communicating-in-interviews).

### questions
Q: What does each letter of STAR stand for, and where should most of the answer go?
A: Situation, task, action and result. Most of the time belongs to the actions you personally took, because that is the evidence the interviewer is scoring. Situation and task set the stakes in a few sentences, and the result closes with what changed.

Q: Why is saying "we" throughout an answer a problem?
A: The interviewer is deciding whether to hire you, not your team, and "we" hides what you actually did. Say "I" for your own actions and name others' contributions honestly, so your part is clear without taking credit for theirs.

Q: Your story has no numbers. How do you make the result convincing?
A: Give concrete evidence instead: who used the result, what stopped happening, what a reviewer or user said, or what the team changed afterwards. An approximate, honest number such as "about an hour a day" is also fine if you can explain where it comes from.

Q: What makes a STAR answer sound rehearsed, and how do you avoid it?
A: Reciting a memorized script word for word, with no pauses and no room for questions. Keep a few bullet notes per part, tell it in your own words each time, and stop after the result so the interviewer can steer with follow-ups.

Q: How long should a STAR answer be?
A: Around two minutes is a good target for the first telling. Longer answers lose the interviewer and crowd out follow-up questions, which are where the strongest evidence usually comes out.

## career.behavioral.tell-me-about-yourself
name: "Tell me about yourself"
importance: must
scope: "a 90-second story"

### simple
"Tell me about yourself" is an invitation to give a short trailer, not the full film of your life. In about ninety seconds you say who you are now, the two or three things you have done that matter for this role, and why this role is your next step. A good answer makes the interviewer's next question obvious.

### interview
- Structure: **present** (who you are and what you care about), **past** (two or three proof points with results, chosen for this role), **future** (why this role is the next step).
- Target about 90 seconds, which is about 210 words at a calm 140 words a minute; count the words and time yourself aloud.
- Pick proof points for the job: backend roles hear about correctness and systems, quant roles about probability, speed and markets.
- End by pointing at the role, which hands the interviewer a natural next question.
- Avoid: reciting the resume line by line, childhood and schooling, grades as the headline, a list of technologies, and a memorized monotone.
- Keep a shorter version (about 30 seconds) for screening calls and a longer one for when they ask you to go deeper.

### deep
#### What the question is asking

It is an opening: interviewers want a quick, relevant picture of you and a hint of what to ask next. Present, past, future keeps it relevant: who you are now, the evidence, where you are heading.

#### A timed script

Kiran, the made-up final-year student from [the STAR method](#/concept/career.behavioral.the-star-method), is applying for a backend role on a payments platform. Each part starts at the time in brackets:

**[0:00] Present.** I'm Kiran, a final-year computer science student graduating next year. I enjoy the kind of backend work where data has to be exactly right, like payments and logs, and I work mostly in C++ and SQL.

**[0:15] Past.** This summer I interned on the payments team of a fintech company. A nightly job that matched our ledger against the bank's file raised about forty false alarms every night, and an analyst spent the first hour of every morning checking them. I traced them to a timezone mismatch, fixed it with tests for the boundary minutes, and the alarms dropped to two, both real errors. The summer before, at a freight-tracking startup, I learned GPS map matching in a week so we could ship live arrival times for about two hundred trucks. On campus I run the programming club's annual contest, and last year it served over three hundred participants without the judge going down.

**[1:05] Future.** Next, I want a backend role where correctness matters, where I can own one piece of a system and learn from experienced engineers. That's why this role on your payments platform stands out to me: it is the same kind of problem at a much larger scale, and I'd love to learn how your team keeps it right.

The script is 210 words: 1:30 at a calm 140 words a minute (an assumed pace), 1:45 at 120 and 1:19 at 160. This program counts and times it:

```cpp
// Times a spoken script: words per part, when each part starts, and the total at three paces.
const vector<pair<string, string>> script = {
    {"Present",
     "I'm Kiran, a final-year computer science student graduating next year. I enjoy the "
     "kind of backend work where data has to be exactly right, like payments and logs, and I "
     "work mostly in C++ and SQL."},
    {"Past",
     "This summer I interned on the payments team of a fintech company. A nightly job that "
     "matched our ledger against the bank's file raised about forty false alarms every "
     "night, and an analyst spent the first hour of every morning checking them. I traced "
     "them to a timezone mismatch, fixed it with tests for the boundary minutes, and the "
     "alarms dropped to two, both real errors. The summer before, at a freight-tracking "
     "startup, I learned GPS map matching in a week so we could ship live arrival times for "
     "about two hundred trucks. On campus I run the programming club's annual contest, and "
     "last year it served over three hundred participants without the judge going down."},
    {"Future",
     "Next, I want a backend role where correctness matters, where I can own one piece of a "
     "system and learn from experienced engineers. That's why this role on your payments "
     "platform stands out to me: it is the same kind of problem at a much larger scale, and "
     "I'd love to learn how your team keeps it right."},
};

int countWords(const string& text) {
    istringstream in(text);
    return distance(istream_iterator<string>(in), istream_iterator<string>());
}

string clock(double seconds) {
    int s = int(lround(seconds));
    return to_string(s / 60) + ":" + (s % 60 < 10 ? "0" : "") + to_string(s % 60);
}

int main() {
    const double pace = 140;  // words per minute: a calm interview pace (an assumption)
    int total = 0;
    for (auto& [part, text] : script) {
        int n = countWords(text);
        printf("[%s] %-7s %3d words\n", clock(total * 60 / pace).c_str(), part.c_str(), n);
        total += n;
    }
    printf("total %d words: %s at %.0f wpm", total, clock(total * 60 / pace).c_str(), pace);
    for (double other : {120.0, 160.0})
        printf(", %s at %.0f", clock(total * 60 / other).c_str(), other);
    printf("\n");
}
```

Output:

```text
[0:00] Present  36 words
[0:15] Past    116 words
[1:05] Future   58 words
total 210 words: 1:30 at 140 wpm, 1:45 at 120, 1:19 at 160
```

#### Why it works

- The opening gives every later fact a frame: who Kiran is and what Kiran cares about.
- Three proof points, each with a result, all point one way: correctness and reliability.
- The ending names the role with a reason, so the likely next question leads into Kiran's best story.

#### A weak version

"I did my schooling in Pune and then joined engineering. My CGPA is 8.4. I know C++, SQL, Git and Linux, and I have done two internships. I am a hard worker and a quick learner." True, but forgettable: a resume read aloud, with claims and no evidence. The strong version shows the quick learning (map matching in a week) instead of claiming it.

#### Adapting it

- For a quant role, swap the proof points and the ending: Kiran would lead with a C++ order-book simulator and the contest.
- Time your own text with the program, then say it aloud; cut adjectives before facts.

Connects to: [the STAR method](#/concept/career.behavioral.the-star-method), [why this company and why this role](#/concept/career.behavioral.why-this-company-and-why-this-role), [project deep dives](#/concept/career.resume.project-deep-dives).

### questions
Q: What structure works for "tell me about yourself"?
A: Present, past, future. Say who you are now and what you care about, give two or three proof points from your past with results that fit this role, and finish with why this role is your next step.

Q: How long should the answer be, and how do you check?
A: About ninety seconds for the full version. Count the words and time yourself saying it aloud; at a calm pace of around 140 words a minute, ninety seconds is roughly 210 words.

Q: Why is reciting your resume a weak answer?
A: The interviewer already has the resume. A list of facts and adjectives gives no story and no evidence; choosing a few relevant results and a clear direction shows judgment and makes the next question obvious.

Q: How would you change the answer for a quant role instead of a backend role?
A: Keep the shape but choose different proof points: probability, mental math, trading games or low-latency C++ work, and an ending about why trading or quant development is the next step.

Q: What should the last sentence of your answer do?
A: Point at the role you are interviewing for and give a reason, so it hands the interviewer a natural follow-up question that leads into your strongest story.

## career.behavioral.building-a-story-bank
name: "Building a story bank"
importance: must
prereqs: [career.behavioral.the-star-method]
scope: "conflict, failure, leadership, ownership, deadline pressure, disagreement, learning fast, biggest achievement"

### simple
A story bank is a small set of true stories from your life, each prepared in STAR form and tagged with the themes it can show. It works like a chef's prepared ingredients: with six or seven good ones ready, you can cook whatever the interviewer orders. Because each story shows several themes, a handful covers almost every behavioral question.

### interview
- Pick six to eight stories from different places: internships, projects, clubs, hackathons, coursework, team sports or volunteering.
- Cover the common themes: conflict, failure, leadership, ownership, deadline pressure, disagreement, learning fast and your biggest achievement.
- Tag every story with all the themes it can show; one story often answers four or five different questions.
- Keep a backup for each theme so you never tell the same story twice in one interview.
- Write bullet notes per STAR part with the numbers, not full scripts; review them before each interview.
- Recent (the last two or three years), specific, and yours; a real failure beats a disguised strength.

### deep
#### Why a bank, not answers

Behavioral questions reuse a handful of themes. An answer per question is slow to prepare and sounds rehearsed; six to eight rich stories, each tagged with its themes, let you pick the one that fits and stress what the question asks.

#### Building it

1. List recent experiences that involved a problem, a decision or other people.
2. Keep those where you acted and something changed; write STAR bullets with numbers.
3. Tag each with every theme it can honestly show.
4. Check coverage against a real question list and fill the gaps.

#### Kiran's bank

Kiran's bank (made up) has six stories:

| Story | From | What happened | Themes |
|---|---|---|---|
| reconciliation | fintech internship | traced 40 nightly false alarms to a timezone mismatch | ownership, biggest achievement |
| late-eta | freight startup | a demo slipped three days after flagging a risk too late | failure, deadline pressure |
| map-matching | freight startup | learned GPS map matching in a week, chose a simple first version | learning fast |
| hackathon | college hackathon | talked the team out of a mid-event rewrite with a timed trial | disagreement, conflict, deadline pressure |
| contest-night | programming club | led five volunteers to run a contest without the judge crashing | leadership, deadline pressure |
| code-review | fintech internship | turned a blunt first code review into better habits | conflict, learning fast |

It also holds two prepared answers: the introduction and "why us".

#### Checking coverage

The program checks each entry against every question in the app's behavioral question bank (by id, with its suggested tags); an entry fits a question when they share a tag.

```cpp
// Kiran's story bank (made up) against the app's 30 behavioral questions.
struct Entry { string name, tags; };
const vector<Entry> bank = {
    {"reconciliation", "ownership achievement challenge customer-focus prioritization"},
    {"late-eta", "failure deadline mistake planning self-awareness"},
    {"map-matching", "learning challenge ambiguity decision-making simplification"},
    {"hackathon", "conflict influence teamwork pressure saying-no decision-making"},
    {"contest-night", "leadership helping-others process-improvement pressure teamwork"},
    {"code-review", "feedback learning self-awareness difficult-people conflict"},
    {"intro", "introduction motivation career-goals"},  // prepared answers, not stories
    {"why-us", "motivation career-goals planning"},
};
// Question ids and suggested tags, as in the app's question bank (behavioral.seed.ts).
const vector<Entry> questions = {
    {"bq-tell-me-about-yourself", "introduction motivation"},
    {"bq-why-this-company", "motivation career-goals"},
    {"bq-why-this-role", "motivation career-goals"},
    {"bq-tell-me-about-a-time-you-failed", "failure learning self-awareness"},
    {"bq-a-time-you-disagreed-with-a-teammate", "conflict teamwork influence"},
    {"bq-a-time-you-had-a-conflict-and-how-you-resolved-it",
     "conflict teamwork difficult-people"},
    {"bq-a-time-you-took-ownership-beyond-your-role", "ownership leadership"},
    {"bq-your-most-challenging-project", "challenge achievement ownership"},
    {"bq-a-time-you-learned-something-quickly", "learning challenge"},
    {"bq-a-time-you-missed-a-deadline", "deadline failure planning"},
    {"bq-a-time-you-received-critical-feedback", "feedback learning self-awareness"},
    {"bq-a-time-you-led-without-authority", "leadership influence teamwork"},
    {"bq-a-time-you-made-a-decision-with-incomplete-data", "decision-making ambiguity"},
    {"bq-a-time-you-simplified-something-complex", "simplification process-improvement"},
    {"bq-a-time-you-went-above-and-beyond-for-a-user", "customer-focus ownership"},
    {"bq-a-mistake-you-made-and-what-you-changed", "mistake learning self-awareness"},
    {"bq-a-time-you-had-to-prioritise-between-competing-tasks",
     "prioritization deadline planning"},
    {"bq-a-time-you-convinced-others-to-change-direction",
     "influence leadership decision-making"},
    {"bq-a-time-you-worked-under-pressure", "pressure deadline"},
    {"bq-the-project-youre-proudest-of", "achievement ownership"},
    {"bq-where-do-you-see-yourself-in-3-years", "career-goals motivation"},
    {"bq-what-are-your-strengths-and-weaknesses", "self-awareness learning"},
    {"bq-why-should-we-hire-you", "achievement motivation"},
    {"bq-a-time-you-helped-a-struggling-teammate", "helping-others teamwork"},
    {"bq-a-time-you-improved-a-process", "process-improvement ownership"},
    {"bq-a-time-you-handled-ambiguity", "ambiguity decision-making"},
    {"bq-a-time-you-dealt-with-a-difficult-person", "difficult-people conflict"},
    {"bq-a-time-you-had-to-say-no", "saying-no prioritization"},
    {"bq-what-would-you-do-in-your-first-90-days", "planning motivation"},
    {"bq-do-you-have-any-questions-for-us", "motivation planning"},
};

set<string> words(const string& s) {
    istringstream in(s);
    return {istream_iterator<string>(in), {}};
}

int main() {
    int n = bank.size(), q = questions.size();
    vector<unsigned> fits(q);  // bit e set: entry e shares a tag with question i
    for (int i = 0; i < q; ++i)
        for (int e = 0; e < n; ++e)
            for (auto& t : words(questions[i].tags))
                if (words(bank[e].tags).count(t)) fits[i] |= 1u << e;
    for (int e = 0; e < n; ++e) {
        int count = 0;
        for (unsigned f : fits) count += f >> e & 1;
        printf("%-15s fits %2d questions\n", bank[e].name.c_str(), count);
    }
    int single = 0;
    for (int i = 0; i < q; ++i) {
        if (popcount(fits[i]) > 1) continue;
        ++single;
        printf("only one fit: %s -> %s\n", questions[i].name.c_str(),
               fits[i] ? bank[countr_zero(fits[i])].name.c_str() : "NONE");
    }
    printf("%d of %d questions have at least two entries to choose from\n", q - single, q);
    unsigned best = (1u << n) - 1;  // smallest set of entries that still answers everything
    for (unsigned s = 0; s < 1u << n; ++s)
        if (popcount(s) < popcount(best) &&
            all_of(fits.begin(), fits.end(), [&](unsigned f) { return f & s; }))
            best = s;
    printf("smallest set answering all %d:", q);
    for (int e = 0; e < n; ++e)
        if (best >> e & 1) printf(" %s", bank[e].name.c_str());
    printf(" (%d entries)\n", popcount(best));
}
```

Output:

```text
reconciliation  fits  9 questions
late-eta        fits  9 questions
map-matching    fits 10 questions
hackathon       fits 10 questions
contest-night   fits  9 questions
code-review     fits  8 questions
intro           fits  7 questions
why-us          fits  9 questions
only one fit: bq-a-time-you-went-above-and-beyond-for-a-user -> reconciliation
only one fit: bq-the-project-youre-proudest-of -> reconciliation
28 of 30 questions have at least two entries to choose from
smallest set answering all 30: reconciliation map-matching hackathon why-us (4 entries)
```

#### Reading the result

- Every question has a fit, and 28 of the 30 have at least two choices, so Kiran can avoid repeating a story within one interview.
- The two single-fit questions both lean on reconciliation: "went above and beyond for a user" and "proudest project". The gap is a second achievement story. Kiran's campus bus tracker, which students use every week, is the natural candidate.
- Four entries touch all 30 questions, but one shared tag is a loose fit; the other stories give better fits and backups.

Connects to: [the STAR method](#/concept/career.behavioral.the-star-method), [company values questions](#/concept/career.behavioral.company-values-questions), [tell me about yourself](#/concept/career.behavioral.tell-me-about-yourself).

### questions
Q: How many stories should a story bank have, and why not one per question?
A: Six to eight rich stories are usually enough, because each one shows several themes. One answer per question is slow to prepare, sounds rehearsed and leaves you stuck when a question is phrased differently.

Q: Why keep a backup story for each theme?
A: Interviews often ask two questions from the same area, such as a conflict and a disagreement. A backup lets you answer both without repeating a story, which would suggest you have only one example.

Q: What makes a good failure story?
A: A real failure where you had a part, told without blaming others, with what you did to recover and a specific change you made afterwards, ideally with evidence the change stuck. A strength disguised as a weakness is spotted quickly.

Q: How do you check that your bank covers the common questions?
A: Tag each story with every theme it can show, then go through a real question list and note which stories fit each question. Questions with no fit, or only one, show where to add a story.

Q: Where can stories come from if you have little work experience?
A: Projects, hackathons, clubs, teaching assistant work, sports teams, volunteering and difficult coursework all count, as long as you acted, made decisions and can say what changed.

## career.behavioral.why-this-company-and-why-this-role
name: "Why this company and why this role"
importance: must
scope: "Why this company and why this role"

### simple
"Why us?" tests whether you chose this company on purpose or just applied everywhere. A strong answer connects three things: something specific about the company, what you have already done that fits the work, and what you want to learn there. It is like explaining why you picked one particular course at college rather than saying "it's a good college".

### interview
- Three parts: what specifically draws you (product, engineering problems, how they work), the evidence that you fit (a story or project), and what you want to learn or contribute.
- Research from public sources: use the product, read the job description line by line, the engineering blog and public talks, recent news, and conversations with alumni or employees.
- "Why this role" is about the work itself: backend, infrastructure, quant developer or trader; match it to what you have enjoyed and done.
- Keep it under a minute; one or two specifics beat a list of compliments.
- Avoid pay, prestige, "great culture" with no example, "any role is fine", and facts that are really about a different company.
- Related questions: "Where do you see yourself in three years?" and "Why should we hire you?" reuse the same research and stories.

### deep
#### What the question tests

Interviewers want three things: that you know what the company actually does, that you understand what the role involves, and that there is a real reason you would do well and stay. Generic praise fails all three. Specifics pass them, and specifics come only from research.

#### Research that produces specifics

- **Use the product** if you can. Note one thing you liked and one question it raised.
- **Read the job description** as a checklist. For each requirement, find a line of evidence from your stories or projects.
- **Read what engineers publish**: blog posts, conference talks, open source repositories. They tell you the real problems.
- **Talk to people**: alumni or employees you can reach politely. Ask what surprised them after joining.
- **For trading firms**, learn from public material whether they mainly make markets or take positions, which markets they are known for, and what the role does day to day. Never repeat rumours as facts.

Write down three specifics and the story that matches each. You will use them again for questions to the interviewer.

#### Weak and strong, side by side

Kiran is applying to a made-up mid-size company that builds payment reconciliation software for banks.

| | Weak | Strong |
|---|---|---|
| Why the company | You are a leading company with a great culture and a lot of growth. | I read your engineering post on matching payments that arrive days apart, and it described almost exactly the timezone bug I fixed in my internship, except at your scale. |
| Why the role | I want to work on backend and learn new technologies. | The role is on the matching engine, where one wrong date means a false alarm for a bank's operations team. That is the part of backend work I enjoy: making data exactly right. |
| What you bring | I am hardworking and a quick learner. | I have debugged this class of problem in production, and I write tests for the boundary cases first. I'd like to learn how you keep matching correct when the volume is far larger than anything I've seen. |

What changed and why:

- **A specific source replaced a compliment.** Any company can be "leading"; only this one wrote that post.
- **The role is described as work, not a title.** Naming the matching engine and its failure mode shows Kiran understands what the job is.
- **Evidence replaced adjectives.** "Hardworking" is a claim; the timezone fix is proof, and it invites a follow-up that leads to Kiran's best story.
- **It ends with learning that serves them.** Wanting to learn how they handle scale is specific and flattering without being empty.

#### Why this role, for different tracks

- **Backend or infrastructure**: the systems you like building, with a project that shows it.
- **Quant developer**: C++, performance and correctness under time pressure; point to low-latency or simulation work.
- **Quant trader or researcher**: decisions under uncertainty, probability and games; point to contests, puzzles or a trading game you played well.

#### Where do you see yourself in three years?

Answer about growth in the work, not titles: "owning a component end to end, and mentoring the next interns". Connect it to this company's path so staying is plausible.

#### Mistakes to avoid

- Leading with pay, brand or location.
- Facts that are wrong or belong to a competitor; check every claim.
- A memorized paragraph with no link to your experience.
- Criticising your current or past company.

Connects to: [tell me about yourself](#/concept/career.behavioral.tell-me-about-yourself), [questions to ask the interviewer](#/concept/career.behavioral.questions-to-ask-the-interviewer), [company values questions](#/concept/career.behavioral.company-values-questions).

### questions
Q: What are the three parts of a strong answer to "Why this company"?
A: Something specific about the company that draws you, evidence from your own experience that you fit the work, and what you want to learn or contribute there. Each part should be concrete enough that it could not be said about any other company.

Q: Where do you find specifics about a company?
A: Use the product, read the job description line by line, read the engineering blog and public talks, follow recent news, and talk to alumni or employees. Write down a few specifics and the story that matches each.

Q: Why is "you have a great culture" a weak answer?
A: It is a compliment with no evidence and could be said about anyone. If culture matters to you, name what you learned about it and where, such as how code reviews work according to an engineer you spoke with.

Q: How does "why this role" differ from "why this company"?
A: Why this company is about the organization and its problems; why this role is about the work you would do every day. Describe the work in concrete terms and connect it to what you have enjoyed and done before.

Q: How would you answer "Where do you see yourself in three years"?
A: Describe growth in the work itself, such as owning a component end to end and mentoring newer engineers, and connect it to the path this company offers. Avoid titles and plans that suggest you will leave soon.

## career.behavioral.company-values-questions
name: "Company values questions"
importance: important
prereqs: [career.behavioral.building-a-story-bank]
scope: "mapping stories to values"

### simple
Many companies publish a short list of values, and their behavioral questions are built from that list. If you know the values, you can predict the questions and pick a story from your bank for each one. It is like knowing which chapters an exam covers before you revise.

### interview
- Find the values on the careers page or in public talks and posts, and turn each into the questions it suggests.
- Map one story to each value, a different story for each, plus a backup; values questions often come several per round.
- Tell the story with the value's emphasis: an ownership value wants to hear what you did when it went wrong, not only when it went right.
- Show the value through actions; never recite the value back or claim it ("I am very customer obsessed").
- Be honest: if a value doesn't fit you, a genuine story about learning it is better than a forced match.

### deep
#### Values become questions

A company that lists "Own the whole problem" will ask about a time you owned a mistake, went past your role, or followed a problem to its root. Once you see that, preparing for values rounds is the same work as [building a story bank](#/concept/career.behavioral.building-a-story-bank): each value is a theme, and you need a story for each.

Take a made-up company with five values:

| Value | Questions it suggests |
|---|---|
| Start with the user | A time you went out of your way for a user; a time you changed a plan after user feedback. |
| Own the whole problem | A time something you owned went wrong; a time you fixed a problem that wasn't yours. |
| Say it plainly | A time you disagreed with someone senior; a time you gave or received hard feedback. |
| Keep it simple | A time you simplified something complex; a time you chose the simpler option on purpose. |
| Lift the people around you | A time you helped a teammate; a time you led without authority. |

#### Matching stories to values

Each value should get a different story, so one round never hears the same story twice. With six stories and five values there are 720 ways to assign them; the program tries every one, keeps the best total fit (shared tags between a story and a value), and names a backup for each value in case the interviewer asks for a second example.

```cpp
// Matches stories to a made-up company's values: one different story per value, best total fit.
struct Item { string name, tags; };
const vector<Item> stories = {
    {"reconciliation", "ownership achievement challenge customer-focus prioritization"},
    {"late-eta", "failure deadline mistake planning self-awareness"},
    {"map-matching", "learning challenge ambiguity decision-making simplification"},
    {"hackathon", "conflict influence teamwork pressure saying-no decision-making"},
    {"contest-night", "leadership helping-others process-improvement pressure teamwork"},
    {"code-review", "feedback learning self-awareness difficult-people conflict"},
};
const vector<Item> values = {
    {"Start with the user", "customer-focus ownership simplification"},
    {"Own the whole problem", "ownership mistake failure"},
    {"Say it plainly", "feedback conflict influence"},
    {"Keep it simple", "simplification process-improvement decision-making"},
    {"Lift the people around you", "helping-others teamwork feedback leadership"},
};

int fit(const Item& a, const Item& b) {  // number of shared tags
    istringstream x(a.tags);
    set<string> mine{istream_iterator<string>(x), {}};
    istringstream y(b.tags);
    return count_if(istream_iterator<string>(y), {}, [&](auto& t) { return mine.count(t); });
}

int main() {
    int n = stories.size(), best = -1, tried = 0;
    vector<int> order(n), pick;  // try every way to give each value a different story
    iota(order.begin(), order.end(), 0);
    do {
        int total = 0;
        ++tried;
        for (size_t v = 0; v < values.size(); ++v) total += fit(stories[order[v]], values[v]);
        if (total > best) best = total, pick.assign(order.begin(), order.begin() + values.size());
    } while (next_permutation(order.begin(), order.end()));
    printf("%d orders tried, best total fit %d\n", tried, best);
    for (size_t v = 0; v < values.size(); ++v) {
        int backup = -1;  // the best other story, if they ask for a second example
        for (int s = 0; s < n; ++s)
            if (s != pick[v] && (backup < 0 || fit(stories[s], values[v]) >
                                                   fit(stories[backup], values[v])))
                backup = s;
        printf("%-27s %-14s (fit %d)  backup %-14s (fit %d)\n", values[v].name.c_str(),
               stories[pick[v]].name.c_str(), fit(stories[pick[v]], values[v]),
               stories[backup].name.c_str(), fit(stories[backup], values[v]));
    }
}
```

Output:

```text
720 orders tried, best total fit 11
Start with the user         reconciliation (fit 2)  backup map-matching   (fit 1)
Own the whole problem       late-eta       (fit 2)  backup reconciliation (fit 1)
Say it plainly              hackathon      (fit 2)  backup code-review    (fit 2)
Keep it simple              map-matching   (fit 2)  backup hackathon      (fit 1)
Lift the people around you  contest-night  (fit 3)  backup hackathon      (fit 1)
```

"Say it plainly" has two equally good stories, so Kiran can use hackathon for disagreement questions and code-review for feedback questions. "Own the whole problem" gets the failure story, not the proud one: that is how ownership values are usually probed.

#### Weak and strong, side by side

The question: "Tell me about a time something you owned went wrong." Kiran's late-eta story, told two ways:

| Part | Weak version | Strong version |
|---|---|---|
| Situation | At my internship I was building a feature for tracking trucks. | At a freight-tracking startup I owned the live arrival-time screen for about 200 trucks, due at a Friday demo with two customers watching. |
| Task | I had a deadline for the demo. | I had estimated three days and committed to Friday myself, so the date was as much mine as the code. |
| Action | It turned out harder than expected because the GPS data was messy, and the backend team was slow to give me the API, so it got delayed. | By Wednesday I knew snapping noisy GPS points to roads would take longer, but I hoped to catch up and told my lead only on Thursday evening, too late to change the demo plan. I apologised, proposed showing raw positions on Friday and arrival times on Monday, and finished the map matching with tests on a day of replayed data. |
| Result | We showed it the next week and it worked well. I learned that estimates are hard. | Arrival times went live three days late. Since then I split work into slices with a check at the halfway point and raise a risk the day I see it. My next two features there shipped on the dates I gave. |

What changed and why:

- **The failure is Kiran's, not the data's or another team's.** The real mistake was telling the lead late; the strong version says so plainly.
- **Recovery is part of the story.** Proposing a smaller Friday demo shows ownership after the mistake, which is what the value is about.
- **The lesson is a behavior with evidence.** "Estimates are hard" is a shrug; slicing work, flagging early and two on-time features are a change you can check.
- **No blame, no drama.** The weak version quietly blames the backend team; interviewers notice.

#### Mistakes to avoid

- Reciting the values or using their exact words as adjectives about yourself.
- Forcing one favourite story onto every value.
- Picking stories where the value was easy; values show most clearly under pressure or after a mistake.

Connects to: [the STAR method](#/concept/career.behavioral.the-star-method), [why this company and why this role](#/concept/career.behavioral.why-this-company-and-why-this-role).

### questions
Q: How do you prepare for an interview at a company that publishes its values?
A: Turn each value into the questions it suggests, then map a different story from your bank to each value, with a backup. Practise telling each story with that value's emphasis.

Q: Why use a different story for each value?
A: A values round often asks several questions, and repeating a story suggests you have only one example. Different stories also show the value in different settings, which is stronger evidence.

Q: An ownership value is usually probed with what kind of question?
A: Often a failure or mistake question: something you owned that went wrong, what you did about it and what you changed. Owning the outcome when it went badly shows the value more clearly than a success.

Q: What is wrong with saying "I am very customer focused" in a values answer?
A: It is a claim, not evidence, and it echoes the company's own words. Tell a story where your actions for a user show the value and let the interviewer draw the conclusion.

Q: What should you do if one of the company's values does not fit you well?
A: Don't force a match. Tell a genuine story about a time you learned or grew in that direction, or pick the value you truly share and show it well; honesty holds up under follow-up questions.

## career.behavioral.questions-to-ask-the-interviewer
name: "Questions to ask the interviewer"
importance: important
scope: "Questions to ask the interviewer"

### simple
The questions you ask at the end are the last impression you leave and your one chance to learn what the job is really like. Good questions are specific to the person in front of you and the work you would do. It is like test-driving a car: you check the things that matter to you, not the colour of the brochure.

### interview
- Prepare three to five questions per round, matched to the interviewer: engineers on daily work and reviews, managers on expectations and growth, recruiters on process and timelines.
- Ask about real work: what the team shipped recently, what a new graduate's first months look like, how success is judged.
- Use your research: a question that builds on their blog post or product shows interest better than any statement.
- Avoid: things answered on the website, pay and leave in a technical round, "Did I pass?", and questions that sound like complaints.
- Listen and follow up once; write the answers down, because they feed your decision between offers.

### deep
#### Why the questions matter

"Do you have any questions for us?" is still part of the interview. Interviewers remember whether you were curious about the work, and a thoughtful question can end a round on a strong note. It is also your best source of information: you will spend years in this job, and the people interviewing you know what it is like.

#### Questions by interviewer

**An engineer on the team**
- What did your team ship in the last month, and what was the hardest part?
- How does code review work here, and how long does a typical change take to reach production?
- What do you wish you had known in your first month?

**The hiring manager**
- What would a new graduate need to do in the first six months for you to call it a success?
- What is the team's biggest challenge this year?
- How do people here get feedback, and how often?

**A recruiter or HR partner**
- What are the next steps, and when should I expect to hear back?
- How are new graduates matched to teams?

**At a trading firm**
- How do new traders or developers learn in their first year: classes, mentors, simulations?
- How closely do traders and developers work together day to day?
- What does a good first year look like for someone in this role?

#### Weak and stronger questions

| Weak | Stronger | Why |
|---|---|---|
| What does your company do? | Your post on matching delayed payments mentioned retries; how did that change on-call for the team? | Uses research instead of asking for it. |
| What is the work culture like? | When someone disagrees with a design decision, what usually happens next? | Asks for behavior, not a slogan. |
| Did I do well? | Is there anything in my background you'd like me to say more about? | Invites a concern you can still answer. |
| How many leaves do I get? | (Ask the recruiter after an offer.) | Right question, wrong round. |

#### Using the answers

Write a line after each round: what you learned and how you felt about it. Vague answers to "how do new graduates learn?" or "how is success judged?" are information too. These notes are what you score when [choosing between offers](#/concept/career.offers.choosing-between-offers).

#### Mistakes to avoid

- Having no questions, which reads as low interest.
- Asking five questions when two minutes remain; pick the best one.
- Arguing with an answer. Ask a follow-up instead.

Connects to: [why this company and why this role](#/concept/career.behavioral.why-this-company-and-why-this-role), [choosing between offers](#/concept/career.offers.choosing-between-offers).

### questions
Q: Why should you always have questions for the interviewer?
A: Having none suggests low interest, and the questions are part of the impression you leave. They are also your best chance to learn what the job and team are really like before you decide.

Q: How should your questions differ between an engineer and a hiring manager?
A: Ask an engineer about daily work, code review and what they shipped recently. Ask a manager about expectations for the first months, how success is judged and the team's biggest challenge.

Q: Why is asking about pay in a technical round a mistake?
A: It is the wrong audience and the wrong moment: the engineer usually cannot answer, and it shifts attention from the work. Ask the recruiter once you have an offer, when negotiation is expected.

Q: What makes a question to the interviewer strong?
A: It is specific, shows you did research, asks about behavior rather than slogans, and gives you information you will actually use to decide. A good follow-up to their answer is even better.

Q: What should you do with the answers you get?
A: Write them down after the round with your impressions. They become the evidence you score when comparing offers on learning, team and growth.
