# Phase 9 research: color, focus and ADHD

This is the evidence behind the Phase 9 plan (BUILD_SPEC.md section 12.10, F31 and F32). It was
gathered in a planning session after Phase 8 (27 September 2026) at the owner's request: "do a scientific study of
which colors suit long study sessions, what can help focus, and what helps students with ADHD".
The mockups that go with it are in [`phase9-plan.html`](phase9-plan.html) (open it in a
browser). Where the mockups and BUILD_SPEC.md differ, the spec wins.

Evidence levels used below:

- **Strong**: replicated findings or meta-analyses.
- **Moderate**: several studies, or one meta-analysis with limits.
- **Mixed**: studies disagree.
- **Emerging**: one or a few small studies.
- **No effect**: tested, and the claimed effect was not found.

Design rule that follows from all of it: popular advice about color and focus is often stronger
than the evidence. Features built on weaker evidence must be cheap, optional, or both, and the
interface never promises an effect the research does not support.

## 1. Color, reading and long sessions

| Finding                                                                                                                                                                  | Evidence                | Source                                                      | What it means for Atlas                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Dark text on a light background is read more accurately than light on dark by people with normal vision; the brighter screen narrows the pupil and sharpens the image.   | Strong                  | Piepenbrock, Mayr and Buchner 2013, 2014                    | Day is the reading default: off-white paper, near-black ink, never pure black on pure white.                          |
| Dark mode and eye fatigue: studies disagree; many students prefer dark in dim rooms; bright text on black smears for people with astigmatism (halation).                 | Mixed                   | Tablet study 2025 (IJERPH); Nielsen Norman Group review     | Keep a dark theme (Night), made of warm off-white text on charcoal, not white on saturated navy.                      |
| A screen much brighter than the room is uncomfortable; comfort depends on matching screen and surroundings.                                                              | Moderate                | Screen brightness and ambient light studies                 | A dim, warm Dusk theme for evenings, switchable by the clock.                                                         |
| Bright screens late in the evening delay sleep and next-morning alertness. A warm tint alone (Night Shift) did not improve sleep in 18 to 24 year olds.                  | Strong (tint: Moderate) | Chang et al. 2015 (PNAS); Jensen et al. 2021 (Sleep Health) | Dusk is for comfort and promises nothing about sleep. An optional wrap-up note before bedtime does more.              |
| Pleasant warm colors and round shapes raise positive emotion and slightly improve learning (retention g ≈ 0.35, transfer g ≈ 0.27); larger effects for younger learners. | Moderate                | Plass et al. 2014; Brom et al. 2018; Wong and Adesope 2021  | Warmer neutrals, rounder shapes, friendly drawings on the screens around learning. No mascot (the owner is an adult). |
| Interesting but irrelevant extras inside learning material lower recall and transfer (g ≈ −0.33).                                                                        | Strong                  | Rey 2012; Sundararajan and Adesope 2020                     | Lessons, code and drills stay plain. Decoration never goes inside a lesson.                                           |
| Heavily decorated rooms: more time off task (39% vs 28%) and smaller learning gains (young children).                                                                    | Moderate                | Fisher, Godwin and Seltman 2014                             | One focal point per screen, fewer boxes and badges.                                                                   |
| Beautiful interfaces are judged easier to use, even after use.                                                                                                           | Moderate                | Tractinsky, Katz and Ikar 2000                              | For an app used daily for months, looks are part of usability.                                                        |
| People prefer curved shapes; sharp angles read as slightly threatening.                                                                                                  | Moderate                | Bar and Neta 2006                                           | Rounder cards, pill buttons, rings for progress.                                                                      |
| Color helps memory when it carries meaning, not as decoration.                                                                                                           | Moderate                | Dzulkifli and Mustafar 2013 (review)                        | One color per subject, used everywhere the subject appears.                                                           |
| "Red lowers test scores" (Elliot 2007) did not replicate; after correcting for publication bias no effect remained.                                                      | No effect               | Gnambs 2020 (meta-analysis, 67 effect sizes)                | No color is banned on superstition; wrong answers still avoid alarm red, for emotional reasons.                       |
| Larger text (18 px and up) improved readability and comprehension; about 55 characters per line read best.                                                               | Strong                  | Rello, Pielot and Marcos 2016; Dyson and Haselgrove 2001    | Reading view at 17 to 18 px, line height 1.6, 60 to 70 characters.                                                    |
| A 40-second look at greenery improved attention in one study; meta-analyses find weak effects on attention, better on working memory.                                    | Mixed                   | Lee et al. 2015; Stevenson et al. 2018                      | Optional nature-like scene on focus breaks.                                                                           |
| Mid-complexity natural patterns (like terrain) are preferred and linked with lower stress.                                                                               | Emerging                | Taylor 2006 and later                                       | Faint contour lines as the app's texture, in page heads and breaks only.                                              |
| A light green background improved reading and mood compared with white in one 2025 study.                                                                                | Emerging                | Li et al. 2025 (40 students)                                | Consistent with a green-gray paper, not a reason on its own.                                                          |
| People speed up as a goal gets close, and showing progress already made helps them finish.                                                                               | Strong                  | Kivetz, Urminsky and Zheng 2006; Nunes and Drèze 2006       | A route that fills in, a ring that closes, a summit profile.                                                          |
| Planned short breaks left students less tired and more motivated than self-timed breaks. The 20-20-20 rule helped dry-eye symptoms only.                                 | Moderate                | Biwer et al. 2023; Talens-Estarelles et al. 2023            | The focus timer suggests breaks, with an eye-rest prompt.                                                             |

