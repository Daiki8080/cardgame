"use strict";
// ============================================================
//  イラストカードバトル
//  このファイルにゲームのすべての動きが書いてあります。
//  ① 設定とデータ  ② 保存  ③ カード表示  ④ 画面切り替え  ⑤ カード作成
//  ⑥ デッキ編成  ⑦ 対戦準備  ⑧ バトルのルール  ⑨ エフェクト
//  ⑩ CPU  ⑪ バトル画面の操作
// ============================================================

// ---------- ① 設定とデータ ----------
const DECK_CHAR = 10;    // 自分で選ぶ「通常カード」の枚数
const DECK_TOTAL = 40;   // バトルで使うデッキの合計枚数(パワーアップを入れたぶん、アイテムとコストを減らす)
const MAX_POWER = 10;    // デッキに入れられるパワーアップカードの数
const FIELD_MAX = 3;     // 場に出せるキャラの数
const START_HP = 100;    // プレイヤーの最初のHP
const START_HAND = 5;    // 最初の手札の枚数
const REVIVE_MAX = 2;    // 「キャラ復活」アイテムは1デッキに何枚まで入るか
const LASER_COST = 2;    // レーザーを使うのに必要な💎
const LASER_LOCK = 1;    // 自分の最初の何ターンは、レーザーを使えないか
const DECOY_TURNS = 2;   // 身代わりが続く、相手のターンの数
const GEM_MAX = 6;       // 💎をこの数まで並べて表示。これより多いと「💎+7」のように数字で表示
const SPEED = 1;         // ゲームの進む速さ。大きいほどゆっくり(2にすると2倍ゆっくり)

const $ = id => document.getElementById(id);
let G = null;            // バトルの状態(ゲーム中ずっと使う)
let T = null;            // カードをタップして選んでいる最中の状態
let uidCounter = 0;      // カード1枚ごとの番号

// アイテムカードの種類(あとから増やせます)
// short はカードに小さく出す説明、desc はタップしたときに出す説明
const ITEMS = [
  { kind: "healPlayer", name: "HP回復",     icon: "💚", short: "自分HP+50",   desc: "自分のHPを50回復する" },
  { kind: "healChar",   name: "キャラ回復", icon: "💊", short: "キャラHP+50", desc: "場のキャラ1枚のHPを50回復する" },
  { kind: "revive",     name: "キャラ復活", icon: "✨", short: "ダウン→手札", desc: "ダウンしたキャラ1枚を手札に戻す(HP全回復)" },
  { kind: "bomb",       name: "爆弾",       icon: "💣", short: "相手全体30",  desc: "相手の場にいるキャラ全員に30ダメージ(防御中は半分)" },
  { kind: "amulet",     name: "お守り",     icon: "🧿", short: "次の被攻撃0", desc: "場のキャラ1枚が、次の相手ターンに攻撃を受けても0ダメージになる" },
  { kind: "plush",      name: "ぬいぐるみ", icon: "🧸", short: "次の攻撃2倍", desc: "場のキャラ1枚の次の攻撃は、コストが2倍になる代わりにダメージも2倍になる" },
  { kind: "laser",      name: "レーザー",   icon: "⚡", short: "相手HP-30",   desc: "相手プレイヤーのHPに30ダメージ。💎を2つ使う。自分の最初のターンは使えない" },
  { kind: "swap",       name: "交代",       icon: "🔄", short: "場⇔手札",     desc: "場のキャラと手札のキャラを入れかえる。手札に戻ったキャラはHPが50回復する(パワーアップ中のキャラは対象外)" },
  { kind: "decoy",      name: "身代わり",   icon: "🎭", short: "2ターン囮",   desc: "場のキャラ1枚を選ぶ。2ターンの間、相手はそのキャラしか攻撃対象にえらべなくなる" },
];

// 技のつくり方(カードのデータを書きやすくするための道具)
const A  = (name, cost, dmg) => ({ type: "attack", name, cost, dmg });                 // 攻撃
const H  = (name, cost, heal) => ({ type: "heal", name, cost, heal });                 // 回復
const AL = (name, cost, dmg) => ({ type: "all", name, cost, dmg });                    // 全体攻撃
const SA = (name, cost, dmg, self) => ({ type: "sacrifice", name, cost, dmg, self });  // 捨て身
const CH = (name, cost, dmg, pct) => ({ type: "chance", name, cost, dmg, pct });       // 確率攻撃
const mkCard = (name, emoji, hp, a1, a2) => ({ name, emoji, hp, a1, a2 });
const mkPower = (name, emoji, hp, baseName, upCost, a1, a2) =>
  ({ kind: "power", name, emoji, hp, baseName, upCost, a1, a2 });

// お試し用サンプルカード(自分のカードを作る前に遊んでみる用)
const SAMPLE_CARDS = [
  mkCard("ねこ戦士", "🐱", 70, A("ひっかき", 1, 20), A("ねこパンチ", 3, 45)),
  mkCard("いぬ剣士", "🐶", 80, A("かみつき", 2, 30), A("ダッシュ斬り", 4, 55)),
  mkCard("うさぎ魔法使い", "🐰", 50, A("ほしの光", 1, 15), H("いやしの光", 2, 30)),
  mkCard("パンダ力士", "🐼", 100, A("つっぱり", 2, 25), SA("体当たり", 3, 70, 25)),
  mkCard("ライオン王", "🦁", 90, A("ほえる", 2, 30), AL("王のいかり", 5, 30)),
  mkCard("とら闘士", "🐯", 75, A("きばの一撃", 2, 35), A("しま連撃", 4, 55)),
  mkCard("かえる忍者", "🐸", 55, A("したのムチ", 1, 20), CH("水しゅりけん", 2, 50, 60)),
  mkCard("ペンギン兵", "🐧", 65, A("ダイブ", 1, 20), A("こおりの槍", 3, 45)),
  mkCard("ユニコーン", "🦄", 60, A("つの突き", 2, 30), H("にじの光", 3, 40)),
  mkCard("かめ守護者", "🐢", 110, A("こうら当て", 2, 20), A("大ぼうそう", 5, 50)),
];
const SAMPLE_POWERS = [
  mkPower("キャットロード", "😼", 110, "ねこ戦士", 3, A("ひっかき連打", 1, 30), AL("ねこ大乱舞", 4, 35)),
  mkPower("いぬ騎士王", "🐕", 120, "いぬ剣士", 4, A("王の牙", 2, 40), CH("必殺ダッシュ", 3, 90, 60)),
];

// CPUが使うカード(「おまかせ」を選んだときに使う)
const CPU_CARDS = [
  mkCard("ドラゴン", "🐲", 90, A("ひのこ", 2, 30), A("ほのおのブレス", 4, 60)),
  mkCard("きつね", "🦊", 60, A("ひっかき", 1, 20), CH("きつね火", 2, 45, 70)),
  mkCard("おおかみ", "🐺", 75, A("かみつき", 2, 30), A("とおぼえ斬", 4, 55)),
  mkCard("ふくろう", "🦉", 55, A("つばさ打ち", 1, 20), H("ぎんの羽", 2, 30)),
  mkCard("くま", "🐻", 100, A("ひっかき", 2, 25), AL("ほえる大地", 5, 30)),
  mkCard("へび", "🐍", 50, A("どくきば", 1, 15), CH("しめつけ", 2, 40, 60)),
  mkCard("わし", "🦅", 65, A("急降下", 2, 30), A("かぜの刃", 4, 50)),
  mkCard("タコ", "🐙", 70, A("すみ吐き", 1, 20), A("うで連打", 3, 45)),
  mkCard("ロボ", "🤖", 85, A("パンチ", 2, 25), A("レーザー", 4, 55)),
  mkCard("おばけ", "👻", 45, A("おどろかし", 1, 15), SA("のろい", 2, 55, 20)),
].map(c => ({ ...c, id: "cpu:" + c.name }));
const CPU_POWERS = [
  mkPower("竜王", "🐉", 130, "ドラゴン", 4, A("ほのお玉", 2, 40), AL("ごうかのブレス", 5, 40)),
  mkPower("九尾", "🔮", 90, "きつね", 3, A("きつね乱れ火", 2, 35), CH("神かくし", 3, 90, 60)),
].map(c => ({ ...c, id: "cpu:" + c.name, baseId: "cpu:" + c.baseName }));

// 昔のカード(技の種類がないもの)も動くように、技のデータをそろえる
function normSkill(s) {
  s = s || {};
  return { type: s.type || "attack", name: s.name || "", cost: s.cost || 0,
    dmg: s.dmg || 0, heal: s.heal || 0, self: s.self || 0, pct: s.pct == null ? 100 : s.pct };
}
const isPower = c => c.kind === "power";

// ---------- ② 保存(スマホのブラウザの中に保存されます) ----------
function loadCards() {
  try { return JSON.parse(localStorage.getItem("cb_cards")) || []; } catch (e) { return []; }
}
function saveCards(list) {
  try { localStorage.setItem("cb_cards", JSON.stringify(list)); return true; }
  catch (e) { alert("保存できませんでした(容量不足かもしれません)。不要なカードを削除してください。"); return false; }
}
// デッキは [{ id, name, ids:[カードの番号...] }, ...] の形で、いくつでも保存できる
function loadDecks() {
  try {
    const d = JSON.parse(localStorage.getItem("cb_decks"));
    if (Array.isArray(d)) return d;
    // 前のバージョン(デッキが1つだけ)からの引っ越し
    const old = JSON.parse(localStorage.getItem("cb_deck"));
    if (Array.isArray(old) && old.length > 0) {
      const moved = [{ id: "d" + Date.now(), name: "デッキ1", ids: old }];
      localStorage.setItem("cb_decks", JSON.stringify(moved));
      return moved;
    }
  } catch (e) { /* 読めなかったら空にする */ }
  return [];
}
function saveDecks(list) {
  try { localStorage.setItem("cb_decks", JSON.stringify(list)); return true; }
  catch (e) { alert("デッキを保存できませんでした。"); return false; }
}
// 前回えらんだデッキ(自分 p / CPU c)
function loadSel() {
  try { return JSON.parse(localStorage.getItem("cb_sel")) || {}; } catch (e) { return {}; }
}
function saveSel(s) {
  try { localStorage.setItem("cb_sel", JSON.stringify(s)); } catch (e) { /* 保存できなくても遊べる */ }
}
// デッキの中身を「通常カード」と「パワーアップカード」に分ける(消したカードや、元の通常カードがないものは除く)
function deckParts(d) {
  const cards = loadCards();
  const all = d.ids.map(id => cards.find(c => c.id === id)).filter(Boolean);
  const normals = all.filter(c => !isPower(c));
  const powers = all.filter(c => isPower(c) && normals.some(n => n.id === c.baseId));
  return { normals, powers };
}
function deckCards(d) { const p = deckParts(d); return p.normals.concat(p.powers); }
function deckValid(d) { return deckParts(d).normals.length === DECK_CHAR; }

