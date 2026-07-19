#!/usr/bin/env python3
"""Weekly Research Radar sweep.

Fetches the newest reinforcement-learning papers from the arXiv API,
tags each with the site chapter it extends (same keyword heuristic the
ResearchRadar page uses), writes radar/feed.json, and appends a
changelog entry to radar/updates.json describing what changed.

Stdlib only — no dependencies. Optionally, if ANTHROPIC_API_KEY is set,
asks Claude for a one-paragraph weekly digest that is added to the
changelog entry (curation stays advisory: lesson text is never edited).
"""
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from xml.etree import ElementTree

ROOT = os.path.dirname(os.path.abspath(__file__))
FEED = os.path.join(ROOT, "feed.json")
UPDATES = os.path.join(ROOT, "updates.json")

ATOM = "{http://www.w3.org/2005/Atom}"

TAG_RULES = [
    (r"rlhf|dpo\b|grpo|rlvr|verifiable reward|preference|reward model|alignment|reasoning (model|llm)|language model|llm", "ch11"),
    (r"agent|tool[- ]use|multi[- ]agent|swe[- ]?bench|computer[- ]use|web navigation|gui", "ch12"),
    (r"offline|batch rl|behavior clon|imitation|inverse rl|decision transformer|\bcql\b|\biql\b", "ch10"),
    (r"explorat|bandit|curiosity|intrinsic|count[- ]based|regret|thompson|\bucb\b", "ch9"),
    (r"world model|model[- ]based|monte carlo tree|\bmcts\b|muzero|alphazero|dreamer|latent dynamics|planning", "ch8"),
    (r"soft actor|\bsac\b|\btd3\b|ddpg|continuous control|locomotion|manipulation|robot", "ch7"),
    (r"\bppo\b|proximal policy|trust region|policy gradient|actor[- ]critic|\bgae\b", "ch6"),
    (r"\bdqn\b|q[- ]learning|value[- ]based|distributional rl|rainbow", "ch4"),
    (r"temporal difference|sarsa|eligibility trace|monte carlo method", "ch3"),
]

CHAPTER_NAMES = {
    "ch3": "Tabular Learning", "ch4": "Value Learning", "ch6": "PPO & Policy Gradients",
    "ch7": "Continuous Control", "ch8": "Model-Based RL", "ch9": "Exploration",
    "ch10": "Offline RL", "ch11": "RL for LLMs", "ch12": "Agentic RL",
}


def tags_for(text):
    out = []
    for pattern, chapter in TAG_RULES:
        if re.search(pattern, text, re.I):
            out.append(chapter)
        if len(out) >= 2:
            break
    return out


def fetch_arxiv(max_results=60):
    query = ('(cat:cs.LG OR cat:cs.AI OR cat:cs.RO OR cat:cs.CL) AND '
             '(abs:"reinforcement learning" OR ti:"reinforcement learning" OR abs:RLHF OR abs:RLVR)')
    url = ("https://export.arxiv.org/api/query?search_query=" + urllib.parse.quote(query) +
           f"&sortBy=submittedDate&sortOrder=descending&max_results={max_results}")
    req = urllib.request.Request(url, headers={"User-Agent": "rl-learning-platform-radar/1.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        tree = ElementTree.fromstring(resp.read())
    papers = []
    for entry in tree.findall(ATOM + "entry"):
        def text(tag):
            node = entry.find(ATOM + tag)
            return re.sub(r"\s+", " ", node.text or "").strip() if node is not None else ""
        title = text("title")
        summary = text("summary")
        papers.append({
            "id": text("id"),
            "url": text("id"),
            "title": title,
            "published": text("published"),
            "summary": summary[:500],
            "chapters": tags_for(title + " " + summary),
        })
    return papers


def claude_digest(new_papers):
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key or not new_papers:
        return None
    listing = "\n".join(f"- {p['title']} ({', '.join(CHAPTER_NAMES.get(c, c) for c in p['chapters']) or 'general'})"
                        for p in new_papers[:15])
    body = json.dumps({
        "model": "claude-sonnet-5",
        "max_tokens": 400,
        "messages": [{"role": "user", "content":
                      "You maintain the Research Radar of an interactive RL learning site whose chapters run "
                      "from MDPs through PPO, continuous control, model-based RL, exploration, offline RL, "
                      "RLHF/GRPO/RLVR and agentic RL. Here are this week's new arXiv papers:\n" + listing +
                      "\n\nWrite ONE paragraph (max 90 words) for learners: what this week's crop says about "
                      "where the field is moving, referencing chapter areas by name. No preamble."}],
    }).encode()
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages", data=body,
        headers={"content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01"})
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.load(resp)
        return data["content"][0]["text"].strip()
    except Exception as exc:  # advisory only — never fail the sweep over it
        print(f"claude digest skipped: {exc}", file=sys.stderr)
        return None


def main():
    papers = fetch_arxiv()
    if not papers:
        print("arXiv returned nothing; keeping existing feed untouched")
        return

    old_ids = set()
    if os.path.exists(FEED):
        try:
            with open(FEED) as fh:
                old_ids = {p["id"] for p in json.load(fh).get("papers", [])}
        except Exception:
            pass

    new_papers = [p for p in papers if p["id"] not in old_ids]
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")

    with open(FEED, "w") as fh:
        json.dump({"generated": now, "papers": papers[:40]}, fh, indent=1)

    if new_papers:
        updates = []
        if os.path.exists(UPDATES):
            try:
                with open(UPDATES) as fh:
                    updates = json.load(fh)
            except Exception:
                updates = []
        by_chapter = {}
        for p in new_papers:
            for c in (p["chapters"] or ["general"]):
                by_chapter[c] = by_chapter.get(c, 0) + 1
        counts = ", ".join(f"{CHAPTER_NAMES.get(c, 'general')}: {n}"
                           for c, n in sorted(by_chapter.items(), key=lambda kv: -kv[1]))
        items = [f"{len(new_papers)} new papers since the last sweep ({counts})"]
        items += [f"“{p['title']}” — {', '.join(CHAPTER_NAMES.get(c, c) for c in p['chapters']) or 'general RL'}"
                  for p in new_papers[:5]]
        digest = claude_digest(new_papers)
        if digest:
            items.append("Weekly read: " + digest)
        updates.insert(0, {
            "date": now[:10],
            "title": f"Radar sweep: {len(new_papers)} new papers mapped to the curriculum",
            "items": items,
        })
        with open(UPDATES, "w") as fh:
            json.dump(updates[:52], fh, indent=1)

    print(f"feed: {len(papers)} papers ({len(new_papers)} new)")


if __name__ == "__main__":
    main()
