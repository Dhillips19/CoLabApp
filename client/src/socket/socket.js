import { io } from "socket.io-client";

// create a socket connection to the server
const socket = io("http://localhost:3001", { autoConnect: false });

export default socket;