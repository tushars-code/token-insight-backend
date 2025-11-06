import express from "express";
import { getWalletPnL } from "../services/hyperliquidService.js";
import { parseISO, isValid } from "date-fns";

const router = express.Router();

router.get("/:wallet/pnl", async (req, res) => {
  try {
    const { wallet } = req.params;
    const { start, end } = req.query;

    // Basic validation
    if (!wallet || !start || !end) {
      return res.status(400).json({ error: "Missing wallet, start, or end date" });
    }

    const startDate = parseISO(start);
    const endDate = parseISO(end);
    if (!isValid(startDate) || !isValid(endDate)) {
      return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
    }

    if (startDate > endDate) {
      return res.status(400).json({ error: "Start date cannot be after end date" });
    }

    // Fetch wallet PnL
    const data = await getWalletPnL(wallet, start, end);

    // Handle empty or invalid data
    if (!data || !data.daily) {
      return res.status(500).json({
        error: "Failed to fetch wallet PnL",
        diagnostics: data?.diagnostics || null,
      });
    }

    res.json(data);
  } catch (error) {
    console.error("HyperLiquid PnL route error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch PnL" });
  }
});

export default router;
