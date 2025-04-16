import { 
  createDocument, 
  listDocuments, 
  deleteDocument, 
  leaveDocument, 
  loadDocument, 
  saveDocument, 
  updateDocumentTitle 
} from '../../controllers/documentController';
import Document from '../../DB/models/documentModel';
import User from '../../DB/models/userModel';
import * as Y from 'yjs';
import { v4 } from 'uuid';

// Mock dependencies
jest.mock('../../DB/models/documentModel');
jest.mock('../../DB/models/userModel');
jest.mock('uuid');
jest.mock('yjs');

// Silence console logs during tests
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  console.log.mockRestore();
  console.error.mockRestore();
});

describe('Document Controller Tests', () => {
  let req;
  let res;
  
  beforeEach(() => {
    req = {
      user: {
        id: 'user123'
      },
      body: {},
      params: {}
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set up basic mocks for methods
    Document.findOne = jest.fn();
    Document.create = jest.fn();
    Document.updateOne = jest.fn();
    Document.deleteOne = jest.fn();
    User.findById = jest.fn();
    User.findByIdAndUpdate = jest.fn();
    User.updateMany = jest.fn();
  });
  
  describe('createDocument', () => {
    test('should create a new document successfully', async () => {
      // Mock uuid
      v4.mockReturnValue('doc-uuid-123');
      
      // Mock Y.Doc and encode functions
      const mockYDoc = {};
      Y.Doc.mockReturnValue(mockYDoc);
      Y.encodeStateAsUpdate.mockReturnValue(new Uint8Array([1, 2, 3]));
      
      // Mock Document.findOne to return null (document doesn't exist)
      Document.findOne.mockResolvedValue(null);
      
      // Mock Document.create
      const mockNewDocument = { _id: 'doc-db-id', documentId: 'doc-uuid-123' };
      Document.create.mockResolvedValue(mockNewDocument);
      
      // Mock User.findByIdAndUpdate
      User.findByIdAndUpdate.mockResolvedValue({});
      
      await createDocument(req, res);
      
      // Verify response
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Document created successfully.",
        documentId: 'doc-uuid-123'
      });
      
      // Verify document was created with correct data
      expect(Document.create).toHaveBeenCalledWith({
        documentId: 'doc-uuid-123',
        state: Buffer.from(new Uint8Array([1, 2, 3])),
        documentTitle: "Untitled Document",
        owner: 'user123'
      });
      
      // Verify user was updated
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'user123',
        { $push: { ownedDocuments: mockNewDocument._id } },
        { new: true }
      );
    });
    
    test('should return error if not authenticated', async () => {
      req.user = null;
      
      await createDocument(req, res);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized. No user logged in." });
    });
    
    test('should return error if document ID already exists', async () => {
      req.body.documentId = 'existing-doc-id';
      
      // Mock existing document
      Document.findOne.mockResolvedValue({ documentId: 'existing-doc-id' });
      
      await createDocument(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Document with this ID already exists." });
    });
    
    test('should handle server errors', async () => {
      // Mock a server error
      Document.findOne.mockImplementation(() => {
        throw new Error('Database error');
      });
      
      await createDocument(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Server error. Could not create document." });
    });
  });
  
  describe('listDocuments', () => {
    test('should return owned and shared documents', async () => {
      const mockUser = {
        ownedDocuments: [{ documentId: 'doc1' }],
        sharedDocuments: [{ documentId: 'doc2' }]
      };
      
      // Set up nested mock properly
      const mockPopulate2 = jest.fn().mockResolvedValue(mockUser);
      const mockPopulate1 = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      User.findById.mockReturnValue({ populate: mockPopulate1 });
      
      await listDocuments(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        ownedDocuments: [{ documentId: 'doc1' }],
        sharedDocuments: [{ documentId: 'doc2' }]
      });
    });
    
    test('should return error if not authenticated', async () => {
      req.user = null;
      
      await listDocuments(req, res);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    });
    
    test('should return error if user not found', async () => {
      // Set up nested mock properly
      const mockPopulate2 = jest.fn().mockResolvedValue(null);
      const mockPopulate1 = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      User.findById.mockReturnValue({ populate: mockPopulate1 });
      
      await listDocuments(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "User not found" });
    });
    
    test('should handle server errors', async () => {
      // Use implementation instead of rejection
      User.findById.mockImplementation(() => {
        throw new Error('Database error');
      });
      
      await listDocuments(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Server error. Could not fetch documents." });
    });
  });
  
  describe('loadDocument', () => {
    test('should load an existing document', async () => {
      const documentId = 'doc123';
      const mockDocData = { 
        documentId, 
        state: Buffer.from([1, 2, 3]),
        documentTitle: 'Test Document'
      };
      
      // Mock document find
      Document.findOne.mockResolvedValue(mockDocData);
      
      // Mock Y.Doc
      const mockYDoc = {};
      Y.Doc.mockReturnValue(mockYDoc);
      
      // Mock apply update
      Y.applyUpdate.mockReturnValue(undefined);
      
      const result = await loadDocument(documentId);
      
      expect(Document.findOne).toHaveBeenCalledWith({ documentId });
      expect(Y.applyUpdate).toHaveBeenCalledWith(mockYDoc, new Uint8Array(mockDocData.state));
      expect(result).toEqual({ ydoc: mockYDoc, documentTitle: 'Test Document' });
    });
    
    test('should handle document not found', async () => {
      const documentId = 'nonexistent-doc';
      
      // Mock document not found
      Document.findOne.mockResolvedValue(null);
      
      // Mock Y.Doc
      const mockYDoc = {};
      Y.Doc.mockReturnValue(mockYDoc);
      
      const result = await loadDocument(documentId);
      
      expect(result).toEqual({ ydoc: mockYDoc, documentTitle: 'Untitled Document' });
    });
    
    test('should handle errors', async () => {
      const documentId = 'error-doc';
      
      // Mock error
      Document.findOne.mockImplementation(() => {
        throw new Error('Database error');
      });
      
      // Mock Y.Doc
      const mockYDoc = {};
      Y.Doc.mockReturnValue(mockYDoc);
      
      const result = await loadDocument(documentId);
      
      expect(result).toEqual({ ydoc: mockYDoc, documentTitle: 'Untitled Document' });
    });
  });
  
  describe('updateDocumentTitle', () => {
    test('should update document title successfully', async () => {
      const documentId = 'doc123';
      const newTitle = 'New Document Title';
      
      // Mock Document.updateOne
      Document.updateOne.mockResolvedValue({ nModified: 1 });
      
      await updateDocumentTitle(documentId, newTitle);
      
      expect(Document.updateOne).toHaveBeenCalledWith(
        { documentId }, 
        { documentTitle: newTitle }
      );
    });
    
    test('should handle errors', async () => {
      const documentId = 'error-doc';
      const newTitle = 'Error Document';
      
      // Mock error
      Document.updateOne.mockImplementation(() => {
        throw new Error('Database error');
      });
      
      // Should not throw error
      await expect(updateDocumentTitle(documentId, newTitle)).resolves.not.toThrow();
    });
  });
  
  describe('saveDocument', () => {
    test('should save document state successfully', async () => {
      const documentId = 'doc123';
      const mockYDoc = {};
      
      // Mock encode state
      Y.encodeStateAsUpdate.mockReturnValue(new Uint8Array([1, 2, 3]));
      
      // Mock Document.updateOne
      Document.updateOne.mockResolvedValue({ nModified: 1 });
      
      await saveDocument(documentId, mockYDoc);
      
      expect(Y.encodeStateAsUpdate).toHaveBeenCalledWith(mockYDoc);
      expect(Document.updateOne).toHaveBeenCalledWith(
        { documentId },
        { state: Buffer.from(new Uint8Array([1, 2, 3])) }
      );
    });
    
    test('should handle errors', async () => {
      const documentId = 'error-doc';
      const mockYDoc = {};
      
      // Mock encode state
      Y.encodeStateAsUpdate.mockReturnValue(new Uint8Array([1, 2, 3]));
      
      // Mock error
      Document.updateOne.mockImplementation(() => {
        throw new Error('Database error');
      });
      
      // Should not throw error
      await expect(saveDocument(documentId, mockYDoc)).resolves.not.toThrow();
    });
  });
  
  describe('deleteDocument', () => {
    test('should delete document successfully', async () => {
      req.params.documentId = 'doc123';
      
      // Mock document
      const mockDocument = {
        _id: 'doc-id-123',
        documentId: 'doc123',
        owner: 'user123',
        collaborators: [{ user: 'collab1' }, { user: 'collab2' }]
      };
      
      // Mock document find
      Document.findOne.mockResolvedValue(mockDocument);
      
      // Mock delete operations
      Document.deleteOne.mockResolvedValue({ deletedCount: 1 });
      User.findByIdAndUpdate.mockResolvedValue({});
      User.updateMany.mockResolvedValue({ nModified: 2 });
      
      await deleteDocument(req, res);
      
      expect(Document.deleteOne).toHaveBeenCalledWith({ documentId: 'doc123' });
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'user123',
        { $pull: { ownedDocuments: mockDocument._id } }
      );
      expect(User.updateMany).toHaveBeenCalledWith(
        { _id: { $in: ['collab1', 'collab2'] } },
        { $pull: { sharedDocuments: mockDocument._id } }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: "Document deleted successfully" });
    });
    
    test('should return error if not authenticated', async () => {
      req.user = null;
      req.params.documentId = 'doc123';
      
      await deleteDocument(req, res);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Unauthorised" });
    });
    
    test('should return error if document not found', async () => {
      req.params.documentId = 'nonexistent-doc';
      
      // Mock document not found
      Document.findOne.mockResolvedValue(null);
      
      await deleteDocument(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Document not found" });
    });
    
    test('should return error if user is not the owner', async () => {
      req.params.documentId = 'doc123';
      
      // Mock document with different owner
      Document.findOne.mockResolvedValue({
        documentId: 'doc123',
        owner: 'different-user'
      });
      
      await deleteDocument(req, res);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: "Only the document owner can delete it" });
    });
    
    test('should handle server errors', async () => {
      req.params.documentId = 'error-doc';
      
      // Mock error
      Document.findOne.mockImplementation(() => {
        throw new Error('Database error');
      });
      
      await deleteDocument(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Server error" });
    });
  });
  
  describe('leaveDocument', () => {
    test('should allow user to leave document successfully', async () => {
      req.params.documentId = 'doc123';
      
      // Mock document
      const mockDocument = {
        _id: 'doc-id-123',
        documentId: 'doc123',
        owner: 'owner123',
        collaborators: [{ user: 'user123' }]
      };
      
      // Mock document find
      Document.findOne.mockResolvedValue(mockDocument);
      
      // Mock update operations
      Document.updateOne.mockResolvedValue({ nModified: 1 });
      User.findByIdAndUpdate.mockResolvedValue({});
      
      await leaveDocument(req, res);
      
      expect(Document.updateOne).toHaveBeenCalledWith(
        { documentId: 'doc123' },
        { $pull: { collaborators: { user: 'user123' } } }
      );
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'user123',
        { $pull: { sharedDocuments: mockDocument._id } }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: "Successfully left the document" });
    });
    
    test('should return error if not authenticated', async () => {
      req.user = null;
      req.params.documentId = 'doc123';
      
      await leaveDocument(req, res);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Unauthorised" });
    });
    
    test('should return error if document not found', async () => {
      req.params.documentId = 'nonexistent-doc';
      
      // Mock document not found
      Document.findOne.mockResolvedValue(null);
      
      await leaveDocument(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Document not found" });
    });
    
    test('should return error if user is the owner', async () => {
      req.params.documentId = 'doc123';
      
      // Mock document where user is owner
      Document.findOne.mockResolvedValue({
        documentId: 'doc123',
        owner: 'user123'
      });
      
      await leaveDocument(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "You can't leave a document you own. Try deleting it instead." });
    });
    
    test('should return error if user is not a collaborator', async () => {
      req.params.documentId = 'doc123';
      
      // Mock document where user is not a collaborator
      Document.findOne.mockResolvedValue({
        documentId: 'doc123',
        owner: 'owner123',
        collaborators: [{ user: 'different-user' }]
      });
      
      await leaveDocument(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "You're not a collaborator on this document" });
    });
    
    test('should handle server errors', async () => {
      req.params.documentId = 'error-doc';
      
      // Mock error
      Document.findOne.mockImplementation(() => {
        throw new Error('Database error');
      });
      
      await leaveDocument(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Server error" });
    });
  });
});