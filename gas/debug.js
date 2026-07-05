function debugVerifyToken() {
  // 直接模擬 verifyToken 流程，看 _user.user_id 是什麼
  const sessions = getSheetData_('Sessions');
  Logger.log('Sessions 總數: ' + sessions.length);
  
  // 找最新的 active session
  const active = sessions.filter(s => s.status === 'active');
  Logger.log('Active sessions: ' + active.length);
  
  active.forEach((s, i) => {
    Logger.log('Session ' + i + ': user_id=[' + s.user_id + '] email=' + s.email + ' role=' + s.role);
  });
  
  // 確認 Users 表的 U002
  const users = getSheetData_('Users');
  const u002 = users.find(u => u.email === 'joseph@impr.com.tw');
  if (u002) {
    Logger.log('Users 表中 joseph: user_id=[' + u002.user_id + '] 類型: ' + typeof u002.user_id);
  }
  
  // 確認 Attendance 表的 U002 記錄
  const attendance = getSheetData_('Attendance');
  const today = today_();
  const todayRecs = attendance.filter(r => toDateStr_(r.date) === today);
  Logger.log('今天出勤記錄數: ' + todayRecs.length);
  todayRecs.forEach(r => {
    Logger.log('Attendance user_id=[' + r.user_id + '] 類型: ' + typeof r.user_id);
  });
}