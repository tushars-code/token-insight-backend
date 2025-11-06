# Token Insight Backend
### > AI-Powered Crypto Analytics API (Assignment Submission)

This project is a **backend engine** that generates cryptocurrency insights using **AI models from Hugging Face** and integrates **real-time market data** from **CoinGecko** and **HyperLiquid Testnet**.

<img width="1393" height="981" alt="image" src="https://github.com/user-attachments/assets/f3072920-29a5-4b67-a5a8-5b962e5e1455" />
<img width="1607" height="1023" alt="image" src="https://github.com/user-attachments/assets/cb073f97-5b6b-48c9-89f5-00bb80913427" />

It demonstrates:

- Integration of external financial APIs  
- Hugging Face model-based prompt/response generation  
- Clean service-layer architecture  
- Jest + Supertest based testing  
- Docker-ready backend  

---

##  Features

| Module | Description |
| :--- | :--- |
| **/api/token/:id/insight** | Fetches market data from CoinGecko and generates reasoning + sentiment using AI |
| **/api/hyperliquid/:wallet/pnl** | Calculates daily PnL (Profit & Loss) for a wallet using HyperLiquid data |
| **AI Model (Hugging Face)** | Uses HuggingFaceTB/SmolLM2-1.7B-Instruct for reasoning and sentiment generation |
| **Automated Tests** | Jest + Supertest tests for routes, services, and AI logic |

---

## Folder Structure

```bash
TOKEN-INSIGHT-BACKEND/
│
├── src/
│   ├── routes/
│   │   ├── hyperliquid.js        # Route for PnL API
│   │   └── token.js              # Route for token insight
│   ├── services/
│   │   ├── aiService.js          # AI model integration logic
│   │   ├── coingeckoService.js   # Market data + AI reasoning
│   │   └── hyperliquidService.js # PnL computation logic
│   ├── tests/
│   │   ├── hyperliquid.test.js   # Unit tests for PnL route
│   │   └── token.test.js         # Unit tests for token insight
│   ├── app.js                    # Express app setup
│   └── index.js                  # Server entrypoint
│
├── .env
├── Dockerfile
├── docker-compose.yml
├── package.json
├── postman_collection.json
├── README.md
└── .gitignore
```

---

## Installation & Setup

### 1️⃣ Clone and Install

```bash
git clone <repo-url>
cd TOKEN-INSIGHT-BACKEND
npm install
```

### 2️⃣ Setup Environment Variables

Create a `.env` file in the root directory and add the following:

```ini
PORT=8081
HF_ACCESS_TOKEN=your_huggingface_token_here
AI_MODEL=HuggingFaceTB/SmolLM2-1.7B-Instruct
AI_MODEL_PROVIDER=huggingface
AI_TEMP=0.3
AI_TOP_P=0.95
HYPERLIQUID_API_BASE=https://api.hyperliquid-testnet.xyz
```

Get your Hugging Face Access Token from 👉 [https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)

### 3️⃣ Run Server

```bash
npm start
```

