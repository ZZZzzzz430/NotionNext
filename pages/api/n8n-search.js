// pages/api/n8n-search.js

export default async function handler(req, res) {
  // 允许跨域访问你自己的 API（可选，但建议加上，方便你调试/扩展）
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // 处理浏览器预检
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const N8N_WEBHOOK = "https://zzz832501.app.n8n.cloud/webhook/search";

    const r = await fetch(N8N_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body || {}),
    });

    const contentType = r.headers.get("content-type") || "text/plain";
    const text = await r.text();

    res.status(r.status);
    res.setHeader("Content-Type", contentType);
    return res.send(text);
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Proxy failed" });
  }
}