## 2. The focus layer (for everyone)

| Finding                                                                                                                                           | Evidence                                    | Source                                        | What it means for Atlas                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------- |
| If-then plans ("when X, I'll do Y") had a medium-to-large effect on reaching goals across 94 tests (d = 0.65).                                    | Strong                                      | Gollwitzer and Sheeran 2006 (meta-analysis)   | One line of intention per focus block; if-then start plans.                           |
| Interrupted people work faster to catch up, with more stress, frustration and time pressure.                                                      | Moderate                                    | Mark, Gudith and Klocke 2008 (CHI)            | Notifications wait for the break during a focus block.                                |
| Unfinished tasks keep pulling at attention; making a specific plan for them removed the interference.                                             | Moderate                                    | Masicampo and Baumeister 2011                 | Park it: capture a stray thought with a when; it comes back then.                     |
| Salient, irrelevant things on screen distract (more so in ADHD); a task that fills attention reduces it.                                          | Moderate                                    | Forster et al. 2014                           | Dim everything but the work during a block.                                           |
| The method of loci improved recall (g = 0.65, 13 trials).                                                                                         | Strong for the method; Emerging for our use | Twomey and Kroneisen 2021                     | Memory walk: review a topic in the order of its places on the map. Our own extension. |
| Memory is better in the learning context, but the effect shrinks when context isn't distinctive; the classic divers study replicated only weakly. | Mixed                                       | Smith and Vela 2001; Murre 2021               | Each subject keeps one color and emblem everywhere, so its context is distinctive.    |
| Slow breathing (about six breaths a minute) raised heart-rate variability during and after practice.                                              | Moderate                                    | Laborde et al. 2022 (meta-analysis)           | Optional breathing minute on breaks and on interview day.                             |
| Writing about test worries before an exam raised scores in 2011; two large replications found no benefit.                                         | No effect                                   | Ramirez and Beilock 2011; Camerer et al. 2018 | Not promised. Worries are parked with a plan instead.                                 |

## 3. ADHD

ADHD mainly affects self-regulation: judging time, holding steps in mind, starting, and staying
with tasks whose reward is far away. Most studies are on children and teens; adult studies are
fewer. ADHD mode supports study habits; it doesn't treat ADHD.

