require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const productRoutes = require("./src/routes/productRoutes");
const errorHandler = require("./src/middleware/errorHandler");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({ message: "Inventory API is running" });
});

app.use("/api/products", productRoutes);

// 404 handler for unknown API routes.
app.use("/api", (req, res) => {
  res.status(404).json({ message: "API route not found" });
});

// Centralized error handler must be registered after routes.
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI is missing. Configure it in your .env file.");
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => console.log(`Inventory server running at http://localhost:${PORT}`));
  })
  .catch(error => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });
