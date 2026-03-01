/* Function Forge: Variables Lab — Cloudflare Pages Game Engine (v1.0.0)
   Single-pass, deterministic, premium baseline.

   Add future games by swapping QUESTION_BANK + skill tags.
*/

const CONFIG = Object.freeze({
  APP_NAME: "Function Forge: Variables Lab",
  VERSION: "1.0.0",
  DIAGNOSTICS: false,

  // Motion safety
  MICRO_ANIM_MS: 180,

  // Progression
  XP_CORRECT: 10,
  XP_BOSS: 25,
  STREAK_BONUS_AT: 5,
  XP_STREAK_BONUS: 20,

  // Adaptive rules
  LEVEL_UP_AT_XP: 120,
  BOSS_EVERY: 6,               // every N questions, boss appears
  TARGET_ACC_FOR_HARDER: 0.8,  // adaptive threshold

  // Save
  SAVE_KEY: "fforge_vars_v1_save",

  // Accessibility
  CLICK_TO_PLACE_FALLBACK: true,
});

function validateConfig(){
  const mustNum = ["MICRO_ANIM_MS","XP_CORRECT","XP_BOSS","LEVEL_UP_AT_XP","BOSS_EVERY"];
  for (const k of mustNum){
    if (typeof CONFIG[k] !== "number" || !Number.isFinite(CONFIG[k])) throw new Error(`CONFIG.${k} invalid`);
  }
}

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
function pct(n){ return Math.round(n * 100); }
function uid(){ return Math.random().toString(16).slice(2) + Date.now().toString(16); }

function safeJsonParse(s, fallback){
  try{ return JSON.parse(s); } catch{ return fallback; }
}

/* ------------------------------------------------------------------ */
/* SFX (No external assets)                                            */
/* ------------------------------------------------------------------ */
class SFX {
  constructor(){
    this.enabled = true;
    this.ctx = null;
  }
  _ctx(){
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    return this.ctx;
  }
  beep(freq=440, ms=90, type="sine", gain=0.05){
    if (!this.enabled) return;
    try{
      const ctx = this._ctx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = gain;
      o.connect(g); g.connect(ctx.destination);
      o.start();
      setTimeout(()=>{ o.stop(); }, ms);
    } catch { /* ignore */ }
  }
  ok(){ this.beep(660, 90, "triangle", 0.06); this.beep(880, 80, "triangle", 0.05); }
  bad(){ this.beep(220, 120, "sawtooth", 0.03); }
  click(){ this.beep(520, 40, "sine", 0.03); }
  boss(){ this.beep(392, 120, "square", 0.05); this.beep(523, 120, "square", 0.05); }
}

