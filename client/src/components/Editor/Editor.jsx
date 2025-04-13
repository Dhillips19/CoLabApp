import React, { useEffect, useRef } from "react";
import Quill from "quill";
import * as Y from "yjs";
import { QuillBinding } from "y-quill";
import QuillCursors from "quill-cursors";
import * as awarenessProtocol from 'y-protocols/awareness';
import { Awareness } from 'y-protocols/awareness';
import "quill/dist/quill.snow.css";
import socket from "../../socket/socket.js";
import "../../styles/Editor.css";

Quill.register('modules/cursors', QuillCursors)

// Editor component to create a collaborative text editor using Quill and Yjs
// uses socket io to communicate with the server and share document updates
const Editor = ({ documentId, username, colour, quillRef }) => {
    
    // useRef to store the editor instance and wrapper reference
    const wrapperRef = useRef(null);

    useEffect(() => {
        // check if the socket is connected and the wrapperRef is available
        if (!socket || !wrapperRef.current) return;

        wrapperRef.current.innerHTML = "";  // clear the wrapper before creating a new editor instance
        const editor = document.createElement("div"); // create div to store the quill editor
        wrapperRef.current.append(editor); // append the editor to wrapper

        // register custom icons for undo and redo buttons
        var icons = Quill.import("ui/icons");
            icons["undo"] = `<svg viewbox="0 0 18 18">
                <polygon class="ql-fill ql-stroke" points="6 10 4 12 2 10 6 10"></polygon>
                <path class="ql-stroke" d="M8.09,13.91A4.6,4.6,0,0,0,9,14,5,5,0,1,0,4,9"></path>
            </svg>`;
            icons["redo"] = `<svg viewbox="0 0 18 18">
                <polygon class="ql-fill ql-stroke" points="12 10 14 12 16 10 12 10"></polygon>
                <path class="ql-stroke" d="M9.91,13.91A4.6,4.6,0,0,1,9,14a5,5,0,1,1,5-5"></path>
            </svg>`;

        // create a new Quill editor instance
        const quill = new Quill(editor, {
            theme: "snow",
            modules: {
                cursors: true, // enable cursors module for collaborative editing
                toolbar: {
                    container: [

                        [{ 'font': [] }], // font options
                        [{ 'size': ['small', 'normal', 'large', 'huge'] }], // size options
                        [{ 'header': 1 }, { 'header': 2 }], // header options
                        ['bold', 'italic', 'underline', 'strike'], // text formatting options
                        [{ 'align': [] }], // alignment options
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }], // list options
                        [{ 'indent': '-1'}, { 'indent': '+1' }], // indent options
                        [{ 'color': [] }, { 'background': [] }], // color options
                        ['blockquote', 'code-block'], // blockquote and code options
                        ['link', 'image', 'formula'], // // link, image and formula options
                        ['undo', 'redo'], // custom undo and redo options
                        ['clean'] // clear formatting option
                    ],
                    handlers: {
                        // add handlers for undo and redo
                        'undo': function() {
                            console.log("Undo button clicked");
                            quill.history.undo();
                        },
                        'redo': function() {
                            console.log("Redo button clicked");
                            quill.history.redo();
                        }
                    }
                },
                history: {
                    userOnly: true // only the user can see and use their own quill history
                }
            }
        });

        quillRef.current = quill; // store quill instance in ref

        const ydoc = new Y.Doc(); // create y.js document 
        const awareness = new Awareness(ydoc); // create awareness instance for user presence
        awareness.setLocalStateField('user', {
            name: username,
            color: colour
        }); // set local user state

        const ytext = ydoc.getText('quill'); // get text from this doc

        // bind the quill editor to the ydoc
        new QuillBinding(ytext, quill, awareness);

        // retrieve initial doc state from server and apply the update to local ydoc
        socket.on('initialState', (update) => { 
            Y.applyUpdate(ydoc, new Uint8Array(update));
        }); 

        // listen for updates from server and apply the update to local ydoc
        socket.on('update', (update) => {  
            Y.applyUpdate(ydoc, new Uint8Array(update));
        });

        // when the local ydoc is updated, the update is broadcast to the server
        ydoc.on('update', (update) => {
            socket.emit('update', update);
        });

        // send awareness updates to the server when the local awareness instance is updated
        awareness.on('update', ({ added, updated, removed }) => {
            const update = awarenessProtocol.encodeAwarenessUpdate(
                awareness,
                added.concat(updated).concat(removed)
            );
            socket.emit('awareness-update', { documentId, update });
        });
        
        // listen for awareness updates from the server and apply them to local awareness instance
        socket.on('awareness-update', ({ update }) => {
            awarenessProtocol.applyAwarenessUpdate(awareness, new Uint8Array(update));
        });
        
        // cleanup 
        return() => {
            socket.off('initialState');
            socket.off('update');
            socket.off('latestState')
            ydoc.destroy();
        }
    }, [documentId, username, colour, quillRef]);

    return <div className="editor-container" ref={wrapperRef}></div>;
};

export default Editor;