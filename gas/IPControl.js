/**
 * IPControl.gs
 * 打卡 IP 白名單管理
 * 
 * 使用方式：
 * 1. 執行 getMyIP() 查詢目前 GAS server IP（非用戶端 IP，此方法不適用）
 * 2. IP 白名單寫在 Script Properties 中，key = ALLOWED_IPS，value = 逗號分隔的 IP 列表
 *    例：203.69.1.1,203.69.1.2,192.168.1.0/24
 * 3. 打卡時前端傳入 client_ip，GAS 進行比對
 * 
 * ⚠️ 注意：GAS doPost 無法直接取得用戶端真實 IP（Google 會代理）
 * 因此本系統採「前端取 IP + GAS 驗證」雙層架構：
 *   - 前端透過第三方 API 取得公網 IP
 *   - GAS 比對白名單
 *   - 此方式可防止一般使用者繞過，但無法防止技術性偽造
 *   - 如需強制確保，建議搭配 VPN 或 FIDO 實體金鑰
 */

// ── 取得白名單（從 Script Properties）─────────────────────────
function getAllowedIPs_() {
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty('ALLOWED_IPS') || '';
  return raw.split(',').map(ip => ip.trim()).filter(ip => ip.length > 0);
}

// ── 設定白名單（管理員執行一次即可）──────────────────────────
function setAllowedIPs() {
  // ★ 修改此陣列後執行本函式一次
  const IPs = [
    // '203.69.XX.XX',   // 公司固定 IP（請填入實際 IP）
    // '1.2.3.4',        // 備用 IP
  ];
  PropertiesService.getScriptProperties()
    .setProperty('ALLOWED_IPS', IPs.join(','));
  Logger.log('✅ IP 白名單已更新：' + IPs.join(', '));
  Logger.log('共 ' + IPs.length + ' 個 IP');
}

// ── 查詢目前白名單 ────────────────────────────────────────────
function showAllowedIPs() {
  const ips = getAllowedIPs_();
  Logger.log('目前白名單（' + ips.length + ' 個）：');
  ips.forEach((ip, i) => Logger.log(`  ${i+1}. ${ip}`));
  if (ips.length === 0) Logger.log('（尚未設定，打卡不限制 IP）');
}

// ── IP 驗證函式（供其他 .gs 呼叫）────────────────────────────
function checkIP_(clientIP) {
  const allowed = getAllowedIPs_();
  
  // 白名單為空 → 不限制
  if (allowed.length === 0) return { ok: true };
  
  if (!clientIP) {
    return { ok: false, message: '無法取得您的 IP 位址，請確認網路設定或聯繫管理員' };
  }
  
  // 精確比對
  if (allowed.includes(clientIP)) return { ok: true };
  
  // CIDR 範圍比對（支援 /24 等）
  for (const entry of allowed) {
    if (entry.includes('/') && ipInCIDR_(clientIP, entry)) return { ok: true };
  }
  
  return {
    ok: false,
    message: `您目前的 IP（${clientIP}）不在允許範圍內，請在公司網路環境下打卡`
  };
}

// ── CIDR 比對（支援 IPv4 /8 ~ /32）───────────────────────────
function ipInCIDR_(ip, cidr) {
  try {
    const [range, bits] = cidr.split('/');
    const mask = ~(0xffffffff >>> parseInt(bits));
    const ipNum   = ip.split('.').reduce((a,b) => (a<<8)+(+b), 0);
    const rangeNum = range.split('.').reduce((a,b) => (a<<8)+(+b), 0);
    return (ipNum & mask) === (rangeNum & mask);
  } catch(e) {
    return false;
  }
}

// ── 新增白名單 IP（Admin 呼叫）────────────────────────────────
function addAllowedIP(payload) {
  const { _user, ip } = payload;
  const err = requireRole_(_user, ['admin']);
  if (err) return err;
  if (!ip) return { success: false, message: '請提供 IP 位址' };
  
  const current = getAllowedIPs_();
  if (current.includes(ip)) return { success: false, message: `${ip} 已在白名單中` };
  
  current.push(ip);
  PropertiesService.getScriptProperties()
    .setProperty('ALLOWED_IPS', current.join(','));
  return { success: true, message: `已新增 ${ip} 至白名單`, total: current.length };
}

// ── 移除白名單 IP（Admin 呼叫）────────────────────────────────
function removeAllowedIP(payload) {
  const { _user, ip } = payload;
  const err = requireRole_(_user, ['admin']);
  if (err) return err;
  
  const current = getAllowedIPs_().filter(i => i !== ip);
  PropertiesService.getScriptProperties()
    .setProperty('ALLOWED_IPS', current.join(','));
  return { success: true, message: `已移除 ${ip}`, remaining: current };
}

// ── 查詢白名單（Admin 呼叫）───────────────────────────────────
function getAllowedIPList(payload) {
  const { _user } = payload;
  const err = requireRole_(_user, ['admin']);
  if (err) return err;
  const ips = getAllowedIPs_();
  return { success: true, ips, count: ips.length, restricted: ips.length > 0 };
}