/* ------------------------------------------------------------------ */
/* Question Bank (Skill-tagged, extensible)                            */
/* ------------------------------------------------------------------ */
const QUESTION_BANK = [
  // --- Basics: contexts ---
  mcqContext("A plant grows each week. What is the independent variable?",
    ["height of the plant", "number of weeks", "amount of sunlight", "soil type"], 1,
    "Independent variable is what you choose or control: time (weeks)."
  ),
  mcqContext("A taxi charges $3 plus $2 per mile. What is the dependent variable?",
    ["number of miles", "taxi cost", "starting fee", "driver"], 1,
    "Cost depends on miles, so the dependent variable is the taxi cost."
  ),
  mcqContext("You bake cookies. The more batches you bake, the more cookies you have. Dependent variable?",
    ["number of batches", "oven temperature", "number of cookies", "cookie size"], 2,
    "Cookies depend on batches baked."
  ),

  // --- Tables ---
  mcqTable(
    "Table shows relationship between minutes and pages read.",
    [["Minutes", "Pages"], ["5","8"], ["10","16"], ["15","24"]],
    "Which is the independent variable?",
    ["Minutes","Pages","Both","Neither"], 0,
    "Minutes is the input. Pages depends on minutes."
  ),
  mcqTable(
    "A lemonade stand tracks cups sold and money earned.",
    [["Cups Sold","Money ($)"], ["10","15"], ["20","30"], ["30","45"]],
    "Which is the dependent variable?",
    ["Cups Sold","Money ($)","Both","Neither"], 1,
    "Money earned depends on cups sold."
  ),

  // --- Equations ---
  mcqEquation(
    "In the equation  C = 12 + 4t  (C is cost, t is tickets), which is independent?",
    "C = 12 + 4t",
    ["C","t","12","4"], 1,
    "t is the input (tickets). C depends on t."
  ),
  mcqEquation(
    "In the equation  d = 60h  (d is distance, h is hours), which is dependent?",
    "d = 60h",
    ["d","h","60","Both variables"], 0,
    "Distance depends on time."
  ),

  // --- Drag/Drop Matching (inputs/outputs) ---
  dragMatch(
    "Drag each label to the correct role.",
    ["Independent variable","Dependent variable"],
    [
      { token:"Input", target:0 },
      { token:"Output", target:1 },
      { token:"What you control/choose", target:0 },
      { token:"What changes because of input", target:1 },
    ],
    "Independent = input (you choose). Dependent = output (changes)."
  ),

  dragMatch(
    "Sort the variables for this situation: 'Total pay depends on hours worked.'",
    ["Independent","Dependent"],
    [
      { token:"Hours worked", target:0 },
      { token:"Total pay", target:1 },
      { token:"Hourly rate (constant)", target:null }, // decoy
      { token:"Time of day", target:null },            // decoy
    ],
    "Hours worked is input; pay depends on hours."
  ),

  // --- Boss-style multi-step ID (still not solving) ---
  bossMulti(
    "BOSS ROUND: Identify roles in three quick scenarios.",
    [
      { prompt:"A movie rental costs $5 plus $1 per day. Dependent variable?",
        options:["$5 fee","days rented","total cost","movie title"], answer:2,
        hint:"Cost depends on days."
      },
      { prompt:"A runner’s distance changes with time. Independent variable?",
        options:["distance","time","speed","shoes"], answer:1,
        hint:"Time is the input."
      },
      { prompt:"A recipe uses 2 cups flour per loaf. Dependent variable?",
        options:["number of loaves","cups of flour","oven temperature","pan size"], answer:1,
        hint:"Flour depends on loaves."
      },
    ],
    "Independent = input. Dependent = output that changes."
  ),
];

/* Builders */
function mcqContext(question, choices, correctIndex, explain){
  return {
    id: "mcq_" + uid(),
    type: "mcq",
    skill: "indepdep_context",
    promptKicker: "Mission: Identify the Variable",
    question,
    choices,
    correctIndex,
    explain,
    difficulty: 1
  };
}

function mcqTable(title, tableRows, question, choices, correctIndex, explain){
  return {
    id: "table_" + uid(),
    type: "mcq_table",
    skill: "indepdep_table",
    promptKicker: "Mission: Read the Table",
    title,
    tableRows,
    question,
    choices,
    correctIndex,
    explain,
    difficulty: 2
  };
}

function mcqEquation(question, equation, choices, correctIndex, explain){
  return {
    id: "eq_" + uid(),
    type: "mcq_equation",
    skill: "indepdep_equation",
    promptKicker: "Mission: Read the Rule",
    question,
    equation,
    choices,
    correctIndex,
    explain,
    difficulty: 2
  };
}

function dragMatch(title, zoneLabels, tokens, explain){
  return {
    id: "drag_" + uid(),
    type: "drag_match",
    skill: "indepdep_drag",
    promptKicker: "Mission: Sort and Match",
    title,
    zoneLabels,
    tokens,
    explain,
    difficulty: 2
  };
}

function bossMulti(title, items, explain){
  return {
    id: "boss_" + uid(),
    type: "boss_multi",
    skill: "indepdep_boss",
    title,
    items,
    explain,
    difficulty: 3,
    boss: true
  };
}

/* ------------------------------------------------------------------ */
/* Save / State                                                       */
/* ------------------------------------------------------------------ */
const DEFAULT_SAVE = Object.freeze({
  version: CONFIG.VERSION,
  xp: 0,
  level: 1,
  streak: 0,
  attempts: 0,
  correct: 0,
  seen: {},          // qid -> count
  lastPlayedAt: null,
  settings: { sfx: true, theme: "auto" }
});

function loadSave(){
  const raw = localStorage.getItem(CONFIG.SAVE_KEY);
  const data = safeJsonParse(raw, null);
  if (!data || typeof data !== "object") return structuredClone(DEFAULT_SAVE);
  // minimal migration safety
  const s = structuredClone(DEFAULT_SAVE);
  for (const k of Object.keys(s)){
    if (k in data) s[k] = data[k];
  }
  // nested
  s.settings = { ...DEFAULT_SAVE.settings, ...(data.settings || {}) };
  return s;
}

function persistSave(save){
  save.lastPlayedAt = new Date().toISOString();
  localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(save));
}

