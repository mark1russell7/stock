import { byId, copyText, setupTheme } from "@mark1russell7/site-pages/chrome";
import { addDays } from "@mark1russell7/algebra/clock";
import type { StockEvent } from "@mark1russell7/stock";
import { addEvent, curve, dueOf, PRODUCTS, product, sampleLog, SOURCE, view } from "./demo.ts";

setupTheme(byId<HTMLButtonElement>("theme"), "theme");

const copy = byId<HTMLButtonElement>("copy");
copy.addEventListener("click", () => {
  void copyText(copy, byId("install").textContent ?? "");
});

// ---- The log: in localStorage, so a visit keeps its changes. Each action appends an event at the real date. ----
const KEY = "stock-demo-log-v1";
const local = new Date();
const TODAY = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}`;

function load(): StockEvent[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as StockEvent[];
  } catch {
    // A page with no storage keeps the log in memory only.
  }
  return sampleLog(TODAY);
}
function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(log));
  } catch {
    // A page with no storage keeps the log in memory only.
  }
}

let log = load();
let offset = 0;
const nextN = (): number => 1 + Math.max(0, ...log.map((e) => Number(e.id.slice(1)) || 0));
const append = (e: StockEvent): void => {
  log = [...log, e];
  save();
  render();
};

// The time of a new event: now, or 1 s after the last event of the log, so the fold applies the events in the order of the clicks.
function stamp(): string {
  const last = Math.max(0, ...log.map((e) => Date.parse(e.at) || 0));
  return new Date(Math.max(Date.now(), last + 1000)).toISOString();
}

const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const num = (x: number, digits = 0): string => x.toLocaleString(undefined, { maximumFractionDigits: digits });
const dateAt = (): string => addDays(TODAY, offset) ?? TODAY;

// ---- The views ----
function render(): void {
  const at = dateAt();
  const v = view(log, at);
  byId("day-text").textContent = at;
  byId("day-note").textContent = offset === 0 ? "This is today." : `${num(offset)} days after today.`;

  const tile = (value: string, label: string, sub: string, cls = ""): string =>
    `<div class="tile ${cls}"><div class="v">${value}</div><div class="l">${label}</div><div class="s">${sub}</div></div>`;
  const past = v.lots.filter((l) => !l.usable).length;
  byId("tiles").innerHTML = [
    tile(num(v.foodDays), "days of food", `${num(v.kcal)} calories`, v.foodDays < 14 ? "warn" : ""),
    tile(num(v.waterDays, 1), "days of water", `${num(v.gallons, 1)} gallons`, v.waterDays < 3 ? "warn" : ""),
    tile(num(v.lots.length), "lots", past ? `${past} past the due date` : "all before the due date", past ? "bad" : ""),
    tile(num(v.tasks.length), "tasks", "in the next 30 days", v.tasks.length ? "warn" : ""),
  ].join("");

  drawChart(at);

  byId("tasks").innerHTML = v.tasks.length
    ? v.tasks
        .map((t) => {
          const l = v.lots.find((x) => x.lot.id === t.ref);
          const verb = l && !l.usable ? "Remove" : "Use or replace";
          return `<div class="row"><div><strong>${verb}:</strong> ${esc(l?.name ?? t.ref)}, ${num(l?.lot.units ?? 0)} ${esc(l?.unit ?? "")}</div><div class="note">by ${esc(t.due)} · due ${esc(l?.lot.due ?? "")}</div></div>`;
        })
        .join("")
    : `<p class="note">No lot is due in the next 30 days. Move the date to see the tasks of a later day.</p>`;

  byId("lots").innerHTML = v.lots
    .map((l) => {
      const badge = !l.usable ? `<span class="badge past">past due</span>` : l.daysLeft <= 90 ? `<span class="badge soon">${l.daysLeft} days left</span>` : `<span class="badge ok">${num(l.daysLeft)} days left</span>`;
      return `<div class="row lot"><div><strong>${esc(l.name)}</strong> ${badge}<div class="note">${num(l.lot.units)} ${esc(l.unit)} · bought ${esc(l.lot.bought)} · due ${esc(l.lot.due)} from ${esc(l.source)}</div></div>
        <div class="ops"><button type="button" data-use="${l.lot.id}" aria-label="Use 1 ${esc(l.unit)} of ${esc(l.name)}">Use 1</button><button type="button" data-remove="${l.lot.id}" aria-label="Remove ${esc(l.name)}">Remove</button></div></div>`;
    })
    .join("");

  byId("log-count").textContent = `${log.length} events${v.problems.length ? `, ${v.problems.length} problems` : ""}`;
  byId("log").innerHTML = [...log]
    .reverse()
    .map((e) => {
      const what = e.kind === "add" || e.kind === "correct" ? `${e.kind} ${e.lot.id}: ${e.lot.units} of ${e.lot.product}, due ${e.lot.due}` : e.kind === "use" ? `use ${e.units} of ${e.lot}` : `remove ${e.lot} (${e.why})`;
      return `<li><code>${esc(e.at.slice(0, 10))}</code> ${esc(what)}</li>`;
    })
    .join("");
  showDue();
}

function drawChart(at: string): void {
  const steps = 156;
  const pts = curve(log, TODAY, steps, 7);
  const w = 640, h = 200, padL = 40, padB = 22, padT = 8;
  const max = Math.max(30, ...pts.map((p) => p.foodDays));
  const x = (i: number): number => padL + (i / steps) * (w - padL - 8);
  const y = (d: number): number => padT + (1 - d / max) * (h - padT - padB);
  let path = `M${x(0)},${y(pts[0]?.foodDays ?? 0)}`;
  pts.forEach((p, i) => {
    if (i > 0) path += `H${x(i)}V${y(p.foodDays)}`;
  });
  const ticks = [0, max / 2, max].map((d) => `<line x1="${padL}" x2="${w - 8}" y1="${y(d)}" y2="${y(d)}" class="grid"/><text x="${padL - 6}" y="${y(d) + 4}" text-anchor="end">${num(d)}</text>`).join("");
  const years = [0, 1, 2, 3].map((k) => `<text x="${x(k * 52)}" y="${h - 6}" text-anchor="${k === 3 ? "end" : "middle"}">${k === 0 ? "today" : `+${k} y`}</text>`).join("");
  const cur = x(Math.min(steps, offset / 7));
  byId("chart").innerHTML = `<title id="chart-label">Days of food over time</title>${ticks}${years}<path d="${path}" class="line"/><line x1="${cur}" x2="${cur}" y1="${padT}" y2="${h - padB}" class="cursor"/><text x="${Math.min(cur + 4, w - 70)}" y="${padT + 12}" class="cursor-text">${esc(at)}</text>`;
}

// ---- The form ----
const sel = byId<HTMLSelectElement>("a-product");
sel.innerHTML = PRODUCTS.map((p) => `<option value="${p.id}">${esc(p.name)} (${p.unit})</option>`).join("");
const bought = byId<HTMLInputElement>("a-bought");
const label = byId<HTMLInputElement>("a-label");
bought.value = TODAY;
function showDue(): void {
  const p = product(sel.value);
  const out = byId("a-due");
  if (!label.value && p.foodkeeper === undefined) {
    out.textContent = `${p.name} has no default: give the date on the label.`;
    return;
  }
  const due = dueOf(p.id, bought.value || TODAY, label.value || undefined);
  out.textContent = label.value ? `The due date is the label date, ${due}.` : `The FoodKeeper default gives the due date ${due}.`;
}
for (const el of [sel, bought, label]) el.addEventListener("input", showDue);
byId<HTMLFormElement>("add").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const p = product(sel.value);
  const units = Number(byId<HTMLInputElement>("a-units").value);
  if (!(units > 0) || (!label.value && p.foodkeeper === undefined)) {
    showDue();
    return;
  }
  append(addEvent(nextN(), stamp(), p.id, units, bought.value || TODAY, label.value || undefined));
});

// ---- The actions on a lot, the date and the reset ----
byId("lots").addEventListener("click", (ev) => {
  const b = (ev.target as Element).closest("button");
  if (!b) return;
  const n = nextN();
  const at = stamp();
  if (b.dataset["use"]) append({ id: `e${n}`, kind: "use", at, lot: b.dataset["use"], units: 1 });
  else if (b.dataset["remove"]) {
    const lot = view(log, TODAY).lots.find((l) => l.lot.id === b.dataset["remove"]);
    append({ id: `e${n}`, kind: "remove", at, lot: b.dataset["remove"], why: lot && !lot.usable ? "due" : "moved" });
  }
});
const day = byId<HTMLInputElement>("day");
day.addEventListener("input", () => {
  offset = Number(day.value);
  render();
});
byId("today").addEventListener("click", () => {
  offset = 0;
  day.value = "0";
  render();
});
byId("reset").addEventListener("click", () => {
  log = sampleLog(TODAY);
  save();
  render();
});
byId("source").innerHTML = `The default due dates come from <a href="${SOURCE.url}">${esc(SOURCE.title)}</a>, version ${SOURCE.version} (${SOURCE.versionDate}), <a href="${SOURCE.licenseUrl}">${esc(SOURCE.license)}</a>. The demo uses the short end of each range.`;

render();
