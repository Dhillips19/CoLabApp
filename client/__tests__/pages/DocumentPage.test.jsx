import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import DocumentPage from '../../src/pages/DocumentPage';
import '@testing-library/jest-dom';
import socket from '../../src/socket/socket';

// Mock dependencies
jest.mock('jwt-decode', () => ({
  jwtDecode: jest.fn()
}));

// Mock socket with implementation of event listeners
jest.mock('../../src/socket/socket', () => {
  const eventHandlers = {};
  return {
    connected: true,
    connect: jest.fn(),
    disconnect: jest.fn(),
    emit: jest.fn(),
    on: jest.fn((event, callback) => {
      if (!eventHandlers[event]) {
        eventHandlers[event] = [];
      }
      eventHandlers[event].push(callback);
    }),
    off: jest.fn((event) => {
      delete eventHandlers[event];
    }),
    // Helper to trigger events in tests
    _trigger: (event, ...args) => {
      if (eventHandlers[event]) {
        eventHandlers[event].forEach(handler => handler(...args));
      }
    }
  };
});

// Mock useNavigate to track navigation calls
jest.mock('react-router-dom', () => {
  const originalModule = jest.requireActual('react-router-dom');
  const mockNavigate = jest.fn();
  
  return {
    ...originalModule,
    useNavigate: () => mockNavigate
  };
});

// Mock child components
jest.mock('../../src/components/Editor/Editor', () => () => <div data-testid="mock-editor">Editor Component</div>);
jest.mock('../../src/components/Editor/Chat', () => () => <div data-testid="mock-chat">Chat Component</div>);
jest.mock('../../src/components/Editor/UserList', () => ({ users }) => <div data-testid="mock-userlist">{users?.length || 0} users</div>);
jest.mock('../../src/components/Editor/DocumentTitle', () => () => <div data-testid="mock-title">Document Title</div>);
jest.mock('../../src/components/Editor/Export', () => () => <div data-testid="mock-export">Export Options</div>);
jest.mock('../../src/components/Editor/ManageCollaborators', () => () => <div data-testid="mock-collaborators">Manage Collaborators</div>);

// Mock fetch API
global.fetch = jest.fn();

