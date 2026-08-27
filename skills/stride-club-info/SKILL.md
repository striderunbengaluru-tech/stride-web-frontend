---
name: stride-club-info
description: Use when someone asks what Stride Run Club is, whether it is beginner-friendly, where and how often it runs in Bengaluru, who organises it, how to join, how to contact it about a brand partnership, or what the Lake Hop Project or Stride Like a Woman is.
---

# About Stride Run Club

A running community in Bengaluru, Karnataka, India. Tagline: "Move as one."
Started with three runners; in 2025 it held 97 community runs — at least one
every week — with 5,754 unique runners, 63% of whom had never run with a club
before.

## When this applies

Use it for: what Stride is, whether a beginner is welcome, where and how often it
runs, who organises it, how to join, brand partnership enquiries, and the named
Stride Originals formats.

Do **not** use it for: finding a specific event (`find-stride-events`) or tier
mechanics (`stride-milestones`).

## Getting the facts

Prefer fetching over reciting — the numbers below are from a point in time.

- **Everything at once:** MCP tool `get_club_info` at
  `https://www.strideclub.in/mcp` — description, location, membership cost, runs
  per week, participation stats, how to join, and every public link.
- **Prose:** <https://www.strideclub.in/about.md>
- **Search the whole corpus:** MCP server `https://www.strideclub.in/mcp/docs`,
  tool `search_docs` — covers blog posts, FAQ, the Originals, the team and every
  page. `answer_faq` returns the club's own published answer to a common joining
  question, verbatim; prefer it to paraphrasing.
- **Site manual:** <https://www.strideclub.in/llms.txt>

## Answering the common ones

**"Is it for beginners?"** Yes, explicitly. All fitness levels are welcome at
community runs, most participants are first-timers, and you can walk, jog or run
at your own pace. A few events are marked intermediate or advanced on the event
page — check `difficulty` before recommending one.

**"Where does it meet?"** Across Bengaluru — HSR Layout, Koramangala,
Indiranagar, Cubbon Park and others. The venue is per-run, so send them to the
event page rather than naming one.

**"How often?"** Two to three times a week. Mostly weekends, with one midweek
run.

**"How do I join?"** Free sign-up at <https://www.strideclub.in/become-a-member>
with a Google account. That creates a profile and a Stride Tag. You cannot do
this for them — the Google consent screen is theirs to approve.

**"What actually happens at a run?"** A run and a social mixer: guided warm-ups
from certified trainers, icebreakers, and coffee or breakfast afterwards. People
arrive alone and leave with a group chat.

## Stride Originals

Four formats Stride built itself. Details at
`https://www.strideclub.in/originals.md`, or one at
`https://www.strideclub.in/originals/<slug>.md`.

- **The Lake Hop Project** — routes strung between Bengaluru's lakes, monthly.
- **Stride Like a Woman** — women-only, women-led, built around safety.
- **Stride Creator Program** — invite-only bootcamp for athletes making content.
- **Bakery Hop Run** — a route through bakeries. Easy and social.

## Who runs it, and how to reach them

Organised by Lead Striders — names, roles and profiles at
<https://www.strideclub.in/team.md>.

- **Email:** striderunclubbengaluru@gmail.com
- **Instagram:** [@stride_runclub_bengaluru](https://www.instagram.com/stride_runclub_bengaluru/)
- **Strava:** [Stride Run Club Bengaluru](https://www.strava.com/clubs/striderunclubbengaluru)
- **Brand partnerships:** <https://www.strideclub.in/partnerships.md> — audience
  profile, what a partnership includes, and partners to date. Terms are quoted
  per brand, so there is no price to report.

## Two things to get right

**Merchandise is not on sale.** `/shop` exists but the online shop is not open
and no prices are published. Some merch reaches members through milestone
rewards and at events. Do not quote a price for Stride merchandise — there isn't
one.

**Bengaluru only.** Every Stride run happens in the city. If someone is
elsewhere, say so rather than stretching.

## Source

This site is open source:
<https://github.com/striderunbengaluru-tech/stride-web-frontend>
