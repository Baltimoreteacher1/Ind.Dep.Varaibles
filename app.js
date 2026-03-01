/* Function Forge: Variables Lab — Premium v2 (Cloudflare Pages)
   Mission Map + Boss Battle + Economy + Adaptive scaffolds
*/

const CONFIG = Object.freeze({
  APP_NAME: "Function Forge: Variables Lab",
  VERSION: "2.0.0",
  DIAGNOSTICS: false,

  MICRO_ANIM_MS: 180,

  XP_CORRECT: 10,
  XP_BOSS: 35,
  COINS_CORRECT: 3,
  COINS_BOSS: 15,

  STREAK_BONUS_AT: 5,
  XP_STREAK_BONUS: 20,
  COINS_STREAK_BONUS: 10,

  LEVEL_UP_AT_XP: 140,
  TARGET_ACC_FOR_HARDER: 0.82,

  SAVE_KEY: "fforge_vars_v2_save"
});

function validateConfig(){
  const mustNum = ["MICRO_ANIM_MS","XP_CORRECT","XP_BOSS","LEVEL_UP_AT_XP"];
  for (const k of mustNum){
    if (typeof CONFIG[k] !== "number" || !Number.isFinite(CONFIG[k])) throw new Error(`CONFIG.${k} invalid`);
  }
}

function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }
function pct(n){ return Math.round(n*100); }
function uid(){ return Math.random().toString(16).slice(2) + Date.now().toString(16); }

function safeJsonParse(s, fallback){ try{ return JSON.parse(s); } catch{ return fallback; } }
function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

/* -------------------- SFX -------------------- */
class SFX {
  constructor(){ this.enabled = true; this.ctx = null; }
  _ctx(){ if(!this.ctx) this.ctx = new (window.AudioContext||window.webkitAudioContext)(); return this.ctx; }
  beep(freq=440, ms=90, type="sine", gain=0.05){
    if(!this.enabled) return;
    try{
      const ctx=this._ctx(); const o=ctx.createOscillator(); const g=ctx.createGain();
      o.type=type; o.frequency.value=freq; g.gain.value=gain; o.connect(g); g.connect(ctx.destination);
      o.start(); setTimeout(()=>o.stop(), ms);
    } catch {}
  }
  click(){ this.beep(520, 45, "sine", 0.03); }
  ok(){ this.beep(660, 90, "triangle", 0.06); this.beep(880, 80, "triangle", 0.05); }
  bad(){ this.beep(220, 120, "sawtooth", 0.03); }
  boss(){ this.beep(392, 120, "square", 0.05); this.beep(523, 120, "square", 0.05); }
  levelup(){ this.beep(523, 120, "triangle", 0.06); this.beep(659, 120, "triangle", 0.06); this.beep(784, 140, "triangle", 0.06); }
}

/* -------------------- Question Builders -------------------- */
function mcq({question, choices, correctIndex, explain, skill, misconceptionTag, difficulty=1, kicker="Mission"}){
  return { id:"q_"+uid(), type:"mcq", question, choices, correctIndex, explain, skill, misconceptionTag, difficulty, kicker };
}
function mcqTable({title, tableRows, question, choices, correctIndex, explain, skill, misconceptionTag, difficulty=2}){
  return { id:"q_"+uid(), type:"mcq_table", title, tableRows, question, choices, correctIndex, explain, skill, misconceptionTag, difficulty, kicker:"Mission: Read the Table" };
}
function mcqEquation({question, equation, choices, correctIndex, explain, skill, misconceptionTag, difficulty=2}){
  return { id:"q_"+uid(), type:"mcq_equation", question, equation, choices, correctIndex, explain, skill, misconceptionTag, difficulty, kicker:"Mission: Read the Rule" };
}
function mcqGraph({title, graphText, question, choices, correctIndex, explain, skill, misconceptionTag, difficulty=2}){
  return { id:"q_"+uid(), type:"mcq_graph", title, graphText, question, choices, correctIndex, explain, skill, misconceptionTag, difficulty, kicker:"Mission: Read the Graph" };
}
function dragMatch({title, zoneLabels, tokens, explain, skill, misconceptionTag, difficulty=2}){
  // tokens: { token, target } where target can be 0/1 or null (decoy)
  return { id:"q_"+uid(), type:"drag_match", title, zoneLabels, tokens, explain, skill, misconceptionTag, difficulty, kicker:"Mission: Sort and Match" };
}

