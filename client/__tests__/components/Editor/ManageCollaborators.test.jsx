import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ManageCollaborators from '../../../src/components/Editor/ManageCollaborators';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import '@testing-library/jest-dom';

// Mock FontAwesomeIcon since it's not essential for tests
jest.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: () => <span data-testid="mock-icon" />
}));

// Define reusable mock fetch implementation
const mockFetchImplementation = (url) => {
  if (url.includes('/search')) {
    return Promise.resolve({
      ok: true,
      json: async () => ([
        { _id: 'user1', username: 'testuser1', email: 'test1@example.com' },
        { _id: 'user2', username: 'testuser2', email: 'test2@example.com' }
      ])
    });
  } else if (url.includes('/collaborators') && !url.includes('collaborators/')) {
    return Promise.resolve({
      ok: true,
      json: async () => ([
        { _id: 'collab1', username: 'collaborator1', email: 'collab1@example.com' },
        { _id: 'collab2', username: 'collaborator2', email: 'collab2@example.com' }
      ])
    });
  } else {
    return Promise.resolve({
      ok: true,
      json: async () => ({ message: 'Success' })
    });
  }
};

// Mock localStorage more effectively
const mockLocalStorage = {
  getItem: jest.fn().mockReturnValue('mock-token'),
  setItem: jest.fn(),
  clear: jest.fn()
};

beforeAll(() => {
  // Save original localStorage if needed later
  global.originalLocalStorage = global.localStorage;
  
  // Replace localStorage with our mock
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true
  });
  
  // Set up global fetch mock
  global.fetch = jest.fn();
  global.fetch.mockImplementation(mockFetchImplementation);
});

afterAll(() => {
  // Restore original localStorage if needed
  if (global.originalLocalStorage) {
    Object.defineProperty(window, 'localStorage', {
      value: global.originalLocalStorage,
      writable: true
    });
  }
});

