"use strict";
// ============================================================
//  イラストカードバトル
//  このファイルにゲームのすべての動きが書いてあります。
//  ① 設定とデータ  ② 保存  ③ カード表示  ④ 画面切り替え
//  ⑤ カード作成  ⑥ デッキ編成  ⑦ バトルのルール  ⑧ CPU  ⑨ バトル画面の操作
// ============================================================

// ---------- ① 設定とデータ ----------
const DECK_CHAR = 10;    // 自分で選ぶキャラクターカードの枚数
const ITEM_COUNT = 10;   // バトル開始時に入るアイテムカードの枚数
const COST_COUNT = 20;   // バトル開始時に入るコストカードの枚数
const FIELD_MAX = 3;     // 場に出せるキャラの数
const START_HP = 100;    // プレイヤーの最初のHP
const START_HAND = 5;    // 最初の手札の枚数

const $ = id => document.getElementById(id);

// アイテムカードの種類(あとから増やせます)
const ITEMS = [
  { kind: "healPlayer", name: "プレイヤー回復", icon: "💚", desc: "自分のHPを50回復" },
  { kind: "healChar",   name: "キャラ回復",     icon: "💊", desc: "場のキャラ1枚のHPを50回復" },
  { kind: "revive",     name: "キャラ復活",     icon: "✨", desc: "ダウンしたキャラ1枚を手札に戻す" },
];

// [名前, 絵文字, HP, 攻撃1名, コスト, ダメージ, 攻撃2名, コスト, ダメージ]
function toCard(a) {
  return { name: a[0], emoji: a[1], hp: a[2],
    a1: { name: a[3], cost: a[4], dmg: a[5] },
    a2: { name: a[6], cost: a[7], dmg: a[8] } };
}

// お試し用サンプルカード(自分のカードを作る前に遊んでみる用)
const SAMPLE_CARDS = [
  ["ねこ戦士", "🐱", 70, "ひっかき", 1, 20, "ねこパンチ", 3, 45],
  ["いぬ剣士", "🐶", 80, "かみつき", 2, 30, "ダッシュ斬り", 4, 55],
  ["うさぎ魔法使い", "🐰", 50, "ほしの光", 1, 15, "ムーンビーム", 3, 40],
  ["パンダ力士", "🐼", 100, "つっぱり", 2, 25, "どすこい", 5, 60],
  ["ライオン王", "🦁", 90, "ほえる", 2, 30, "王のいかり", 4, 60],
  ["とら闘士", "🐯", 75, "きばの一撃", 2, 35, "しま連撃", 4, 55],
  ["かえる忍者", "🐸", 55, "したのムチ", 1, 20, "水しゅりけん", 3, 40],
  ["ペンギン兵", "🐧", 65, "ダイブ", 1, 20, "こおりの槍", 3, 45],
  ["ユニコーン", "🦄", 60, "つの突き", 2, 30, "にじの光", 4, 50],
  ["かめ守護者", "🐢", 110, "こうら当て", 2, 20, "大ぼうそう", 5, 50],
].map(toCard);

// CPUが使うキャラクターカード(ゲーム側で用意)
const CPU_CARDS = [
  ["ドラゴン", "🐲", 90, "ひのこ", 2, 30, "ほのおのブレス", 4, 60],
  ["きつね", "🦊", 60, "ひっかき", 1, 20, "きつね火", 3, 40],
  ["おおかみ", "🐺", 75, "かみつき", 2, 30, "とおぼえ斬", 4, 55],
  ["ふくろう", "🦉", 55, "つばさ打ち", 1, 20, "ぎんの羽", 3, 40],
  ["くま", "🐻", 100, "ひっかき", 2, 25, "ベアハグ", 4, 55],
  ["へび", "🐍", 50, "どくきば", 1, 15, "しめつけ", 3, 40],
  ["わし", "🦅", 65, "急降下", 2, 30, "かぜの刃", 4, 50],
  ["タコ", "🐙", 70, "すみ吐き", 1, 20, "うで連打", 3, 45],
  ["ロボ", "🤖", 85, "パンチ", 2, 25, "レーザー", 4, 55],
  ["おばけ", "👻", 45, "おどろかし", 1, 15, "のろい", 3, 40],
].map(toCard);

