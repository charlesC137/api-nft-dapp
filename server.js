const express = require("express");
const http = require("http");

const cors = require("cors");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");

require("dotenv").config();

const startNFTListener = require("./listeners/ethers.js");
const { setupWebSocketServer } = require("./listeners/websocket.js");

const app = express();
app.use(
  cors({
    origin: "http://localhost:4200",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static("uploads"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected");

    //Start listening to blockchain
    await startNFTListener();
    console.log("NFT listener started");
  })
  .catch((err) => console.error("MongoDB error", err));

const routes = require("./routes/index");
app.use(routes);

app.get("/", (req, res) => {
  res.sendStatus(200);
});

app.use("/uploads", express.static("uploads"));

const server = http.createServer(app);

setupWebSocketServer(server);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server and WebSocket running on port ${PORT}`);
});