describe('ManageCollaborators Component', () => {
  const mockDocumentId = 'test-doc-123';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Make sure our mock is returning the expected value
    mockLocalStorage.getItem.mockReturnValue('mock-token');
    
    // Default mock implementation for fetch
    global.fetch.mockImplementation(mockFetchImplementation);
  });

  test('renders add collaborators tab by default', () => {
    render(<ManageCollaborators documentId={mockDocumentId} />);
    
    // Check tab is active
    expect(screen.getByRole('button', { name: /add users/i })).toHaveClass('active');
    
    // Check search form is displayed
    expect(screen.getByPlaceholderText(/search users/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });

  test('searches for users when search form is submitted', async () => {
    // Verify mock is set correctly
    expect(mockLocalStorage.getItem('token')).toBe('mock-token');
    
    render(<ManageCollaborators documentId={mockDocumentId} />);
    
    const user = userEvent.setup();
    const searchInput = screen.getByPlaceholderText(/search users/i);
    
    // Type in search term
    await user.type(searchInput, 'test');
    
    // Clear previous fetch calls and set specific mock for this test
    global.fetch.mockClear();
    global.fetch.mockImplementationOnce((url, options) => {
      expect(options.headers.Authorization).toBe('Bearer mock-token');
      return Promise.resolve({
        ok: true,
        json: async () => ([
          { _id: 'user1', username: 'testuser1', email: 'test1@example.com' },
          { _id: 'user2', username: 'testuser2', email: 'test2@example.com' }
        ])
      });
    });
    
    // Submit search form
    await user.click(screen.getByRole('button', { name: /search/i }));
    
    // Verify API call
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/search?term=test&documentId=test-doc-123'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer mock-token'
        })
      })
    );
    
    // Verify search results appear
    await waitFor(() => {
      expect(screen.getByText('testuser1')).toBeInTheDocument();
      expect(screen.getByText('testuser2')).toBeInTheDocument();
      expect(screen.getByText('test1@example.com')).toBeInTheDocument();
      expect(screen.getByText('test2@example.com')).toBeInTheDocument();
    });
  });

  test('adds a collaborator when add button is clicked', async () => {
    const user = userEvent.setup();
    
    render(<ManageCollaborators documentId={mockDocumentId} />);
    
    // Type in search term and submit search
    await user.type(screen.getByPlaceholderText(/search users/i), 'test');
    await user.click(screen.getByRole('button', { name: /search/i }));
    
    // Wait for results to appear
    await waitFor(() => {
      expect(screen.getByText('testuser1')).toBeInTheDocument();
    });
    
    // Reset fetch mock to track only the add operation
    global.fetch.mockClear();
    global.fetch.mockImplementationOnce(() => {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ message: 'Success' })
      });
    });
    
    // Find add buttons and click the first one
    const addButtons = screen.getAllByRole('button', { name: /add$/i });
    await user.click(addButtons[0]);
    
    // Verify the fetch was called with correct parameters
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `http://localhost:3001/api/editor/${mockDocumentId}/collaborators`,
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('user1')
        })
      );
    });
    
    // Wait for the success message to appear
    await waitFor(() => {
      const successElement = screen.getByText('Collaborator added successfully');
      expect(successElement).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test('switches to remove collaborators tab and loads existing collaborators', async () => {
    render(<ManageCollaborators documentId={mockDocumentId} />);
    
    const user = userEvent.setup();
    
    // Clear previous fetch calls
    global.fetch.mockClear();
    
    // Set specific mock for this test
    global.fetch.mockImplementationOnce((url, options) => {
      expect(options.headers.Authorization).toBe('Bearer mock-token');
      return Promise.resolve({
        ok: true,
        json: async () => ([
          { _id: 'collab1', username: 'collaborator1', email: 'collab1@example.com' },
          { _id: 'collab2', username: 'collaborator2', email: 'collab2@example.com' }
        ])
      });
    });
    
    // Click the remove collaborators tab
    await user.click(screen.getByRole('button', { name: /remove users/i }));
    
    // Verify collaborators are displayed
    await waitFor(() => {
      expect(screen.getByText('collaborator1')).toBeInTheDocument();
      expect(screen.getByText('collaborator2')).toBeInTheDocument();
      expect(screen.getByText('collab1@example.com')).toBeInTheDocument();
      expect(screen.getByText('collab2@example.com')).toBeInTheDocument();
    });
    
    // Verify the API call was made
    expect(global.fetch).toHaveBeenCalled();
  });

  test('removes a collaborator when remove button is clicked', async () => {
    const user = userEvent.setup();
    
    // Mock our API calls more precisely
    jest.clearAllMocks();
    
    // First mock - for initially loading collaborators when switching tabs
    global.fetch.mockImplementationOnce((url, options) => {
      // This mock handles the first collaborators fetch when switching to remove tab
      expect(url).toContain(`/api/editor/${mockDocumentId}/collaborators`);
      expect(options.headers.Authorization).toBe('Bearer mock-token');
      
      return Promise.resolve({
        ok: true,
        json: async () => ([
          { _id: 'collab1', username: 'collaborator1', email: 'collab1@example.com' },
          { _id: 'collab2', username: 'collaborator2', email: 'collaborator2@example.com' }
        ])
      });
    });
    
    // Second mock - for the delete operation
    global.fetch.mockImplementationOnce((url, options) => {
      // This mock handles the delete operation
      expect(url).toContain(`/api/editor/${mockDocumentId}/collaborators/collab1`);
      expect(options.method).toBe('DELETE');
      expect(options.headers.Authorization).toBe('Bearer mock-token');
      
      return Promise.resolve({
        ok: true,
        json: async () => ({ message: 'Success' })
      });
    });

    // Render component
    render(<ManageCollaborators documentId={mockDocumentId} />);
    
    // Switch to remove collaborators tab
    await user.click(screen.getByRole('button', { name: /remove users/i }));
    
    // Wait for collaborators to load
    await waitFor(() => {
      expect(screen.getByText('collaborator1')).toBeInTheDocument();
      expect(screen.getByText('collaborator2')).toBeInTheDocument();
    }, { timeout: 2000 });
    
    // Find the remove buttons - use a more specific selector to get just the action buttons
    // not the "Remove Collaborators" tab button
    const removeButtons = screen.getAllByRole('button', { name: /^remove$/i });
    
    // Now verify we have the expected number of collaborator remove buttons
    expect(removeButtons.length).toBe(2);
    
    // Clear any error message that might exist from previous operations
    if (screen.queryByText('Failed to load collaborators')) {
      console.log("Found error message before clicking remove button");
    }
    
    // Click the first remove button
    await user.click(removeButtons[0]);
    
    // Check for success message immediately - since this appears right after the operation
    await waitFor(() => {
      expect(screen.getByText('Collaborator removed successfully')).toBeInTheDocument();
    }, { timeout: 2000 });
    
    // Additional verification that fetch was called correctly
    const deleteCalls = global.fetch.mock.calls.filter(call => 
      call[0].includes(`/api/editor/${mockDocumentId}/collaborators/collab1`) && 
      call[1]?.method === 'DELETE'
    );
    
    expect(deleteCalls.length).toBe(1);
    expect(deleteCalls[0][1].headers.Authorization).toBe('Bearer mock-token');
  });

  test('handles API errors gracefully during search', async () => {
    // Mock API error
    global.fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: false,
        json: async () => ({ message: 'Failed to search users' })
      })
    );
    
    render(<ManageCollaborators documentId={mockDocumentId} />);
    
    const user = userEvent.setup();
    
    // Submit search with error
    await user.type(screen.getByPlaceholderText(/search users/i), 'test');
    await user.click(screen.getByRole('button', { name: /search/i }));
    
    // Verify error message
    await waitFor(() => {
      expect(screen.getByText('Failed to search users')).toBeInTheDocument();
    });
  });

  test('shows empty message when no search results found', async () => {
    // Mock empty search results
    global.fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: async () => ([])
      })
    );
    
    render(<ManageCollaborators documentId={mockDocumentId} />);
    
    const user = userEvent.setup();
    
    // Submit search
    await user.type(screen.getByPlaceholderText(/search users/i), 'nonexistent');
    await user.click(screen.getByRole('button', { name: /search/i }));
    
    // Verify empty message
    await waitFor(() => {
      expect(screen.getByText('Search for users to add')).toBeInTheDocument();
    });
  });

  test('shows loading state during search', async () => {
    // Mock delayed response
    global.fetch.mockImplementationOnce(() => 
      new Promise(resolve => {
        setTimeout(() => {
          resolve({
            ok: true,
            json: async () => ([])
          });
        }, 100);
      })
    );
    
    render(<ManageCollaborators documentId={mockDocumentId} />);
    
    const user = userEvent.setup();
    
    // Submit search
    await user.type(screen.getByPlaceholderText(/search users/i), 'test');
    await user.click(screen.getByRole('button', { name: /search/i }));
    
    // Verify loading state
    expect(screen.getByRole('button', { name: /search/i })).toBeDisabled();
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /search/i })).not.toBeDisabled();
    });
  });

  test('shows error message when adding collaborator fails', async () => {
    const user = userEvent.setup();
    
    // Render component
    render(<ManageCollaborators documentId={mockDocumentId} />);
    
    // Type in search term and submit search
    await user.type(screen.getByPlaceholderText(/search users/i), 'test');
    await user.click(screen.getByRole('button', { name: /search/i }));
    
    // Wait for search results
    await waitFor(() => {
      expect(screen.getByText('testuser1')).toBeInTheDocument();
    });
    
    // Clear previous fetch calls
    global.fetch.mockClear();
    
    // Mock error response for add collaborator
    global.fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: false,
        json: async () => ({ message: 'Failed to add collaborator' })
      })
    );
    
    // Click add button
    const addButtons = screen.getAllByRole('button', { name: /add$/i });
    await user.click(addButtons[0]);
    
    // Wait for error message to appear
    await waitFor(() => {
      expect(screen.getByText('Failed to add collaborator')).toBeInTheDocument();
    }, { timeout: 2000 });
  });
});