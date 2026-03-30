import { getHistory, saveToHistory } from './history.js';
import { fetchAndAnalyze } from './parser.js';

// --- 自動產生發佈時間版號 ---
function autoSetVersion() {
    const versionTag = document.getElementById('versionTag');
    if (!versionTag) return;

    // 取得瀏覽器讀取到此 HTML 檔案的最後修改時間
    const lastMod = new Date(document.lastModified);
    
    // 組合出 YYYYMMDDHHmm 格式
    const yyyy = lastMod.getFullYear();
    const mm = String(lastMod.getMonth() + 1).padStart(2, '0');
    const dd = String(lastMod.getDate()).padStart(2, '0');
    const hh = String(lastMod.getHours()).padStart(2, '0');
    const min = String(lastMod.getMinutes()).padStart(2, '0');
    
    // 更新到畫面上
    versionTag.innerText = `Build ${yyyy}${mm}${dd}${hh}${min} (Auto)`;
}

// --- 將 UI 輔助函式掛載到全域，供 parser 產出的 HTML 字串使用 ---
window.toggleDisplay = function(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = (el.style.display === 'block') ? 'none' : 'block';
};

window.copyToClipboard = async function(text, btnId) {
    try {
        await navigator.clipboard.writeText(text);
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.innerText = "已複製！";
            btn.classList.add("success-copy");
            setTimeout(() => { 
                btn.innerText = "複製 URL"; 
                btn.classList.remove("success-copy");
            }, 2000);
        }
    } catch (e) {
        alert("複製失敗，請檢查瀏覽器權限。");
    }
};

// --- DOM 元素綁定 ---
const urlInput = document.getElementById('urlInput');
const mainBtn = document.getElementById('mainBtn');
const historySelect = document.getElementById('historySelect');
const mainOutput = document.getElementById('mainOutput');

// --- 初始化渲染歷史紀錄選單 ---
function updateHistoryUI() {
    const history = getHistory();
    historySelect.innerHTML = '<option value="">-- 先前測試紀錄 (保留 24 小時) --</option>';
    history.forEach(item => {
        const option = document.createElement("option");
        option.value = item.url;
        option.text = `[${item.time}] ${item.url.substring(0, 80)}${item.url.length > 80 ? '...' : ''}`;
        historySelect.appendChild(option);
    });
}

// --- 事件監聽 ---
historySelect.addEventListener('change', () => {
    if (historySelect.value) {
        urlInput.value = historySelect.value;
    }
});

mainBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim();
    if (!url) return alert("請輸入有效的 m3u8 網址");
    
    // 儲存紀錄並更新 UI
    saveToHistory(url);
    updateHistoryUI();
    
    mainBtn.disabled = true;
    mainBtn.innerText = "分析中...";
    mainOutput.innerHTML = "<div style='text-align:center; padding:20px; color:#666;'>正在獲取並分析 Manifest 資料...</div>";

    try {
        const resultHTML = await fetchAndAnalyze(url);
        mainOutput.innerHTML = resultHTML;
    } catch (err) {
        mainOutput.innerHTML = `<div style="padding:15px; color:#cf1322; background:#fff1f0; border:1px solid #ffa39e; border-radius:6px; margin-top:10px;">
            <b>❌ 分析中斷：</b> ${err.message}<br><br>
            1. 請確認網址是否有效。<br>
            2. 確認目標伺服器 (CDN) 已正確設定 <b>CORS Header</b>。</div>`;
    } finally {
        mainBtn.disabled = false;
        mainBtn.innerText = "執行技術分析";
    }
});

// --- 系統啟動初始化 ---
autoSetVersion();
updateHistoryUI();
