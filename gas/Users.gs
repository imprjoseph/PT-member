/**
 * Users.gs
 * 使用者帳號管理（Admin 專用）
 */

// ── 取得使用者列表 ─────────────────────────────────────────────
function getUsers(payload) {
  const { _user } = payload;
  const err = requireRole_(_user, ['admin']);
  if (err) return err;
  
  const users = getSheetData_('Users');
  const safeUsers = users.map(u => ({
    user_id: u.user_id,
    name: u.name,
    email: u.email,
    role: u.role,
    department: u.department,
    project: u.project,
    phone: u.phone,
    status: u.status,
    force_change_password: u.force_change_password,
    last_login_at: u.last_login_at,
    created_at: u.created_at
  }));
  
  return { success: true, users: safeUsers };
}

// ── 新增使用者 ─────────────────────────────────────────────────
function createUser(payload) {
  const { _user, name, email, init_password, role, department, project, phone } = payload;
  const err = requireRole_(_user, ['admin']);
  if (err) return err;
  
  if (!name || !email || !init_password || !role) {
    return { success: false, message: '姓名、Email、初始密碼、角色為必填' };
  }
  
  const validRoles = ['admin', 'staff', 'client'];
  if (!validRoles.includes(role)) {
    return { success: false, message: '角色設定無效' };
  }
  
  // 檢查 Email 重複
  const users = getSheetData_('Users');
  if (users.find(u => u.email === email)) {
    return { success: false, message: '此 Email 已被使用' };
  }
  
  const salt = generateSalt_();
  const hash = hashPassword_(init_password, salt);
  const userId = generateId_('U');
  const nowStr = now_();
  
  appendToSheet_('Users', {
    user_id: userId, name, email,
    password_hash: hash, password_salt: salt,
    role, department: department || '', project: project || '',
    phone: phone || '', status: 'active',
    force_change_password: 'TRUE',
    last_login_at: '', created_at: nowStr, updated_at: nowStr
  }, [
    'user_id', 'name', 'email', 'password_hash', 'password_salt',
    'role', 'department', 'project', 'phone', 'status',
    'force_change_password', 'last_login_at', 'created_at', 'updated_at'
  ]);
  
  return { success: true, message: '使用者建立成功', user_id: userId };
}

// ── 編輯使用者 ─────────────────────────────────────────────────
function updateUser(payload) {
  const { _user, user_id, name, department, project, phone, role, status } = payload;
  const err = requireRole_(_user, ['admin']);
  if (err) return err;
  
  if (!user_id) return { success: false, message: '缺少 user_id' };
  
  const updates = { updated_at: now_() };
  if (name !== undefined)       updates.name = name;
  if (department !== undefined) updates.department = department;
  if (project !== undefined)    updates.project = project;
  if (phone !== undefined)      updates.phone = phone;
  if (role !== undefined)       updates.role = role;
  if (status !== undefined)     updates.status = status;
  
  const updated = updateSheetRow_('Users', 'user_id', user_id, updates);
  if (!updated) return { success: false, message: '找不到該使用者' };
  
  return { success: true, message: '使用者資料已更新' };
}

// ── 停用帳號 ───────────────────────────────────────────────────
function disableUser(payload) {
  const { _user, user_id } = payload;
  const err = requireRole_(_user, ['admin']);
  if (err) return err;
  
  if (user_id === _user.user_id) {
    return { success: false, message: '不能停用自己的帳號' };
  }
  
  const updated = updateSheetRow_('Users', 'user_id', user_id, {
    status: 'inactive', updated_at: now_()
  });
  if (!updated) return { success: false, message: '找不到該使用者' };
  
  return { success: true, message: '帳號已停用' };
}

// ── 重設密碼 ───────────────────────────────────────────────────
function resetPassword(payload) {
  const { _user, user_id, new_password } = payload;
  const err = requireRole_(_user, ['admin']);
  if (err) return err;
  
  if (!user_id || !new_password) {
    return { success: false, message: '缺少必要參數' };
  }
  
  const newSalt = generateSalt_();
  const newHash = hashPassword_(new_password, newSalt);
  
  const updated = updateSheetRow_('Users', 'user_id', user_id, {
    password_hash: newHash,
    password_salt: newSalt,
    force_change_password: 'TRUE',
    updated_at: now_()
  });
  
  if (!updated) return { success: false, message: '找不到該使用者' };
  
  return { success: true, message: '密碼已重設，使用者下次登入需修改密碼' };
}
