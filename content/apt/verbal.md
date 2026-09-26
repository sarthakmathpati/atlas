---
topic: apt.verbal
name: "Verbal ability"
subject: apt
order: 3
prereqs: []
---

## apt.verbal.reading-comprehension
name: "Reading comprehension"
importance: advanced
scope: "Reading comprehension"

### simple
Reading comprehension gives you a short passage and asks what it says, what it implies and how the author feels about it. The answers are always in the passage, not in what you already know about the topic. Think of it as being a careful witness: you report what you read, not what you believe.

### interview
- **Read for structure first**: the main claim, the support, any objection and the reply, and the author's tone. One line of notes per paragraph is enough.
- **Question types**: main idea, detail, inference, vocabulary in context, tone or attitude, the author's purpose, and "which would strengthen or weaken the argument".
- **Answer from the text**: the right option is supported by specific lines; an option that is true in the world but not in the passage is wrong.
- **Classic distractors**: too broad or too narrow for a main-idea question, extreme words (always, never, only), a reversed cause and effect, and details from the wrong paragraph.
- **Inference** means what must be true given the passage, a small step, not a creative leap.
- **Time**: a passage of 300 to 450 words with four or five questions usually needs about six to eight minutes; read once, well, rather than twice quickly.

### deep
#### Intuition

Every passage is an argument or an explanation with a shape. If you know the shape (claim, reasons, objection, reply), most questions become "which paragraph does this come from?", and you can check options against those lines instead of against memory.

#### A passage (original)

> When a service fails, the first instinct in many teams is to ask who made the mistake. The question feels natural, and it is almost always the wrong one. A person who fears blame learns to report less: the near miss goes unmentioned, the confusing dashboard is quietly worked around, and the next failure arrives with less warning than the last.
>
> Blameless reviews start from a different assumption: that the people involved acted reasonably given what they knew at the time. The review asks what they knew, what they could not see, and what made the risky action look safe. The answers usually point to the system rather than the person: an alert that fired too late, a script that did two things when its name promised one, a deadline that made a shortcut attractive.
>
> Critics say this lets careless people off the hook. It does not have to. Blamelessness is not the absence of accountability; it moves accountability from punishment to repair. The engineer who ran the script is often the best person to rewrite it, and the team that owns the dashboard can be asked to fix it by a date. What changes is the purpose of the meeting: to learn enough to make the next failure less likely, rather than to find someone to carry this one.

Structure: paragraph 1, the problem with blame; paragraph 2, what blameless reviews do; paragraph 3, an objection and the reply.

#### Questions and why the answers are right

1. **Main idea.** (a) Blameless reviews help teams learn by looking at systems and repairs instead of punishment. (b) Engineers should never be held responsible for outages. (c) Most failures are caused by poor dashboards. (d) Teams should hold fewer meetings after failures.
   **(a).** (b) is extreme and contradicted by paragraph 3, which keeps accountability. (c) takes one example as the whole point. (d) is never said.
2. **Inference.** What does the author suggest about teams where people fear blame? (a) They have fewer failures. (b) They hear about fewer near misses. (c) They fire people more often. (d) They write better scripts.
   **(b)**, from "the near miss goes unmentioned". (a) reverses the passage's point; (c) and (d) are not supported.
3. **Vocabulary in context.** "to find someone to carry this one" means: (a) to move the failed system; (b) to take the blame for this failure; (c) to support a colleague; (d) to repeat the failure.
   **(b)**: "this one" is the failure, and carrying it is bearing responsibility, in contrast with learning.
4. **Tone towards the critics.** (a) dismissive; (b) respectful but in disagreement; (c) in full agreement; (d) neutral, with no view.
   **(b)**: the author states the objection fairly ("Critics say…") and answers it with a reason, without mocking it.
5. **Weaken.** Which finding would most weaken the argument? (a) Blameless reviews take longer to run. (b) After adopting blameless reviews, teams reported no more near misses than before. (c) Some engineers prefer written reviews. (d) Dashboards are hard to design.
   **(b)**: the argument rests on fear of blame suppressing reports, and (b) says removing blame didn't increase them. The others don't touch the reasoning.

