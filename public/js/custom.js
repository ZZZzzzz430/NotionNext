// public/js/custom.js
console.log("[custom.js] loaded", window.location.pathname);

/**
 * 只在这篇文章页生效（中文路径要用 decodeURIComponent 比较）
 */
const TARGET_PATH_DECODED = "/article/查找和内容汇集";

/**
 * ✅ 改成你自己的 Next.js API 代理（同源，不跨域，不会 CORS）
 */
const PROXY_API_URL = "/api/n8n-search";

/**
 * Notion 页面占位符：你在 Notion 里写这一行
 */
const ANCHOR_TEXT = "[[SEARCH_BOX]]";

/**
 * 本地保存邮箱的 key（让用户下次打开自动带上）
 */
const EMAIL_STORAGE_KEY = "n8n_search_email";

function isTargetPage() {
  try {
    const decoded = decodeURIComponent(window.location.pathname);
    return decoded === TARGET_PATH_DECODED;
  } catch {
    return window.location.pathname === TARGET_PATH_DECODED;
  }
}

/**
 * 找到包含 [[SEARCH_BOX]] 的“块元素”
 */
function findAnchorElement() {
  const candidates = Array.from(document.querySelectorAll("div, p, span"))
    .filter(el => el && typeof el.textContent === "string" && el.textContent.includes(ANCHOR_TEXT));

  if (!candidates.length) return null;

  candidates.sort((a, b) => (a.textContent.length || 0) - (b.textContent.length || 0));
  return candidates[0];
}

function createResultBox() {
  const box = document.createElement("div");
  box.style.cssText = `
    margin-top: 10px;
    padding: 10px;
    border: 1px dashed #d0d0d0;
    border-radius: 8px;
    background: #fff;
    font-size: 13px;
    white-space: pre-wrap;
    word-break: break-word;
    display: none;
  `;
  return box;
}

