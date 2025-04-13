import * as Y from 'yjs';
import Document from '../DB/models/documentModel.js';
import User from '../DB/models/userModel.js';
import { v4 } from 'uuid';

// function to create documentz
export async function createDocument(req, res) {
    try {
        // let document ID be request body
        let { documentId } = req.body;
        // retrieve and verify user id from authentication middleware
        const owner = req.user?.id;

        // if user not logged in
        if (!owner) {
            return res.status(401).json({ error: "Unauthorized. No user logged in." });
        }

        // generate documentId 
        if (!documentId) {
            documentId = v4();
        }

        // check if document exists
        const existingDocument = await Document.findOne({ documentId });
        if (existingDocument) {
            return res.status(400).json({ error: "Document with this ID already exists." });
        }

        // initialise ydoc, enpty state, and default document title
        const ydoc = new Y.Doc();
        const state = Buffer.from(Y.encodeStateAsUpdate(ydoc));
        const documentTitle = "Untitled Document"
        
        // create new document in DB
        const newDocument = await Document.create({ documentId, state, documentTitle, owner });

        // add new document to ownedDocuments in user model
        await User.findByIdAndUpdate(
            owner,
            { $push: { ownedDocuments: newDocument._id } },
            { new: true }
        );

        // display success messages
        console.log(`New document ${documentId} created and linked to owner ${owner}.`);
        res.status(201).json({ message: "Document created successfully.", documentId });
    
    // display errors
    } catch (error) {
        console.error(`Error creating document:`, error.message);
        res.status(500).json({ error: "Server error. Could not create document." });
    }
}

// function to retrieve owned and shared documents for user
export async function listDocuments (req, res) {
    try {
        // retrieve and verify user id from authentication middleware
        const userId = req.user?.id; 
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        // find user in db
        // uses populate to retrieve all document info
        const user = await User.findById(userId)
            .populate("ownedDocuments")
            .populate("sharedDocuments");

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // respond with ownedDocuments and sharedDocuments for user
        res.status(200).json({
            ownedDocuments: user.ownedDocuments || [],
            sharedDocuments: user.sharedDocuments || []
        });
    
        // display errors
    } catch (error) {
        console.error("Error fetching documents:", error.message);
        res.status(500).json({ error: "Server error. Could not fetch documents." });
    }
};

//load document if it exists or create document if it doesn't
export async function loadDocument(documentId) {
    try {
        //does doc exist
        //const exists = await isDocumentInDB(documentId);
        const docData = await Document.findOne({ documentId }); //find document by id and assign to docData
        
        //document not found in DB
        if (!docData) {
            console.log(`Document ${documentId} not found in the database.`);
            throw new Error("Document not found");
        }

        //create ydoc
        const ydoc = new Y.Doc();

        //apply doc state to ydoc
        Y.applyUpdate(ydoc, new Uint8Array(docData.state));
        console.log(`Document ${documentId} loaded from database.`);

        //create doc name varaiable
        const documentTitle = docData.documentTitle || "Untitled Document";
        
        return { ydoc, documentTitle }; //return ydoc to server

    } catch (error) {
        console.error(`Error handling document ${documentId}:`, error.message);
        //return ydoc to prevent crashing and title to prevent crashing
        return { ydoc: new Y.Doc(), documentTitle: "Untitled Document"} 
    }
}

// function to update document title
export async function updateDocumentTitle(documentId, newTitle) {
    try {
        await Document.updateOne({ documentId }, { documentTitle: newTitle });
        console.log(`Document title updated in DB: ${newTitle}`);
    } catch (error) {
        console.error(`Error updating document title:`, error.message);
    }
}

// function to save ydoc to document schema
export async function saveDocument(documentId, ydoc) {
    try {
        // store the document state sent via the ydoc to state variable
        const state = Buffer.from(Y.encodeStateAsUpdate(ydoc));

        //update document
        await Document.updateOne(
            { documentId }, //find doc id
            { state } // update state field
        );
        console.log(`Document ${documentId} updated in DB`);

    } catch (error) {
        console.error(`Error saving document ${documentId}:`, error.message);
    }
}

// function to delete document and remove from user models
export async function deleteDocument(req, res) {
    try {
        const { documentId } = req.params;
        const userId = req.user?.id;
        
        // ensure user is authorised
        if (!userId) {
            return res.status(401).json({ error: "Unauthorised" });
        }
        
        // find document
        const document = await Document.findOne({ documentId });
        if (!document) {
            return res.status(404).json({ error: "Document not found" });
        }
        
        // ensure user is owner
        if (document.owner.toString() !== userId) {
            return res.status(403).json({ error: "Only the document owner can delete it" });
        }

        // set all collaborator IDs before deletion
        const collaboratorIds = document.collaborators.map(collab => collab.user);
        
        // delete the document from DB
        await Document.deleteOne({ documentId });
        
        // remove the document from owner's ownedDocuments array
        await User.findByIdAndUpdate(
            userId,
            { $pull: { ownedDocuments: document._id } }
        );
        
        // remove the document from all collaborating user's sharedDocuments array
        if (collaboratorIds.length > 0) {
            await User.updateMany(
                { _id: { $in: collaboratorIds } },
                { $pull: { sharedDocuments: document._id } }
            );
        }
        
        res.status(200).json({ message: "Document deleted successfully" });
        
    } catch (error) {
        console.error("Error deleting document:", error);
        res.status(500).json({ error: "Server error" });
    }
}

// function to leave a shared document
export async function leaveDocument(req, res) {
    try {
        const { documentId } = req.params;
        const userId = req.user?.id;
        
        // ensure user is authorised
        if (!userId) {
            return res.status(401).json({ error: "Unauthorised" });
        }
        
        // find the document 
        const document = await Document.findOne({ documentId });
        if (!document) {
            return res.status(404).json({ error: "Document not found" });
        }
        
        // check if the user is the owner
        if (document.owner.toString() === userId) {
            return res.status(400).json({ error: "You can't leave a document you own. Try deleting it instead." });
        }
        
        // check that the user is a collaborator
        const isCollaborator = document.collaborators.some(
            collab => collab.user.toString() === userId
        );

        if (!isCollaborator) {
            return res.status(400).json({ error: "You're not a collaborator on this document" });
        }
        
        // remove the user from document model collaborators array
        await Document.updateOne(
            { documentId },
            { $pull: { collaborators: { user: userId } } }
        );
        
        // remove the document from user's sharedDocuments array
        await User.findByIdAndUpdate(
            userId,
            { $pull: { sharedDocuments: document._id } }
        );
        
        res.status(200).json({ message: "Successfully left the document" });
    } catch (error) {
        console.error("Error leaving document:", error);
        res.status(500).json({ error: "Server error" });
    }
}