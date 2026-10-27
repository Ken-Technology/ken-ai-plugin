# Meeting prep: layout and checks

Reference for the meeting-prep-and-followup skill, before the call. The prep is one page the rep reads in two minutes. Every line names its source (the brief's sources, a touch, an email, a Knowledge citation id, a meeting note). Leave a section out, or write "nothing on file", rather than fill it with a guess.

## Layout

```text
<Meeting title> - <day, time, time zone> - <first meeting | follow-up call>

Open with
  <one line: the reason they took the call, in their words if you have them>

Who attends
  <Name>, <title> - <champion | decision maker | evaluator | new> - cares about <...> (source)
  ...

Where it stands
  Stage: <account stage / deal stage>. Last touch: <date, channel, what>.
  They said: "<their last words that matter>" (<date>, source)

Why now
  <the trigger, with its date and source>

Questions to ask
  1. <discovery question about the problem>
  2. Budget: <the question to ask>
  3. Who signs and how they buy: <...>
  4. Team and capacity: <...>
  5. Timeline: <...>

Objections to expect
  - "<objection>" -> <the answer the workspace has, with source> | no answer on file
  ...

Numbers you may quote
  <metric, value, period, source> | none on file

Next step to ask for
  <one step, with a date: "a 30-minute call with the CFO next Tuesday">
```

## Checks before you hand it over

- Every name, title and date comes from a tool result. Nothing is inferred from an email domain or a guess at seniority.
- The money questions are there. Calls that never ask about budget, who signs and timeline end with the price deferred to a call that never happens.
- Objections come from what this account or similar accounts actually said (past calls, replies, Knowledge), not a generic list.
- Numbers are the workspace's own, with a period and a source. A rep who quotes a reply rate from memory can undersell the product by half on the call. When there is no number on file, say so.
- Funding is not a buying event. If the trigger is a raise, name what the money is for (the hires, the launch, the market) and tie the call to that.
- The next step has a date. "Let's stay in touch" is not a next step.
- Internal meetings and existing-customer check-ins get no sales prep unless the user asked.

## Where each part comes from

| Part | First source | Then |
|---|---|---|
| Open with, why now, angle | the brief (`openWith`, `whyNow`, `angle`) | account research `whyNow`, signals |
| Who attends | the brief `attending` | meeting `participants`, Accounts people and stakeholders |
| Where it stands | the brief `relationship` and `touchHistory` | account activity, touches, email threads |
| Past calls | meeting notes on the account | earlier meetings and their transcripts |
| Objections and answers | past transcripts and replies | Knowledge |
| Numbers | Knowledge (the workspace's proof points) | none |
| Deal | the open opportunity (stage, amount, close date, next step) | none |
