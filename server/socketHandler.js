import { Server } from "socket.io";
import * as Y from "yjs";
import { loadDocument, saveDocument, updateDocumentTitle } from "./controllers/documentController.js";
import { loadChatMessages, saveChatMessage } from "./controllers/chatController.js";

// store room specific document data and users
const roomData = {};
const roomUsers = {}

export default function initialiseSocket(server) {
    // create a new socket.io server
    const io = new Server(server, {
        cors: {
            origin: "http://localhost:3000",
        },
    });

    // handle socket connections
    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.id}`);

        // handle joining a document room
        // the documentId, username, and colour are passed from the client
        socket.on('joinDocumentRoom', async ({ documentId, username, colour }) => {
            
            try {
                console.log(`User ${username}, ${colour}, attempting to join document: ${documentId}`);
                
                // check if the user is already in the room
                if (socket.joinedRooms?.has(documentId)) {
                    console.log(`Socket ${socket.id} already joined ${documentId}, skipping.`);
                    return;
                }

                // add the user to the joinedRooms set
                socket.joinedRooms = socket.joinedRooms || new Set();
                socket.joinedRooms.add(documentId);
                
                try {
                    // join the client socket to the document room
                    console.log(`User ${socket.id} joined document room: ${documentId}`);
                    socket.join(documentId);

                    // check if the document is already loaded in memory
                    if (!roomData[documentId]) {

                        // load the document from the database
                        const docData = await loadDocument(documentId);

                        // if document is not found, emit the document error message and return
                        if (!docData || !docData.ydoc) {
                            console.error(`Error: Document ${documentId} could not be loaded.`);
                            socket.emit("documentError", {
                                error: "Document not found",
                                code: "DOCUMENT_NOT_FOUND"
                            });
                            return;
                        }
                        // add the document to the roomData object
                        roomData[documentId] = { ydoc: docData.ydoc, documentTitle: docData.documentTitle, timer: null };

                        // save the document state to the database every 10 seconds
                        roomData[documentId].timer = setInterval(async () => {
                            console.log(`Auto-saving document ${documentId} to database.`);
                            await saveDocument(documentId, roomData[documentId].ydoc);
                        }, 10000);
                    }

                    // get the Yjs document and title from the roomData object
                    const { ydoc, documentTitle } = roomData[documentId];

                    // create roomUsers object if it doesn't exist
                    if (!roomUsers[documentId]) {
                        roomUsers[documentId] = {};
                    }

                    // check if user already exists in the room
                    const userAlreadyExists = Object.values(roomUsers[documentId]).some(
                        (user) => user.username === username
                    );

                    // add user if they do not exist
                    if (!userAlreadyExists) {
                        roomUsers[documentId][socket.id] = { username, colour };
                    }
                    console.log(`Users in room ${documentId}:`, roomUsers[documentId]);

                    // broadcast the updated user list to all users in the room
                    io.to(documentId).emit("updateUsers", Object.values(roomUsers[documentId]));

                    // send the initial document state and the document title
                    socket.emit("initialState", Y.encodeStateAsUpdate(ydoc));
                    socket.emit("updateTitle", documentTitle);

                    // load the chat messages from the database and send them to the client
                    try {
                        const chatHistory = await loadChatMessages(documentId);
                        socket.emit("loadMessages", chatHistory);
                    } catch (error) {
                        console.error(`Error loading chat for ${documentId}:`, error);
                    }

                    // check if the socket already has an update listener
                    // if not, add the update listener to the socket
                    // this prevents multiple listeners from being added to the same socket
                    if (!socket.hasUpdateListener) {
                        socket.on("update", (update) => {
                            Y.applyUpdate(ydoc, new Uint8Array(update));
                            socket.to(documentId).emit("update", update);
                        });
                        socket.hasUpdateListener = true; // Prevent duplicate listeners
                    }

                    // disconnedt event for the socket
                    socket.on("disconnect", () => {
                        console.log(`User ${socket.id} disconnected from document: ${documentId}`);
                    });

                // if there is an error loading the document, emit the document error message
                } catch (error) {
                    console.error(`Error handling document ${documentId}:`, error);
                    socket.emit("documentError", {
                        error: "Document not found",
                        code: "DOCUMENT_NOT_FOUND",
                    });
                }
                //if there is an error joining the document room, log the error
            } catch (error) {
                console.error(`Error joining document room ${documentId}:`, error);
            }    
        });

        // socket listener for awareness updates
        socket.on('awareness-update', ({ documentId, update }) => {
            socket.to(documentId).emit('awareness-update', { update });
        });
          
        // socket listener to handle title updates
        socket.on("updateTitle", async ({ documentId, title }) => {
            if (!documentId || !title) return console.warn("Invalid title update request.");

            // find the document in roomData and update its title
            if (roomData[documentId]) {
                console.log(`Title updated: ${title}`);
                roomData[documentId].documentTitle = title;

                // emit the title update to all users in the room
                io.to(documentId).emit("updateTitle", title);

                try {
                    await updateDocumentTitle(documentId, title);
                } catch (error) {
                    console.error("Failed to update document title:", error);
                }
            }
        });

        // socket listener to handle chat messages
        socket.on("sendMessage", async ({ documentId, username, message }) => {
            if (!documentId || !message || !username) return;

            // chat message structure
            const chatMessage = { username, message, timestamp: new Date() };

            // save the chat message to the database
            // and emit the message to all users in the room
            try {
                await saveChatMessage(documentId, chatMessage);
                io.to(documentId).emit("receiveMessage", chatMessage);
            } catch (error) {
                console.error(`Failed to save chat message:`, error);
            }
        });

        // socket listener to handle user navigating away from the document page
        socket.on('leaveDocumentRoom', (documentId) => {
            console.log(`User ${socket.id} explicitly leaving document room: ${documentId}`);
            
            // leave the document room
            socket.leave(documentId);

            // remove the user from the roomUsers object
            if (roomUsers[documentId]) {
                delete roomUsers[documentId][socket.id];
                
                // broadcast the updated user list to all users in the room
                io.to(documentId).emit("updateUsers", Object.values(roomUsers[documentId]));
                
                // logs for debugging
                console.log(`Users in room ${documentId}:`, roomUsers[documentId]);
                console.log(`Users remaining in room ${documentId}:`, Object.keys(roomUsers[documentId]).length);
                
                // if there are no users left in the room, clean up the room data
                if (Object.keys(roomUsers[documentId]).length === 0) {
                    console.log(`Last user left room ${documentId}, cleaning up`);
                    
                    // check if the document is in roomData and save it
                    if (roomData[documentId]) {
                        // clear the auto-save timer if it exists
                        if (roomData[documentId].timer) {
                            clearInterval(roomData[documentId].timer);
                            roomData[documentId].timer = null;
                        }
                        
                        // save the document to the database
                        saveDocument(documentId, roomData[documentId].ydoc)
                            .then(() => {
                                console.log(`Document ${documentId} saved when all users have left`);
                                delete roomData[documentId];
                            })
                            .catch(error => console.error(`Error saving document ${documentId} when all users have left`, error));
                    }
                }
            }
        });

        // handles potential unexpected disconnections from the document page
        socket.on('disconnecting', async () => {
            
            // check if the socket is in any document rooms
            const documentRooms = Array.from(socket.rooms).filter((room) => room !== socket.id);

            // for the document rooms the socket is in, check if there are any other users in the room
            for (const room of documentRooms) {
                console.log(`Checking cleanup for room: ${room}`);
                
                // check if the room has any other users besides the disconnection socket
                const roomClients = await io.in(room).fetchSockets();
                
                // if there are no other users in the room, clean up the room data
                if (roomClients.length <= 1) { 
                    console.log(`Last user leaving room ${room}, saving and cleaning up.`);
                    
                    // check if the document is in roomData
                    if (roomData[room]) {
                        // remove the auto-save timer if it exists
                        if (roomData[room].timer) {
                            console.log(`Clearing auto-save timer for document ${room}`);
                            
                            clearInterval(roomData[room].timer);
                            roomData[room].timer = null; // prevent double-clears
                        }
                        
                        // save the document to the database
                        await saveDocument(room, roomData[room].ydoc);

                        // delete the document from roomData
                        delete roomData[room];
                    }

                    // check if the roomUsers object exists for the room
                    if (roomUsers[room]) {

                        // remove the user from the roomUsers object
                        delete roomUsers[room][socket.id];

                        // broadcast the updated user list to all users in the room
                        io.to(room).emit("updateUsers", Object.values(roomUsers[room]));
                    }
                } else {
                    console.log(`Other users in room ${room}, no clean up needed`);
                }
            }
        });
    });

    return io;
};