import { createServer } from 'http';
import { Server } from 'socket.io';
import Client from 'socket.io-client';
import initialiseSocket from '../../socketHandler';
import { loadDocument, saveDocument } from '../../controllers/documentController';
import { loadChatMessages } from '../../controllers/chatController';
import * as Y from 'yjs';

// Mock dependencies
jest.mock('../../controllers/documentController');
jest.mock('../../controllers/chatController');
jest.mock('yjs');

describe('Document Room Capacity Test', () => {
  let io, httpServer;
  const PORT = 3002;
  const DOCUMENT_ID = 'capacity-test-doc';
  const clients = [];
  const MAX_CLIENTS = 50;
  
  beforeAll(() => {
    // Set longer timeout for this test
    jest.setTimeout(60000);
    
    // Create HTTP server for Socket.io
    httpServer = createServer();
    
    // Initialize socket server
    io = initialiseSocket(httpServer);
    
    // Start server
    httpServer.listen(PORT);
    
    // Mock document loading
    const mockYDoc = { 
      mock: true,
      getData: jest.fn().mockReturnValue('mock data')
    };
    
    loadDocument.mockResolvedValue({
      ydoc: mockYDoc,
      documentTitle: 'Capacity Test Document'
    });
    
    loadChatMessages.mockResolvedValue([]);
    saveDocument.mockResolvedValue(true);
    
    // Mock Y.js functions
    Y.encodeStateAsUpdate.mockReturnValue(new Uint8Array([1, 2, 3]));
    Y.applyUpdate.mockImplementation(() => {});
    
    // Silence console output during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  
  afterAll(async () => {
    // Disconnect all clients
    await Promise.all(clients.map(client => {
      return new Promise(resolve => {
        if (client.connected) {
          client.disconnect();
        }
        resolve();
      });
    }));
    
    // Close server
    io.close();
    httpServer.close();
    
    // Restore console
    console.log.mockRestore();
    console.error.mockRestore();
    console.warn.mockRestore();
  });
  
  test('should handle multiple concurrent users in a document room', async () => {
    // Performance metrics
    const startTime = Date.now();
    const connectionTimes = [];
    const memoryUsage = [];
    const results = {
      userCount: 0,
      successfulConnections: 0,
      failedConnections: 0,
      averageJoinTime: 0,
      totalTime: 0,
      initialMemory: process.memoryUsage().heapUsed / 1024 / 1024,
      finalMemory: 0,
      memoryPerUser: 0
    };
    
    // Connect clients sequentially to avoid overwhelming the server
    for (let i = 0; i < MAX_CLIENTS; i++) {
      const clientStartTime = Date.now();
      
      try {
        // Create new client
        const client = Client(`http://localhost:${PORT}`);
        clients.push(client);
        
        // Wait for connection
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Connection timeout'));
          }, 5000);
          
          client.on('connect', () => {
            clearTimeout(timeout);
            resolve();
          });
          
          client.on('connect_error', (err) => {
            clearTimeout(timeout);
            reject(err);
          });
        });
        
        // Join document room
        const joinPromise = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Join room timeout'));
          }, 5000);
          
          let resolved = false;
          
          client.on('updateUsers', users => {
            // We only want to resolve once
            if (!resolved) {
              clearTimeout(timeout);
              resolved = true;
              resolve(users);
            }
          });
          
          client.on('documentError', error => {
            clearTimeout(timeout);
            reject(new Error(`Document error: ${error.error}`));
          });
          
          client.emit('joinDocumentRoom', {
            documentId: DOCUMENT_ID,
            username: `user-${i}`,
            colour: `#${Math.floor(Math.random()*16777215).toString(16)}`
          });
        });
        
        // Wait for join to complete
        const users = await joinPromise;
        
        // Record connection time for this client
        const joinTime = Date.now() - clientStartTime;
        connectionTimes.push(joinTime);
        
        // Record memory usage after each client connects
        memoryUsage.push(process.memoryUsage().heapUsed / 1024 / 1024);
        
        results.successfulConnections++;
        
        // Log progress (temporary console restoration)
        if (i % 10 === 0) {
          console.log.mockRestore();
          console.log(`Successfully connected ${i+1} clients (latest join time: ${joinTime}ms)`);
          jest.spyOn(console, 'log').mockImplementation(() => {});
        }
        
        // Optional: add a small delay between connections to prevent flooding
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        results.failedConnections++;
        console.error.mockRestore();
        console.error(`Failed to connect client ${i}: ${error.message}`);
        jest.spyOn(console, 'error').mockImplementation(() => {});
        
        // Stop the test if we've had 3 consecutive failures
        if (i > 0 && results.failedConnections >= 3) {
          console.log.mockRestore();
          console.log(`Stopping test after ${results.failedConnections} consecutive failures`);
          jest.spyOn(console, 'log').mockImplementation(() => {});
          break;
        }
      }
    }
    
    // Calculate results
    results.userCount = clients.length;
    results.totalTime = Date.now() - startTime;
    results.averageJoinTime = connectionTimes.length > 0 
      ? connectionTimes.reduce((a, b) => a + b, 0) / connectionTimes.length 
      : 0;
    results.finalMemory = process.memoryUsage().heapUsed / 1024 / 1024;
    results.memoryPerUser = results.successfulConnections > 0 
      ? (results.finalMemory - results.initialMemory) / results.successfulConnections 
      : 0;
    
    // Log performance metrics
    console.log.mockRestore();
    console.error.mockRestore();
    console.warn.mockRestore();
    
    console.log(`
    ===== DOCUMENT ROOM CAPACITY TEST RESULTS =====
    Total clients created: ${results.userCount}
    Successful connections: ${results.successfulConnections}
    Failed connections: ${results.failedConnections}
    Total test time: ${results.totalTime}ms
    Average join time: ${results.averageJoinTime.toFixed(2)}ms
    Initial memory usage: ${results.initialMemory.toFixed(2)}MB
    Final memory usage: ${results.finalMemory.toFixed(2)}MB
    Memory usage per user: ${results.memoryPerUser.toFixed(2)}MB
    `);
    
    // Test passing some updates between clients
    if (results.successfulConnections >= 2) {
      // Only run update test if we have at least 2 successful connections
      console.log("Testing updates between clients...");
      
      const updateReceived = jest.fn();
      
      // Setup listener on the last successful client
      const lastClient = clients[results.successfulConnections - 1];
      lastClient.on('update', () => {
        updateReceived();
      });
      
      // Send update from first client
      clients[0].emit('update', new Uint8Array([1, 2, 3]));
      
      // Wait a bit for update to propagate
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Verify update was received
      expect(updateReceived).toHaveBeenCalled();
      console.log("Update successfully received between clients");
    }
    
    // Make some assertions about the results
    expect(results.successfulConnections).toBeGreaterThan(0);
    expect(results.averageJoinTime).toBeLessThan(5000); // Join time should be reasonable
    
    // Optionally re-mock console if needed for other tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  }, 60000); // Set timeout to 60 seconds for this test
});