# Signal outreach: the free gate

A signal feed is wide and noisy. The gate is a set of plain rules you apply to the free search results before anything is imported, enriched or qualified. Each company that passes costs money later, so the gate is strict and cheap checks run first.

## What we measured

From a hiring-signal pipeline run on 171 real job-posting signals (July 2026):

- About 25% of the job titles matched the role the signal was meant to find. Feeds match the posting's description text, so "HVAC Sales Rep", "Escrow Accountant - Title Insurance" and "Microsoft Fabric Data Engineer" all arrive as sales or RevOps hiring.
- The free gate removed 118 of 171 (69%): 77 on excluded titles, 34 with no title in the wanted roles, 7 not in English.
- The keyword group that fired is not the role. A feed watching "SDR, BDR, Outbound, Revenue Operations" fires for a Sales Engineer post in German. Segment on the posting's real title.
- Company names are sometimes junk ("prefer not to say"). Trust the domain over the name.
- Volume is a trickle: about 57 signals a day became about 14 that passed the gate. Plan the campaign for that volume.

## Order of checks

1. **Title exclusions** (drop first)
2. **Wanted roles** (keep only titles in the plan's role clusters)
3. **Language**
4. **Company size**
5. **Country**
6. **Duplicates and companies already worked**

Show the count after each check.

## Title exclusions that held up

Drop a posting whose title contains any of these families, unless the user's offer is about exactly that role:

- Recruiting or staffing for clients: recruiter, talent acquisition, staffing coordinator.
- IT implementation roles that carry sales words: Microsoft, Dynamics 365, Exchange migration, Power Platform, data engineer, software engineer, solution architect.
- Incidental sales or marketing words: escrow, accountant, HVAC, generator, audio visual, estimator.
- Support, admin and coordinator roles.
- Low-intent posts: future opening, part-time, temp, virtual assistant, entry level, intern.
- Marketing roles that do not own pipeline (when the plan is pipeline): product marketing, brand, communications, events, content marketing, marketing research or insights, sponsorship.

Widen the wanted roles when real titles that plainly fit die at check 2 ("Sales Manager", "Vice President - Sales Head"). Exclusions still run first, so "network sales executive" stays out.

## Language

Drop titles or excerpts with gender markers from other languages (`m/w/d`, `w/m`, `(h/f)`) or non-English stop words, when the campaign writes in English.

## Size and country

Use the user's ICP. Without one, the hiring run above kept companies of 2 to 200 employees: at that size a few new roles are a real plan, while at 5,000 they are noise. The people search covers six countries (United States, United Kingdom, Canada, Ireland, Australia, New Zealand); keep companies elsewhere in a separate list, say so, and find their decision makers by name with the email finder (SKILL.md Step 3).

## Duplicates

- One row per normalized domain: lowercase, no `www.`, no path.
- Drop target accounts (the Accounts lane works them) and companies already in the campaign.
- Do not re-spend on a company you gated last week: keep the last run's passed domains in the campaign's notes or a Knowledge file, and skip them.

## Funding filters that held up

- New rounds only (`newRoundsOnly`), so a later report of the same round does not fire twice.
- A minimum amount that means a real plan for the user's offer (often 2M USD or more).
- Operating companies only (the default), with a website (`hasDomain`).
- The round's stated use, when the source gives one, decides the plan line and the person.
