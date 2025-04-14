import Document from "../DB/models/documentModel.js";
import User from "../DB/models/userModel.js";

// function to search for users to add to document, excluding the document owner
export async function searchUser(req, res) {
    try {
        const searchTerm = req.query.term;
        const documentId = req.query.documentId;

        // ensure search has been entered
        if (!searchTerm) {
            return res.status(400).json({ message: 'Search term is required' });
        }

        // fimd the document and get owner Id
        const doc = await Document.findOne({ documentId });
        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }

        // get an array of the current document collaborators
        const collaboratorIds = doc.collaborators.map(collab => collab.user);
        
        // add current collaborators and owner to excludedIds array
        const excludedIds = [doc.owner, ...collaboratorIds];

        // search for users excluding the users in the excludedIds array
        // search is based on user's username or email
        const users = await User.find({
            $and: [
                {
                    $or: [
                        { username: { $regex: searchTerm, $options: 'i' } },
                        { email: { $regex: searchTerm, $options: 'i' } }
                    ]
                },
                { _id: { $nin: excludedIds } } 
            ]
        }).select('username email _id');

        res.json(users);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ message: 'Error searching for users' });
    }
}

// fucntion to add a collaborator to a document's copllaborators array
export async function addCollaborator(req, res) {
    try {
        // find document by documentId
        const doc = await Document.findOne({ documentId: req.params.documentId });

        // add user's id to the document's collaborators array
        doc.collaborators.push({ user: req.body.userId });
        await doc.save();

        // add document to the user's sharedDocuments array
        await User.findByIdAndUpdate(
            req.body.userId,
            { $push: { sharedDocuments: doc._id } },
            { new: true }
        );

        res.json({ message: 'Collaborator added successfully' });
    } catch (error) {
        console.error('Error adding collaborator:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

// function to get all collaborators of a document
export async function getCollaborators(req, res) {
    try {
        const { documentId } = req.params;
        
        // find document 
        const doc = await Document.findOne({ documentId });
        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }
        
        // check if user sending request is the owner
        if (doc.owner.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Only document owners can manage collaborators' });
        }
        
        // get all collaborators of the document
        const collaboratorIds = doc.collaborators.map(collab => collab.user);

        // find all users in the collaborators array
        const collaborators = await User.find({ _id: { $in: collaboratorIds } })
            .select('username email _id');
        
        res.json(collaborators);
    } catch (error) {
        console.error('Error fetching collaborators:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

// function to remove collaborators from a document
export async function removeCollaborator(req, res) {
    try {
        const { documentId, userId } = req.params;
        
        // find document
        const doc = await Document.findOne({ documentId });
        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }
        
        // check if user is the owner
        if (doc.owner.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Only document owners can remove collaborators' });
        }
        
        // remove the collaborator from the document
        await Document.findOneAndUpdate(
            { documentId },
            { $pull: { collaborators: { user: userId } } }
        );
        
        // remove the document from the user's sharedDocuments array
        await User.findByIdAndUpdate(
            userId,
            { $pull: { sharedDocuments: doc._id } }
        );
        
        res.json({ message: 'Collaborator removed successfully' });
    } catch (error) {
        console.error('Error removing collaborator:', error);
        res.status(500).json({ message: 'Server error' });
    }
}