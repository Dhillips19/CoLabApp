import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DocumentTitle from '../../../src/components/Editor/DocumentTitle';
import socket from '../../../src/socket/socket';
import '@testing-library/jest-dom';

// Mock socket.io
jest.mock('../../../src/socket/socket', () => ({
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn()
}));

describe('DocumentTitle Component', () => {
  const mockDocumentId = 'doc-123';
  const mockTitleRef = { current: null };
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock socket.on behavior
    socket.on.mockImplementation((event, callback) => {
      if (event === 'updateTitle') {
        // Store the callback to trigger it in our tests
        socket.on.mockUpdateTitleCallback = callback;
      }
    });
  });
  
  test('renders with default title', () => {
    render(<DocumentTitle documentId={mockDocumentId} titleRef={mockTitleRef} />);
    
    expect(screen.getByText('Untitled Document')).toBeInTheDocument();
    expect(mockTitleRef.current).toBe('Untitled Document');
  });
  
  test('switches to edit mode when clicked', async () => {
    render(<DocumentTitle documentId={mockDocumentId} titleRef={mockTitleRef} />);
    const user = userEvent.setup();
    
    const titleElement = screen.getByText('Untitled Document');
    await user.click(titleElement);
    
    const inputElement = screen.getByRole('textbox');
    expect(inputElement).toBeInTheDocument();
    expect(inputElement).toHaveValue('Untitled Document');
    expect(document.activeElement).toBe(inputElement);
  });
  
  test('updates title on Enter key press', async () => {
    render(<DocumentTitle documentId={mockDocumentId} titleRef={mockTitleRef} />);
    const user = userEvent.setup();
    
    // Enter edit mode
    await user.click(screen.getByText('Untitled Document'));
    
    // Type new title
    const inputElement = screen.getByRole('textbox');
    await user.clear(inputElement);
    await user.type(inputElement, 'New Document Title');
    
    // Press Enter to submit
    await user.keyboard('{Enter}');
    
    // Check socket emit was called
    expect(socket.emit).toHaveBeenCalledWith('updateTitle', {
      documentId: mockDocumentId,
      title: 'New Document Title'
    });
    
    // Check title was updated in UI
    expect(screen.getByText('New Document Title')).toBeInTheDocument();
    expect(mockTitleRef.current).toBe('New Document Title');
  });
  
  test('cancels edit when Escape key is pressed', async () => {
    render(<DocumentTitle documentId={mockDocumentId} titleRef={mockTitleRef} />);
    const user = userEvent.setup();
    
    // Enter edit mode
    await user.click(screen.getByText('Untitled Document'));
    
    // Type new title
    const inputElement = screen.getByRole('textbox');
    await user.clear(inputElement);
    await user.type(inputElement, 'Cancelled Title');
    
    // Press Escape
    await user.keyboard('{Escape}');
    
    // Check original title is displayed
    expect(screen.getByText('Untitled Document')).toBeInTheDocument();
    expect(socket.emit).not.toHaveBeenCalled();
  });
  
  test('handles title updates from socket events', () => {
    render(<DocumentTitle documentId={mockDocumentId} titleRef={mockTitleRef} />);
    
    // Simulate receiving a title update via socket
    act(() => {
      socket.on.mockUpdateTitleCallback('Socket Updated Title');
    });
    
    // Title should be updated
    expect(screen.getByText('Socket Updated Title')).toBeInTheDocument();
    expect(mockTitleRef.current).toBe('Socket Updated Title');
  });
  
  test('cleans up socket listeners on unmount', () => {
    const { unmount } = render(<DocumentTitle documentId={mockDocumentId} titleRef={mockTitleRef} />);
    
    unmount();
    
    expect(socket.off).toHaveBeenCalledWith('updateTitle');
  });
  
  test('prevents empty titles', async () => {
    render(<DocumentTitle documentId={mockDocumentId} titleRef={mockTitleRef} />);
    const user = userEvent.setup();
    
    // Enter edit mode
    await user.click(screen.getByText('Untitled Document'));
    
    // Clear the input
    const inputElement = screen.getByRole('textbox');
    await user.clear(inputElement);
    
    // Press Enter
    await user.keyboard('{Enter}');
    
    // Title should revert to previous value
    expect(screen.getByText('Untitled Document')).toBeInTheDocument();
    expect(socket.emit).not.toHaveBeenCalled();
  });
  
  test('updates titleRef on initialization', async () => {
    const localTitleRef = { current: null };
    render(<DocumentTitle documentId={mockDocumentId} titleRef={localTitleRef} />);
    
    // titleRef should be initialized
    expect(localTitleRef.current).toBe('Untitled Document');
  });
});