// ---------- ② 保存(スマホのブラウザの中に保存されます) ----------
function loadCards() {
  try { return JSON.parse(localStorage.getItem("cb_cards")) || []; } catch (e) { return []; }
}
function saveCards(list) {
  try { localStorage.setItem("cb_cards", JSON.stringify(list)); return true; }
  catch (e) { alert("保存できませんでした(容量不足かもしれません)。不要なカードを削除してください。"); return false; }
}
function loadDeck() {
  try { return JSON.parse(localStorage.getItem("cb_deck")) || []; } catch (e) { return []; }
}
function saveDeck(ids) {
  try { localStorage.setItem("cb_deck", JSON.stringify(ids)); } catch (e) { alert("デッキを保存できませんでした。"); }
}

// ---------- ③ カードの見た目 ----------
function esc(s) {
  return String(s).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}
function artHTML(c) {
  if (c.img) return `<img src="${c.img}" alt="">`;
  return `<div class="emoji">${c.emoji || "❓"}</div>`;
}

// 小さいカード(手札・場・デッキ編成で使う)
function cardHTML(c) {
  if (c.type === "item" || c.type === "cost") {
    return `<div class="card ${c.type}" data-uid="${c.uid}">
      <div class="art"><div class="icon">${c.icon}</div></div>
      <div class="cname">${esc(c.name)}</div>
      <div class="desc">${esc(c.desc)}</div></div>`;
  }
  const max = c.maxHp || c.hp;
  const cls = (c.acted || c.canAct === false ? " done" : "") + (c.guard ? " guard" : "");
  return `<div class="card char${cls}" data-uid="${c.uid || ""}">
    <div class="art">${artHTML(c)}</div>
    <div class="cname">${esc(c.name)}</div>
    <div class="chp">HP ${c.hp}/${max}</div>
    <div class="catk">①⚡${c.a1.cost} 💥${c.a1.dmg}</div>
    <div class="catk">②⚡${c.a2.cost} 💥${c.a2.dmg}</div>
    ${c.guard ? '<div class="badge">🛡</div>' : ""}</div>`;
}

// 大きいカード(タップしたときのメニューに表示)
function bigCardHTML(c) {
  if (c.type === "item" || c.type === "cost") {
    return `<div class="big"><div class="bart">${c.icon}</div>
      <div class="bname">${esc(c.name)}</div><div class="batk">${esc(c.desc)}</div></div>`;
  }
  const max = c.maxHp || c.hp;
  return `<div class="big"><div class="bart">${artHTML(c)}</div>
    <div class="bname">${esc(c.name)}</div>
    <div class="bhp">HP ${c.hp}/${max}</div>
    <div class="batk">① ${esc(c.a1.name)}(コスト${c.a1.cost} / ダメージ${c.a1.dmg})</div>
    <div class="batk">② ${esc(c.a2.name)}(コスト${c.a2.cost} / ダメージ${c.a2.dmg})</div></div>`;
}

// ---------- ④ 画面切り替え ----------
function show(name) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  $("screen-" + name).classList.add("active");
  if (name === "title") updateTitle();
  if (name === "create") resetCreateForm();
  if (name === "deck") renderDeckScreen();
  window.scrollTo(0, 0);
}
function updateTitle() {
  $("title-info").textContent = `作ったカード:${loadCards().length}枚 / デッキ:${loadDeck().length}/${DECK_CHAR}枚`;
}
document.querySelectorAll("[data-go]").forEach(b => {
  b.addEventListener("click", () => show(b.dataset.go));
});
$("btn-create").onclick = () => show("create");
$("btn-deck").onclick = () => show("deck");
$("btn-start").onclick = () => startBattle();
$("btn-again").onclick = () => startBattle();

// ---------- ⑤ カード作成 ----------
let currentImg = "";

