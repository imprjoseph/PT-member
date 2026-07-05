/**
 * Setup.gs
 * 執行一次即可建立所有工作表與欄位
 * 在 Google Apps Script 編輯器中，選擇 initializeSheets 函式並執行
 */

function initializeSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  setupUsers(ss);
  setupSessions(ss);
  setupAttendance(ss);
  setupWorkReports(ss);
  setupOvertime(ss);
  setupLeaveRequests(ss);
  setupIssues(ss);
  
  SpreadsheetApp.getUi().alert('✅ 所有工作表建立完成！請繼續部署 Web App。');
}

// ── Users ──────────────────────────────────────────────────────
function setupUsers(ss) {
  let sheet = ss.getSheetByName('Users');
  if (!sheet) sheet = ss.insertSheet('Users');
  sheet.clearContents();
  
  const headers = [
    'user_id', 'name', 'email', 'password_hash', 'password_salt',
    'role', 'department', 'project', 'phone', 'status',
    'force_change_password', 'last_login_at', 'created_at', 'updated_at'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#1a73e8').setFontColor('#ffffff').setFontWeight('bold');
  sheet.setFrozenRows(1);
  
  // 建立初始 Admin 帳號（密碼: Admin@1234）
  const salt = generateSalt_();
  const hash = hashPassword_('Admin@1234', salt);
  const now = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
  sheet.appendRow([
    'U001', '系統管理員', 'admin@dispatch.com', hash, salt,
    'admin', '本公司', '派遣管理', '', 'active',
    'FALSE', '', now, now
  ]);
  
  Logger.log('✅ Users 工作表建立完成，初始 Admin: admin@dispatch.com / Admin@1234');
}

// ── Sessions ───────────────────────────────────────────────────
function setupSessions(ss) {
  let sheet = ss.getSheetByName('Sessions');
  if (!sheet) sheet = ss.insertSheet('Sessions');
  sheet.clearContents();
  
  const headers = ['token', 'user_id', 'email', 'role', 'created_at', 'expires_at', 'status'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#1a73e8').setFontColor('#ffffff').setFontWeight('bold');
  sheet.setFrozenRows(1);
  Logger.log('✅ Sessions 工作表建立完成');
}

// ── Attendance ─────────────────────────────────────────────────
function setupAttendance(ss) {
  let sheet = ss.getSheetByName('Attendance');
  if (!sheet) sheet = ss.insertSheet('Attendance');
  sheet.clearContents();
  
  const headers = [
    'attendance_id', 'user_id', 'name', 'date',
    'clock_in_time', 'clock_out_time',
    'clock_in_location', 'clock_out_location',
    'clock_in_lat', 'clock_in_lng',
    'clock_out_lat', 'clock_out_lng',
    'attendance_type', 'work_hours', 'status', 'note',
    'created_at', 'updated_at'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#0f9d58').setFontColor('#ffffff').setFontWeight('bold');
  sheet.setFrozenRows(1);
  Logger.log('✅ Attendance 工作表建立完成');
}

// ── WorkReports ────────────────────────────────────────────────
function setupWorkReports(ss) {
  let sheet = ss.getSheetByName('WorkReports');
  if (!sheet) sheet = ss.insertSheet('WorkReports');
  sheet.clearContents();
  
  const headers = [
    'report_id', 'user_id', 'name', 'report_date', 'work_location',
    'completed_tasks', 'ongoing_tasks', 'pending_items',
    'support_unit', 'need_assistance', 'issue_flag',
    'submitted_at', 'updated_at'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#f4b400').setFontColor('#ffffff').setFontWeight('bold');
  sheet.setFrozenRows(1);
  Logger.log('✅ WorkReports 工作表建立完成');
}

// ── Overtime ───────────────────────────────────────────────────
function setupOvertime(ss) {
  let sheet = ss.getSheetByName('Overtime');
  if (!sheet) sheet = ss.insertSheet('Overtime');
  sheet.clearContents();
  
  const headers = [
    'overtime_id', 'user_id', 'name', 'overtime_date',
    'start_time', 'end_time', 'overtime_hours', 'overtime_type',
    'location', 'reason', 'related_task', 'is_moda_requested',
    'attachment_url', 'client_confirm_status', 'admin_approve_status',
    'approved_hours', 'final_status', 'created_at', 'updated_at'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#db4437').setFontColor('#ffffff').setFontWeight('bold');
  sheet.setFrozenRows(1);
  Logger.log('✅ Overtime 工作表建立完成');
}

// ── LeaveRequests ──────────────────────────────────────────────
function setupLeaveRequests(ss) {
  let sheet = ss.getSheetByName('LeaveRequests');
  if (!sheet) sheet = ss.insertSheet('LeaveRequests');
  sheet.clearContents();
  
  const headers = [
    'leave_id', 'user_id', 'name', 'leave_type',
    'start_time', 'end_time', 'leave_hours', 'reason',
    'attachment_url', 'admin_approve_status', 'client_notify_status',
    'final_status', 'created_at', 'updated_at'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#9c27b0').setFontColor('#ffffff').setFontWeight('bold');
  sheet.setFrozenRows(1);
  Logger.log('✅ LeaveRequests 工作表建立完成');
}

// ── Issues ─────────────────────────────────────────────────────
function setupIssues(ss) {
  let sheet = ss.getSheetByName('Issues');
  if (!sheet) sheet = ss.insertSheet('Issues');
  sheet.clearContents();
  
  const headers = [
    'issue_id', 'user_id', 'name', 'issue_date', 'issue_type',
    'description', 'priority', 'need_client_response',
    'admin_response', 'client_response', 'status',
    'created_at', 'updated_at'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#607d8b').setFontColor('#ffffff').setFontWeight('bold');
  sheet.setFrozenRows(1);
  Logger.log('✅ Issues 工作表建立完成');
}

// ── 工具函式 ───────────────────────────────────────────────────
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

