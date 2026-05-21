# 派遣人員勤務管理系統 — 部署說明

## 第一階段完成項目
- ✅ Google Sheets 初始化腳本（Setup.gs）
- ✅ GAS 後端：Utils / Auth / Users
- ✅ 前端：login.html / change-password.html
- ✅ JS 模組：config.js / api.js / auth.js
- ✅ 全系統 CSS 樣式表

---

## 部署步驟（請依序執行）

### Step 1：建立 Google Sheets

1. 前往 https://sheets.google.com 建立新試算表
2. 命名為「派遣系統資料庫」
3. 記下試算表 URL 中的 **Spreadsheet ID**
   - URL 格式：`https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`

---

### Step 2：建立 Google Apps Script

1. 在試算表中點選「擴充功能」→「Apps Script」
2. 刪除預設的 `Code.gs` 內容
3. 依序建立以下檔案（點「+」新增腳本檔案）：

| 檔名 | 說明 |
|------|------|
| Setup.gs | 初始化工作表 |
| Utils.gs | 共用工具 + doPost 路由 |
| Auth.gs | 登入、Token、改密碼 |
| Users.gs | 帳號管理 |

> 將 `gas/` 資料夾中對應的程式碼貼入各檔案

---

### Step 3：執行初始化

1. 在 Apps Script 編輯器，選擇函式：`initializeSheets`
2. 點「執行」
3. 授權 Google 帳號存取試算表
4. 確認 Google Sheets 已出現 7 個工作表（Users / Sessions / Attendance / WorkReports / Overtime / LeaveRequests / Issues）
5. 初始帳號：`admin@dispatch.com` / 密碼：`Admin@1234`

---

### Step 4：部署 Web App

1. 點「部署」→「新增部署作業」
2. 類型選：**網路應用程式**
3. 設定：
   - 說明：`派遣系統 API v1`
   - 以下列身分執行：**我（您的 Google 帳號）**
   - 具有存取權的使用者：**所有人**
4. 點「部署」→ 複製 **Web App URL**

---

### Step 5：設定前端

開啟 `js/config.js`，將 Web App URL 填入：

```javascript
GAS_WEB_APP_URL: 'https://script.google.com/macros/s/你的ID/exec',
```

---

### Step 6：上傳前端至 GitHub Pages

```
dispatch-system/
├── css/style.css
├── js/config.js
├── js/api.js
├── js/auth.js
├── login.html
└── change-password.html
```

推送至 GitHub Repo，開啟 Pages（Settings → Pages → main / root）

---

## 測試帳號

| 帳號 | 密碼 | 角色 |
|------|------|------|
| admin@dispatch.com | Admin@1234 | 管理者 |

首次登入後系統會強制要求修改密碼。

---

## 第二階段（下一步）

- staff-dashboard.html（派遣人員首頁）
- attendance.html（打卡）
- work-report.html（工作回報）
- GAS：Attendance.gs / WorkReports.gs