/* -------------------- Premium Question Bank (expanded) -------------------- */
const QUESTION_BANK = [
  // Context (input/output)
  mcq({
    question:"A plant grows each week. What is the independent variable?",
    choices:["height of the plant","number of weeks","amount of sunlight","soil type"],
    correctIndex:1,
    explain:"Independent variable is what you choose/track as the input: time (weeks).",
    skill:"context", misconceptionTag:"confuse_input_output", difficulty:1, kicker:"Mission: Identify the Variable"
  }),
  mcq({
    question:"A taxi charges $3 plus $2 per mile. What is the dependent variable?",
    choices:["number of miles","taxi cost","starting fee","driver"],
    correctIndex:1,
    explain:"Cost depends on miles, so the dependent variable is taxi cost.",
    skill:"context", misconceptionTag:"confuse_input_output", difficulty:1, kicker:"Mission: Identify the Variable"
  }),
  mcq({
    question:"More tickets sold → more money earned. Dependent variable?",
    choices:["tickets sold","money earned","ticket price","time of day"],
    correctIndex:1,
    explain:"Money earned changes because tickets sold changes.",
    skill:"context", misconceptionTag:"confuse_input_output", difficulty:1, kicker:"Mission: Identify the Variable"
  }),
  mcq({
    question:"A runner’s distance changes as time increases. Independent variable?",
    choices:["distance","time","speed","shoes"],
    correctIndex:1,
    explain:"Time is the input you track; distance depends on time.",
    skill:"context", misconceptionTag:"confuse_input_output", difficulty:1, kicker:"Mission: Identify the Variable"
  }),

  // Tables
  mcqTable({
    title:"Minutes vs Pages Read",
    tableRows:[["Minutes","Pages"],["5","8"],["10","16"],["15","24"]],
    question:"Which is the independent variable?",
    choices:["Minutes","Pages","Both","Neither"],
    correctIndex:0,
    explain:"Minutes is input (x). Pages depends on minutes (y).",
    skill:"table", misconceptionTag:"table_axis_confusion", difficulty:2
  }),
  mcqTable({
    title:"Cups Sold vs Money Earned",
    tableRows:[["Cups Sold","Money ($)"],["10","15"],["20","30"],["30","45"]],
    question:"Which is the dependent variable?",
    choices:["Cups Sold","Money ($)","Both","Neither"],
    correctIndex:1,
    explain:"Money earned depends on cups sold.",
    skill:"table", misconceptionTag:"table_axis_confusion", difficulty:2
  }),
  mcqTable({
    title:"Games Played vs Points",
    tableRows:[["Games","Points"],["1","12"],["2","24"],["3","36"]],
    question:"What depends on the number of games?",
    choices:["Games","Points","Neither","Both"],
    correctIndex:1,
    explain:"Points changes based on games played.",
    skill:"table", misconceptionTag:"table_axis_confusion", difficulty:2
  }),

  // Equations
  mcqEquation({
    question:"In the equation  C = 12 + 4t  (C cost, t tickets), which is independent?",
    equation:"C = 12 + 4t",
    choices:["C","t","12","4"],
    correctIndex:1,
    explain:"t is the input. C depends on t.",
    skill:"equation", misconceptionTag:"equation_variable_confusion", difficulty:2
  }),
  mcqEquation({
    question:"In the equation  d = 60h  (d distance, h hours), which is dependent?",
    equation:"d = 60h",
    choices:["d","h","60","Both variables"],
    correctIndex:0,
    explain:"Distance depends on time.",
    skill:"equation", misconceptionTag:"equation_variable_confusion", difficulty:2
  }),
  mcqEquation({
    question:"In the rule  y = 2x + 5 , which is independent?",
    equation:"y = 2x + 5",
    choices:["y","x","2","5"],
    correctIndex:1,
    explain:"x is the input (independent). y depends on x.",
    skill:"equation", misconceptionTag:"equation_variable_confusion", difficulty:2
  }),

  // Graphs (text-based for reliability)
  mcqGraph({
    title:"Distance vs Time (Graph)",
    graphText:
`y: Distance
|
|        *
|     *
|  *
|*
+---------------- x: Time`,
    question:"On this graph, which is the independent variable?",
    choices:["Distance (y)","Time (x)","Both","Neither"],
    correctIndex:1,
    explain:"The x-axis (Time) is the independent variable.",
    skill:"graph", misconceptionTag:"graph_axis_confusion", difficulty:2
  }),
  mcqGraph({
    title:"Cost vs Number of Items (Graph)",
    graphText:
`y: Cost
|
|      *
|    *
|  *
|*
+---------------- x: Items`,
    question:"Which variable depends on the other?",
    choices:["Items depends on cost","Cost depends on items","Neither depends","Both depend equally"],
    correctIndex:1,
    explain:"Cost changes based on number of items.",
    skill:"graph", misconceptionTag:"graph_axis_confusion", difficulty:2
  }),

  // Drag & Drop (with decoys)
  dragMatch({
    title:"Drag each label to the correct role.",
    zoneLabels:["Independent (Input)","Dependent (Output)"],
    tokens:[
      { token:"Input", target:0 },
      { token:"Output", target:1 },
      { token:"What you control/choose", target:0 },
      { token:"What changes because of input", target:1 },
      { token:"Constant", target:null }, // decoy
    ],
    explain:"Independent = input you choose. Dependent = output that changes because of the input.",
    skill:"drag", misconceptionTag:"confuse_input_output", difficulty:2
  }),
  dragMatch({
    title:"Sort the variables: 'Total pay depends on hours worked.'",
    zoneLabels:["Independent","Dependent"],
    tokens:[
      { token:"Hours worked", target:0 },
      { token:"Total pay", target:1 },
      { token:"Hourly rate (constant)", target:null },
      { token:"Time of day", target:null },
    ],
    explain:"Hours worked is input; pay depends on hours.",
    skill:"drag", misconceptionTag:"confuse_input_output", difficulty:2
  }),
  dragMatch({
    title:"Sort the variables: 'Pages read depends on minutes.'",
    zoneLabels:["Independent","Dependent"],
    tokens:[
      { token:"Minutes", target:0 },
      { token:"Pages", target:1 },
      { token:"Book title", target:null },
      { token:"Font size", target:null },
    ],
    explain:"Minutes is input; pages depends on minutes.",
    skill:"drag", misconceptionTag:"confuse_input_output", difficulty:2
  }),
];

