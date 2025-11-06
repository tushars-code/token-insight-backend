import request from "supertest";
import app from "../app.js";

describe("HyperLiquid PnL API", () => {
  const demoWallet = "0xD257573De7072634D3a05825ec59aC1b998CE365";

  afterAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  it("should return 400 for missing query params", async () => {
    const res = await request(app).get("/api/hyperliquid/demo/pnl");
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("should return demo PnL for assignment wallet", async () => {
    const res = await request(app)
      .get(`/api/hyperliquid/${demoWallet}/pnl?start=2025-08-01&end=2025-08-06`);
    expect(res.statusCode).toBe(200);
    expect(res.body.wallet.toLowerCase()).toBe(demoWallet.toLowerCase());
    expect(res.body.daily.length).toBe(6);
    expect(res.body.daily[0]).toHaveProperty("equity_usd", 10000);
  });

  it("should handle invalid date format", async () => {
    const res = await request(app)
      .get(`/api/hyperliquid/${demoWallet}/pnl?start=2025-08-01&end=invalid-date`);
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("error", "Invalid date format. Use YYYY-MM-DD");
  });

  it("should handle start date after end date", async () => {
    const res = await request(app)
      .get(`/api/hyperliquid/${demoWallet}/pnl?start=2025-08-10&end=2025-08-01`);
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("error", "Start date cannot be after end date");
  });
});
