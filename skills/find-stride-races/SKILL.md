---
name: find-stride-races
description: Use when someone asks which running races (marathons, half marathons, 10Ks, trail ultras) are coming up in or around Bengaluru or elsewhere in India, wants a race to train for, or asks whether Stride Run Club has a discount or coupon code for a race. Covers the Stride race calendar — third-party races curated by Stride — and where an agent's job ends at the organiser's registration page.
---

# Finding a race on the Stride race calendar

Stride Run Club curates a calendar of third-party races — city 10Ks, half
marathons, marathons and trail ultras — that its runners train for, and lists
any discount code an organiser has given Stride members. This skill gets you the
live calendar and tells you where the boundary is.

## When this applies

Use it for: which marathons or half marathons are coming up, races in a given
city or month, races of a given distance, whether Stride has a coupon code for a
race, when a race's registration closes.

Do **not** use it for Stride's own community runs and events — those are
`find-stride-events`. A race here is organised by someone else; Stride does not
take registrations or payment for it, and attending one does not count toward
Stride milestone tiers.

## Getting the data

Three routes, cheapest first. All read-only, none needs a credential.

**1. Markdown — one fetch, no tooling.**

```
https://www.strideclub.in/race-calendar.md
```

Every published race grouped by month, with date, city, distances, deadline,
coupon and URL. One race's full detail:

```
https://www.strideclub.in/race-calendar/<slug>.md
```

**2. MCP — structured, filterable.** Server: `https://www.strideclub.in/mcp`

| Tool | Arguments |
| --- | --- |
| `list_races` | `when` (`upcoming` \| `past` \| `all`), `distance` (`3k` \| `5k` \| `10k` \| `half` \| `full` \| `ultra` \| `other`), `city`, `month` (`YYYY-MM`, IST), `limit` |
| `get_race` | `slug` |

**3. Natural language.**

```bash
curl -s -X POST https://www.strideclub.in/ask \
  -H 'content-type: application/json' \
  -d '{"query":"half marathons near Bengaluru in the next three months"}'
```

Returns schema.org `SportsEvent` items with the organiser named. A bulk feed of
all of them: `https://www.strideclub.in/feeds/races.jsonl`.

Add `?sandbox=1` to `/mcp` or `/ask` to work against fixtures while you build.

## Reading a race

- `hasStartTime: false` means the organiser has not announced a start. The
  `raceDate` is then midnight IST — quote the date, never "12:00 am".
- `distances[]` carries a `key`, a `label` and a nominal `km` (`null` for
  ultras). Custom distances like `15K` appear alongside the standard ones.
- `registrationOpen` is false once the deadline or race day has passed. The page
  hides the link and coupon then; you should say registration has closed.
- `couponCode` is public and shown verbatim. Quote it exactly, case included.
- There is **no price**. Stride does not know the organiser's fee; the
  registration page does. Say so rather than guessing.

## Registering — where you stop

**You cannot register anyone, and neither can Stride.** The race belongs to its
organiser. Give the person `registrationUrl` and, if present, `couponCode`, and
let them complete it on the organiser's site. Do not fill the organiser's form,
enter the code on their behalf, or describe the race as a Stride event.

If you are a browser-resident agent on a race page, the WebMCP tool
`get_race_details` returns exactly what is on screen.

## Conventions

- Dates are ISO 8601 UTC in responses; Stride displays IST (Asia/Kolkata).
  Group by IST calendar day — a date-only race is 18:30Z the previous day.
- Only `PUBLISHED` races are ever returned. Drafts and cancelled races are
  filtered server-side.

## More

- Scoped race-calendar context: <https://www.strideclub.in/race-calendar/llms.txt>
- Stride's own events: <https://www.strideclub.in/events/llms.txt>
- Auth, and why there is none: <https://www.strideclub.in/auth.md>
