// 这里编写自定义js脚本；将被静态引入到页面中
// public/js/custom.js
console.log("[custom.js] loaded", window.location.pathname);

const TARGET_PATH_DECODED = "/article/查找和内容汇集";
// ！！改成你的 n8n Production Webhook 地址（不要 localhost）
const WEBHOOK_URL = "https://xxxxxx.n8n.cloud/webhook/search";

function isTargetPage() {
  // 兼容：pathname 可能是编码的
  const decoded = decodeURIComponent(window.location.pathname);
  return decoded === TARGET_PATH_DECODED;
}

function findAnchorElement() {
  // 不用 TreeWalker 了：Notion 渲染可能把文本拆成多个节点
  // 找到“看起来像一个独立块”的元素，其 textContent 包含 [[SEARCH_BOX]]
  const candidates = Array.from(document.querySelectorAll("div, p, span"))
    .filter(el => el && el.textContent && el.textContent.includes("[[SEARCH_BOX]]"));

  if (!candidates.length) return null;

  // 优先选择文本最短的那个（更像“单独一行占位块”）
  candidates.sort((a, b) => a.textContent.length - b.textContent.length);
  return candidates[0];
}

function createSearchBox() {
  const wrapper = document.createElement("div");
  wrapper.setAttribute("data-notionnext-searchbox", "1");
  wrapper.style.cssText = `
    margin: 16px 0;
    padding: 12px;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    background: #fafafa;
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  `;

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "输入要查找的关键词";
  input.style.cssText = `
    padding: 8px;
    width: 240px;
    border: 1px solid #ccc;
    border-radius: 6px;
  `;

  const button = document.createElement("button");
  button.textContent = "搜索";
  button.style.cssText = `
    padding: 8px 14px;
    border: 1px solid #ccc;
    border-radius: 6px;
    background: white;
    cursor: pointer;
  `;

  const status = document.createElement("span");
  status.style.cssText = "font-size: 12px; color: #666;";
  status.textContent = "";

  button.addEventListener("click", async () => {
    const keyword = input.value.trim();
    if (!keyword) {
      alert("请输入关键词");
      return;
    }

    button.disabled = true;
    button.textContent = "搜索中...";
    status.textContent = "请求发送中…";

    try {
      const resp = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword }),
      });

      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(`HTTP ${resp.status}: ${t}`);
      }

      status.textContent = "已发送 ✅";
    } catch (e) {
      console.error(e);
      status.textContent = "失败 ❌（看 Console）";
      alert("请求失败：" + (e?.message || e));
    } finally {
      button.disabled = false;
      button.textContent = "搜索";
    }
  });

  wrapper.appendChild(input);
  wrapper.appendChild(button);
  wrapper.appendChild(status);
  return wrapper;
}

function tryInsertOnce() {
  if (!isTargetPage()) return;

  // 防止重复插入
  if (document.querySelector('[data-notionnext-searchbox="1"]')) return;

  const anchor = findAnchorElement();
  if (!anchor) return;

  const box = createSearchBox();

  // 用 box 替换锚点所在“那一块”
  // 有时候 anchor 是 span，需要替换它更高层的块容器
  const replaceTarget = anchor.closest("div, p") || anchor;
  replaceTarget.replaceWith(box);

  console.log("[custom.js] search box inserted");
}

(function main() {
  if (!isTargetPage()) {
    console.log("[custom.js] not target page:", decodeURIComponent(window.location.pathname));
    return;
  }

  // 1) 先试一次
  tryInsertOnce();

  // 2) 页面内容后渲染：用观察者等它出现
  const obs = new MutationObserver(() => {
    tryInsertOnce();
  });

  obs.observe(document.body, { childList: true, subtree: true });

  // 3) 兜底：1 秒后再试一次
  setTimeout(tryInsertOnce, 1000);
})();