// ---------- ③ カードの見た目 ----------
function esc(s) {
  return String(s).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}
function artHTML(c) {
  if (c.img) return `<img src="${c.img}" alt="">`;
  return `<div class="emoji">${c.emoji || "❓"}</div>`;
}

// コストは💎で表示。GEM_MAXより多いときは「💎+7」のように数字にする
function gemsHTML(n) {
  if (n <= 0) return '<span class="gems zero">💎0</span>';
  if (n > GEM_MAX) return `<span class="gems">💎+${n}</span>`;
  return `<span class="gems">${"💎".repeat(n)}</span>`;
}

// HPゲージ。obj.shownPct に「前に表示した割合」をおぼえておき、そこから新しい割合へなめらかに動かす
function barHTML(obj, cur, max, cls, text) {
  const to = Math.max(0, Math.min(100, cur / max * 100));
  const from = obj.shownPct == null ? to : obj.shownPct;
  obj.shownPct = to;
  const col = to > 50 ? "g" : to > 25 ? "y" : "r";
  const label = text || `${Math.max(0, cur)}/${max}`;
  return `<div class="bar ${cls || ""}"><i class="${col}" style="width:${from}%" data-to="${to}"></i><b>${esc(label)}</b></div>`;
}

// 技の短い表示(カードの上に小さく出す)  m はぬいぐるみの倍率
function skillShort(sk, m) {
  const mm = sk.type === "heal" ? 1 : m;
  const c = sk.cost * mm;
  if (sk.type === "heal") return `💎${c} 💚${sk.heal}`;
  if (sk.type === "all") return `💎${c} 🌪${sk.dmg * mm}`;
  if (sk.type === "sacrifice") return `💎${c} 🔥${sk.dmg * mm}/${sk.self}`;
  if (sk.type === "chance") return `💎${c} 🎲${sk.dmg * mm}`;
  return `💎${c} 💥${sk.dmg * mm}`;
}
// 技の くわしい説明(大きいカードに出す)
function skillDetail(sk, m) {
  const mm = sk.type === "heal" ? 1 : m;
  const c = sk.cost * mm;
  if (sk.type === "heal") return `回復 / 💎${c} / 💚+${sk.heal}(味方1体)`;
  if (sk.type === "all") return `全体攻撃 / 💎${c} / 💥${sk.dmg * mm}(相手全員)`;
  if (sk.type === "sacrifice") return `捨て身 / 💎${c} / 💥${sk.dmg * mm}(自分は${sk.self}ダメージ)`;
  if (sk.type === "chance") return `確率攻撃 / 💎${c} / 💥${sk.dmg * mm}(成功${sk.pct}%)`;
  return `攻撃 / 💎${c} / 💥${sk.dmg * mm}`;
}

// リボンの色(技①の種類で決まる。パワーアップは金色)と、HPバッジの色
function kindCls(c) {
  if (c.power || isPower(c)) return "k-power";
  return "k-" + normSkill(c.a1).type;
}
function hpCls(hp, max) { const r = hp / max; return r > 0.5 ? "g" : r > 0.25 ? "y" : "r"; }

// 小さいカード(手札・場・デッキ編成で使う)  inField=true なら「行動ずみ」の暗い表示もする
function cardHTML(c, extra, inField) {
  extra = extra || "";
  const targetable = T && T.valid.includes(c.uid) ? " targetable" : "";
  if (c.type === "item" || c.type === "cost") {
    return `<div class="card ${c.type} k-${c.type}${targetable}${extra}" data-uid="${c.uid}">
      <div class="art"><div class="icon">${c.icon}</div></div>
      <div class="cname">${esc(c.name)}</div>
      <div class="desc">${esc(c.short)}</div></div>`;
  }
  const max = c.maxHp || c.hp;
  const m = c.plush ? 2 : 1;   // ぬいぐるみ中は、コストもダメージも2倍で表示
  const pw = c.power || isPower(c);
  let cls = "card char " + kindCls(c);
  if (inField && c.acted) cls += " done";
  if (pw) cls += " power";
  if (c.guard) cls += " guard";
  if (c.amulet) cls += " amulet";
  if (c.plush) cls += " plush";
  if (c.decoy > 0) cls += " decoy";
  if (G && G.acting === c.uid) cls += " acting";
  const badges = (pw ? "⬆️" : "") + (c.guard ? "🛡" : "") + (c.amulet ? "🧿" : "") + (c.plush ? "🧸" : "") + (c.decoy > 0 ? "🎭" : "");
  return `<div class="${cls}${targetable}${extra}" data-uid="${c.uid || ""}">
    <div class="art">${artHTML(c)}</div>
    ${badges ? `<div class="badge">${badges}</div>` : ""}
    <div class="cname">${esc(c.name)}</div>
    ${barHTML(c, c.hp, max, "")}
    <div class="hpnum">${Math.max(0, c.hp)}</div>
    <div class="skills"><div class="catk">①${skillShort(normSkill(c.a1), m)}</div>
    <div class="catk">②${skillShort(normSkill(c.a2), m)}</div></div>
    ${c.guard ? '<i class="gl a">✦</i><i class="gl b">✧</i><i class="gl c">✨</i>' : ""}</div>`;
}

// 大きいカード(タップしたときのメニューに表示)  mini=true なら並べて見られる小さめ版、
// compact=true なら「絵が左、くわしい情報が右」のよこ向き(メニュー用。画面に収まるように)
function bigCardHTML(c, mini, compact) {
  const isItem = c.type === "item" || c.type === "cost";
  const cls = "big" + (mini ? " mini" : "") + (compact ? " compact" : "") + " " + (isItem ? "k-" + c.type : kindCls(c));
  if (isItem) {
    const body = `<div class="bname">${esc(c.name)}</div><div class="batk">${esc(c.desc)}</div>`;
    return `<div class="${cls}"><div class="bart">${c.icon}</div>${compact ? `<div class="side">${body}</div>` : body}</div>`;
  }
  const max = c.maxHp || c.hp;
  const m = c.plush ? 2 : 1;
  const st = (c.guard ? " 🛡防御中" : "") + (c.amulet ? " 🧿お守り中" : "") + (c.plush ? " 🧸次の攻撃2倍" : "") + (c.decoy > 0 ? " 🎭身代わり中" : "");
  const pw = c.power || isPower(c);
  let power = "";
  if (pw) {
    const bn = c.baseName || "";
    power = `<div class="batk gold">⬆️パワーアップ(元:${esc(bn)} / 置き換え💎${c.upCost || 0})</div>`;
  }
  const under = c.under ? `<div class="batk">下のカード:${esc(c.under.name)}</div>` : "";
  const body = `<div class="bname">${esc(c.name)}</div>
    ${barHTML({}, c.hp, max, "big")}
    ${power}${under}
    ${st ? `<div class="batk">${st}</div>` : ""}
    <div class="batk">① ${esc(normSkill(c.a1).name)}<br>${skillDetail(normSkill(c.a1), m)}</div>
    <div class="batk">② ${esc(normSkill(c.a2).name)}<br>${skillDetail(normSkill(c.a2), m)}</div>`;
  return `<div class="${cls}"><div class="bart">${artHTML(c)}</div>${compact ? `<div class="side">${body}</div>` : body}</div>`;
}

// ---------- ④ 画面切り替え ----------
function show(name) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  $("screen-" + name).classList.add("active");
  if (name === "title") updateTitle();
  if (name === "create") resetCreateForm();
  if (name === "deck") renderDeckManage();
  if (name === "ready") renderReady();
  window.scrollTo(0, 0);
}
function updateTitle() {
  $("title-info").textContent = `作ったカード:${loadCards().length}枚 / デッキ:${loadDecks().length}個`;
}
document.querySelectorAll("[data-go]").forEach(b => {
  b.addEventListener("click", () => show(b.dataset.go));
});
$("btn-create").onclick = () => show("create");
$("btn-deck").onclick = () => show("deck");
$("btn-start").onclick = () => show("ready");
$("btn-again").onclick = () => startBattle();

// ---------- ⑤ カード作成 ----------
let currentImg = "";

// 技の種類ごとに、入力欄の名前を変える
const SKILL_FORM = {
  attack:    { v1: "ダメージ" },
  heal:      { v1: "回復量" },
  all:       { v1: "ダメージ" },
  sacrifice: { v1: "相手へのダメージ", v2: "自分が受けるダメージ" },
  chance:    { v1: "ダメージ", v2: "成功する確率(%)" },
};
function updateSkillForm(p) {   // p は "a1" か "a2"
  const f = SKILL_FORM[$("f-" + p + "type").value] || SKILL_FORM.attack;
  $("l-" + p + "v1").textContent = f.v1;
  if (f.v2) {
    $("l-" + p + "v2").textContent = f.v2;
    $("w-" + p + "v2").classList.remove("hidden");
  } else {
    $("w-" + p + "v2").classList.add("hidden");
  }
}
["a1", "a2"].forEach(p => $("f-" + p + "type").addEventListener("change", () => updateSkillForm(p)));

// 通常カード / パワーアップカード で、入力欄を切りかえる
function updateKindForm() {
  const power = $("f-kind").value === "power";
  if (power) {
    const normals = loadCards().filter(c => !isPower(c));
    $("f-base").innerHTML = normals.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("");
    $("power-msg").textContent = normals.length ? "" : "先に通常カードを作ってください。";
    $("power-fields").classList.remove("hidden");
  } else {
    $("power-fields").classList.add("hidden");
  }
}
$("f-kind").addEventListener("change", updateKindForm);

