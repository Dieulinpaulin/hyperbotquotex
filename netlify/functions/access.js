const SUPABASE_URL = "https://urvmxfyfulmsrrelxjuy.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVydm14ZnlmdWxtc3JyZWx4anV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTA3MTk1NywiZXhwIjoyMDk0NjQ3OTU3fQ.T_uYsp6e2ZjN2ajQMeQVeaE_UKsDgR5j8qqHqy76c1s";

exports.handler = async function(event) {
  const headers = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  try {
    const { action, code, client_name, client_phone, days } = JSON.parse(event.body);
    if (action === "verify") {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/access_codes?code=eq.${encodeURIComponent(code)}&select=*`, {
        headers: { "apikey": SUPABASE_SERVICE_KEY, "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}` }
      });
      const data = await res.json();
      if (!data || data.length === 0) return { statusCode: 200, headers, body: JSON.stringify({ valid: false, reason: "KÒD PA EGZISTE" }) };
      const record = data[0];
      if (!record.is_active) return { statusCode: 200, headers, body: JSON.stringify({ valid: false, reason: "KÒD DEZAKTIVE" }) };
      const now = new Date();
      const expires = new Date(record.expires_at);
      if (now > expires) return { statusCode: 200, headers, body: JSON.stringify({ valid: false, reason: "KÒD EKSPIRE" }) };
      await fetch(`${SUPABASE_URL}/rest/v1/access_codes?id=eq.${record.id}`, {
        method: "PATCH",
        headers: { "apikey": SUPABASE_SERVICE_KEY, "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ uses: record.uses + 1 })
      });
      const daysLeft = Math.ceil((expires - now) / (1000 * 60 * 60 * 24));
      return { statusCode: 200, headers, body: JSON.stringify({ valid: true, client_name: record.client_name, expires_at: record.expires_at, days_left: daysLeft }) };
    }
    if (action === "create") {
      const adminKey = event.headers["x-admin-key"];
      if (adminKey !== "HYPERBOT_ADMIN_2026") return { statusCode: 401, headers, body: JSON.stringify({ error: "Aksè refize" }) };
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let newCode = "HD-";
      for (let i = 0; i < 4; i++) newCode += chars[Math.floor(Math.random() * chars.length)];
      newCode += "-";
      for (let i = 0; i < 4; i++) newCode += chars[Math.floor(Math.random() * chars.length)];
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (days || 30));
      await fetch(`${SUPABASE_URL}/rest/v1/access_codes`, {
        method: "POST",
        headers: { "apikey": SUPABASE_SERVICE_KEY, "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`, "Content-Type": "application/json", "Prefer": "return=representation" },
        body: JSON.stringify({ code: newCode, client_name: client_name || "Kliyan", client_phone: client_phone || "", expires_at: expiresAt.toISOString(), is_active: true, uses: 0 })
      });
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, code: newCode, expires_at: expiresAt.toISOString() }) };
    }
    if (action === "list") {
      const adminKey = event.headers["x-admin-key"];
      if (adminKey !== "HYPERBOT_ADMIN_2026") return { statusCode: 401, headers, body: JSON.stringify({ error: "Aksè refize" }) };
      const res = await fetch(`${SUPABASE_URL}/rest/v1/access_codes?select=*&order=created_at.desc`, {
        headers: { "apikey": SUPABASE_SERVICE_KEY, "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}` }
      });
      const data = await res.json();
      return { statusCode: 200, headers, body: JSON.stringify({ codes: data }) };
    }
    if (action === "deactivate") {
      const adminKey = event.headers["x-admin-key"];
      if (adminKey !== "HYPERBOT_ADMIN_2026") return { statusCode: 401, headers, body: JSON.stringify({ error: "Aksè refize" }) };
      await fetch(`${SUPABASE_URL}/rest/v1/access_codes?code=eq.${encodeURIComponent(code)}`, {
        method: "PATCH",
        headers: { "apikey": SUPABASE_SERVICE_KEY, "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: false })
      });
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Action invalide" }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
