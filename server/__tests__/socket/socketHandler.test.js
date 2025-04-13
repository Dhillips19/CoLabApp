import { createServer } from 'http';
import { Server } from 'socket.io';
import Client from 'socket.io-client';
import initialiseSocket from '../../socketHandler';
import { loadDocument, saveDocument } from '../../controllers/documentController';
import { loadChatMessages } from '../../controllers/chatController';

// Mock dependencies
jest.mock('../../controllers/documentController');
jest.mock('../../controllers/chatController');

describe('Socket Handler Tests', () => {
  let io, serverSocket, clientSocket, httpServer;
  
  beforeAll(() => {
    // Create HTTP server for Socket.io
    httpServer = createServer();
    
    // Initialize socket server
    io = initialiseSocket(httpServer);
    
    // Start server
    httpServer.listen(3002);
  });
  
  afterAll(() => {
    // Close everything after tests
    io.close();
    httpServer.close();
  });
  
  beforeEach(async () => {
    // Create a client socket for tests
    clientSocket = Client('http://localhost:3002');
    
    // Wait for connection to establish
    await new Promise(resolve => {
      clientSocket.on('connect', resolve);
    });
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mocks with default implementations
    loadDocument.mockResolvedValue({
      ydoc: { mock: true },
      documentTitle: 'Test Document'
    });
    
    loadChatMessages.mockResolvedValue([]);
  });
  
  afterEach(() => {
    // Close client socket
    clientSocket.disconnect();
  });
  
  test('should join document room and receive initial state', async () => {
    // Prepare to listen for events from server
    const initialStatePromise = new Promise(resolve => {
      clientSocket.on('initialState', data => {
        resolve(data);
      });
    });
    
    const titlePromise = new Promise(resolve => {
      clientSocket.on('updateTitle', title => {
        resolve(title);
      });
    });
    
    // Emit joinDocumentRoom event
    clientSocket.emit('joinDocumentRoom', {
      documentId: 'test-doc-123',
      username: 'testuser',
      colour: '#ff0000'
    });
    
    // Wait for server response
    const initialState = await initialStatePromise;
    const title = await titlePromise;
    
    // Verify document was loaded
    expect(loadDocument).toHaveBeenCalledWith('test-doc-123');
    
    // Verify chat messages were loaded
    expect(loadChatMessages).toHaveBeenCalledWith('test-doc-123');
    
    // Verify correct data was emitted to client
    expect(title).toBe('Test Document');
  });
  
  test('should handle document updates', async () => {
    // Join room first
    clientSocket.emit('joinDocumentRoom', {
      documentId: 'test-doc-123',
      username: 'testuser',
      colour: '#ff0000'
    });
    
    // Wait to ensure connection is established
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Mock update data
    const mockUpdate = new Uint8Array([1, 2, 3]);
    
    // Send update
    clientSocket.emit('update', mockUpdate);
    
    // Give time for update to be processed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify room was set up correctly
    // Note: Testing broadcast events requires a second client
    // In a full test, you should create another client to receive the broadcast
  });
  
  test('should handle chat messages', async () => {
    // Prepare to listen for messages
    const messagePromise = new Promise(resolve => {
      clientSocket.on('receiveMessage', message => {
        resolve(message);
      });
    });
    
    // Join room first
    clientSocket.emit('joinDocumentRoom', {
      documentId: 'test-doc-123',
      username: 'testuser',
      colour: '#ff0000'
    });
    
    // Wait to ensure connection is established
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Send a message
    const mockMessage = {
      documentId: 'test-doc-123',
      username: 'testuser',
      message: 'Hello, world!'
    };
    
    clientSocket.emit('sendMessage', mockMessage);
    
    // Wait for message to be echoed back
    const receivedMessage = await messagePromise;
    
    // Verify message was sent correctly
    expect(receivedMessage.username).toBe('testuser');
    expect(receivedMessage.message).toBe('Hello, world!');
  });
});