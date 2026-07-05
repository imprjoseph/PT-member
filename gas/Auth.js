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
  const user = users.find(u =>
    u.email && u.email.toString().toLowerCase() === email.toLowerCase()
  );

  if (!user) return { success: false, message: '帳號或密碼錯誤' };
  if (user.status !== 'active') return { success: false, message: '此帳號已停用，請聯繫管理員' };

  const inputHash = hashPassword_(password, user.password_salt);
  if (inputHash !== user.password_hash) return { success: false, message: '帳號或密碼錯誤' };

  // 建立 token，同時把最新的 user_id 存入 session
  const token = generateId_('TK');
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 12);
  const expiresAtStr = Utilities.formatDate(expiresAt, 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');

  appendToSheet_('Sessions', {
    token,
    user_id: user.user_id,  // 永遠存最新的 user_id
    email: user.email,
    role: user.role,
    created_at: now_(),
    expires_at: expiresAtStr,
    status: 'active'
  }, ['token', 'user_id', 'email', 'role', 'created_at', 'expires_at', 'status']);

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
  updateSheetRow_('Sessions', 'token', token, { status: 'expired' });
  return { success: true, message: '已登出' };
}

// ── 驗證 Token ─────────────────────────────────────────────────
// 關鍵修正：不直接用 Sessions 表存的 user_id，
// 而是用 email 重新查 Users 表取得最新的 user_id，
// 避免帳號被重建後 session 裡的 user_id 已過時。
function verifyToken(token) {
  if (!token) {
    return { success: false, message: '未提供 token，請重新登入' };
  }

  const sessions = getSheetData_('Sessions');
  const session = sessions.find(s => s.token === token && s.status === 'active');

  if (!session) {
    return { success: false, message: 'Token 無效或已過期，請重新登入' };
  }

  // 檢查是否過期
  const now = new Date();
  const expires = new Date(session.expires_at);
  if (now > expires) {
    updateSheetRow_('Sessions', 'token', token, { status: 'expired' });
    return { success: false, message: 'Token 已過期，請重新登入' };
  }

  // ★ 關鍵：用 email 重新查 Users 表，取得最新的 user_id
  // 不使用 session.user_id，避免帳號重建後 ID 不一致的問題
  const users = getSheetData_('Users');
  const user = users.find(u =>
    u.email && u.email.toString().toLowerCase() === session.email.toString().toLowerCase()
  );

  if (!user || user.status !== 'active') {
    return { success: false, message: '帳號不存在或已停用' };
  }

  // 若 session 裡的 user_id 已過時，自動更新
  if (session.user_id !== user.user_id) {
    updateSheetRow_('Sessions', 'token', token, { user_id: user.user_id });
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

  if (!user) return { success: false, message: '找不到使用者' };

  const oldHash = hashPassword_(old_password, user.password_salt);
  if (oldHash !== user.password_hash) {
    return { success: false, message: '舊密碼錯誤' };
  }

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