let editCardId = null;   // 直しているカードの番号(新しく作るときは null)
let currentEmoji = "";   // サンプルカード(絵文字)を直すとき用

// 「つくったカードを直す」の選択肢を作る
function fillEditList() {
  const cards = loadCards();
  $("f-edit").innerHTML = '<option value="">(新しいカードを作る)</option>' +
    cards.map(c => `<option value="${c.id}">${isPower(c) ? "⬆ " : ""}${esc(c.name)}</option>`).join("");
  $("f-edit").value = editCardId || "";
}

// 技を入力欄にセット
function setSkillForm(p, sk) {
  sk = normSkill(sk);
  $("f-" + p + "type").value = sk.type;
  $("f-" + p + "name").value = sk.name;
  $("f-" + p + "cost").value = sk.cost;
  $("f-" + p + "v1").value = sk.type === "heal" ? sk.heal : sk.dmg;
  $("f-" + p + "v2").value = sk.type === "sacrifice" ? sk.self : sk.type === "chance" ? sk.pct : "";
  updateSkillForm(p);
}

// 作ったカードの内容を入力欄に入れて、直せるようにする
function loadIntoForm(id) {
  const c = loadCards().find(x => x.id === id);
  if (!c) return;
  resetCreateForm();
  editCardId = id;
  currentImg = c.img || "";
  currentEmoji = c.emoji || "";
  $("f-kind").value = isPower(c) ? "power" : "normal";
  $("f-kind").disabled = true;           // 種類は変えられない
  updateKindForm();
  if (isPower(c)) { $("f-base").value = c.baseId; $("f-upcost").value = c.upCost; }
  $("f-name").value = c.name;
  $("f-hp").value = c.hp;
  setSkillForm("a1", c.a1);
  setSkillForm("a2", c.a2);
  $("f-preview").innerHTML = c.img ? `<img src="${c.img}" alt="">` : `<div style="font-size:64px">${c.emoji || "❓"}</div>`;
  $("create-title").textContent = "カードを直す";
  $("btn-save-card").textContent = "変更を保存";
  $("btn-new-card").classList.remove("hidden");
  fillEditList();
  window.scrollTo(0, 0);
}
$("f-edit").addEventListener("change", () => {
  const id = $("f-edit").value;
  if (id) loadIntoForm(id); else resetCreateForm();
});
$("btn-new-card").onclick = () => resetCreateForm();

function resetCreateForm() {
  editCardId = null;
  currentEmoji = "";
  $("f-kind").disabled = false;
  $("create-title").textContent = "カード作成";
  $("btn-save-card").textContent = "保存";
  $("btn-new-card").classList.add("hidden");
  fillEditList();
  currentImg = "";
  ["f-name", "f-hp", "f-upcost"].forEach(id => $(id).value = "");
  ["a1", "a2"].forEach(p => {
    $("f-" + p + "type").value = "attack";
    ["name", "cost", "v1", "v2"].forEach(k => $("f-" + p + k).value = "");
    updateSkillForm(p);
  });
  $("f-kind").value = "normal";
  updateKindForm();
  $("f-img").value = "";
  $("f-preview").textContent = "画像未選択";
}

// 画像を選んだら、小さくして(300×300)プレビューに表示
$("f-img").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const size = 300;
      const canvas = document.createElement("canvas");
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext("2d");
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale, h = img.height * scale;
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      currentImg = canvas.toDataURL("image/jpeg", 0.85);
      $("f-preview").innerHTML = `<img src="${currentImg}" alt="">`;
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});

// 入力された技を読みとって、ゲームで使う形にする。まちがいがあれば文字(エラー)を返す
function readSkill(p, no) {
  const type = $("f-" + p + "type").value;
  const name = $("f-" + p + "name").value.trim();
  const cost = parseInt($("f-" + p + "cost").value, 10);
  const v1 = parseInt($("f-" + p + "v1").value, 10);
  const v2 = parseInt($("f-" + p + "v2").value, 10);
  const f = SKILL_FORM[type];
  if (!name) return `技${no}の名前を入力してください`;
  if (!(cost >= 0)) return `技${no}のコストは0以上の数字で入力してください`;
  if (!(v1 >= 0)) return `技${no}の「${f.v1}」は0以上の数字で入力してください`;
  if (type === "sacrifice" && !(v2 >= 0)) return `技${no}の「${f.v2}」は0以上の数字で入力してください`;
  if (type === "chance" && !(v2 >= 1 && v2 <= 100)) return `技${no}の「${f.v2}」は1〜100の数字で入力してください`;
  if (type === "heal") return { type, name, cost, heal: v1 };
  if (type === "sacrifice") return { type, name, cost, dmg: v1, self: v2 };
  if (type === "chance") return { type, name, cost, dmg: v1, pct: v2 };
  return { type, name, cost, dmg: v1 };   // 攻撃・全体攻撃
}

$("btn-save-card").onclick = () => {
  const kind = $("f-kind").value;
  const name = $("f-name").value.trim();
  const hp = parseInt($("f-hp").value, 10);
  if (!currentImg && !currentEmoji) return alert("イラスト画像を選んでください");
  if (!name) return alert("カード名を入力してください");
  if (!(hp >= 1)) return alert("HPは1以上の数字で入力してください");
  const a1 = readSkill("a1", "①");
  if (typeof a1 === "string") return alert(a1);
  const a2 = readSkill("a2", "②");
  if (typeof a2 === "string") return alert(a2);

  const card = { id: editCardId || ("c" + Date.now()), kind: kind, name: name, hp: hp, a1: a1, a2: a2 };
  if (currentImg) card.img = currentImg; else card.emoji = currentEmoji;
  if (kind === "power") {
    const baseId = $("f-base").value;
    const upCost = parseInt($("f-upcost").value, 10);
    if (!baseId) return alert("置き換え元の通常カードをえらんでください");
    if (!(upCost >= 0)) return alert("置き換えのコストは0以上の数字で入力してください");
    card.baseId = baseId;
    card.upCost = upCost;
  }
  const cards = loadCards();
  const at = editCardId ? cards.findIndex(c => c.id === editCardId) : -1;
  if (at >= 0) cards[at] = card; else cards.push(card);
  if (!saveCards(cards)) return;
  alert(at >= 0 ? "カードを更新しました!" : "カードを保存しました!");
  resetCreateForm();
};

// ---------- ⑥ デッキ編成(デッキはいくつでも作れる) ----------
let editId = null;     // 編集中のデッキの番号(新しく作るときは null)
let deckSel = [];      // いまえらんでいるカードの番号(通常カードもパワーアップカードも入る)

// デッキの一覧を表示
function renderDeckManage() {
  $("deck-edit").classList.add("hidden");
  $("deck-manage").classList.remove("hidden");
  const decks = loadDecks();
  $("deck-rows").innerHTML = decks.length === 0
    ? '<p class="note">まだデッキがありません。「新しいデッキを作る」を押してください。</p>'
    : decks.map(d => {
        const p = deckParts(d);
        const warn = p.normals.length === DECK_CHAR ? "" : " ⚠ 通常カードが10枚に足りません";
        return `<div class="deck-row"><div class="dname">${esc(d.name)}<small>通常${p.normals.length}/${DECK_CHAR}枚 + パワーアップ${p.powers.length}枚${warn}</small></div>
          <button class="btn small" data-edit="${d.id}">編集</button>
          <button class="btn small danger" data-deldeck="${d.id}">削除</button></div>`;
      }).join("");
}
$("deck-rows").addEventListener("click", e => {
  const editBtn = e.target.dataset.edit;
  const delBtn = e.target.dataset.deldeck;
  if (editBtn) openDeckEdit(editBtn);
  if (delBtn && confirm("このデッキを削除しますか?(カードは消えません)")) {
    saveDecks(loadDecks().filter(d => d.id !== delBtn));
    renderDeckManage();
  }
});
$("btn-new-deck").onclick = () => openDeckEdit(null);
$("btn-back-deck").onclick = () => renderDeckManage();

// デッキをつくる・直す画面を開く
function openDeckEdit(id) {
  editId = id;
  const d = loadDecks().find(x => x.id === id);
  const cards = loadCards();
  deckSel = d ? d.ids.filter(i => cards.some(c => c.id === i)) : [];
  $("f-deckname").value = d ? d.name : "";
  $("deck-manage").classList.add("hidden");
  $("deck-edit").classList.remove("hidden");
  drawDeckList();
  window.scrollTo(0, 0);
}

function countSel(wantPower) {
  const cards = loadCards();
  return deckSel.filter(id => { const c = cards.find(x => x.id === id); return c && isPower(c) === wantPower; }).length;
}

// 通常カードとパワーアップカードを分けて表示
function drawDeckList() {
  const cards = loadCards();
  const normals = cards.filter(c => !isPower(c));
  const powers = cards.filter(isPower);
  $("deck-count").textContent = `通常カード:${countSel(false)} / ${DECK_CHAR}　パワーアップ:${countSel(true)}枚`;
  if (cards.length === 0) {
    $("deck-list").innerHTML = '<p class="note">まだカードがありません。「カード作成」で作るか、下のサンプルカードを追加してください。</p>';
    return;
  }
  const item = (c, cap) => {
    const sel = deckSel.includes(c.id) ? " selected" : "";
    return `<div class="deck-item" data-id="${c.id}">${cardHTML(c, sel)}${cap ? `<div class="cap">${esc(cap)}</div>` : ""}<div class="btns"><button class="edit" data-editcard="${c.id}">編集</button><button class="del" data-del="${c.id}">削除</button></div></div>`;
  };
  let h = "<h3>通常カード</h3>";
  h += normals.length ? `<div class="grid">${normals.map(c => item(c, "")).join("")}</div>` : '<p class="note">通常カードがありません。</p>';
  h += "<h3>パワーアップカード</h3>";
  h += '<p class="note">えらぶと、元の通常カードと合わせて1枚として数えます。</p>';
  h += powers.length
    ? `<div class="grid">${powers.map(c => {
        const b = cards.find(x => x.id === c.baseId);
        return item(c, b ? `元:${b.name} / 💎${c.upCost}` : "(元のカードがありません)");
      }).join("")}</div>`
    : '<p class="note">パワーアップカードはありません。「カード作成」で作れます。</p>';
  $("deck-list").innerHTML = h;
}

