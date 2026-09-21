# Rotaryteck Manage

擎正科技的案件、庫房、收領料、照片與員工權限管理系統。

## 專案結構

- `dist/`：前端畫面與 Excel BOM 元件
- `worker/`：Cloudflare Worker 後端 API
- `drizzle/`：D1 資料庫遷移
- `tests/`：權限、庫存、照片與資料驗證測試
- `wrangler.jsonc`：Cloudflare Worker、D1 與 R2 綁定設定

## Cloudflare 設定

Worker 名稱：`rotaryteck-manage`

必要綁定：

- D1 `DB` → `rotaryteck-manage-db`
- R2 `UPLOADS` → `rotaryteck-manage-uploads`

必要環境變數：

- `SUPABASE_URL`：一般文字
- `SUPABASE_PUBLISHABLE_KEY`：一般文字
- `SUPABASE_SECRET_KEY`：加密祕密

不要把密碼或 Secret key 寫入程式碼或提交到 Git。

## 指令

- `npm run build`：建立 Worker 程式
- `npm test`：執行測試
- `npm run deploy`：套用 D1 遷移並部署 Worker

首次部署後，先在 Supabase Authentication 建立主管登入帳號。第一位成功登入的帳號會成為主管，之後可在管理後台建立其他員工與初始密碼。

## 權限

- 一般員工：只能查看
- 庫房管理：收料、領料及上傳照片
- 主管：全區開放，包含員工、案件、庫房、資訊庫及網站設定

照片預設保存在私人 R2，並由後端驗證登入與權限後才可讀取。
啟用 Cloudflare 自動部署
