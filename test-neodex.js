// lancé par le test « local » de NeoDex : la vérification interne, un retournement animé, une paire ratée qui se recache, une partie gagnée
// en trichant (les cartes sont lues), le clavier, la manette, le plein écran et la place prise (avec NEO_SHOTS : garde des images du jeu)
module.exports = async ({ pj, sleep }) => {
  const C = code => pj(`(() => { const T = document.getElementById('gc').__mm, mm = T.st(); ${code} })()`);
  const key = k => pj(`document.dispatchEvent(new KeyboardEvent('keydown', {key: '${k}', bubbles: true})), 0`);
  const shot = async n => { if (!process.env.NEO_SHOTS) return; const d = await pj(`document.getElementById('gc').toDataURL()`); require('fs').writeFileSync(require('path').join(process.env.NEO_SHOTS, 'memoire-' + n + '.png'), Buffer.from(d.split(',')[1], 'base64')); };
  await pj(`window.__e = []; addEventListener('error', e => __e.push(e.message)); 0`);
  const chk = await C('return T.check();'); if (chk !== 'ok') throw new Error('vérification : ' + chk);
  const keepSize = await pj(`document.getElementById('mmSize').value`);
  await C(`T.size('4x4'); return 0;`); await sleep(200); await shot('0-dos');
  // une paire ratée : les deux cartes se retournent (on les voit à mi-chemin), restent un instant puis se recachent
  const [a, b] = JSON.parse(await C(`const k0 = mm.cards[0].k, j = mm.cards.findIndex((c, i) => i && c.k !== k0); return JSON.stringify([0, j]);`));
  await C(`T.flip(${a}); return 0;`); await sleep(90);
  const mid = await C(`const f = mm.cards[${a}].f; return f > 0 && f < 1;`); if (!mid) throw new Error('la carte devait être en train de se retourner');
  await C(`T.flip(${b}); return 0;`); await sleep(450); await shot('1-ratee');
  const up = await C(`return mm.cards[${a}].f + mm.cards[${b}].f + '|' + mm.moves;`); if (up !== '2|1') throw new Error('les deux cartes devaient être visibles : ' + up);
  await sleep(1400);
  const down = await C(`return mm.cards[${a}].f + mm.cards[${b}].f + '|' + mm.open.length;`); if (down !== '0|0') throw new Error('la paire ratée devait se recacher : ' + down);
  // au clavier : la carte 0 puis sa jumelle, en se déplaçant avec les flèches
  const twin = await C(`return mm.cards.findIndex((c, i) => i && c.k === mm.cards[0].k);`);
  await C('mm.cur = 0; return 0;'); await key('Enter');
  for (let i = 0; i < twin % 4; i++) await key('ArrowRight');
  for (let i = 0; i < Math.floor(twin / 4); i++) await key('ArrowDown');
  await key('Enter'); await sleep(500);
  if (!await C(`return mm.cards[0].done && mm.cards[${twin}].done;`)) throw new Error('la paire au clavier devait être trouvée');
  // à la manette : une paire de plus
  await pj(`(() => { const pad = {axes: [0, 0], buttons: Array.from({length: 17}, () => ({pressed: false}))}; window.__pad = pad; navigator.getGamepads = () => [pad]; return 0; })()`);
  const tap = async i => { await pj(`(__pad.buttons[${i}].pressed = true, 0)`); await sleep(130); await pj(`(__pad.buttons[${i}].pressed = false, 0)`); await sleep(130); };
  const [p1, p2] = JSON.parse(await C(`const i = mm.cards.findIndex(c => !c.done), j = mm.cards.findIndex((c, n) => n !== i && c.k === mm.cards[i].k); return JSON.stringify([i, j]);`));
  await C(`mm.cur = ${p1}; return 0;`); await tap(0);
  for (let i = 0; i < (p2 % 4) - (p1 % 4); i++) await tap(15);
  for (let i = 0; i < (p1 % 4) - (p2 % 4); i++) await tap(14);
  for (let i = 0; i < Math.floor(p2 / 4) - Math.floor(p1 / 4); i++) await tap(13);
  await tap(0); await sleep(500);
  if (!await C(`return mm.cards[${p1}].done && mm.cards[${p2}].done;`)) throw new Error('la paire à la manette devait être trouvée : ' + await C(`return mm.cur + " " + mm.moves + " " + mm.cards.map(c => +c.up).join("") + " ${p1}>${p2}";`));
  await pj(`navigator.getGamepads = () => [], 0`);
  await shot('2-paires');
  // le reste en trichant, une paire à la fois
  for (let n = 0; n < 6; n++) { await C(`const i = mm.cards.findIndex(c => !c.done), j = mm.cards.findIndex((c, k) => k !== i && c.k === mm.cards[i].k); T.flip(i); T.flip(j); return 0;`); await sleep(420); }
  await sleep(600);
  const won = await C(`return mm.mode + '|' + mm.moves;`); if (won !== 'won|9') throw new Error('la partie devait être gagnée en 9 coups : ' + won);
  const rec = await pj(`document.getElementById('gStats').textContent`); if (!/9 coups/.test(rec)) throw new Error('le record devait s\'afficher : ' + rec);
  await shot('3-gagne');
  // la grande taille : 24 paires, cartes plus petites
  await C(`T.size('8x6'); return 0;`); await sleep(100);
  await C(`for (let n = 0; n < 5; n++) { const i = mm.cards.findIndex(c => !c.done && !c.up), j = mm.cards.findIndex((c, k) => k !== i && c.k === mm.cards[i].k); mm.cards[i].done = mm.cards[j].done = true; } T.flip(mm.cards.findIndex(c => !c.done)); return 0;`); await sleep(400); await shot('4-maitre');
  await key('Enter'); await sleep(200);
  await C(`T.size('${keepSize}'); return 0;`);
  const errs = await pj(`window.__e.join(' | ')`); if (errs) throw new Error('erreur : ' + errs);
  // plein écran, et la zone de jeu qui tient dans la fenêtre
  await pj(`document.getElementById('mmFs').click(), 0`); await sleep(700);
  const fs = await pj(`(() => { const c = document.getElementById('gc'), r = c.getBoundingClientRect(); return document.fullscreenElement === c.parentElement && (Math.abs(r.height - innerHeight) < 3 || Math.abs(r.width - innerWidth) < 3); })()`);
  await pj(`document.fullscreenElement && document.exitFullscreen(), 0`); await sleep(300);
  if (!fs) throw new Error('le plein écran ne remplit pas l\'écran');
  const L = await pj(`(() => { const r = document.getElementById('gc').getBoundingClientRect(); let s = 0; for (let e = document.getElementById('gc').parentElement; e; e = e.parentElement) s += e.scrollTop; return { bottom: Math.round(r.bottom + s), h: Math.round(r.height), wh: innerHeight, ww: innerWidth, sw: document.documentElement.scrollWidth }; })()`);
  if (process.env.NEO_FIT_LOG) console.log('FIT', JSON.stringify(L));
  if (L.bottom > L.wh + 1 || L.sw > L.ww + 1 || L.h < 280) throw new Error('la zone de jeu dépasse la fenêtre ou reste petite : ' + JSON.stringify(L));
  return 'vérification ok · retournement animé · paire ratée recachée · clavier · manette · gagné en 9 · 24 paires · plein écran · ' + L.h + ' px dans ' + L.ww + '×' + L.wh;
};
