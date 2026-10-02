"use strict";
// ============================================================
//  イラストカードバトル
//  このファイルにゲームのすべての動きが書いてあります。
//  ① 設定とデータ  ② 保存  ③ カード表示  ④ 画面切り替え  ⑤ カード作成
//  ⑥ デッキ編成  ⑦ 対戦準備  ⑧ バトルのルール  ⑨ エフェクト
//  ⑩ CPU  ⑪ バトル画面の操作
// ============================================================

// ---------- ① 設定とデータ ----------
const DECK_CHAR = 10;    // 自分で選ぶキャラクターカードの枚数
const ITEM_COUNT = 10;   // バトル開始時に入るアイテムカードの枚数
const COST_COUNT = 20;   // バトル開始時に入るコストカードの枚数
const FIELD_MAX = 3;     // 場に出せるキャラの数
const START_HP = 100;    // プレイヤーの最初のHP
const START_HAND = 5;    // 最初の手札の枚数
const REVIVE_MAX = 2;    // 「キャラ復活」アイテムは1デッキに何枚まで入るか
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
  { kind: "bomb",       name: "爆弾",       icon: "💣", short: "相手全体30",  desc: "相手の場にいるキャラ全員に30ダメージ" },
  { kind: "amulet",     name: "お守り",     icon: "🧿", short: "次の被攻撃0", desc: "場のキャラ1枚が、次の相手ターンに攻撃を受けても0ダメージになる" },
  { kind: "plush",      name: "ぬいぐるみ", icon: "🧸", short: "次の攻撃2倍", desc: "場のキャラ1枚の次の攻撃は、コストが2倍になる代わりにダメージも2倍になる" },
  { kind: "laser",      name: "レーザー",   icon: "⚡", short: "相手HP-30",   desc: "相手プレイヤーのHPに30ダメージ" },
  { kind: "swap",       name: "交代",       icon: "🔄", short: "場⇔手札",     desc: "場のキャラと手札のキャラを入れかえる。手札に戻ったキャラはHPが50回復する" },
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

// CPUが使うキャラクターカード(「おまかせ」を選んだときに使う)
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
// デッキに入っているカードの中身を取り出す(消したカードは除く)
function deckCards(d) {
  const cards = loadCards();
  return d.ids.map(id => cards.find(c => c.id === id)).filter(Boolean);
}

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

// 小さいカード(手札・場・デッキ編成で使う)  inField=true なら「行動ずみ」の暗い表示もする
function cardHTML(c, extra, inField) {
  extra = extra || "";
  const targetable = T && T.valid.includes(c.uid) ? " targetable" : "";
  if (c.type === "item" || c.type === "cost") {
    return `<div class="card ${c.type}${targetable}${extra}" data-uid="${c.uid}">
      <div class="art"><div class="icon">${c.icon}</div></div>
      <div class="cname">${esc(c.name)}</div>
      <div class="desc">${esc(c.short)}</div></div>`;
  }
  const max = c.maxHp || c.hp;
  const m = c.plush ? 2 : 1;   // ぬいぐるみ中は、コストもダメージも2倍で表示
  let cls = "card char";
  if (inField && (c.acted || c.canAct === false)) cls += " done";
  if (c.guard) cls += " guard";
  if (c.amulet) cls += " amulet";
  if (c.plush) cls += " plush";
  if (G && G.acting === c.uid) cls += " acting";
  const badges = (c.guard ? "🛡" : "") + (c.amulet ? "🧿" : "") + (c.plush ? "🧸" : "");
  return `<div class="${cls}${targetable}${extra}" data-uid="${c.uid || ""}">
    <div class="art">${artHTML(c)}</div>
    ${badges ? `<div class="badge">${badges}</div>` : ""}
    <div class="cname">${esc(c.name)}</div>
    ${barHTML(c, c.hp, max, "")}
    <div class="catk">①💎${c.a1.cost * m} 💥${c.a1.dmg * m}</div>
    <div class="catk">②💎${c.a2.cost * m} 💥${c.a2.dmg * m}</div>
    ${c.guard ? '<i class="gl a">✦</i><i class="gl b">✧</i><i class="gl c">✨</i>' : ""}</div>`;
}

