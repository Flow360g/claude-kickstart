// Makes the read-aloud clips for the cards (ElevenLabs, Australian voice) and the word timings that light up each word.
//
//   node tools/narration.mjs                     list cards whose clip is missing or out of date
//   ELEVENLABS_API_KEY=... node tools/narration.mjs build
//                                                make the missing clips, update narration/narration.js, drop unused clips
//   node tools/narration.mjs script              print what each card says, as JSON (to make clips somewhere else)
//   node tools/narration.mjs import <dir>        take <dir>/<hash>.mp3 plus <dir>/<hash>.words.json (an ElevenLabs
//                                                transcript: [{ text, start, end }, ...]) and time the words from it
//
// What a card says comes from the game itself (the words wrapped for highlighting), so run this after editing CONTENT.
// A clip is named by a hash of its words and the voice, so editing a card's text or changing the voice in
// narration/narration.js makes its clip out of date; until it is rebuilt, the game reads that card in the browser's voice.
// Needs Playwright (npm i -g playwright) and, for import, ffmpeg's ffprobe.
import { readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync, copyFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const DIR = join(ROOT, 'narration');
const INDEX = join(DIR, 'narration.js');
const MODEL = 'eleven_multilingual_v2';

function loadIndex() {
  const src = readFileSync(INDEX, 'utf8');
  const json = src.slice(src.indexOf('{'), src.lastIndexOf('}') + 1);
  return Function(`return (${json})`)();
}
function saveIndex(idx) {
  const lines = Object.keys(idx.clips).sort().map(h => `    '${h}': [${idx.clips[h].join(',')}]`);
  writeFileSync(INDEX, `// Made by tools/narration.mjs: the voice, and for each clip (narration/<hash>.mp3) the start time of each word in seconds.\n` +
    `window.NARRATION = {\n  voice: '${idx.voice}',\n  clips: {\n${lines.join(',\n')}\n  }\n};\n`);
}

async function cardScripts() {
  let pw;
  try { pw = await import('playwright'); } catch { pw = createRequire(execFileSync('npm', ['root', '-g']).toString().trim() + '/')('playwright'); }
  const browser = await pw.chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + join(ROOT, 'index.html') + '#world-1');
  await page.waitForFunction(() => window.__summit);
  const out = await page.evaluate(() => {
    const S = window.__summit, res = [];
    const grab = key => { const n = S.current.narr; res.push({ key, hash: n.hash, text: n.text, offs: n.offs, words: n.tokens.map(t => t.text) }); };
    for (const w of [1, 2, 3, 4, 5, 6]) { S.loadWorld(w); S.L.world.cards.forEach((_, i) => { S.openCard(w, i); grab(`world ${w} card ${i + 1}`); }); }
    S.openEgg(); grab('hidden marker');
    return res;
  });
  await browser.close();
  return out;
}

// silent words ('>' and the like) take the time of the word before them
const fillGaps = ts => ts.map((t, i) => t ?? ts.slice(0, i).reverse().find(x => x != null) ?? ts.find(x => x != null) ?? 0).map(t => +t.toFixed(2));

// match the card's words to a transcript's words, and spread any unmatched words between the matched ones
function timesFromTranscript(words, transcript, duration) {
  const norm = w => w.toLowerCase().replace(/[^a-z0-9]/g, '');
  const a = words.map(norm), b = transcript.map(w => norm(w.text));
  const L = Array.from({ length: a.length + 1 }, () => new Int32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--)
    L[i][j] = a[i] && a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const t = words.map(() => null);
  for (let i = 0, j = 0; i < a.length && j < b.length;) {
    if (a[i] && a[i] === b[j]) { t[i++] = transcript[j++].start; }
    else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++;
  }
  const anchors = [[-1, transcript.length ? transcript[0].start : 0], ...t.map((x, i) => [i, x]).filter(p => p[1] != null), [words.length, duration]];
  for (let k = 0; k + 1 < anchors.length; k++) {
    const [i0, t0] = anchors[k], [i1, t1] = anchors[k + 1];
    if (i1 - i0 < 2) continue;
    const from = Math.max(i0, 0), span = words.slice(from, i1);
    const total = span.reduce((s, w) => s + w.length + 1, 0);
    let acc = i0 < 0 ? 0 : words[i0].length + 1;
    for (let i = i0 + 1; i < i1; i++) { t[i] = t0 + (t1 - t0) * acc / total; acc += words[i].length + 1; }
  }
  return fillGaps(t);
}

