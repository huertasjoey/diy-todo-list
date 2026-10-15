// All data and accounts live in Supabase, and the browser talks to it directly.
// This server only hosts the built frontend (for single-service deploys like `npm start`).
import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, "../../frontend/dist");
const PORT = process.env.PORT || 5003;

if (!fs.existsSync(path.join(dist, "index.html"))) {
  console.error("frontend/dist not found. Build the frontend first: npm run build");
  process.exit(1);
}

const app = express();
app.disable("x-powered-by");

app.use(express.static(dist));
// single-page app: any other path gets index.html so /login, /register etc. work on refresh
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(dist, "index.html"));
});

app.listen(PORT, () => {
  console.log("Serving the planner on PORT:", PORT);
});
