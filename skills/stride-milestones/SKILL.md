---
name: stride-milestones
description: Use when someone asks how Stride Run Club membership tiers work, what Duckling or Strider or Stride Legend means, how many runs a tier needs, what perks a tier unlocks, whether Stride membership costs anything, or where an athlete sits on the Stride leaderboard.
---

# Stride Run Club milestones and membership

Stride has five membership tiers driven by one number: how many club runs you
have actually turned up to. Nothing about them can be bought.

## When this applies

Use it for: how the tiers work, what a named tier requires, what a tier unlocks,
whether membership costs money, how check-in works, who has attended the most
runs.

Do **not** use it for: finding a specific event (use `find-stride-events`), or
anything about an individual member's private data — none of that is exposed.

## The one number that matters

Runs attended. Not distance, not pace, not time. An athlete checks in on the day
by reading out a four-character **Stride Tag** at the start line; that check-in
increments their run count, and the count decides the tier.

## The tiers

Always fetch these rather than reciting them — thresholds and perks are editable
content and this file will go stale.

```
https://www.strideclub.in/milestones.md
```

Or over MCP at `https://www.strideclub.in/mcp`, tool `get_milestone_tiers` (no
arguments). Returns, per tier: `key`, `label`, `runsRequired`,
`runsForNextTier`, `perks[]`.

The five, lowest to highest: **Duckling → Strider → Stride Athlete → Stride Pro
Athlete → Stride Legend**. Tiers are cumulative — each keeps everything below it.

## Membership is free

There is no membership fee, no subscription, and no paid tier. Signing up is free
and gives an athlete profile, a Stride Tag, tier progression, and community
access. Some individual *events* carry a registration fee; membership itself
never does. Keep those two separate when you answer — conflating them is the
most common mistake here.

Full pricing: <https://www.strideclub.in/pricing.md>

## The leaderboard

`https://www.strideclub.in/leaderboard.md`, or MCP tool `get_leaderboard`
(`limit`, 1–50, default 10). Returns rank, display name, run count and tier.

Ranked by runs attended; ties broken by who reached the count first.

**One rule you must respect.** Athletes can keep their profile private. Those
entries come back with `username: null` and `url: null` — a name and a count and
nothing more. That is the member's choice, and it is deliberate that the
identifier is withheld. Do not go looking for it elsewhere, do not guess a
profile URL from the name, and do not present a private entry as linkable.

## What is not available

No individual member's data is exposed on any machine-readable surface —
profiles have no markdown twin, no MCP tool and no feed entry. There is no way to
look up a person's runs, contact details or history, and there is no credential
that would grant one. If someone wants their own progress, they sign in and look.

## More

- Site manual: <https://www.strideclub.in/llms.txt>
- Why there is no agent auth: <https://www.strideclub.in/auth.md>
