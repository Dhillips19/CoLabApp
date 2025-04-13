import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import NavBar from '../components/NavBar/NavBar';
import CreateDocument from '../components/Documents/CreateDocument';
import '../styles/DocumentNotFound.css';

// DocumentNotFound component to display when a document is not found
const DocumentNotFound = () => {
    // useLocation hook to get the current location
    const location = useLocation();
    // get the document ID from the location state
    const documentId = location.state?.documentId || 'unknown';

    // render not found mesage and buttons to create a new document or return home
    return (
        <div className="not-found-container">
            <NavBar />
            <div className="not-found-content">
                <h1>Document Not Found</h1>
                <p>The document with ID <code>{documentId}</code> does not exist.</p>
                <div className="not-found-options">
                    <Link to="/" className="return-home">
                        Return to Home
                    </Link>
                    <div className="create-new-document">
                        <CreateDocument/>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DocumentNotFound;