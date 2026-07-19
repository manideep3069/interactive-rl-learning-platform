# The Little Book of RL — Interactive Learning Platform

An interactive RL curriculum in twelve chapters — the six chapters of *The Little Book of Reinforcement Learning* (MDPs to PPO), then six more continuing to the frontier: continuous control, model-based RL, exploration, offline RL, RLHF→RLVR, and agentic RL. Quizzes, flashcards, a live gridworld, XP-based progress (stored in `localStorage`), and a Research Radar that tracks new arXiv papers against the syllabus.

## Structure

- `Home.dc.html` — landing page (the root URL redirects here)
- `Ch1-Foundations.dc.html` … `Ch12-Agentic-RL.dc.html` — the twelve chapters
- `ChapterNav.dc.html`, `Quiz.dc.html`, `Flashcards.dc.html` — shared components loaded by the chapter pages
- `ResearchRadar.dc.html` — live arXiv feed + curriculum changelog
- `radar/` — `update_radar.py` (weekly sweep), `feed.json` (curated snapshot), `updates.json` (changelog)
- `rl-lib.js` — shared XP / progress / quiz logic
- `support.js` — page runtime (renders the `.dc.html` templates)
- `_ds/` — design-system styles and bundle

## The Research Radar

Two mechanisms keep the curriculum current:

1. **Live:** `ResearchRadar.dc.html` queries arXiv's public API from the browser on every visit and tags each paper with the chapter it extends (transparent keyword heuristic).
2. **Weekly:** `.github/workflows/radar.yml` runs every Monday: it sweeps arXiv, refreshes `radar/feed.json`, and appends a changelog entry to `radar/updates.json` describing what's new. Lesson text is never auto-rewritten — the sweep proposes, the changelog discloses.

Optional repo secrets: `ANTHROPIC_API_KEY` (adds a Claude-written weekly digest to the changelog) and `VERCEL_TOKEN` (auto-deploys after each sweep; alternatively connect the repo to Vercel's Git integration).

## Running locally

It's a fully static site — serve the folder with any static file server:

```sh
python3 -m http.server 4173
# then open http://localhost:4173/Home.dc.html
```

## Deploying

Deployed on Vercel as a static site — no build step. `vercel.json` redirects `/` to `/Home.dc.html`.