function resetSave(){
  localStorage.removeItem(CONFIG.SAVE_KEY);
}

/* ------------------------------------------------------------------ */
/* Adaptive Question Selection                                         */
/* ------------------------------------------------------------------ */
function computeAccuracy(save){
  return save.attempts ? (save.correct / save.attempts) : 0;
}

function levelFromXP(xp){
  return Math.max(1, Math.floor(xp / CONFIG.LEVEL_UP_AT_XP) + 1);
}

function chooseNextQuestion(save){
  const acc = computeAccuracy(save);
  const level = levelFromXP(save.xp);

  // Boss cadence: every N questions attempted (not just correct)
  const isBossTime = (save.attempts > 0) && (save.attempts % CONFIG.BOSS_EVERY === 0);

  // Candidate pool
  let pool = QUESTION_BANK.filter(q => !!q);

  // If boss time, prefer boss items
  if (isBossTime){
    const bosses = pool.filter(q => q.boss);
    if (bosses.length) return pickLeastSeen(save, bosses);
  }

  // Adaptive difficulty: if strong accuracy, push harder
  const targetDifficulty = acc >= CONFIG.TARGET_ACC_FOR_HARDER ? clamp(level, 1, 3) : clamp(level - 1, 1, 2);

  // Choose questions near target difficulty, but allow some variety
  const band = pool.filter(q => !q.boss && Math.abs((q.difficulty || 1) - targetDifficulty) <= 1);
  if (band.length) return pickLeastSeen(save, band);

  // Fallback
  const nonBoss = pool.filter(q => !q.boss);
  return pickLeastSeen(save, nonBoss.length ? nonBoss : pool);
}

function pickLeastSeen(save, arr){
  let best = [];
  let bestCount = Infinity;
  for (const q of arr){
    const c = save.seen?.[q.id] ?? 0;
    if (c < bestCount){ bestCount = c; best = [q]; }
    else if (c === bestCount) best.push(q);
  }
  return best[Math.floor(Math.random() * best.length)];
}

/* ------------------------------------------------------------------ */
/* UI / Scenes                                                        */
/* ------------------------------------------------------------------ */
class App {
  constructor(root){
    validateConfig();
    this.root = root;
    this.sfx = new SFX();

    this.save = loadSave();
    this.applySettings();
    this.state = {
      scene: "menu",
      currentQ: null,
      selection: null,
      feedback: null,
      drag: { heldTokenId: null, placements: {} }, // tokenId -> zoneIndex
      boss: { step: 0, stepSel: null, stepFeedback: null, results: [] }
    };

    this.render();
  }

  log(...args){
    if (CONFIG.DIAGNOSTICS) console.log("[FFORGE]", ...args);
  }

  applySettings(){
    this.sfx.enabled = !!this.save.settings.sfx;
    // Theme is auto via CSS prefers-color-scheme. (Kept for future.)
  }

  setScene(scene){
    this.state.scene = scene;
    this.state.selection = null;
    this.state.feedback = null;
    this.state.currentQ = null;
    this.state.drag = { heldTokenId: null, placements: {} };
    this.state.boss = { step: 0, stepSel: null, stepFeedback: null, results: [] };
    this.render();
  }

startRun(){
  this.sfx.click();
  this.setScene("play");     // go to play FIRST (this clears old state)
  this.nextQuestion(true);   // then load the first question
  this.render();             // force paint
}

  nextQuestion(fromStart=false){
    const q = chooseNextQuestion(this.save);
    this.state.currentQ = structuredClone(q);
    this.state.selection = null;
    this.state.feedback = null;
    this.state.drag = { heldTokenId: null, placements: {} };
    this.state.boss = { step: 0, stepSel: null, stepFeedback: null, results: [] };

    // mark seen (on display)
    this.save.seen[q.id] = (this.save.seen[q.id] ?? 0) + 1;
    persistSave(this.save);

    if (!fromStart) this.render();
  }

  toggleSfx(){
    this.save.settings.sfx = !this.save.settings.sfx;
    persistSave(this.save);
    this.applySettings();
    this.render();
  }

  nukeProgress(){
    resetSave();
    this.save = loadSave();
    this.applySettings();
    this.setScene("menu");
  }

  awardXP(amount){
    this.save.xp += amount;
    const newLevel = levelFromXP(this.save.xp);
    this.save.level = newLevel;
  }

