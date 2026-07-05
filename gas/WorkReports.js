/**
 * WorkReports.gs
 * 每日/每週工作回報
 */

function submitWorkReport(payload) {
  const { _user, report_date, work_location, completed_tasks,
          ongoing_tasks, pending_items, support_unit, need_assistance, issue_flag } = payload;

  if (!report_date || !completed_tasks) {
    return { success: false, message: '日期與今日完成事項為必填' };
  }

  // 同一天同一人只能一份（可更新）
  const sheet = getSheet_('WorkReports');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const userIdCol = headers.indexOf('user_id');
  const dateCol   = headers.indexOf('report_date');
  const nowStr    = now_();

  for (let i = 1; i < data.length; i++) {
    if (data[i][userIdCol] == _user.user_id && data[i][dateCol] == report_date) {
      // 更新既有回報
      const updates = { completed_tasks, ongoing_tasks: ongoing_tasks||'',
        pending_items: pending_items||'', support_unit: support_unit||'',
        need_assistance: need_assistance||'FALSE',
        issue_flag: issue_flag||'FALSE', updated_at: nowStr };
      Object.keys(updates).forEach(key => {
        const col = headers.indexOf(key);
        if (col !== -1) sheet.getRange(i+1, col+1).setValue(updates[key]);
      });
      return { success: true, message: '工作回報已更新' };
    }
  }

  // 新增
  const id = generateId_('WR');
  appendToSheet_('WorkReports', {
    report_id: id, user_id: _user.user_id, name: _user.name,
    report_date, work_location: work_location||'',
    completed_tasks, ongoing_tasks: ongoing_tasks||'',
    pending_items: pending_items||'', support_unit: support_unit||'',
    need_assistance: need_assistance||'FALSE',
    issue_flag: issue_flag||'FALSE',
    submitted_at: nowStr, updated_at: nowStr
  }, ['report_id','user_id','name','report_date','work_location',
    'completed_tasks','ongoing_tasks','pending_items',
    'support_unit','need_assistance','issue_flag','submitted_at','updated_at']);

  return { success: true, message: '工作回報已提交', report_id: id };
}

function getMyWorkReports(payload) {
  const { _user, limit } = payload;
  let records = getSheetData_('WorkReports')
    .filter(r => r.user_id === _user.user_id)
    .sort((a,b) => (b.report_date > a.report_date ? 1 : -1));
  if (limit) records = records.slice(0, parseInt(limit));
  return { success: true, reports: records };
}

function getAllWorkReports(payload) {
  const { _user, start_date, end_date, user_id } = payload;
  const err = requireRole_(_user, ['admin','client']);
  if (err) return err;

  let records = getSheetData_('WorkReports');
  if (user_id)    records = records.filter(r => r.user_id === user_id);
  if (start_date) records = records.filter(r => r.report_date >= start_date);
  if (end_date)   records = records.filter(r => r.report_date <= end_date);
  records.sort((a,b) => (b.report_date > a.report_date ? 1 : -1));
  return { success: true, reports: records };
}

function getWorkReportStats(payload) {
  const { _user } = payload;
  const thisMonth = today_().substring(0, 7);
  let records = getSheetData_('WorkReports')
    .filter(r => r.report_date && r.report_date.toString().startsWith(thisMonth));

  if (_user.role === 'staff') {
    records = records.filter(r => r.user_id === _user.user_id);
  }

  return {
    success: true,
    this_month_count: records.length,
    issue_count: records.filter(r => r.issue_flag === 'TRUE' || r.issue_flag === true).length
  };
}

