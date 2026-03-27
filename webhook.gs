/**
 * TagExtract Pro — Google Apps Script Webhook
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to https://script.google.com and create a new project.
 * 2. Paste this entire code into the editor.
 * 3. Click "Deploy" > "New deployment".
 * 4. Select type: "Web app".
 * 5. Set "Execute as": Me, "Who has access": Anyone.
 * 6. Click "Deploy" and copy the Web App URL.
 * 7. Paste the URL into app.js as the WEBHOOK_URL value.
 *
 * This script receives POST requests from TagExtract Pro
 * and logs each YouTube URL search to a Google Sheet.
 */

// Replace with your Google Sheet ID (from the sheet URL)
const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID';
const SHEET_NAME = 'TagExtract Logs';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    const sheet = getOrCreateSheet();

    sheet.appendRow([
      new Date().toISOString(),    // Timestamp
      data.url || '',               // YouTube URL
      data.videoId || '',           // Video ID
      data.referrer || '',          // Referrer
      data.timestamp || '',         // Client timestamp
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'TagExtract Pro Webhook is running.' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet() {
  let ss;

  if (SHEET_ID && SHEET_ID !== 'YOUR_GOOGLE_SHEET_ID') {
    ss = SpreadsheetApp.openById(SHEET_ID);
  } else {
    // Auto-create a new spreadsheet if no ID is set
    ss = SpreadsheetApp.create('TagExtract Pro - Search Logs');
    Logger.log('Created new spreadsheet: ' + ss.getUrl());
  }

  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // Add headers
    sheet.appendRow(['Timestamp', 'YouTube URL', 'Video ID', 'Referrer', 'Client Timestamp']);
    sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  return sheet;
}