function resetCreateForm() {
  currentImg = "";
  ["f-name", "f-hp", "f-a1name", "f-a1cost", "f-a1dmg", "f-a2name", "f-a2cost", "f-a2dmg"].forEach(id => $(id).value = "");
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

$("btn-save-card").onclick = () => {
  const name = $("f-name").value.trim();
  const hp = parseInt($("f-hp").value, 10);
  const a1 = { name: $("f-a1name").value.trim(), cost: parseInt($("f-a1cost").value, 10), dmg: parseInt($("f-a1dmg").value, 10) };
  const a2 = { name: $("f-a2name").value.trim(), cost: parseInt($("f-a2cost").value, 10), dmg: parseInt($("f-a2dmg").value, 10) };

  if (!currentImg) return alert("イラスト画像を選んでください");
  if (!name) return alert("カード名を入力してください");
  if (!(hp >= 1)) return alert("HPは1以上の数字で入力してください");
  for (const a of [a1, a2]) {
    if (!a.name) return alert("攻撃名を入力してください");
    if (!(a.cost >= 0) || !(a.dmg >= 0)) return alert("コストとダメージは0以上の数字で入力してください");
  }

  const cards = loadCards();
  cards.push({ id: "c" + Date.now(), name: name, img: currentImg, hp: hp, a1: a1, a2: a2 });
  if (!saveCards(cards)) return;
  alert("カードを保存しました!");
  resetCreateForm();
};

// ---------- ⑥ デッキ編成 ----------
let deckSel = [];

function renderDeckScreen() {
  const cards = loadCards();
  deckSel = loadDeck().filter(id => cards.some(c => c.id === id));
  drawDeckList();
}
function drawDeckList() {
  const cards = loadCards();
  $("deck-count").textContent = `選択中:${deckSel.length} / ${DECK_CHAR}`;
  if (cards.length === 0) {
    $("deck-list").innerHTML = '<p class="note">まだカードがありません。「カード作成」で作るか、下のサンプルカードを追加してください。</p>';
    return;
  }
  $("deck-list").innerHTML = cards.map(c => {
    const html = cardHTML(c).replace('class="card char', 'class="card char' + (deckSel.includes(c.id) ? " selected" : ""));
    return `<div class="deck-item" data-id="${c.id}">${html}<button class="del" data-del="${c.id}">削除</button></div>`;
  }).join("");
}
$("deck-list").addEventListener("click", e => {
  const delId = e.target.dataset.del;
  if (delId) {
    if (!confirm("このカードを削除しますか?")) return;
    saveCards(loadCards().filter(c => c.id !== delId));
    deckSel = deckSel.filter(id => id !== delId);
    drawDeckList();
    return;
  }
  const item = e.target.closest(".deck-item");
  if (!item) return;
  const id = item.dataset.id;
  if (deckSel.includes(id)) {
    deckSel = deckSel.filter(x => x !== id);
  } else {
    if (deckSel.length >= DECK_CHAR) return alert("10枚までです。");
    deckSel.push(id);
  }
  drawDeckList();
});
$("btn-sample").onclick = () => {
  const cards = loadCards();
  SAMPLE_CARDS.forEach((s, i) => {
    if (cards.some(c => c.name === s.name)) return;
    cards.push({ id: "s" + Date.now() + i, name: s.name, emoji: s.emoji, hp: s.hp, a1: s.a1, a2: s.a2 });
  });
  if (saveCards(cards)) drawDeckList();
};
$("btn-save-deck").onclick = () => {
  if (deckSel.length !== DECK_CHAR) return alert(`キャラクターカードを${DECK_CHAR}枚えらんでください(いま${deckSel.length}枚)`);
  saveDeck(deckSel);
  alert("デッキを保存しました!");
  show("title");
};

// ---------- ⑦ バトルのルール ----------
let G = null;          // バトルの状態(ゲーム中ずっと使う)
let uidCounter = 0;    // カード1枚ごとの番号

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function who(side) { return side === G.player ? "あなた" : "CPU"; }
function foe(side) { return side === G.player ? G.cpu : G.player; }
function addLog(text) { G.log.push(text); if (G.log.length > 50) G.log.shift(); }

function makeChar(d) {
  return { uid: ++uidCounter, type: "char", name: d.name, img: d.img || "", emoji: d.emoji || "",
    maxHp: d.hp, hp: d.hp, a1: { ...d.a1 }, a2: { ...d.a2 }, canAct: false, acted: false, guard: false };
}
function makeItem(def) {
  return { uid: ++uidCounter, type: "item", kind: def.kind, name: def.name, icon: def.icon, desc: def.desc };
}
function makeCost() {
  return { uid: ++uidCounter, type: "cost", name: "コスト", icon: "💎", desc: "使うと1コスト獲得" };
}

// 40枚のデッキを作って、最初の手札を配る
function buildSide(charDatas) {
  const deck = [];
  charDatas.forEach(d => deck.push(makeChar(d)));
  for (let i = 0; i < ITEM_COUNT; i++) deck.push(makeItem(ITEMS[Math.floor(Math.random() * ITEMS.length)]));
  for (let i = 0; i < COST_COUNT; i++) deck.push(makeCost());
  shuffle(deck);
  const side = { hp: START_HP, cost: 0, deck: deck, hand: [], field: [], down: [] };
  // 5枚引く。キャラが1枚もなければ全部戻して引き直す
  while (true) {
    side.hand = side.deck.splice(0, START_HAND);
    if (side.hand.some(c => c.type === "char")) break;
    side.deck = shuffle(side.deck.concat(side.hand));
    side.hand = [];
  }
  return side;
}

function startBattle() {
  const saved = loadCards();
  const chars = loadDeck().map(id => saved.find(c => c.id === id)).filter(Boolean);
  if (chars.length !== DECK_CHAR) {
    alert("先にデッキ編成でキャラクターカードを10枚えらんでください。");
    show("deck");
    return;
  }
  G = { player: buildSide(chars), cpu: buildSide(CPU_CARDS), turn: "player", busy: false, over: false, log: [] };
  show("battle");
  addLog("バトル開始!");
  startPlayerTurn();
}

// ターンの最初にやること(ドロー → コスト獲得 → 防御解除 → 行動可能に)
function beginTurn(side) {
  const card = side.deck.shift();       // デッキが空なら何も引かない
  if (card) side.hand.push(card);
  side.cost += side.field.length;
  side.field.forEach(c => { c.guard = false; c.canAct = true; c.acted = false; });
  addLog(`${who(side)}のターン(ドロー${card ? "1枚" : "なし"}、コスト+${side.field.length})`);
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
  addLog(`${who(side)}はコストカードで+1コスト`);
}

function playChar(side, card) {
  if (side.field.length >= FIELD_MAX) return false;
  side.hand = side.hand.filter(c => c !== card);
  card.canAct = false;
  card.acted = false;
  card.guard = false;
  side.field.push(card);
  addLog(`${who(side)}は${card.name}を場に出した`);
  return true;
}

async function useItem(side, card, target) {
  if (card.kind === "healPlayer") {
    side.hp = Math.min(START_HP, side.hp + 50);
    addLog(`${who(side)}のHPが回復した`);
  } else if (card.kind === "healChar") {
    target.hp = Math.min(target.maxHp, target.hp + 50);
    addLog(`${target.name}のHPが回復した`);
  } else if (card.kind === "revive") {
    side.down = side.down.filter(c => c !== target);
    target.hp = target.maxHp;
    target.canAct = false; target.acted = false; target.guard = false;
    side.hand.push(target);
    addLog(`${who(side)}は${target.name}を手札に戻した`);
  }
  side.hand = side.hand.filter(c => c !== card);
  side.down.push(card);
  render();
  if (card.kind === "healPlayer") popAt(side === G.player ? $("p-info") : $("c-info"), "+50", "heal");
  if (card.kind === "healChar") popDamage(target.uid, "+50", "heal");
  await sleep(500);
}

async function doGuard(side, ch) {
  if (!ch.canAct || ch.acted) return false;
  ch.guard = true;
  ch.acted = true;
  addLog(`${who(side)}の${ch.name}は防御した`);
  render();
  await sleep(300);
  return true;
}

// 攻撃。target が null のときは直接攻撃(相手の場が空のときだけ)
async function doAttack(side, ch, n, target) {
  const atk = n === 1 ? ch.a1 : ch.a2;
  const foeSide = foe(side);
  if (!ch.canAct || ch.acted || side.cost < atk.cost) return false;
  if (target && !foeSide.field.includes(target)) return false;
  if (!target && foeSide.field.length > 0) return false;

  side.cost -= atk.cost;
  ch.acted = true;

  if (target) {
    let dmg = atk.dmg;
    if (target.guard) dmg = Math.ceil(dmg / 2);
    target.hp -= dmg;
    addLog(`${who(side)}の${ch.name}の「${atk.name}」!${target.name}に${dmg}ダメージ${target.guard ? "(防御で半減)" : ""}`);
    render();
    popDamage(target.uid, "-" + dmg);
    await sleep(700);
    if (target.hp <= 0) {
      foeSide.field = foeSide.field.filter(c => c !== target);
      foeSide.down.push(target);
      addLog(`${target.name}はダウンした!`);
    }
  } else {
    foeSide.hp -= atk.dmg;
    addLog(`${who(side)}の${ch.name}の「${atk.name}」!直接攻撃で${atk.dmg}ダメージ`);
    render();
    popAt(foeSide === G.player ? $("p-info") : $("c-info"), "-" + atk.dmg);
    await sleep(700);
    if (foeSide.hp <= 0) finishGame(side === G.player);
  }
  render();
  return true;
}

function finishGame(playerWon) {
  G.over = true;
  addLog(playerWon ? "あなたの勝ち!" : "あなたの負け…");
  render();
  setTimeout(() => {
    $("result-title").textContent = playerWon ? "🎉 勝利!" : "😢 敗北…";
    show("result");
  }, 1000);
}

// ---------- ⑧ CPU(ルールで動く簡単なAI) ----------
async function cpuTurn() {
  G.turn = "cpu";
  beginTurn(G.cpu);
  render();
  await sleep(700);
  await aiPlay(G.cpu);
  if (G.over) return;
  startPlayerTurn();
}

async function aiPlay(side) {
  const foeSide = foe(side);

  // 1. コストカードをすべて使う
  for (const card of side.hand.filter(c => c.type === "cost")) {
    useCostCard(side, card);
    render();
    await sleep(250);
  }

  // 2. アイテムカードを必要なときに使う
  for (const card of side.hand.filter(c => c.type === "item")) {
    if (G.over) return;
    if (card.kind === "healPlayer" && side.hp <= 50) {
      await useItem(side, card, null);
    } else if (card.kind === "healChar") {
      const t = side.field.filter(c => c.maxHp - c.hp >= 30).sort((a, b) => a.hp - b.hp)[0];
      if (t) await useItem(side, card, t);
    } else if (card.kind === "revive") {
      const t = side.down.find(c => c.type === "char");
      if (t) await useItem(side, card, t);
    }
  }

  // 3. キャラクターを場に出す(HPの高い順)
  while (side.field.length < FIELD_MAX) {
    const chars = side.hand.filter(c => c.type === "char").sort((a, b) => b.maxHp - a.maxHp);
    if (chars.length === 0) break;
    playChar(side, chars[0]);
    render();
    await sleep(400);
  }

  // 4. 行動できるキャラで攻撃(できなければ防御)
  for (const ch of side.field.slice()) {
    if (G.over) return;
    if (!ch.canAct || ch.acted) continue;

    const options = [{ n: 1, a: ch.a1 }, { n: 2, a: ch.a2 }]
      .filter(o => o.a.cost <= side.cost)
      .sort((x, y) => y.a.dmg - x.a.dmg);
    if (options.length === 0) { await doGuard(side, ch); continue; }

    const atk = options[0];
    let target = null;
    const ts = foeSide.field;
    if (ts.length > 0) {
      const eff = t => (t.guard ? Math.ceil(atk.a.dmg / 2) : atk.a.dmg);
      const kill = ts.filter(t => eff(t) >= t.hp).sort((a, b) => b.hp - a.hp);
      target = kill.length > 0 ? kill[0] : ts.slice().sort((a, b) => a.hp - b.hp)[0];
    }
    await doAttack(side, ch, atk.n, target);
    await sleep(400);
  }
}

// ---------- ⑨ バトル画面の表示と操作 ----------
function infoHTML(side, label, showHand) {
  const pct = Math.max(0, Math.min(100, side.hp / START_HP * 100));
  return `<div class="who">${label}</div>
    <div class="hpbar"><i style="width:${pct}%"></i><b>HP ${Math.max(0, side.hp)}</b></div>
    <div class="stat">⚡${side.cost}</div><div class="stat">📚${side.deck.length}</div>
    <div class="stat">☠${side.down.length}</div>${showHand ? `<div class="stat">✋${side.hand.length}</div>` : ""}`;
}
function fieldHTML(list) {
  let h = "";
  for (let i = 0; i < FIELD_MAX; i++) h += list[i] ? cardHTML(list[i]) : '<div class="slot"></div>';
  return h;
}

function render() {
  if (!G) return;
  $("c-info").innerHTML = infoHTML(G.cpu, "CPU", true);
  $("p-info").innerHTML = infoHTML(G.player, "あなた", false);
  $("c-field").innerHTML = fieldHTML(G.cpu.field);
  $("p-field").innerHTML = fieldHTML(G.player.field);
  $("p-hand").innerHTML = G.player.hand.map(cardHTML).join("");
  $("turn-label").textContent = G.over ? "バトル終了" : (G.turn === "player" ? "▶ あなたのターン" : "CPUのターン…");
  $("log").innerHTML = G.log.slice(-3).map(esc).join("<br>");
  $("btn-end").disabled = G.over || G.busy || G.turn !== "player";
}

// ダメージ数字を出す
function popAt(el, text, cls) {
  if (!el) return;
  const span = document.createElement("span");
  span.className = "pop" + (cls ? " " + cls : "");
  span.textContent = text;
  el.appendChild(span);
  if (!cls) el.classList.add("hit");
  setTimeout(() => { span.remove(); el.classList.remove("hit"); }, 900);
}
function popDamage(uid, text, cls) {
  const el = document.querySelector('.field [data-uid="' + uid + '"]');
  popAt(el, text, cls);
}

// ----- メニュー -----
function closeMenu() { $("menu").classList.remove("open"); }
function openMenu(opt) {
  const panel = $("menu-panel");
  let h = "";
  if (opt.card) h += bigCardHTML(opt.card);
  if (opt.title) h += `<h3>${esc(opt.title)}</h3>`;
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
  const close = document.createElement("button");
  close.className = "btn small ghost";
  close.textContent = "閉じる";
  close.onclick = closeMenu;
  panel.appendChild(close);
  $("menu").classList.add("open");
}
$("menu").addEventListener("click", e => { if (e.target.id === "menu") closeMenu(); });

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
    openMenu({ card, buttons: [{ label: "使う(+1コスト)", action: () => run(async () => useCostCard(p, card)) }] });
  } else if (card.type === "char") {
    openMenu({ card, buttons: [{
      label: "場に出す", disabled: p.field.length >= FIELD_MAX,
      action: () => run(async () => playChar(p, card)) }],
      note: p.field.length >= FIELD_MAX ? "場がいっぱいです(最大3枚)" : "出したターンは行動できません" });
  } else {
    itemMenu(card);
  }
}
function itemMenu(card) {
  const p = G.player;
  if (card.kind === "healPlayer") {
    openMenu({ card, buttons: [{ label: "使う", action: () => run(() => useItem(p, card, null)) }] });
  } else if (card.kind === "healChar") {
    if (p.field.length === 0) return openMenu({ card, note: "場にキャラがいないので使えません" });
    openMenu({ card, title: "回復するキャラを選ぶ",
      buttons: p.field.map(ch => ({ label: `${ch.name}(HP ${ch.hp}/${ch.maxHp})`, action: () => run(() => useItem(p, card, ch)) })) });
  } else if (card.kind === "revive") {
    const list = p.down.filter(c => c.type === "char");
    if (list.length === 0) return openMenu({ card, note: "ダウンしたキャラがいないので使えません" });
    openMenu({ card, title: "手札に戻すキャラを選ぶ",
      buttons: list.map(ch => ({ label: ch.name, action: () => run(() => useItem(p, card, ch)) })) });
  }
}

