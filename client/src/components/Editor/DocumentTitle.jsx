import React, { useState, useEffect, useRef } from 'react';
import socket from '../../socket/socket';
import '../../styles/DocumentTitle.css';

// function for the document title component
const DocumentTitle = ({ documentId, titleRef }) => {
    const [title, setTitle] = useState('Untitled Document'); 
    const [isEditing, setIsEditing] = useState(false);
    const [previousTitle, setPreviousTitle] = useState('Untitled Document');
    const inputRef = useRef(null);

    // initialise the titleRef when the component mounts
    useEffect(() => {
        if (titleRef) {
            titleRef.current = 'Untitled Document';
        }
    }, [titleRef]);

    // load the title when the component mounts
    useEffect(() => {
        if (!socket) return;

        // set up socket listener to receive title updates
        socket.on('updateTitle', (newTitle) => {
            console.log(`Received title update: ${newTitle}`);
            setTitle(newTitle); // set current title
            setPreviousTitle(newTitle); // set previous title to new title for empty title inputs
            if (titleRef) {
                titleRef.current = newTitle; // update the titleRef with the new title
            }
        });

        // cleanup socket listener
        return () => {
            socket.off('updateTitle');
        };
    }, [titleRef]);

    // function to start editing the title
    const startEditing = () => {
        setPreviousTitle(title);
        setIsEditing(true); // set editing mode to true
    };
    
    // update the title state when the input changes
    const handleChange = (e) => {
        setTitle(e.target.value);
    };

    // if the input field loses focus, finish editing
    const handleBlur = () => {
        finishEditing();
    };
    
    // handle keydown events for the input field
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            // if user presses enter, set the title and exit editing mode
            e.preventDefault();
            finishEditing();
        } else if (e.key === 'Escape') {
            // if user presses escape, revert to previous title and exit editing mode
            setTitle(previousTitle);
            setIsEditing(false);
        }
    };

    // function to finish editing the title
    const finishEditing = () => {

        const trimmedTitle = title.trim(); // trim whitespace from title

        // if entered text is empty or only whitespace, revert to previous title
        if (trimmedTitle === '') {
            setTitle(previousTitle);
            setIsEditing(false);
            return;
        }
        
        // if the title has changed, emit the updateTitle event to the server
        if (trimmedTitle !== previousTitle) {
            socket.emit('updateTitle', { documentId, title: trimmedTitle });
            if (titleRef) {
                titleRef.current = trimmedTitle; // set the titleRef to the new title
            }
        }
        
        // update the title state and exit editing mode
        setTitle(trimmedTitle);
        setIsEditing(false);
    };

    return (
        <div className="document-title-container">
            {/* display title input field based on editing state */}
            {isEditing ? (
                <input 
                    type="text" 
                    value={title} 
                    onChange={handleChange} 
                    onBlur={handleBlur} 
                    onKeyDown={handleKeyDown} 
                    className="title-input" 
                    autoFocus
                    ref={inputRef}
                    placeholder="Enter document title"
                />
            ) : (
                // display title text when not editing
                // clicking on the title will start editing
                <h1 className="title-display" onClick={startEditing}>{title}</h1>
            )}
        </div>
    );
};

// export the compmonent for use
export default DocumentTitle;