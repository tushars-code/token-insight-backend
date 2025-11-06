import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import tokenRoutes from "./routes/token.js";
import hyperliquidRoutes from "./routes/hyperliquid.js";

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use("/api/token", tokenRoutes);
app.use("/api/hyperliquid", hyperliquidRoutes);

app.get("/", (req, res) => {
  res.json({ message: "✅ Token Insight Backend API running!" });
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

export default app;
