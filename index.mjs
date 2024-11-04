import express from "express";
import dotenv from 'dotenv';
import grades from "./routes/grades.mjs";

dotenv.config();

const PORT = 5050;
const app = express();

app.use(express.json());

// The connection to MongoDB is already established in db/conn.mjs

app.get("/", async (req, res) => {
  res.send("Welcome to the API.");
});

app.use("/grades", grades);

// Global error handling
app.use((err, _req, res, next) => {
  console.error(err);
  res.status(500).send("Seems like we messed up somewhere...");
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});
