import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Chat from '../../DB/models/chatModel';

let mongoServer;

beforeAll(async () => {
  // Start an in-memory MongoDB server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect Mongoose to the in-memory database
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

afterAll(async () => {
  // Disconnect and stop server
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear database collections before each test
  await Chat.deleteMany({});
});

describe('Chat Model Tests', () => {
  test('should create a new chat', async () => {
    const chat = new Chat({
      documentId: 'test-doc-123',
      messages: []
    });
    
    const savedChat = await chat.save();
    
    // Verify chat was saved
    expect(savedChat.documentId).toBe('test-doc-123');
    expect(savedChat.messages).toHaveLength(0);
    
    // Find the chat in the database
    const foundChat = await Chat.findOne({ documentId: 'test-doc-123' });
    expect(foundChat).toBeTruthy();
  });
  
  test('should require documentId field', async () => {
    const chat = new Chat({
      messages: []
    });
    
    // Should fail validation
    await expect(chat.save()).rejects.toThrow();
  });
  
  test('should add a message to chat', async () => {
    // Create chat
    const chat = new Chat({
      documentId: 'test-doc-123',
      messages: []
    });
    
    await chat.save();
    
    // Add a message
    const message = {
      username: 'testuser',
      message: 'Hello, world!',
      timestamp: new Date()
    };
    
    chat.messages.push(message);
    await chat.save();
    
    // Verify message was added
    const updatedChat = await Chat.findOne({ documentId: 'test-doc-123' });
    expect(updatedChat.messages).toHaveLength(1);
    expect(updatedChat.messages[0].username).toBe('testuser');
    expect(updatedChat.messages[0].message).toBe('Hello, world!');
  });
  
  test('should add multiple messages to chat', async () => {
    // Create chat
    const chat = new Chat({
      documentId: 'test-doc-123',
      messages: []
    });
    
    await chat.save();
    
    // Add messages
    const messages = [
      {
        username: 'user1',
        message: 'First message',
        timestamp: new Date(Date.now() - 1000)
      },
      {
        username: 'user2',
        message: 'Second message',
        timestamp: new Date()
      }
    ];
    
    chat.messages.push(...messages);
    await chat.save();
    
    // Verify messages were added
    const updatedChat = await Chat.findOne({ documentId: 'test-doc-123' });
    expect(updatedChat.messages).toHaveLength(2);
    expect(updatedChat.messages[0].username).toBe('user1');
    expect(updatedChat.messages[0].message).toBe('First message');
    expect(updatedChat.messages[1].username).toBe('user2');
    expect(updatedChat.messages[1].message).toBe('Second message');
  });
  
  test('should validate required message fields', async () => {
    // Create chat
    const chat = new Chat({
      documentId: 'test-doc-123',
      messages: []
    });
    
    await chat.save();
    
    // Add an invalid message (missing required 'message' field)
    const invalidMessage = {
      username: 'testuser',
      // message field missing
      timestamp: new Date()
    };
    
    chat.messages.push(invalidMessage);
    
    // Should fail validation
    await expect(chat.save()).rejects.toThrow();
  });
  
  test('should store multiple chats for different documents', async () => {
    // Create first chat
    const chat1 = new Chat({
      documentId: 'doc-1',
      messages: [{
        username: 'user1',
        message: 'Message for doc 1',
        timestamp: new Date()
      }]
    });
    
    await chat1.save();
    
    // Create second chat
    const chat2 = new Chat({
      documentId: 'doc-2',
      messages: [{
        username: 'user2',
        message: 'Message for doc 2',
        timestamp: new Date()
      }]
    });
    
    await chat2.save();
    
    // Verify both chats exist
    const foundChat1 = await Chat.findOne({ documentId: 'doc-1' });
    const foundChat2 = await Chat.findOne({ documentId: 'doc-2' });
    
    expect(foundChat1).toBeTruthy();
    expect(foundChat2).toBeTruthy();
    expect(foundChat1.messages[0].message).toBe('Message for doc 1');
    expect(foundChat2.messages[0].message).toBe('Message for doc 2');
  });
  
  test('should update existing chat with findOneAndUpdate', async () => {
    // Create chat
    const chat = new Chat({
      documentId: 'test-doc-123',
      messages: [{
        username: 'user1',
        message: 'First message',
        timestamp: new Date()
      }]
    });
    
    await chat.save();
    
    // New message to add
    const newMessage = {
      username: 'user2',
      message: 'Second message',
      timestamp: new Date()
    };
    
    // Update using findOneAndUpdate (similar to how your controller works)
    await Chat.findOneAndUpdate(
      { documentId: 'test-doc-123' },
      { $push: { messages: newMessage } },
      { new: true }
    );
    
    // Verify message was added
    const updatedChat = await Chat.findOne({ documentId: 'test-doc-123' });
    expect(updatedChat.messages).toHaveLength(2);
    expect(updatedChat.messages[1].username).toBe('user2');
    expect(updatedChat.messages[1].message).toBe('Second message');
  });
});