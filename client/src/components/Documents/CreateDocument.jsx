import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom';
import '../../styles/CreateDocument.css';

// create document component
const CreateDocument = () => {

    const navigate = useNavigate();
    const location = useLocation(); 
    const [isHomePage, setIsHomePage] = useState("");
    
    // set isHomePage state based on current location
    useEffect(() => {
        setIsHomePage(location.pathname === "/");
    }, [location.pathname]);

    // function to handle creating new document
    const handleCreateDocument = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/documents/create', { // use create api
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem("token")}` 
                },
                body: JSON.stringify({})
            });

            // store api response
            const data = await response.json();

            // ensure response was okay
            if (response.ok) {
                navigate(`/document/${data.documentId}`); // redirect user to document on success
            } else {
                alert(`Error: ${data.error}`); // display error if failure
            }
            // display error if encountered
        } catch (error) {
            console.error("Error creating document:", error);
            alert("Failed to create document.");
        }
    };

    // display create document button
    return (
        <div className="create-document-container">
            {/* class name changes based on if button is on homepage - for styling */}
            <button 
                className={isHomePage ? 'create-document-button-homepage' : 'create-document-button'} 
                onClick={handleCreateDocument}
            >
                {isHomePage ? 'Create New Document' : 'Create New Document'}
            </button> 
        </div>
    );
}

// export component for use
export default CreateDocument;