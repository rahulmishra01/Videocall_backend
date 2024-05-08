require("dotenv").config()
const express = require("express");
const cors = require("cors");
const connectDB = require("./database");
const userRoutes = require("./routes/user");
const session = require("express-session");
const http = require('http');
const {Server} = require('socket.io');
const { connect } = require("http2");
const app = express();
const port = process.env.port || 5000
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const availableRooms = [];
const activeRooms = [];

app.use(
  cors({
    origin: process.env.CORS_URL,
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
  console.log("user connected", socket.id)
  socket.on("message", ({ room, message }) => {
    socket.to(room).emit("receive-message", message);
  });

  socket.on("join-room", (roomKey) => {
    let joinedRoom;
    if(availableRooms.length > 0) {
      let availableRoomKey = availableRooms[0];
      joinedRoom = availableRoomKey;
      availableRooms.splice(0,1);
      socket.join(availableRoomKey);
      const room = availableRooms.find((obj) => obj.roomId === availableRoomKey);
      room.connectedUsers.push(socket.id);
    }else{
      socket.join(roomKey);
      joinedRoom = roomKey;
      availableRooms.push(roomKey);
      activeRooms.push({
        roomId: roomKey,
        connectedUsers: [socket.id]
      })
    }
    console.log("user with socket id " , socket.id, "joined room", joinedRoom);
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
  });
});

server.listen(port, () => {
  console.log("app is running this port", port);
});
