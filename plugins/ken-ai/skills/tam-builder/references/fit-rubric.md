# TAM builder: the fit rubric

A fit rubric turns "companies like X" into a rule two people would apply the same way. Write it before the first search and keep it with the list (the saved list's description, or a Knowledge file).

## Format

```markdown
# Fit rubric: <market>, v<n>, <date>

## Target
<one sentence: the kind of company and what it does for whom>

## Size and place
- Employees: <range>
- Countries: <list>, and whether HQ or any office counts

## Classes
- core: <exactly the target, with 2-3 concrete markers>
- adjacent: <could become one, with its markers>
- maybe: the data does not say which; not sent to people finding
- no: <the look-alikes that are out, by name>

## Who to reach
- <1-2 titles per company, with local-language versions>

## Target phrases
<the words a company's name, description or specialties must carry to be classified at all>
```

## Example: agencies for a white-label offer

```markdown
# Fit rubric: outbound agencies, v1, 2026-10-20

## Target
Agencies that run outbound, lead generation or appointment setting for B2B clients.

## Size and place
- Employees: 1 to 50 on the company page
- Countries: any; Kenso Search covers six of them for people

## Classes
- core: runs outbound, lead gen, appointment setting, SDR work, ABM, GTM engineering, RevOps or sales automation for B2B clients
- adjacent: a B2B marketing agency (SEO, content, paid, CRM consulting, SaaS marketing) that could add outbound
- maybe: may serve businesses; the data does not say
- no: consumer-facing marketing, web shops, software vendors, staffing, training, media

## Who to reach
- founder, co-founder, CEO, owner, managing director (Geschäftsführer, fondateur, director general)

## Target phrases
outbound, lead generation, appointment setting, SDR, cold email, ABM, demand generation, GTM, RevOps, sales development
```

That run kept 8,607 core and 7,479 adjacent agencies, set 29,016 apart as maybe, and left out 58,673 as no.

## Writing a reason

One line, from the company's own data, that a reviewer can check:

- core - "Runs SDR and appointment-setting programs for SaaS clients (company description)"
- adjacent - "HubSpot partner agency doing content and paid for B2B tech (specialties)"
- maybe - "Digital marketing agency; client type not stated"
- no - "E-commerce store design for consumer brands"

Never write a reason the data does not support. When unsure, the class is `maybe`.
