import request from "supertest";
import app from "../app.js";
import * as aiService from "../services/aiService.js";
import axios from "axios";

// Mock network calls
jest.mock("../services/aiService.js");
jest.mock("axios");

describe("Token Insight API", () => {
  beforeAll(() => {
    // Mock AI service
    aiService.getAIInsights.mockResolvedValue({
      reasoning: "Mocked reasoning for testing",
      sentiment: "Neutral",
    });

    // Mock CoinGecko API
    axios.get.mockResolvedValue({
      data: {
        id: "bitcoin",
        symbol: "btc",
        name: "Bitcoin",
        market_data: {
          current_price: { usd: 50000 },
          market_cap: { usd: 1_000_000_000 },
          total_volume: { usd: 50_000_000 },
          price_change_percentage_24h: 1.5,
        },
      },
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it("should fetch token insight successfully", async () => {
    const res = await request(app)
      .post("/api/token/bitcoin/insight")
      .send({ vs_currency: "usd", history_days: 7 });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body).toHaveProperty("insight");
    expect(res.body.token.id).toBe("bitcoin");
  });

  it("should return 404 if token id missing", async () => {
    const res = await request(app).post("/api/token//insight");
    expect(res.statusCode).toBe(404);
  });

  it("should fallback to synthesized AI insight if model fails", async () => {
    const res = await request(app)
      .post("/api/token/bitcoin/insight")
      .send({ vs_currency: "usd" });

    expect(res.body.insight).toHaveProperty("reasoning");
    expect(res.body.insight).toHaveProperty("sentiment");
  });
});
