import express from 'express';
import { createDocument, listDocuments, deleteDocument, leaveDocument } from '../controllers/documentController.js';
import authenticateUser from '../middleware/authMiddleware.js';
import { verifyDocumentAccessible } from '../middleware/documentMiddleware.js';

const documentRouter = express.Router();

// create document
documentRouter.post('/create', authenticateUser, createDocument);

// list documents
documentRouter.get('/list', authenticateUser, listDocuments);

// verify document exists middleware
documentRouter.get('/verify/:documentId', authenticateUser, verifyDocumentAccessible, (req, res) => {
    return res.status(200).json({ 
        exists: true,
        documentId: req.document.documentId,
        owner: req.document.owner.toString() === req.user.id
    });
});

// delete document
documentRouter.post('/delete/:documentId', authenticateUser, deleteDocument);

// leave document
documentRouter.post('/:documentId/leave', authenticateUser, leaveDocument);

export default documentRouter;