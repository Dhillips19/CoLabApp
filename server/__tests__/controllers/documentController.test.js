import { createDocument, listDocuments } from '../../controllers/documentController';
import Document from '../../DB/models/documentModel';
import User from '../../DB/models/userModel';
import * as Y from 'yjs';
import { v4 } from 'uuid';

// Mock dependencies
jest.mock('../../DB/models/documentModel');
jest.mock('../../DB/models/userModel');
jest.mock('uuid');
jest.mock('yjs');

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
      Document.findOne.mockResolvedValueOnce(null);
      
      // Mock Document.create
      const mockNewDocument = { _id: 'doc-db-id', documentId: 'doc-uuid-123' };
      Document.create.mockResolvedValueOnce(mockNewDocument);
      
      // Mock User.findByIdAndUpdate
      User.findByIdAndUpdate.mockResolvedValueOnce({});
      
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
    
    // Add more test cases
  });
  
  describe('listDocuments', () => {
    test('should return owned and shared documents', async () => {
      const mockUser = {
        ownedDocuments: [{ documentId: 'doc1' }],
        sharedDocuments: [{ documentId: 'doc2' }]
      };
      
      User.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockUser)
        })
      });
      
      await listDocuments(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        ownedDocuments: [{ documentId: 'doc1' }],
        sharedDocuments: [{ documentId: 'doc2' }]
      });
    });
    
    // Add more test cases
  });
});