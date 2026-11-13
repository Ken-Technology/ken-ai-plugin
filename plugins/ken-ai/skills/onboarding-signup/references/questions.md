# Setup questions

Every question the build asks has the same shape: `questionId`, `kind` (`single` or `multi`), `prompt`, an optional `context`, 2 to 5 `choices` (`id`, `label`, optional `detail`, `guess`), and `somethingElse`. Answer with the question's `questionId` and the `id` of each chosen choice. Generated questions have ids like `q_1` and the same shape.

| questionId | kind | choices (id: label) | something else |
|---|---|---|---|
| `read` | multi | `looks_right`: Looks right; `product`: The product is off; `buyer`: The buyer is off; `market`: The market is off; `size`: The company size is off | yes, the correction |
| `experience` | single | `never`: Never done outbound; `some`: A few times; `pro`: It's my job; `agency`: I run outbound for clients | no |
| `goal` | single | `accounts`: A few big accounts; `campaigns`: Many accounts at volume; `both`: Both | no |
| `deal_size` | single | `lt_1k`: Under $1k; `1k_5k`: $1k to $5k; `5k_25k`: $5k to $25k; `25k_100k`: $25k to $100k; `gt_100k`: Over $100k | no |
| `skip_accounts` | multi | one choice per detected customer or competitor: `id` is the account id, `label` the company, `detail` says `customer` or `competitor` | no |
| `stack_crm` | single | `yes`: Yes, that's our CRM; `other`: No, we use another; `none`: No CRM yet | no |
| `stack_scheduler` | single | `yes`, `other`, `none` | no |
| `stack_notetaker` | single | `yes`, `other`, `none` | no |
| `approval_mode` | single | `every_touch`: I approve every touch; `batches`: I approve batches; `auto_after_samples`: Auto-send after I approve samples; `agency_split`: I approve ours, clients approve theirs | no |
| `performance_help` | single | `book_call`: Yes, book a call; `not_now`: Not now | no |
| `recruiting_role` | single | `careers_page`: Read my careers page; `paste_jd`: I'll paste the job description; `describe`: I'll describe the role | yes |

`teammate_role` is asked only of a teammate a workspace invited, never in a sign-up.

A question leaves `openQuestions` once it is answered or once the stage named in its `expiresWith` finishes. Never answer a question for the person, and never send an email address in `text`.
