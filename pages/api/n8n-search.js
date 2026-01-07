// pages/api/n8n-search.js

const N8N_WEBHOOK = "https://zzz832501.app.n8n.cloud/webhook/search";
// 可选：在 Vercel 环境变量里配置，n8n Webhook 节点里校验
const N8N_TOKEN = process.env.N8N_WEBHOOK_TOKEN || "";

function isValidEmail(email) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(req, res) {
  // CORS（如果你的前端和这个 API 同域，其实不用；跨域才需要）
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const body = req.body || {};

    // ✅ 规范化输入字段（兼容 q/query）
    const keyword = String(body.keyword ?? body.q ?? body.query ?? "").trim();
    const email = String(body.email ?? body.to ?? "").trim();

    if (!keyword || keyword.length < 2) {
      return res.status(400).json({ ok: false, error: "keyword is required (min length: 2)" });
    }

    if (email && !isValidEmail(email)) {
      return res.status(400).json({ ok: false, error: "email is invalid" });
    }

    // ✅ 白名单透传：避免把前端乱七八糟字段传进 n8n
    const payload = {
      keyword,
      email, // 可为空；n8n 里会用默认邮箱兜底
      timeRange: body.timeRange ?? "7d",
      maxItems: Number(body.maxItems ?? 10),
    };

    const r = await fetch(N8N_WEBHOOK, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(N8N_TOKEN ? { Authorization: `Bearer ${N8N_TOKEN}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    const raw = await r.text();

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      data = { raw };
    }

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
