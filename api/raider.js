export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Dedicated Yaden dashboard: always sync Buttholwink on US-Illidan.
  const region = "us";
  const realm = "illidan";
  const name = "Buttholwink";

  // Only request fields the dashboard currently consumes.
  // Keeping this list small makes the endpoint less fragile if Raider.IO changes optional fields.
  const fields = [
    "gear",
    "mythic_plus_scores_by_season:current",
    "mythic_plus_best_runs",
    "mythic_plus_recent_runs",
    "mythic_plus_ranks"
  ].join(",");

  try {
    const url = new URL("https://raider.io/api/v1/characters/profile");
    url.searchParams.set("region", region);
    url.searchParams.set("realm", realm);
    url.searchParams.set("name", name);
    url.searchParams.set("fields", fields);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "Yaden-MythicPlus-Dashboard/1.1"
      }
    });

    const text = await response.text();
    const retryAfter = response.headers.get("retry-after");
    if (retryAfter) res.setHeader("Retry-After", retryAfter);

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=180");
    res.setHeader("Content-Type", "application/json; charset=utf-8");

    if (!response.ok) {
      let upstream = text;
      try { upstream = JSON.parse(text); } catch (_) {}
      return res.status(response.status).json({
        error: "Raider.IO request failed",
        message: typeof upstream === "object"
          ? (upstream.message || upstream.error || `Raider.IO HTTP ${response.status}`)
          : `Raider.IO HTTP ${response.status}`,
        status: response.status
      });
    }

    return res.status(200).send(text);
  } catch (error) {
    console.error("Raider.IO proxy error:", error);
    return res.status(500).json({
      error: "Raider.IO proxy failed",
      message: error?.message || "Unknown server error"
    });
  }
}
