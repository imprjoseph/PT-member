/**
 * auth.js
 * 登入狀態管理 - Token 存取、角色守衛、自動跳轉
 */
const AUTH = (() => {
  function getToken() {
    return localStorage.getItem(CONFIG.TOKEN_KEY) || '';
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(CONFIG.USER_KEY)) || null;
    } catch {
      return null;
    }
  }

  function setSession(token, user) {
    localStorage.setItem(CONFIG.TOKEN_KEY, token);
    localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
  }

  function logout() {
    localStorage.removeItem(CONFIG.TOKEN_KEY);
    localStorage.removeItem(CONFIG.USER_KEY);
    window.location.href = 'login.html';
  }

  /**
   * 頁面守衛：在需要登入的頁面頂部呼叫
   * @param {string[]} allowedRoles 允許的角色，空陣列 = 所有已登入者
   */
  async function guard(allowedRoles = []) {
    const token = getToken();
    if (!token) {
      window.location.href = 'login.html';
      return null;
    }

    const result = await API.verifyToken();
    if (!result.success) {
      logout();
      return null;
    }

    const user = result.user;

    // 更新本地用戶快取
    const storedUser = getUser();
    if (storedUser) {
      setSession(token, { ...storedUser, ...user });
    }

    // 角色檢查
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      const home = CONFIG.ROLE_HOME[user.role] || 'login.html';
      window.location.href = home;
      return null;
    }

    return user;
  }

  /**
   * 登入頁面守衛：若已登入則跳至首頁
   */
  async function guardLoginPage() {
    const token = getToken();
    if (!token) return;

    const result = await API.verifyToken();
    if (result.success) {
      const home = CONFIG.ROLE_HOME[result.user.role] || 'login.html';
      window.location.href = home;
    }
  }

  return { getToken, getUser, setSession, logout, guard, guardLoginPage };
})();
