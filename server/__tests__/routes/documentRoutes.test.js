import request from 'supertest';
import express from 'express';
import documentRouter from '../../routes/documentRoutes';
import { 
  createDocument, 
  listDocuments, 
  deleteDocument, 
  leaveDocument 
} from '../../controllers/documentController';
import authenticateUser from '../../middleware/authMiddleware';
import { verifyDocumentAccessible } from '../../middleware/documentMiddleware';

// Mock dependencies
jest.mock('../../controllers/documentController');
jest.mock('../../middleware/authMiddleware');
jest.mock('../../middleware/documentMiddleware');

// Create express app for testing
const app = express();
app.use(express.json());
app.use('/api/documents', documentRouter);

describe('Document Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default middleware mock to call next
    authenticateUser.mockImplementation((req, res, next) => {
      req.user = { id: 'user123', username: 'testuser' };
      next();
    });
  });
  
  describe('POST /api/documents/create', () => {
    test('should call createDocument controller', async () => {
      // Mock the controller implementation
      createDocument.mockImplementation((req, res) => {
        res.status(201).json({ 
          message: 'Document created successfully',
          documentId: 'test-doc-123'
        });
      });
      
      // Make the API request
      const response = await request(app)
        .post('/api/documents/create')
        .set('Authorization', 'Bearer test-token')
        .send({});
      
      // Verify response
      expect(response.statusCode).toBe(201);
      expect(response.body).toEqual({ 
        message: 'Document created successfully',
        documentId: 'test-doc-123'
      });
      expect(authenticateUser).toHaveBeenCalled();
      expect(createDocument).toHaveBeenCalled();
    });
    
    test('should handle authentication failure', async () => {
      // Mock authentication failure
      authenticateUser.mockImplementation((req, res, next) => {
        return res.status(401).json({ error: 'Unauthorized' });
      });
      
      // Make the API request
      const response = await request(app)
        .post('/api/documents/create')
        .send({});
      
      // Verify response
      expect(response.statusCode).toBe(401);
      expect(response.body).toEqual({ error: 'Unauthorized' });
      expect(createDocument).not.toHaveBeenCalled();
    });
  });
  
  describe('GET /api/documents/list', () => {
    test('should call listDocuments controller', async () => {
      // Mock the controller implementation
      listDocuments.mockImplementation((req, res) => {
        res.status(200).json({ 
          ownedDocuments: [],
          sharedDocuments: []
        });
      });
      
      // Make the API request
      const response = await request(app)
        .get('/api/documents/list')
        .set('Authorization', 'Bearer test-token');
      
      // Verify response
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ 
        ownedDocuments: [],
        sharedDocuments: []
      });
      expect(authenticateUser).toHaveBeenCalled();
      expect(listDocuments).toHaveBeenCalled();
    });
  });
  
  describe('GET /api/documents/verify/:documentId', () => {
    test('should verify document accessibility', async () => {
      // Mock the middleware to add document to request
      verifyDocumentAccessible.mockImplementation((req, res, next) => {
        req.document = { 
          documentId: 'doc123',
          owner: 'user123'
        };
        req.isDocumentOwner = true;
        next();
      });
      
      // Make the API request
      const response = await request(app)
        .get('/api/documents/verify/doc123')
        .set('Authorization', 'Bearer test-token');
      
      // Verify response
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ 
        exists: true,
        documentId: 'doc123',
        owner: true
      });
      expect(authenticateUser).toHaveBeenCalled();
      expect(verifyDocumentAccessible).toHaveBeenCalled();
    });
    
    test('should handle document access denied', async () => {
      // Mock middleware to deny access
      verifyDocumentAccessible.mockImplementation((req, res, next) => {
        return res.status(403).json({ error: 'Access denied' });
      });
      
      // Make the API request
      const response = await request(app)
        .get('/api/documents/verify/doc123')
        .set('Authorization', 'Bearer test-token');
      
      // Verify response
      expect(response.statusCode).toBe(403);
      expect(response.body).toEqual({ error: 'Access denied' });
    });
  });
  
  describe('POST /api/documents/delete/:documentId', () => {
    test('should call deleteDocument controller', async () => {
      // Mock the controller implementation
      deleteDocument.mockImplementation((req, res) => {
        res.status(200).json({ message: 'Document deleted successfully' });
      });
      
      // Make the API request
      const response = await request(app)
        .post('/api/documents/delete/doc123')
        .set('Authorization', 'Bearer test-token');
      
      // Verify response
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ message: 'Document deleted successfully' });
      expect(authenticateUser).toHaveBeenCalled();
      expect(deleteDocument).toHaveBeenCalled();
    });
  });
  
  describe('POST /api/documents/:documentId/leave', () => {
    test('should call leaveDocument controller', async () => {
      // Mock the controller implementation
      leaveDocument.mockImplementation((req, res) => {
        res.status(200).json({ message: 'Successfully left the document' });
      });
      
      // Make the API request
      const response = await request(app)
        .post('/api/documents/doc123/leave')
        .set('Authorization', 'Bearer test-token');
      
      // Verify response
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ message: 'Successfully left the document' });
      expect(authenticateUser).toHaveBeenCalled();
      expect(leaveDocument).toHaveBeenCalled();
    });
  });
});