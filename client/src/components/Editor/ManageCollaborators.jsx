import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserPlus, faUserMinus, faSearch, faTimes } from '@fortawesome/free-solid-svg-icons';
import '../../styles/ManageCollaborators.css';

const ManageCollaborators = ({ documentId }) => {
    // state for search term and results
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    
    // state for collaborators
    const [collaborators, setCollaborators] = useState([]);
    
    // state for active tab, error, success, and loading
    const [activeTab, setActiveTab] = useState('add');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    // fetch collaborators when the component mounts or when the active tab is remove
    useEffect(() => {
        if (documentId && activeTab === 'remove') {
            fetchCollaborators();
        }
    }, [documentId, activeTab]);

    // function to fetch current collaborators from the server 
    const fetchCollaborators = async () => {
        
        setLoading(true);
        
        // call the API to get the list of collaborators
        try {
            const response = await fetch(`http://localhost:3001/api/editor/${documentId}/collaborators`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem("token")}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch collaborators');
            }

            // set the collaborators state with the response data
            const data = await response.json();
            setCollaborators(data);
        } catch (error) {
            console.error('Error fetching collaborators:', error);
            setError('Failed to load collaborators');
        } finally {
            setLoading(false);
        }
    };

    // handle the searching for users to be added to the document
    const handleSearch = async (e) => {
        
        e.preventDefault(); // prevent form submission on page reload
        // reset error and success messages
        setError('');
        setSuccess('');
        
        try {
            // check if search term is empty when search submitted
            if (!searchTerm.trim()) {
                setError('Please enter a search term');
                return;
            }

            // call the API to search for users
            setLoading(true);
            const response = await fetch(`http://localhost:3001/api/editor/search?term=${encodeURIComponent(searchTerm)}&documentId=${documentId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem("token")}`
                }
            });

            // check if the response is ok
            if (!response.ok) {
                throw new Error('Failed to search users');
            }

            // parse the response data
            const data = await response.json();
            
            // set search results and handle empty results
            if (response.ok) {
                setSearchResults(data);
                if (data.length === 0) {
                    setError('No users found');
                }
            } else {
                setError(data.message || 'Failed to search users');
            }
        } catch (error) {
            console.error('Search error:', error);
            setError('Failed to search users');
        } finally {
            setLoading(false);
        }
    };

    // fucntion to add a collaborator to the document
    const addCollaborator = async (userId) => {
        // reset error and success messages
        setError('');
        setSuccess('');
        
        // call the API to add a collaborator
        try {
            setLoading(true);
            const response = await fetch(`http://localhost:3001/api/editor/${documentId}/collaborators`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({ userId })
            });
            
            // check if the response is ok
            if (!response.ok) {
                throw new Error('Failed to add collaborator');
            }

            // parse the response data
            const data = await response.json();
            
            // set success message and update search results
            if (response.ok) {
                setSuccess('Collaborator added successfully');
                setSearchResults(results => results.filter(user => user._id !== userId));
                setTimeout(() => setSuccess(''), 2000); // clear success message after 2 seconds
            } else {
                setError(data.message || 'Failed to add collaborator');
            }
        } catch (error) {
            console.error('Error adding collaborator:', error);
            setError('Failed to add collaborator');
        } finally {
            setLoading(false);
        }
    };

    // function to remove a collaborator from the document
    const removeCollaborator = async (userId) => {
        // reset error and success messages
        setError('');
        setSuccess('');
        
        // call the API to remove a collaborator
        try {
            setLoading(true);
            const response = await fetch(`http://localhost:3001/api/editor/${documentId}/collaborators/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem("token")}`
                }
            });
            
            // check if the response is ok
            if (!response.ok) {
                throw new Error('Failed to remove collaborator');
            }

            // update the collaborators state to remove the selected user and set success message 
            if (response.ok) {
                setSuccess('Collaborator removed successfully');
                setCollaborators(collaborators.filter(user => user._id !== userId));
                setTimeout(() => setSuccess(''), 2000); // clear success message after 2 seconds
            } else {
                const data = await response.json();
                setError(data.message || 'Failed to remove collaborator');
            }
        } catch (error) {
            console.error('Error removing collaborator:', error);
            setError('Failed to remove collaborator');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="manage-collaborators">
            <div className="collaborator-tabs">
                { /* add and remove collaborators tabs */}
                <button 
                    className={`tab-button ${activeTab === 'add' ? 'active' : ''}`} 
                    onClick={() => setActiveTab('add')} // set active tab to add
                >
                    <FontAwesomeIcon icon={faUserPlus} /> Add Users
                </button>
                <button 
                    className={`tab-button ${activeTab === 'remove' ? 'active' : ''}`} 
                    onClick={() => {
                        setActiveTab('remove'); // set active tab to remove
                        fetchCollaborators(); // fetch collaborators when tab is clicked
                    }}
                >
                    <FontAwesomeIcon icon={faUserMinus} /> Remove Users
                </button>
            </div>

            {/* status messages to be displayed on user actions */}
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            { /* add collaborators panel */}
            {activeTab === 'add' && (
                <div className="collaborator-panel">
                    { /* search form to find users to add as collaborators */}
                    <form onSubmit={handleSearch} className="search-form">
                        <div className="search-input-container">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search users by username or email"
                                className="search-input"
                                disabled={loading}
                            />
                            <FontAwesomeIcon icon={faSearch} className="search-icon" />
                        </div>
                        <button type="submit" className="action-button" disabled={loading}>
                            Search
                        </button>
                    </form>

                    {/* list of search results to add as collaborators */}
                    <div className="results-list">
                        {searchResults.length > 0 ? (
                            // map through search results and display them
                            searchResults.map(user => (
                                <div key={user._id} className="user-item">
                                    <div className="user-info">
                                        { /* display user information */}
                                        <span className="username">{user.username}</span>
                                        <span className="email">{user.email}</span>
                                    </div>
                                    { /* button to add user as collaborator */}
                                    <button 
                                        onClick={() => addCollaborator(user._id)}
                                        className="action-button"
                                        disabled={loading}
                                    >
                                        Add
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="empty-message">
                                {loading ? 'Searching...' : 'Search for users to add'}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* remove collaborators panel */}
            {activeTab === 'remove' && (
                <div className="collaborator-panel">
                    <div className="panel-header">
                        <h4>Current Collaborators</h4>
                    </div>
                    
                    {/* list of current collaborators to remove */}
                    <div className="results-list">
                        {loading ? (
                            <div className="loading-message">Loading collaborators...</div>
                        ) : collaborators.length > 0 ? (
                            // map through collaborators and display them
                            collaborators.map(user => (
                                <div key={user._id} className="user-item">
                                    <div className="user-info">
                                        { /* display user information */}
                                        <span className="username">{user.username}</span>
                                        <span className="email">{user.email}</span>
                                    </div>
                                    { /* button to remove user as collaborator */}
                                    <button 
                                        onClick={() => removeCollaborator(user._id)}
                                        className="action-button remove"
                                        disabled={loading}
                                    >
                                        <FontAwesomeIcon icon={faTimes} /> Remove
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="empty-message">No collaborators yet</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// export component for use
export default ManageCollaborators;