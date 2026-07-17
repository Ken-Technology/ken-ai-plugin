> **DEPRECATED - do not follow this file.** It is an older duplicate, referenced by no skill. The canonical copy rules live in `email_copywriting.md` and `SKILL.md` in this skill. In particular, the rules below are out of date: AI variables now use double braces `{{First Line}}` (not `[First Line]`); `{sender_signature}` is deprecated and forbidden; signatures now use `{sender_first_name} {sender_last_name}` plus a linked client company; bodies have a hard ~80-word ceiling; every email's CTA asks for the real offer including Email 1; and final emails never use "Last note from me" / "just following up" endings.

## Email Copywriting
_How to write email copy_

**1. Value Proposition Expansion**

*   Start with a clear value proposition
*   Expand based on that foundation
*   Ask: What angles can I put on this?
*   What case studies support this?
*   What social proof building blocks can I use?
*   Build outward from the core value

**2. Campaign Strategy Driven (When Strategy Provided)**

*   Start with the email sequence blueprint from Campaign Strategy
*   Each email's `primary_goal` and `description` guides your writing
*   Insert AI variable placeholders where the strategy specifies
*   Let the strategy's structure guide your copy flow

### Formatting
#### Basic Rules
*   **Plain text only** - No markdown formatting in emails
*   No headings, no bulleted lists, no numbered lists
*   For bullets, use simple dashes (the minus sign on keyboard)
*   For numbered items, write manually as 1, 2, 3, 4 (no auto-formatting)
*   No bold, italic, or other text styles
*   **One link maximum** - Must be transparent (not embedded)
*   Don't use special dash characters; use only the simple dash from keyboard

#### AI Variable Placeholders
When including AI personalization variables in email copy:
*   Use square brackets: `[Variable Name]`
*   Match the variable name from the Campaign Strategy
*   Common placeholders: `[First Line]`, `[PS Line]`, `[Subject Line]`, `[Industry Hook]`
*   Place variables exactly where the strategy specifies

#### Subject Lines as AI Variables
*   **Default approach**: Subject lines should usually be AI personalization prompts, not static text
*   Use `[Subject Line]` placeholder and create a corresponding AI prompt
*   Static subject lines are acceptable only when:
    - Testing multiple static options explicitly requested by user
    - Subject line is part of a specific tested formula
    - Campaign strategy specifies static subjects
*   When in doubt, default to AI-generated subject lines for maximum personalization

#### Layout & Readability
*   Write like a normal person and use lots of white space
*   Keep paragraphs short - no more than three lines each
*   Put one empty line between paragraphs
*   The greeting should always be followed by an empty line
*   **Mobile optimization:** 60% of people read email on mobile
    *   Test every email on your phone
    *   If email is longer than one phone screen, it's probably too long
    *   At minimum, ensure the hook is immediately visible

### Email Blocks
#### Key Principle: Flow is Everything
One of the most important points is to make all blocks flow nicely. While we structure emails in terms of copywriting blocks (hooks, body blocks, social proof, CTAs), the most important thing is for the email itself to read nicely.

**Remember:**
*   You don't write good sentences, you write good email sequences
*   The whole email sequence has to make sense
*   It shouldn't read like sentences stitched together
*   It should feel like a single comprehensive email
*   Every single block can be one sentence, two sentences, or even the whole email
*   AI variables should blend seamlessly - they shouldn't feel like "insert personalization here"

#### One Idea Per Email
Every single email has to have **one idea** and drive one piece of information home. Don't focus on many things.

**Examples:**
*   If talking about a case study, focus entirely on that case study
*   If introducing an offer, make that the sole focus
*   You can have multiple supporting elements IF they reinforce the main idea
*   If a testimonial makes the offer sound better, include it
*   If a testimonial distracts from the offer, leave it out

### Hook
#### What Makes a Good Hook
**Most Reliable Approach:** Insightful + Relevant Information
*   Share something they didn't know about
*   Make it relevant to their business
*   Ask clients for unknown but insightful information their audience needs

**Example:** "HubSpot backs up your data for seven days only. After that, if you lose it, you lose it."
*   Insightful
*   Useful
*   Probably unknown

**When Using AI Variables for Hooks:**
*   The `[First Line]` variable often serves as the personalized hook
*   Template body should flow naturally from the personalized opening
*   Write your template assuming the AI variable creates the initial connection

#### Hook Strategies
**1. Questions (Use Carefully)**
*   Questions are marketing patterns - avoid when possible
*   Only use when it genuinely makes sense
*   Avoid: "Did you know that this thing happened?" (Too generic)

**2. Describe the Situation/Pain Point**
*   Don't describe the pain - just mention it
*   People already know how it feels
*   Your job is to make it painful/urgent

**3. Statistics (Use Sparingly)**
*   Stats sound specific but are overused marketing patterns
*   Better approach: Be dramatic and controversial
*   Instead of "80% of companies don't back up their data"
*   Say: "Almost no one backs up their data"

**4. Be Controversial (Within Reason)**
*   You're allowed to be a bit controversial
*   Speak like this is an issue you deeply care about
*   If 80-90% of your audience will understand, that's good enough

**Example Hook:**
"Almost no one has someone in charge of data backups. And when something goes wrong, which does in three out of four cases, companies lose data permanently because no one else besides you are tasked to protect your data. That costs you money."

### Body
The body primarily provides supporting statements for the hook. If the hook is personalization/icebreaker, the body becomes the real hook where you keep them engaged.

#### Three Primary Categories of Body Copy
**1. Information**
*   Value proposition (most important)
*   Outcomes
*   Bold claims
*   Pain points
*   Solutions, features, and benefits
*   Stories

**Power of Direct Value Props:**
Sometimes your value proposition alone is enough. Example: "Our business saves 20% of your AWS bill" - no need for elaborate benefits or stories if the value prop is compelling enough.

