/**
 * BatchResetPasswords.gs
 * 批次重設指定帳號密碼
 * 用完可刪除此檔案
 */
function batchResetPasswords() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const emailCol = headers.indexOf('email');
  const hashCol  = headers.indexOf('password_hash');
  const saltCol  = headers.indexOf('password_salt');
  const forceCol = headers.indexOf('force_change_password');

  // ★ 要重設的帳號與新密碼
  const targets = [
    { email: '850088@moda.gov.tw',  password: 'Moda@2025' },
    { email: 'esther33@moda.gov.tw', password: 'Moda@2025' },
    { email: 'Twy@moda.gov.tw',      password: 'Moda@2025' },
  ];

  let count = 0;
  for (let i = 1; i < data.length; i++) {
    const rowEmail = data[i][emailCol];
    const target = targets.find(t => t.email.toLowerCase() === String(rowEmail).toLowerCase());
    if (target) {
      const salt = generateSalt_();
      const hash = hashPassword_(target.password, salt);
      sheet.getRange(i + 1, hashCol + 1).setValue(hash);
      sheet.getRange(i + 1, saltCol + 1).setValue(salt);
      sheet.getRange(i + 1, forceCol + 1).setValue('FALSE');
      Logger.log('✅ 已重設：' + target.email + ' → ' + target.password);
      count++;
    }
  }
  Logger.log('完成，共重設 ' + count + ' 個帳號');
}