/**
 * Overtime.gs — 加班申請、審核、匯出
 */

function submitOvertime(payload) {
  const { _user, overtime_date, start_time, end_time, overtime_type,
          location, reason, related_task, is_moda_requested, attachment_url } = payload;

  if (!overtime_date || !start_time || !end_time || !overtime_type || !reason) {
    return { success: false, message: '日期、時間、類型、原因為必填' };
  }

  // 計算時數
  const s = new Date(`${overtime_date} ${start_time}`);
  const e = new Date(`${overtime_date} ${end_time}`);
  if (e <= s) return { success: false, message: '結束時間需晚於開始時間' };
  const hours = ((e - s) / 3600000).toFixed(2);

  const id = generateId_('OT');
  const nowStr = now_();

  appendToSheet_('Overtime', {
    overtime_id: id, user_id: _user.user_id, name: _user.name,
    overtime_date, start_time, end_time, overtime_hours: hours,
    overtime_type, location: location||'', reason, related_task: related_task||'',
    is_moda_requested: is_moda_requested||'FALSE', attachment_url: attachment_url||'',
    client_confirm_status: 'pending', admin_approve_status: 'pending',
    approved_hours: '', final_status: 'pending',
    created_at: nowStr, updated_at: nowStr
  }, ['overtime_id','user_id','name','overtime_date','start_time','end_time',
    'overtime_hours','overtime_type','location','reason','related_task',
    'is_moda_requested','attachment_url','client_confirm_status',
    'admin_approve_status','approved_hours','final_status','created_at','updated_at']);

  return { success: true, message: '加班申請已送出', overtime_id: id, overtime_hours: hours };
}

function getMyOvertime(payload) {
  const { _user, limit } = payload;
  let records = getSheetData_('Overtime')
    .filter(r => r.user_id === _user.user_id)
    .sort((a,b) => (b.overtime_date > a.overtime_date ? 1 : -1));
  if (limit) records = records.slice(0, parseInt(limit));
  return { success: true, records };
}

function getAllOvertime(payload) {
  const { _user, status } = payload;
  const err = requireRole_(_user, ['admin','client']);
  if (err) return err;
  let records = getSheetData_('Overtime')
    .sort((a,b) => (b.overtime_date > a.overtime_date ? 1 : -1));
  if (status) records = records.filter(r => r.final_status === status);
  return { success: true, records };
}

function clientConfirmOvertime(payload) {
  const { _user, overtime_id, action } = payload; // action: confirmed | rejected
  const err = requireRole_(_user, ['client','admin']);
  if (err) return err;
  if (!['confirmed','rejected'].includes(action))
    return { success: false, message: '無效的操作' };

  const records = getSheetData_('Overtime');
  const rec = records.find(r => r.overtime_id === overtime_id);
  if (!rec) return { success: false, message: '找不到該筆加班記錄' };

  const newFinal = (action === 'confirmed' && rec.admin_approve_status === 'approved')
    ? 'approved' : rec.final_status;

  updateSheetRow_('Overtime', 'overtime_id', overtime_id, {
    client_confirm_status: action,
    final_status: newFinal,
    updated_at: now_()
  });
  return { success: true, message: action === 'confirmed' ? '已確認' : '已退回' };
}

function adminApproveOvertime(payload) {
  const { _user, overtime_id, approved_hours } = payload;
  const err = requireRole_(_user, ['admin']);
  if (err) return err;

  const records = getSheetData_('Overtime');
  const rec = records.find(r => r.overtime_id === overtime_id);
  if (!rec) return { success: false, message: '找不到該筆加班記錄' };

  const finalStatus = rec.client_confirm_status === 'confirmed' ? 'approved' : 'approved';

  updateSheetRow_('Overtime', 'overtime_id', overtime_id, {
    admin_approve_status: 'approved',
    approved_hours: approved_hours || rec.overtime_hours,
    final_status: finalStatus,
    updated_at: now_()
  });
  return { success: true, message: '加班已核准' };
}

function rejectOvertime(payload) {
  const { _user, overtime_id } = payload;
  const err = requireRole_(_user, ['admin']);
  if (err) return err;
  const updated = updateSheetRow_('Overtime', 'overtime_id', overtime_id, {
    admin_approve_status: 'rejected', final_status: 'rejected', updated_at: now_()
  });
  if (!updated) return { success: false, message: '找不到該筆記錄' };
  return { success: true, message: '加班申請已退回' };
}

function getOvertimeStats(payload) {
  const { _user } = payload;
  const thisMonth = today_().substring(0,7);
  let records = getSheetData_('Overtime')
    .filter(r => r.overtime_date && r.overtime_date.toString().startsWith(thisMonth));
  if (_user.role === 'staff')
    records = records.filter(r => r.user_id === _user.user_id);
  const approved = records.filter(r => r.final_status === 'approved');
  const totalHours = approved.reduce((s,r) => s+(parseFloat(r.approved_hours||r.overtime_hours)||0), 0);
  return { success: true, month_count: records.length, month_approved_hours: totalHours.toFixed(1), pending_count: records.filter(r=>r.final_status==='pending').length };
}

function exportOvertimeCsv(payload) {
  const { _user, start_date, end_date } = payload;
  const err = requireRole_(_user, ['admin']);
  if (err) return err;
  let records = getSheetData_('Overtime');
  if (start_date) records = records.filter(r => r.overtime_date >= start_date);
  if (end_date)   records = records.filter(r => r.overtime_date <= end_date);
  const headers = ['日期','姓名','開始','結束','時數','類型','地點','原因','數發部確認','管理者核准','核定時數','最終狀態'];
  const rows = records.map(r => [r.overtime_date, r.name, r.start_time, r.end_time,
    r.overtime_hours, r.overtime_type, r.location, r.reason,
    r.client_confirm_status, r.admin_approve_status, r.approved_hours, r.final_status]);
  const csv = [headers,...rows].map(row=>row.map(c=>`"${String(c||'').replace(/"/g,'""')}"`).join(',')).join('\n');
  return { success: true, csv: '\uFEFF'+csv };
}