/* -------------------- Scaffolds + Micro-lessons -------------------- */
const MICRO_LESSONS = Object.freeze({
  confuse_input_output: {
    title: "Micro-Lesson: Input vs Output",
    text:
      "Independent = INPUT (what you choose/track).\n" +
      "Dependent = OUTPUT (what changes because the input changes).\n\n" +
      "Quick check: If you change X and Y changes, then X is independent and Y is dependent."
  },
  table_axis_confusion: {
    title: "Micro-Lesson: Reading Tables",
    text:
      "In tables, the independent variable is usually the first column (input).\n" +
      "The dependent variable is the column that changes because of the input."
  },
  equation_variable_confusion: {
    title: "Micro-Lesson: Reading Rules",
    text:
      "In y = mx + b, x is the input (independent).\n" +
      "y is the output (dependent) because it changes when x changes."
  },
  graph_axis_confusion: {
    title: "Micro-Lesson: Reading Graphs",
    text:
      "Independent variable is usually on the x-axis.\n" +
      "Dependent variable is usually on the y-axis.\n" +
      "Ask: What did we choose/measure first? That’s x."
  }
});

function makeScaffold(tag){
  if (tag === "confuse_input_output"){
    return mcq({
      question:"If you choose the number of hours and the pay changes, which is independent?",
      choices:["Pay","Hours","Both","Neither"],
      correctIndex:1,
      explain:"Hours is the input you choose; pay depends on it.",
      skill:"scaffold", misconceptionTag:tag, difficulty:1, kicker:"Scaffold Mission"
    });
  }
  if (tag === "table_axis_confusion"){
    return mcqTable({
      title:"Input/Output Table",
      tableRows:[["Input","Output"],["2","6"],["3","9"],["4","12"]],
      question:"Which column is independent?",
      choices:["Input","Output","Both","Neither"],
      correctIndex:0,
      explain:"Input is the independent variable.",
      skill:"scaffold", misconceptionTag:tag, difficulty:1
    });
  }
  if (tag === "equation_variable_confusion"){
    return mcqEquation({
      question:"In  y = 5x  , which is dependent?",
      equation:"y = 5x",
      choices:["x","y","5","Neither"],
      correctIndex:1,
      explain:"y depends on x, so y is dependent.",
      skill:"scaffold", misconceptionTag:tag, difficulty:1
    });
  }
  if (tag === "graph_axis_confusion"){
    return mcqGraph({
      title:"Axis Labels",
      graphText:
`y: Output
|
|  *
| *
|*
+-------- x: Input`,
      question:"Which axis shows the independent variable?",
      choices:["y-axis","x-axis","both axes","neither axis"],
      correctIndex:1,
      explain:"Independent variable is on the x-axis.",
      skill:"scaffold", misconceptionTag:tag, difficulty:1
    });
  }
  return null;
}

/* -------------------- Save -------------------- */
const DEFAULT_SAVE = Object.freeze({
  version: CONFIG.VERSION,
  xp: 0,
  level: 1,
  coins: 0,
  streak: 0,
  attempts: 0,
  correct: 0,
  seen: {},

  // Premium systems
  badges: [],              // strings
  skillWins: {},           // skill -> correct count
  errorProfile: {},        // misconceptionTag -> wrong count
  lastMicroLessonAt: null, // iso

  settings: { sfx:true },
  lastPlayedAt: null
});

function loadSave(){
  const raw = localStorage.getItem(CONFIG.SAVE_KEY);
  const data = safeJsonParse(raw, null);
  if (!data || typeof data !== "object") return structuredClone(DEFAULT_SAVE);

  const s = structuredClone(DEFAULT_SAVE);
  for (const k of Object.keys(s)){
    if (k in data) s[k] = data[k];
  }
  s.settings = { ...DEFAULT_SAVE.settings, ...(data.settings || {}) };
  s.skillWins = { ...(data.skillWins || {}) };
  s.errorProfile = { ...(data.errorProfile || {}) };
  s.badges = Array.isArray(data.badges) ? data.badges : [];
  s.seen = { ...(data.seen || {}) };
  return s;
}

function persistSave(save){
  save.lastPlayedAt = new Date().toISOString();
  localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(save));
}
function resetSave(){ localStorage.removeItem(CONFIG.SAVE_KEY); }

function computeAccuracy(save){ return save.attempts ? (save.correct / save.attempts) : 0; }
function levelFromXP(xp){ return Math.max(1, Math.floor(xp / CONFIG.LEVEL_UP_AT_XP) + 1); }

/* -------------------- Mission + Selection -------------------- */
const MISSION_STAGES = Object.freeze([
  { key:"warmup", label:"Warm-Up" },
  { key:"sort", label:"Sort" },
  { key:"read", label:"Read" },
  { key:"boss", label:"Boss" },
  { key:"rewards", label:"Rewards" }
]);

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

function chooseQuestionForStage(save, stageKey){
  const acc = computeAccuracy(save);
  const level = levelFromXP(save.xp);
  const targetDifficulty = acc >= CONFIG.TARGET_ACC_FOR_HARDER ? clamp(level, 1, 3) : clamp(level - 1, 1, 2);

  const pool = QUESTION_BANK.slice();

  const filterByStage = (q)=>{
    if (stageKey === "warmup") return q.type === "mcq" && (q.difficulty||1) <= 1;
    if (stageKey === "sort") return q.type === "drag_match";
    if (stageKey === "read") return (q.type === "mcq_table" || q.type === "mcq_equation" || q.type === "mcq_graph");
    return true;
  };

  const candidates = pool.filter(q => filterByStage(q) && Math.abs((q.difficulty||1) - targetDifficulty) <= 1);
  if (candidates.length) return pickLeastSeen(save, candidates);

  const fallback = pool.filter(filterByStage);
  return pickLeastSeen(save, fallback.length ? fallback : pool);
}