// カードをタップしたときの、えらぶ・外すの処理
function toggleCard(id) {
  const cards = loadCards();
  const c = cards.find(x => x.id === id);
  if (!c) return;
  if (deckSel.includes(id)) {
    deckSel = deckSel.filter(x => x !== id);
    if (!isPower(c)) {   // 通常カードを外したら、そのパワーアップカードも外す
      deckSel = deckSel.filter(x => { const p = cards.find(y => y.id === x); return !(p && isPower(p) && p.baseId === id); });
    }
    return;
  }
  if (isPower(c)) {
    const base = cards.find(x => x.id === c.baseId && !isPower(x));
    if (!base) return alert("このパワーアップカードの、元の通常カードがありません。");
    if (countSel(true) >= MAX_POWER) return alert(`パワーアップカードは${MAX_POWER}枚までです。`);
    // 元の通常カードをえらんでいないと、パワーアップカードはえらべない
    if (!deckSel.includes(base.id)) return alert(`先に、元の通常カード「${base.name}」をえらんでください。`);
    deckSel.push(id);
  } else {
    if (countSel(false) >= DECK_CHAR) return alert("通常カードは10枚までです。");
    deckSel.push(id);
  }
}

$("deck-list").addEventListener("click", e => {
  const editCid = e.target.dataset.editcard;
  if (editCid) { show("create"); loadIntoForm(editCid); return; }
  const delId = e.target.dataset.del;
  if (delId) {
    if (!confirm("このカードを削除しますか?(入っているデッキから外れます)")) return;
    saveCards(loadCards().filter(c => c.id !== delId));
    const decks = loadDecks();
    decks.forEach(d => { d.ids = d.ids.filter(x => x !== delId); });
    saveDecks(decks);
    deckSel = deckSel.filter(id => id !== delId);
    drawDeckList();
    return;
  }
  const item = e.target.closest(".deck-item");
  if (!item) return;
  toggleCard(item.dataset.id);
  drawDeckList();
});

// サンプルカードを追加(通常カード10枚 + パワーアップ2枚)
$("btn-sample").onclick = () => {
  const cards = loadCards();
  SAMPLE_CARDS.forEach(s => {
    if (cards.some(c => c.name === s.name)) return;
    cards.push({ id: "sample:" + s.name, kind: "normal", name: s.name, emoji: s.emoji, hp: s.hp, a1: s.a1, a2: s.a2 });
  });
  SAMPLE_POWERS.forEach(s => {
    if (cards.some(c => c.name === s.name)) return;
    const base = cards.find(c => c.name === s.baseName && !isPower(c));
    if (!base) return;
    cards.push({ id: "sample:" + s.name, kind: "power", name: s.name, emoji: s.emoji, hp: s.hp,
      baseId: base.id, upCost: s.upCost, a1: s.a1, a2: s.a2 });
  });
  if (saveCards(cards)) drawDeckList();
};
$("btn-save-deck").onclick = () => {
  const n = countSel(false);
  if (n !== DECK_CHAR) return alert(`通常カードを${DECK_CHAR}枚えらんでください(いま${n}枚)`);
  const decks = loadDecks();
  const d = decks.find(x => x.id === editId);
  const name = $("f-deckname").value.trim() || (d ? d.name : "デッキ" + (decks.length + 1));
  if (d) { d.name = name; d.ids = deckSel.slice(); }
  else decks.push({ id: "d" + Date.now(), name: name, ids: deckSel.slice() });
  if (!saveDecks(decks)) return;
  alert("デッキを保存しました!");
  renderDeckManage();
};

// ---------- ⑦ 対戦準備(自分とCPUのデッキをえらぶ) ----------
function renderReady() {
  const decks = loadDecks().filter(deckValid);   // 通常カードが10枚そろったデッキだけ
  const sel = loadSel();
  const opt = d => `<option value="${d.id}">${esc(d.name)}</option>`;
  $("sel-player").innerHTML = decks.map(opt).join("");
  $("sel-cpu").innerHTML = '<option value="auto">おまかせ(ゲームのデッキ)</option>' + decks.map(opt).join("");
  if (decks.some(d => d.id === sel.p)) $("sel-player").value = sel.p;
  if (sel.c === "auto" || decks.some(d => d.id === sel.c)) $("sel-cpu").value = sel.c;
  $("ready-msg").textContent = decks.length === 0
    ? "通常カード10枚そろったデッキがありません。先に「デッキ編成」でデッキを作ってください。"
    : "CPUには、自分で作ったデッキも使えます。先攻・後攻は、バトル開始のコイントスで決まります。";
  $("btn-battle").disabled = decks.length === 0;
}
$("btn-battle").onclick = () => {
  saveSel({ p: $("sel-player").value, c: $("sel-cpu").value });
  startBattle();
};

// ---------- ⑧ バトルのルール ----------
// battleSeq は「何回目のバトルか」の番号。バトルをやめると番号が増えて、
// 古いバトルの待ち時間(sleep)はそのまま止まる(= 古いバトルの続きが動かない)
let battleSeq = 0;
function sleep(ms) {
  const seq = battleSeq;
  return new Promise(r => setTimeout(() => { if (seq === battleSeq) r(); }, ms));
}
function wait(ms) { return sleep(ms * SPEED); }   // 「間」をあける。SPEEDで全体の速さが変わる
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function who(side) { return side === G.player ? "あなた" : "CPU"; }
function foe(side) { return side === G.player ? G.cpu : G.player; }
function infoEl(side) { return side === G.player ? $("p-info") : $("c-info"); }
function addLog(text) { G.log.push(text); if (G.log.length > 50) G.log.shift(); }

function makeChar(d) {
  let baseName = d.baseName || "";
  if (d.baseId && !baseName) {
    const b = loadCards().find(x => x.id === d.baseId);
    baseName = b ? b.name : "";
  }
  return { uid: ++uidCounter, type: "char", srcId: d.id || ("n:" + d.name),
    power: isPower(d), baseId: d.baseId || null, baseName: baseName, upCost: d.upCost || 0,
    name: d.name, img: d.img || "", emoji: d.emoji || "",
    maxHp: d.hp, hp: d.hp, a1: normSkill(d.a1), a2: normSkill(d.a2),
    acted: false, fresh: false, guard: false, amulet: false, plush: false, decoy: 0, under: null };
}
function makeItem(def) {
  return { uid: ++uidCounter, type: "item", kind: def.kind, name: def.name, icon: def.icon, short: def.short, desc: def.desc };
}
function makeCost() {
  return { uid: ++uidCounter, type: "cost", name: "コスト", icon: "💎", short: "使うと💎+1", desc: "使うと💎を1つ獲得" };
}

// ランダムにアイテムをえらぶ(「キャラ復活」は REVIVE_MAX 枚まで)
function pickItems(count) {
  const list = [];
  let revive = 0;
  while (list.length < count) {
    const def = ITEMS[Math.floor(Math.random() * ITEMS.length)];
    if (def.kind === "revive") {
      if (revive >= REVIVE_MAX) continue;
      revive++;
    }
    list.push(def);
  }
  return list;
}

// 40枚のデッキを作って、最初の手札を配る
// キャラ(通常+パワーアップ)の数に合わせて、アイテムとコストの数を調整する(アイテム:コスト = 約1:2)
function buildSide(charDatas) {
  const deck = [];
  charDatas.forEach(d => deck.push(makeChar(d)));
  const rest = Math.max(0, DECK_TOTAL - charDatas.length);
  const items = Math.round(rest / 3);
  const costs = rest - items;
  pickItems(items).forEach(def => deck.push(makeItem(def)));
  for (let i = 0; i < costs; i++) deck.push(makeCost());
  shuffle(deck);
  const side = { hp: START_HP, cost: 0, deck: deck, hand: [], field: [], down: [], turns: 0 };
  // 5枚引く。場に出せるキャラ(パワーアップ以外)が1枚もなければ、全部戻して引き直す
  while (true) {
    side.hand = side.deck.splice(0, START_HAND);
    if (side.hand.some(c => c.type === "char" && !c.power)) break;
    side.deck = shuffle(side.deck.concat(side.hand));
    side.hand = [];
  }
  return side;
}

async function startBattle() {
  battleSeq++;                       // 前のバトルが動いていたら止める
  const sel = loadSel();
  const decks = loadDecks();
  const pd = decks.find(d => d.id === sel.p);
  const pChars = pd && deckValid(pd) ? deckCards(pd) : [];
  if (pChars.length === 0) {
    alert("デッキをえらんでください(通常カード10枚そろったデッキが必要です)。");
    show("ready");
    return;
  }
  let cChars = CPU_CARDS.concat(CPU_POWERS);   // 「おまかせ」ならゲームのデッキ
  if (sel.c && sel.c !== "auto") {
    const cd = decks.find(d => d.id === sel.c);
    if (cd && deckValid(cd)) cChars = deckCards(cd);
  }
  G = { player: buildSide(pChars), cpu: buildSide(cChars), turn: "player", busy: true, over: false, log: [], acting: null, first: "player" };
  T = null;
  show("battle");
  render();
  // コイントスで先攻・後攻を決める
  G.first = await coinToss();
  addLog(G.first === "player" ? "コイントス:あなたの先攻!" : "コイントス:CPUの先攻!");
  if (G.first === "player") startPlayerTurn();
  else await cpuTurn();
}

