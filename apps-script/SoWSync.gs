/**
 * SoW PWA sync bridge — paste into Extensions → Apps Script on the workbook
 * (or a standalone script with Sheets API scope), then Deploy → Web app:
 *   Execute as: Me
 *   Who has access: Anyone
 * Copy the Web App URL into SoW Settings → Sync Web App URL.
 *
 * Never writes into teaching tabs (KGA/KGB Eng CW/HW).
 */

var SOW_TABS = {
  sessions: 'SoW_Sessions',
  marks: 'SoW_Marks',
  rosterMeta: 'SoW_RosterMeta',
};

var SESSION_HEADERS = ['sessionId','classKey','date1','topic1','date2','topic2','createdAt','updatedAt'];
var MARK_HEADERS = ['markId','classKey','roll','name','date','topic','set','submitted','updatedAt'];
var META_HEADERS = ['classKey','roll','name','left','updatedAt'];

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var sheetId = body.sheetId;
    if (!sheetId) return json_({ ok: false, message: 'sheetId required' });
    var ss = SpreadsheetApp.openById(sheetId);
    if (body.action === 'ensureAndPull') {
      ensureTab_(ss, SOW_TABS.sessions, SESSION_HEADERS);
      ensureTab_(ss, SOW_TABS.marks, MARK_HEADERS);
      ensureTab_(ss, SOW_TABS.rosterMeta, META_HEADERS);
      return json_({
        ok: true,
        sessions: readTab_(ss, SOW_TABS.sessions),
        marks: readTab_(ss, SOW_TABS.marks),
        rosterMeta: readTab_(ss, SOW_TABS.rosterMeta),
      });
    }
    if (body.action === 'push') {
      ensureTab_(ss, SOW_TABS.sessions, SESSION_HEADERS);
      ensureTab_(ss, SOW_TABS.marks, MARK_HEADERS);
      ensureTab_(ss, SOW_TABS.rosterMeta, META_HEADERS);
      writeTab_(ss, SOW_TABS.sessions, body.sessions || [SESSION_HEADERS]);
      writeTab_(ss, SOW_TABS.marks, body.marks || [MARK_HEADERS]);
      writeTab_(ss, SOW_TABS.rosterMeta, body.rosterMeta || [META_HEADERS]);
      return json_({ ok: true, message: 'pushed' });
    }
    return json_({ ok: false, message: 'Unknown action' });
  } catch (err) {
    return json_({ ok: false, message: String(err) });
  }
}

function doGet() {
  return json_({ ok: true, message: 'SoW sync bridge alive. Use POST.' });
}

function ensureTab_(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    return sh;
  }
  var existing = sh.getRange(1, 1, 1, headers.length).getValues()[0];
  var empty = !existing.join('');
  if (empty) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  return sh;
}

function readTab_(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh) return [];
  var values = sh.getDataRange().getValues();
  return values.map(function (row) {
    return row.map(function (c) {
      if (c === true) return 'TRUE';
      if (c === false) return 'FALSE';
      if (Object.prototype.toString.call(c) === '[object Date]') {
        return Utilities.formatDate(c, Session.getScriptTimeZone(), 'd/M');
      }
      return String(c);
    });
  });
}

function writeTab_(ss, name, rows) {
  var sh = ensureTab_(ss, name, rows[0]);
  sh.clearContents();
  if (!rows.length) return;
  sh.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
