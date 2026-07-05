function resetAdminPasswordManually() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const emailCol = headers.indexOf('email');
  const hashCol  = headers.indexOf('password_hash');
  const saltCol  = headers.indexOf('password_salt');
  const forceCol = headers.indexOf('force_change_password');

  const targetEmail = 'admin@impr.com.tw';
  const newPassword = 'Impr@2025';

  for (let i = 1; i < data.length; i++) {
    if (data[i][emailCol] === targetEmail) {
      const salt = generateSalt_();
      const hash = hashPassword_(newPassword, salt);
      sheet.getRange(i + 1, hashCol + 1).setValue(hash);
      sheet.getRange(i + 1, saltCol + 1).setValue(salt);
      sheet.getRange(i + 1, forceCol + 1).setValue('FALSE');
      Logger.log('✅ 重設成功：' + targetEmail);
      return;
    }
  }
  Logger.log('❌ 找不到帳號');
}
