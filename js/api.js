/**
 * api.js
 * 統一 API 呼叫層 - 所有前端與 GAS 的溝通透過此模組
 */
const API = (() => {
  const REQUEST_TIMEOUT_MS = 20000;

  async function call(action, payload = {}, showLoading = true) {
    if (CONFIG.GAS_WEB_APP_URL === '請填入 Google Apps Script Web App URL') {
      console.error('尚未設定 GAS_WEB_APP_URL');
      return { success: false, message: '系統尚未完成設定，請聯繫管理員' };
    }

    const token = AUTH.getToken();
    if (showLoading) UI.showLoading();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(CONFIG.GAS_WEB_APP_URL, {
        method: 'POST',
        // GAS 不支援 CORS preflight，必須用 text/plain 避免觸發 OPTIONS
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, payload, token }),
        redirect: 'follow',
        signal: controller.signal
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // GAS 回傳 text/plain，需用 text() 再 JSON.parse
      const raw = await res.text();
      const data = JSON.parse(raw);

      // Token 過期 → 自動登出
      if (!data.success && data.message && data.message.includes('重新登入')) {
        AUTH.logout();
        return data;
      }

      return data;
    } catch (err) {
      console.error('API Error:', err);
      return {
        success: false,
        message: err.name === 'AbortError' ? '連線逾時，請稍後再試' : '網路錯誤，請稍後再試'
      };
    } finally {
      clearTimeout(timeoutId);
      if (showLoading) UI.hideLoading();
    }
  }

  return {
    // Auth
    login: (email, password) => call('login', { email, password }, false),
    logout: () => call('logout', {}, false),
    verifyToken: () => call('verifyToken', {}, false),
    changePassword: (old_password, new_password) => call('changePassword', { old_password, new_password }),

    // Users
    getUsers: () => call('getUsers', {}),
    createUser: (data) => call('createUser', data),
    updateUser: (data) => call('updateUser', data),
    disableUser: (user_id) => call('disableUser', { user_id }),
    resetPassword: (user_id, new_password) => call('resetPassword', { user_id, new_password }),
    resetUserIP: (user_id) => call('resetUserIP', { user_id }),

    // Attendance
    clockIn: (location, lat, lng, note, client_ip) => call('clockIn', { location, lat, lng, note, client_ip }),
    clockOut: (location, lat, lng, note, client_ip) => call('clockOut', { location, lat, lng, note, client_ip }),
    remoteClock: (type, location, lat, lng, note, client_ip) => call('remoteClock', { type, location, lat, lng, note, client_ip }),
    getTodayAttendance: () => call('getTodayAttendance', {}),
    getAttendanceList: (params) => call('getAttendanceList', params || {}),
    exportAttendanceCsv: (params) => call('exportAttendanceCsv', params || {}),

    // WorkReports
    submitWorkReport: (data) => call('submitWorkReport', data),
    getMyWorkReports: (params) => call('getMyWorkReports', params || {}),
    getAllWorkReports: (params) => call('getAllWorkReports', params || {}),
    getWorkReportStats: (params) => call('getWorkReportStats', params || {}),

    // Overtime
    submitOvertime: (data) => call('submitOvertime', data),
    getMyOvertime: (params) => call('getMyOvertime', params || {}),
    getAllOvertime: (params) => call('getAllOvertime', params || {}),
    clientConfirmOvertime: (overtime_id, action) => call('clientConfirmOvertime', { overtime_id, action }),
    adminApproveOvertime: (overtime_id, approved_hours) => call('adminApproveOvertime', { overtime_id, approved_hours }),
    rejectOvertime: (overtime_id, reason) => call('rejectOvertime', { overtime_id, reason }),
    getOvertimeStats: (params) => call('getOvertimeStats', params || {}),
    exportOvertimeCsv: (params) => call('exportOvertimeCsv', params || {}),

    // Leave
    submitLeave: (data) => call('submitLeave', data),
    getMyLeave: (params) => call('getMyLeave', params || {}),
    getAllLeave: (params) => call('getAllLeave', params || {}),
    adminApproveLeave: (leave_id) => call('adminApproveLeave', { leave_id }),
    rejectLeave: (leave_id, reason) => call('rejectLeave', { leave_id, reason }),
    getLeaveStats: (params) => call('getLeaveStats', params || {}),
    exportLeaveCsv: (params) => call('exportLeaveCsv', params || {}),

    // Issues
    submitIssue: (data) => call('submitIssue', data),
    getMyIssues: () => call('getMyIssues', {}),
    getAllIssues: (params) => call('getAllIssues', params || {}),
    adminReplyIssue: (issue_id, response) => call('adminReplyIssue', { issue_id, response }),
    clientReplyIssue: (issue_id, response) => call('clientReplyIssue', { issue_id, response }),
    closeIssue: (issue_id) => call('closeIssue', { issue_id }),
    getIssueStats: () => call('getIssueStats', {}),

    // IP Control (Admin)
    addAllowedIP: (ip) => call('addAllowedIP', { ip }),
    removeAllowedIP: (ip) => call('removeAllowedIP', { ip }),
    getAllowedIPList: () => call('getAllowedIPList', {}),

    // Dashboard
    getStaffDashboard: () => call('getStaffDashboard', {}),
    getAdminDashboard: () => call('getAdminDashboard', {}),
    getClientDashboard: () => call('getClientDashboard', {})
  };
})();

// ── UI 工具 ────────────────────────────────────────────────────
const UI = (() => {
  let loadingCount = 0;

  function showLoading() {
    loadingCount += 1;
    const el = document.getElementById('loading-overlay');
    if (el) el.classList.add('active');
  }

  function hideLoading() {
    loadingCount = Math.max(0, loadingCount - 1);
    const el = document.getElementById('loading-overlay');
    if (el && loadingCount === 0) el.classList.remove('active');
  }

  function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${message}</span>`;
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  function showModal(title, content, onConfirm, confirmText = '確認', cancelText = '取消') {
    const modal = document.getElementById('modal-overlay');
    if (!modal) return;
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = content;
    document.getElementById('modal-confirm').textContent = confirmText;
    document.getElementById('modal-cancel').textContent = cancelText;
    document.getElementById('modal-confirm').onclick = () => {
      hideModal();
      if (onConfirm) onConfirm();
    };
    modal.classList.add('active');
  }

  function hideModal() {
    const modal = document.getElementById('modal-overlay');
    if (modal) modal.classList.remove('active');
  }

  function statusBadge(status) {
    const label = CONFIG.STATUS_LABEL[status] || status;
    const color = CONFIG.STATUS_COLOR[status] || '#9e9e9e';
    return `<span class="badge" style="background:${color}20;color:${color};border:1px solid ${color}40">${label}</span>`;
  }

  function formatDateTime(str) {
    if (!str) return '—';
    return str.toString().substring(0, 16);
  }

  function formatDate(str) {
    if (!str) return '—';
    return str.toString().substring(0, 10);
  }

  return { showLoading, hideLoading, showToast, showModal, hideModal, statusBadge, formatDateTime, formatDate };
})();