// 大きいカード(タップしたときのメニューに表示)
function bigCardHTML(c) {
  if (c.type === "item" || c.type === "cost") {
    return `<div class="big"><div class="bart">${c.icon}</div>
      <div class="bname">${esc(c.name)}</div><div class="batk">${esc(c.desc)}</div></div>`;
  }
  const max = c.maxHp || c.hp;
  const m = c.plush ? 2 : 1;
  const st = (c.guard ? " 🛡防御中" : "") + (c.amulet ? " 🧿お守り中" : "") + (c.plush ? " 🧸次の攻撃2倍" : "");
  return `<div class="big"><div class="bart">${artHTML(c)}</div>
    <div class="bname">${esc(c.name)}</div>
    ${barHTML({}, c.hp, max, "big")}
    ${st ? `<div class="batk">${st}</div>` : ""}
    <div class="batk">① ${esc(c.a1.name)}(💎${c.a1.cost * m} / 💥${c.a1.dmg * m})</div>
    <div class="batk">② ${esc(c.a2.name)}(💎${c.a2.cost * m} / 💥${c.a2.dmg * m})</div></div>`;
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

// ---------- ⑥ デッキ編成(デッキはいくつでも作れる) ----------
let editId = null;     // 編集中のデッキの番号(新しく作るときは null)
let deckSel = [];      // いまえらんでいるカードの番号

// デッキの一覧を表示
function renderDeckManage() {
  $("deck-edit").classList.add("hidden");
  $("deck-manage").classList.remove("hidden");
  const decks = loadDecks();
  $("deck-rows").innerHTML = decks.length === 0
    ? '<p class="note">まだデッキがありません。「新しいデッキを作る」を押してください。</p>'
    : decks.map(d => {
        const n = deckCards(d).length;
        const warn = n === DECK_CHAR ? "" : " ⚠ 10枚に足りません";
        return `<div class="deck-row"><div class="dname">${esc(d.name)}<small>${n}/${DECK_CHAR}枚${warn}</small></div>
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

function drawDeckList() {
  const cards = loadCards();
  $("deck-count").textContent = `選択中:${deckSel.length} / ${DECK_CHAR}`;
  if (cards.length === 0) {
    $("deck-list").innerHTML = '<p class="note">まだカードがありません。「カード作成」で作るか、下のサンプルカードを追加してください。</p>';
    return;
  }
  $("deck-list").innerHTML = cards.map(c => {
    const sel = deckSel.includes(c.id) ? " selected" : "";
    return `<div class="deck-item" data-id="${c.id}">${cardHTML(c, sel)}<button class="del" data-del="${c.id}">削除</button></div>`;
  }).join("");
}
$("deck-list").addEventListener("click", e => {
  const delId = e.target.dataset.del;
  if (delId) {
    if (!confirm("このカードを削除しますか?(入っているデッキは10枚に足りなくなります)")) return;
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
  const decks = loadDecks().filter(d => deckCards(d).length === DECK_CHAR);   // 10枚そろったデッキだけ
  const sel = loadSel();
  const opt = d => `<option value="${d.id}">${esc(d.name)}</option>`;
  $("sel-player").innerHTML = decks.map(opt).join("");
  $("sel-cpu").innerHTML = '<option value="auto">おまかせ(ゲームのデッキ)</option>' + decks.map(opt).join("");
  if (decks.some(d => d.id === sel.p)) $("sel-player").value = sel.p;
  if (sel.c === "auto" || decks.some(d => d.id === sel.c)) $("sel-cpu").value = sel.c;
  $("ready-msg").textContent = decks.length === 0
    ? "10枚そろったデッキがありません。先に「デッキ編成」でデッキを作ってください。"
    : "CPUには、自分で作ったデッキも使えます。";
  $("btn-battle").disabled = decks.length === 0;
}
$("btn-battle").onclick = () => {
  saveSel({ p: $("sel-player").value, c: $("sel-cpu").value });
  startBattle();
};

// ---------- ⑧ バトルのルール ----------
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
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
  return { uid: ++uidCounter, type: "char", name: d.name, img: d.img || "", emoji: d.emoji || "",
    maxHp: d.hp, hp: d.hp, a1: { ...d.a1 }, a2: { ...d.a2 },
    canAct: false, acted: false, guard: false, amulet: false, plush: false };
}
function makeItem(def) {
  return { uid: ++uidCounter, type: "item", kind: def.kind, name: def.name, icon: def.icon, short: def.short, desc: def.desc };
}
function makeCost() {
  return { uid: ++uidCounter, type: "cost", name: "コスト", icon: "💎", short: "使うと💎+1", desc: "使うと💎を1つ獲得" };
}

// ランダムにアイテム10枚をえらぶ(「キャラ復活」は REVIVE_MAX 枚まで)
function pickItems() {
  const list = [];
  let revive = 0;
  while (list.length < ITEM_COUNT) {
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
function buildSide(charDatas) {
  const deck = [];
  charDatas.forEach(d => deck.push(makeChar(d)));
  pickItems().forEach(def => deck.push(makeItem(def)));
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
  const sel = loadSel();
  const decks = loadDecks();
  const pd = decks.find(d => d.id === sel.p);
  const pChars = pd ? deckCards(pd) : [];
  if (pChars.length !== DECK_CHAR) {
    alert("デッキをえらんでください(10枚そろったデッキが必要です)。");
    show("ready");
    return;
  }
  let cChars = CPU_CARDS;   // 「おまかせ」ならゲームのデッキ
  if (sel.c && sel.c !== "auto") {
    const cd = decks.find(d => d.id === sel.c);
    const cc = cd ? deckCards(cd) : [];
    if (cc.length === DECK_CHAR) cChars = cc;
  }
  G = { player: buildSide(pChars), cpu: buildSide(cChars), turn: "player", busy: false, over: false, log: [], acting: null };
  T = null;
  show("battle");
  addLog("バトル開始!");
  startPlayerTurn();
}

// ターンの最初にやること(ドロー → 💎獲得 → 防御・お守りの解除 → 行動可能に)
function beginTurn(side) {
  const card = side.deck.shift();       // デッキが空なら何も引かない
  if (card) side.hand.push(card);
  const gain = side.field.length;
  side.cost += gain;
  side.field.forEach(c => { c.guard = false; c.amulet = false; c.canAct = true; c.acted = false; });
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

// ダウンしたキャラを場からダウンゾーンへ送る(消える動きつき)
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
  render();
}

// アイテムを使う。target は対象のキャラ、target2 は「交代」で場に出す手札のキャラ
async function useItem(side, card, target, target2) {
  const foeSide = foe(side);
  const myInfo = infoEl(side), foeInfo = infoEl(foeSide);
  side.hand = side.hand.filter(c => c !== card);
  side.down.push(card);
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
    target.canAct = false; target.acted = false; target.guard = false; target.amulet = false; target.plush = false;
    side.hand.push(target);
    addLog(`${target.name}が手札に戻った`);
    render();
    fx(cardEl(target.uid) || myInfo, "heal");
    await sleep(900);
  } else if (k === "bomb") {
    const list = foeSide.field.slice();
    list.forEach(t => { t.hp -= 30; });
    render();
    list.forEach(t => { fx(cardEl(t.uid), "bomb"); popDamage(t.uid, "-30"); });
    await sleep(1000);
    for (const t of list) if (t.hp <= 0) await sendDown(foeSide, t);
  } else if (k === "laser") {
    foeSide.hp -= 30;
    render();
    fx(foeInfo, "laser"); popAt(foeInfo, "-30");
    await sleep(900);
    if (foeSide.hp <= 0) finishGame(side === G.player);
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
  } else if (k === "swap") {
    const idx = side.field.indexOf(target);
    side.field[idx] = target2;                         // 手札のキャラが同じ場所に入る
    side.hand = side.hand.filter(c => c !== target2);
    target.hp = Math.min(target.maxHp, target.hp + 50);
    target.guard = false; target.amulet = false; target.plush = false; target.acted = false; target.canAct = false;
    side.hand.push(target);                            // 場のキャラはHP+50で手札へ
    target2.canAct = false; target2.acted = false; target2.guard = false;
    addLog(`${target.name}と${target2.name}が交代(${target.name}はHP+50)`);
    render();
    fx(cardEl(target2.uid), "swap");
    await sleep(900);
  }
  render();
}

async function doGuard(side, ch) {
  if (!ch.canAct || ch.acted) return false;
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

// 攻撃。target が null のときは直接攻撃(相手の場が空のときだけ)
async function doAttack(side, ch, n, target) {
  const atk = n === 1 ? ch.a1 : ch.a2;
  const mult = ch.plush ? 2 : 1;           // ぬいぐるみ中はコスト2倍・ダメージ2倍
  const cost = atk.cost * mult;
  const foeSide = foe(side);
  if (!ch.canAct || ch.acted || side.cost < cost) return false;
  if (target && !foeSide.field.includes(target)) return false;
  if (!target && foeSide.field.length > 0) return false;

  side.cost -= cost;
  ch.acted = true;
  ch.plush = false;                        // ぬいぐるみの効果は1回の攻撃で終わり
  let dmg = atk.dmg * mult;
  addLog(`${who(side)}の${ch.name}「${atk.name}」${mult === 2 ? "🧸" : ""}`);
  G.acting = ch.uid;
  render();
  if (side === G.cpu) await wait(800);     // CPUのときは、誰が動くか見せる

  // 前に飛び出す動き
  const atkEl = cardEl(ch.uid);
  if (atkEl) {
    atkEl.classList.add(side === G.player ? "lunge-up" : "lunge-down");
    await sleep(450);
  }
  G.acting = null;

  if (target) {
    const blocked = target.amulet;
    if (blocked) dmg = 0;
    else if (target.guard) dmg = Math.ceil(dmg / 2);
    target.hp -= dmg;
    addLog(blocked ? `${target.name}はお守りで0ダメージ!`
      : `${target.name}に${dmg}ダメージ${target.guard ? "(防御で半減)" : ""}`);
    render();
    const tel = cardEl(target.uid);
    if (blocked) { fx(tel, "guard"); popAt(tel, "0", "zero"); }
    else { fx(tel, "slash"); popAt(tel, "-" + dmg); }
    await sleep(900);
    if (target.hp <= 0) await sendDown(foeSide, target);
  } else {
    foeSide.hp -= dmg;
    addLog(`直接攻撃で${dmg}ダメージ!`);
    render();
    fx(infoEl(foeSide), "slash"); popAt(infoEl(foeSide), "-" + dmg);
    await sleep(900);
    if (foeSide.hp <= 0) finishGame(side === G.player);
  }
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
// e: とび散る絵文字  n: 数  rise: 上にのぼる  line: 斬撃  ring: 広がる輪(色)  beam: ビーム
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
      s.className = "spark";
      s.textContent = set.e[i % set.e.length];
      const ang = Math.random() * Math.PI * 2, dist = 28 + Math.random() * 55;
      s.style.left = cx + "px";
      s.style.top = cy + "px";
      s.style.setProperty("--dx", Math.cos(ang) * dist + "px");
      s.style.setProperty("--dy", Math.sin(ang) * dist - (set.rise ? 45 : 0) + "px");
      s.style.animationDelay = Math.random() * 0.15 + "s";
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 1200);
    }
    if (set.line) addFxEl("slash", cx, cy);
    if (set.ring) addFxEl("ring", cx, cy, set.ring);
    if (set.beam) addFxEl("beam", cx, cy);
  } catch (e) { /* エフェクトが出なくてもゲームは続ける */ }
}
function addFxEl(cls, x, y, color) {
  const d = document.createElement("div");
  d.className = "fxe " + cls;
  d.style.left = x + "px";
  d.style.top = y + "px";
  if (color) d.style.setProperty("--c", color);
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 1000);
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
  beginTurn(G.cpu);
  render();
  await wait(1200);
  await aiPlay(G.cpu);
  if (G.over) return;
  await wait(800);
  startPlayerTurn();
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

  // 2. アイテムカードを、使うと良いときに使う
  for (const card of side.hand.filter(c => c.type === "item" && c.kind !== "plush")) {
    if (G.over) return;
    const k = card.kind;
    if (k === "healPlayer") {
      if (side.hp <= 50) await useItem(side, card);
    } else if (k === "healChar") {
      const t = side.field.filter(c => c.maxHp - c.hp >= 30).sort((a, b) => a.hp - b.hp)[0];
      if (t) await useItem(side, card, t);
    } else if (k === "revive") {
      const t = side.down.find(c => c.type === "char");
      if (t) await useItem(side, card, t);
    } else if (k === "bomb") {
      if (foeSide.field.length >= 2 || foeSide.field.some(c => c.hp <= 30)) await useItem(side, card);
    } else if (k === "laser") {
      await useItem(side, card);
    } else if (k === "amulet") {
      const t = side.field.filter(c => !c.amulet).sort((a, b) => b.a2.dmg - a.a2.dmg)[0];
      if (t && foeSide.field.length > 0) await useItem(side, card, t);
    } else if (k === "swap") {
      const f = side.field.filter(c => c.hp <= c.maxHp * 0.35).sort((a, b) => a.hp - b.hp)[0];
      const h = side.hand.filter(c => c.type === "char").sort((a, b) => b.maxHp - a.maxHp)[0];
      if (f && h) await useItem(side, card, f, h);
    }
    if (G.over) return;
    await wait(500);
  }

  // 3. キャラクターを場に出す(HPの高い順)
  while (side.field.length < FIELD_MAX) {
    const chars = side.hand.filter(c => c.type === "char").sort((a, b) => b.maxHp - a.maxHp);
    if (chars.length === 0) break;
    playChar(side, chars[0]);
    G.acting = chars[0].uid;
    render();
    fx(cardEl(chars[0].uid), "enter");
    await wait(1100);
    G.acting = null;
  }

  // 4. ぬいぐるみ(2倍の💎を払える行動可能なキャラがいるときだけ)
  for (const card of side.hand.filter(c => c.type === "item" && c.kind === "plush")) {
    if (G.over) return;
    const t = side.field
      .filter(c => c.canAct && !c.acted && !c.plush && Math.min(c.a1.cost, c.a2.cost) * 2 <= side.cost)
      .sort((a, b) => b.a2.dmg - a.a2.dmg)[0];
    if (t) { await useItem(side, card, t); await wait(500); }
  }

  // 5. 行動できるキャラで攻撃(できなければ防御)
  for (const ch of side.field.slice()) {
    if (G.over) return;
    if (!ch.canAct || ch.acted) continue;

    const mult = ch.plush ? 2 : 1;
    const options = [{ n: 1, a: ch.a1 }, { n: 2, a: ch.a2 }]
      .filter(o => o.a.cost * mult <= side.cost)
      .sort((x, y) => y.a.dmg - x.a.dmg);
    if (options.length === 0) { await doGuard(side, ch); await wait(600); continue; }

    const atk = options[0];
    let target = null;
    if (foeSide.field.length > 0) {
      // お守り中の相手は0ダメージなので、他にいればさける
      const noAmulet = foeSide.field.filter(t => !t.amulet);
      const ts = noAmulet.length > 0 ? noAmulet : foeSide.field;
      const eff = t => (t.guard ? Math.ceil(atk.a.dmg * mult / 2) : atk.a.dmg * mult);
      const kill = ts.filter(t => eff(t) >= t.hp).sort((a, b) => b.hp - a.hp);
      target = kill.length > 0 ? kill[0] : ts.slice().sort((a, b) => a.hp - b.hp)[0];
    }
    await doAttack(side, ch, atk.n, target);
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
  } else if (card.type === "char") {
    const full = p.field.length >= FIELD_MAX;
    openMenu({ card, note: full ? "場がいっぱいです(最大3枚)" : "出したターンは行動できません",
      buttons: [{ label: "場に出す", disabled: full,
        action: () => run(async () => { playChar(p, card); render(); fx(cardEl(card.uid), "enter"); await sleep(500); }) }] });
  } else {
    itemMenu(card);
  }
}

function itemMenu(card) {
  const p = G.player;
  const k = card.kind;
  const use = (label, disabled, action, note) =>
    openMenu({ card, note: note || "", buttons: [{ label: label, disabled: disabled, action: action }] });

  if (k === "healPlayer" || k === "laser") {
    use("使う", false, () => run(() => useItem(p, card)));
  } else if (k === "bomb") {
    const none = G.cpu.field.length === 0;
    use("使う", none, () => run(() => useItem(p, card)), none ? "相手の場にキャラがいないので使えません" : "");
  } else if (k === "healChar" || k === "amulet" || k === "plush") {
    const none = p.field.length === 0;
    const prompt = k === "healChar" ? "回復するキャラをタップ"
      : k === "amulet" ? "お守りをつけるキャラをタップ" : "ぬいぐるみをわたすキャラをタップ";
    use("使う(対象をえらぶ)", none,
      () => startTarget(prompt, p.field, ch => run(() => useItem(p, card, ch))),
      none ? "場にキャラがいないので使えません" : "");
  } else if (k === "revive") {
    const list = p.down.filter(c => c.type === "char");
    if (list.length === 0) return openMenu({ card, note: "ダウンしたキャラがいないので使えません" });
    openMenu({ card, title: "手札に戻すキャラをえらぶ",
      buttons: list.map(ch => ({ label: ch.name, action: () => run(() => useItem(p, card, ch)) })) });
  } else if (k === "swap") {
    const hands = p.hand.filter(c => c.type === "char");
    const none = p.field.length === 0 || hands.length === 0;
    use("使う(対象をえらぶ)", none,
      () => startTarget("手札に戻す(場の)キャラをタップ", p.field,
        f => startTarget("場に出す(手札の)キャラをタップ", hands,
          h => run(() => useItem(p, card, f, h)))),
      none ? "場と手札の両方にキャラが必要です" : "");
  }
}

// ----- 自分の場のキャラをタップ -----
function fieldMenu(ch) {
  const p = G.player;
  const can = ch.canAct && !ch.acted;
  const m = ch.plush ? 2 : 1;
  const note = !ch.canAct ? "出したばかりなので、次のターンから行動できます"
    : ch.acted ? "このターンはもう行動しました"
    : ch.plush ? "🧸次の攻撃は、💎も2倍・ダメージも2倍" : "";
  const label = (n, a) => `攻撃${n} ${a.name}(💎${a.cost * m} 💥${a.dmg * m})${p.cost < a.cost * m ? " コスト不足" : ""}`;
  openMenu({ card: ch, note, buttons: [
    { label: label("①", ch.a1), disabled: !can || p.cost < ch.a1.cost * m, action: () => chooseTarget(ch, 1) },
    { label: label("②", ch.a2), disabled: !can || p.cost < ch.a2.cost * m, action: () => chooseTarget(ch, 2) },
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
  // 相手の場のカードが光るので、攻撃したい相手をタップする
  startTarget("攻撃する相手をタップ", ts, t => run(() => doAttack(p, ch, n, t)));
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
    if (ch) openMenu({ card: ch });   // 相手のカードは情報を見るだけ
  }
});

$("btn-end").onclick = () => {
  if (!G || G.busy || G.over || G.turn !== "player" || T) return;
  G.busy = true;
  addLog("あなたはターンを終了した");
  render();
  setTimeout(cpuTurn, 600 * SPEED);
};
$("btn-quit").onclick = () => {
  if (G && G.busy) return alert("CPUのターンが終わってからやめてください。");
  if (confirm("バトルをやめてタイトルに戻りますか?")) { G.over = true; T = null; show("title"); }
};

updateTitle();
