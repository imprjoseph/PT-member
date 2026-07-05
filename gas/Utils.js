/**
 * Utils.gs
 * 共用工具函式
 */

function doGet(e) {
  const callback = e && e.parameter && e.parameter.callback;
  const data = JSON.stringify({ success: false, message: '請使用 POST 方式呼叫' });
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + data + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return buildResponse_({ success: false, message: '請使用 POST 方式呼叫' });
}

function doPost(e) {
  try {
    let body;
    if (e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    } else {
      return buildResponse_({ success: false, message: '無效的請求格式' });
    }
    const action  = body.action;
    const payload = body.payload || {};
    const token   = body.token || '';
    if (!action) return buildResponse_({ success: false, message: '缺少 action 參數' });
    const result = routeAction_(action, payload, token);
    return buildResponse_(result);
  } catch (err) {
    return buildResponse_({ success: false, message: '系統錯誤：' + err.message });
  }
}

function buildResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.TEXT);
}

function routeAction_(action, payload, token) {
  const publicActions = ['login'];
  if (!publicActions.includes(action)) {
    const authResult = verifyToken(token);
    if (!authResult.success) return authResult;
    payload._user = authResult.user;
  }
  switch (action) {
    case 'login':            return login(payload);
    case 'logout':           return logout(token);
    case 'verifyToken':      return verifyToken(token);
    case 'changePassword':   return changePassword(payload);
    case 'createUser':       return createUser(payload);
    case 'updateUser':       return updateUser(payload);
    case 'disableUser':      return disableUser(payload);
    case 'resetPassword':    return resetPassword(payload);
    case 'resetUserIP':      return resetUserIP(payload);
    case 'getUsers':         return getUsers(payload);
    case 'clockIn':              return clockIn(payload);
    case 'clockOut':             return clockOut(payload);
    case 'remoteClock':          return remoteClock(payload);
    case 'getTodayAttendance':   return getTodayAttendance(payload);
    case 'getAttendanceList':    return getAttendanceList(payload);
    case 'exportAttendanceCsv':  return exportAttendanceCsv(payload);
    case 'submitWorkReport':   return submitWorkReport(payload);
    case 'getMyWorkReports':   return getMyWorkReports(payload);
    case 'getAllWorkReports':   return getAllWorkReports(payload);
    case 'getWorkReportStats': return getWorkReportStats(payload);
    case 'submitOvertime':        return submitOvertime(payload);
    case 'getMyOvertime':         return getMyOvertime(payload);
    case 'getAllOvertime':         return getAllOvertime(payload);
    case 'clientConfirmOvertime': return clientConfirmOvertime(payload);
    case 'adminApproveOvertime':  return adminApproveOvertime(payload);
    case 'rejectOvertime':        return rejectOvertime(payload);
    case 'getOvertimeStats':      return getOvertimeStats(payload);
    case 'exportOvertimeCsv':     return exportOvertimeCsv(payload);
    case 'submitLeave':       return submitLeave(payload);
    case 'getMyLeave':        return getMyLeave(payload);
    case 'getAllLeave':        return getAllLeave(payload);
    case 'adminApproveLeave': return adminApproveLeave(payload);
    case 'rejectLeave':       return rejectLeave(payload);
    case 'getLeaveStats':     return getLeaveStats(payload);
    case 'exportLeaveCsv':    return exportLeaveCsv(payload);
    case 'submitIssue':     return submitIssue(payload);
    case 'getMyIssues':     return getMyIssues(payload);
    case 'getAllIssues':     return getAllIssues(payload);
    case 'adminReplyIssue': return adminReplyIssue(payload);
    case 'clientReplyIssue':return clientReplyIssue(payload);
    case 'closeIssue':      return closeIssue(payload);
    case 'getIssueStats':   return getIssueStats(payload);
    case 'addAllowedIP':     return addAllowedIP(payload);
    case 'removeAllowedIP':  return removeAllowedIP(payload);
    case 'getAllowedIPList': return getAllowedIPList(payload);
    case 'getStaffDashboard':  return getStaffDashboard(payload);
    case 'getAdminDashboard':  return getAdminDashboard(payload);
    case 'getClientDashboard': return getClientDashboard(payload);
    default:
      return { success: false, message: '不支援的 action: ' + action };
  }
}

// ── 工具函式 ───────────────────────────────────────────────────
function getSheet_(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

function getSheetData_(sheetName) {
  const sheet = getSheet_(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function appendToSheet_(sheetName, rowData, headers) {
  const sheet = getSheet_(sheetName);
  const row = headers.map(h => rowData[h] !== undefined ? rowData[h] : '');
  sheet.appendRow(row);
}

function updateSheetRow_(sheetName, idField, idValue, updates) {
  const sheet = getSheet_(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf(idField);
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(idValue)) {
      Object.keys(updates).forEach(key => {
        const col = headers.indexOf(key);
        if (col !== -1) sheet.getRange(i + 1, col + 1).setValue(updates[key]);
      });
      return true;
    }
  }
  return false;
}

function generateId_(prefix) {
  return prefix + Date.now().toString(36).toUpperCase() +
         Math.random().toString(36).substr(2, 4).toUpperCase();
}

function generateSalt_() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < 32; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function hashPassword_(password, salt) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, password + salt);
  return bytes.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}

// ── 時間工具：統一輸出台北時間字串，不依賴欄位格式 ───────────
// 解決 Google Sheets 自動把日期時間字串轉型為 Date 物件（UTC）的問題。
// 不管讀出來是 Date 物件還是字串，都強制轉成 Asia/Taipei 的字串。
function now_() {
  return Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
}

function today_() {
  return Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd');
}

// 把任意值（Date 物件或字串）轉成台北時間 yyyy-MM-dd
function toDateStr_(val) {
  if (!val && val !== 0) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, 'Asia/Taipei', 'yyyy-MM-dd');
  }
  // 字串：可能是 "2026-06-29" 或 "2026-06-29 17:24:00" 或 ISO 格式
  const s = val.toString();
  if (s.length >= 10) return s.substring(0, 10);
  return s;
}

// 把任意值（Date 物件或字串）轉成台北時間 yyyy-MM-dd HH:mm:ss
function toDateTimeStr_(val) {
  if (!val && val !== 0) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
  }
  return val.toString();
}

function requireRole_(user, roles) {
  if (!roles.includes(user.role)) {
    return { success: false, message: '權限不足' };
  }
  return null;
}
