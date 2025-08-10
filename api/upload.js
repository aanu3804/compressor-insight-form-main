// /api/upload.js
// Put this file at <project-root>/api/upload.js and deploy to Vercel
export default async function handler(req, res) {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ status: "error", message: "Method not allowed" });
    }
  
    try {
      const body = req.body; // Next/Vercel will parse JSON automatically
      if (!body || !body.data) {
        return res.status(400).json({ status: "error", message: "Missing payload or base64 data" });
      }
  
      // YOUR Google Apps Script upload URL (the one that worked in Postman)
      const GAS_UPLOAD_URL = "https://script.google.com/macros/s/AKfycbwR0CU9AATBHzUgxmCj1nOHxIVg1aep1HyvULT0_q6cRT_QIE0oPfeyA-YHb5ahaXudNA/exec";
  
      // Forward the JSON to GAS
      const forwardRes = await fetch(GAS_UPLOAD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
  
      const text = await forwardRes.text();
  
      // Try parse JSON from GAS; if GAS returned non-JSON, include raw text for debugging
      try {
        const json = JSON.parse(text);
        return res.status(forwardRes.ok ? 200 : 500).json(json);
      } catch (e) {
        return res.status(500).json({ status: "error", message: "GAS returned non-JSON", raw: text });
      }
    } catch (err) {
      console.error("Proxy error:", err);
      return res.status(500).json({ status: "error", message: err.toString() });
    }
  }
  