"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var socket_io_client_1 = require("socket.io-client");
var socket = (0, socket_io_client_1.io)("http://localhost:4400");
socket.on("connect", function () {
    console.log("Connected to server:", socket.id);
});
socket.on("disconnect", function () {
    console.log("Disconnected");
});
