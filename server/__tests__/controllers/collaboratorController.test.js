import { 
  searchUser, 
  addCollaborator, 
  getCollaborators, 
  removeCollaborator 
} from '../../controllers/collaboratorController';
import Document from '../../DB/models/documentModel';
import User from '../../DB/models/userModel';

// Mock dependencies
jest.mock('../../DB/models/documentModel');
jest.mock('../../DB/models/userModel');

// Silence console logs during tests
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  console.error.mockRestore();
});

describe('Collaborator Controller Tests', () => {
  let req;
  let res;
  
  beforeEach(() => {
    req = {
      user: {
        id: 'owner123'
      },
      params: {
        documentId: 'doc123',
        userId: 'user456'
      },
      query: {
        term: 'test',
        documentId: 'doc123'
      },
      body: {
        userId: 'user456'
      }
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set up Document model mocks
    Document.findOne = jest.fn();
    Document.findOneAndUpdate = jest.fn();
    
    // Set up User model mocks
    User.find = jest.fn();
    User.findByIdAndUpdate = jest.fn();
  });
  
  describe('searchUser', () => {
    test('should search for users successfully', async () => {
      // Mock document
      const mockDoc = {
        documentId: 'doc123',
        owner: 'owner123',
        collaborators: [
          { user: 'collab1' },
          { user: 'collab2' }
        ]
      };
      
      // Mock document find
      Document.findOne.mockResolvedValue(mockDoc);
      
      // Mock users result
      const mockUsers = [
        { _id: 'user1', username: 'testuser1', email: 'test1@example.com' },
        { _id: 'user2', username: 'testuser2', email: 'test2@example.com' }
      ];
      
      // Mock user find
      User.find.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUsers)
      });
      
      await searchUser(req, res);
      
      // Verify findOne was called with correct document ID
      expect(Document.findOne).toHaveBeenCalledWith({ documentId: 'doc123' });
      
      // Verify find was called with correct query
      expect(User.find).toHaveBeenCalledWith({
        $and: [
          {
            $or: [
              { username: { $regex: 'test', $options: 'i' } },
              { email: { $regex: 'test', $options: 'i' } }
            ]
          },
          { _id: { $nin: ['owner123', 'collab1', 'collab2'] } }
        ]
      });
      
      // Verify response
      expect(res.json).toHaveBeenCalledWith(mockUsers);
    });
    
    test('should return error if search term is missing', async () => {
      // Remove search term
      req.query.term = '';
      
      await searchUser(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Search term is required' });
      
      // Document find should not be called
      expect(Document.findOne).not.toHaveBeenCalled();
    });
    
    test('should return error if document not found', async () => {
      // Mock document not found
      Document.findOne.mockResolvedValue(null);
      
      await searchUser(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Document not found' });
      
      // User find should not be called
      expect(User.find).not.toHaveBeenCalled();
    });
    
    test('should handle server errors', async () => {
      // Mock database error
      Document.findOne.mockImplementation(() => {
        throw new Error('Database error');
      });
      
      await searchUser(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Error searching for users' });
    });
  });
  
  describe('addCollaborator', () => {
    test('should add collaborator successfully', async () => {
      // Mock document
      const mockDoc = {
        _id: 'doc-id-123',
        documentId: 'doc123',
        owner: 'owner123',
        collaborators: [],
        save: jest.fn().mockResolvedValue(true)
      };
      
      // Mock document find
      Document.findOne.mockResolvedValue(mockDoc);
      
      // Mock user update
      User.findByIdAndUpdate.mockResolvedValue({});
      
      await addCollaborator(req, res);
      
      // Verify document was found
      expect(Document.findOne).toHaveBeenCalledWith({ documentId: 'doc123' });
      
      // Verify collaborator was added to document
      expect(mockDoc.collaborators).toEqual([{ user: 'user456' }]);
      expect(mockDoc.save).toHaveBeenCalled();
      
      // Verify document was added to user's shared documents
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'user456',
        { $push: { sharedDocuments: 'doc-id-123' } },
        { new: true }
      );
      
      // Verify response
      expect(res.json).toHaveBeenCalledWith({ message: 'Collaborator added successfully' });
    });
    
    test('should handle document not found', async () => {
      // Mock document not found
      Document.findOne.mockResolvedValue(null);
      
      await addCollaborator(req, res);
      
      // Should result in error (would be caught in catch block)
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
    
    test('should handle error saving document', async () => {
      // Mock document
      const mockDoc = {
        _id: 'doc-id-123',
        documentId: 'doc123',
        owner: 'owner123',
        collaborators: [],
        save: jest.fn().mockImplementation(() => {
          throw new Error('Save error');
        })
      };
      
      // Mock document find
      Document.findOne.mockResolvedValue(mockDoc);
      
      await addCollaborator(req, res);
      
      // Verify error response
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
      
      // User update should not be called
      expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
    });
    
    test('should handle error updating user', async () => {
      // Mock document
      const mockDoc = {
        _id: 'doc-id-123',
        documentId: 'doc123',
        owner: 'owner123',
        collaborators: [],
        save: jest.fn().mockResolvedValue(true)
      };
      
      // Mock document find
      Document.findOne.mockResolvedValue(mockDoc);
      
      // Mock user update error
      User.findByIdAndUpdate.mockImplementation(() => {
        throw new Error('Update error');
      });
      
      await addCollaborator(req, res);
      
      // Verify error response
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
  });
  
  describe('getCollaborators', () => {
    test('should get collaborators successfully', async () => {
      // Mock document
      const mockDoc = {
        documentId: 'doc123',
        owner: 'owner123',
        collaborators: [
          { user: 'collab1' },
          { user: 'collab2' }
        ]
      };
      
      // Mock document find
      Document.findOne.mockResolvedValue(mockDoc);
      
      // Mock collaborators
      const mockCollaborators = [
        { _id: 'collab1', username: 'collabuser1', email: 'collab1@example.com' },
        { _id: 'collab2', username: 'collabuser2', email: 'collab2@example.com' }
      ];
      
      // Mock user find
      User.find.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockCollaborators)
      });
      
      await getCollaborators(req, res);
      
      // Verify document was found
      expect(Document.findOne).toHaveBeenCalledWith({ documentId: 'doc123' });
      
      // Verify collaborators were retrieved
      expect(User.find).toHaveBeenCalledWith({ _id: { $in: ['collab1', 'collab2'] } });
      
      // Verify response
      expect(res.json).toHaveBeenCalledWith(mockCollaborators);
    });
    
    test('should return error if document not found', async () => {
      // Mock document not found
      Document.findOne.mockResolvedValue(null);
      
      await getCollaborators(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Document not found' });
      
      // User find should not be called
      expect(User.find).not.toHaveBeenCalled();
    });
    
    test('should return error if user is not the owner', async () => {
      // Set different user ID
      req.user.id = 'different-user';
      
      // Mock document with different owner
      const mockDoc = {
        documentId: 'doc123',
        owner: 'owner123',
        collaborators: []
      };
      
      // Mock document find
      Document.findOne.mockResolvedValue(mockDoc);
      
      await getCollaborators(req, res);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Only document owners can manage collaborators' });
      
      // User find should not be called
      expect(User.find).not.toHaveBeenCalled();
    });
    
    test('should handle server errors', async () => {
      // Mock database error
      Document.findOne.mockImplementation(() => {
        throw new Error('Database error');
      });
      
      await getCollaborators(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
  });
  
  describe('removeCollaborator', () => {
    test('should remove collaborator successfully', async () => {
      // Mock document
      const mockDoc = {
        _id: 'doc-id-123',
        documentId: 'doc123',
        owner: 'owner123',
        collaborators: [{ user: 'user456' }]
      };
      
      // Mock document find
      Document.findOne.mockResolvedValue(mockDoc);
      
      // Mock document update
      Document.findOneAndUpdate.mockResolvedValue({});
      
      // Mock user update
      User.findByIdAndUpdate.mockResolvedValue({});
      
      await removeCollaborator(req, res);
      
      // Verify document was found
      expect(Document.findOne).toHaveBeenCalledWith({ documentId: 'doc123' });
      
      // Verify collaborator was removed from document
      expect(Document.findOneAndUpdate).toHaveBeenCalledWith(
        { documentId: 'doc123' },
        { $pull: { collaborators: { user: 'user456' } } }
      );
      
      // Verify document was removed from user's shared documents
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'user456',
        { $pull: { sharedDocuments: 'doc-id-123' } }
      );
      
      // Verify response
      expect(res.json).toHaveBeenCalledWith({ message: 'Collaborator removed successfully' });
    });
    
    test('should return error if document not found', async () => {
      // Mock document not found
      Document.findOne.mockResolvedValue(null);
      
      await removeCollaborator(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Document not found' });
      
      // Operations should not be performed
      expect(Document.findOneAndUpdate).not.toHaveBeenCalled();
      expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
    });
    
    test('should return error if user is not the owner', async () => {
      // Set different user ID
      req.user.id = 'different-user';
      
      // Mock document with different owner
      const mockDoc = {
        _id: 'doc-id-123',
        documentId: 'doc123',
        owner: 'owner123',
        collaborators: [{ user: 'user456' }]
      };
      
      // Mock document find
      Document.findOne.mockResolvedValue(mockDoc);
      
      await removeCollaborator(req, res);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Only document owners can remove collaborators' });
      
      // Operations should not be performed
      expect(Document.findOneAndUpdate).not.toHaveBeenCalled();
      expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
    });
    
    test('should handle server errors', async () => {
      // Mock database error
      Document.findOne.mockImplementation(() => {
        throw new Error('Database error');
      });
      
      await removeCollaborator(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
    
    test('should handle error removing collaborator from document', async () => {
      // Mock document
      const mockDoc = {
        _id: 'doc-id-123',
        documentId: 'doc123',
        owner: 'owner123',
        collaborators: [{ user: 'user456' }]
      };
      
      // Mock document find
      Document.findOne.mockResolvedValue(mockDoc);
      
      // Mock document update error
      Document.findOneAndUpdate.mockImplementation(() => {
        throw new Error('Update error');
      });
      
      await removeCollaborator(req, res);
      
      // Verify error response
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
      
      // User update should not be called
      expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });
});