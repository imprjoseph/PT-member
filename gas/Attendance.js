/**
 * Attendance.gs
 * 打卡、出勤查詢、CSV 匯出
 *
 * 關鍵設計：所有從 Sheets 讀出的日期/時間值，
 * 統一用 toDateStr_() / toDateTimeStr_() 轉換，
 * 不管 Sheets 存的是 Date 物件還是字串都能正確處理。
 */

// ── 上班打卡 ───────────────────────────────────────────────────
function clockIn(payload) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    return { success: false, message: '系統忙碌中，請稍後再試' };
  }

  try {
  const { _user, location, lat, lng, note, client_ip } = payload;
  const today = today_();

  const ipResult = verifyOrBindIP_(_user.user_id, client_ip);
  if (!ipResult.ok) return { success: false, message: ipResult.message };

  // 用 toDateStr_() 比對，不管 Sheets 存的是什麼格式
  const records = getSheetData_('Attendance');
  const existing = records.find(r =>
    r.user_id === _user.user_id &&
    toDateStr_(r.date) === today &&
    r.clock_in_time !== ''
  );
  if (existing) {
    return {
      success: true,
      already_recorded: true,
      message: '今日已完成上班打卡',
      record: mergeAttendanceRows_([existing])
    };
  }

  const id = generateId_('AT');
  const nowStr = now_();

  appendToSheet_('Attendance', {
    attendance_id: id,
    user_id: _user.user_id,
    name: _user.name,
    date: today,
    clock_in_time: nowStr,
    clock_out_time: '',
    clock_in_location: location || '辦公室',
    clock_out_location: '',
    clock_in_lat: lat || '',
    clock_in_lng: lng || '',
    clock_out_lat: '',
    clock_out_lng: '',
    attendance_type: 'normal',
    work_hours: '',
    status: 'normal',
    note: note || '',
    created_at: nowStr,
    updated_at: nowStr
  }, [
    'attendance_id','user_id','name','date',
    'clock_in_time','clock_out_time',
    'clock_in_location','clock_out_location',
    'clock_in_lat','clock_in_lng','clock_out_lat','clock_out_lng',
    'attendance_type','work_hours','status','note',
    'created_at','updated_at'
  ]);

  return {
    success: true,
    message: ipResult.justBound
      ? '上班打卡成功，已將此處設為您的辦公室位置'
      : '上班打卡成功',
    time: nowStr
  };
  } finally {
    lock.releaseLock();
  }
}

// ── 下班打卡 ───────────────────────────────────────────────────
function clockOut(payload) {
  const { _user, location, lat, lng, note, client_ip } = payload;
  const today = today_();
  const nowStr = now_();

  const ipResult = verifyOrBindIP_(_user.user_id, client_ip);
  if (!ipResult.ok) return { success: false, message: ipResult.message };

  const sheet = getSheet_('Attendance');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const userIdCol = headers.indexOf('user_id');
  const dateCol   = headers.indexOf('date');
  const inCol     = headers.indexOf('clock_in_time');
  const outCol    = headers.indexOf('clock_out_time');
  const locInCol  = headers.indexOf('clock_in_location');

  for (let i = 1; i < data.length; i++) {
    if (data[i][userIdCol] == _user.user_id &&
        toDateStr_(data[i][dateCol]) === today) {

      if (!data[i][inCol]) return { success: false, message: '尚未打上班卡' };
      if (data[i][outCol]) return { success: false, message: '今日已打過下班卡' };

      // 計算工時：統一轉成台北時間字串再計算
      const inStr  = toDateTimeStr_(data[i][inCol]);
      const inTime = new Date(inStr.replace(' ', 'T') + '+08:00');
      const outTime = new Date(nowStr.replace(' ', 'T') + '+08:00');
      const hours  = ((outTime - inTime) / 3600000).toFixed(2);
      const finalLocation = location || data[i][locInCol] || '辦公室';

      const updates = {
        clock_out_time: nowStr,
        clock_out_location: finalLocation,
        clock_out_lat: lat || '',
        clock_out_lng: lng || '',
        work_hours: hours,
        updated_at: nowStr
      };
      Object.keys(updates).forEach(key => {
        const col = headers.indexOf(key);
        if (col !== -1) sheet.getRange(i + 1, col + 1).setValue(updates[key]);
      });

      return { success: true, message: '下班打卡成功', time: nowStr, work_hours: hours };
    }
  }
  return { success: false, message: '找不到今日出勤記錄，請先打上班卡' };
}

