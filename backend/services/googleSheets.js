/**
 * Google Sheets sync — the long-term store for completed/cancelled appointments.
 *
 * Tabs (auto-created):
 *   • Today Appointments       (refreshed every sync)
 *   • Upcoming Appointments    (date > today)
 *   • Completed                (status = completed)
 *   • Cancelled                (status = cancelled)
 *
 * Row colour rules (per requirement):
 *   • cancelled  → red
 *   • completed  → green
 *   • booked / arrived (pending) → yellow
 *   • rescheduled → purple
 *   • postponed (doctor)         → blue
 *
 * Active appointments live in MongoDB. As soon as they hit `completed` /
 * `cancelled` they are written to the appropriate tab and removed from Mongo.
 */
const { google } = require('googleapis');

const TAB_TODAY = 'Today Appointments';
const TAB_UPCOMING = 'Upcoming Appointments';
const TAB_COMPLETED = 'Completed';
const TAB_CANCELLED = 'Cancelled';
const TAB_NAMES = [TAB_TODAY, TAB_UPCOMING, TAB_COMPLETED, TAB_CANCELLED];

const HEADERS = [
  'Code',
  'Date',
  'Time',
  'Status',
  'Patient Name',
  'Phone',
  'Age',
  'Gender',
  'Reason',
  'Department',
  'Doctor',
  'Speciality',
  'Fee (₹)',
  'Payment Mode',
  'Payment Status',
  'Booked At',
  'Arrived At',
  'Completed At',
  'Cancelled At',
  'Postpone Reason',
  'Notes',
];

const COLOR = {
  red: { red: 0.99, green: 0.78, blue: 0.78 },
  green: { red: 0.78, green: 0.93, blue: 0.78 },
  yellow: { red: 1, green: 0.95, blue: 0.71 },
  purple: { red: 0.91, green: 0.81, blue: 0.97 },
  blue: { red: 0.78, green: 0.87, blue: 0.97 },
  white: { red: 1, green: 1, blue: 1 },
  headerBg: { red: 0.13, green: 0.36, blue: 0.79 },
  headerFg: { red: 1, green: 1, blue: 1 },
};

function statusColour(status) {
  switch (status) {
    case 'cancelled':
      return COLOR.red;
    case 'completed':
      return COLOR.green;
    case 'rescheduled':
      return COLOR.purple;
    case 'postponed':
      return COLOR.blue;
    case 'booked':
    case 'arrived':
      return COLOR.yellow;
    default:
      return COLOR.white;
  }
}

function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) return null;
  let credentials;
  try {
    credentials = JSON.parse(raw);
  } catch (err) {
    console.error('[googleSheets] invalid GOOGLE_SERVICE_ACCOUNT_KEY:', err.message);
    return null;
  }
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

function getCtx() {
  const auth = getAuth();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!auth || !spreadsheetId) return null;
  return { sheets: google.sheets({ version: 'v4', auth }), spreadsheetId };
}

function isReady() {
  return !!getCtx();
}

async function _getMeta(ctx) {
  return ctx.sheets.spreadsheets.get({ spreadsheetId: ctx.spreadsheetId });
}
function _findSheetId(meta, title) {
  const sh = (meta.data.sheets || []).find((s) => s.properties.title === title);
  return sh ? sh.properties.sheetId : null;
}

/** Ensure the four tabs exist with header row + frozen + colored header. */
async function ensureTabs() {
  const ctx = getCtx();
  if (!ctx) return false;
  const meta = await _getMeta(ctx);
  const existing = (meta.data.sheets || []).map((s) => s.properties.title);
  const requests = [];
  for (const tab of TAB_NAMES) {
    if (!existing.includes(tab)) requests.push({ addSheet: { properties: { title: tab } } });
  }
  if (requests.length) {
    await ctx.sheets.spreadsheets.batchUpdate({ spreadsheetId: ctx.spreadsheetId, resource: { requests } });
  }
  // refresh meta after adding
  const meta2 = await _getMeta(ctx);
  const formatRequests = [];
  for (const tab of TAB_NAMES) {
    const sheetId = _findSheetId(meta2, tab);
    if (sheetId == null) continue;

    // header row values
    await ctx.sheets.spreadsheets.values.update({
      spreadsheetId: ctx.spreadsheetId,
      range: `${tab}!A1:${columnLetter(HEADERS.length)}1`,
      valueInputOption: 'RAW',
      resource: { values: [HEADERS] },
    });

    formatRequests.push(
      // freeze top row
      {
        updateSheetProperties: {
          properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
          fields: 'gridProperties.frozenRowCount',
        },
      },
      // header style
      {
        repeatCell: {
          range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: HEADERS.length },
          cell: {
            userEnteredFormat: {
              backgroundColor: COLOR.headerBg,
              horizontalAlignment: 'CENTER',
              textFormat: { foregroundColor: COLOR.headerFg, bold: true },
            },
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
        },
      },
      // auto-resize cols
      {
        autoResizeDimensions: {
          dimensions: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: HEADERS.length },
        },
      }
    );
  }
  if (formatRequests.length) {
    await ctx.sheets.spreadsheets.batchUpdate({
      spreadsheetId: ctx.spreadsheetId,
      resource: { requests: formatRequests },
    });
  }
  return true;
}