// ----- 自分の場のキャラをタップ -----
function fieldMenu(ch) {
  const p = G.player;
  const can = ch.canAct && !ch.acted;
  const note = !ch.canAct ? "出したばかりなので、次のターンから行動できます"
    : ch.acted ? "このターンはもう行動しました" : "";
  const label = (n, a) => `攻撃${n} ${a.name}(⚡${a.cost} 💥${a.dmg})${p.cost < a.cost ? " コスト不足" : ""}`;
  openMenu({ card: ch, note, buttons: [
    { label: label("①", ch.a1), disabled: !can || p.cost < ch.a1.cost, action: () => chooseTarget(ch, 1) },
    { label: label("②", ch.a2), disabled: !can || p.cost < ch.a2.cost, action: () => chooseTarget(ch, 2) },
    { label: "防御(次の相手ターン、ダメージ半分)", disabled: !can, action: () => run(() => doGuard(p, ch)) },
  ] });
}
function chooseTarget(ch, n) {
  const p = G.player;
  const ts = G.cpu.field;
  if (ts.length === 0) {
    run(() => doAttack(p, ch, n, null));   // 相手の場が空なら直接攻撃
    return;
  }
  openMenu({ title: "攻撃する相手を選ぶ",
    buttons: ts.map(t => ({ label: `${t.name}(HP ${t.hp}/${t.maxHp})${t.guard ? " 🛡" : ""}`, action: () => run(() => doAttack(p, ch, n, t)) })) });
}

// カードのタップをまとめて受け取る
$("screen-battle").addEventListener("click", e => {
  if (!G || G.over || G.busy || G.turn !== "player") return;
  const el = e.target.closest(".card");
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
    if (ch) openMenu({ card: ch });   // 相手のカードは情報を見るだけ
  }
});

$("btn-end").onclick = () => {
  if (!G || G.busy || G.over || G.turn !== "player") return;
  G.busy = true;
  addLog("あなたはターンを終了した");
  render();
  setTimeout(cpuTurn, 500);
};
$("btn-quit").onclick = () => {
  if (G && G.busy) return alert("CPUのターンが終わってからやめてください。");
  if (confirm("バトルをやめてタイトルに戻りますか?")) { G.over = true; show("title"); }
};

updateTitle();
