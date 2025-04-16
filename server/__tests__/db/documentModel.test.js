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
  
  test('should require documentId field', async () => {
    // Create a user
    const user = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedpassword'
    });
    await user.save();
    
    // Create a document without documentId
    const doc = new Document({
      state: Buffer.from([1, 2, 3]),
      documentTitle: 'Test Document',
      owner: user._id
    });
    
    // Should fail validation
    await expect(doc.save()).rejects.toThrow();
  });
  
  test('should require state field', async () => {
    // Create a user
    const user = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedpassword'
    });
    await user.save();
    
    // Create a document without state
    const doc = new Document({
      documentId: 'test-doc-123',
      documentTitle: 'Test Document',
      owner: user._id
    });
    
    // Should fail validation
    await expect(doc.save()).rejects.toThrow();
  });
  
  test('should update document title', async () => {
    // Create a user
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
    
    await doc.save();
    
    // Update document title
    await Document.updateOne(
      { documentId: 'test-doc-123' },
      { documentTitle: 'Updated Document Title' }
    );
    
    // Verify title was updated
    const updatedDoc = await Document.findOne({ documentId: 'test-doc-123' });
    expect(updatedDoc.documentTitle).toBe('Updated Document Title');
  });
  
  test('should enforce unique documentId', async () => {
    // Create users
    const user1 = new User({
      username: 'user1',
      email: 'user1@example.com',
      password: 'hashedpassword'
    });
    await user1.save();
    
    const user2 = new User({
      username: 'user2',
      email: 'user2@example.com',
      password: 'hashedpassword'
    });
    await user2.save();
    
    // Create first document
    const doc1 = new Document({
      documentId: 'same-doc-id',
      state: Buffer.from([1, 2, 3]),
      documentTitle: 'Test Document 1',
      owner: user1._id
    });
    
    await doc1.save();
    
    // Create second document with same ID
    const doc2 = new Document({
      documentId: 'same-doc-id',
      state: Buffer.from([4, 5, 6]),
      documentTitle: 'Test Document 2',
      owner: user2._id
    });
    
    // Should fail with duplicate key error
    await expect(doc2.save()).rejects.toThrow();
  });
  
  test('should retrieve document with populated owner', async () => {
    // Create a user
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
    
    await doc.save();
    
    // Find document with populated owner
    const foundDoc = await Document.findOne({ documentId: 'test-doc-123' })
      .populate('owner');
    
    expect(foundDoc.owner).toBeTruthy();
    expect(foundDoc.owner.username).toBe('testuser');
    expect(foundDoc.owner.email).toBe('test@example.com');
  });
  
  test('should retrieve document with populated collaborators', async () => {
    // Create users
    const owner = new User({
      username: 'owner',
      email: 'owner@example.com',
      password: 'hashedpassword'
    });
    await owner.save();
    
    const collaborator1 = new User({
      username: 'collaborator1',
      email: 'collab1@example.com',
      password: 'hashedpassword'
    });
    await collaborator1.save();
    
    const collaborator2 = new User({
      username: 'collaborator2',
      email: 'collab2@example.com',
      password: 'hashedpassword'
    });
    await collaborator2.save();
    
    // Create a document with multiple collaborators
    const doc = new Document({
      documentId: 'test-doc-123',
      state: Buffer.from([1, 2, 3]),
      documentTitle: 'Test Document',
      owner: owner._id,
      collaborators: [
        { user: collaborator1._id },
        { user: collaborator2._id }
      ]
    });
    
    await doc.save();
    
    // Find document with populated collaborators
    const foundDoc = await Document.findOne({ documentId: 'test-doc-123' })
      .populate('collaborators.user');
    
    expect(foundDoc.collaborators).toHaveLength(2);
    expect(foundDoc.collaborators[0].user.username).toBe('collaborator1');
    expect(foundDoc.collaborators[1].user.username).toBe('collaborator2');
  });
});