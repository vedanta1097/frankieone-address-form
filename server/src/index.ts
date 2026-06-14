import "dotenv/config";
import express from "express";
import cors from "cors";
import addressesRouter from "./routes/addresses";
import placesRouter from "./routes/places";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.use("/api/addresses", addressesRouter);
app.use("/api/places", placesRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
