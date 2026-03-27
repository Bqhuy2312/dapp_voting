const express = require("express");
const cors = require("cors");
const path = require("path");
const app = express();
const uploadRoutes = require("./routes/uploadRoutes");
const electionRoutes = require("./routes/electionRoutes");
const candidateRoutes = require("./routes/candidateRoutes");
const voteRoutes = require("./routes/voteRoutes");

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.send("API Running");
});

app.use("/api/upload", uploadRoutes);
app.use("/api/elections", electionRoutes);
app.use("/api/candidates", candidateRoutes);
app.use("/api/votes", voteRoutes);

app.listen(5000, () => console.log("Server started"));
