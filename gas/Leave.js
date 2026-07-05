/**
 * Leave.gs — 請假申請、審核、匯出
 */

function submitLeave(payload) {
  const { _user, leave_type, start_time, end_time, reason, attachment_url } = payload;
  if (!leave_type || !start_time || !end_time || !reason)
    return { success: false, message: '假別、時間、原因為必填' };

  const s = new Date(start_time), e = new Date(end_time);
  if (e <= s) return { success: false, message: '結束時間需晚於開始時間' };
  const hours = ((e - s) / 3600000).toFixed(2);

  const id = generateId_('LV');
  const nowStr = now_();
  appendToSheet_('LeaveRequests', {
    leave_id: id, user_id: _user.user_id, name: _user.name,
    leave_type, start_time, end_time, leave_hours: hours, reason,
    attachment_url: attachment_url||'',
    admin_approve_status: 'pending', client_notify_status: 'pending',
    final_status: 'pending', created_at: nowStr, updated_at: nowStr
  }, ['leave_id','user_id','name','leave_type','start_time','end_time',
    'leave_hours','reason','attachment_url','admin_approve_status',
    'client_notify_status','final_status','created_at','updated_at']);
  return { success: true, message: '請假申請已送出', leave_id: id, leave_hours: hours };
}

function getMyLeave(payload) {
  const { _user, limit } = payload;
  let records = getSheetData_('LeaveRequests')
    .filter(r => r.user_id === _user.user_id)
    .sort((a,b) => (b.start_time > a.start_time ? 1 : -1));
  if (limit) records = records.slice(0, parseInt(limit));
  return { success: true, records };
}

function getAllLeave(payload) {
  const { _user, status } = payload;
  const err = requireRole_(_user, ['admin']);
  if (err) return err;
  let records = getSheetData_('LeaveRequests')
    .sort((a,b) => (b.start_time > a.start_time ? 1 : -1));
  if (status) records = records.filter(r => r.final_status === status);
  return { success: true, records };
}

function adminApproveLeave(payload) {
  const { _user, leave_id } = payload;
  const err = requireRole_(_user, ['admin']);
  if (err) return err;
  const updated = updateSheetRow_('LeaveRequests', 'leave_id', leave_id, {
    admin_approve_status: 'approved', client_notify_status: 'confirmed',
    final_status: 'approved', updated_at: now_()
  });
  if (!updated) return { success: false, message: '找不到該筆記錄' };
  return { success: true, message: '請假已核准' };
}

function rejectLeave(payload) {
  const { _user, leave_id } = payload;
  const err = requireRole_(_user, ['admin']);
  if (err) return err;
  const updated = updateSheetRow_('LeaveRequests', 'leave_id', leave_id, {
    admin_approve_status: 'rejected', final_status: 'rejected', updated_at: now_()
  });
  if (!updated) return { success: false, message: '找不到該筆記錄' };
  return { success: true, message: '請假申請已退回' };
}

function getLeaveStats(payload) {
  const { _user } = payload;
  const thisMonth = today_().substring(0,7);
  let records = getSheetData_('LeaveRequests')
    .filter(r => r.start_time && r.start_time.toString().startsWith(thisMonth));
  if (_user.role === 'staff') records = records.filter(r => r.user_id === _user.user_id);
  const approved = records.filter(r => r.final_status === 'approved');
  const totalHours = approved.reduce((s,r) => s+(parseFloat(r.leave_hours)||0), 0);
  return { success: true, month_count: records.length, month_approved_hours: totalHours.toFixed(1), pending_count: records.filter(r=>r.final_status==='pending').length };
}

function exportLeaveCsv(payload) {
  const { _user, start_date, end_date } = payload;
  const err = requireRole_(_user, ['admin']);
  if (err) return err;
  let records = getSheetData_('LeaveRequests');
  if (start_date) records = records.filter(r => r.start_time >= start_date);
  if (end_date)   records = records.filter(r => r.start_time <= end_date + ' 23:59');
  const headers = ['姓名','假別','開始時間','結束時間','時數','原因','管理者審核','最終狀態'];
  const rows = records.map(r => [r.name, r.leave_type, r.start_time, r.end_time, r.leave_hours, r.reason, r.admin_approve_status, r.final_status]);
  const csv = [headers,...rows].map(row=>row.map(c=>`"${String(c||'').replace(/"/g,'""')}"`).join(',')).join('\n');
  return { success: true, csv: '\uFEFF'+csv };
}

