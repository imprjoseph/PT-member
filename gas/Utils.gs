/**
 * Utils.gs
 * 共用工具函式：回應格式、時間、Hash、Token、CORS
 */

// ── CORS & 統一回應入口 ────────────────────────────────────────
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: false, message: '請使用 POST 方式呼叫' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    const payload = body.payload || {};
    const token = body.token || '';

    const result = routeAction_(action, payload, token);
    return buildResponse_(result);
  } catch (err) {
    return buildResponse_({ success: false, message: '系統錯誤：' + err.message });
  }
}

function buildResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Action Router ──────────────────────────────────────────────
function routeAction_(action, payload, token) {
  // 不需驗證 token 的 action
  const publicActions = ['login'];
  
  if (!publicActions.includes(action)) {
    const authResult = verifyToken(token);
    if (!authResult.success) return authResult;
    payload._user = authResult.user; // 注入當前用戶資訊
  }

  switch (action) {
    // Auth
    case 'login':            return login(payload);
    case 'logout':           return logout(token);
    case 'verifyToken':      return verifyToken(token);
    case 'changePassword':   return changePassword(payload);
    
    // Users (Admin only)
    case 'createUser':       return createUser(payload);
    case 'updateUser':       return updateUser(payload);
    case 'disableUser':      return disableUser(payload);
    case 'resetPassword':    return resetPassword(payload);
    case 'getUsers':         return getUsers(payload);
    
    // Attendance
    case 'clockIn':          return clockIn(payload);
    case 'clockOut':         return clockOut(payload);
    case 'remoteClock':      return remoteClock(payload);
    case 'getTodayAttendance':   return getTodayAttendance(payload);
    case 'getAttendanceList':    return getAttendanceList(payload);
    case 'exportAttendanceCsv':  return exportAttendanceCsv(payload);
    
    // WorkReports
    case 'submitWorkReport': return submitWorkReport(payload);
    case 'getMyWorkReports': return getMyWorkReports(payload);
    case 'getAllWorkReports': return getAllWorkReports(payload);
    case 'getWorkReportStats': return getWorkReportStats(payload);
    
    // Overtime
    case 'submitOvertime':        return submitOvertime(payload);
    case 'getMyOvertime':         return getMyOvertime(payload);
    case 'getAllOvertime':         return getAllOvertime(payload);
    case 'clientConfirmOvertime': return clientConfirmOvertime(payload);
    case 'adminApproveOvertime':  return adminApproveOvertime(payload);
    case 'rejectOvertime':        return rejectOvertime(payload);
    case 'getOvertimeStats':      return getOvertimeStats(payload);
    case 'exportOvertimeCsv':     return exportOvertimeCsv(payload);
    
    // Leave
    case 'submitLeave':       return submitLeave(payload);
    case 'getMyLeave':        return getMyLeave(payload);
    case 'getAllLeave':        return getAllLeave(payload);
    case 'adminApproveLeave': return adminApproveLeave(payload);
    case 'rejectLeave':       return rejectLeave(payload);
    case 'getLeaveStats':     return getLeaveStats(payload);
    case 'exportLeaveCsv':    return exportLeaveCsv(payload);
    
    // Issues
    case 'submitIssue':       return submitIssue(payload);
    case 'getMyIssues':       return getMyIssues(payload);
    case 'getAllIssues':       return getAllIssues(payload);
    case 'adminReplyIssue':   return adminReplyIssue(payload);
    case 'clientReplyIssue':  return clientReplyIssue(payload);
    case 'closeIssue':        return closeIssue(payload);
    case 'getIssueStats':     return getIssueStats(payload);
    
    // Dashboard
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
    if (data[i][idCol] == idValue) {
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
  return prefix + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
}

function generateSalt_() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let salt = '';
  for (let i = 0; i < 32; i++) {
    salt += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return salt;
}

function hashPassword_(password, salt) {
  const raw = password + salt;
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
  return bytes.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}

function now_() {
  return Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
}

function today_() {
  return Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd');
}

function requireRole_(user, roles) {
  if (!roles.includes(user.role)) {
    return { success: false, message: '權限不足' };
  }
  return null;
}
