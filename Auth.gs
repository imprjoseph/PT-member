/**
 * Auth.gs
 * 登入、登出、Token 驗證、修改密碼
 */

// ── 登入 ───────────────────────────────────────────────────────
function login(payload) {
  const { email, password } = payload;
  
  if (!email || !password) {
    return { success: false, message: '請輸入帳號與密碼' };
  }
  
  const users = getSheetData_('Users');
  const user = users.find(u => u.email === email);
  
  if (!user) {
    return { success: false, message: '帳號或密碼錯誤' };
  }
  
  if (user.status !== 'active') {
    return { success: false, message: '此帳號已停用，請聯繫管理員' };
  }
  
  const inputHash = hashPassword_(password, user.password_salt);
  if (inputHash !== user.password_hash) {
    return { success: false, message: '帳號或密碼錯誤' };
  }
  
  // 建立 token
  const token = generateId_('TK');
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 12); // 12 小時有效
  const expiresAtStr = Utilities.formatDate(expiresAt, 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
  
  // 寫入 Sessions
  appendToSheet_('Sessions', {
    token, user_id: user.user_id, email: user.email,
    role: user.role, created_at: now_(), expires_at: expiresAtStr, status: 'active'
  }, ['token', 'user_id', 'email', 'role', 'created_at', 'expires_at', 'status']);
  
  // 更新 last_login_at
  updateSheetRow_('Users', 'user_id', user.user_id, { last_login_at: now_() });
  
  return {
    success: true,
    token,
    force_change_password: user.force_change_password === true || user.force_change_password === 'TRUE',
    user: {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      project: user.project,
      phone: user.phone
    }
  };
}

// ── 登出 ───────────────────────────────────────────────────────
function logout(token) {
  const updated = updateSheetRow_('Sessions', 'token', token, { status: 'expired' });
  return { success: true, message: '已登出' };
}

// ── 驗證 Token ─────────────────────────────────────────────────
function verifyToken(token) {
  if (!token) {
    return { success: false, message: '未提供 token，請重新登入' };
  }
  
  const sessions = getSheetData_('Sessions');
  const session = sessions.find(s => s.token === token && s.status === 'active');
  
  if (!session) {
    return { success: false, message: 'Token 無效或已過期，請重新登入' };
  }
  
  const now = new Date();
  const expires = new Date(session.expires_at);
  if (now > expires) {
    updateSheetRow_('Sessions', 'token', token, { status: 'expired' });
    return { success: false, message: 'Token 已過期，請重新登入' };
  }
  
  // 取得用戶資訊
  const users = getSheetData_('Users');
  const user = users.find(u => u.user_id === session.user_id);
  
  if (!user || user.status !== 'active') {
    return { success: false, message: '帳號已停用' };
  }
  
  return {
    success: true,
    user: {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      project: user.project,
      phone: user.phone
    }
  };
}

// ── 修改密碼 ───────────────────────────────────────────────────
function changePassword(payload) {
  const { old_password, new_password, _user } = payload;
  
  if (!old_password || !new_password) {
    return { success: false, message: '請輸入舊密碼與新密碼' };
  }
  
  if (new_password.length < 8) {
    return { success: false, message: '新密碼長度至少 8 碼' };
  }
  
  if (!/[A-Za-z]/.test(new_password) || !/[0-9]/.test(new_password)) {
    return { success: false, message: '新密碼需包含英文與數字' };
  }
  
  const users = getSheetData_('Users');
  const user = users.find(u => u.user_id === _user.user_id);
  
  if (!user) {
    return { success: false, message: '找不到使用者' };
  }
  
  // 驗證舊密碼
  const oldHash = hashPassword_(old_password, user.password_salt);
  if (oldHash !== user.password_hash) {
    return { success: false, message: '舊密碼錯誤' };
  }
  
  // 產生新 hash
  const newSalt = generateSalt_();
  const newHash = hashPassword_(new_password, newSalt);
  
  updateSheetRow_('Users', 'user_id', user.user_id, {
    password_hash: newHash,
    password_salt: newSalt,
    force_change_password: 'FALSE',
    updated_at: now_()
  });
  
  return { success: true, message: '密碼修改成功' };
}
