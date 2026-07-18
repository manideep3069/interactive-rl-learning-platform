// rl-lib.js — shared engine: progress/XP/streaks/goals + KaTeX + code highlighting + toasts
(function () {
  if (window.RL) return;
  var KEY = 'lbrl_state_v1';
  function iso(d) { return d.toISOString().slice(0, 10); }

  var CHAPTERS = [
    { id: 'ch1', n: 1, file: 'Ch1-Foundations.dc.html', title: 'Foundations', blurb: 'Agents, environments, MDPs, returns, value functions and the Bellman equations.', topics: ['MDP', 'Return', 'Value', 'Bellman'], mins: 45 },
    { id: 'ch2', n: 2, file: 'Ch2-Dynamic-Programming.dc.html', title: 'Dynamic Programming', blurb: 'Planning with a known model: policy evaluation, policy iteration, value iteration — with proofs.', topics: ['Policy evaluation', 'Policy iteration', 'Value iteration'], mins: 40 },
    { id: 'ch3', n: 3, file: 'Ch3-Tabular-Learning.dc.html', title: 'Tabular Learning', blurb: 'Learning from experience: MC, TD, SARSA, Q-learning, n-step and eligibility traces.', topics: ['MC', 'TD', 'SARSA', 'Q-learning', 'Traces'], mins: 50, code: 'tabular.py' },
    { id: 'ch4', n: 4, file: 'Ch4-DQN.dc.html', title: 'Deep Q-Networks', blurb: 'Value learning with neural nets: the deadly triad, replay buffers and target networks.', topics: ['Function approx.', 'Replay buffer', 'Target network'], mins: 45, code: 'dqn.py' },
    { id: 'ch5', n: 5, file: 'Ch5-Policy-Gradients.dc.html', title: 'Policy Gradients', blurb: 'The policy gradient theorem, derived — then SPG, REINFORCE, baselines and GAE.', topics: ['PG theorem', 'REINFORCE', 'Baselines', 'GAE'], mins: 55, code: 'spg.py · reinforce.py · vpg.py' },
    { id: 'ch6', n: 6, file: 'Ch6-PPO.dc.html', title: 'PPO', blurb: 'Importance sampling, the clipped surrogate objective, and every implementation trick.', topics: ['Importance sampling', 'Clipping', 'Implementation'], mins: 50, code: 'ppo.py' }
  ];

  var LEVELS = [
    [0, 'Random Policy'], [60, 'ε-Greedy Explorer'], [150, 'Value Estimator'],
    [300, 'TD Learner'], [500, 'Policy Improver'], [800, 'Advantage Seeker'],
    [1200, 'Trust-Region Tactician'], [1700, 'Optimal Policy π*']
  ];

  var GOALS = {
    daily: [
      { id: 'd1', text: 'Read one lesson section' },
      { id: 'd2', text: 'Review 5 flashcards' },
      { id: 'd3', text: 'Answer 3 quiz questions' }
    ],
    weekly: [
      { id: 'w1', text: 'Finish one chapter' },
      { id: 'w2', text: 'Score 80%+ on a quiz' },
      { id: 'w3', text: 'Read one resource from the library' }
    ],
    monthly: [
      { id: 'm1', text: 'Complete one project' },
      { id: 'm2', text: 'Re-derive the policy gradient from memory' },
      { id: 'm3', text: 'Explain Q-learning to a friend' }
    ]
  };

  var PROJECTS = [
    { id: 'p1', title: 'Melt FrozenLake', file: 'algos/value_based/tabular.py', xp: 100, desc: 'Run tabular Q-learning on FrozenLake-v1 until greedy eval return ≥ 0.70. Then switch --algo sarsa with the same seed and explain the gap you see.' },
    { id: 'p2', title: 'Balance CartPole with DQN', file: 'algos/value_based/dqn.py', xp: 100, desc: 'Train DQN to an episodic return of 475+. Then remove the target network (target_network_frequency=1) and plot what happens to the loss.' },
    { id: 'p3', title: 'Variance safari', file: 'algos/policy_based/spg.py + reinforce.py', xp: 100, desc: 'Train SPG and REINFORCE on CartPole with identical seeds. Compare the return curves and explain, in writing, why reward-to-go wins.' },
    { id: 'p4', title: 'PPO, tuned by hand', file: 'algos/policy_based/ppo.py', xp: 100, desc: 'Run PPO on CartPole. Set clip_coef to 0.05, then 0.5 — predict what happens to clipfrac and approx_kl before you look.' }
  ];

  function get() {
    var s = {};
    try { s = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { s = {}; }
    s.xp = s.xp || 0; s.visits = s.visits || {}; s.ch = s.ch || {}; s.cards = s.cards || 0;
    s.goals = s.goals || {}; s.goals.custom = s.goals.custom || []; s.goals.done = s.goals.done || {}; s.goals.awarded = s.goals.awarded || {};
    s.projects = s.projects || {};
    return s;
  }
  function save(s) { localStorage.setItem(KEY, JSON.stringify(s)); ping(); }
  function ping() { try { window.dispatchEvent(new CustomEvent('rl:change')); } catch (e) {} }

  // ---- toasts / confetti -------------------------------------------------
  var toastCount = 0;
  function toast(txt, color) {
    var t = document.createElement('div');
    t.textContent = txt;
    var off = 24 + (toastCount++ % 4) * 52;
    var st = t.style;
    st.position = 'fixed'; st.right = '24px'; st.bottom = off + 'px'; st.zIndex = 9999;
    st.background = color || 'var(--color-accent)'; st.color = '#fff';
    st.fontFamily = 'var(--font-body, sans-serif)'; st.fontWeight = '700'; st.fontSize = '14px';
    st.padding = '10px 20px'; st.borderRadius = '999px'; st.boxShadow = 'var(--shadow-lg)';
    st.transition = 'all .45s ease'; st.opacity = '0'; st.transform = 'translateY(12px)';
    document.body.appendChild(t);
    requestAnimationFrame(function () { st.opacity = '1'; st.transform = 'translateY(0)'; });
    setTimeout(function () { st.opacity = '0'; st.transform = 'translateY(12px)'; setTimeout(function () { t.remove(); toastCount--; }, 500); }, 2000);
  }
  function confetti() {
    var colors = ['#c67139', '#7a8a5e', '#e0a980', '#a8b892', '#d9c27a'];
    for (var i = 0; i < 50; i++) {
      (function (i) {
        var d = document.createElement('div');
        var sz = 6 + Math.random() * 9;
        var st = d.style;
        st.position = 'fixed'; st.left = (Math.random() * 100) + 'vw'; st.top = '-24px';
        st.width = sz + 'px'; st.height = sz + 'px'; st.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        st.background = colors[i % colors.length]; st.zIndex = 9998; st.pointerEvents = 'none';
        st.transition = 'transform ' + (1.3 + Math.random() * 1.4) + 's cubic-bezier(.2,.6,.4,1), opacity .5s ' + (1.5 + Math.random()) + 's';
        document.body.appendChild(d);
        requestAnimationFrame(function () {
          st.transform = 'translateY(' + (70 + Math.random() * 40) + 'vh) rotate(' + (Math.random() * 540 - 270) + 'deg)';
          st.opacity = '0';
        });
        setTimeout(function () { d.remove(); }, 3200);
      })(i);
    }
  }

  // ---- XP / levels / streaks --------------------------------------------
  function addXP(n, label) {
    if (!n) return;
    var s = get(); s.xp += n; save(s);
    toast('+' + n + ' XP' + (label ? ' · ' + label : ''));
  }
  function levelInfo() {
    var x = get().xp, i = 0;
    while (i < LEVELS.length - 1 && x >= LEVELS[i + 1][0]) i++;
    var next = LEVELS[i + 1];
    return {
      n: i + 1, name: LEVELS[i][1], xp: x,
      next: next ? next[0] : null, nextName: next ? next[1] : null,
      pct: next ? Math.min(100, Math.round(100 * (x - LEVELS[i][0]) / (next[0] - LEVELS[i][0]))) : 100
    };
  }
  function markVisit() {
    var s = get(), k = iso(new Date());
    if (!s.visits[k]) { s.visits[k] = 1; save(s); }
  }
  function streak() {
    var s = get(), n = 0, d = new Date();
    while (s.visits[iso(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  // ---- chapters ----------------------------------------------------------
  function chData(s, id) { s.ch[id] = s.ch[id] || { lesson: false, quiz: 0, cards: 0 }; return s.ch[id]; }
  function completeLesson(id) {
    var s = get(), c = chData(s, id);
    if (!c.lesson) { c.lesson = true; s.xp += 50; save(s); toast('+50 XP · lesson complete'); confetti(); }
  }
  function lessonDone(id) { return !!chData(get(), id).lesson; }
  function recordQuiz(id, score, total) {
    var s = get(), c = chData(s, id), f = total ? score / total : 0;
    if (f > c.quiz) c.quiz = f;
    save(s);
  }
  function quizBest(id) { return chData(get(), id).quiz; }
  function bumpCard(id) { var s = get(), c = chData(s, id); c.cards++; s.cards++; save(s); }
  function chapterPct(id) {
    var s = get(), c = chData(s, id);
    return Math.round(100 * (0.5 * (c.lesson ? 1 : 0) + 0.35 * Math.min(1, c.quiz) + 0.15 * Math.min(1, c.cards / 6)));
  }

  // ---- goals ---------------------------------------------------------------
  function pkey(period) {
    var d = new Date();
    if (period === 'daily') return iso(d);
    if (period === 'monthly') return d.toISOString().slice(0, 7);
    var t = new Date(d.valueOf()); t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7));
    var w1 = new Date(t.getFullYear(), 0, 4);
    var wn = 1 + Math.round(((t - w1) / 864e5 - 3 + ((w1.getDay() + 6) % 7)) / 7);
    return t.getFullYear() + '-W' + wn;
  }
  function goalList(period) {
    var s = get();
    return GOALS[period].concat(s.goals.custom.filter(function (g) { return g.period === period; }));
  }
  function goalDone(period, id) { return !!get().goals.done[period + ':' + pkey(period) + ':' + id]; }
  function toggleGoal(period, id) {
    var s = get(), k = period + ':' + pkey(period) + ':' + id;
    if (s.goals.done[k]) { delete s.goals.done[k]; save(s); }
    else {
      s.goals.done[k] = 1;
      var ak = 'a:' + k;
      if (!s.goals.awarded[ak]) { s.goals.awarded[ak] = 1; s.xp += 5; toast('+5 XP · goal done'); }
      save(s);
    }
  }
  function addCustomGoal(period, text) {
    text = (text || '').trim(); if (!text) return;
    var s = get();
    s.goals.custom.push({ id: 'c' + Date.now(), period: period, text: text });
    save(s);
  }
  function removeCustomGoal(id) {
    var s = get();
    s.goals.custom = s.goals.custom.filter(function (g) { return g.id !== id; });
    save(s);
  }

  // ---- projects ------------------------------------------------------------
  function projectDone(id) { return !!get().projects[id]; }
  function toggleProject(id) {
    var s = get();
    if (s.projects[id]) { delete s.projects[id]; save(s); }
    else {
      s.projects[id] = 1;
      var ak = 'pa:' + id;
      if (!s.goals.awarded[ak]) { s.goals.awarded[ak] = 1; s.xp += 100; toast('+100 XP · project shipped!'); confetti(); }
      save(s);
    }
  }

  // ---- badges ----------------------------------------------------------------
  function badges() {
    var s = get();
    var allLessons = CHAPTERS.every(function (c) { return chData(s, c.id).lesson; });
    var bestQuiz = Math.max.apply(null, [0].concat(CHAPTERS.map(function (c) { return chData(s, c.id).quiz; })));
    var stk = streak();
    return [
      { id: 'spark', icon: 'sprout', name: 'First Sprout', desc: 'Earn your first XP', ok: s.xp > 0 },
      { id: 'streak3', icon: 'flame', name: 'Warm Streak', desc: 'Study 3 days in a row', ok: stk >= 3 },
      { id: 'streak7', icon: 'sun', name: 'Full Week', desc: 'Study 7 days in a row', ok: stk >= 7 },
      { id: 'quiz80', icon: 'target', name: 'Sharp Shooter', desc: 'Score 80%+ on a quiz', ok: bestQuiz >= 0.8 },
      { id: 'perfect', icon: 'award', name: 'Flawless', desc: 'A perfect quiz score', ok: bestQuiz >= 1 },
      { id: 'cards30', icon: 'layers', name: 'Card Shark', desc: 'Review 30 flashcards', ok: s.cards >= 30 },
      { id: 'book', icon: 'book-open', name: 'Bookworm', desc: 'Finish every lesson', ok: allLessons },
      { id: 'pistar', icon: 'crown', name: 'π*', desc: 'Reach 1,700 XP', ok: s.xp >= 1700 }
    ];
  }

  // ---- KaTeX -------------------------------------------------------------
  function renderMath(root) {
    var go = function () {
      var scope = root || document;
      var els = scope.querySelectorAll('[data-tex]:not([data-texed])');
      for (var i = 0; i < els.length; i++) {
        var el = els[i];
        try {
          window.katex.render(el.getAttribute('data-tex'), el, { throwOnError: false, displayMode: el.hasAttribute('data-display') });
          el.setAttribute('data-texed', '1');
        } catch (e) {}
      }
    };
    if (window.katex) { go(); return; }
    var n = 0;
    var t = setInterval(function () {
      if (window.katex || n++ > 100) { clearInterval(t); if (window.katex) go(); }
    }, 100);
  }

  // ---- Python highlighter --------------------------------------------------
  function esc(t) { return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function hl(src) {
    src = esc(src || '');
    var re = /(#[^\n]*)|("""[\s\S]*?"""|f?"[^"\n]*"|f?'[^'\n]*')|\b(def|class|return|if|elif|else|for|while|in|not|and|or|import|from|as|with|break|continue|pass|lambda|None|True|False|is|assert|yield|try|except|raise|global|del)\b|\b(\d[\d_]*\.?[\d_]*(?:e-?\d+)?)\b/g;
    return src.replace(re, function (m, c, s, k, n) {
      if (c) return '<span style="color:#9aa87d;font-style:italic;">' + c + '</span>';
      if (s) return '<span style="color:#e2a677;">' + s + '</span>';
      if (k) return '<span style="color:#e58a5e;font-weight:600;">' + k + '</span>';
      if (n) return '<span style="color:#dcbf7c;">' + n + '</span>';
      return m;
    });
  }
  function codeInit(root) {
    var pres = (root || document).querySelectorAll('pre[data-code]:not([data-hl])');
    for (var i = 0; i < pres.length; i++) {
      pres[i].setAttribute('data-hl', '1');
      pres[i].innerHTML = hl(pres[i].textContent);
    }
  }

  function icons() {
    if (window.lucide && window.lucide.createIcons) {
      try { window.lucide.createIcons({ attrs: { 'stroke-width': 2.75 } }); } catch (e) {}
    }
  }
  function paint(root) { renderMath(root); codeInit(root); icons(); }

  window.RL = {
    CHAPTERS: CHAPTERS, LEVELS: LEVELS, GOALS: GOALS, PROJECTS: PROJECTS,
    get: get, save: save, addXP: addXP, levelInfo: levelInfo, streak: streak, markVisit: markVisit,
    completeLesson: completeLesson, lessonDone: lessonDone, recordQuiz: recordQuiz, quizBest: quizBest,
    bumpCard: bumpCard, chapterPct: chapterPct,
    goalList: goalList, goalDone: goalDone, toggleGoal: toggleGoal, addCustomGoal: addCustomGoal, removeCustomGoal: removeCustomGoal,
    projectDone: projectDone, toggleProject: toggleProject, badges: badges,
    renderMath: renderMath, codeInit: codeInit, hl: hl, esc: esc, icons: icons, paint: paint,
    toast: toast, confetti: confetti
  };
  markVisit();
})();

// Theme (dark mode) — the boot script in each page's <head> sets
// data-theme before first paint; this adds the floating toggle and
// lets interactive canvases repaint via the 'rl-theme-change' event.
(function () {
  function current() { return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'; }
  function icon(t) {
    return t === 'dark'
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m12.73-12.73 1.41-1.41"/></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
  }
  function label(t) { return t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'; }
  function apply(t) {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('rl-theme', t); } catch (e) {}
    var b = document.getElementById('rl-theme-toggle');
    if (b) { b.innerHTML = icon(t); b.setAttribute('aria-label', label(t)); b.title = label(t); }
    try { window.dispatchEvent(new Event('rl-theme-change')); } catch (e) {}
  }
  function init() {
    if (document.getElementById('rl-theme-toggle')) return;
    var t = current();
    var btn = document.createElement('button');
    btn.id = 'rl-theme-toggle';
    btn.type = 'button';
    btn.innerHTML = icon(t);
    btn.setAttribute('aria-label', label(t));
    btn.title = label(t);
    btn.style.cssText = 'position:fixed;bottom:18px;right:18px;z-index:2147483000;' +
      'width:44px;height:44px;border-radius:50%;display:grid;place-content:center;cursor:pointer;' +
      'background:var(--color-surface);color:var(--color-text);border:1px solid var(--color-divider);' +
      'box-shadow:var(--shadow-md);';
    btn.onclick = function () { apply(current() === 'dark' ? 'light' : 'dark'); };
    document.body.appendChild(btn);
  }
  if (window.RL) window.RL.setTheme = apply;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