/* -------------------- App -------------------- */
class App {
  constructor(root){
    validateConfig();
    this.root = root;
    this.sfx = new SFX();

    this.save = loadSave();
    this.sfx.enabled = !!this.save.settings.sfx;

    this.state = this.freshState();
    this.render();
  }

  freshState(){
    return {
      scene: "menu",
      missionStageIndex: 0,
      currentQ: null,
      selection: null,
      feedback: null,
      floaters: [],

      // Drag
      drag: { heldTokenId: null, placements: {}, overZone: null },

      // Battle
      playerHP: 100,
      enemyHP: 100,
      enemyPhase: 1,
      battleFlash: false,

      // Micro lesson
      microLesson: null
    };
  }

  log(...args){ if (CONFIG.DIAGNOSTICS) console.log("[FFORGE]", ...args); }

  setScene(scene){
    // Do NOT wipe currentQ when entering play (prevents dead-ends)
    this.state.scene = scene;
    this.state.selection = null;
    this.state.feedback = null;
    this.state.drag = { heldTokenId: null, placements: {}, overZone: null };
    this.state.microLesson = null;
    this.state.floaters = [];
    if (scene !== "play") this.state.currentQ = null;
    this.render();
  }

  startRun(){
    this.sfx.click();
    this.state = this.freshState();
    this.state.scene = "play";
    this.state.missionStageIndex = 0;
    this.state.playerHP = 100;
    this.state.enemyHP = 100;
    this.state.enemyPhase = 1;
    this.loadStageQuestion(true);
    this.render();
  }

  loadStageQuestion(fromStart=false){
    const stage = MISSION_STAGES[this.state.missionStageIndex]?.key;

    // Boss stage uses battle question selection (mixed)
    if (stage === "boss"){
      // boss question: choose a read-type to answer while fighting
      const bossPool = QUESTION_BANK.filter(q => q.type === "mcq" || q.type === "mcq_table" || q.type === "mcq_equation" || q.type === "mcq_graph");
      const q = pickLeastSeen(this.save, bossPool);
      this.setCurrentQ(q, fromStart);
      return;
    }

    if (stage === "rewards"){
      this.state.currentQ = null;
      return;
    }

    const q = chooseQuestionForStage(this.save, stage);
    this.setCurrentQ(q, fromStart);
  }

  setCurrentQ(q, fromStart=false){
    this.state.currentQ = structuredClone(q);

    // Ensure drag token ids exist BEFORE evaluation
    if (this.state.currentQ?.type === "drag_match"){
      this.state.currentQ.tokens = this.state.currentQ.tokens.map(t => ({...t, _id: t._id || ("t_" + uid())}));
    }

    this.state.selection = null;
    this.state.feedback = null;
    this.state.drag = { heldTokenId: null, placements: {}, overZone: null };
    this.state.microLesson = null;

    // mark seen
    this.save.seen[q.id] = (this.save.seen[q.id] ?? 0) + 1;
    persistSave(this.save);

    if (!fromStart) this.render();
  }

  toggleSfx(){
    this.save.settings.sfx = !this.save.settings.sfx;
    this.sfx.enabled = !!this.save.settings.sfx;
    persistSave(this.save);
    this.render();
  }

  nukeProgress(){
    resetSave();
    this.save = loadSave();
    this.sfx.enabled = !!this.save.settings.sfx;
    this.setScene("menu");
  }

  addFloater(text){
    this.state.floaters.push({ id: uid(), text });
    // keep small
    if (this.state.floaters.length > 3) this.state.floaters.shift();
  }

  awardCorrect(isBoss=false){
    const oldLevel = levelFromXP(this.save.xp);

    const xp = isBoss ? CONFIG.XP_BOSS : CONFIG.XP_CORRECT;
    const coins = isBoss ? CONFIG.COINS_BOSS : CONFIG.COINS_CORRECT;

    this.save.xp += xp;
    this.save.coins += coins;

    this.addFloater(`+${xp} XP  •  +${coins} 🪙`);

    // streak
    this.save.streak += 1;
    if (this.save.streak > 0 && this.save.streak % CONFIG.STREAK_BONUS_AT === 0){
      this.save.xp += CONFIG.XP_STREAK_BONUS;
      this.save.coins += CONFIG.COINS_STREAK_BONUS;
      this.addFloater(`STREAK BONUS! +${CONFIG.XP_STREAK_BONUS} XP  •  +${CONFIG.COINS_STREAK_BONUS} 🪙`);
    }

    const newLevel = levelFromXP(this.save.xp);
    this.save.level = newLevel;
    if (newLevel > oldLevel) this.sfx.levelup();

    persistSave(this.save);
  }

  markAttempt(ok){
    this.save.attempts += 1;
    if (ok) this.save.correct += 1;
    if (!ok) this.save.streak = 0;
    persistSave(this.save);
  }

  recordSkillWin(q){
    const skill = q.skill || "misc";
    this.save.skillWins[skill] = (this.save.skillWins[skill] ?? 0) + 1;

    // badge thresholds
    const badgeRules = [
      { skill:"context", need:5, badge:"Context Champion" },
      { skill:"table", need:4, badge:"Table Tracker" },
      { skill:"equation", need:4, badge:"Rule Reader" },
      { skill:"graph", need:3, badge:"Graph Guardian" },
      { skill:"drag", need:3, badge:"Sorter Pro" },
    ];

    for (const r of badgeRules){
      if (r.skill === skill && (this.save.skillWins[skill] ?? 0) >= r.need && !this.save.badges.includes(r.badge)){
        this.save.badges.push(r.badge);
        this.addFloater(`🏅 Badge Unlocked: ${r.badge}`);
      }
    }
    persistSave(this.save);
  }