// no transcript: find the pauses in the audio, line them up with the sentence and clause breaks in the text, and
// spread the words between them by length
function timesFromPauses(c, mp3) {
  // ffmpeg reports the pauses on stderr
  const log = spawnSync('ffmpeg', ['-hide_banner', '-i', mp3, '-af', 'silencedetect=noise=-35dB:d=0.1', '-f', 'null', '-']).stderr.toString();
  return pausesToTimes(c, log);
}
function pausesToTimes(c, log) {
  const dur = +(/Duration: (\d+):(\d+):([\d.]+)/.exec(log) || []).slice(1).reduce((a, x) => a * 60 + +x, 0);
  const sil = [];
  for (const m of log.matchAll(/silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)/g)) sil.push({ a: +m[1], b: +m[2] });
  if (!sil.length || sil[0].a > 0.05) sil.unshift({ a: 0, b: 0 });
  if (sil[sil.length - 1].b < dur - 0.05) sil.push({ a: dur, b: dur });
  // spoken length of each word, and how strong a break follows it
  const n = c.words.length, len = [], brk = [];
  for (let i = 0; i < n; i++) {
    if (c.offs[i] < 0) { len.push(0); brk.push(0); continue; }
    const next = c.offs.slice(i + 1).find(o => o >= 0) ?? c.text.length + 1;
    const w = c.text.slice(c.offs[i], next - 1);
    len.push(w.length + 1);
    brk.push(/[.!?:]["'”’)]*$/.test(w) ? 2 : /[,;)]["'”’]*$/.test(w) ? 1 : 0);
  }
  const cum = [0]; len.forEach(l => cum.push(cum[cum.length - 1] + l));
  const speech = sil.slice(1).reduce((s, x, k) => s + x.a - sil[k].b, 0);
  const rate = speech / cum[n];
  // anchors: word boundaries (after word b-1, b = 0..n) matched to silences, in order. DP over (boundary, silence).
  const bounds = [0, ...brk.map((x, i) => (x ? i + 1 : -1)).filter(x => x > 0 && x < n), n];
  const B = bounds.length, S = sil.length, INF = 1e18;
  const cost = Array.from({ length: B }, () => new Float64Array(S).fill(INF)), from = Array.from({ length: B }, () => new Int32Array(S * 2).fill(-1));
  cost[0][0] = 0;
  // penalties for leaving a break without a pause (a full stop more than a comma), or a pause without a break (by length)
  const pb = [0], ps = [0];
  for (let k = 0; k < B; k++) pb.push(pb[k] + (k > 0 && k < B - 1 ? (brk[bounds[k] - 1] === 2 ? 1.5 : 0.3) : 0));
  for (let k = 0; k < S; k++) ps.push(ps[k] + 5 * (sil[k].b - sil[k].a));
  const skipB = (b0, b1) => pb[b1] - pb[b0 + 1], skipS = (s0, s1) => ps[s1] - ps[s0 + 1];
  for (let b = 0; b < B; b++) for (let s = 0; s < S; s++) {
    if (cost[b][s] >= INF) continue;
    for (let b1 = b + 1; b1 < B; b1++) for (let s1 = s + 1; s1 < S; s1++) {
      if (b1 === B - 1 && s1 !== S - 1) continue;
      const want = (cum[bounds[b1]] - cum[bounds[b]]) * rate, got = sil[s1].a - sil[s].b;
      const cst = cost[b][s] + ((got - want) / (want + 0.4)) ** 2 * 4 + skipB(b, b1) + skipS(s, s1);
      if (cst < cost[b1][s1]) { cost[b1][s1] = cst; from[b1][s1 * 2] = b; from[b1][s1 * 2 + 1] = s; }
    }
  }
  const path = [];
  for (let b = B - 1, s = S - 1; b >= 0 && s >= 0;) { path.unshift([b, s]); const pb = from[b][s * 2], ps = from[b][s * 2 + 1]; b = pb; s = ps; }
  const t = new Array(n).fill(null);
  for (let k = 0; k + 1 < path.length; k++) {
    const [b0, s0] = path[k], [b1, s1] = path[k + 1], i0 = bounds[b0], i1 = bounds[b1];
    const t0 = sil[s0].b, t1 = sil[s1].a, total = cum[i1] - cum[i0] || 1;
    for (let i = i0; i < i1; i++) t[i] = t0 + (t1 - t0) * (cum[i] - cum[i0]) / total;
  }
  return fillGaps(t);
}

async function build(todo, idx) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) { console.error('Set ELEVENLABS_API_KEY to build clips.'); process.exit(1); }
  for (const c of todo) {
    process.stdout.write(`${c.key} (${c.hash})... `);
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${idx.voice}/with-timestamps?output_format=mp3_44100_64`, {
      method: 'POST', headers: { 'xi-api-key': key, 'content-type': 'application/json' },
      body: JSON.stringify({ text: c.text, model_id: MODEL, language_code: 'en' })
    });
    if (!res.ok) { console.log(`failed: ${res.status} ${await res.text()}`); continue; }
    const j = await res.json();
    writeFileSync(join(DIR, `${c.hash}.mp3`), Buffer.from(j.audio_base64, 'base64'));
    const starts = j.alignment.character_start_times_seconds;
    idx.clips[c.hash] = fillGaps(c.offs.map(o => (o >= 0 ? starts[o] : null)));
    saveIndex(idx);
    console.log('done');
  }
}

function importDir(dir, cards, idx) {
  for (const c of cards) {
    const mp3 = join(dir, `${c.hash}.mp3`), words = join(dir, `${c.hash}.words.json`);
    if (!existsSync(mp3)) continue;
    if (existsSync(words)) {
      const duration = +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp3]).toString();
      idx.clips[c.hash] = timesFromTranscript(c.words, JSON.parse(readFileSync(words, 'utf8')), duration);
    } else idx.clips[c.hash] = timesFromPauses(c, mp3);
    if (resolve(dir) !== DIR) copyFileSync(mp3, join(DIR, `${c.hash}.mp3`));
    console.log(`imported ${c.key} (${c.hash})`);
  }
  saveIndex(idx);
}

function prune(cards, idx) {
  const keep = new Set(cards.map(c => c.hash));
  for (const h of Object.keys(idx.clips)) if (!keep.has(h)) delete idx.clips[h];
  for (const f of readdirSync(DIR)) if (f.endsWith('.mp3') && !keep.has(f.slice(0, -4))) { unlinkSync(join(DIR, f)); console.log(`removed unused ${f}`); }
  saveIndex(idx);
}

const [cmd, arg] = process.argv.slice(2);
const idx = loadIndex();
const cards = await cardScripts();
const todo = cards.filter(c => !idx.clips[c.hash] || idx.clips[c.hash].length !== c.words.length || !existsSync(join(DIR, `${c.hash}.mp3`)));
if (cmd === 'script') console.log(JSON.stringify(cards, null, 1));
else if (cmd === 'build') { await build(todo, idx); prune(cards, idx); }
else if (cmd === 'import') { importDir(arg, cards, idx); prune(cards, idx); }
else {
  console.log(`${cards.length} cards, ${cards.length - todo.length} with an up-to-date clip.`);
  for (const c of todo) console.log(`  needs a clip: ${c.key} (${c.hash}, ${c.text.length} characters)`);
}
