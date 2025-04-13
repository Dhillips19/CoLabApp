import { setupServer } from 'msw/node';
import { rest } from 'msw';

// Define handlers for API endpoints
const handlers = [
  // Auth endpoints
  rest.post('http://localhost:3001/api/auth/login', (req, res, ctx) => {
    const { email, password } = req.body;
    
    if (email === 'test@example.com' && password === 'password123') {
      return res(
        ctx.status(200),
        ctx.json({
          message: 'User login successful',
          token: 'mock-token-123'
        })
      );
    }
    
    return res(
      ctx.status(400),
      ctx.json({ message: 'Incorrect Email or Password' })
    );
  }),
  
  rest.post('http://localhost:3001/api/auth/register', (req, res, ctx) => {
    const { email, username } = req.body;
    
    if (email === 'existing@example.com') {
      return res(
        ctx.status(400),
        ctx.json({ message: 'Account with that email already exists' })
      );
    }
    
    if (username === 'existinguser') {
      return res(
        ctx.status(400),
        ctx.json({ message: 'Account with that username already exists' })
      );
    }
    
    return res(
      ctx.status(201),
      ctx.json({ message: 'User registered successfully' })
    );
  }),
  
  rest.get('http://localhost:3001/api/auth/verify', (req, res, ctx) => {
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader && authHeader.includes('valid-token')) {
      return res(ctx.status(200), ctx.json({ valid: true }));
    }
    
    return res(ctx.status(401), ctx.json({ error: 'Invalid token' }));
  }),
  
  // Document endpoints
  rest.get('http://localhost:3001/api/documents/list', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        ownedDocuments: [
          {
            _id: 'doc1',
            documentId: 'doc-123',
            documentTitle: 'Test Document 1',
            updatedAt: new Date().toISOString()
          }
        ],
        sharedDocuments: [
          {
            _id: 'doc2',
            documentId: 'shared-123',
            documentTitle: 'Shared Document 1',
            updatedAt: new Date().toISOString()
          }
        ]
      })
    );
  }),
  
  rest.post('http://localhost:3001/api/documents/create', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        message: 'Document created successfully.',
        documentId: 'new-doc-123'
      })
    );
  }),
  
  rest.get('http://localhost:3001/api/documents/verify/:documentId', (req, res, ctx) => {
    const { documentId } = req.params;
    
    if (documentId === 'valid-doc') {
      return res(
        ctx.status(200),
        ctx.json({
          exists: true,
          documentId: 'valid-doc',
          owner: true
        })
      );
    } else if (documentId === 'shared-doc') {
      return res(
        ctx.status(200),
        ctx.json({
          exists: true,
          documentId: 'shared-doc',
          owner: false
        })
      );
    }
    
    return res(
      ctx.status(404),
      ctx.json({
        error: 'Document not found',
        code: 'DOCUMENT_NOT_FOUND'
      })
    );
  }),
  
  // Collaborator endpoints
  rest.get('http://localhost:3001/api/editor/search', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        { _id: 'user1', username: 'testuser1', email: 'testuser1@example.com' },
        { _id: 'user2', username: 'testuser2', email: 'testuser2@example.com' }
      ])
    );
  }),
  
  rest.get('http://localhost:3001/api/editor/:documentId/collaborators', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        { _id: 'user3', username: 'collaborator1', email: 'collab1@example.com' },
        { _id: 'user4', username: 'collaborator2', email: 'collab2@example.com' }
      ])
    );
  })
];

export const server = setupServer(...handlers);