const socketIo = require("socket.io");

let io;

function setupWebSocketServer(server) {
  io = socketIo(server, {
    cors: {
      origin: "http://localhost:4200",
      methods: ["GET"],
    },
  });
}

function getIo() {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
}

function emitNFTMinted(payload) {
  if (io) {
    io.emit("nft-minted", payload);
    console.log("Emitted nft-minted event:", payload.nftId);
  } else {
    console.warn("WebSocket not initialized yet");
  }
}

module.exports = { setupWebSocketServer, getIo, emitNFTMinted };
