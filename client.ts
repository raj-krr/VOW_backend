import { io } from "socket.io-client";

const socket = io("http://localhost:4400");

socket.on("connect", () => {
  console.log("Connected to server:", socket.id);
});

socket.on("disconnect", () => {
  console.log("Disconnected");
});
