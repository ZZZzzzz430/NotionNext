// 这里编写自定义js脚本；将被静态引入到页面中
// public/js/custom.js
// public/js/custom.js

function isTargetPage() {
  return window.location.pathname === "/article/查找和内容汇集";
}

function findSearchAnchor() {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null
  );

  let node;
  while ((node = walker.nextNode())) {
    if (node.nodeValue.includes("[[SEARCH_BOX]]")) {
      return node;
    }
  }
  return null;
}

function createSearchBox() {
  const wrapper = document.createElement("div");
  wrapper.style.cssText = `
    margin: 16px 0;
    padding: 12px;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    background: #fafafa;
  `;

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "输入要查找的关键词";
  input.style.cssText = `
    padding: 8px;
    width: 220px;
    margin-right: 8px;
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

  button.addEventListener("click", async () => {
    const keyword = input.value.trim();
    if (!keyword) {
      alert("请输入关键词");
      return;
    }

    button.disabled = true;
    button.textContent = "搜索中...";

    try {
      await fetch("http://localhost:5678/webhook/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ keyword }),
      });

      alert("已发送到搜索流程");
    } catch (e) {
      alert("请求失败");
    } finally {
      button.disabled = false;
      button.textContent = "搜索";
    }
  });

  wrapper.appendChild(input);
  wrapper.appendChild(button);
  return wrapper;
}

function replaceAnchorWithSearchBox() {
  const anchorTextNode = findSearchAnchor();
  if (!anchorTextNode) return;

  const parent = anchorTextNode.parentNode;
  const box = createSearchBox();

  parent.replaceChild(box, anchorTextNode);
}

(function main() {
  if (!isTargetPage()) return;

  window.addEventListener("load", () => {
    replaceAnchorWithSearchBox();
  });
})();