function isValidEmail(email) {
  if (!email) return true; // 空值允许（可选）
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function createSearchBox() {
  const wrapper = document.createElement("div");
  wrapper.setAttribute("data-notionnext-searchbox", "1");
  wrapper.style.cssText = `
    margin: 16px 0;
    padding: 12px;
    border: 1px solid #e5e5e5;
    border-radius: 10px;
    background: #fafafa;
  `;

  const row = document.createElement("div");
  row.style.cssText = `
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  `;

  // ✅ 关键词输入框（必填）
  const keywordInput = document.createElement("input");
  keywordInput.type = "text";
  keywordInput.placeholder = "输入要查找的关键词（必填）";
  keywordInput.style.cssText = `
    padding: 8px 10px;
    width: 260px;
    border: 1px solid #ccc;
    border-radius: 8px;
    outline: none;
  `;

  // ✅ 邮箱输入框（可选）
  const emailInput = document.createElement("input");
  emailInput.type = "email";
  emailInput.placeholder = "接收邮箱（可选，不填用默认邮箱）";
  emailInput.style.cssText = `
    padding: 8px 10px;
    width: 260px;
    border: 1px solid #ccc;
    border-radius: 8px;
    outline: none;
  `;

  // 读取上次保存的邮箱（可选）
  try {
    const saved = localStorage.getItem(EMAIL_STORAGE_KEY);
    if (saved) emailInput.value = saved;
  } catch {}

  const button = document.createElement("button");
  button.textContent = "搜索";
  button.style.cssText = `
    padding: 8px 14px;
    border: 1px solid #ccc;
    border-radius: 8px;
    background: white;
    cursor: pointer;
  `;

  const status = document.createElement("span");
  status.style.cssText = "font-size: 12px; color: #666;";
  status.textContent = "";

  const resultBox = createResultBox();

  function showResult(payload) {
    // payload 可能是 string，也可能是 object
    resultBox.style.display = "block";

    // ✅ 尽量展示 Notion 链接（如果你 API/n8n 返回里带 notionUrl）
    // 兼容几种常见结构：
    // 1) { notionUrl: "..." }
    // 2) { n8n: { notionUrl: "..." } }
    // 3) { n8n: { notionUrl: "...", ... } }
    // 4) { n8n: { url: "..." } }（有些人直接回 url）
    let obj = payload;
    if (typeof payload === "string") {
      resultBox.textContent = payload;
      return;
    }

    const notionUrl =
      obj?.notionUrl ||
      obj?.n8n?.notionUrl ||
      obj?.n8n?.url ||
      "";

    if (notionUrl) {
      resultBox.innerHTML =
        `Notion：<a href="${notionUrl}" target="_blank" rel="noreferrer">${notionUrl}</a>\n\n` +
        `<pre style="margin:8px 0 0; white-space:pre-wrap;">${escapeHtml(JSON.stringify(obj, null, 2))}</pre>`;
    } else {
      resultBox.textContent = JSON.stringify(obj, null, 2);
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function doSearch() {
    const keyword = keywordInput.value.trim();
    const email = emailInput.value.trim();

    // ✅ keyword 必填
    if (!keyword || keyword.length < 2) {
      alert("请输入关键词（至少 2 个字符）");
      return;
    }

    // ✅ email 可选，但如果填了必须合法
    if (!isValidEmail(email)) {
      alert("邮箱格式不正确（可留空）");
      return;
    }

    // 保存邮箱（仅当用户填了）
    try {
      if (email) localStorage.setItem(EMAIL_STORAGE_KEY, email);
    } catch {}

    button.disabled = true;
    button.textContent = "搜索中...";
    status.textContent = "请求发送中…";
    resultBox.style.display = "none";
    resultBox.textContent = "";

    try {
      // ✅ 走同源代理，CORS 不会拦
      const resp = await fetch(PROXY_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // ✅ 这里把 email 一起传过去（空也没关系）
        body: JSON.stringify({ keyword, email }),
      });

      const contentType = resp.headers.get("content-type") || "";
      let payload;

      if (contentType.includes("application/json")) {
        payload = await resp.json();
      } else {
        payload = await resp.text();
      }

      if (!resp.ok) {
        const errText = typeof payload === "string" ? payload : JSON.stringify(payload);
        throw new Error(`HTTP ${resp.status}: ${errText}`);
      }

      status.textContent = "成功 ✅";
      showResult(payload);
    } catch (e) {
      console.error("[search] failed:", e);
      status.textContent = "失败 ❌（看 Console）";
      resultBox.style.display = "block";
      resultBox.textContent = `请求失败：${e?.message || e}`;
    } finally {
      button.disabled = false;
      button.textContent = "搜索";
    }
  }

  // 点击按钮搜索
  button.addEventListener("click", doSearch);

  // 回车搜索（两个输入框都支持 Enter）
  keywordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doSearch();
  });
  emailInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doSearch();
  });

  row.appendChild(keywordInput);
  row.appendChild(emailInput);
  row.appendChild(button);
  row.appendChild(status);

  wrapper.appendChild(row);
  wrapper.appendChild(resultBox);

  return wrapper;
}

/**
 * 尝试插入（只插一次）
 */
function tryInsertOnce() {
  if (!isTargetPage()) return;

  // 已插入就不重复插
  if (document.querySelector('[data-notionnext-searchbox="1"]')) return;

  const anchor = findAnchorElement();
  if (!anchor) return;

  const box = createSearchBox();

  // 替换更“像块”的容器
  const replaceTarget = anchor.closest("div, p") || anchor;
  replaceTarget.replaceWith(box);

  console.log("[custom.js] search box inserted");
}

(function main() {
  if (!isTargetPage()) {
    console.log("[custom.js] not target page:", decodeURIComponent(window.location.pathname));
    return;
  }

  // 先试一次
  tryInsertOnce();

  // 观察 DOM 变化：Notion 内容可能晚一点渲染出来
  const obs = new MutationObserver(() => {
    tryInsertOnce();
  });

  obs.observe(document.body, { childList: true, subtree: true });

  // 兜底再试一次
  setTimeout(tryInsertOnce, 1000);
})();
