// pages/api/n8n-search.js

export default async function handler(req, res) {
  // 允许跨域访问你自己的 API（可选）
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // 预检
  if (req.method === "OPTIONS") return res.status(200).end();

  // 仅允许 POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // ✅ 用生产 webhook，不要 webhook-test
  const N8N_WEBHOOK = "https://zzz832501.app.n8n.cloud/webhook/search";

  try {
    // 记录一下请求体，方便你在 Vercel 日志里排查
    console.log("[api/n8n-search] body:", req.body);

    const r = await fetch(N8N_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Next.js API 会把 JSON body 解析成对象放到 req.body
      body: JSON.stringify(req.body || {}),
    });

    const raw = await r.text();

    // 这里尽量把 n8n 返回转成 JSON，前端更好用
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      data = { raw };
    }

    // 透传状态码 + 返回 JSON
    return res.status(r.status).json({
      ok: r.ok,
      status: r.status,
      n8n: data,
    });
  } catch (e) {
    console.error("[api/n8n-search] proxy failed:", e);
    return res.status(500).json({ ok: false, error: e?.message || "Proxy failed" });
  }
}
