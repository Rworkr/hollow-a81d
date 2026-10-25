/**
 * Shelley Hollow RSVP store. Google Apps Script bound to the ledger Sheet.
 *
 * doPost appends one row per RSVP. doGet returns aggregates only (never names).
 * Deploy as a web app: Execute as "Me", Who has access "Anyone". Paste the /exec URL into
 * CONFIG.endpoint in index.html.
 *
 * Run setup() once from the editor: it names the sheet, writes the header row, adds a Totals
 * sheet, and triggers the one-time authorisation prompt.
 */

const LEDGER = "Ledger";
const HEADERS = ["submitted_at", "household", "adults", "children", "condition", "condition_other", "notes"];
const CONDITIONS = ["alive", "undead", "between", "other"];
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(LEDGER);
  if (!sh) {
    sh = ss.getSheets()[0];
    sh.setName(LEDGER);
  }
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight("bold");
  sh.setFrozenRows(1);
  sh.setColumnWidth(1, 190); sh.setColumnWidth(2, 220); sh.setColumnWidth(7, 260);

  let totals = ss.getSheetByName("Totals");
  if (!totals) totals = ss.insertSheet("Totals");
  totals.clear();
  totals.getRange("A1:B9").setValues([
    ["Households", "=COUNTA(Ledger!B2:B)"],
    ["Adults", "=SUM(Ledger!C2:C)"],
    ["Children", "=SUM(Ledger!D2:D)"],
    ["People", "=B2+B3"],
    ["Alive", '=COUNTIF(Ledger!E2:E,"alive")'],
    ["Undead", '=COUNTIF(Ledger!E2:E,"undead")'],
    ["In between", '=COUNTIF(Ledger!E2:E,"between")'],
    ["Other", '=COUNTIF(Ledger!E2:E,"other")'],
    ["Last RSVP", "=IF(COUNTA(Ledger!A2:A)=0,\"none yet\",INDEX(Ledger!A:A,COUNTA(Ledger!A:A)))"]
  ]);
  totals.getRange("A1:A9").setFontWeight("bold");
  totals.setColumnWidth(1, 120); totals.setColumnWidth(2, 200);
}

function ledger_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(LEDGER) || ss.getSheets()[0];
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function clampInt_(v, lo, hi) {
  const n = Math.round(Number(v));
  if (isNaN(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

function aggregate_() {
  const sh = ledger_();
  const last = sh.getLastRow();
  const out = { households: 0, adults: 0, children: 0, alive: 0, undead: 0, between: 0, other: 0, order: [] };
  if (last < 2) return out;
  const rows = sh.getRange(2, 1, last - 1, 6).getValues()
    .filter(function (r) { return String(r[1]).trim() !== ""; })
    .map(function (r) {
      return { t: new Date(r[0]).getTime() || 0, a: clampInt_(r[2], 0, 8), c: clampInt_(r[3], 0, 8),
               cond: CONDITIONS.indexOf(String(r[4])) >= 0 ? String(r[4]) : "other" };
    })
    .sort(function (x, y) { return x.t - y.t; });
  rows.forEach(function (r) {
    out.households += 1; out.adults += r.a; out.children += r.c; out[r.cond] += 1;
    out.order.push({ a: r.a, c: r.c, cond: r.cond });
  });
  return out;
}

function doGet() {
  return json_(aggregate_());
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    let body = {};
    try { body = JSON.parse((e && e.postData && e.postData.contents) || "{}"); }
    catch (err) { body = (e && e.parameter) || {}; }

    const household = String(body.household || "").trim().replace(/\s+/g, " ");
    if (household.length < 2) return json_({ ok: false, error: "name" });
    if (household.length > 40) return json_({ ok: false, error: "name_length" });
    const adults = clampInt_(body.adults, 0, 8);
    const children = clampInt_(body.children, 0, 8);
    if (adults + children < 1) return json_({ ok: false, error: "nobody" });
    const condition = CONDITIONS.indexOf(String(body.condition)) >= 0 ? String(body.condition) : "other";
    const other = condition === "other" ? String(body.condition_other || "").trim().slice(0, 40) : "";

    const sh = ledger_();
    const last = sh.getLastRow();
    const now = new Date();
    if (last >= 2) {
      const recent = sh.getRange(Math.max(2, last - 30), 1, Math.min(31, last - 1), 2).getValues();
      for (let i = recent.length - 1; i >= 0; i--) {
        const t = new Date(recent[i][0]).getTime();
        if (!t || now.getTime() - t > DUPLICATE_WINDOW_MS) continue;
        if (String(recent[i][1]).trim().toLowerCase() === household.toLowerCase()) {
          return json_({ ok: false, duplicate: true });
        }
      }
    }
    const stamp = Utilities.formatDate(now, "Australia/Perth", "yyyy-MM-dd'T'HH:mm:ss+08:00");
    sh.appendRow([stamp, household, adults, children, condition, other]);
    SpreadsheetApp.flush();
    const agg = aggregate_();
    agg.ok = true;
    return json_(agg);
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (err2) { /* nothing to release */ }
  }
}