// ── 遠端打卡（不受 IP 限制）───────────────────────────────────
function remoteClock(payload) {
  const { _user, type, location, lat, lng, note } = payload;
  const today = today_();
  const nowStr = now_();
  const finalLocation = location || '遠端辦公';

  if (type === 'in') {
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(5000)) {
      return { success: false, message: '系統忙碌中，請稍後再試' };
    }
    try {
    const records = getSheetData_('Attendance');
    const existing = records.find(r =>
      r.user_id === _user.user_id &&
      toDateStr_(r.date) === today &&
      r.clock_in_time !== ''
    );
    if (existing) {
      return {
        success: true,
        already_recorded: true,
        message: '今日已完成上班打卡',
        record: mergeAttendanceRows_([existing])
      };
    }

    const id = generateId_('AT');
    appendToSheet_('Attendance', {
      attendance_id: id, user_id: _user.user_id, name: _user.name,
      date: today, clock_in_time: nowStr, clock_out_time: '',
      clock_in_location: finalLocation, clock_out_location: '',
      clock_in_lat: lat || '', clock_in_lng: lng || '',
      clock_out_lat: '', clock_out_lng: '',
      attendance_type: 'remote', work_hours: '', status: 'normal',
      note: note || '', created_at: nowStr, updated_at: nowStr
    }, [
      'attendance_id','user_id','name','date',
      'clock_in_time','clock_out_time','clock_in_location','clock_out_location',
      'clock_in_lat','clock_in_lng','clock_out_lat','clock_out_lng',
      'attendance_type','work_hours','status','note','created_at','updated_at'
    ]);
    return { success: true, message: '遠端上班打卡成功', time: nowStr };
    } finally {
      lock.releaseLock();
    }
  } else {
    return clockOut({ _user, location: finalLocation, lat, lng, note, client_ip: null });
  }
}

// ── IP 綁定邏輯 ────────────────────────────────────────────────
function verifyOrBindIP_(userId, clientIP) {
  if (!clientIP) return { ok: true, justBound: false };

  const sheet = getSheet_('Users');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('user_id');
  let ipCol = headers.indexOf('verified_ip');

  if (ipCol === -1) {
    sheet.getRange(1, headers.length + 1).setValue('verified_ip');
    ipCol = headers.length;
  }

  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] == userId) {
      const existingIP = ipCol < data[i].length ? data[i][ipCol] : '';
      if (!existingIP) {
        sheet.getRange(i + 1, ipCol + 1).setValue(clientIP);
        return { ok: true, justBound: true };
      }
      if (existingIP === clientIP) return { ok: true, justBound: false };
      return {
        ok: false,
        message: '打卡失敗：請於辦公室網路環境下打卡（您目前的網路與登記位置不符）。如已更換網路環境，請聯繫管理員重新設定。'
      };
    }
  }
  return { ok: true, justBound: false };
}

// ── 管理員清除 IP 綁定 ─────────────────────────────────────────
function resetUserIP(payload) {
  const { _user, user_id } = payload;
  const err = requireRole_(_user, ['admin']);
  if (err) return err;
  const updated = updateSheetRow_('Users', 'user_id', user_id, { verified_ip: '' });
  if (!updated) return { success: false, message: '找不到該使用者' };
  return { success: true, message: '已清除 IP 綁定，下次打卡將重新登記' };
}

// ── 重複資料合併 ────────────────────────────────────────────────
// 舊版本可能在同一人同一天留下多列。讀取時合併為一筆，
// 採用最早上班時間與最晚下班時間，避免畫面顯示舊資料。
function mergeAttendanceRows_(rows) {
  if (!rows || !rows.length) return null;

  const normalized = rows.map(r => ({
    ...r,
    date: toDateStr_(r.date),
    clock_in_time: toDateTimeStr_(r.clock_in_time),
    clock_out_time: toDateTimeStr_(r.clock_out_time)
  }));
  const clockIns = normalized
    .filter(r => r.clock_in_time)
    .sort((a, b) => a.clock_in_time.localeCompare(b.clock_in_time));
  const clockOuts = normalized
    .filter(r => r.clock_out_time)
    .sort((a, b) => b.clock_out_time.localeCompare(a.clock_out_time));

  const result = { ...(clockIns[0] || normalized[0]) };
  if (clockIns.length) {
    result.clock_in_time = clockIns[0].clock_in_time;
    result.clock_in_location = clockIns[0].clock_in_location;
    result.clock_in_lat = clockIns[0].clock_in_lat;
    result.clock_in_lng = clockIns[0].clock_in_lng;
  }
  if (clockOuts.length) {
    result.clock_out_time = clockOuts[0].clock_out_time;
    result.clock_out_location = clockOuts[0].clock_out_location;
    result.clock_out_lat = clockOuts[0].clock_out_lat;
    result.clock_out_lng = clockOuts[0].clock_out_lng;
    result.work_hours = clockOuts[0].work_hours;
  }
  return result;
}

