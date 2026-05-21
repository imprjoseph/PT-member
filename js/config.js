/**
 * config.js
 * 系統設定 - 請將 GAS Web App URL 填入後上傳
 */
const CONFIG = {
  // ★ 部署 GAS Web App 後，將 URL 填入此處
  GAS_WEB_APP_URL: 'AKfycbxuUu9GwsYI2jXI5e4fuN-bs3asJNyrliXVVA6rNCJ-mCJ1mLNn4j_hjXIqrkM2VclF',

  SYSTEM_NAME: '派遣人員勤務管理系統',
  SYSTEM_SHORT: 'imPR 派遣系統',
  TOKEN_KEY: 'dispatch_token',
  USER_KEY: 'dispatch_user',
  TOKEN_EXPIRE_HOURS: 12,

  ROLES: {
    admin: '本公司管理者',
    staff: '派遣人員',
    client: '數發部管理人員'
  },

  ROLE_HOME: {
    admin: 'admin-dashboard.html',
    staff: 'staff-dashboard.html',
    client: 'client-dashboard.html'
  },

  ATTENDANCE_TYPE: {
    normal: '一般打卡',
    remote: '遠端打卡',
    correction: '補登打卡'
  },

  OVERTIME_TYPE: {
    weekday: '平日加班',
    holiday: '假日加班',
    remote: '遠端加班',
    event_support: '活動支援加班',
    emergency: '緊急任務加班'
  },

  LEAVE_TYPE: {
    personal: '事假',
    sick: '病假',
    annual: '特休',
    official: '公假',
    menstrual: '生理假',
    funeral: '喪假',
    marriage: '婚假',
    other: '其他'
  },

  ISSUE_TYPE: {
    work_scope: '工作範圍疑義',
    overtime: '加班問題',
    workload: '工作量過大',
    communication: '溝通問題',
    equipment: '設備問題',
    schedule: '排班問題',
    other: '其他'
  },

  PRIORITY: {
    low: '低',
    medium: '中',
    high: '高',
    urgent: '緊急'
  },

  STATUS_LABEL: {
    pending: '待審核',
    approved: '已核准',
    rejected: '已退回',
    confirmed: '已確認',
    cancelled: '已取消',
    closed: '已結案',
    processing: '處理中',
    replied: '已回覆',
    open: '待處理',
    active: '啟用',
    inactive: '停用',
    normal: '正常',
    late: '遲到',
    early_leave: '早退',
    missing_clock_in: '缺上班卡',
    missing_clock_out: '缺下班卡',
    pending_review: '待審核'
  },

  STATUS_COLOR: {
    pending: '#f4b400',
    approved: '#0f9d58',
    rejected: '#db4437',
    confirmed: '#1a73e8',
    cancelled: '#9e9e9e',
    closed: '#607d8b',
    processing: '#ff6d00',
    replied: '#1a73e8',
    open: '#db4437',
    normal: '#0f9d58',
    late: '#ff6d00',
    early_leave: '#ff6d00',
    missing_clock_in: '#db4437',
    missing_clock_out: '#db4437',
    pending_review: '#f4b400'
  }
};
