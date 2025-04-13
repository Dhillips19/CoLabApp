import express from 'express';
import { searchUser, addCollaborator, getCollaborators, removeCollaborator } from '../controllers/collaboratorSearchController.js';
import authenticateUser from '../middleware/authMiddleware.js';

const editorRouter = express.Router();

// search for users to add as collaborators
editorRouter.get('/search', authenticateUser, searchUser);

// get collaborators for a document
editorRouter.get('/:documentId/collaborators', authenticateUser, getCollaborators);

// add collaborator to a document
editorRouter.post('/:documentId/collaborators', authenticateUser, addCollaborator);

// remove collaborator from a document
editorRouter.delete('/:documentId/collaborators/:userId', authenticateUser, removeCollaborator);

export default editorRouter;