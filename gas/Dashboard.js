/**
 * Dashboard.gs
 * 三種角色的儀表板資料
 */

function getStaffDashboard(payload) {
  const { _user } = payload;
  const today = today_();
  const thisMonth = today.substring(0, 7);

  const attendance = mergeAttendanceList_(getSheetData_('Attendance'));
  const todayRec = attendance.find(r =>
    r.user_id === _user.user_id && toDateStr_(r.date) === today);
  const monthAtt = attendance.filter(r =>
    r.user_id === _user.user_id && toDateStr_(r.date).startsWith(thisMonth));

  const reports = getSheetData_('WorkReports');
  const todayReport = reports.find(r => r.user_id === _user.user_id && r.report_date === today);

  const overtime = getSheetData_('Overtime')
    .filter(r => r.user_id === _user.user_id && r.overtime_date && r.overtime_date.toString().startsWith(thisMonth));
  const monthOtHours = overtime.reduce((s, r) => s + (parseFloat(r.approved_hours || r.overtime_hours) || 0), 0);

  const leave = getSheetData_('LeaveRequests')
    .filter(r => r.user_id === _user.user_id && r.start_time && r.start_time.toString().startsWith(thisMonth));
  const monthLeaveHours = leave.reduce((s, r) => s + (parseFloat(r.leave_hours) || 0), 0);

  const issues = getSheetData_('Issues')
    .filter(r => r.user_id === _user.user_id && r.status !== 'closed');

  return {
    success: true,
    today,
    today_attendance: todayRec ? {
      clock_in_time: toDateTimeStr_(todayRec.clock_in_time),
      clock_out_time: toDateTimeStr_(todayRec.clock_out_time),
      attendance_type: todayRec.attendance_type,
      work_hours: todayRec.work_hours
    } : null,
    today_report_submitted: !!todayReport,
    month_attendance_days: monthAtt.filter(r => r.clock_in_time).length,
    month_overtime_hours: monthOtHours.toFixed(1),
    month_leave_hours: monthLeaveHours.toFixed(1),
    open_issues: issues.length
  };
}

function getAdminDashboard(payload) {
  const { _user } = payload;
  const err = requireRole_(_user, ['admin']);
  if (err) return err;

  const today = today_();
  const thisMonth = today.substring(0, 7);

  const users = getSheetData_('Users').filter(r => r.role === 'staff' && r.status === 'active');
  const attendance = mergeAttendanceList_(getSheetData_('Attendance'));
  const todayAtt = attendance.filter(r => toDateStr_(r.date) === today);

  const reports = getSheetData_('WorkReports');
  const todayReportUsers = new Set(reports.filter(r => r.report_date === today).map(r => r.user_id));
  const noReportToday = users.filter(r => !todayReportUsers.has(r.user_id)).length;

  const overtime = getSheetData_('Overtime');
  const pendingOt = overtime.filter(r => r.final_status === 'pending').length;

  const leave = getSheetData_('LeaveRequests');
  const pendingLeave = leave.filter(r => r.final_status === 'pending').length;

  const issues = getSheetData_('Issues');
  const openIssues = issues.filter(r => r.status === 'open' || r.status === 'processing').length;

  const monthOt = overtime.filter(r => r.overtime_date && r.overtime_date.toString().startsWith(thisMonth) && r.final_status === 'approved');
  const totalOtHours = monthOt.reduce((s,r) => s + (parseFloat(r.approved_hours)||0), 0);

  return {
    success: true,
    today,
    total_staff: users.length,
    today_clocked_in: todayAtt.filter(r => r.clock_in_time).length,
    today_clocked_out: todayAtt.filter(r => r.clock_out_time).length,
    today_no_report: noReportToday,
    pending_overtime: pendingOt,
    pending_leave: pendingLeave,
    open_issues: openIssues,
    month_total_ot_hours: totalOtHours.toFixed(1)
  };
}

function getClientDashboard(payload) {
  const { _user } = payload;
  const err = requireRole_(_user, ['client']);
  if (err) return err;

  const today = today_();
  const thisMonth = today.substring(0, 7);

  const users = getSheetData_('Users').filter(r => r.role === 'staff' && r.status === 'active');
  const attendance = mergeAttendanceList_(getSheetData_('Attendance'));
  const todayAtt = attendance.filter(r => toDateStr_(r.date) === today);

  const reports = getSheetData_('WorkReports');
  const todayReports = reports.filter(r => r.report_date === today);

  const overtime = getSheetData_('Overtime');
  const pendingConfirm = overtime.filter(r => r.client_confirm_status === 'pending').length;

  const issues = getSheetData_('Issues');
  const needReply = issues.filter(r =>
    (r.need_client_response === 'TRUE' || r.need_client_response === true) &&
    r.status !== 'closed').length;

  return {
    success: true,
    today,
    total_staff: users.length,
    today_clocked_in: todayAtt.filter(r => r.clock_in_time).length,
    today_reports: todayReports.length,
    pending_ot_confirm: pendingConfirm,
    issues_need_reply: needReply
  };
}