| Finding                                                                                               | Evidence                             | Source                                      | What it means for Atlas                                                          |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------- | -------------------------------------------------------------------------------- |
| Help works best at the "point of performance": time, steps and rewards shown where the work happens.  | Expert consensus                     | Barkley, executive function model           | Every support lives on the screen being worked on.                               |
| People with ADHD judge time less accurately (medium effects, 27 studies; children and teens).         | Strong                               | Zheng et al. 2022 (meta-analysis)           | Shrinking-disc timers; planned against actual time after each task.              |
| Working memory is weaker (g ≈ 0.7).                                                                   | Strong                               | Kasper, Alderson and Hudec 2012             | Written steps, "where you left off", Park it.                                    |
| Immediate rewards help more than usual; delayed ones help less.                                       | Strong                               | Luman et al. 2005; Marx et al. 2021         | Instant feedback for every small step.                                           |
| Bright irrelevant distractors interfere more in adult ADHD.                                           | Moderate                             | Forster et al. 2014                         | Calm screen: hide what isn't the task.                                           |
| If-then plans improved self-control in children with ADHD.                                            | Moderate                             | Gawrilow and Gollwitzer 2008                | "When ___, I'll start ___" on Today.                                             |
| Self-testing helps college students with ADHD as much as others, but they choose it less.             | Moderate                             | Knouse et al. 2016, 2020                    | A quick check comes after each reading section.                                  |
| White or pink noise helped task performance a little in ADHD (g ≈ 0.25) and hurt people without ADHD. | Moderate, small                      | JAACAP 2024 meta-analysis (13 studies)      | Optional focus sound, off by default even in ADHD mode.                          |
| A short bout of exercise gives a small boost to executive function (g ≈ 0.17, low quality).           | Emerging                             | Meta-analysis 2025                          | Movement ideas on breaks.                                                        |
| Hyperfocus is common in adult ADHD: losing track of time, meals and rest.                             | Moderate                             | Hupfeld, Abagis and Shah 2019               | A gentle check-in after 90 minutes without a break.                              |
| Gamified programs improved executive function in children with ADHD (g ≈ 0.42).                       | Moderate (children)                  | Leung et al. 2025 (meta-analysis, preprint) | Progress you can see and collect; never penalties.                               |
| Working next to someone ("body doubling") helps many people start and keep going.                     | Emerging                             | Small studies and surveys 2024 to 2025      | Study with Claude check-ins, off by default, labeled as an experiment.           |
| Text-to-speech helps comprehension mainly for reading difficulties (about 0.35).                      | Moderate for dyslexia, weak for ADHD | Text-to-speech studies                      | Read aloud with the browser's own voice.                                         |
| Bionic reading gave no gain in speed or comprehension.                                                | No effect                            | Snell 2024; Readwise test (2,000+ readers)  | Not included.                                                                    |
| Clear layouts, headings and signposts help people regain context after losing focus.                  | Guideline                            | W3C COGA                                    | Consistent places, clear titles, fewer choices at once.                          |
| Emotional reactions to setbacks are common in adult ADHD.                                             | Moderate                             | Clinical reviews                            | No red for wrong or late; "Fresh start" for backlogs; "Welcome back" after gaps. |

Left out on purpose: bionic reading (no effect), colored overlays (weak evidence even for
dyslexia), red countdowns, lost streaks or penalties (stress and shame), confetti and constant
motion (distracting), sounds on by default (noise hurts people without ADHD).

## Sources