function mergeAttendanceList_(rows) {
  const groups = {};
  rows.forEach(row => {
    const key = `${row.user_id}__${toDateStr_(row.date)}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  });
  return Object.keys(groups).map(key => mergeAttendanceRows_(groups[key]));
}

// ── 今日出勤狀態 ───────────────────────────────────────────────
function getTodayAttendance(payload) {
  const { _user } = payload;
  const today = today_();
  const records = getSheetData_('Attendance');

  const todayRows = records.filter(r =>
    r.user_id === _user.user_id &&
    toDateStr_(r.date) === today
  );
  const rec = mergeAttendanceRows_(todayRows);

  return {
    success: true,
    today,
    record: rec ? {
      attendance_id: rec.attendance_id,
      clock_in_time:  toDateTimeStr_(rec.clock_in_time),
      clock_out_time: toDateTimeStr_(rec.clock_out_time),
      clock_in_location: rec.clock_in_location,
      attendance_type: rec.attendance_type,
      work_hours: rec.work_hours,
      status: rec.status
    } : null
  };
}

// ── 出勤列表 ───────────────────────────────────────────────────
function getAttendanceList(payload) {
  const { _user, start_date, end_date, user_id } = payload;
  let records = getSheetData_('Attendance');

  if (_user.role === 'staff') {
    records = records.filter(r => r.user_id === _user.user_id);
  } else if (user_id) {
    records = records.filter(r => r.user_id === user_id);
  }

  // 統一轉成字串再比對
  records = records.map(r => ({
    ...r,
    _dateStr: toDateStr_(r.date)
  }));

  if (start_date) records = records.filter(r => r._dateStr >= start_date);
  if (end_date)   records = records.filter(r => r._dateStr <= end_date);

  records = mergeAttendanceList_(records);
  records.sort((a, b) => (toDateStr_(b.date) > toDateStr_(a.date) ? 1 : -1));

  return {
    success: true,
    records: records.map(r => ({
      attendance_id: r.attendance_id,
      user_id: r.user_id,
      name: r.name,
      date: toDateStr_(r.date),
      clock_in_time:  toDateTimeStr_(r.clock_in_time),
      clock_out_time: toDateTimeStr_(r.clock_out_time),
      clock_in_location: r.clock_in_location,
      clock_out_location: r.clock_out_location,
      attendance_type: r.attendance_type,
      work_hours: r.work_hours,
      status: r.status,
      note: r.note
    }))
  };
}

// ── CSV 匯出 ───────────────────────────────────────────────────
function exportAttendanceCsv(payload) {
  const { _user, start_date, end_date } = payload;
  const err = requireRole_(_user, ['admin']);
  if (err) return err;

  let records = mergeAttendanceList_(getSheetData_('Attendance')).map(r => ({
    ...r, _dateStr: toDateStr_(r.date)
  }));
  if (start_date) records = records.filter(r => r._dateStr >= start_date);
  if (end_date)   records = records.filter(r => r._dateStr <= end_date);

  const headers = ['日期','姓名','上班時間','下班時間','工作地點','打卡類型','工時','狀態','備註'];
  const rows = records.map(r => [
    r._dateStr,
    r.name,
    toDateTimeStr_(r.clock_in_time),
    toDateTimeStr_(r.clock_out_time),
    r.clock_in_location,
    r.attendance_type,
    r.work_hours,
    r.status,
    r.note
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell||'').replace(/"/g,'""')}"`).join(','))
    .join('\n');

  return { success: true, csv: '\uFEFF' + csv };
}
