import express from "express";
import { getTokenInsight } from "../services/coingeckoService.js";

const router = express.Router();
router.post("/:id/insight", async (req, res) => {
  try {
    const { id } = req.params;
    const { vs_currency = "usd", history_days = 30 } = req.body || {};

    if (!id) return res.status(400).json({ error: "Missing token id in params" });

    const result = await getTokenInsight(id, vs_currency, history_days);

    if (result?.error) return res.status(500).json(result);

    res.json(result);
  } catch (error) {
    console.error("Token insight route error:", error);
    res.status(500).json({ error: "Failed to fetch token insight" });
  }
});

export default router;