  markAttempt(isCorrect, isBoss=false){
    this.save.attempts += 1;
    if (isCorrect) this.save.correct += 1;

    if (isCorrect){
      this.save.streak += 1;
      const base = isBoss ? CONFIG.XP_BOSS : CONFIG.XP_CORRECT;
      this.awardXP(base);

      if (this.save.streak > 0 && this.save.streak % CONFIG.STREAK_BONUS_AT === 0){
        this.awardXP(CONFIG.XP_STREAK_BONUS);
      }
    } else {
      this.save.streak = 0;
    }

    persistSave(this.save);
  }

  /* ------------------------ MCQ ------------------------ */
  chooseMCQ(idx){
    if (this.state.feedback) return;
    this.state.selection = idx;
    this.sfx.click();
    this.render();
  }

  submitMCQ(){
    const q = this.state.currentQ;
    if (!q || this.state.feedback) return;
    if (this.state.selection === null || this.state.selection === undefined) return;

    const ok = this.state.selection === q.correctIndex;
    this.markAttempt(ok, !!q.boss);

    if (ok){
      this.sfx.ok();
      this.state.feedback = { ok:true, title:"Correct!", text:q.explain };
    } else {
      this.sfx.bad();
      const correct = q.choices[q.correctIndex];
      this.state.feedback = { ok:false, title:"Try again", text:`Hint: ${q.explain} (Correct choice: ${correct})` };
    }
    this.render();
  }

  continueAfterFeedback(){
    const q = this.state.currentQ;
    if (!q || !this.state.feedback) return;

    if (this.state.feedback.ok){
      this.nextQuestion();
    } else {
      // retry same question: keep it displayed, clear selection/feedback
      this.state.selection = null;
      this.state.feedback = null;
      this.render();
    }
  }

  /* ------------------------ Drag/Drop ------------------------ */
  holdToken(tokenId){
    this.state.drag.heldTokenId = tokenId;
    this.sfx.click();
    this.render();
  }

  placeToken(zoneIndex){
    const q = this.state.currentQ;
    if (!q || q.type !== "drag_match") return;

    const held = this.state.drag.heldTokenId;
    if (!held) return;

    // toggle: if placing same token again, remove
    this.state.drag.placements[held] = zoneIndex;
    this.state.drag.heldTokenId = null;
    this.sfx.click();
    this.render();
  }

  clearPlacements(){
    this.state.drag = { heldTokenId: null, placements: {} };
    this.render();
  }

  submitDrag(){
    const q = this.state.currentQ;
    if (!q || q.type !== "drag_match" || this.state.feedback) return;

    // Evaluate: only tokens with target 0/1 must be placed correctly; decoys should be unplaced
    const placements = this.state.drag.placements;
    let ok = true;

    for (const tok of q.tokens){
      const tokenId = tok._id;
      const placed = placements[tokenId];

      if (tok.target === null || tok.target === undefined){
        if (placed !== undefined) ok = false;
      } else {
        if (placed === undefined || placed !== tok.target) ok = false;
      }
    }

    this.markAttempt(ok, !!q.boss);

    if (ok){
      this.sfx.ok();
      this.state.feedback = { ok:true, title:"Correct!", text:q.explain };
    } else {
      this.sfx.bad();
      this.state.feedback = { ok:false, title:"Try again", text:`Hint: ${q.explain}` };
    }
    this.render();
  }

  /* ------------------------ Boss Multi ------------------------ */
  chooseBoss(idx){
    if (this.state.boss.stepFeedback) return;
    this.state.boss.stepSel = idx;
    this.sfx.click();
    this.render();
  }

  submitBoss(){
    const q = this.state.currentQ;
    if (!q || q.type !== "boss_multi") return;
    const step = q.items[this.state.boss.step];
    if (!step) return;
    if (this.state.boss.stepSel === null || this.state.boss.stepSel === undefined) return;

    const ok = this.state.boss.stepSel === step.answer;
    this.state.boss.results.push(ok);
    if (ok){
      this.sfx.ok();
      this.state.boss.stepFeedback = { ok:true, title:"Nice!", text: step.hint };
    } else {
      this.sfx.bad();
      const correct = step.options[step.answer];
      this.state.boss.stepFeedback = { ok:false, title:"Retry", text:`Hint: ${step.hint} (Correct: ${correct})` };
    }
    this.render();
  }

