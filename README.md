# The Little Book of RL — Interactive Learning Platform

An interactive companion to *The Little Book of Reinforcement Learning* — six chapters from MDPs to PPO, with quizzes, flashcards, a live gridworld, and XP-based progress tracking (stored in `localStorage`).

## Structure

- `Home.dc.html` — landing page (the root URL redirects here)
- `Ch1-Foundations.dc.html` … `Ch6-PPO.dc.html` — the six chapters
- `ChapterNav.dc.html`, `Quiz.dc.html`, `Flashcards.dc.html` — shared components loaded by the chapter pages
- `rl-lib.js` — shared XP / progress / quiz logic
- `support.js` — page runtime (renders the `.dc.html` templates)
- `_ds/` — design-system styles and bundle

## Running locally

It's a fully static site — serve the folder with any static file server:

```sh
python3 -m http.server 4173
# then open http://localhost:4173/Home.dc.html
```

## Deploying

Deployed on Vercel as a static site — no build step. `vercel.json` redirects `/` to `/Home.dc.html`.
