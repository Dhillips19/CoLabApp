import { saveChatMessage, loadChatMessages } from '../../controllers/chatController';
import Chat from '../../DB/models/chatModel';

// Mock dependencies
jest.mock('../../DB/models/chatModel');

// Silence console logs during tests
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  console.error.mockRestore();
});

describe('Chat Controller Tests', () => {
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set up basic mock for Chat model methods
    Chat.findOneAndUpdate = jest.fn();
    Chat.findOne = jest.fn();
  });
  
  describe('saveChatMessage', () => {
    test('should save a new chat message successfully', async () => {
      const documentId = 'doc123';
      const chatMessage = {
        username: 'testuser',
        text: 'Hello world',
        timestamp: new Date().toISOString()
      };
      
      const mockChat = {
        documentId,
        messages: [chatMessage]
      };
      
      // Mock successful save
      Chat.findOneAndUpdate.mockResolvedValue(mockChat);
      
      const result = await saveChatMessage(documentId, chatMessage);
      
      // Check Chat model was called with correct params
      expect(Chat.findOneAndUpdate).toHaveBeenCalledWith(
        { documentId },
        { $push: { messages: chatMessage } },
        { new: true, upsert: true }
      );
      
      // Check return value
      expect(result).toEqual(mockChat);
    });
    
    test('should handle errors when saving chat message', async () => {
      const documentId = 'error-doc';
      const chatMessage = {
        username: 'testuser',
        text: 'Error message',
        timestamp: new Date().toISOString()
      };
      
      // Mock database error
      Chat.findOneAndUpdate.mockImplementation(() => {
        throw new Error('Database error');
      });
      
      const result = await saveChatMessage(documentId, chatMessage);
      
      // Function should not throw but return undefined
      expect(result).toBeUndefined();
      expect(Chat.findOneAndUpdate).toHaveBeenCalled();
    });
  });
  
  describe('loadChatMessages', () => {
    test('should load existing chat messages', async () => {
      const documentId = 'doc123';
      const mockMessages = [
        {
          username: 'user1',
          text: 'Message 1',
          timestamp: '2023-01-01T12:00:00.000Z'
        },
        {
          username: 'user2',
          text: 'Message 2',
          timestamp: '2023-01-01T12:01:00.000Z'
        }
      ];
      
      const mockChat = {
        documentId,
        messages: mockMessages
      };
      
      // Mock finding chat document
      Chat.findOne.mockResolvedValue(mockChat);
      
      const result = await loadChatMessages(documentId);
      
      // Check Chat model was called with correct params
      expect(Chat.findOne).toHaveBeenCalledWith({ documentId });
      
      // Check return value
      expect(result).toEqual(mockMessages);
    });
    
    test('should return empty array when no chat exists', async () => {
      const documentId = 'new-doc';
      
      // Mock chat not found
      Chat.findOne.mockResolvedValue(null);
      
      const result = await loadChatMessages(documentId);
      
      // Check return value
      expect(result).toEqual([]);
    });
    
    test('should handle errors when loading chat messages', async () => {
      const documentId = 'error-doc';
      
      // Mock database error
      Chat.findOne.mockImplementation(() => {
        throw new Error('Database error');
      });
      
      const result = await loadChatMessages(documentId);
      
      // Function should return empty array on error
      expect(result).toEqual([]);
    });
  });
});