  continueBoss(){
    const q = this.state.currentQ;
    if (!q || q.type !== "boss_multi" || !this.state.boss.stepFeedback) return;

    if (this.state.boss.stepFeedback.ok){
      // move to next step or finish boss
      this.state.boss.step += 1;
      this.state.boss.stepSel = null;
      this.state.boss.stepFeedback = null;

      if (this.state.boss.step >= q.items.length){
        // boss result = all correct (since retries allowed, results should be all true)
        const allOk = this.state.boss.results.every(Boolean);
        this.markAttempt(allOk, true); // award boss xp on completion
        this.sfx.boss();
        this.state.feedback = { ok:true, title:"Boss cleared!", text:q.explain };
        this.render();
        return;
      }
      this.render();
    } else {
      // retry current step
      this.state.boss.stepSel = null;
      this.state.boss.stepFeedback = null;
      this.render();
    }
  }

  /* ------------------------ Rendering ------------------------ */
  render(){
    const s = this.save;
    const acc = computeAccuracy(s);
    const level = levelFromXP(s.xp);

    this.root.innerHTML = `
      <div class="shell">
        ${this.renderTopbar(level, acc)}
        <main class="main" role="main">
          ${this.renderMenuScene()}
          ${this.renderPlayScene()}
        </main>
        ${this.renderFooter()}
      </div>
    `;

    this.bindGlobal();
    this.bindScene();
  }

  renderTopbar(level, acc){
    const sfxLabel = this.save.settings.sfx ? "SFX: ON" : "SFX: OFF";
    return `
      <header class="topbar">
        <div class="brand">
          <div class="logo" aria-hidden="true">ƒ</div>
          <div class="titleblock">
            <div class="title">${CONFIG.APP_NAME}</div>
            <div class="sub">Grade 6 • Independent vs. Dependent Variables • v${CONFIG.VERSION}</div>
          </div>
        </div>

        <div class="hud" aria-label="HUD">
          <div class="pill"><span class="dot"></span><span>Level</span> <b>${level}</b></div>
          <div class="pill"><span class="dot"></span><span>XP</span> <b>${this.save.xp}</b></div>
          <div class="pill"><span class="dot"></span><span>Accuracy</span> <b>${pct(acc)}%</b></div>
          <div class="pill"><span class="dot"></span><span>Streak</span> <b>${this.save.streak}</b></div>
          <button class="btn secondary small" data-action="toggleSfx" aria-label="Toggle sound effects">${sfxLabel}</button>
        </div>
      </header>
    `;
  }

