// public/js/custom.js
console.log("[custom.js] loaded", window.location.pathname);

/**
 * 只在这篇文章页生效（中文路径要用 decodeURIComponent 比较）
 */
const TARGET_PATH_DECODED = "/article/查找和内容汇集";

/**
 * ✅ 改成你自己的 Next.js API 代理（同源，不跨域，不会 CORS）
 * 你已经做了代理的话，就用这个
 */
const PROXY_API_URL = "/api/n8n-search";

/**
 * Notion 页面占位符：你在 Notion 里写这一行
 */
const ANCHOR_TEXT = "[[SEARCH_BOX]]";

function isTargetPage() {
  try {
    const decoded = decodeURIComponent(window.location.pathname);
    return decoded === TARGET_PATH_DECODED;
  } catch {
    // decode 出错时兜底
    return window.location.pathname === TARGET_PATH_DECODED;
  }
}

/**
 * 找到包含 [[SEARCH_BOX]] 的“块元素”
 * 注意：Notion 渲染会嵌套很多 div/span，所以用 textContent 搜索 + 取最短的
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

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "输入要查找的关键词";
  input.style.cssText = `
    padding: 8px 10px;
    width: 260px;
    border: 1px solid #ccc;
    border-radius: 8px;
    outline: none;
  `;

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

  async function doSearch() {
    const keyword = input.value.trim();
    if (!keyword) {
      alert("请输入关键词");
      return;
    }

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
        body: JSON.stringify({ keyword }),
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
      resultBox.style.display = "block";
      resultBox.textContent = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
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

  // 回车搜索
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doSearch();
  });

  row.appendChild(input);
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
  // 不在目标页面直接退出（方便你扩展：可以做多页面多个锚点）
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
