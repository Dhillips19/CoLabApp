import Document from "../DB/models/documentModel.js";

// function to verify the documentId in the url exists in the DB
// also checks that the current user has access to it
export async function verifyDocumentAccessible(req, res, next) {
    const { documentId } = req.params;
    
    try {
        const document = await Document.findOne({ documentId });
        
        if (!document) {
            return res.status(404).json({ 
                error: "Document not found",
                code: "DOCUMENT_NOT_FOUND"
            });
        }
        
        // check if the user is the owner or a collaborator
        const userId = req.user.id;
        const isOwner = document.owner.toString() === userId;
        const isCollaborator = document.collaborators.some(
            collab => collab.user.toString() === userId
        );

        // if user is not an owner or collaborator, they do not get access
        if (!isOwner && !isCollaborator) {
            return res.status(403).json({
                error: "You don't have access to this document",
                code: "ACCESS_DENIED"
            });
        }

        req.document = document;
        req.isDocumentOwner = isOwner;

        next();
    } catch (error) {
        console.error("Error verifying document:", error);
        res.status(500).json({ error: "Server error" });
    }
}