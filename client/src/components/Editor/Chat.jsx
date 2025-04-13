import React, { useState, useEffect, useRef } from "react";
import socket from "../../socket/socket";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faCommentDots } from "@fortawesome/free-solid-svg-icons";
import "../../styles/Chat.css";

// function for live-chat component
const Chat = ({ documentId, username }) => {
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const messagesEndRef = useRef(null); // reference to the end of the messages list

    // function to manage scroll
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // useEffect to manage socket events
    useEffect(() => {
        if (!socket) return;

        // load chat history when component mounts
        socket.on("loadMessages", (chatHistory) => {
            // update messages state
            setMessages(chatHistory);
            // scroll to bottom 100ms after message send
            setTimeout(scrollToBottom, 100);
        });

        // listen for new messages from other users
        socket.on("receiveMessage", (newMessage) => {
            // add new message to end of messages array
            setMessages((prevMessages) => [...prevMessages, newMessage]);
            // scroll to bottom 100ms after message send
            setTimeout(scrollToBottom, 100); 
        });

        // cleanup function to turn off listeners
        return () => {
            socket.off("loadMessages");
            socket.off("receiveMessage");
        };
    }, []);

    // scroll to bottom whenever change to messages array occurs
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // function to send message
    const sendMessage = (e) => {
        e.preventDefault();
        if (message.trim() === "") return;
        
        // message structure
        const newMessage = { 
            documentId, 
            username, 
            message,
            timestamp: new Date().toISOString()
        };

        // emit message to server
        socket.emit("sendMessage", newMessage);
        setMessage("");
    };

    // handle user pressing enter to send messages
    // shift + enter goes to next line and does not submit
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(e);
        }
    };

    // display live-chat 
    return (
        <div className="chat-container">
            {/* button to open chat panel - when open an X is displayed */}
            <button className="chat-toggle" onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? <FontAwesomeIcon icon={faTimes} /> : <FontAwesomeIcon icon={faCommentDots} />}
            </button>

            {/* when button to open chat pannel is clicked */}
            {isOpen && (
                <div className="chat-panel">
                    {/* header of chat panel - displays number of messages */}
                    <div className="chat-panel-header">
                        <span>Document Chat</span>
                        <span>{messages.length} message(s)</span>
                    </div>
                    
                    {/* map through messages array and display each message */}
                    {/* display messages with username, message text and timestamp */}
                    {/* if message is from current user, set differnent class name to display on the right */}
                    <div className="chat-messages">
                        {messages.map((msg, index) => (
                            <div 
                                key={index} 
                                className={`chat-message ${msg.username === username ? "own-message" : ""}`}
                            >
                                <strong>{msg.username}</strong>
                                <p>{msg.message}</p>
                                <small>{new Date(msg.timestamp).toLocaleString('en-GB')}</small>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                    
                    {/* input field for user to type message */}
                    <form className="chat-input" onSubmit={sendMessage}>
                        <input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a message..."
                        />
                        <button type="submit">Send</button>
                    </form>
                </div>
            )}
        </div>
    );
};

// export compononent for use
export default Chat;