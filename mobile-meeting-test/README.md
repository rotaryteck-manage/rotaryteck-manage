# 擎正・週會連結手機測試

這是獨立測試 App 和獨立測試網域。App 內載入現有擎正網站，不修改網站版型、登入、週會簽到或正式站的「複製連結」。App 的登入狀態與原本瀏覽器／PWA 分開；首次開啟可能要重新登入。此測試不涵蓋通知、檔案上傳或匯出，不應取代日常使用的 PWA。

## 建置與部署

1. iOS：用有 Xcode 和 XcodeGen 的 Mac，在 `ios/` 執行 `xcodegen generate`。在 Xcode 為 `tw.com.rotaryteck.meetingtest` 選定可簽署 Associated Domains 的 Apple Developer 團隊。用實機開發簽署或 TestFlight 安裝。
2. Android：以 Android Studio 開啟 `android/`，使用 JDK 17、Gradle 8.11.1、Android SDK 35，建置並安裝 APK。以實際安裝的 APK 簽章取得 SHA-256 指紋，例如用 SDK Build Tools 的 `apksigner verify --print-certs`，轉為大寫、冒號分隔。
3. 只部署此目錄的獨立 Worker。必須確認部署結果的網域與 iOS entitlement、Android manifest 及兩端驗證常數一致。目前預設為 `rotaryteck-meeting-link-test.rotaryteckserve.workers.dev`，尚未配置。部署前提供 Apple Team ID 與 APK 簽章指紋；不需要提供私人簽章金鑰。

   ```sh
   npx wrangler deploy --config ./wrangler.jsonc \
     --var APPLE_TEAM_ID:YOUR_TEAM_ID \
     --var ANDROID_CERT_SHA256:YOUR_COLON_SEPARATED_SHA256
   ```

   確認測試網域的 `/.well-known/apple-app-site-association` 與 `/.well-known/assetlinks.json` 均直接回傳 200 JSON，不經轉址。沒有對應資料時會回 503，避免誤認為已設定完成。此 Worker 沒有資料庫或公司資料的綁定。

## 驗收

- 先從正式站複製一則有權限的週會連結，取出其中的 `notificationMeeting` 值。手動組成測試網址 `https://rotaryteck-meeting-link-test.rotaryteckserve.workers.dev/meeting/<ID>`。不用改正式按鈕。
- 在 iPhone、Android 各用 LINE 點測試網址；確認實際啟動「擎正・週會測試」且顯示同一則紀錄。分別測 App 關閉與已開啟、已登入與未登入。只開 LINE、Safari 或 Chrome 都不算通過。
- 可先在 iOS Notes／Android 其他 App 測同一網址。若系統能開 App、LINE 不能，分別記錄 LINE 版本與結果；可另測 LINE 官方的 `?openExternalBrowser=1` 參數，仍以實際打開 App 才算通過。
- 沒裝測試 App 時應能經測試網址轉回原本的週會網頁；無權限或紀錄不存在仍依正式站原規則處理。測試帳號實際開啟紀錄會依既有規則簽到。
- Android 可用 `adb shell pm get-app-links tw.com.rotaryteck.meetingtest` 查看網域是否為 verified。iPhone 實機要用已簽署、有 Associated Domains 的版本；只用模擬器不能驗收 LINE 行為。
