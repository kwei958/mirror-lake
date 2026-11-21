// Listens to the lake's public relay for one 4-hour window and writes anonymous visitor stats.
// Only counts and durations are saved (no nicknames, no positions).
import mqtt from 'mqtt';
import fs from 'node:fs';

const ROOT = 'wisdomtooth/mkjs-lake/v1';
const BROKERS = (process.env.BROKERS || 'mqtts://broker.emqx.io:8883,mqtts://broker.hivemq.com:8883').split(',');
const now0 = Date.now();
// run until just before the next 4-hour slot, aligned to Korean midnight (KST 00/04/08/12/16/20 = UTC 15/19/23/03/07/11), at most 250 minutes
const next = new Date(now0); next.setUTCMinutes(0, 0, 0);
while (next.getTime() <= now0 + 3 * 60000 || next.getUTCHours() % 4 !== 3) next.setUTCHours(next.getUTCHours() + 1);
const endAt = Math.min(next.getTime() - 2 * 60000, now0 + (+process.env.DURATION_MIN || 250) * 60000);

const views = new Set();
const sessions = new Map();   // id -> { first, last, jt, ended, bench, zen }
const names = new Set();      // only used to count distinct nicknames, never written out
let peak = 0, peakAt = null, connectedMs = 0, lastTick = Date.now();
const clients = [];

for (const url of BROKERS){
  const c = mqtt.connect(url, { clientId: 'mk_stats_' + Math.random().toString(16).slice(2, 12), keepalive: 30, reconnectPeriod: 5000, clean: true });
  clients.push(c);
  c.on('connect', () => c.subscribe([`${ROOT}/p/+`, `${ROOT}/v/+`]));
  c.on('error', () => {});
  c.on('message', (topic, buf) => {
    const parts = topic.split('/'), id = parts.pop(), kind = parts.pop(), now = Date.now();
    if (!/^[0-9a-f]{16}$/.test(id)) return;
    if (kind === 'v'){ views.add(id); return; }
    if (kind !== 'p') return;
    if (!buf.length){ const s = sessions.get(id); if (s) s.ended = true; return; }
    if (buf.length > 1024) return;
    let pr; try { pr = JSON.parse(buf.toString()); } catch { return; }
    if (!pr || typeof pr.n !== 'string') return;
    const t = typeof pr.t === 'number' ? pr.t : now;
    let s = sessions.get(id);
    if (!s){
      if (Math.abs(now - t) > 60000) return;                 // an old retained state, not a live visitor
      s = { first: now, last: now, jt: 0, ended: false, bench: false, zen: false, gold: false };
      sessions.set(id, s); views.add(id);
    }
    s.last = now; s.ended = false;
    if (typeof pr.jt === 'number' && pr.jt > now0 - 24 * 3600e3 && pr.jt <= now) s.jt = pr.jt;
    if (Number.isInteger(pr.b) && pr.b >= 0) s.bench = true;
    else if (pr.s === 1) s.zen = true;
    if (pr.g === 1) s.gold = true;
    names.add(pr.n.trim().slice(0, 12));
  });
}

setInterval(() => {
  const now = Date.now();
  if (clients.some(c => c.connected)) connectedMs += now - lastTick;
  lastTick = now;
  let n = 0; for (const s of sessions.values()) if (!s.ended && now - s.last < 15000) n++;
  if (n > peak){ peak = n; peakAt = new Date(now).toISOString(); }
}, 5000);

setTimeout(() => {
  const end = Date.now();
  const stays = [];
  let stillHere = 0, bench = 0, zen = 0, gold = 0;
  for (const s of sessions.values()){
    const from = s.jt || s.first;
    stays.push(Math.max(0, s.last - from) / 60000);
    if (!s.ended && end - s.last < 15000) stillHere++;
    if (s.bench) bench++;
    if (s.zen) zen++;
    if (s.gold) gold++;
  }
  stays.sort((a, b) => a - b);
  const avg = stays.length ? stays.reduce((a, b) => a + b, 0) / stays.length : 0;
  const med = stays.length ? stays[Math.floor(stays.length / 2)] : 0;
  const out = {
    window_start: new Date(now0).toISOString(), window_end: new Date(end).toISOString(),
    relay_connected_pct: Math.round(connectedMs / Math.max(1, end - now0) * 100),
    page_opens: views.size, entered: sessions.size, distinct_nicknames: names.size,
    peak_concurrent: peak, peak_at: peakAt, still_here_at_end: stillHere,
    avg_stay_min: +avg.toFixed(1), median_stay_min: +med.toFixed(1),
    total_stay_hours: +(stays.reduce((a, b) => a + b, 0) / 60).toFixed(2),
    longest_stay_min: +(stays.at(-1) || 0).toFixed(1),
    sat_on_bench: bench, meditated: zen, gold_cape: gold,
  };
  fs.mkdirSync('stats', { recursive: true });
  fs.writeFileSync('stats/latest.json', JSON.stringify(out, null, 1) + '\n');
  fs.appendFileSync('stats/history.jsonl', JSON.stringify(out) + '\n');
  console.log(JSON.stringify(out));
  for (const c of clients) try { c.end(true); } catch {}
  process.exit(0);
}, Math.max(60000, endAt - now0));
console.log('collecting until', new Date(endAt).toISOString());
