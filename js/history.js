import { COOKIE_NAME, MAX_HISTORY_ITEMS } from './config.js';

export function getHistory() {
    const name = COOKIE_NAME + "=";
    const ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i].trim();
        if (c.indexOf(name) === 0) {
            return JSON.parse(decodeURIComponent(c.substring(name.length, c.length)));
        }
    }
    return [];
}

export function saveToHistory(url) {
    let history = getHistory();
    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
    
    // 移除重複並放到最前面
    history = history.filter(item => item.url !== url);
    history.unshift({ time: timeStr, url: url });
    
    if (history.length > MAX_HISTORY_ITEMS) history.pop();
    
    const expires = new Date(Date.now() + 86400 * 1000).toUTCString();
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(history))}; expires=${expires}; path=/; SameSite=Lax`;
    
    return history;
}
