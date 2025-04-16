import request from 'supertest';
import express from 'express';
import editorRouter from '../../routes/editorRoutes';
import { 
  searchUser, 
  addCollaborator, 
  getCollaborators, 
  removeCollaborator 
} from '../../controllers/collaboratorController';
import authenticateUser from '../../middleware/authMiddleware';

// Mock dependencies
jest.mock('../../controllers/collaboratorController');
jest.mock('../../middleware/authMiddleware');

// Create express app for testing
const app = express();
app.use(express.json());
app.use('/api/editor', editorRouter);

describe('Editor Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default middleware mock to call next
    authenticateUser.mockImplementation((req, res, next) => {
      req.user = { id: 'user123', username: 'testuser' };
      next();
    });
  });
  
  describe('GET /api/editor/search', () => {
    test('should call searchUser controller', async () => {
      // Mock the controller implementation
      searchUser.mockImplementation((req, res) => {
        res.status(200).json([
          { username: 'user1', email: 'user1@example.com' },
          { username: 'user2', email: 'user2@example.com' }
        ]);
      });
      
      // Make the API request
      const response = await request(app)
        .get('/api/editor/search?term=test&documentId=doc123')
        .set('Authorization', 'Bearer test-token');
      
      // Verify response
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual([
        { username: 'user1', email: 'user1@example.com' },
        { username: 'user2', email: 'user2@example.com' }
      ]);
      expect(authenticateUser).toHaveBeenCalled();
      expect(searchUser).toHaveBeenCalled();
    });
  });
  
  describe('GET /api/editor/:documentId/collaborators', () => {
    test('should call getCollaborators controller', async () => {
      // Mock the controller implementation
      getCollaborators.mockImplementation((req, res) => {
        res.status(200).json([
          { username: 'collab1', email: 'collab1@example.com' },
          { username: 'collab2', email: 'collab2@example.com' }
        ]);
      });
      
      // Make the API request
      const response = await request(app)
        .get('/api/editor/doc123/collaborators')
        .set('Authorization', 'Bearer test-token');
      
      // Verify response
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual([
        { username: 'collab1', email: 'collab1@example.com' },
        { username: 'collab2', email: 'collab2@example.com' }
      ]);
      expect(authenticateUser).toHaveBeenCalled();
      expect(getCollaborators).toHaveBeenCalled();
    });
  });
  
  describe('POST /api/editor/:documentId/collaborators', () => {
    test('should call addCollaborator controller', async () => {
      // Mock the controller implementation
      addCollaborator.mockImplementation((req, res) => {
        res.status(200).json({ message: 'Collaborator added successfully' });
      });
      
      // Make the API request
      const response = await request(app)
        .post('/api/editor/doc123/collaborators')
        .set('Authorization', 'Bearer test-token')
        .send({ userId: 'collab123' });
      
      // Verify response
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ message: 'Collaborator added successfully' });
      expect(authenticateUser).toHaveBeenCalled();
      expect(addCollaborator).toHaveBeenCalled();
    });
  });
  
  describe('DELETE /api/editor/:documentId/collaborators/:userId', () => {
    test('should call removeCollaborator controller', async () => {
      // Mock the controller implementation
      removeCollaborator.mockImplementation((req, res) => {
        res.status(200).json({ message: 'Collaborator removed successfully' });
      });
      
      // Make the API request
      const response = await request(app)
        .delete('/api/editor/doc123/collaborators/collab123')
        .set('Authorization', 'Bearer test-token');
      
      // Verify response
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ message: 'Collaborator removed successfully' });
      expect(authenticateUser).toHaveBeenCalled();
      expect(removeCollaborator).toHaveBeenCalled();
    });
  });
});