  recordError(q){
    const tag = q.misconceptionTag || "unknown";
    this.save.errorProfile[tag] = (this.save.errorProfile[tag] ?? 0) + 1;
    persistSave(this.save);
  }

  maybeInjectScaffold(q){
    const tag = q.misconceptionTag;
    if (!tag) return null;

    const wrongs = this.save.errorProfile[tag] ?? 0;

    // after 2 similar mistakes, show micro-lesson + scaffold question
    if (wrongs >= 2){
      const ml = MICRO_LESSONS[tag];
      const sc = makeScaffold(tag);
      return { microLesson: ml || null, scaffold: sc || null };
    }
    return null;
  }

  /* ---------- Input: MCQ ---------- */
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
    this.markAttempt(ok);

    const stage = MISSION_STAGES[this.state.missionStageIndex]?.key;
    const isBoss = stage === "boss";

    if (ok){
      this.sfx.ok();
      this.awardCorrect(isBoss);
      this.recordSkillWin(q);

      // battle effects if boss
      if (isBoss){
        this.hitEnemy();
      }

      this.state.feedback = { ok:true, title:"Correct!", text:q.explain };
    } else {
      this.sfx.bad();
      this.recordError(q);

      // boss penalty
      if (isBoss){
        this.enemyHitsYou();
      }

      const inject = this.maybeInjectScaffold(q);
      if (inject?.microLesson) this.state.microLesson = inject.microLesson;

      const correct = q.choices[q.correctIndex];
      const hint = q.explain;
      this.state.feedback = {
        ok:false,
        title:"Try again",
        text:`Hint: ${hint}${inject?.scaffold ? "\n\nNext: a quick scaffold challenge will appear." : ""}\n(Correct choice: ${correct})`
      };
    }
    this.render();
  }

  continueAfterFeedback(){
    const q = this.state.currentQ;
    if (!q || !this.state.feedback) return;

    const stage = MISSION_STAGES[this.state.missionStageIndex]?.key;
    const isBoss = stage === "boss";

    if (this.state.feedback.ok){
      // advance
      if (isBoss){
        if (this.state.enemyHP <= 0){
          this.advanceStage(); // to rewards
        } else {
          this.loadStageQuestion(); // next boss question
        }
      } else {
        this.advanceStage();
      }
    } else {
      // wrong: if scaffold is due, swap to scaffold question; else retry same
      const inject = this.maybeInjectScaffold(q);
      if (inject?.scaffold){
        // consume the scaffold by resetting the error count slightly (prevents infinite scaffolding)
        this.save.errorProfile[q.misconceptionTag] = Math.max(0, (this.save.errorProfile[q.misconceptionTag] ?? 0) - 1);
        persistSave(this.save);
        this.setCurrentQ(inject.scaffold);
      } else {
        this.state.selection = null;
        this.state.feedback = null;
        this.state.microLesson = null;
        this.render();
      }
    }
  }

  /* ---------- Drag ---------- */
  holdToken(tokenId){
    if (this.state.feedback) return;
    this.state.drag.heldTokenId = tokenId;
    this.sfx.click();
    this.render();
  }

  setZoneOver(zi){
    this.state.drag.overZone = zi;
    this.render();
  }

  placeToken(zoneIndex){
    const q = this.state.currentQ;
    if (!q || q.type !== "drag_match" || this.state.feedback) return;

    const held = this.state.drag.heldTokenId;
    if (!held) return;

    this.state.drag.placements[held] = zoneIndex;
    this.state.drag.heldTokenId = null;
    this.sfx.click();
    this.render();
  }

  clearPlacements(){
    this.state.drag = { heldTokenId: null, placements: {}, overZone: null };
    this.render();
  }

  submitDrag(){
    const q = this.state.currentQ;
    if (!q || q.type !== "drag_match" || this.state.feedback) return;

    let ok = true;
    const placements = this.state.drag.placements;

    for (const tok of q.tokens){
      const placed = placements[tok._id];
      if (tok.target === null || tok.target === undefined){
        if (placed !== undefined) ok = false;
      } else {
        if (placed === undefined || placed !== tok.target) ok = false;
      }
    }

    this.markAttempt(ok);

    if (ok){
      this.sfx.ok();
      this.awardCorrect(false);
      this.recordSkillWin(q);
      this.state.feedback = { ok:true, title:"Correct!", text:q.explain };
    } else {
      this.sfx.bad();
      this.recordError(q);
      const inject = this.maybeInjectScaffold(q);
      if (inject?.microLesson) this.state.microLesson = inject.microLesson;
      this.state.feedback = { ok:false, title:"Try again", text:`Hint: ${q.explain}${inject?.scaffold ? "\n\nNext: a quick scaffold challenge will appear." : ""}` };
    }
    this.render();
  }

  /* ---------- Battle ---------- */
  hitEnemy(){
    // phases: 100–67 (phase1), 66–34 (phase2), 33–0 (phase3)
    const dmg = this.state.enemyPhase === 1 ? 18 : this.state.enemyPhase === 2 ? 16 : 14;
    this.state.enemyHP = clamp(this.state.enemyHP - dmg, 0, 100);
    this.flashBattle();
    this.updateEnemyPhase();
  }

  enemyHitsYou(){
    const dmg = this.state.enemyPhase === 1 ? 10 : this.state.enemyPhase === 2 ? 12 : 14;
    this.state.playerHP = clamp(this.state.playerHP - dmg, 0, 100);
    this.flashBattle(true);

    if (this.state.playerHP <= 0){
      // fail-safe: reset boss to phase1 and give a recovery
      this.state.playerHP = 60;
      this.state.enemyHP = 60;
      this.state.enemyPhase = 2;
      this.addFloater("RECOVERY! Back in the fight.");
      this.sfx.boss();
    }
  }

  updateEnemyPhase(){
    const hp = this.state.enemyHP;
    this.state.enemyPhase = hp > 66 ? 1 : hp > 33 ? 2 : 3;
  }

  flashBattle(isPlayer=false){
    this.state.battleFlash = true;
    setTimeout(()=>{ this.state.battleFlash = false; this.render(); }, CONFIG.MICRO_ANIM_MS);
  }

  /* ---------- Stage flow ---------- */
  advanceStage(){
    this.state.selection = null;
    this.state.feedback = null;
    this.state.microLesson = null;

    // move to next stage
    this.state.missionStageIndex = clamp(this.state.missionStageIndex + 1, 0, MISSION_STAGES.length - 1);

    const stage = MISSION_STAGES[this.state.missionStageIndex]?.key;

    if (stage === "boss"){
      // reset battle for boss
      this.state.playerHP = 100;
      this.state.enemyHP = 100;
      this.state.enemyPhase = 1;
      this.sfx.boss();
      this.loadStageQuestion();
      this.render();
      return;
    }

    if (stage === "rewards"){
      this.render();
      return;
    }

    this.loadStageQuestion();
    this.render();
  }

  startNextRun(){
    // new run but keep stats
    this.sfx.click();
    this.state.missionStageIndex = 0;
    this.state.playerHP = 100;
    this.state.enemyHP = 100;
    this.state.enemyPhase = 1;
    this.loadStageQuestion(true);
    this.render();
  }

  /* ---------- Render ---------- */
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
    this.bindDnD();
  }

  renderTopbar(level, acc){
    const sfxLabel = this.save.settings.sfx ? "SFX: ON" : "SFX: OFF";
    return `
      <header class="topbar">
        <div class="brand">
          <div class="logo" aria-hidden="true">ƒ</div>
          <div class="titleblock">
            <div class="title">${CONFIG.APP_NAME}</div>
            <div class="sub">Grade 6 • Independent vs. Dependent Variables • Premium v${CONFIG.VERSION}</div>
          </div>
        </div>

        <div class="hud" aria-label="HUD">
          <div class="pill"><span class="dot"></span><span>Level</span> <b>${level}</b></div>
          <div class="pill"><span class="dot"></span><span>XP</span> <b>${this.save.xp}</b></div>
          <div class="pill"><span class="dot"></span><span>Coins</span> <b>${this.save.coins}</b></div>
          <div class="pill"><span class="dot"></span><span>Accuracy</span> <b>${pct(acc)}%</b></div>
          <div class="pill"><span class="dot"></span><span>Streak</span> <b>${this.save.streak}</b></div>
          <button class="btn secondary small" data-action="toggleSfx">${sfxLabel}</button>
        </div>
      </header>
    `;
  }

  renderMenuScene(){
    const played = this.save.lastPlayedAt ? new Date(this.save.lastPlayedAt).toLocaleString() : "—";
    const badges = this.save.badges.length ? this.save.badges.map(b=>`• ${escapeHtml(b)}`).join("<br/>") : "—";
    return `
      <section class="scene ${this.state.scene === "menu" ? "active" : ""}" data-scene="menu">
        <div class="grid cols2">
          <div class="card">
            <h2>Welcome to the Variables Lab</h2>
            <p>
              You’ll run a mission map and defeat <b>Mr. Neft Bot</b> by identifying
              <b>independent</b> (input) and <b>dependent</b> (output) variables.
              Wrong answers trigger hints, micro-lessons, and scaffolds.
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
                • Graphs: independent is usually on the <b>x-axis</b>.
              </div>
            </div>
          </div>

          <div class="card">
            <h2>Player File</h2>
            <p><b>Last played:</b> ${played}</p>
            <p><b>Attempts:</b> ${this.save.attempts} • <b>Correct:</b> ${this.save.correct}</p>

            <div style="height:12px"></div>

            <div class="feedback">
              <div class="hdr">Badges</div>
              <div class="txt">${badges}</div>
            </div>

            <div style="height:12px"></div>

            <div class="feedback">
              <div class="hdr">Controls</div>
              <div class="txt">
                • Click answers to select, then <b>Lock Answer</b>.<br/>
                • Drag tokens or click token → click zone to place.<br/>
                • Boss battle: correct answers damage the enemy; wrong answers damage you.
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  renderPlayScene(){
    const stage = MISSION_STAGES[this.state.missionStageIndex]?.key;

    // dead-end guard: if play scene with no question but not rewards, load one
    if (this.state.scene === "play" && !this.state.currentQ && stage !== "rewards"){
      this.loadStageQuestion(true);
    }

    return `
      <section class="scene ${this.state.scene === "play" ? "active" : ""}" data-scene="play">
        ${this.renderMissionMap()}
        <div style="height:10px"></div>
        ${stage === "boss" ? this.renderBattlePanel() : ""}
        ${stage === "rewards" ? this.renderRewards() : this.renderQuestion()}
      </section>
    `;
  }

  renderMissionMap(){
    const idx = this.state.missionStageIndex;
    const nodes = MISSION_STAGES.map((s, i)=>{
      const cls = i < idx ? "node done" : i === idx ? "node active" : "node";
      return `<div class="${cls}"><span class="pip"></span>${escapeHtml(s.label)}</div>`;
    }).join("");
    return `<div class="map" aria-label="Mission map">${nodes}</div>`;
  }

  renderBattlePanel(){
    const p = this.state.playerHP;
    const e = this.state.enemyHP;
    const flashCls = this.state.battleFlash ? "hitFlash" : "";
    return `
      <div class="card battle ${flashCls}">
        <div class="row" style="justify-content:space-between;">
          <div>
            <div class="miniTag"><b>Battle:</b> Defeat Mr. Neft Bot</div>
            <div class="miniTag">Phase ${this.state.enemyPhase} • Correct answers damage the enemy.</div>
          </div>
          <button class="btn secondary small" data-action="backToMenu">Menu</button>
        </div>

        <div>
          <div class="miniTag"><b>Your HP</b></div>
          <div class="hpbar"><div class="hpfill" style="width:${p}%"></div></div>
        </div>

        <div>
          <div class="miniTag"><b>Enemy HP</b></div>
          <div class="hpbar"><div class="hpfill enemy" style="width:${e}%"></div></div>
        </div>

        <div class="floaters">
          ${this.state.floaters.map((f, i)=>`<div class="floater" style="left:${i*10}px">${escapeHtml(f.text)}</div>`).join("")}
        </div>
      </div>
    `;
  }

  renderRewards(){
    const earned = [
      `Coins: <b>${this.save.coins}</b>`,
      `XP: <b>${this.save.xp}</b>`,
      `Badges: <b>${this.save.badges.length}</b>`
    ].join(" • ");

    return `
      <div class="card">
        <div class="prompt">
          <div class="kicker">Mission Complete</div>
          <div class="q">Rewards Collected</div>
        </div>

        <div class="feedback ok">
          <div class="hdr">Summary</div>
          <div class="txt">${earned}</div>
        </div>

        <div class="feedback">
          <div class="hdr">Next Move</div>
          <div class="txt">Run another mission to earn more coins and unlock badges faster.</div>
        </div>

        <div class="row" style="margin-top:12px;">
          <button class="btn teal" data-action="nextRun">Start Next Mission</button>
          <button class="btn secondary" data-action="backToMenu">Menu</button>
        </div>
      </div>
    `;
  }

  renderQuestion(){
    const q = this.state.currentQ;
    if (!q) return `
      <div class="card">
        <h2>Loading…</h2>
        <p>If this persists, refresh once.</p>
      </div>
    `;

    if (this.state.microLesson){
      const ml = this.state.microLesson;
      return `
        <div class="card">
          <div class="prompt">
            <div class="kicker">Support Card</div>
            <div class="q">${escapeHtml(ml.title)}</div>
          </div>
          <div class="feedback">
            <div class="hdr">Mini Lesson</div>
            <div class="txt" style="white-space:pre-line;">${escapeHtml(ml.text)}</div>
          </div>
          <div class="feedback">
            <div class="hdr">Then try again</div>
            <div class="txt">You’ll get a scaffold question next if needed.</div>
          </div>

          <div class="row" style="margin-top:12px;">
            <button class="btn teal" data-action="closeMicro">Continue</button>
          </div>
        </div>
      `;
    }

    if (q.type === "drag_match") return this.renderDrag(q);
    return this.renderMCQFamily(q);
  }

  renderMCQFamily(q){
    const kicker = q.kicker || "Mission";
    const promptBody = q.type === "mcq" ? escapeHtml(q.question)
      : q.type === "mcq_table" ? escapeHtml(q.question)
      : q.type === "mcq_equation" ? escapeHtml(q.question)
      : q.type === "mcq_graph" ? escapeHtml(q.question)
      : "Mission";

    const extra = q.type === "mcq_table" ? this.renderTable(q)
      : q.type === "mcq_equation" ? this.renderEquation(q)
      : q.type === "mcq_graph" ? this.renderGraph(q)
      : "";

    return `
      <div class="card">
        <div class="prompt">
          <div class="kicker">${escapeHtml(kicker)}</div>
          <div class="q">${promptBody}</div>
        </div>

        ${extra}

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

  renderTable(q){
    return `
      <div class="feedback" style="margin-top:12px;">
        <div class="hdr">${escapeHtml(q.title)}</div>
        <div class="txt" style="overflow:auto;">
          <table style="width:100%; border-collapse:collapse; font-weight:900;">
            ${q.tableRows.map((r,ri)=>`
              <tr>
                ${r.map(cell=>`
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
  }

  renderEquation(q){
    return `
      <div class="feedback" style="margin-top:12px;">
        <div class="hdr">Rule</div>
        <div class="txt" style="font-weight:950; font-size:18px; color:var(--ink);">
          ${escapeHtml(q.equation)}
        </div>
      </div>
    `;
  }

  renderGraph(q){
    return `
      <div class="feedback" style="margin-top:12px;">
        <div class="hdr">${escapeHtml(q.title)}</div>
        <div class="txt" style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; white-space:pre; font-weight:900;">
${escapeHtml(q.graphText)}
        </div>
      </div>
    `;
  }

  renderDrag(q){
    const held = this.state.drag.heldTokenId;

    const zones = q.zoneLabels.map((label, zi)=>{
      const placedTokens = q.tokens
        .filter(t => this.state.drag.placements[t._id] === zi)
        .map(t => `<span class="placed">${escapeHtml(t.token)}</span>`)
        .join("");

      const overCls = this.state.drag.overZone === zi ? "zone over" : "zone";

      return `
        <div class="${overCls}" data-action="placeZone" data-zone="${zi}">
          <strong>${escapeHtml(label)}</strong>
          <div class="slot">${placedTokens || `<span class="miniTag">Drop here</span>`}</div>
        </div>
      `;
    }).join("");

    const bankTokens = q.tokens.map(t=>{
      const isPlaced = this.state.drag.placements[t._id] !== undefined;
      const selected = held === t._id;
      const cls = selected ? "token selected" : "token";
      return `
        <div class="${cls}"
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
          <div class="kicker">${escapeHtml(q.kicker)}</div>
          <div class="q">${escapeHtml(q.title)}</div>
        </div>

        <div style="height:10px"></div>

        <div class="miniTag"><b>Token Bank</b> — Drag or click token → click zone.</div>
        <div class="tokens" data-dnd="bank">${bankTokens}</div>
        ${held ? `<div class="miniTag">Selected token: <b>${escapeHtml(this.tokenLabelById(q, held))}</b></div>` : ""}

        <div style="height:10px"></div>

        <div class="miniTag"><b>Zones</b> — Correct items only. Decoys stay unplaced.</div>
        <div class="zoneRow">${zones}</div>

        <div class="row" style="margin-top:12px;">
          <button class="btn coral" data-action="submitDrag">Check</button>
          <button class="btn secondary" data-action="clearPlacements">Clear</button>
          <button class="btn secondary" data-action="backToMenu">Menu</button>
        </div>

        ${this.renderFeedback()}
      </div>
    `;
  }

  tokenLabelById(q, id){
    const t = q.tokens.find(x => x._id === id);
    return t ? t.token : "—";
  }

  renderActionRow(){
    return `
      <div class="row" style="margin-top:12px;">
        ${!this.state.feedback ? `
          <button class="btn coral" data-action="submitMCQ">Lock Answer</button>
          <button class="btn secondary" data-action="backToMenu">Menu</button>
        ` : `
          <button class="btn teal" data-action="continueAfterFeedback">${this.state.feedback.ok ? "Continue" : "Retry / Scaffold"}</button>
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
        <div class="txt" style="white-space:pre-line;">${escapeHtml(fb.text)}</div>
      </div>
    `;
  }

  choiceClass(i,q){
    const fb = this.state.feedback;
    if (!fb) return "";
    if (fb.ok) return i === q.correctIndex ? "correct" : "";
    if (i === q.correctIndex) return "correct";
    if (this.state.selection === i && i !== q.correctIndex) return "wrong";
    return "";
  }

  renderFooter(){
    return `
      <div class="footer">
        <div>
          <b>Tip:</b> Independent = input; dependent = output. Graphs: independent is usually <b>x</b>.
        </div>
        <div>
          <span>Keyboard:</span> <kbd>Tab</kbd> focus • <kbd>Enter</kbd> select
        </div>
      </div>
    `;
  }

  /* ---------- Events ---------- */
  bindGlobal(){
    this.root.querySelectorAll("[data-action]").forEach(el=>{
      el.addEventListener("click", ()=>{
        const act = el.getAttribute("data-action");
        const idx = el.getAttribute("data-idx");
        const token = el.getAttribute("data-token");
        const zone = el.getAttribute("data-zone");
        this.dispatch(act, { idx, token, zone });
      });
      el.addEventListener("keydown",(e)=>{
        if (e.key === "Enter" || e.key === " "){
          e.preventDefault(); el.click();
        }
      });
    });
  }

  bindDnD(){
    // drag tokens
    const tokenEls = this.root.querySelectorAll(".token");
    const zoneEls = this.root.querySelectorAll(".zone");

    tokenEls.forEach(t=>{
      t.addEventListener("dragstart",(e)=>{
        const id = t.getAttribute("data-token");
        e.dataTransfer?.setData("text/plain", id);
        this.state.drag.heldTokenId = id;
      });
    });

    zoneEls.forEach(z=>{
      z.addEventListener("dragover",(e)=>{
        e.preventDefault();
        const zi = Number(z.getAttribute("data-zone"));
        this.state.drag.overZone = zi;
        z.classList.add("over");
      });
      z.addEventListener("dragleave",()=>{
        this.state.drag.overZone = null;
        z.classList.remove("over");
      });
      z.addEventListener("drop",(e)=>{
        e.preventDefault();
        z.classList.remove("over");
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
        alert(
          "How to play (Premium v2):\n\n" +
          "1) Run the mission map.\n" +
          "2) Sort/Read missions build skill.\n" +
          "3) Boss battle: correct answers damage Mr. Neft Bot.\n" +
          "4) Wrong answers trigger hints + micro-lessons + scaffolds.\n\n" +
          "Independent = input. Dependent = output."
        );
        return;

      case "toggleSfx": return this.toggleSfx();

      case "reset":
        this.sfx.click();
        if (confirm("Reset ALL progress? (XP, coins, streak, badges)")) this.nukeProgress();
        return;

      case "backToMenu": this.sfx.click(); return this.setScene("menu");

      case "nextRun": return this.startNextRun();

      case "chooseMCQ": return this.chooseMCQ(Number(payload.idx));
      case "submitMCQ": return this.submitMCQ();
      case "continueAfterFeedback": return this.continueAfterFeedback();

      case "holdToken": return this.holdToken(payload.token);
      case "placeZone": return this.placeToken(Number(payload.zone));
      case "submitDrag": return this.submitDrag();
      case "clearPlacements": return this.clearPlacements();

      case "closeMicro":
        this.sfx.click();
        this.state.microLesson = null;
        this.render();
        return;

      default:
        this.log("Unknown action", action, payload);
        return;
    }
  }
}

/* boot */
(function boot(){
  const root = document.getElementById("app");
  if (!root) throw new Error("Root #app missing");
  root.innerHTML = "";
  const app = new App(root);
  app.bindGlobal(); // first pass
})();