function columnLetter(col) {
  let s = '';
  while (col > 0) {
    const m = (col - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    col = Math.floor((col - 1) / 26);
  }
  return s;
}

function rowFromAppointment(appt) {
  const fmtTs = (d) => (d ? new Date(d).toLocaleString('en-IN', { hour12: false }) : '');
  return [
    appt.code || '',
    appt.date || '',
    appt.timeLabel || appt.time || '',
    appt.status || '',
    appt.patientName || '',
    `+${appt.patientPhone || ''}`,
    appt.patientAge || '',
    appt.patientGender || '',
    appt.reason || '',
    appt.departmentName || '',
    appt.doctorName || '',
    appt.doctorSpeciality || '',
    appt.fee || 0,
    appt.paymentMode || '',
    appt.paymentStatus || '',
    fmtTs(appt.createdAt),
    fmtTs(appt.arrivedAt),
    fmtTs(appt.completedAt),
    fmtTs(appt.cancelledAt),
    appt.postponeReason || '',
    appt.notes || '',
  ];
}

async function _findRowByCode(ctx, tab, code) {
  const resp = await ctx.sheets.spreadsheets.values.get({ spreadsheetId: ctx.spreadsheetId, range: `${tab}!A:A` });
  const rows = resp.data.values || [];
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][0] || '').trim() === code) return i + 1;
  }
  return null;
}

async function _writeRowAndColor(ctx, tab, rowIndex, values, color) {
  const meta = await _getMeta(ctx);
  const sheetId = _findSheetId(meta, tab);
  await ctx.sheets.spreadsheets.values.update({
    spreadsheetId: ctx.spreadsheetId,
    range: `${tab}!A${rowIndex}:${columnLetter(HEADERS.length)}${rowIndex}`,
    valueInputOption: 'RAW',
    resource: { values: [values] },
  });
  if (sheetId == null) return;
  await ctx.sheets.spreadsheets.batchUpdate({
    spreadsheetId: ctx.spreadsheetId,
    resource: {
      requests: [
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: rowIndex - 1,
              endRowIndex: rowIndex,
              startColumnIndex: 0,
              endColumnIndex: HEADERS.length,
            },
            cell: { userEnteredFormat: { backgroundColor: color } },
            fields: 'userEnteredFormat.backgroundColor',
          },
        },
      ],
    },
  });
}

/** Append (or update if `code` exists) a row in the given tab. */
async function upsertRow(tab, appt) {
  const ctx = getCtx();
  if (!ctx) return false;
  await ensureTabs();
  const values = rowFromAppointment(appt);
  const color = statusColour(appt.status);
  const existing = await _findRowByCode(ctx, tab, appt.code);
  if (existing) {
    await _writeRowAndColor(ctx, tab, existing, values, color);
    return existing;
  }
  await ctx.sheets.spreadsheets.values.append({
    spreadsheetId: ctx.spreadsheetId,
    range: `${tab}!A:A`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: { values: [values] },
  });
  // colour the just-added row
  const newRow = await _findRowByCode(ctx, tab, appt.code);
  if (newRow) await _writeRowAndColor(ctx, tab, newRow, values, color);
  return newRow;
}

async function removeRow(tab, code) {
  const ctx = getCtx();
  if (!ctx) return false;
  const rowIndex = await _findRowByCode(ctx, tab, code);
  if (!rowIndex) return false;
  const meta = await _getMeta(ctx);
  const sheetId = _findSheetId(meta, tab);
  if (sheetId == null) return false;
  await ctx.sheets.spreadsheets.batchUpdate({
    spreadsheetId: ctx.spreadsheetId,
    resource: {
      requests: [
        {
          deleteDimension: {
            range: { sheetId, dimension: 'ROWS', startIndex: rowIndex - 1, endIndex: rowIndex },
          },
        },
      ],
    },
  });
  return true;
}

/** Wipe all four tabs (used by the reset-all script). */
async function purgeAll() {
  const ctx = getCtx();
  if (!ctx) return false;
  await ensureTabs();
  const meta = await _getMeta(ctx);
  const requests = [];
  for (const tab of TAB_NAMES) {
    const sheetId = _findSheetId(meta, tab);
    if (sheetId == null) continue;
    requests.push({
      updateCells: {
        range: { sheetId, startRowIndex: 1 }, // keep header row
        fields: 'userEnteredValue,userEnteredFormat',
      },
    });
  }
  if (requests.length) {
    await ctx.sheets.spreadsheets.batchUpdate({ spreadsheetId: ctx.spreadsheetId, resource: { requests } });
  }
  return true;
}

module.exports = {
  isReady,
  ensureTabs,
  upsertRow,
  removeRow,
  purgeAll,
  TAB_TODAY,
  TAB_UPCOMING,
  TAB_COMPLETED,
  TAB_CANCELLED,
};
