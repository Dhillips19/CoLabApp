import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import "../../styles/ListUserDocuments.css";

// component to list user's documents
const ListUserDocuments = () => {
    const [ownedDocuments, setOwnedDocuments] = useState([]);
    const [sharedDocuments, setSharedDocuments] = useState([]);
    const [listSelection, setListSelection] = useState("ownedDocuments");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionStatus, setActionStatus] = useState({ type: "", message: "" });
    
    const navigate = useNavigate();

    // function to retrieve documents from db
    const fetchDocuments = async () => {
        
        setLoading(true); // show loading
        
        // call document list API
        try {
            const response = await fetch("http://localhost:3001/api/documents/list", {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`,
                    "Content-Type": "application/json"
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // parse and store document arrays
            const data = await response.json();

            // sort arrays by last updated date (most recent first)
            const sortedOwned = data.ownedDocuments.sort((a, b) => 
                new Date(b.updatedAt) - new Date(a.updatedAt)
            )
            const sortedShared = data.sharedDocuments.sort((a, b) => 
                new Date(b.updatedAt) - new Date(a.updatedAt)
            );

            // set state of document arrays
            setOwnedDocuments(sortedOwned || []);
            setSharedDocuments(sortedShared || []);

        } catch (error) {
            setError(`Failed to fetch documents: ${error.message}`);
            console.error("Error:", error);
        } finally {
            setLoading(false); // remove loading
        }
    };

    // call fetchDocuments on component mount
    useEffect(() => {
        fetchDocuments();
    }, []);

    // clear action status message after 3 seconds
    useEffect(() => {
        if (actionStatus.message) {
            const timer = setTimeout(() => {
                setActionStatus({ type: "", message: "" });
            }, 3000);
            
            return () => clearTimeout(timer);
        }
    }, [actionStatus]);

    // determine which documents to display based on user selection
    const currentDocuments = listSelection === "ownedDocuments" 
        ? ownedDocuments 
        : sharedDocuments;

    // function to handle to switching between owned and shared documents
    const handleTabChange = (tab) => {
        setListSelection(tab);
    };

    // function to handle deletion of document
    const handleDeleteDocument = async (e, documentId) => {

        e.preventDefault(); // prevents navigation from to document
        e.stopPropagation(); // stops event from bubbling up to parent elements
        
        // prompt user to confirm deletion of document
        const confirmDelete = window.confirm("Are you sure you want to delete this document? This action cannot be undone.");
        if (!confirmDelete) return;
        
        // call delete document API 
        try {
            const response = await fetch(`http://localhost:3001/api/documents/delete/${documentId}`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`,
                    "Content-Type": "application/json"
                }
            });
            
            if (!response.ok) {
                throw new Error(response.error || "Failed to delete document");
            }
            
            // update the document list after deletion and update action status to be displayed
            setOwnedDocuments(ownedDocuments.filter(doc => doc.documentId !== documentId));
            setActionStatus({ type: "success", message: "Document deleted successfully" });

        } catch (error) {
            console.error("Error deleting document:", error);
            setActionStatus({ type: "error", message: error.message });
        }
    };

    // function to leave shared document
    const handleLeaveDocument = async (e, documentId) => {

        e.preventDefault(); // prevents navigation from to document
        e.stopPropagation(); // stops event from bubbling up to parent elements
        
        // prompt user to confirm leaving of document
        const confirmLeave = window.confirm("Are you sure you want to leave this document? You'll need to be re-invited to access it again.");
        if (!confirmLeave) return;
        
        // call leave document API
        try {
            const response = await fetch(`http://localhost:3001/api/documents/${documentId}/leave`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`,
                    "Content-Type": "application/json"
                }
            });
            
            if (!response.ok) {
                throw new Error(response.error || "Failed to leave document");
            }
            
            // update the document list after leaving and update action status to be displayed
            setSharedDocuments(sharedDocuments.filter(doc => doc.documentId !== documentId));
            setActionStatus({ type: "success", message: "You've left the document" });

        } catch (error) {
            console.error("Error leaving document:", error);
            setActionStatus({ type: "error", message: error.message });
        }
    };

    // handle clicking on document from the list
    const handleDocumentClick = (documentId) => {
        // navigate to document page
        navigate(`/document/${documentId}`);
    };

    // display user document lists
    return (
        <div className='documents-container'>
            {/* document list tabs */}
            <div className="document-tabs">
                {/* change document list based on selection */}
                <button 
                    className={`tab-button ${listSelection === "ownedDocuments" ? "active" : ""}`}
                    onClick={() => handleTabChange("ownedDocuments")}
                >
                    My Documents {ownedDocuments.length > 0 && `(${ownedDocuments.length})`}
                </button>
                <button 
                    className={`tab-button ${listSelection === "sharedDocuments" ? "active" : ""}`}
                    onClick={() => handleTabChange("sharedDocuments")}
                >
                    Shared With Me {sharedDocuments.length > 0 && `(${sharedDocuments.length})`}
                </button>
            </div>

            {/* display action messages on success/failure */}
            {actionStatus.message && (
                <div className={`action-status ${actionStatus.type}`}>
                    {actionStatus.message}
                </div>
            )}

            {/* loading and error handling */}
            {loading && <p className="loading-message">Loading documents...</p>}
            {error && <p className="error-message">{error}</p>}

            {/* display document lists */}
            {!loading && !error && (
                <>
                    {/* display empty message based on tab selection */ }
                    {currentDocuments.length === 0 ? (
                        <p className="empty-state">
                            {listSelection === "ownedDocuments" 
                                ? "You don't have any documents yet. Create one to get started!"
                                : "No documents have been shared with you yet."
                            }
                        </p>
                    ) : (
                        /* display document list by mapping based _id key */
                        <div className='documents-list'>
                            {currentDocuments.map((doc) => (
                                <div key={doc._id} className='document-item-wrapper'>
                                    <div 
                                        className='document-item'
                                        onClick={() => handleDocumentClick(doc.documentId)}
                                    >
                                        <h3 className='document-title'>{doc.documentTitle}</h3>
                                        <p className='document-date'>
                                            Last Updated: {new Date(doc.updatedAt).toLocaleString('en-GB', {
                                                day: 'numeric',
                                                month: 'numeric',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                        
                                        { /* display delete/leave document button in document-item based on tab selection */}
                                        {listSelection === "ownedDocuments" ? (
                                            <button 
                                                className="document-delete-btn"
                                                onClick={(e) => handleDeleteDocument(e, doc.documentId)}
                                                title="Delete document"
                                            >
                                                <FontAwesomeIcon icon={faTrash} />
                                            </button>
                                        ) : (
                                            <button 
                                                className="document-leave-btn"
                                                onClick={(e) => handleLeaveDocument(e, doc.documentId)}
                                                title="Leave document"
                                            >
                                                <FontAwesomeIcon icon={faSignOutAlt} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

// export component for use
export default ListUserDocuments;