#### Distractor patterns

| pattern | what it looks like here |
|---|---|
| too extreme | "never held responsible" |
| too narrow | "caused by dashboards" |
| reversed | "fewer failures" for fearful teams |
| outside the passage | "hold fewer meetings" |
| true but irrelevant | "reviews take longer" for a weaken question |

#### Habits that help

- Before reading the options, answer the question in your own words from the passage.
- For "EXCEPT" questions, find the three options the passage supports; the odd one out is the answer.
- For tone, look for evaluative words (fairly, rightly, naively) and for whether objections are answered or waved away.
- If two options both look right, one of them usually goes a step beyond the text; choose the one that needs fewer assumptions.

Connects to: [grammar and sentence correction](#/concept/apt.verbal.grammar-and-sentence-correction), [syllogisms](#/concept/apt.logical.syllogisms), [discussing trade-offs](#/concept/sysd.method.discussing-trade-offs).

### questions
Q: How should you approach a reading comprehension passage under time pressure?
A: Read it once for structure: the main claim, the reasons, any objection and the reply, and the tone. Note each paragraph's job in a few words, then answer questions by going back to the relevant lines rather than relying on memory.

Q: What makes an inference answer correct?
A: It must follow from the passage with little or no extra assumption. Options that go well beyond the text, add facts from outside it or reverse a stated relation are wrong even if they sound plausible.

Q: How do you spot a wrong main-idea option?
A: It is too narrow (one example or detail), too broad or extreme (always, never), or about something the passage doesn't discuss. The right option covers every paragraph's role.

Q: How do you answer "which would most weaken the argument"?
A: Find the link the argument depends on, such as "fear of blame suppresses reports", and choose the option that breaks that link. Options that are merely negative about the topic but don't touch the reasoning are distractors.

Q: How do you judge an author's tone?
A: Look at evaluative words and at how opposing views are treated. An author who states an objection fairly and answers it with reasons is respectful but in disagreement, not dismissive.

## apt.verbal.grammar-and-sentence-correction
name: "Grammar and sentence correction"
importance: advanced
scope: "Grammar and sentence correction"

### simple
Sentence correction questions give you a sentence with a possible error and ask you to find or fix it. Most errors come from a short list: a verb that doesn't match its subject, a pronoun in the wrong form, a describing phrase attached to the wrong noun, or a list whose parts don't match. It is like proofreading code for a handful of common bugs before looking for rare ones.

### interview
- **Find the real subject**: in "the list of open issues is long", the verb agrees with "list"; phrases like "along with" and "as well as" don't change the subject.
- **Either/or, neither/nor**: the verb agrees with the nearer subject.
- **Pronoun case**: "between you and me", "sent to Priya and me"; drop the other person to test ("sent to me").
- **Modifiers** must sit next to what they describe: "Running late, I missed the bus", not "Running late, the bus left".
- **Parallelism**: items in a list or comparison take the same form: "writing, reviewing and testing".
- **Tense sequence**: the earlier of two past events takes the past perfect ("had already ended").
- **Rule or style?** Split infinitives, ending with a preposition and singular "they" are matters of style, not errors; tests may still have a preference.

### deep
#### Intuition

Grammar tests check agreement (subjects and verbs, pronouns and nouns), structure (modifiers, parallel lists, comparisons) and a few usage conventions. Read the sentence, strip it to its skeleton (subject, verb, object), and most errors show up. Then check the conventions a test cares about, knowing which are real rules and which are preferences.

#### Rules, with original examples

| error | fixed | the rule |
|---|---|---|
| The list of open issues **are** long. | The list of open issues **is** long. | The verb agrees with the head noun "list", not the nearest noun. |
| The manager, along with two engineers, **were** on the call. | … **was** on the call. | "Along with" and "as well as" add a parenthetical phrase, not a second subject. |
| Neither the tests nor the build script **were** changed. | … **was** changed. | With either/or and neither/nor, the verb agrees with the nearer subject. Putting the plural last reads better. |
| The results surprised Priya and **I**. | … Priya and **me**. | Objects take the object form; test by dropping "Priya and". |
| Running late, **the bus left** without me. | Running late, **I watched** the bus leave without me. | An opening phrase describes the subject that follows it (a dangling modifier otherwise). |
| The job involves writing code, **to review designs** and **meetings with clients**. | … writing code, **reviewing** designs and **meeting** clients. | Parallel items share one grammatical form. |
| By the time we arrived, the meeting **already ended**. | … **had already ended**. | The earlier of two past events takes the past perfect. |
| The new server's latency is lower than **the old server**. | … than **the old server's** (or **that of** the old server). | Compare like with like: latency with latency. |
| The team changed **it's** schedule. | … **its** schedule. | "It's" means "it is"; the possessive has no apostrophe. |
| He waited for **a** hour. | … **an** hour. | "A" or "an" follows the sound: an hour, a user. |
| The number of failed builds **have** doubled. | … **has** doubled. | "The number of" is singular; "a number of" is plural. |

#### Usage and style (not grammatical errors)

These are conventions; say so if asked, and follow the test's expected answer.

| point | status |
|---|---|
| **fewer** bugs, **less** time | Traditional formal usage: "fewer" with countable nouns. "Less" with plurals is common in speech; tests expect "fewer". |
| the candidate **whom** we interviewed | Formal usage for objects. "Who" is widely accepted in everyday English. |
| Each candidate should bring **their** laptop. | Style, and it varies. Singular "they" is accepted by major style guides; some tests still expect "his or her". |
| to **quickly check** the logs | A split infinitive is style, not an error. |
| Which file are you looking **at**? | Ending with a preposition is not an error. |
| **revert back**, **return back** | Redundant; tests usually mark it wrong, though meaning is clear. |
| The team **is** or **are** | American English usually treats a collective noun as singular; British English allows plural when members act separately. |

#### A method for each question

1. Find the subject and main verb of every clause; check agreement.
2. Check every pronoun: which noun does it refer to, and is its form (I or me, who or whom) right for its job?
3. Check that opening phrases describe the subject right after the comma.
4. Check lists and comparisons for matching forms.
5. Only then look at word choice and style.

#### Practice

Find and fix the error, then name the rule.

1. The number of failed builds have doubled this month.
2. Having reviewed the logs, the cause of the outage was clear.
3. Either the interns or the manager are presenting today.
4. She enjoys debugging more than to write documentation.
5. This laptop's battery lasts longer than my old laptop.
6. The report was sent to the manager and I.
7. We had less complaints this quarter.

Answers: (1) **has**: "the number of" is singular. (2) "…, **we found** the cause of the outage": a dangling modifier. (3) **is** presenting: the nearer subject is "the manager". (4) more than **writing** documentation: parallel forms. (5) than **my old laptop's**: compare battery with battery. (6) the manager and **me**: object case. (7) **fewer** complaints: countable noun (a usage convention tests enforce).

Connects to: [reading comprehension](#/concept/apt.verbal.reading-comprehension), [documentation](#/concept/eng.practice.documentation), [clean code](#/concept/eng.practice.clean-code) (clear naming is clear writing).

### questions
Q: Which is correct: "The list of issues are long" or "The list of issues is long"?
A: "Is". The subject is "list", which is singular; "of issues" only describes it. Always find the head noun before choosing the verb.

Q: With "neither the tests nor the script", should the verb be singular or plural?
A: It agrees with the nearer subject, "the script", so singular: "neither the tests nor the script was changed". Reordering to put the plural last ("nor the tests were") reads more naturally.

Q: What is wrong with "Running late, the bus left without me"?
A: The opening phrase must describe the subject that follows it, but the bus wasn't running late. Fix it by making the subject the person: "Running late, I watched the bus leave without me", or "Because I was running late, I missed the bus".

Q: Is ending a sentence with a preposition a grammatical error?
A: No, it is a style preference from older usage guides. "Which file are you looking at?" is correct English; rewriting it as "at which file are you looking" is more formal, not more correct.

Q: Why is "the new server's latency is lower than the old server" wrong?
A: It compares a latency with a server. Compare like with like: "lower than the old server's" or "lower than that of the old server".