// コイントス(FIRSTならあなたが先攻、SECONDならCPUが先攻)。さっと終わる
async function coinToss() {
  const first = Math.random() < 0.5;
  const ov = $("coin-overlay"), wrap = $("coin-wrap"), coin = $("coin");
  $("coin-text").textContent = "";
  $("coin-text").className = "";
  $("coin-sub").textContent = "";
  ov.classList.remove("hidden", "landed");
  // いったん最初の状態にもどす
  wrap.classList.remove("toss");
  coin.style.transition = "none";
  coin.style.transform = "rotateX(0deg)";
  void coin.offsetWidth;
  // 空中でくるくる回って、FIRST(1440度)かSECOND(1620度)の面が上になる
  wrap.classList.add("toss");
  coin.style.transition = "transform .95s cubic-bezier(.2,.6,.3,1)";
  coin.style.transform = "rotateX(" + (first ? 1440 : 1620) + "deg)";
  await sleep(1000);
  ov.classList.add("landed");
  $("coin-text").textContent = first ? "FIRST" : "SECOND";
  $("coin-text").className = "show";
  $("coin-sub").textContent = first ? "あなたの先攻!" : "CPUの先攻!";
  await sleep(750);
  ov.classList.add("hidden");
  return first ? "player" : "cpu";
}

// ターンの最初にやること(ドロー → 💎獲得 → 防御・お守り・出したばかりの解除 → 行動できるように)
function beginTurn(side) {
  side.turns += 1;
  const card = side.deck.shift();       // デッキが空なら何も引かない
  if (card) side.hand.push(card);
  const gain = side.field.length;
  side.cost += gain;
  side.field.forEach(c => {
    c.guard = false; c.amulet = false; c.acted = false; c.fresh = false;
    if (c.decoy > 0) c.decoy -= 1;      // 身代わりは、自分のターンが来るたびに1つ減る
  });
  addLog(`${who(side)}のターン(ドロー${card ? "1枚" : "なし"}、💎+${gain})`);
}

function startPlayerTurn() {
  G.turn = "player";
  beginTurn(G.player);
  G.busy = false;
  render();
}

function useCostCard(side, card) {
  side.hand = side.hand.filter(c => c !== card);
  side.down.push(card);
  side.cost += 1;
  addLog(`${who(side)}はコストカードで💎+1`);
}

// 場に出す(出したキャラはすぐ行動できる。ただし、そのターンはプレイヤーへの直接攻撃だけできない)
function playChar(side, card) {
  if (card.power) return false;               // パワーアップカードは、置き換えでしか場に出せない
  if (side.field.length >= FIELD_MAX) return false;
  side.hand = side.hand.filter(c => c !== card);
  card.acted = false;
  card.fresh = true;
  card.guard = false;
  side.field.push(card);
  addLog(`${who(side)}は${card.name}を場に出した`);
  return true;
}

// 相手の「身代わり」がいるときは、そのキャラしか攻撃対象にできない
function targetsFor(foeSide) {
  const decoys = foeSide.field.filter(c => c.decoy > 0);
  return decoys.length > 0 ? decoys : foeSide.field.slice();
}

// キャラにダメージをあたえる。isAttack=true(キャラの技)ならお守りで0になる。
// 防御中は半分。防御中でHPが2以上なら、HP0以下になっても1だけ残る
function hitChar(t, dmg, isAttack) {
  const r = { dmg: dmg, blocked: false, half: false, survived: false };
  if (isAttack && t.amulet) { r.dmg = 0; r.blocked = true; return r; }
  if (t.guard) { r.dmg = Math.ceil(dmg / 2); r.half = true; }
  const before = t.hp;
  t.hp -= r.dmg;
  if (t.guard && before >= 2 && t.hp <= 0) { t.hp = 1; r.survived = true; }
  return r;
}
function hitLog(t, r) {
  if (r.blocked) return `${t.name}はお守りで0ダメージ!`;
  let s = `${t.name}に${r.dmg}ダメージ`;
  if (r.half) s += "(防御で半減)";
  if (r.survived) s += " HP1でこらえた!";
  return s;
}

// ダウンしたキャラを場からダウンゾーンへ送る(パワーアップ中なら、下の元カードも一緒に送る)
async function sendDown(side, ch) {
  const el = cardEl(ch.uid);
  if (el) {
    el.classList.add("downing");
    fx(el, "down");
    await sleep(750);
  }
  side.field = side.field.filter(c => c !== ch);
  side.down.push(ch);
  addLog(`${ch.name}はダウンした!`);
  if (ch.under) {
    side.down.push(ch.under);
    addLog(`${ch.under.name}も一緒にダウン`);
    ch.under = null;
  }
  render();
}

// アイテムが「いま使えない理由」を返す(使えるときは空の文字)
function itemBlock(side, card) {
  const foeSide = foe(side);
  switch (card.kind) {
    case "laser":
      if (side.turns <= LASER_LOCK) return "最初のターンは使えません";
      if (side.cost < LASER_COST) return `💎が${LASER_COST}つ必要です`;
      return "";
    case "bomb":
      return foeSide.field.length > 0 ? "" : "相手の場にキャラがいないので使えません";
    case "healChar": case "amulet": case "plush": case "decoy":
      return side.field.length > 0 ? "" : "場にキャラがいないので使えません";
    case "revive":
      return side.down.some(c => c.type === "char") ? "" : "ダウンしたキャラがいないので使えません";
    case "swap":
      return side.field.some(c => !c.power) && side.hand.some(c => c.type === "char" && !c.power)
        ? "" : "場と手札の両方に、パワーアップ以外のキャラが必要です";
    default:
      return "";
  }
}

// アイテムを使う。target は対象のキャラ、target2 は「交代」で場に出す手札のキャラ
async function useItem(side, card, target, target2) {
  if (itemBlock(side, card)) return false;
  const foeSide = foe(side);
  const myInfo = infoEl(side), foeInfo = infoEl(foeSide);
  side.hand = side.hand.filter(c => c !== card);
  side.down.push(card);
  if (card.kind === "laser") side.cost -= LASER_COST;
  addLog(`${who(side)}は「${card.name}」を使った!`);
  if (side === G.cpu) { render(); await wait(900); }   // CPUのときは、まず何を使ったか見せる

  const k = card.kind;
  if (k === "healPlayer") {
    side.hp = Math.min(START_HP, side.hp + 50);
    render();
    fx(myInfo, "heal"); popAt(myInfo, "+50", "heal");
    await sleep(900);
  } else if (k === "healChar") {
    target.hp = Math.min(target.maxHp, target.hp + 50);
    addLog(`${target.name}のHPが回復した`);
    render();
    fx(cardEl(target.uid), "heal"); popDamage(target.uid, "+50", "heal");
    await sleep(900);
  } else if (k === "revive") {
    side.down = side.down.filter(c => c !== target);
    target.hp = target.maxHp;
    target.acted = false; target.fresh = false; target.guard = false; target.amulet = false; target.plush = false; target.decoy = 0;
    target.under = null;
    side.hand.push(target);
    addLog(`${target.name}が手札に戻った`);
    render();
    fx(cardEl(target.uid) || myInfo, "heal");
    await sleep(900);
  } else if (k === "bomb") {
    const list = foeSide.field.slice();
    const results = list.map(t => ({ t: t, r: hitChar(t, 30, false) }));   // 防御中は半分
    results.forEach(x => addLog(hitLog(x.t, x.r)));
    render();
    results.forEach(x => {
      fx(cardEl(x.t.uid), "bomb"); popDamage(x.t.uid, "-" + x.r.dmg);
      if (x.r.survived) fx(cardEl(x.t.uid), "guard");
    });
    await sleep(1000);
    for (const x of results) if (x.t.hp <= 0) await sendDown(foeSide, x.t);
  } else if (k === "laser") {
    foeSide.hp -= 30;
    render();
    fx(foeInfo, "laser"); popAt(foeInfo, "-30");
    await sleep(900);
    if (foeSide.hp <= 0) { finishGame(side === G.player); return true; }
  } else if (k === "amulet") {
    target.amulet = true;
    addLog(`${target.name}は次の相手ターン、攻撃が0ダメージ`);
    render();
    fx(cardEl(target.uid), "amulet");
    await sleep(900);
  } else if (k === "plush") {
    target.plush = true;
    addLog(`${target.name}の次の攻撃は2倍!(💎も2倍)`);
    render();
    fx(cardEl(target.uid), "plush");
    await sleep(900);
  } else if (k === "decoy") {
    target.decoy = DECOY_TURNS;
    addLog(`${target.name}が身代わりに!(${DECOY_TURNS}ターン)`);
    render();
    fx(cardEl(target.uid), "swap");
    await sleep(900);
  } else if (k === "swap") {
    const idx = side.field.indexOf(target);
    side.field[idx] = target2;                         // 手札のキャラが同じ場所に入る
    side.hand = side.hand.filter(c => c !== target2);
    target.hp = Math.min(target.maxHp, target.hp + 50);
    target.guard = false; target.amulet = false; target.plush = false; target.decoy = 0; target.acted = false; target.fresh = false;
    side.hand.push(target);                            // 場のキャラはHP+50で手札へ
    target2.acted = false; target2.fresh = true; target2.guard = false;   // 入ったキャラはすぐ行動できる(直接攻撃だけ不可)
    addLog(`${target.name}と${target2.name}が交代(${target.name}はHP+50)`);
    render();
    fx(cardEl(target2.uid), "swap");
    await sleep(900);
  }
  render();
  return true;
}

async function doGuard(side, ch) {
  if (ch.acted) return false;
  if (side === G.cpu) { G.acting = ch.uid; render(); await wait(800); }
  ch.guard = true;
  ch.acted = true;
  G.acting = null;
  addLog(`${who(side)}の${ch.name}は防御!`);
  render();
  fx(cardEl(ch.uid), "guard");
  await sleep(900);
  return true;
}

// ----- キャラの技 -----
const skillOf = (ch, n) => n === 1 ? ch.a1 : ch.a2;
const isDmgSkill = sk => sk.type !== "heal";
const needsEnemy = sk => sk.type === "attack" || sk.type === "sacrifice" || sk.type === "chance";   // 相手1体をえらぶ技

// 技が「いま使えない理由」を返す(使えるときは空の文字)
function skillBlock(side, ch, n) {
  const sk = skillOf(ch, n);
  const mult = isDmgSkill(sk) && ch.plush ? 2 : 1;
  const foeSide = foe(side);
  if (ch.acted) return "行動ずみ";
  if (side.cost < sk.cost * mult) return "コスト不足";
  if (sk.type === "all" && foeSide.field.length === 0) return "相手の場にキャラがいない";
  if (needsEnemy(sk) && foeSide.field.length === 0 && ch.fresh) return "出したばかりで直接攻撃できない";
  return "";
}

