# Sound Human: AI-Tells & ICP Voice Matching

Compiled 2026-07 from corpus studies (post-ChatGPT word-frequency research), the Wikipedia "Signs of AI writing" catalog, and cold-email practitioners (Lavender data, Josh Braun, Kyle Coleman, Becc Holland, 30MPC, Hunter). This file is the single source of truth for the human-voice standard across email-copywriting and email-review.

The dividing line: **recipients don't care whether you used AI; they care if it reads like AI.** An email reads human when it demonstrates non-fakeable relevance to one specific person and sounds like something a real person would type. Polish itself is the tell.

## AI-tell lexicon (REJECT on sight)

**Verbs:** delve (10.5x more common post-ChatGPT - the single biggest tell) · leverage · utilize · harness · streamline · elevate · empower · unlock · unleash · supercharge · revolutionize · transform · enhance · foster · facilitate · cultivate · underscore · resonate · embark · navigate (metaphorical) · optimize / maximize · showcase · garner · bolster · amplify · align (as in "aligns with your goals")

**Adjectives:** seamless · robust · innovative · pivotal · crucial · comprehensive · holistic · transformative · game-changing / groundbreaking · cutting-edge · scalable (as hype) · bespoke · tailored · invaluable · unwavering · meticulous · dynamic · impressive · fascinating · remarkable · inspiring

**Nouns:** landscape ("evolving landscape") · realm · tapestry · testament ("a testament to") · synergy · game-changer · actionable insights · pain points (used literally at the prospect) · journey · treasure trove · solution (as in "tailored solution")

**Transitions:** moreover · furthermore · additionally (sentence-opening) · consequently · notably · ultimately · "It's worth noting that" · "It's important to note"

**Cold-email dead phrases (instant delete for prospects):**
- "I hope this email finds you well"
- "I came across your profile / your company"
- "I couldn't help but notice"
- "I noticed you recently posted about X on LinkedIn" (generic-personalization formula)
- "I was impressed by" / "Your incredible work at [Company]"
- "I really admire what you're building"
- "Congratulations on your recent funding" (as an opener formula)
- "As a [title], you know..." (mirroring their title back)
- "In today's fast-paced world / competitive landscape"
- "Warm regards" · "Dear [anything]"
- "quick question" (subject or opener)

## AI-tell structures (REJECT the pattern, not just words)

1. **Negative parallelism:** "It's not just X, it's Y" / "not only... but also" - the sound of a model reaching for emphasis it hasn't earned.
2. **Tidy triads everywhere:** "fast, reliable, and affordable" - three perfectly parallel items, three bullets, three benefits. Humans are lopsided; use two, or four, or one.
3. **Metronomic rhythm:** every sentence 18-24 words. Three consecutive sentences of similar length = flag. Humans write jagged: a 3-word fragment, then a longer thought.
4. **Em-dash density** (3x+ human frequency in AI text). House style is simple dashes anyway; keep them sparse too.
5. **Copula avoidance:** "serves as", "stands as", "boasts", "features" instead of plain "is" / "has".
6. **Hedge chains:** "can be a useful way for many teams in certain situations" - stacked qualifiers, over-polite hedging.
7. **Elegant variation:** compulsively swapping synonyms to avoid repeating a word. Humans just repeat the word.
8. **Compliment-then-pitch:** personalized first line, then a boilerplate pitch with zero connection. The jarring seam IS the tell (this is the transitions rule - the body must continue the {{First Line}} thought).
9. **Empty observations:** "I know SaaS is competitive these days" - could be sent to anyone; carries zero information.
10. **Flawless-but-generic:** perfect grammar, zero colloquialism, no odd word choice anywhere. Reads formulaic even when technically clean.
11. **Same-shape sequences:** every email with identical structure, opener style, and CTA position. Vary the beats across the sequence.

## What makes copy read human

- **Write how the PROSPECT talks, not how you talk** (Josh Braun). Mine their reviews, case studies, job posts, forum threads for literal vocabulary and paste their words into the email. See the ICP Voice Card below.
- **Specificity that couldn't be faked.** "You opened three SRE roles in Austin last week, all requiring Kubernetes" beats any adjective. Real numbers, named customers, concrete scenes ("researching earnings at 2am") - only true ones.
- **Jagged rhythm on purpose.** Mix a 3-word fragment with a longer sentence. Fragments are fine: "Worth a toast?"
- **Contractions and casual connectors:** it's, you'll, btw, honestly, "also -". Slightly casual tone measurably lifts replies (Lavender: +23%).
- **Plain verbs, first person:** "we built", "I noticed", "I created a newsletter that..." - not "we've developed a solution designed to".
- **One flourish of personality per email, max.** A joke, a physical object, an honest admission ("I'm not sure if this is a fit"). One beat, not a routine.
- **3rd-5th grade reading level** (Lavender: 67% more replies). Short words, short sentences, zero jargon the ICP doesn't use daily.
- **The read-aloud test:** if you would never say the phrase to the prospect's face, delete it. Machines still lose this test.
- **Humility beats swagger:** "Not sure if you're the right person for this" reads human; "best-in-class platform" reads like a bot.

## ICP Voice Card (write one before drafting - MANDATORY)

Every ICP has its own language. A fall-prevention nurse, a Bazel platform engineer, and an agency founder do not read the same email. Before drafting, write a 6-line Voice Card from client research + ICP knowledge and keep it in front of you:

```
VOICE CARD - {segment / ICP}
Reader: {who exactly opens this - title, day, what their inbox looks like}
Their words: {5-8 terms/phrases this ICP uses daily - from their job posts, forums, reviews}
Never say: {3-5 phrases that mark the sender as an outsider or a vendor}
Formality: {how they talk to peers - e.g. "engineers: blunt, technical, allergic to marketing" / "PACE administrators: warm, compliance-aware"}
Sender persona: {who is talking and how that person actually writes - founder peer-to-peer, operator-to-operator}
Proof that lands: {which kind of evidence this ICP believes - benchmarks, peer names, regulator language, revenue math}
```

Rules:
- The card derives from the client research and the segment definition - not from imagination. If the client has a founder voice profile in notes/memory, it overrides the generic sender persona.
- Copy the finished card into the `## Notes` section at the end of `emails.md` so the review pass can check the copy against it.
- The same offer gets re-voiced per segment: an engineer gets "your CI bill" while a CFO gets "your build-infrastructure spend". If two segments' emails differ only by industry noun swap, the voice card wasn't used.
- Insider terms are allowed to exceed the reading-level rule when 80%+ of the ICP uses them daily (a Bazel engineer expects "remote cache hits"; simplifying it down marks you as an outsider).
