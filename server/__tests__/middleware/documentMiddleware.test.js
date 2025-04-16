import { verifyDocumentAccessible } from '../../middleware/documentMiddleware';
import Document from '../../DB/models/documentModel';

// Mock dependencies
jest.mock('../../DB/models/documentModel');

// Silence console logs during tests
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  console.error.mockRestore();
});

describe('Document Middleware Tests', () => {
  let req;
  let res;
  let next;
  
  beforeEach(() => {
    req = {
      params: {
        documentId: 'doc123'
      },
      user: {
        id: 'user123'
      }
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    next = jest.fn();
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set up Document model mock
    Document.findOne = jest.fn();
  });
  
  describe('verifyDocumentAccessible', () => {
    test('should call next() when user is the document owner', async () => {
      // Mock document where user is owner
      const mockDoc = {
        documentId: 'doc123',
        owner: 'user123',
        collaborators: []
      };
      
      // Mock document find
      Document.findOne.mockResolvedValue(mockDoc);
      
      await verifyDocumentAccessible(req, res, next);
      
      // Verify document was found
      expect(Document.findOne).toHaveBeenCalledWith({ documentId: 'doc123' });
      
      // Verify document and ownership flag were attached to request
      expect(req.document).toBe(mockDoc);
      expect(req.isDocumentOwner).toBe(true);
      
      // Verify next was called
      expect(next).toHaveBeenCalled();
      
      // Verify no error response
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
    
    test('should call next() when user is a collaborator', async () => {
      // Mock document where user is a collaborator
      const mockDoc = {
        documentId: 'doc123',
        owner: 'other-user',
        collaborators: [{ user: 'user123' }]
      };
      
      // Mock document find
      Document.findOne.mockResolvedValue(mockDoc);
      
      await verifyDocumentAccessible(req, res, next);
      
      // Verify document was found
      expect(Document.findOne).toHaveBeenCalledWith({ documentId: 'doc123' });
      
      // Verify document and ownership flag were attached to request
      expect(req.document).toBe(mockDoc);
      expect(req.isDocumentOwner).toBe(false);
      
      // Verify next was called
      expect(next).toHaveBeenCalled();
      
      // Verify no error response
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
    
    test('should return 404 when document not found', async () => {
      // Mock document not found
      Document.findOne.mockResolvedValue(null);
      
      await verifyDocumentAccessible(req, res, next);
      
      // Verify document was searched for
      expect(Document.findOne).toHaveBeenCalledWith({ documentId: 'doc123' });
      
      // Verify error response
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ 
        error: "Document not found",
        code: "DOCUMENT_NOT_FOUND"
      });
      
      // Verify next was not called
      expect(next).not.toHaveBeenCalled();
    });
    
    test('should return 403 when user has no access to document', async () => {
      // Mock document where user is neither owner nor collaborator
      const mockDoc = {
        documentId: 'doc123',
        owner: 'other-user',
        collaborators: [{ user: 'another-user' }]
      };
      
      // Mock document find
      Document.findOne.mockResolvedValue(mockDoc);
      
      await verifyDocumentAccessible(req, res, next);
      
      // Verify document was found
      expect(Document.findOne).toHaveBeenCalledWith({ documentId: 'doc123' });
      
      // Verify error response
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ 
        error: "You don't have access to this document",
        code: "ACCESS_DENIED"
      });
      
      // Verify next was not called
      expect(next).not.toHaveBeenCalled();
    });
    
    test('should handle database errors', async () => {
      // Mock database error
      Document.findOne.mockImplementation(() => {
        throw new Error('Database error');
      });
      
      await verifyDocumentAccessible(req, res, next);
      
      // Verify error response
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Server error" });
      
      // Verify next was not called
      expect(next).not.toHaveBeenCalled();
    });
    
    test('should correctly handle ObjectId comparison', async () => {
      // Mock document with ObjectId-like strings for owner
      const mockDoc = {
        documentId: 'doc123',
        owner: {
          toString: () => 'user123'  // Mock ObjectId behavior
        },
        collaborators: []
      };
      
      // Mock document find
      Document.findOne.mockResolvedValue(mockDoc);
      
      await verifyDocumentAccessible(req, res, next);
      
      // Verify document and ownership flag were attached to request
      expect(req.document).toBe(mockDoc);
      expect(req.isDocumentOwner).toBe(true);
      
      // Verify next was called
      expect(next).toHaveBeenCalled();
    });
    
    test('should correctly handle ObjectId comparison for collaborators', async () => {
      // Mock document with ObjectId-like structures for collaborators
      const mockDoc = {
        documentId: 'doc123',
        owner: {
          toString: () => 'other-user'  // Mock ObjectId behavior
        },
        collaborators: [{
          user: {
            toString: () => 'user123'  // Mock ObjectId behavior
          }
        }]
      };
      
      // Mock document find
      Document.findOne.mockResolvedValue(mockDoc);
      
      await verifyDocumentAccessible(req, res, next);
      
      // Verify document and ownership flag were attached to request
      expect(req.document).toBe(mockDoc);
      expect(req.isDocumentOwner).toBe(false);
      
      // Verify next was called
      expect(next).toHaveBeenCalled();
    });
  });
});