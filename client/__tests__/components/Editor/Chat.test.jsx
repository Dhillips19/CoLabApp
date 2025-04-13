import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Chat from '../../../src/components/Editor/Chat';
import socket from '../../../src/socket/socket';
import '@testing-library/jest-dom';

jest.setTimeout(10000); // Set a timeout for async operations

// Mock socket.io
jest.mock('../../../src/socket/socket', () => ({
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn()
}));

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

describe('Chat Component', () => {
  const mockDocumentId = 'doc-123';
  const mockUsername = 'testuser';
  const mockMessages = [
    { username: 'user1', message: 'Hello world', timestamp: '2023-01-01T12:00:00Z' },
    { username: 'testuser', message: 'Hi there', timestamp: '2023-01-01T12:01:00Z' },
    { username: 'user2', message: 'How are you?', timestamp: '2023-01-01T12:02:00Z' }
  ];
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Mock socket.on behavior
    socket.on.mockImplementation((event, callback) => {
      if (event === 'loadMessages') {
        // Store the callback to trigger it in our tests
        socket.on.mockLoadMessagesCallback = callback;
      } else if (event === 'receiveMessage') {
        socket.on.mockReceiveMessageCallback = callback;
      }
    });
  });
  
  afterEach(() => {
    jest.useRealTimers();
  });
  
  test('renders chat toggle button', () => {
    render(<Chat documentId={mockDocumentId} username={mockUsername} />);
    
    expect(screen.getByRole('button', { name: '' })).toBeInTheDocument();
  });
  
  test('opens chat panel when toggle button is clicked', async () => {
    render(<Chat documentId={mockDocumentId} username={mockUsername} />);
    
    // Initially chat panel should not be visible
    expect(screen.queryByText('Document Chat')).not.toBeInTheDocument();
    
    // Click toggle button using fireEvent instead of userEvent
    fireEvent.click(screen.getByRole('button'));
    
    // Chat panel should now be visible
    expect(screen.getByText('Document Chat')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument();
  });
  
  test('shows loaded messages', () => {
    render(<Chat documentId={mockDocumentId} username={mockUsername} />);
    
    // Simulate receiving chat history
    act(() => {
      socket.on.mockLoadMessagesCallback(mockMessages);
    });
    
    // Open chat panel
    fireEvent.click(screen.getByRole('button'));
    
    // Check if messages are displayed
    expect(screen.getByText('Hello world')).toBeInTheDocument();
    expect(screen.getByText('Hi there')).toBeInTheDocument();
    expect(screen.getByText('How are you?')).toBeInTheDocument();
    
    // Check usernames
    expect(screen.getByText('user1')).toBeInTheDocument();
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('user2')).toBeInTheDocument();
    
    // Current user's message should have own-message class
    const ownMessage = screen.getByText('Hi there').closest('.chat-message');
    expect(ownMessage).toHaveClass('own-message');
  });
  
  test('sends message when form is submitted', async () => {
    render(<Chat documentId={mockDocumentId} username={mockUsername} />);
    
    // Open chat panel
    fireEvent.click(screen.getByRole('button'));
    
    // Type a message
    const input = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(input, { target: { value: 'New message' } });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    
    // Check if socket.emit was called with the right parameters
    expect(socket.emit).toHaveBeenCalledWith('sendMessage', {
      documentId: mockDocumentId,
      username: mockUsername,
      message: 'New message',
      timestamp: expect.any(String)
    });
    
    // Input should be cleared
    expect(screen.getByPlaceholderText('Type a message...')).toHaveValue('');
  });
  
  test('prevents sending empty messages', async () => {
    render(<Chat documentId={mockDocumentId} username={mockUsername} />);
    
    // Open chat panel
    fireEvent.click(screen.getByRole('button'));
    
    // Submit without typing anything
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    
    // socket.emit should not be called
    expect(socket.emit).not.toHaveBeenCalled();
  });
  
  test('adds new messages received via socket', () => {
    render(<Chat documentId={mockDocumentId} username={mockUsername} />);
    
    // Open chat panel
    fireEvent.click(screen.getByRole('button'));
    
    // Simulate receiving a new message
    const newMessage = {
      username: 'user3',
      message: 'New message from socket',
      timestamp: '2023-01-01T12:05:00Z'
    };
    
    act(() => {
      socket.on.mockReceiveMessageCallback(newMessage);
    });
    
    // Check if the new message is displayed
    expect(screen.getByText('New message from socket')).toBeInTheDocument();
    expect(screen.getByText('user3')).toBeInTheDocument();
  });
  
  test('sends message on Enter key', async () => {
    render(<Chat documentId={mockDocumentId} username={mockUsername} />);
    
    // Open chat panel
    fireEvent.click(screen.getByRole('button'));
    
    // Type a message
    const input = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(input, { target: { value: 'Enter message' } });
    
    // Press Enter
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    
    // Check if socket.emit was called
    expect(socket.emit).toHaveBeenCalledWith('sendMessage', expect.objectContaining({
      message: 'Enter message'
    }));
  });
  
  test('does not send message on Shift+Enter', async () => {
    render(<Chat documentId={mockDocumentId} username={mockUsername} />);
    
    // Open chat panel
    fireEvent.click(screen.getByRole('button'));
    
    // Type a message
    const input = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(input, { target: { value: 'Shift Enter message' } });
    
    // Press Shift+Enter
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', shiftKey: true });
    
    // socket.emit should not be called
    expect(socket.emit).not.toHaveBeenCalled();
  });
  
  test('shows message count in header', () => {
    render(<Chat documentId={mockDocumentId} username={mockUsername} />);
    
    // Simulate receiving chat history
    act(() => {
      socket.on.mockLoadMessagesCallback(mockMessages);
    });
    
    // Open chat panel
    fireEvent.click(screen.getByRole('button'));
    
    // Check message count
    expect(screen.getByText('3 message(s)')).toBeInTheDocument();
  });
  
  test('cleans up socket listeners on unmount', () => {
    const { unmount } = render(<Chat documentId={mockDocumentId} username={mockUsername} />);
    
    unmount();
    
    expect(socket.off).toHaveBeenCalledWith('loadMessages');
    expect(socket.off).toHaveBeenCalledWith('receiveMessage');
  });
});