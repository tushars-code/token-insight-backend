import axios from "axios";
import { getAIInsights } from "./aiService.js";

export async function getTokenInsight(id, vs_currency = "usd", history_days = 30) {
  try {
    // Fetch CoinGecko data
    const { data } = await axios.get(
      `https://api.coingecko.com/api/v3/coins/${id}?localization=false`
    );

    if (!data?.market_data) {
      return { error: `CoinGecko returned no market data for id: ${id}` };
    }

    const market = data.market_data;
    const price = market.current_price?.[vs_currency] ?? market.current_price?.usd ?? null;
    const change = Number(market.price_change_percentage_24h ?? 0);
    const volume = market.total_volume?.[vs_currency] ?? market.total_volume?.usd ?? 0;
    const marketCap = market.market_cap?.[vs_currency] ?? market.market_cap?.usd ?? 0;

    // Build AI prompt
   const prompt = `You are a cryptocurrency market analyst.
Analyze ${data.name} (${data.symbol.toUpperCase()}) using these stats:
- Current Price: ${price} ${vs_currency.toUpperCase()}
- Market Cap: ${marketCap} USD
- 24h Change: ${change}%
- Total Volume: ${volume} USD

Return ONLY a JSON object with:
{
  "reasoning": "1-2 sentence concise explanation of market trend and volume context based on the stats above",
  "sentiment": "Bullish | Bearish | Neutral"
}
Do not include any template text or instructions in the output.
`.trim();


    let aiInsight = await getAIInsights(prompt);
    function synthesizeReasoning() {
      let sentiment = "Neutral";
      if (change >= 0.6) sentiment = "Bullish";
      else if (change <= -0.6) sentiment = "Bearish";

      const ratio = marketCap > 0 ? volume / marketCap : 0;
      let volumeDesc = "low volume";
      if (ratio > 0.02) volumeDesc = "very high trading volume";
      else if (ratio > 0.005) volumeDesc = "elevated trading volume";
      else if (ratio > 0.001) volumeDesc = "moderate trading volume";

      const direction =
        sentiment === "Bullish"
          ? `Price is up ${change.toFixed(2)}% in 24h, suggesting short-term bullish momentum.`
          : sentiment === "Bearish"
          ? `Price is down ${Math.abs(change).toFixed(2)}% in 24h, indicating short-term bearish pressure.`
          : `Price moved ${change.toFixed(2)}% in 24h, showing limited directional bias.`;

      const behavior = `The ${volumeDesc} relative to market cap ${
        marketCap ? `(${(ratio * 100).toFixed(2)}%)` : ""
      } suggests ${ratio > 0.005 ? "active trading." : "limited conviction among traders."}`;

      return { reasoning: `${direction} ${behavior}`, sentiment };
    }

    const PLACEHOLDER_TEXT = "1-2 sentence concise explanation of market trend and volume context";

    const isInvalidAI =
      !aiInsight ||
      !aiInsight.reasoning ||
      aiInsight.reasoning.length < 20 ||
      /analyze|provide|return/i.test(aiInsight.reasoning) ||
      aiInsight.reasoning.includes(PLACEHOLDER_TEXT);

    const finalInsight = isInvalidAI ? synthesizeReasoning() : aiInsight;

    return {
      source: "coingecko",
      token: {
        id: data.id,
        symbol: data.symbol,
        name: data.name,
        market_data: {
          current_price_usd: market.current_price?.usd ?? null,
          market_cap_usd: market.market_cap?.usd ?? null,
          total_volume_usd: market.total_volume?.usd ?? null,
          price_change_percentage_24h: market.price_change_percentage_24h ?? null,
        },
      },
      insight: finalInsight,
      model: {
        provider: process.env.AI_MODEL_PROVIDER || "huggingface",
        model: process.env.AI_MODEL || "HuggingFaceTB/SmolLM2-1.7B-Instruct",
      },
    };
  } catch (err) {
    console.error("getTokenInsight error:", err?.response?.data ?? err?.message ?? err);
    return { error: "Failed to fetch token data or generate insight" };
  }
}
