import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Document from '../../DB/models/documentModel';
import User from '../../DB/models/userModel';

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
  await Document.deleteMany({});
  await User.deleteMany({});
});

describe('Document Model Tests', () => {
  test('should create a new document', async () => {
    // Create a user first
    const user = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedpassword'
    });
    await user.save();
    
    // Create a document
    const doc = new Document({
      documentId: 'test-doc-123',
      state: Buffer.from([1, 2, 3]),
      documentTitle: 'Test Document',
      owner: user._id
    });
    
    const savedDoc = await doc.save();
    
    // Verify document was saved
    expect(savedDoc.documentId).toBe('test-doc-123');
    expect(savedDoc.documentTitle).toBe('Test Document');
    expect(savedDoc.owner.toString()).toBe(user._id.toString());
    
    // Find the document in the database
    const foundDoc = await Document.findOne({ documentId: 'test-doc-123' });
    expect(foundDoc).toBeTruthy();
    expect(foundDoc.documentTitle).toBe('Test Document');
  });
  
  test('should add collaborators to a document', async () => {
    // Create owner and collaborator users
    const owner = new User({
      username: 'owner',
      email: 'owner@example.com',
      password: 'hashedpassword'
    });
    await owner.save();
    
    const collaborator = new User({
      username: 'collaborator',
      email: 'collaborator@example.com',
      password: 'hashedpassword'
    });
    await collaborator.save();
    
    // Create a document
    const doc = new Document({
      documentId: 'test-doc-123',
      state: Buffer.from([1, 2, 3]),
      documentTitle: 'Test Document',
      owner: owner._id,
      collaborators: [{ user: collaborator._id }]
    });
    
    await doc.save();
    
    // Find the document and check collaborators
    const foundDoc = await Document.findOne({ documentId: 'test-doc-123' });
    expect(foundDoc.collaborators).toHaveLength(1);
    expect(foundDoc.collaborators[0].user.toString()).toBe(collaborator._id.toString());
  });
});