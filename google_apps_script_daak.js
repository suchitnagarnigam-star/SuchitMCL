/**
 * =========================================================================
 * MUNICIPAL CORPORATION LUDHIANA (MCL) - SUCHIT PRASHASAN AI
 * Citizen Daak Ingestion Web App
 * =========================================================================
 * 
 * Rules Configured:
 * 1. Looks at the 'Processed At' column of each entry to target that day's Commissioner's Desk.
 * 2. Starts from 15/09/2026 (September 15, 2026) — any earlier rows are ignored.
 * 3. Works seamlessly with Google Sheets columns:
 *    Serial Number | Date | Subject | Summary | Department | category | 
 *    Sender Name | Sender Contact | Receiver | Reference Number | Filename | Processed At | STATUS
 * 
 * How to Deploy:
 * 1. Open your Daak Google Sheet.
 * 2. Click Extensions > Apps Script.
 * 3. Paste this entire code into Code.gs (replace everything).
 * 4. Click 'Save' (floppy icon).
 * 5. Click Deploy > New deployment.
 * 6. Select type: 'Web app' (click gear icon ⚙️).
 * 7. Set:
 *    - Description: MCL Daak Ingestion API
 *    - Execute as: Me (your email)
 *    - Who has access: Anyone
 * 8. Click 'Deploy' and authorize permissions.
 * 9. Copy the Web App URL (ends with /exec).
 * 10. Click 'Sync Daak' on the Commissioner's Desk and paste the URL.
 */

// Cutoff date: 15/09/2026 (Entries before this date are ignored)
var CUTOFF_YEAR = 2026;
var CUTOFF_MONTH = 9; // September
var CUTOFF_DAY = 15;

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    var data = sheet.getDataRange().getValues();

    if (!data || data.length < 2) {
      return createJsonResponse({ status: "success", count: 0, rows: [] });
    }

    var headers = data[0].map(function(h) {
      return String(h).trim();
    });

    // Find key column indexes
    var processedAtIdx = findColumnIndex(headers, ["Processed At", "processed_at", "ProcessedAt"]);
    var dateIdx = findColumnIndex(headers, ["Date", "date"]);

    var cutoffTimestamp = new Date(CUTOFF_YEAR, CUTOFF_MONTH - 1, CUTOFF_DAY, 0, 0, 0).getTime();
    var rows = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];

      // Skip blank rows
      if (!row || row.every(function(cell) { return cell === "" || cell === null; })) {
        continue;
      }

      // Check Processed At date first, then fallback to Date
      var dateRaw = (processedAtIdx !== -1 && row[processedAtIdx] !== "") 
                      ? row[processedAtIdx] 
                      : (dateIdx !== -1 ? row[dateIdx] : null);

      var parsedDate = parseDateValue(dateRaw);

      // Filter: Ignore any entries before 15/09/2026
      if (parsedDate && parsedDate.getTime() < cutoffTimestamp) {
        continue; // Skip historical rows
      }

      var rowObject = {};
      for (var j = 0; j < headers.length; j++) {
        var header = headers[j];
        var val = row[j];

        if (val instanceof Date) {
          // Format Processed At with time if available, or YYYY-MM-DD
          rowObject[header] = Utilities.formatDate(val, Session.getScriptTimeZone() || "GMT+05:30", "yyyy-MM-dd HH:mm:ss");
        } else {
          rowObject[header] = (val !== null && val !== undefined) ? String(val).trim() : "";
        }
      }

      rows.push(rowObject);
    }

    return createJsonResponse({
      status: "success",
      count: rows.length,
      cutoff_date: "15/09/2026",
      rows: rows
    });

  } catch (err) {
    return createJsonResponse({
      status: "error",
      message: err.toString()
    });
  }
}

function doPost(e) {
  return doGet(e);
}

// Helper to find column index from possible header names
function findColumnIndex(headers, candidateNames) {
  for (var i = 0; i < headers.length; i++) {
    var h = headers[i].toLowerCase().replace(/[^a-z0-9]/g, "");
    for (var k = 0; k < candidateNames.length; k++) {
      var target = candidateNames[k].toLowerCase().replace(/[^a-z0-9]/g, "");
      if (h === target) return i;
    }
  }
  return -1;
}

// Helper to parse dates in DD/MM/YYYY, YYYY-MM-DD, or native Date formats
function parseDateValue(val) {
  if (!val) return null;
  if (val instanceof Date) {
    return new Date(val.getFullYear(), val.getMonth(), val.getDate(), 0, 0, 0);
  }

  var s = String(val).trim();
  if (!s) return null;

  // Match DD/MM/YYYY or DD-MM-YYYY
  var dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    var day = parseInt(dmyMatch[1], 10);
    var month = parseInt(dmyMatch[2], 10) - 1;
    var year = parseInt(dmyMatch[3], 10);
    return new Date(year, month, day, 0, 0, 0);
  }

  // Match YYYY-MM-DD or YYYY/MM/DD
  var ymdMatch = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (ymdMatch) {
    var year = parseInt(ymdMatch[1], 10);
    var month = parseInt(ymdMatch[2], 10) - 1;
    var day = parseInt(ymdMatch[3], 10);
    return new Date(year, month, day, 0, 0, 0);
  }

  var nativeParse = new Date(s);
  if (!isNaN(nativeParse.getTime())) {
    return new Date(nativeParse.getFullYear(), nativeParse.getMonth(), nativeParse.getDate(), 0, 0, 0);
  }

  return null;
}

function createJsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
