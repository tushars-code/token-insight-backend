// src/index.js
import app from "./app.js";

const PORT = process.env.PORT || 8080;
export const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
