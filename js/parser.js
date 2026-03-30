export async function fetchAndAnalyze(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`伺服器回應錯誤: ${response.status}`);
    const text = await response.text();
    const baseDir = url.substring(0, url.lastIndexOf("/") + 1);
    let html = "";

    // 1. 原始碼區塊
    html += `<div class="section-title">1. 主 m3u8 原始碼</div>`;
    html += `<div class="clickable-box" onclick="window.toggleDisplay('rawSrc')">▶ 點擊展開完整原始碼</div>`;
    html += `<pre id="rawSrc" style="display:none; background:#1e1e1e; color:#d4d4d4; padding:15px; font-size:12px; white-space:pre-wrap; word-break:break-all; border-radius:8px; margin-top:10px; border:1px solid #333;">${text.replace(/</g,'&lt;')}</pre>`;

    // 2. 結構化資訊分析
    html += `<div class="section-title">2. 資源結構與資訊分析</div><table>`;
    
    const ver = text.match(/#EXT-X-VERSION:(\d+)/);
    html += `<tr><th>#EXT-X-VERSION</th><td>版本：${ver ? ver[1] : '未宣告 (可能視為 v1)'}</td></tr>`;

    // Media 拆解
    const mediaLines = text.match(/#EXT-X-MEDIA:.*/g) || [];
    let audioHtml = "", subHtml = "";
    mediaLines.forEach((line, idx) => {
        const type = line.match(/TYPE=([^,]*)/)?.[1];
        const name = line.match(/NAME="([^"]*)"/)?.[1] || "未命名";
        const lang = line.match(/LANGUAGE="([^"]*)"/)?.[1] || "未知語言";
        const uri = line.match(/URI="([^"]*)"/)?.[1];
        const fullUri = uri ? (uri.startsWith('http') ? uri : baseDir + uri) : null;
        const icon = type === 'AUDIO' ? '🔊' : '💬';
        
        let item = `<div class="item-row" ${fullUri ? `onclick="window.toggleDisplay('m-${idx}')"` : ''}>
            ${icon} <span class="item-label">${name}</span> <span class="item-summary">[${lang}]</span>`;
        
        if (fullUri) {
            item += `<div id="m-${idx}" class="url-container" onclick="event.stopPropagation()">
                        <button class="copy-btn" id="mb-${idx}" onclick="window.copyToClipboard('${fullUri}','mb-${idx}')">複製 URL</button>
                        <span class="url-text">${fullUri}</span>
                     </div>`;
        } else {
            item += `<span style="font-size:11px; color:#999; margin-left:10px;">(封裝內含，無獨立 URL)</span>`;
        }
        item += `</div>`;

        if (type === 'AUDIO') audioHtml += item;
        if (type === 'SUBTITLES') subHtml += item;
    });
    
    html += `<tr><th>#EXT-X-MEDIA<br><small style="color:#999; font-weight:normal;">(多語音與字幕)</small></th><td>
        <div style="font-weight:bold; color:#005bb5; margin-bottom:5px;">音軌配置</div>${audioHtml || '<div style="font-size:12px; color:#888;">無獨立音軌</div>'}
        <div style="font-weight:bold; color:#005bb5; margin-top:15px; margin-bottom:5px;">字幕配置</div>${subHtml || '<div style="font-size:12px; color:#888;">無獨立字幕</div>'}
    </td></tr>`;

    // Stream-INF 拆解
    const streamMatches = text.matchAll(/#EXT-X-STREAM-INF:(.*?)\n(.*)/g);
    let vHtml = "", vIdx = 0;
    for (const m of streamMatches) {
        const info = m[1];
        const path = m[2].trim();
        const res = info.match(/RESOLUTION=(\d+x\d+)/)?.[1] || "解析度未標示";
        const bwMatch = info.match(/BANDWIDTH=(\d+)/);
        const bw = bwMatch ? `${(parseInt(bwMatch[1])/1000000).toFixed(2)} Mbps` : "頻寬未標示";
        const codecMatch = info.match(/CODECS="([^"]+)"/);
        const codec = codecMatch ? codecMatch[1] : null;
        
        const fullPath = path.startsWith('http') ? path : baseDir + path;
        
        vHtml += `<div class="item-row" onclick="window.toggleDisplay('v-${vIdx}')">
            <span class="item-label">變體 ${vIdx+1}</span>
            <span class="item-summary">${res} | ${bw} ${codec ? `| ${codec.split(',')[0]}` : ''}</span>
            <div id="v-${vIdx}" class="url-container" onclick="event.stopPropagation()">
                <button class="copy-btn" id="vb-${vIdx}" onclick="window.copyToClipboard('${fullPath}','vb-${vIdx}')">複製 URL</button>
                <span class="url-text">${fullPath}</span>
            </div>
        </div>`;
        vIdx++;
    }
    html += `<tr><th>#EXT-X-STREAM-INF<br><small style="color:#999; font-weight:normal;">(影像自適應層級)</small></th><td>${vHtml || '<div style="font-size:12px; color:#888;">無多層級變體</div>'}</td></tr></table>`;

    // 3. 診斷報告
    html += `<div class="section-title">3. 靜態語法診斷</div>`;
    if (vIdx > 0 && !text.includes("CODECS")) {
        html += `<div style="padding:12px; color:#856404; background:#fffbe6; border:1px solid #ffe58f; border-radius:6px; font-size:13px; margin-bottom:10px;">
            <b>⚠️ 效能優化建議：</b> Master Playlist 未宣告 CODECS 參數。補齊此參數可協助 tvOS/iOS <code>AVPlayer</code> 提早配置硬體解碼資源，減少起播延遲。</div>`;
    }
    html += `<div style="padding:12px; color:#389e0d; background:#f6ffed; border:1px solid #b7eb8f; border-radius:6px; font-size:13px; font-weight:bold;">✓ 基礎語法與資源結構提取完成。</div>`;

    return html;
}