// 技を使う。target: 攻撃は相手のキャラ(相手の場が空なら null=直接攻撃)、回復は味方のキャラ、全体攻撃は null
async function doSkill(side, ch, n, target) {
  const sk = skillOf(ch, n);
  const foeSide = foe(side);
  if (skillBlock(side, ch, n)) return false;
  if (sk.type === "heal") {
    if (!target || !side.field.includes(target)) return false;
  } else if (needsEnemy(sk)) {
    if (target) { if (!targetsFor(foeSide).includes(target)) return false; }
    else if (foeSide.field.length > 0) return false;
  }

  const dmgSkill = isDmgSkill(sk);
  const mult = dmgSkill && ch.plush ? 2 : 1;      // ぬいぐるみ中は、コスト2倍・ダメージ2倍
  side.cost -= sk.cost * mult;
  ch.acted = true;
  if (dmgSkill) ch.plush = false;                  // ぬいぐるみの効果は1回の攻撃で終わり
  addLog(`${who(side)}の${ch.name}「${sk.name}」${mult === 2 ? "🧸" : ""}`);
  G.acting = ch.uid;
  render();
  if (side === G.cpu) await wait(800);             // CPUのときは、誰が動くか見せる

  // 回復
  if (sk.type === "heal") {
    G.acting = null;
    const before = target.hp;
    target.hp = Math.min(target.maxHp, target.hp + sk.heal);
    const got = target.hp - before;
    addLog(`${target.name}のHPが${got}回復`);
    render();
    fx(cardEl(target.uid), "heal"); popDamage(target.uid, "+" + got, "heal");
    await sleep(900);
    render();
    return true;
  }

  // 前に飛び出す動き
  const atkEl = cardEl(ch.uid);
  if (atkEl) {
    atkEl.classList.add(side === G.player ? "lunge-up" : "lunge-down");
    await sleep(450);
  }
  G.acting = null;

  // 確率攻撃は、まず当たるかどうか
  if (sk.type === "chance" && !(Math.random() * 100 < sk.pct)) {
    addLog(`はずれた…(成功${sk.pct}%)`);
    render();
    popAt(target ? cardEl(target.uid) : infoEl(foeSide), "MISS", "zero");
    await sleep(900);
    render();
    return true;
  }

  const dmg = sk.dmg * mult;
  if (sk.type === "all") {
    const list = foeSide.field.slice();
    const results = list.map(t => ({ t: t, r: hitChar(t, dmg, true) }));
    results.forEach(x => addLog(hitLog(x.t, x.r)));
    render();
    results.forEach(x => {
      const el = cardEl(x.t.uid);
      if (x.r.blocked) { fx(el, "guard"); popAt(el, "0", "zero"); }
      else { fx(el, "slash"); popAt(el, "-" + x.r.dmg); if (x.r.survived) fx(el, "guard"); }
    });
    await sleep(1000);
    for (const x of results) if (x.t.hp <= 0) await sendDown(foeSide, x.t);
  } else if (target) {
    const r = hitChar(target, dmg, true);
    addLog(hitLog(target, r));
    render();
    const tel = cardEl(target.uid);
    if (r.blocked) { fx(tel, "guard"); popAt(tel, "0", "zero"); }
    else { fx(tel, "slash"); popAt(tel, "-" + r.dmg); if (r.survived) fx(tel, "guard"); }
    await sleep(900);
    if (target.hp <= 0) await sendDown(foeSide, target);
  } else {
    foeSide.hp -= dmg;
    addLog(`直接攻撃で${dmg}ダメージ!`);
    render();
    fx(infoEl(foeSide), "slash"); popAt(infoEl(foeSide), "-" + dmg);
    await sleep(900);
    if (foeSide.hp <= 0) { finishGame(side === G.player); return true; }
  }

  // 捨て身は、自分もダメージを受ける
  if (sk.type === "sacrifice" && !G.over) {
    ch.hp -= sk.self;
    addLog(`${ch.name}も${sk.self}ダメージを受けた`);
    render();
    fx(cardEl(ch.uid), "slash"); popDamage(ch.uid, "-" + sk.self);
    await sleep(900);
    if (ch.hp <= 0) await sendDown(side, ch);
  }
  render();
  return true;
}

// ----- パワーアップ(通常カードを、手札のパワーアップカードに置き換える) -----
function powerBase(side, pcard) {
  return side.field.find(c => !c.power && c.srcId === pcard.baseId);
}
function powerBlock(side, pcard) {
  if (!pcard.power) return "パワーアップカードではありません";
  if (!powerBase(side, pcard)) return `元の「${pcard.baseName}」が場にいません`;
  if (side.cost < pcard.upCost) return "コスト不足";
  return "";
}
async function doPowerUp(side, pcard) {
  if (powerBlock(side, pcard)) return false;
  const base = powerBase(side, pcard);
  side.cost -= pcard.upCost;
  addLog(`${who(side)}の${base.name}がパワーアップ!`);
  G.acting = base.uid;
  render();
  if (side === G.cpu) await wait(800);

  // 力をためる(ビビビと細かくふるえる)
  const bel = cardEl(base.uid);
  if (bel) { bel.classList.add("charging"); fx(bel, "charge"); await sleep(900); }

  // 置き換え。受けていたダメージは引きつぐ(HPは最低1)
  const taken = base.maxHp - base.hp;
  const idx = side.field.indexOf(base);
  side.hand = side.hand.filter(c => c !== pcard);
  pcard.under = base;
  pcard.hp = Math.max(1, pcard.maxHp - taken);
  pcard.acted = base.acted; pcard.fresh = base.fresh; pcard.guard = base.guard;
  pcard.amulet = base.amulet; pcard.plush = base.plush; pcard.decoy = base.decoy;
  pcard.shownPct = base.shownPct;
  base.guard = false; base.amulet = false; base.plush = false; base.decoy = 0;
  side.field[idx] = pcard;
  G.acting = null;
  addLog(`${pcard.name}にパワーアップした!`);
  render();
  const nel = cardEl(pcard.uid);
  if (nel) nel.classList.add("powerup-in");
  fx(nel || infoEl(side), "power");
  goldFlash();
  await sleep(1800);
  render();
  return true;
}

function finishGame(playerWon) {
  G.over = true;
  G.acting = null;
  T = null;
  addLog(playerWon ? "あなたの勝ち!" : "あなたの負け…");
  render();
  setTimeout(() => {
    $("result-title").textContent = playerWon ? "🎉 勝利!" : "😢 敗北…";
    show("result");
  }, 1500);
}

// ---------- ⑨ エフェクト(キラキラ・ダメージ数字) ----------
// e: とび散る絵文字  n: 数  rise: 上にのぼる  line: 斬撃  ring: 広がる輪(色)  beam: ビーム  gold: 金色の演出
const FX = {
  slash:  { e: ["✨", "⭐", "💥", "✦"], n: 10, line: true },
  guard:  { e: ["✨", "🔴", "✦", "🛡️"], n: 10, ring: "#ff4d4d" },
  heal:   { e: ["💚", "✨", "🌟"], n: 9, rise: true },
  bomb:   { e: ["💥", "🔥", "✨"], n: 12, ring: "#ff9a2e" },
  laser:  { e: ["⚡", "✨", "🔴"], n: 10, beam: true },
  amulet: { e: ["🧿", "✨", "🌟"], n: 9, ring: "#25d3bd" },
  plush:  { e: ["🧸", "💖", "✨"], n: 9, rise: true },
  swap:   { e: ["🔄", "✨", "💫"], n: 9, ring: "#a66bff" },
  enter:  { e: ["✨", "⭐", "✦"], n: 8, ring: "#ffd86b" },
  gem:    { e: ["💎", "✨"], n: 7, rise: true },
  down:   { e: ["💨", "✨"], n: 6, rise: true },
  charge: { e: ["✨", "⭐", "✦"], n: 10, ring: "#ffd700" },
  power:  { e: ["✨", "⭐", "🌟", "💫", "✦", "✧"], n: 30, ring: "#ffd700", gold: true },
};

function cardEl(uid) {
  return document.querySelector('#screen-battle .card[data-uid="' + uid + '"]');
}

// el の場所にキラキラを出す(失敗してもゲームは止めない)
function fx(el, kind) {
  if (!el) return;
  try {
    const set = FX[kind] || FX.slash;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (let i = 0; i < set.n; i++) {
      const s = document.createElement("span");
      s.className = "spark" + (set.gold ? " gold" : "");
      s.textContent = set.e[i % set.e.length];
      const ang = Math.random() * Math.PI * 2, dist = (set.gold ? 45 : 28) + Math.random() * (set.gold ? 110 : 55);
      s.style.left = cx + "px";
      s.style.top = cy + "px";
      s.style.setProperty("--dx", Math.cos(ang) * dist + "px");
      s.style.setProperty("--dy", Math.sin(ang) * dist - (set.rise ? 45 : 0) + "px");
      s.style.animationDelay = Math.random() * (set.gold ? 0.5 : 0.15) + "s";
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 1800);
    }
    if (set.line) addFxEl("slash", cx, cy);
    if (set.ring) addFxEl("ring", cx, cy, set.ring);
    if (set.beam) addFxEl("beam", cx, cy);
    if (set.gold) {                               // 金色の演出:光の柱と、時間差で広がる輪
      addFxEl("pillar", cx, cy);
      setTimeout(() => addFxEl("ring", cx, cy, "#fff3a0"), 180);
      setTimeout(() => addFxEl("ring", cx, cy, "#ffb800"), 360);
    }
  } catch (e) { /* エフェクトが出なくてもゲームは続ける */ }
}
function addFxEl(cls, x, y, color) {
  const d = document.createElement("div");
  d.className = "fxe " + cls;
  d.style.left = x + "px";
  d.style.top = y + "px";
  if (color) d.style.setProperty("--c", color);
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 1400);
}
// 画面全体が金色にピカッと光る
function goldFlash() {
  try {
    const f = document.createElement("div");
    f.className = "goldflash";
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 1100);
  } catch (e) { /* なくてもよい */ }
}

