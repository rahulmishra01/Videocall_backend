require("dotenv").config()
const express = require("express");
const cors = require("cors");
const connectDB = require("./database");
const userRoutes = require("./routes/user");
const session = require("express-session");
const http = require('http');
const {Server} = require('socket.io');
const app = express();
const port = process.env.PORT || 5000
const server = http.createServer(app);
const { ExpressPeerServer } = require('peer');

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

const peerServer = ExpressPeerServer(server, {
  port: port,
  path: '/peerjs',
  debug: true,
});

peerServer.on('connection', (client) => {
  console.log('Peer connected: ', client.id);
});

peerServer.on('disconnect', (client) => {
  console.log('Peer disconnected: ', client.id);
});

peerServer.on('error', (err) => {
  console.error('PeerJS error: ', err);
});


const availableRooms = [];
const activeRooms = [];

app.use(
  cors({
    origin: process.env.CORS_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
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
app.use('/peerjs', peerServer);



connectDB();
app.use("/api/user", userRoutes);
app.get("/", (req, res) => {
  res.send("app is running now");
});

io.on("connection", (socket) => {
  socket.on("message", ({ room, message }) => {
    console.log("🚀 ~ socket.on ~ room:", room, message)
    socket.to(room).emit("receive-message", message);
  });

  socket.on("join-room", (roomKey) => {
    let joinedRoom;
    let isWaiting = true;    
    if(availableRooms.length > 0) {
      let availableRoomKey = availableRooms[0];
      const roomObj = activeRooms.find((obj) => obj.roomId === availableRoomKey);
      if(!roomObj.connectedUsers.includes(socket.id) ){
        isWaiting=false
        joinedRoom = availableRoomKey;
        availableRooms.splice(availableRooms.indexOf(availableRoomKey),1);
        socket.join(availableRoomKey);
        roomObj.connectedUsers.push(socket.id);
      }
    }else{
      socket.join(roomKey);
      joinedRoom = roomKey;
      isWaiting=true
      availableRooms.push(roomKey);
      activeRooms.push({
        roomId: roomKey,
        connectedUsers: [socket.id]
      })
    }
    console.log(activeRooms);
    console.log(availableRooms);
    io.to(joinedRoom).emit("joined-room", {joinedRoom, flag:isWaiting})
  });

  socket.on("leave-room", (roomId) => {
    socket.leave(roomId);
  });

  socket.on("exit-chat" , (roomId) => {
    socket.leave(roomId);
    const roomObj = activeRooms.find( (obj) => obj.roomId === roomId);
    if(roomObj){
      activeRooms.splice(activeRooms.indexOf(roomObj), 1);
    }
    if(availableRooms.includes(roomId)){
      availableRooms.splice(availableRooms.indexOf(roomId), 1);
    }
    io.to(roomId).emit("chat-closed", {leavedUser : socket.id, roomKey : roomId})
    console.log("availableRooms, activeRooms===========>",availableRooms, activeRooms);
  })

  socket.on("disconnect", () => {
    const roomObj = activeRooms.find((obj) => obj.connectedUsers.includes(socket.id));
    const roomKey = roomObj?.roomId;
    if(roomObj) {
      io.to(roomObj.roomId).emit("user-disconnected", {disconnectedUser: socket.id});
      activeRooms.splice(activeRooms.indexOf(roomObj),1);
    }
    if(roomKey){
      const index = availableRooms.indexOf(roomKey);
      availableRooms.splice(index,1);
    }
  });
});

server.listen(port, () => {
  console.log("app is running this port", port);
});
