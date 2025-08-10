// /api/submit.js
// Put this file at <project-root>/api/submit.js and deploy to Vercel
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ status: "error", message: "Method not allowed" });
  }

  try {
    const body = req.body; // Next/Vercel will parse JSON automatically
    if (!body) {
      return res.status(400).json({ status: "error", message: "Missing form data" });
    }

    // YOUR Google Apps Script submit URL (replace with your actual GAS URL for form submission)
    const GAS_SUBMIT_URL = "https://script.google.com/macros/s/YOUR_SUBMIT_SCRIPT_ID/exec";

    // Forward the form data to GAS
    const forwardRes = await fetch(GAS_SUBMIT_URL, {
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
    console.error("Submit proxy error:", err);
    return res.status(500).json({ status: "error", message: err.toString() });
  }
} 