1. Piepenbrock, Mayr and Buchner (2014). Smaller pupil size and better proofreading performance with positive than with negative polarity displays. https://pubmed.ncbi.nlm.nih.gov/25135324/
2. Piepenbrock, Mayr, Mund and Buchner (2013). Positive display polarity is advantageous for both younger and older adults. https://www.researchgate.net/publication/236662424
3. Immediate effects of light mode and dark mode features on visual fatigue in tablet users (2025). https://www.mdpi.com/1660-4601/22/4/609
4. Nielsen Norman Group. Dark mode vs. light mode: which is better? https://www.nngroup.com/articles/dark-mode/
5. Appropriate screen brightness for ambient lighting illuminance. https://www.researchgate.net/publication/357961561
6. Chang et al. (2015). Evening use of light-emitting eReaders negatively affects sleep, circadian timing, and next-morning alertness. https://www.pnas.org/doi/10.1073/pnas.1418490112
7. Jensen et al. (2021), Night Shift and sleep (news summary). https://www.technologynetworks.com/neuroscience/news/can-blue-light-filters-really-help-your-sleep-better-348176
8. Plass et al. (2014). Emotional design in multimedia learning: effects of shape and color on affect and learning. https://www.academia.edu/14175353
9. Brom, Stárková and D'Mello (2018). How effective is emotional design? A meta-analysis. https://www.researchgate.net/publication/327887386
10. Wong and Adesope (2021). Meta-analysis of emotional designs in multimedia learning. https://link.springer.com/article/10.1007/s10648-020-09545-x
11. Rey (2012). A review of research and a meta-analysis of the seductive detail effect. https://www.researchgate.net/publication/257690772
12. Sundararajan and Adesope (2020). Keep it coherent: a meta-analysis of the seductive details effect. https://www.researchgate.net/publication/339511797
13. Fisher, Godwin and Seltman (2014). Visual environment, attention allocation, and learning in young children. https://journals.sagepub.com/doi/abs/10.1177/0956797614533801
14. Tractinsky, Katz and Ikar (2000). What is beautiful is usable. https://academic.oup.com/iwc/article-abstract/13/2/127/898608
15. Bar and Neta (2006). Humans prefer curved visual objects. https://journals.sagepub.com/doi/10.1111/j.1467-9280.2006.01759.x
16. Dzulkifli and Mustafar (2013). The influence of colour on memory performance: a review. https://pubmed.ncbi.nlm.nih.gov/23983571/
17. Gnambs (2020). Limited evidence for the effect of red color on cognitive performance: a meta-analysis. https://link.springer.com/article/10.3758/s13423-020-01772-1
18. Rello, Pielot and Marcos (2016). Make it big! The effect of font size and line spacing on online readability. https://pielot.org/pubs/Rello2016-Fontsize.pdf
19. Dyson and Haselgrove (2001). The influence of reading speed and line length on the effectiveness of reading from screen. https://www.sciencedirect.com/science/article/abs/pii/S1071581901904586
20. Lee et al. (2015). 40-second green roof views sustain attention. https://www.sciencedirect.com/science/article/abs/pii/S0272494415000328
21. Stevenson, Schilhab and Bentsen (2018). Attention restoration theory II: a systematic review. https://www.researchgate.net/publication/327155119
22. Taylor (2006). Reduction of physiological stress using fractal art and architecture. https://direct.mit.edu/leon/article-abstract/39/3/245/44931
23. Li, Guan, Wu and Bai (2025). Light green background enhances reading performance in visual display terminal tasks. https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2025.1627013/full
24. Kivetz, Urminsky and Zheng (2006). The goal-gradient hypothesis resurrected. https://journals.sagepub.com/doi/abs/10.1509/jmkr.43.1.39
25. Biwer, de Bruin and Persky (2023). Understanding effort regulation: comparing Pomodoro breaks and self-regulated breaks. https://pubmed.ncbi.nlm.nih.gov/36859717/
26. Talens-Estarelles et al. (2023). Testing the 20-20-20 rule. https://www.sciencedirect.com/science/article/pii/S1367048422001990
27. Gollwitzer and Sheeran (2006). Implementation intentions and goal achievement: a meta-analysis. https://kops.uni-konstanz.de/handle/123456789/10973
28. Mark, Gudith and Klocke (2008). The cost of interrupted work: more speed and stress. https://dl.acm.org/doi/10.1145/1357054.1357072
29. Masicampo and Baumeister (2011). Consider it done! Plan making can eliminate the cognitive effects of unfulfilled goals. https://www.researchgate.net/publication/51234294
30. Twomey and Kroneisen (2021). The effectiveness of the loci method as a mnemonic device: meta-analysis. https://journals.sagepub.com/doi/abs/10.1177/1747021821993457
31. Smith and Vela (2001). Environmental context-dependent memory: a review and meta-analysis. https://link.springer.com/article/10.3758/BF03196157
32. Murre (2021). The Godden and Baddeley (1975) experiment: a replication. https://royalsocietypublishing.org/rsos/article/8/11/200724/95735
33. Laborde et al. (2022). Effects of voluntary slow breathing on heart rate and heart rate variability: a meta-analysis. https://www.sciencedirect.com/science/article/abs/pii/S0149763422002007
34. Ramirez and Beilock (2011). Writing about testing worries boosts exam performance in the classroom. https://www.science.org/doi/10.1126/science.1199427
35. Camerer et al. (2018). Evaluating the replicability of social science experiments in Nature and Science between 2010 and 2015. https://www.nature.com/articles/s41562-018-0399-z
36. Does expressive writing or an instructional intervention reduce the impacts of test anxiety in a college classroom? (2021). https://link.springer.com/article/10.1186/s41235-021-00309-x
37. Barkley. The important role of executive functioning and self-regulation in ADHD (fact sheet). https://www.russellbarkley.org/factsheets/ADHD_EF_and_SR.pdf
38. Zheng et al. (2022). Time perception deficits in children and adolescents with ADHD: a meta-analysis. https://doi.org/10.1177/1087054720978557
39. Kasper, Alderson and Hudec (2012). Moderators of working memory deficits in children with ADHD. https://pubmed.ncbi.nlm.nih.gov/22917740/
40. Luman, Oosterlaan and Sergeant (2005). The impact of reinforcement contingencies on AD/HD. https://www.researchgate.net/publication/8088066
41. Marx et al. (2021). ADHD and the choice of small immediate over larger delayed rewards: a meta-analysis. https://journals.sagepub.com/doi/abs/10.1177/1087054718772138
42. Forster et al. (2014). Plugging the attention deficit: perceptual load counters increased distraction in ADHD. https://pubmed.ncbi.nlm.nih.gov/24219607/
43. Gawrilow and Gollwitzer (2008). Implementation intentions facilitate response inhibition in children with ADHD. https://link.springer.com/article/10.1007/s10608-007-9150-1
44. Knouse et al. (2016). Does testing improve learning for college students with ADHD? https://journals.sagepub.com/doi/10.1177/2167702614565175
45. Systematic review and meta-analysis (2024): do white noise or pink noise help with task performance in youth with ADHD? https://pubmed.ncbi.nlm.nih.gov/38428577/
46. Single exercise session and executive function in children and adolescents with ADHD: a three-level meta-analysis (2025). https://pmc.ncbi.nlm.nih.gov/articles/PMC12220223/
47. Hupfeld, Abagis and Shah (2019). Living "in the zone": hyperfocus in adult ADHD. https://pubmed.ncbi.nlm.nih.gov/30267329/
48. Leung et al. (2025). Gamified digital interventions for children and adolescents with ADHD: a meta-analysis (preprint). https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6611907
49. You are not alone: designing body doubling for ADHD in virtual reality (2025). https://arxiv.org/abs/2509.12153
50. The effects of text-to-speech on reading comprehension in students with reading disabilities (2025). https://link.springer.com/article/10.1007/s11145-025-10738-5
51. Snell (2024). No, Bionic Reading does not work. https://www.sciencedirect.com/science/article/pii/S0001691824001811
52. Readwise (2022). Does Bionic Reading actually work? https://blog.readwise.io/bionic-reading-results/
53. W3C. Making content usable for people with cognitive and learning disabilities. https://www.w3.org/TR/coga-usable/