**2. Social Proof**
*   Case studies (combination of all social proof elements)
*   Testimonials (what clients said about you)
*   Results (specific outcomes achieved)
*   Statistics (use sparingly, prefer "4 out of 5" over "80%")
*   Name dropping (Google, Microsoft, Apple, etc.)

**Note on Statistics:**
*   Overused marketing pattern
*   Flagged as spam by algorithms
*   Use words instead of percentages when possible

**3. Risk Reversal**
*   Objection handling
*   Guarantees
*   Free trials/samples

**Important:** Risk reversal is less relevant in cold emails since the goal is to make them reply, not buy. Risk concerns typically arise at purchase moment, not interest stage.

**Exception:** Powerful for creating compelling offers
Example: "We'll create 10 LinkedIn posts for free. If they don't beat your current performance, we'll pay you $500."

### CTA (Call to Action)
#### CTA Rules
A call to action is a short piece that should **always** exist in every single email. It tells prospects clearly what they should do.

**What NOT to do:**
*   Don't have two CTAs
*   Don't ask two questions
*   Don't make long CTAs (avoid multi-line CTAs)
*   Don't use marketing patterns ("click here to learn more", "reply yes if interested")

**What TO do:**
*   CTAs should feel like something a human would write
*   Keep it simple and direct
*   One CTA per email (but can vary across email sequence)
*   Never append duration details to the CTA question itself
*   If time framing is important, mention it earlier in the body

#### Two Types of CTAs

**1. Reply-Based CTAs**
Best for:
*   Asking directly for a call
*   Gauging interest in value proposition
*   When email focused on offer/value prop
*   Example: After offering "10 free LinkedIn posts"

**2. Click-Based CTAs**
Best for:
*   Sharing lead magnets
*   Sharing PDFs, interactive tools, AI tools
*   Sharing case studies
*   Video content

**Key Insight:**
*   More people click than reply
*   Clicks are not equal to replies in value
*   Use clicks for wide distribution (videos, resources)
*   Use replies for driving real sales conversations

**Campaign Strategy Alignment:**
Follow the CTA approach specified in the Campaign Strategy. If strategy says "reply-based," use conversational reply CTAs. If it specifies a lead magnet click, structure the CTA around that.

### Signature

**Current rule:** every email signs off with a two-line signature block using only `{sender_first_name}` and `{sender_last_name}` as sender variables. `{sender_signature}` is deprecated and must never be used in new campaign copy.

**Formula:**
```markdown
[Greeting - Best, Best regards, Cheers, etc.]
{sender_first_name} {sender_last_name} - [title] at [Client company name](https://best-client-link.example)
```

Use the client's best link as a markdown link on the company name so campaign-configuration converts it into a tracking link.

### PS Line
#### The Power of PS
The PS-Line is one of the most overpowered lines in cold email sequences, but everyone uses it - be careful not to betray your audience.

#### PS Line Best Practices
**Uses:**
*   Personal references (AI personalization about prospect)
*   Breaking the "one idea" rule strategically
*   Adding social proof that supports main message
*   Quick additional ideas
*   Jokes (but they must be good/smart, not cheesy)

**Characteristics:**
*   More casual and personal than body
*   Not unprofessional, but more relaxed
*   Treat as "personal space" for missed details
*   Technically "post-scriptum" but use as personal addition

**Frequency:** Use PS lines in 2-3 out of 5 emails (not every email)

**AI Variable Integration:**
The `[PS Line]` variable is perfect for AI personalization - it's where prospects expect personal touches. When using this variable, ensure the template PS (if any) complements rather than duplicates the personalized content.

**Example Use Case:**
If body discusses offer, PS can add quick social proof - two different ideas that support each other.



## Writing for Campaign Goals

After reading strategy.md, identify the `funnel_type` field and apply the corresponding technique set, word count, and tone below.

### Click-Based Copy Techniques
- Create curiosity/information gaps that the asset resolves
- Future pace the experience ("You'll see...", "Takes about an hour...")
- Frame assets as frictionless (no commitment, instant access, self-guided)
- Lead with the problem the asset solves, not the product
- Links should feel earned, not pushed
- Pattern interrupts to stand out from generic outreach

### Reply-Based Copy Techniques
- Keep emails short and conversational - feel like a quick personal message
- Lead with strongest benefits and strongest ask from Email 1
- Offer positioning: make it feel irresistible and risk-free
- Questions that invite genuine conversation (not rhetorical)
- One idea per email - don't overexplain

### Story-Based Reply Techniques (Use Sparingly)
- Story arcs that build across emails - each email is a chapter
- Vulnerability and peer-to-peer tone over authority
- Can be longer than typical reply-based emails
- Only use when there's a truly compelling story to tell

### Word Count Guidance

| Goal Type | Target Length | Range |
|-----------|-------------|-------|
| Click-based | Standard | 80-150 words |
| Reply-based | Short | 50-80 words |
| Story-based reply | Longer | 100-150+ words |

### Tone Guidance

| Goal Type | Tone | Feels Like |
|-----------|------|------------|
| Click-based | Informational, educational | A knowledgeable colleague sharing something useful |
| Reply-based | Casual, human, one-to-one | A quick personal message from someone who gets their problem |
| Story-based reply | Personal, vulnerable, narrative | A founder sharing their story peer-to-peer |

## What to avoid

- Avoid all salesy and marketing language at all costs.
- Skip straight to the topic and to the best piece of information you have. Instead of "Quick follow-up - most advisors know retention beats acquisition", use "Retention beats acquisition".
- Don't ever use Quick follow-up, Noticed that, Just wanted to share, and all other usual salesy language.
- In the last email, never say "Last email", "Last note from me", etc.
