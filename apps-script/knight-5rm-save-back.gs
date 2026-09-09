/**
 * Knight Fitness 5RM Board — save-back endpoint
 *
 * SETUP (once, ~5 minutes)
 * 1. Open your 5RM Google Sheet.
 * 2. Extensions → Apps Script. Delete anything in the editor and paste this file.
 * 3. Set COACH_PIN below to the same PIN you enter in the board's Coach mode.
 * 4. Check the TABS map matches your tab names (left of the "=") — the tab
 *    names in your sheet, not the header text.
 * 5. Deploy → New deployment → type "Web app".
 *      Execute as: Me
 *      Who has access: Anyone
 *    Deploy, authorise, then COPY the /exec URL.
 * 6. Paste that URL into the board: Coach mode → "Save-back link (Apps Script)".
 *
 * After that, every score a coach enters on the board is written into this
 * sheet: the new number goes in the 5RM column and the number it replaced
 * moves into the "Previous 5RM" column.
 */

var COACH_PIN = '1984';

var TABS = {
  sq: 'Squat 5RM',
  bp: 'Bench 5RM',
  dl: 'Deadlift 5RM'
};

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (COACH_PIN && String(body.pin || '') !== String(COACH_PIN)) {
      return out({ ok: false, error: 'bad pin' });
    }
    var m = body.member;
    if (!m || !m.name) return out({ ok: false, error: 'no member' });

    var written = [];
    Object.keys(TABS).forEach(function (key) {
      if (!m[key]) return;
      if (writeCell(TABS[key], m.name, m[key].c, m[key].p)) written.push(key);
    });
    return out({ ok: true, written: written });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  }
}

function doGet() {
  return out({ ok: true, service: 'Knight 5RM save-back' });
}

function writeCell(tabName, name, current, previous) {
  var sh = SpreadsheetApp.getActive().getSheetByName(tabName);
  if (!sh) return false;

  var values = sh.getDataRange().getValues();

  // Find the header row: the row containing a cell that reads exactly "Name".
  var hRow = -1, nameCol = -1;
  for (var r = 0; r < values.length && hRow < 0; r++) {
    for (var c = 0; c < values[r].length; c++) {
      if (String(values[r][c]).trim().toLowerCase() === 'name') { hRow = r; nameCol = c; break; }
    }
  }
  if (hRow < 0) return false;

  // Columns: the 5RM column and the "Previous 5RM" column.
  var head = values[hRow], curCol = -1, prevCol = -1;
  for (var j = 0; j < head.length; j++) {
    var t = String(head[j]).toLowerCase();
    if (j === nameCol || !t) continue;
    if (t.indexOf('previous') >= 0 && prevCol < 0) prevCol = j;
    else if (t.indexOf('5 rm') >= 0 || t.indexOf('5rm') >= 0) { if (curCol < 0) curCol = j; }
  }
  if (curCol < 0) curCol = nameCol + 1;

  // Find the member's row, or use the first empty name cell below the header.
  var target = -1, firstEmpty = -1;
  for (var i = hRow + 1; i < values.length; i++) {
    var cell = String(values[i][nameCol]).trim();
    if (cell.toLowerCase() === String(name).trim().toLowerCase()) { target = i; break; }
    if (!cell && firstEmpty < 0) firstEmpty = i;
  }
  if (target < 0) {
    target = firstEmpty >= 0 ? firstEmpty : values.length;
    sh.getRange(target + 1, nameCol + 1).setValue(name);
  }

  if (prevCol >= 0 && previous !== '' && previous !== null && previous !== undefined) {
    sh.getRange(target + 1, prevCol + 1).setValue(Number(previous));
  }
  sh.getRange(target + 1, curCol + 1).setValue(Number(current));
  return true;
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