// ダメージ・回復の数字を出す(cls なし=ダメージ)
function popAt(el, text, cls) {
  if (!el) return;
  const span = document.createElement("span");
  span.className = "pop" + (cls ? " " + cls : "");
  span.textContent = text;
  el.appendChild(span);
  if (!cls) { el.classList.add("hurt"); setTimeout(() => el.classList.remove("hurt"), 650); }
  setTimeout(() => span.remove(), 1100);
}
function popDamage(uid, text, cls) { popAt(cardEl(uid), text, cls); }
function gemFx(side) { fx(infoEl(side), "gem"); }

// HPゲージを、前の長さから新しい長さへなめらかに動かす
function animateBars() {
  const bars = document.querySelectorAll("[data-to]");
  if (bars.length === 0) return;
  void document.body.offsetWidth;   // いったん描画させてから長さを変える(アニメのため)
  bars.forEach(b => { b.style.width = b.dataset.to + "%"; });
}

// ---------- ⑩ CPU(ルールで動く簡単なAI) ----------
async function cpuTurn() {
  G.turn = "cpu";
  G.busy = true;
  beginTurn(G.cpu);
  render();
  await wait(1200);
  await aiPlay(G.cpu);
  if (G.over) return;
  await wait(800);
  startPlayerTurn();
}

// 防御・お守りを考えた、実際に入るダメージ
function effDmg(t, d, isAttack) {
  if (isAttack && t.amulet) return 0;
  return t.guard ? Math.ceil(d / 2) : d;
}

// そのキャラが使う技と対象をえらぶ(使うと良い技がなければ null)
function aiAction(side, ch) {
  const foeSide = foe(side);
  let best = null;
  [1, 2].forEach(n => {
    const sk = skillOf(ch, n);
    if (skillBlock(side, ch, n)) return;
    const mult = isDmgSkill(sk) && ch.plush ? 2 : 1;
    let score = 0, target = null;
    if (sk.type === "heal") {
      const t = side.field.filter(c => c.maxHp - c.hp > 0).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (!t || t.hp / t.maxHp > 0.6) return;               // あまりダメージを受けていなければ使わない
      score = Math.min(sk.heal, t.maxHp - t.hp) * 0.8;
      target = t;
    } else if (sk.type === "all") {
      score = foeSide.field.reduce((s, t) => s + Math.min(t.hp, effDmg(t, sk.dmg * mult, true)), 0) * 0.9;
    } else {
      if (sk.type === "sacrifice" && sk.self >= ch.hp) return;   // 自分がダウンしてしまう捨て身はしない
      const dmg = sk.dmg * mult;
      if (foeSide.field.length > 0) {
        const pool = targetsFor(foeSide);
        const noAmulet = pool.filter(t => !t.amulet);          // お守り中は0ダメージなので、さける
        const ts = noAmulet.length > 0 ? noAmulet : pool;
        const kill = ts.filter(t => effDmg(t, dmg, true) >= t.hp).sort((a, b) => b.hp - a.hp);
        target = kill.length > 0 ? kill[0] : ts.slice().sort((a, b) => a.hp - b.hp)[0];
        score = target.amulet ? 0 : Math.min(target.hp, effDmg(target, dmg, true)) + (kill.length > 0 ? 15 : 0);
      } else {
        score = dmg * 1.2;                                       // 直接攻撃
      }
      if (sk.type === "chance") score *= sk.pct / 100;
      if (sk.type === "sacrifice") score -= sk.self * 0.7;
    }
    if (score > 0 && (!best || score > best.score)) best = { n: n, target: target, score: score };
  });
  return best;
}

async function aiPlay(side) {
  const foeSide = foe(side);

  // 1. コストカードをすべて使う
  for (const card of side.hand.filter(c => c.type === "cost")) {
    if (G.over) return;
    useCostCard(side, card);
    render();
    gemFx(side);
    await wait(650);
  }

  // 2. アイテムカードを、使うと良いときに使う(ぬいぐるみは攻撃の直前に使う)
  for (const card of side.hand.filter(c => c.type === "item" && c.kind !== "plush")) {
    if (G.over) return;
    if (itemBlock(side, card)) continue;
    const k = card.kind;
    if (k === "healPlayer") {
      if (side.hp <= 50) await useItem(side, card);
    } else if (k === "healChar") {
      const t = side.field.filter(c => c.maxHp - c.hp >= 30).sort((a, b) => a.hp - b.hp)[0];
      if (t) await useItem(side, card, t);
    } else if (k === "revive") {
      const t = side.down.filter(c => c.type === "char").sort((a, b) => b.maxHp - a.maxHp)[0];
      if (t) await useItem(side, card, t);
    } else if (k === "bomb") {
      if (foeSide.field.length >= 2 || foeSide.field.some(c => c.hp <= 30)) await useItem(side, card);
    } else if (k === "laser") {
      if (foeSide.hp <= 30 || side.cost >= LASER_COST + 3) await useItem(side, card);
    } else if (k === "amulet") {
      const t = side.field.filter(c => !c.amulet).sort((a, b) => b.hp - a.hp)[0];
      if (t && foeSide.field.length > 0) await useItem(side, card, t);
    } else if (k === "decoy") {
      const t = side.field.slice().sort((a, b) => b.hp - a.hp)[0];     // いちばんHPが高いキャラを身代わりに
      if (t && side.field.length >= 2 && foeSide.field.length > 0 && !side.field.some(c => c.decoy > 0)) await useItem(side, card, t);
    } else if (k === "swap") {
      const f = side.field.filter(c => !c.power && c.hp <= c.maxHp * 0.35).sort((a, b) => a.hp - b.hp)[0];
      const h = side.hand.filter(c => c.type === "char" && !c.power).sort((a, b) => b.maxHp - a.maxHp)[0];
      if (f && h) await useItem(side, card, f, h);
    }
    if (G.over) return;
    await wait(500);
  }

  // 3. キャラクターを場に出す(HPの高い順)
  while (side.field.length < FIELD_MAX) {
    const chars = side.hand.filter(c => c.type === "char" && !c.power).sort((a, b) => b.maxHp - a.maxHp);
    if (chars.length === 0) break;
    playChar(side, chars[0]);
    G.acting = chars[0].uid;
    render();
    fx(cardEl(chars[0].uid), "enter");
    await wait(1100);
    G.acting = null;
  }

  // 4. パワーアップできるなら置き換える
  for (const pc of side.hand.filter(c => c.type === "char" && c.power)) {
    if (G.over) return;
    if (!powerBlock(side, pc)) { await doPowerUp(side, pc); await wait(500); }
  }

  // 5. ぬいぐるみ(2倍の💎を払える、まだ動いていないキャラがいるときだけ)
  for (const card of side.hand.filter(c => c.type === "item" && c.kind === "plush")) {
    if (G.over) return;
    const t = side.field
      .filter(c => !c.acted && !c.plush && Math.min(c.a1.cost, c.a2.cost) * 2 <= side.cost)
      .sort((a, b) => b.hp - a.hp)[0];
    if (t) { await useItem(side, card, t); await wait(500); }
  }

  // 6. 行動できるキャラで技を使う(使える技がなければ防御)
  for (const ch of side.field.slice()) {
    if (G.over) return;
    if (ch.acted) continue;
    const act = aiAction(side, ch);
    if (!act) { await doGuard(side, ch); await wait(600); continue; }
    await doSkill(side, ch, act.n, act.target);
    if (G.over) return;
    await wait(700);
  }
}

// ---------- ⑪ バトル画面の表示と操作 ----------
function infoHTML(side, label, showHand) {
  return `<div class="who">${label}</div>
    ${barHTML(side, side.hp, START_HP, "big", "HP " + Math.max(0, side.hp))}
    <div class="gemsbox">${gemsHTML(side.cost)}</div>
    <div class="stat">📚${side.deck.length}</div><div class="stat">☠${side.down.length}</div>${showHand ? `<div class="stat">✋${side.hand.length}</div>` : ""}`;
}
function fieldHTML(list) {
  let h = "";
  for (let i = 0; i < FIELD_MAX; i++) h += list[i] ? cardHTML(list[i], "", true) : '<div class="slot"></div>';
  return h;
}

function render() {
  if (!G) return;
  const handScroll = $("p-hand").scrollLeft;   // 手札のスクロール位置をおぼえておく
  $("c-info").innerHTML = infoHTML(G.cpu, "CPU", true);
  $("p-info").innerHTML = infoHTML(G.player, "あなた", false);
  $("c-field").innerHTML = fieldHTML(G.cpu.field);
  $("p-field").innerHTML = fieldHTML(G.player.field);
  $("p-hand").innerHTML = G.player.hand.map(c => cardHTML(c)).join("");
  $("p-hand").scrollLeft = handScroll;

  let label;
  if (G.over) label = "バトル終了";
  else if (T) label = "👆 " + T.prompt;
  else label = G.turn === "player" ? "▶ あなたのターン" : "CPUのターン…";
  $("turn-label").textContent = label;
  $("log").innerHTML = G.log.slice(-3).map(t => `<div>${esc(t)}</div>`).join("");   // 最新の3行
  $("btn-end").disabled = G.over || G.busy || G.turn !== "player" || !!T;
  $("btn-cancel").style.display = T ? "block" : "none";
  animateBars();
}