describe('DocumentPage Component', () => {
  const mockDocumentId = 'doc123';
  const mockNavigate = require('react-router-dom').useNavigate();
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup localStorage mock
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => 'mock-token'),
        setItem: jest.fn(),
        removeItem: jest.fn()
      },
      writable: true
    });
    
    // Mock successful document verification by default - FIXED
    global.fetch = jest.fn(() => 
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ owner: true })
      })
    );
    
    // Mock JWT decode default values
    jwtDecode.mockReturnValue({
      username: 'testuser',
      colour: '#ff0000'
    });
  });
  
  const renderWithRouter = (documentId = mockDocumentId) => {
    return render(
      <MemoryRouter initialEntries={[`/document/${documentId}`]}>
        <Routes>
          <Route path="/document/:documentId" element={<DocumentPage />} />
        </Routes>
      </MemoryRouter>
    );
  };
  
  test('renders loading state initially', async () => {
    renderWithRouter();
    
    // Should show loading state initially
    expect(screen.getByText('Loading document...')).toBeInTheDocument();
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading document...')).not.toBeInTheDocument();
    });
  });
  
  test('redirects to login if no token is present', async () => {
    // Mock no token
    window.localStorage.getItem.mockReturnValueOnce(null);
    
    renderWithRouter();
    
    // Wait for navigation to login page
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });
  
  test('shows error message if user does not have access', async () => {
    // Mock unauthorized access - FIXED
    global.fetch = jest.fn(() => 
      Promise.resolve({
        ok: false,
        status: 403,
        json: async () => ({ message: 'Access denied' })
      })
    );
    
    renderWithRouter();
    
    // Wait for component to finish loading
    await waitFor(() => {
      expect(screen.queryByText('Loading document...')).not.toBeInTheDocument();
    });

    // The error state should now be visible
    expect(screen.getByText(/You don't have permission to access this document/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Return to Home/i })).toBeInTheDocument();
  });
  
  test('redirects if document is not found', async () => {
    // Mock document not found - FIXED
    global.fetch = jest.fn(() => 
      Promise.resolve({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Document not found' })
      })
    );
    
    renderWithRouter();
    
    // Check if navigation was called with the right path
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        "/document-not-found", 
        expect.objectContaining({ state: { documentId: mockDocumentId } })
      );
    });
  });
  
  test('joins document room via socket when document loads successfully', async () => {
    renderWithRouter();
    
    // Wait for document to load
    await waitFor(() => {
      expect(screen.queryByText('Loading document...')).not.toBeInTheDocument();
    });
    
    // Verify socket handlers are set up
    expect(socket.on).toHaveBeenCalledWith('documentError', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('updateUsers', expect.any(Function));
    
    // Verify socket joins the room
    expect(socket.emit).toHaveBeenCalledWith('joinDocumentRoom', {
      documentId: mockDocumentId,
      username: 'testuser',
      colour: '#ff0000'
    });
  });
  
  test('shows manage collaborators button only for document owner', async () => {
    // First render as owner - FIXED
    global.fetch = jest.fn(() => 
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ owner: true })
      })
    );
    
    const { unmount } = renderWithRouter();
    
    // Wait for document to load
    await waitFor(() => {
      expect(screen.queryByText('Loading document...')).not.toBeInTheDocument();
    });
    
    // Manage Users button should be visible for owner
    const manageButton = screen.getByRole('button', { name: /Manage Users/i });
    expect(manageButton).toBeInTheDocument();
    
    // Clean up
    unmount();
    jest.clearAllMocks();
    
    // Then render as non-owner - FIXED
    global.fetch = jest.fn(() => 
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ owner: false })
      })
    );
    
    renderWithRouter();
    
    // Wait for document to load
    await waitFor(() => {
      expect(screen.queryByText('Loading document...')).not.toBeInTheDocument();
    });
    
    // Manage Users button should not be visible for non-owner
    expect(screen.queryByRole('button', { name: /Manage Users/i })).not.toBeInTheDocument();
  });
  
  test('toggles collaborator panel when manage users button is clicked', async () => {
    renderWithRouter();
    
    // Wait for document to load completely
    await waitFor(() => {
      expect(screen.queryByText('Loading document...')).not.toBeInTheDocument();
    });
    
    const user = userEvent.setup();
    
    // Find and click the manage users button
    const manageButton = screen.getByRole('button', { name: /Manage Users/i });
    await user.click(manageButton);
    
    // Panel should be visible - check for h3 specifically to avoid ambiguity
    expect(screen.getByRole('heading', { name: 'Manage Collaborators' })).toBeInTheDocument();
    expect(document.querySelector('.collaborator-management-container.open')).toBeInTheDocument();
    
    // Find and click the close button
    const closeButton = screen.getByRole('button', { name: '×' });
    await user.click(closeButton);
    
    // Panel should be hidden
    expect(document.querySelector('.collaborator-management-container.open')).not.toBeInTheDocument();
  });
  
  test('leaves document room when unmounting', async () => {
    // Mock the window.beforeunload event handler
    const originalAddEventListener = window.addEventListener;
    const originalRemoveEventListener = window.removeEventListener;
    let beforeUnloadHandler = null;
    
    window.addEventListener = jest.fn((event, handler) => {
      if (event === 'beforeunload') {
        beforeUnloadHandler = handler;
      }
      return originalAddEventListener.call(window, event, handler);
    });
    
    window.removeEventListener = jest.fn((event, handler) => {
      return originalRemoveEventListener.call(window, event, handler);
    });
    
    // Render component
    const { unmount } = renderWithRouter();
    
    // Wait for document to load
    await waitFor(() => {
      expect(screen.queryByText('Loading document...')).not.toBeInTheDocument();
    });
    
    // Clear previous calls
    socket.emit.mockClear();
    
    if (beforeUnloadHandler) {
      beforeUnloadHandler();
      
      // Check if socket.emit was called with correct args
      expect(socket.emit).toHaveBeenCalledWith('leaveDocumentRoom', mockDocumentId);
    } else {
      // If beforeUnloadHandler wasn't captured, fall back to unmount
      unmount();
      
      // Give time for any cleanup effects to run
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });
      
      expect(socket.emit).toHaveBeenCalledWith('leaveDocumentRoom', mockDocumentId);
    }
    
    // Restore original window methods
    window.addEventListener = originalAddEventListener;
    window.removeEventListener = originalRemoveEventListener;
  });
});