  renderMenuScene(){
    const played = this.save.lastPlayedAt ? new Date(this.save.lastPlayedAt).toLocaleString() : "—";
    return `
      <section class="scene ${this.state.scene === "menu" ? "active" : ""}" data-scene="menu">
        <div class="grid cols2">
          <div class="card">
            <h2>Welcome to the Variables Lab</h2>
            <p>
              Your mission is to identify <b>independent</b> (input) and <b>dependent</b> (output) variables.
              You’ll face quick missions, sorting challenges, and boss rounds. Wrong answers give a hint and you retry.
            </p>

            <div style="height:12px"></div>

            <div class="row">
              <button class="btn teal" data-action="startRun">Start Mission Run</button>
              <button class="btn secondary" data-action="howTo">How to Play</button>
              <button class="btn ghost" data-action="reset">Reset Progress</button>
            </div>

            <div style="height:12px"></div>

            <div class="feedback">
              <div class="hdr">Quick Reminders</div>
              <div class="txt">
                • Independent = <b>input</b> (what you choose/control).<br/>
                • Dependent = <b>output</b> (what changes because of input).<br/>
                • Tables/graphs: independent is usually on the <b>x-axis</b> / first column.
              </div>
            </div>
          </div>

          <div class="card">
            <h2>Player File</h2>
            <p><b>Last played:</b> ${played}</p>
            <p><b>Questions attempted:</b> ${this.save.attempts}</p>
            <p><b>Correct:</b> ${this.save.correct}</p>

            <div style="height:12px"></div>

            <div class="prompt">
              <div class="kicker">Teacher Tip</div>
              <div class="q">Use this game for warm-ups, stations, or independent practice.</div>
            </div>

            <div style="height:12px"></div>

            <div class="feedback">
              <div class="hdr">Controls</div>
              <div class="txt">
                • Tap/click answers to select.<br/>
                • Drag tokens to zones, or <b>click a token</b> then <b>click a zone</b> to place.<br/>
                • If you get a hint, retry immediately.
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  renderPlayScene(){
    const q = this.state.currentQ;
    const content = q ? this.renderQuestion(q) : `
      <div class="card">
        <h2>Ready?</h2>
        <p>Click <b>Start Mission Run</b> to begin.</p>
      </div>
    `;

    return `
      <section class="scene ${this.state.scene === "play" ? "active" : ""}" data-scene="play">
        ${content}
      </section>
    `;
  }

  renderQuestion(q){
    if (q.type === "mcq") return this.renderMCQ(q);
    if (q.type === "mcq_table") return this.renderTableMCQ(q);
    if (q.type === "mcq_equation") return this.renderEqMCQ(q);
    if (q.type === "drag_match") return this.renderDrag(q);
    if (q.type === "boss_multi") return this.renderBoss(q);

    return `<div class="card"><h2>Error</h2><p>Unknown question type.</p></div>`;
  }

  renderMCQ(q){
    return `
      <div class="card">
        <div class="prompt">
          <div class="kicker">${q.promptKicker}</div>
          <div class="q">${escapeHtml(q.question)}</div>
        </div>

        <div class="answers" role="listbox" aria-label="Answer choices">
          ${q.choices.map((c,i)=>`
            <div class="choice ${this.choiceClass(i,q)}"
                 role="option"
                 aria-selected="${this.state.selection===i}"
                 tabindex="0"
                 data-action="chooseMCQ"
                 data-idx="${i}">
              ${escapeHtml(c)}
            </div>
          `).join("")}
        </div>

        ${this.renderActionRow()}
        ${this.renderFeedback()}
      </div>
    `;
  }

  renderTableMCQ(q){
    const table = `
      <div class="card" style="padding:12px;">
        <div class="miniTag"><b>${escapeHtml(q.title)}</b></div>
        <div style="height:8px"></div>
        <div style="overflow:auto;">
          <table style="width:100%; border-collapse:collapse; font-weight:800;">
            ${q.tableRows.map((r,ri)=>`
              <tr>
                ${r.map((cell)=>`
                  <td style="border:2px solid rgba(0,0,0,.10); padding:8px; background:${ri===0 ? "rgba(0,150,136,.10)" : "transparent"};">
                    ${escapeHtml(cell)}
                  </td>
                `).join("")}
              </tr>
            `).join("")}
          </table>
        </div>
      </div>
    `;

    return `
      <div class="card">
        <div class="grid cols2">
          <div>
            <div class="prompt">
              <div class="kicker">${q.promptKicker}</div>
              <div class="q">${escapeHtml(q.question)}</div>
            </div>
            ${table}
          </div>

          <div>
            <div class="answers" role="listbox" aria-label="Answer choices">
              ${q.choices.map((c,i)=>`
                <div class="choice ${this.choiceClass(i,q)}"
                     role="option"
                     aria-selected="${this.state.selection===i}"
                     tabindex="0"
                     data-action="chooseMCQ"
                     data-idx="${i}">
                  ${escapeHtml(c)}
                </div>
              `).join("")}
            </div>
            ${this.renderActionRow()}
            ${this.renderFeedback()}
          </div>
        </div>
      </div>
    `;
  }

  renderEqMCQ(q){
    return `
      <div class="card">
        <div class="prompt">
          <div class="kicker">${q.promptKicker}</div>
          <div class="q">${escapeHtml(q.question)}</div>
        </div>

        <div style="height:10px"></div>

        <div class="feedback">
          <div class="hdr">Rule</div>
          <div class="txt" style="font-weight:900; font-size:18px; color:var(--ink);">
            ${escapeHtml(q.equation)}
          </div>
        </div>

        <div class="answers" role="listbox" aria-label="Answer choices">
          ${q.choices.map((c,i)=>`
            <div class="choice ${this.choiceClass(i,q)}"
                 role="option"
                 aria-selected="${this.state.selection===i}"
                 tabindex="0"
                 data-action="chooseMCQ"
                 data-idx="${i}">
              ${escapeHtml(c)}
            </div>
          `).join("")}
        </div>

        ${this.renderActionRow()}
        ${this.renderFeedback()}
      </div>
    `;
  }

  renderDrag(q){
    // attach deterministic ids to tokens
    q.tokens = q.tokens.map(t => ({ ...t, _id: t._id || ("t_" + uid()) }));

    const held = this.state.drag.heldTokenId;

    const zones = q.zoneLabels.map((label, zi)=>{
      const placedTokens = q.tokens
        .filter(t => this.state.drag.placements[t._id] === zi)
        .map(t => `<span class="placed">${escapeHtml(t.token)}</span>`)
        .join("");

      return `
        <div class="zone" data-action="placeZone" data-zone="${zi}">
          <strong>${escapeHtml(label)}</strong>
          <div class="slot">${placedTokens || `<span class="miniTag">Drop here</span>`}</div>
        </div>
      `;
    }).join("");

    const bankTokens = q.tokens.map(t=>{
      const isPlaced = this.state.drag.placements[t._id] !== undefined;
      const selected = held === t._id;
      return `
        <div class="token"
             role="button"
             tabindex="0"
             aria-pressed="${selected}"
             draggable="true"
             data-token="${t._id}"
             data-action="holdToken"
             style="${isPlaced ? "opacity:.45" : ""}">
          ${escapeHtml(t.token)}
        </div>
      `;
    }).join("");

    return `
      <div class="card">
        <div class="prompt">
          <div class="kicker">${q.promptKicker}</div>
          <div class="q">${escapeHtml(q.title)}</div>
        </div>

        <div class="dragWrap">
          <div class="bank">
            <div class="miniTag"><b>Token Bank</b> — Drag, or click a token then click a zone.</div>
            <div class="tokens" data-dnd="bank">${bankTokens}</div>
            ${held ? `<div class="miniTag">Selected token: <b>${escapeHtml(this.tokenLabelById(q, held))}</b></div>` : ""}
          </div>

          <div class="zones">
            <div class="miniTag"><b>Zones</b> — Put only the correct items. Decoys should stay unplaced.</div>
            <div class="zoneRow">${zones}</div>

            <div class="row" style="margin-top:10px;">
              <button class="btn teal" data-action="submitDrag">Check</button>
              <button class="btn secondary" data-action="clearPlacements">Clear</button>
              <button class="btn secondary" data-action="backToMenu">Menu</button>
            </div>

            ${this.renderFeedback()}
          </div>
        </div>
      </div>
    `;
  }

  tokenLabelById(q, id){
    const t = q.tokens.find(x => x._id === id);
    return t ? t.token : "—";
  }

  renderBoss(q){
    const stepIndex = this.state.boss.step;
    const step = q.items[stepIndex];

    // If boss finished, show global feedback (handled elsewhere)
    if (!step){
      return `
        <div class="card">
          <h2>Boss complete</h2>
          ${this.renderFeedback()}
          <div class="row" style="margin-top:12px;">
            <button class="btn teal" data-action="continueAfterFeedback">Continue</button>
          </div>
        </div>
      `;
    }

    const sel = this.state.boss.stepSel;
    const fb = this.state.boss.stepFeedback;

    return `
      <div class="card">
        <div class="prompt">
          <div class="kicker">BOSS ROUND</div>
          <div class="q">${escapeHtml(q.title)}</div>
        </div>

        <div class="feedback">
          <div class="hdr">Scenario ${stepIndex + 1} of ${q.items.length}</div>
          <div class="txt" style="font-weight:900; font-size:16px; color:var(--ink);">
            ${escapeHtml(step.prompt)}
          </div>
        </div>

        <div class="answers" role="listbox" aria-label="Answer choices">
          ${step.options.map((c,i)=>`
            <div class="choice ${bossChoiceClass(i, sel, step.answer, fb)}"
                 role="option"
                 aria-selected="${sel===i}"
                 tabindex="0"
                 data-action="chooseBoss"
                 data-idx="${i}">
              ${escapeHtml(c)}
            </div>
          `).join("")}
        </div>

        <div class="row" style="margin-top:12px;">
          ${!fb ? `
            <button class="btn coral" data-action="submitBoss">Lock Answer</button>
            <button class="btn secondary" data-action="backToMenu">Menu</button>
          ` : `
            <button class="btn teal" data-action="continueBoss">${fb.ok ? "Next" : "Retry"}</button>
          `}
        </div>

        ${fb ? `
          <div class="feedback ${fb.ok ? "ok":"bad"}">
            <div class="hdr">${escapeHtml(fb.title)}</div>
            <div class="txt">${escapeHtml(fb.text)}</div>
          </div>
        ` : ""}
      </div>
    `;
  }

  renderActionRow(){
    return `
      <div class="row" style="margin-top:12px;">
        ${!this.state.feedback ? `
          <button class="btn coral" data-action="submitMCQ">Lock Answer</button>
          <button class="btn secondary" data-action="backToMenu">Menu</button>
        ` : `
          <button class="btn teal" data-action="continueAfterFeedback">${this.state.feedback.ok ? "Next Mission" : "Retry"}</button>
        `}
      </div>
    `;
  }

  renderFeedback(){
    const fb = this.state.feedback;
    if (!fb) return "";
    return `
      <div class="feedback ${fb.ok ? "ok" : "bad"}">
        <div class="hdr">${escapeHtml(fb.title)}</div>
        <div class="txt">${escapeHtml(fb.text)}</div>
      </div>
    `;
  }

  renderFooter(){
    return `
      <div class="footer">
        <div>
          <b>Tip:</b> Independent = input; dependent = output. Tables/graphs: independent is usually on <b>x</b>.
        </div>
        <div>
          <span>Keyboard:</span> <kbd>Tab</kbd> to focus • <kbd>Enter</kbd> to select
        </div>
      </div>
    `;
  }

  choiceClass(i,q){
    const fb = this.state.feedback;
    if (!fb) return "";
    if (fb.ok){
      return i === q.correctIndex ? "correct" : "";
    }
    // wrong attempt: show correct + selected wrong
    if (i === q.correctIndex) return "correct";
    if (this.state.selection === i && i !== q.correctIndex) return "wrong";
    return "";
  }

  bindGlobal(){
    this.root.querySelectorAll("[data-action]").forEach(el=>{
      el.addEventListener("click", (e)=>{
        const act = el.getAttribute("data-action");
        const idx = el.getAttribute("data-idx");
        const token = el.getAttribute("data-token");
        const zone = el.getAttribute("data-zone");
        this.dispatch(act, { idx, token, zone });
      });

      // keyboard accessibility: enter/space triggers click
      el.addEventListener("keydown",(e)=>{
        if (e.key === "Enter" || e.key === " "){
          e.preventDefault();
          el.click();
        }
      });
    });
  }

  bindScene(){
    // Drag & drop (pointer + HTML5 DnD)
    const tokenEls = this.root.querySelectorAll(".token");
    const zoneEls = this.root.querySelectorAll(".zone");

    tokenEls.forEach(t=>{
      t.addEventListener("dragstart", (e)=>{
        const id = t.getAttribute("data-token");
        e.dataTransfer?.setData("text/plain", id);
        // also set held for click fallback visibility
        this.state.drag.heldTokenId = id;
      });
    });

    zoneEls.forEach(z=>{
      z.addEventListener("dragover", (e)=>{ e.preventDefault(); });
      z.addEventListener("drop", (e)=>{
        e.preventDefault();
        const id = e.dataTransfer?.getData("text/plain");
        const zi = Number(z.getAttribute("data-zone"));
        if (!id || Number.isNaN(zi)) return;
        this.state.drag.heldTokenId = id;
        this.placeToken(zi);
      });
    });
  }

  dispatch(action, payload){
    switch(action){
      case "startRun": return this.startRun();
      case "howTo":
        this.sfx.click();
        alert("How to play:\n\n1) Independent = input (choose/control).\n2) Dependent = output (changes because of input).\n3) Wrong answers give a hint and you retry.\n\nDrag tokens, or click token then click zone.");
        return;

      case "toggleSfx": return this.toggleSfx();
      case "reset":
        this.sfx.click();
        if (confirm("Reset progress? This clears XP, streak, and stats.")) this.nukeProgress();
        return;

      case "backToMenu": this.sfx.click(); return this.setScene("menu");

      case "chooseMCQ": return this.chooseMCQ(Number(payload.idx));
      case "submitMCQ": return this.submitMCQ();
      case "continueAfterFeedback": return this.continueAfterFeedback();

      case "holdToken":
        // click-to-place fallback: select token
        return this.holdToken(payload.token);

      case "placeZone":
        return this.placeToken(Number(payload.zone));

      case "submitDrag": return this.submitDrag();
      case "clearPlacements": return this.clearPlacements();

      case "chooseBoss": return this.chooseBoss(Number(payload.idx));
      case "submitBoss": return this.submitBoss();
      case "continueBoss": return this.continueBoss();

      default:
        this.log("Unknown action", action, payload);
        return;
    }
  }
}

/* helpers */
function bossChoiceClass(i, sel, answer, fb){
  if (!fb) return "";
  if (fb.ok){
    return i === answer ? "correct" : "";
  }
  if (i === answer) return "correct";
  if (sel === i && i !== answer) return "wrong";
  return "";
}

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

/* boot */
(function boot(){
  const root = document.getElementById("app");
  if (!root) throw new Error("Root #app missing");
  root.innerHTML = ""; // deterministic
  new App(root);
})();