// ----- メニュー -----
function closeMenu() { $("menu").classList.remove("open"); }
// opt: card(大きく見せるカード) title msg note buttons noClose
function openMenu(opt) {
  const panel = $("menu-panel");
  panel.onclick = null;
  let h = "";
  // 自分のカードのメニューには、いま持っているコストを出す
  if (opt.card && !opt.noGems && G) h += `<div class="gembar">いまのコスト ${gemsHTML(G.player.cost)}</div>`;
  if (opt.card) h += bigCardHTML(opt.card, false, true);
  if (opt.title) h += `<h3>${esc(opt.title)}</h3>`;
  if (opt.msg) h += `<p class="msg">${esc(opt.msg)}</p>`;
  if (opt.note) h += `<p class="note">${esc(opt.note)}</p>`;
  panel.innerHTML = h;
  (opt.buttons || []).forEach(b => {
    const btn = document.createElement("button");
    btn.className = "btn small";
    btn.textContent = b.label;
    btn.disabled = !!b.disabled;
    btn.onclick = () => { closeMenu(); if (b.action) b.action(); };
    panel.appendChild(btn);
  });
  if (!opt.noClose) {
    const close = document.createElement("button");
    close.className = "btn small ghost";
    close.textContent = "閉じる";
    close.onclick = closeMenu;
    panel.appendChild(close);
  }
  $("menu").classList.add("open");
}
$("menu").addEventListener("click", e => { if (e.target.id === "menu") closeMenu(); });

// カードを並べて見せて、タップでえらばせる(キャラ復活など)
function openPicker(title, list, onPick) {
  const panel = $("menu-panel");
  panel.innerHTML = `<h3>${esc(title)}</h3><p class="note">カードをタップしてえらびます</p><div class="pick-grid">` +
    list.map(c => `<div class="pick" data-uid="${c.uid}">${bigCardHTML(Object.assign({}, c, { hp: c.maxHp }), true)}</div>`).join("") + "</div>";
  panel.onclick = e => {
    const el = e.target.closest(".pick");
    if (!el) return;
    const c = list.find(x => x.uid === Number(el.dataset.uid));
    if (c) { closeMenu(); onPick(c); }
  };
  const close = document.createElement("button");
  close.className = "btn small ghost";
  close.textContent = "やめる";
  close.onclick = closeMenu;
  panel.appendChild(close);
  $("menu").classList.add("open");
}

// ----- カードをタップして対象をえらぶ -----
// list の中のカードが光る。タップされたら onPick(そのカード) が呼ばれる
function startTarget(prompt, list, onPick) {
  T = { prompt: prompt, valid: list.map(c => c.uid), onPick: onPick };
  render();
}
$("btn-cancel").onclick = () => { T = null; render(); };

function findCard(uid) {
  return G.player.field.concat(G.player.hand, G.cpu.field).find(c => c.uid === uid);
}

// 操作中は他の操作ができないようにして実行
async function run(fn) {
  if (G.busy || G.over) return;
  G.busy = true;
  render();
  await fn();
  if (!G.over && G.turn === "player") G.busy = false;
  render();
}

// ----- 手札のカードをタップ -----
function handMenu(card) {
  const p = G.player;
  if (card.type === "cost") {
    openMenu({ card, buttons: [{ label: "使う(💎+1)",
      action: () => run(async () => { useCostCard(p, card); render(); gemFx(p); await sleep(400); }) }] });
  } else if (card.type === "char" && card.power) {
    const why = powerBlock(p, card);
    openMenu({ card, note: why || `場の「${card.baseName}」を、このカードに置き換えます(💎${card.upCost})`,
      buttons: [{ label: `パワーアップ(💎${card.upCost})`, disabled: !!why, action: () => run(() => doPowerUp(p, card)) }] });
  } else if (card.type === "char") {
    const full = p.field.length >= FIELD_MAX;
    openMenu({ card, note: full ? "場がいっぱいです(最大3枚)" : "出したキャラはすぐ行動できます(出したターンは直接攻撃だけできません)",
      buttons: [{ label: "場に出す", disabled: full,
        action: () => run(async () => { playChar(p, card); render(); fx(cardEl(card.uid), "enter"); await sleep(500); }) }] });
  } else {
    itemMenu(card);
  }
}

function itemMenu(card) {
  const p = G.player;
  const k = card.kind;
  const why = itemBlock(p, card);
  const use = (label, action) =>
    openMenu({ card, note: why, buttons: [{ label: label, disabled: !!why, action: action }] });

  if (k === "healPlayer") {
    use("使う", () => run(() => useItem(p, card)));
  } else if (k === "laser") {
    use(`使う(💎${LASER_COST})`, () => run(() => useItem(p, card)));
  } else if (k === "bomb") {
    use("使う", () => run(() => useItem(p, card)));
  } else if (k === "healChar" || k === "amulet" || k === "plush" || k === "decoy") {
    const prompt = k === "healChar" ? "回復するキャラをタップ"
      : k === "amulet" ? "お守りをつけるキャラをタップ"
      : k === "plush" ? "ぬいぐるみをわたすキャラをタップ" : "身代わりにするキャラをタップ";
    use("使う(対象をえらぶ)", () => startTarget(prompt, p.field, ch => run(() => useItem(p, card, ch))));
  } else if (k === "revive") {
    use("使う(復活させるキャラをえらぶ)", () => {
      const list = p.down.filter(c => c.type === "char");
      openPicker("復活させるキャラをえらぶ(HPは全回復)", list, ch => run(() => useItem(p, card, ch)));
    });
  } else if (k === "swap") {
    use("使う(対象をえらぶ)", () => {
      const fields = p.field.filter(c => !c.power);
      const hands = p.hand.filter(c => c.type === "char" && !c.power);
      startTarget("手札に戻す(場の)キャラをタップ", fields,
        f => startTarget("場に出す(手札の)キャラをタップ", hands,
          h => run(() => useItem(p, card, f, h))));
    });
  }
}

// ----- 自分の場のキャラをタップ -----
function skillBtnLabel(sk, n, m) {
  const mm = sk.type === "heal" ? 1 : m;
  const c = sk.cost * mm;
  const body = {
    attack: `💎${c} 💥${sk.dmg * mm}`,
    heal: `💎${c} 💚+${sk.heal}`,
    all: `💎${c} 全体💥${sk.dmg * mm}`,
    sacrifice: `💎${c} 💥${sk.dmg * mm} 自分-${sk.self}`,
    chance: `💎${c} 💥${sk.dmg * mm} ${sk.pct}%`,
  }[sk.type];
  return `${n === 1 ? "①" : "②"} ${sk.name}(${body})`;
}

function fieldMenu(ch) {
  const p = G.player;
  const m = ch.plush ? 2 : 1;
  let note = ch.acted ? "このターンはもう行動しました" : "";
  if (!ch.acted && ch.plush) note = "🧸次の攻撃は、💎も2倍・ダメージも2倍";
  if (!ch.acted && ch.fresh) note += (note ? " / " : "") + "出したばかりなので、直接攻撃はできません";
  const btn = n => {
    const sk = skillOf(ch, n);
    const why = skillBlock(p, ch, n);
    return { label: skillBtnLabel(sk, n, m) + (why && !ch.acted ? " ※" + why : ""), disabled: !!why,
      action: () => chooseSkillTarget(ch, n) };
  };
  openMenu({ card: ch, note, buttons: [
    btn(1), btn(2),
    { label: "防御(ダメージ半分・HP2以上ならHP1でこらえる)", disabled: ch.acted, action: () => run(() => doGuard(p, ch)) },
  ] });
}

// 技の対象をえらぶ(相手や味方のカードが光るので、タップする)
function chooseSkillTarget(ch, n) {
  const p = G.player;
  const sk = skillOf(ch, n);
  const foeSide = G.cpu;
  if (sk.type === "all") { run(() => doSkill(p, ch, n, null)); return; }
  if (sk.type === "heal") {
    startTarget("回復するキャラをタップ", p.field, t => run(() => doSkill(p, ch, n, t)));
    return;
  }
  if (foeSide.field.length === 0) { run(() => doSkill(p, ch, n, null)); return; }   // 相手の場が空なら直接攻撃
  const ts = targetsFor(foeSide);
  const prompt = ts.length < foeSide.field.length ? "身代わりのキャラをタップ(ほかは狙えません)" : "攻撃する相手をタップ";
  startTarget(prompt, ts, t => run(() => doSkill(p, ch, n, t)));
}

// カードのタップをまとめて受け取る
$("screen-battle").addEventListener("click", e => {
  if (!G || G.over || G.busy || G.turn !== "player") return;
  const el = e.target.closest(".card");

  // 対象をえらんでいる最中は、光っているカードだけ反応する
  if (T) {
    if (!el) return;
    const uid = Number(el.dataset.uid);
    if (!T.valid.includes(uid)) return;
    const card = findCard(uid);
    const pick = T.onPick;
    T = null;
    if (card) pick(card);
    else render();
    return;
  }

  if (!el) return;
  const zone = el.parentElement.id;
  const uid = Number(el.dataset.uid);
  if (zone === "p-hand") {
    const card = G.player.hand.find(c => c.uid === uid);
    if (card) handMenu(card);
  } else if (zone === "p-field") {
    const ch = G.player.field.find(c => c.uid === uid);
    if (ch) fieldMenu(ch);
  } else if (zone === "c-field") {
    const ch = G.cpu.field.find(c => c.uid === uid);
    if (ch) openMenu({ card: ch, noGems: true });   // 相手のカードは情報を見るだけ
  }
});

function endTurn() {
  if (!G || G.busy || G.over || G.turn !== "player" || T) return;
  G.busy = true;
  addLog("あなたはターンを終了した");
  render();
  const seq = battleSeq;
  setTimeout(() => { if (seq === battleSeq) cpuTurn(); }, 600 * SPEED);
}
$("btn-end").onclick = () => {
  if (!G || G.busy || G.over || G.turn !== "player" || T) return;
  // まだ何も行動していないキャラがいたら、確認する
  const idle = G.player.field.filter(c => !c.acted);
  if (idle.length > 0) {
    openMenu({ title: "確認", noClose: true,
      msg: `${idle.map(c => c.name).join("、")}の行動指示がありませんがよろしいですか?`,
      buttons: [{ label: "はい", action: endTurn }, { label: "いいえ" }] });
    return;
  }
  endTurn();
};
$("btn-quit").onclick = () => {
  // CPUのターン中でもやめられる
  if (confirm("バトルをやめてタイトルに戻りますか?")) {
    battleSeq++;                      // 動いている古いバトルを止める
    if (G) G.over = true;
    T = null;
    closeMenu();
    $("coin-overlay").classList.add("hidden");
    show("title");
  }
};

document.body.dataset.theme = "royal";   // デザインは ROYAL(ネイビー × ゴールド)

updateTitle();
