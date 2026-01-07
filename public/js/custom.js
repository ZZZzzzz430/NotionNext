// 这里编写自定义js脚本；将被静态引入到页面中
// public/js/custom.js

function isTargetPage() {
  // 只在这个页面启用
  return window.location.pathname === "/article/查找和内容汇集";
}

async function postToBackend(payload) {
  // TODO: 改成你的后端地址
  const url = "http://localhost:5678/webhook/search";

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    // 如果你需要带 cookie：credentials: "include",
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`POST failed: ${resp.status} ${text}`);
  }

  // 如果后端返回 JSON
  return resp.json().catch(() => ({}));
}

function mountButton() {
  const btn = document.createElement("button");
  btn.textContent = "发送 POST";
  btn.style.cssText = `
    position: fixed;
    right: 16px;
    bottom: 16px;
    z-index: 99999;
    padding: 10px 14px;
    border: 1px solid #ccc;
    border-radius: 10px;
    background: white;
    cursor: pointer;
  `;

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.textContent = "发送中...";
    try {
      const data = await postToBackend({
        from: "notionnext",
        page: window.location.pathname,
        ts: Date.now(),
      });
      alert("成功：" + JSON.stringify(data));
    } catch (e) {
      alert("失败：" + (e?.message || e));
    } finally {
      btn.disabled = false;
      btn.textContent = "发送 POST";
    }
  });

  document.body.appendChild(btn);
}

(function main() {
  if (!isTargetPage()) return;

  // 等页面加载完成再执行
  window.addEventListener("load", () => {
    mountButton();
  });
})();
