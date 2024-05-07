require("dotenv").config()
const express = require("express");
const cors = require("cors");
const connectDB = require("./database");
const userRoutes = require("./routes/user");
const session = require("express-session");
const http = require('http');
const WebSocket = require('ws');
const app = express();

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());
app.use(
    session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
    })
  );

connectDB();
app.use("/api/user", userRoutes);
app.get("/", (req, res) => {
  res.send("app is running now");
});


wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });
});

app.listen(process.env.port, () => {
  console.log("app is running this port", process.env.port);
});
