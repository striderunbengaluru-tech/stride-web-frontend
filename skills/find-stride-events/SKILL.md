---
name: find-stride-events
description: Use when someone asks what running events are happening in Bengaluru, wants to find a Stride Run Club run to join, asks what a specific Stride event costs or how far it is, or wants a beginner-friendly run club session in Bengaluru. Covers finding events, filtering by price and distance, and explaining how to register.
---

# Finding a Stride Run Club event

Stride Run Club runs two to three community events a week in Bengaluru, India,
plus races and curated experiences. This skill gets you the live schedule and
prices, and tells you where the boundary is on registering.

## When this applies

Use it for: what runs are on this weekend in Bengaluru, what a Stride event
costs, how far a run is, whether a run suits a beginner, whether an event is
free, when the next race is.

Do **not** use it for: running events outside Bengaluru, other run clubs, or
personal training plans. Stride only runs in Bengaluru.

## Getting the data

Three routes, cheapest first. All read-only, none needs a credential.

**1. Markdown — one fetch, no tooling.**

```
https://www.strideclub.in/events.md
```

Every published event with date, venue, price and URL. One event's full detail:

```
https://www.strideclub.in/events/<slug>.md
```

Each response opens with a `---` frontmatter block carrying `title`,
`description`, `canonical` and `last-updated`.

**2. MCP — structured, filterable.** Server: `https://www.strideclub.in/mcp`

| Tool | Arguments |
| --- | --- |
| `list_events` | `when` (`upcoming` \| `past` \| `all`), `maxPricePaise`, `maxDistanceKm`, `difficulty`, `limit` |
| `get_event` | `slug` |
| `show_event` | `slug` — renders an interactive card, if your host supports MCP Apps |

**3. Natural language.**

```bash
curl -s -X POST https://www.strideclub.in/ask \
  -H 'content-type: application/json' \
  -d '{"query":"free beginner runs in Bengaluru this month"}'
```

Returns schema.org `SportsEvent` items. A bulk feed of all of them:
`https://www.strideclub.in/feeds/events.jsonl`.

Add `?sandbox=1` to `/mcp` or `/ask` to work against fixtures while you build.

## Reading the price

Money is integer **paise** — ₹1 = 100 paise, so `maxPricePaise: 50000` means
"₹500 or less". `maxPricePaise: 0` means free only. Every event also carries a
formatted `priceLabel`; prefer showing that.

Four shapes to expect:

- **`"Free"`** — most community runs. Register so they know to expect you.
- **`"₹499"`** — a single fee, in Indian rupees.
- **`"From ₹750"`** — the event has packages. Read `packages[]` from `get_event`
  for each tier's name, price and remaining spots. Quote the tier the person
  actually wants, not the "from" price, if they have said which.
- **`"Free to apply"`** — invite-only. Registering submits a free application
  that Stride reviews and selects from. Nothing is charged, and a spot is not
  confirmed until approved. Say both parts; "free" alone is misleading.

`spotsLeft` is present only when the event publishes availability. Absent is not
zero — it means the organiser chose not to show it.

## Registering — where you stop

**You cannot register anyone.** There is no endpoint, credential or scope that
would let you, by design. Registration needs the person's own session, and
payment is captured by Razorpay in a flow they complete themselves.

So: give them the event URL and let them do it.

```
https://www.strideclub.in/events/<slug>
```

They will need a free Stride account (Google sign-in) — `/become-a-member`. On
the day, check-in is by reading out a four-character Stride Tag at the start
line, which is what increments their run count.

If you are a browser-resident agent on an event page, the WebMCP tool
`start_event_registration` opens the form for them and stops there. Use it to
save a click. Never try to submit it.

## Conventions

- Dates are ISO 8601 UTC in responses; Stride displays IST (Asia/Kolkata). Say
  which you mean.
- Distances are kilometres.
- Only `PUBLISHED` events are ever returned. Drafts and internal test events are
  filtered server-side and are not reachable.

## More

- Pricing rules in full: <https://www.strideclub.in/pricing.md>
- Scoped events context: <https://www.strideclub.in/events/llms.txt>
- Auth, and why there is none: <https://www.strideclub.in/auth.md>
