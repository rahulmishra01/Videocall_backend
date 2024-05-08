require("dotenv").config()
const express = require("express");
const cors = require("cors");
const connectDB = require("./database");
const userRoutes = require("./routes/user");
const session = require("express-session");
const http = require('http');
const {Server} = require('socket.io')
const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const activeRooms = [];

app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  })
);
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

io.on("connection", (socket) => {
  socket.on("message", ({ room, message }) => {
    socket.to(room).emit("receive-message", message);
  });

  socket.on("join-room", (roomKey) => {
    if(activeRooms.length > 0) {
      let activeRoomKey = activeRooms[0];
      activeRooms.splice(0,1);
      console.log
      socket.join(activeRoomKey)
    }else{
      socket.join(roomKey);
      activeRooms.push(roomKey);
    }
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
  });
});

server.listen(process.env.port, () => {
  console.log("app is running this port", process.env.port);
});
