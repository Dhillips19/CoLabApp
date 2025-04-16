import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../../DB/models/userModel';
import Document from '../../DB/models/documentModel';

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
  await User.deleteMany({});
  await Document.deleteMany({});
});

describe('User Model Tests', () => {
  test('should create a new user', async () => {
    const user = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedpassword'
    });
    
    const savedUser = await user.save();
    
    // Verify user was saved
    expect(savedUser.username).toBe('testuser');
    expect(savedUser.email).toBe('test@example.com');
    expect(savedUser.password).toBe('hashedpassword');
    expect(savedUser.colour).toBe('#3498db'); // Default color
    
    // Find the user in the database
    const foundUser = await User.findOne({ username: 'testuser' });
    expect(foundUser).toBeTruthy();
    expect(foundUser.email).toBe('test@example.com');
  });
  
  test('should require username field', async () => {
    const user = new User({
      email: 'test@example.com',
      password: 'hashedpassword'
    });
    
    // Should fail validation
    await expect(user.save()).rejects.toThrow();
  });
  
  test('should require email field', async () => {
    const user = new User({
      username: 'testuser',
      password: 'hashedpassword'
    });
    
    // Should fail validation
    await expect(user.save()).rejects.toThrow();
  });
  
  test('should require password field', async () => {
    const user = new User({
      username: 'testuser',
      email: 'test@example.com'
    });
    
    // Should fail validation
    await expect(user.save()).rejects.toThrow();
  });
  
  test('should enforce unique username', async () => {
    // Create first user
    const user1 = new User({
      username: 'sameusername',
      email: 'user1@example.com',
      password: 'hashedpassword'
    });
    
    await user1.save();
    
    // Create second user with same username
    const user2 = new User({
      username: 'sameusername',
      email: 'user2@example.com',
      password: 'hashedpassword'
    });
    
    // Should fail with duplicate key error
    await expect(user2.save()).rejects.toThrow();
  });
  
  test('should enforce unique email', async () => {
    // Create first user
    const user1 = new User({
      username: 'user1',
      email: 'same@example.com',
      password: 'hashedpassword'
    });
    
    await user1.save();
    
    // Create second user with same email
    const user2 = new User({
      username: 'user2',
      email: 'same@example.com',
      password: 'hashedpassword'
    });
    
    // Should fail with duplicate key error
    await expect(user2.save()).rejects.toThrow();
  });
  
  test('should update user color', async () => {
    const user = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedpassword'
    });
    
    await user.save();
    
    // Update user color
    user.colour = '#FF5733';
    await user.save();
    
    // Verify color was updated
    const updatedUser = await User.findOne({ username: 'testuser' });
    expect(updatedUser.colour).toBe('#FF5733');
  });
  
  test('should add owned documents to user', async () => {
    // Create user
    const user = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedpassword'
    });
    
    await user.save();
    
    // Create document
    const doc = new Document({
      documentId: 'test-doc-123',
      state: Buffer.from([1, 2, 3]),
      documentTitle: 'Test Document',
      owner: user._id
    });
    
    await doc.save();
    
    // Add document to user's owned documents
    user.ownedDocuments.push(doc._id);
    await user.save();
    
    // Verify owned document was added
    const updatedUser = await User.findOne({ username: 'testuser' });
    expect(updatedUser.ownedDocuments).toHaveLength(1);
    expect(updatedUser.ownedDocuments[0].toString()).toBe(doc._id.toString());
  });
  
  test('should add shared documents to user', async () => {
    // Create owner and collaborator
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
    
    // Create document
    const doc = new Document({
      documentId: 'test-doc-123',
      state: Buffer.from([1, 2, 3]),
      documentTitle: 'Test Document',
      owner: owner._id,
      collaborators: [{ user: collaborator._id }]
    });
    
    await doc.save();
    
    // Add document to collaborator's shared documents
    collaborator.sharedDocuments.push(doc._id);
    await collaborator.save();
    
    // Verify shared document was added
    const updatedCollaborator = await User.findOne({ username: 'collaborator' });
    expect(updatedCollaborator.sharedDocuments).toHaveLength(1);
    expect(updatedCollaborator.sharedDocuments[0].toString()).toBe(doc._id.toString());
  });
  
  test('should populate owned documents', async () => {
    // Create user
    const user = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedpassword'
    });
    
    await user.save();
    
    // Create documents
    const doc1 = new Document({
      documentId: 'test-doc-1',
      state: Buffer.from([1, 2, 3]),
      documentTitle: 'Test Document 1',
      owner: user._id
    });
    
    await doc1.save();
    
    const doc2 = new Document({
      documentId: 'test-doc-2',
      state: Buffer.from([4, 5, 6]),
      documentTitle: 'Test Document 2',
      owner: user._id
    });
    
    await doc2.save();
    
    // Add documents to user's owned documents
    user.ownedDocuments.push(doc1._id, doc2._id);
    await user.save();
    
    // Find user with populated owned documents
    const foundUser = await User.findOne({ username: 'testuser' })
      .populate('ownedDocuments');
    
    expect(foundUser.ownedDocuments).toHaveLength(2);
    expect(foundUser.ownedDocuments[0].documentTitle).toBe('Test Document 1');
    expect(foundUser.ownedDocuments[1].documentTitle).toBe('Test Document 2');
  });
});