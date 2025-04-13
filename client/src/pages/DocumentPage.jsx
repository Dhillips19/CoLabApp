import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

// import components for the document page
import Editor from "../components/Editor/Editor";
import Chat from "../components/Editor/Chat";
import DocumentTitle from "../components/Editor/DocumentTitle";
import UserList from "../components/Editor/UserList";
import ManageCollaborators from "../components/Editor/ManageCollaborators"
import Export from "../components/Editor/Export";

// import socket instance from socket.js
import socket from "../socket/socket"; 

import "../styles/DocumentPage.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";

export default function DocumentPage() {
    // get document ID from URL
    const {documentId} = useParams();

    // useNavigate hook to navigate pages
    const navigate = useNavigate();

    // state variables
    const [username, setUsername] = useState("");
    const [isDocumentOwner, setIsDocumentOwner] = useState(false);
    const [colour, setColour] = useState("");
    const [activeUsers, setActiveUsers] = useState([]);
    const [showManageCollaborators, setShowManageCollaborators] = useState(false);
    const [documentLoading, setDocumentLoading] = useState(true);
    const [error, setError] = useState("");

    // refs for DOM elements
    const collaboratorRef = useRef(null);
    const quillRef = useRef(null);
    const titleRef = useRef(null);

    // function to verify the document id in url and check if user has access to it
    // also sets up socket connection
    useEffect(() => {
        const verifyDocument = async () => {
            try {
                setDocumentLoading(true);
                setError("");

                // check if user is logged in
                const token = localStorage.getItem("token");
                if (!token) {
                    navigate("/login");
                    return;
                }
                
                // Verify document ID and check if user has access
                const response = await fetch(`http://localhost:3001/api/documents/verify/${documentId}`, {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                });
                
                // if document does not exist
                if (response.status === 404) {
                    navigate("/document-not-found", { state: { documentId } });
                    return;
                }
                
                // if document exists but user does not have access
                if (response.status === 403) {
                    setError("You don't have permission to access this document.");
                    return;
                }
                
                // throw error if response is not ok
                if (!response.ok) {
                    throw new Error(`Error: ${response.statusText}`);
                }

                // get document data to store owner
                const data = await response.json();
                const isOwner = data.owner;
                
                // set is owner state
                setIsDocumentOwner(isOwner);
                
                const setupSocketConnection = () => {
                    // Get username from token
                    const token = localStorage.getItem("token");
                    if (token) {
                        try {
                            // decode token to get username and colour
                            const decoded = jwtDecode(token);
                            setUsername(decoded.username || "Anonymous");
                            setColour(decoded.colour || "3498db");
            
                            // connect to websocket and join document room
                            if (socket.connected) {
                                console.log("Socket already connected, forcing reconnection");
                                socket.disconnect();
                                socket.connect();
                            } else if (!socket.connected) {
                                console.log("Socket not connected, connecting now");
                                socket.connect();
                            }
                            
                            // remove any previous listeners to avoid duplicate events
                            socket.off("documentError");
                            socket.off("updateUsers");
                            socket.off("initialState");
                            socket.off("updateTitle");
                            socket.off("loadMessages");
                            
                            // set up listener for document errors
                            socket.on("documentError", (error) => {
                                if(error.code === "DOCUMENT_NOT_FOUND") {
                                    navigate("/document-not-found", { state: { documentId } });
                                } else if(error.code === "ACCESS_DENIED") {
                                    setError("You don't have permission to access this document");
                                }
                            });
                            
                            // emit joinDocumentRoom event to join the document room
                            socket.emit("joinDocumentRoom", {
                                documentId, 
                                username: decoded.username, 
                                colour: decoded.colour
                            });
            
                        } catch (error) {
                            console.error("Error decoding token:", error);
                        }
                    }
                    
                    // set up listener to update users in the document room
                    socket.on("updateUsers", (users) => {
                        console.log("Active users:", users);
                        setActiveUsers(users);
                    });
            
                    return () => {
                        socket.emit("leaveDocumentRoom", documentId);
                        socket.off("updateUsers");
                        socket.off("documentError");
                    };
                };
                
                // setup socket
                setupSocketConnection();
                
            } catch (error) {
                console.error("Error verifying document:", error);
                setError("Failed to load document");   
            } finally {
                setDocumentLoading(false);
            }
        };
        
        verifyDocument();
    }, [documentId, navigate]);

    // handle leaving document room when user closes the tab or navigates away
    useEffect(() => {
        // fucntion to handle beforeunload event
        const handleBeforeUnload = () => {
            console.log(`Page unloading, leaving document room: ${documentId}`);
            socket.emit("leaveDocumentRoom", documentId);
        };
    
        // add event listener for beforeunload event
        window.addEventListener("beforeunload", handleBeforeUnload);
        
        // clean event listener
        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [documentId]);

    // function to leave the document room when user clicks on the brand link
    const leaveDocument = () => {
        socket.emit("leaveDocumentRoom", documentId);
    }

    // function to toggle the manage collaborators panel
    const toggleCollaboratorSearch = () => {
        setShowManageCollaborators(prev => !prev);
    }

    // function to close the manage collaborators panel when clicking outside of it
    useEffect(() => {
        function handleClickOutside(event) {
            if (collaboratorRef.current && 
                !collaboratorRef.current.contains(event.target) && 
                !event.target.closest('.manage-collaborators-btn')) {
                setShowManageCollaborators(false);
            }
        }
        
        // add event listener for clicks outside the panel
        document.addEventListener("mousedown", handleClickOutside);

        // clean event listener
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // show loading state
    if (documentLoading) {
        return (
            <div className="document-page">
                <div className="document-loading">
                    <p>Loading document...</p>
                </div>
            </div>
        );
    }

    // on document error, display the error and a return to home button
    if (error) {
        return (
            <div className="document-page">
                <div className="document-error">
                    <p>{error}</p>
                    <button onClick={() => navigate("/")}>Return to Home</button>
                </div>
            </div>
        );
    }

    return (
        <div className="document-page">
            {/* document page specific header */}
            <div className="document-header">

                {/* brand link to return to home page */}
                <div className="brand-container">
                    <Link to="/" className="brand-link" onClick={leaveDocument}>
                        <span className="brand-text">CoLab</span>
                    </Link>
                </div>

                {/* left of document header for document title and other buttons */}
                <div className="header-left">                    
                    <div className="top-row">
                        <div className="document-title-container">
                            <DocumentTitle documentId={documentId} username={username} titleRef={titleRef}/>
                        </div>
                    </div>
                    <div className="bottom-row">
                        <div className="document-export-container">
                            <Export quillRef={quillRef} titleRef={titleRef}/>
                        </div>
                    </div>
                </div>
                
                {/* right of document header for user list, manage collaborators button (only for owner),and current user icon */}
                <div className="header-right">
                    <div className="user-list-container">
                        <UserList users={activeUsers.filter(user => user.username !== username)} />
                    </div>
                    
                    {isDocumentOwner && (
                        <button 
                            className="manage-collaborators-btn"
                            onClick={toggleCollaboratorSearch}
                        >
                            Manage Users
                        </button>
                    )}
                    
                </div>
                
                <div className="user-icon-container">
                    <div className="user-icon" style={{ backgroundColor: colour }}>
                    <FontAwesomeIcon icon={faUser} />
                    </div>
                </div>
                
            </div>
            
            {/* manage collabortator panel */}
            <div 
                className={`collaborator-management-container ${showManageCollaborators ? 'open' : ''}`}
                ref={collaboratorRef}
            >
                <div className="panel-header">
                    <h3>Manage Collaborators</h3>
                    <button 
                        className="close-panel-btn" 
                        onClick={() => setShowManageCollaborators(false)}
                    >
                        ×
                    </button>
                </div>
                <ManageCollaborators documentId={documentId} />
            </div>
            
            {/* editor component */}
            <div className="content-container">
                <div className="editor-wrapper">
                    <Editor documentId={documentId} username={username} colour={colour} quillRef={quillRef} />
                </div>
            </div>
            
            {/* chat component */}
            <Chat documentId={documentId} username={username} />
        </div>
    );
}