Server will start at 👉 [http://localhost:8081](http://localhost:8081)

---

## AI Setup Logic — `src/services/aiService.js`

This module is the **core intelligence layer** that powers the backend. It leverages **Hugging Face’s Transformers JS pipeline** to load and interact with large language models.

### 1️⃣ Model Initialization (Lazy Loading)

```javascript
import { pipeline } from "@huggingface/transformers";

let generator;

export async function loadAIModel() {
  if (!generator) {
    console.log("🔹 Loading AI model...");
    generator = await pipeline(
      "text-generation",
      process.env.AI_MODEL || "HuggingFaceTB/SmolLM2-1.7B-Instruct",
      { use_auth_token: process.env.HF_ACCESS_TOKEN }
    );
  }
  return generator;
}
```

- The model loads only once and remains cached in memory (singleton pattern).  
- Lazy loading improves startup time and reduces RAM usage.  
- Uses **HF_ACCESS_TOKEN** for private model access.  

---

### 2️⃣ Prompt Engineering

A structured prompt is generated using live crypto data (from CoinGecko or HyperLiquid):

```javascript
const prompt = `
Analyze ${tokenName} (${symbol}):
Price: $${price} | Change: ${change}% | Volume: $${volume} | Market Cap: $${marketCap}

Respond in JSON with "reasoning" and "sentiment".
`;
```

This ensures consistency, guiding the AI model to output structured JSON-like insights.

---

### 3️⃣ Response Generation

```javascript
const output = await generator(prompt, { 
  max_new_tokens: 300,
  temperature: process.env.AI_TEMP || 0.3,
  top_p: process.env.AI_TOP_P || 0.95
});
```

- **Temperature**: Controls creativity  
- **Top_p**: Nucleus sampling threshold for diversity  
- **max_new_tokens**: Ensures concise reasoning  

---

### 4️⃣ Response Parsing

```javascript
const cleaned = output[0].generated_text
  .replace(/.*?\{/, "{")
  .replace(/\}.*$/, "}");

let parsed;
try {
  parsed = JSON.parse(cleaned);
} catch {
  parsed = { reasoning: "AI model response incomplete", sentiment: "Neutral" };
}
```

- Extracts clean JSON between `{}` braces  
- Provides fallback if parsing fails  
- Guarantees stable API response structure  

---

### 5️⃣ Fallback & Recovery

```javascript
if (!parsed.sentiment) {
  parsed = {
    reasoning: "Unable to analyze AI output. Market movement moderate.",
    sentiment: "Neutral"
  };
}
```

Ensures the `/api/token/:id/insight` endpoint never crashes and always returns a valid JSON response.

---

### 6️⃣ Performance Optimization

- Model is kept **persistent in memory** (singleton pattern)  
- Prompt and output sizes are capped for predictable latency  
- Ideal for **Dockerized environments** with limited memory (1–2GB)  

---

## Token Insight Logic — `src/services/coingeckoService.js`

- Fetches real-time market data from **CoinGecko API**  
- Builds concise AI prompt using:  
  - Current Price  
  - Market Cap  
  - Volume  
  - 24h Price Change  

**Example Prompt**  
```
Analyze Bitcoin (BTC):
Price: $50000 | Change: +1.5% | Volume: $50M | Market Cap: $1B
```

**AI Output**
```json
{
  "reasoning": "Bitcoin shows upward momentum with moderate trading volume.",
  "sentiment": "Bullish"
}
```

---

## HyperLiquid Logic — `src/services/hyperliquidService.js`

- Calculates **daily PnL** using wallet data from **HyperLiquid Testnet**  
- Returns **mock data** for demo wallets  
- Otherwise fetches real data from:  
  - `/wallets/:wallet/trades`  
  - `/wallets/:wallet/positions`  
  - `/wallets/:wallet/funding`  

Simulated PnL provides insight-like analytics even without live credentials.

---

## Testing Setup

### Run Tests
```bash
npm test
```

### Frameworks Used
- **Jest** — Unit testing  
- **Supertest** — API endpoint integration testing  

**Example Test (`token.test.js`)**:  
- Mocks AI & API responses  
- Tests:
  - Successful API call  
  - Missing parameters  
  - AI fallback logic  

---

## Docker Setup (Optional)

### Build & Run
```bash
docker build -t token-insight-backend .
docker run -p 8081:8081 token-insight-backend
```

or simply:
```bash
docker-compose up --build
```

---

##  .gitignore (Recommended)

```gitignore
# Node
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Env
.env
.DS_Store

# Coverage and Tests
coverage/
jest-report.xml

# Docker
*.pid
logs/
tmp/
*.log

# System
.vscode/
.idea/
```

---

## Evaluator Notes

 **Main Concept** – Demonstrates full integration of AI reasoning + financial data  
 **AI Model Used** – HuggingFaceTB/SmolLM2-1.7B-Instruct  
 **Testing** – Jest + Supertest ensure reliability  
 **Architecture** – Modular, Docker-ready, and scalable  
 **Focus** – Prompt–Response AI generation with fallback logic  

---

## Developer

**Tushar Yerne**  
MIT WPU, Pune   
Full Stack Developer | AI Integration | API Engineering  
