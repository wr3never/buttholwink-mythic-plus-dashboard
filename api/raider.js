export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ error: "Method not allowed" });
    }

    const region = String(req.query.region || "us").toLowerCase();
    const realm = String(req.query.realm || "illidan");
    const name = String(req.query.name || "Buttholwink");
    const fields = String(
      req.query.fields ||
      [
        "gear",
        "talents",
        "mythic_plus_scores_by_season:current",
        "mythic_plus_best_runs",
        "mythic_plus_recent_runs",
        "mythic_plus_ranks",
        "mythic_plus_weekly_highest_level_runs"
      ].join(",")
    );

    const allowedRegions = new Set(["us", "eu", "kr", "tw", "cn"]);
    if (!allowedRegions.has(region)) {
      return res.status(400).json({ error: "Unsupported region" });
    }
    if (!realm || !name || realm.length > 80 || name.length > 80) {
      return res.status(400).json({ error: "Invalid character" });
    }

    const url = new URL("https://raider.io/api/v1/characters/profile");
    url.searchParams.set("region", region);
    url.searchParams.set("realm", realm);
    url.searchParams.set("name", name);
    url.searchParams.set("fields", fields);

    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Buttholwink-MythicPlus-Dashboard/1.0"
      }
    });

    const text = await response.text();

    // Pass through Raider.IO backoff information so the client behaves correctly.
    const retryAfter = response.headers.get("retry-after");
    if (retryAfter) res.setHeader("Retry-After", retryAfter);

    // Brief edge cache: keeps reloads responsive and reduces unnecessary API calls.
    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=300");
    res.setHeader("Content-Type", response.headers.get("content-type") || "application/json; charset=utf-8");
    return res.status(response.status).send(text);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Raider.IO proxy failed",
      message: error?.message || "Unknown error"
    });
  }
}
