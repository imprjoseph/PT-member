/**
 * Issues.gs — 問題反映、回覆、結案
 */

function submitIssue(payload) {
  const { _user, issue_date, issue_type, description, priority, need_client_response } = payload;
  if (!issue_type || !description)
    return { success: false, message: '問題類型與說明為必填' };

  const id = generateId_('IS');
  const nowStr = now_();
  appendToSheet_('Issues', {
    issue_id: id, user_id: _user.user_id, name: _user.name,
    issue_date: issue_date || today_(), issue_type, description,
    priority: priority||'medium',
    need_client_response: need_client_response||'FALSE',
    admin_response: '', client_response: '',
    status: 'open', created_at: nowStr, updated_at: nowStr
  }, ['issue_id','user_id','name','issue_date','issue_type','description',
    'priority','need_client_response','admin_response','client_response',
    'status','created_at','updated_at']);
  return { success: true, message: '問題已提交', issue_id: id };
}

function getMyIssues(payload) {
  const { _user } = payload;
  const records = getSheetData_('Issues')
    .filter(r => r.user_id === _user.user_id)
    .sort((a,b) => (b.created_at > a.created_at ? 1 : -1));
  return { success: true, records };
}

function getAllIssues(payload) {
  const { _user, status } = payload;
  const err = requireRole_(_user, ['admin','client']);
  if (err) return err;
  let records = getSheetData_('Issues')
    .sort((a,b) => (b.created_at > a.created_at ? 1 : -1));
  if (status) records = records.filter(r => r.status === status);
  return { success: true, records };
}

function adminReplyIssue(payload) {
  const { _user, issue_id, response } = payload;
  const err = requireRole_(_user, ['admin']);
  if (err) return err;
  if (!response) return { success: false, message: '請輸入回覆內容' };
  const updated = updateSheetRow_('Issues', 'issue_id', issue_id, {
    admin_response: response, status: 'replied', updated_at: now_()
  });
  if (!updated) return { success: false, message: '找不到該筆記錄' };
  return { success: true, message: '已回覆' };
}

function clientReplyIssue(payload) {
  const { _user, issue_id, response } = payload;
  const err = requireRole_(_user, ['client','admin']);
  if (err) return err;
  if (!response) return { success: false, message: '請輸入回覆內容' };
  const updated = updateSheetRow_('Issues', 'issue_id', issue_id, {
    client_response: response, status: 'replied', updated_at: now_()
  });
  if (!updated) return { success: false, message: '找不到該筆記錄' };
  return { success: true, message: '已回覆' };
}

function closeIssue(payload) {
  const { _user, issue_id } = payload;
  const err = requireRole_(_user, ['admin']);
  if (err) return err;
  const updated = updateSheetRow_('Issues', 'issue_id', issue_id, {
    status: 'closed', updated_at: now_()
  });
  if (!updated) return { success: false, message: '找不到該筆記錄' };
  return { success: true, message: '問題已結案' };
}

function getIssueStats(payload) {
  const { _user } = payload;
  let records = getSheetData_('Issues');
  if (_user.role === 'staff') records = records.filter(r => r.user_id === _user.user_id);
  return {
    success: true,
    open: records.filter(r => r.status === 'open').length,
    processing: records.filter(r => r.status === 'processing').length,
    replied: records.filter(r => r.status === 'replied').length,
    closed: records.filter(r => r.status === 'closed').length,
    total: records.length
  };
}
