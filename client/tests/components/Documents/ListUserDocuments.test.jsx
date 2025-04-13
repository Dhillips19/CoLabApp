import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import ListUserDocuments from '../../../src/components/Documents/ListUserDocuments';
import '@testing-library/jest-dom';

// Mock the useNavigate hook
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

// THIS MUST BE BEFORE ANY MOCK IMPLEMENTATION
const originalFetch = global.fetch;
global.fetch = jest.fn();

// Mock window.confirm
global.confirm = jest.fn();

const mockDocuments = {
  ownedDocuments: [
    {
      _id: 'doc1',
      documentId: 'owned-123',
      documentTitle: 'My Document 1',
      updatedAt: '2023-04-10T15:30:00Z'
    },
    {
      _id: 'doc2',
      documentId: 'owned-456',
      documentTitle: 'My Document 2',
      updatedAt: '2023-04-09T10:15:00Z'
    }
  ],
  sharedDocuments: [
    {
      _id: 'doc3',
      documentId: 'shared-123',
      documentTitle: 'Shared With Me 1',
      updatedAt: '2023-04-11T09:45:00Z'
    }
  ]
};

const renderListUserDocuments = () => {
  return render(
    <BrowserRouter>
      <ListUserDocuments />
    </BrowserRouter>
  );
};

describe('ListUserDocuments Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // FIXED: This is the correct way to set up the fetch mock
    global.fetch = jest.fn(() => {
      return Promise.resolve({
        ok: true,
        json: async () => mockDocuments
      });
    });
  });
  
  afterAll(() => {
    global.fetch = originalFetch;
  });
  
  test('renders loading state initially', async () => {
    renderListUserDocuments();
    
    expect(screen.getByText('Loading documents...')).toBeInTheDocument();
  });
  
  test('fetches and displays documents', async () => {
    renderListUserDocuments();
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading documents...')).not.toBeInTheDocument();
    });
    
    // Check if documents are displayed
    expect(screen.getByText('My Document 1')).toBeInTheDocument();
    expect(screen.getByText('My Document 2')).toBeInTheDocument();
    
    // Should show counts in the tabs
    expect(screen.getByText(/My Documents \(2\)/)).toBeInTheDocument();
    expect(screen.getByText(/Shared With Me \(1\)/)).toBeInTheDocument();
  });
  
  test('switches between owned and shared documents tabs', async () => {
    renderListUserDocuments();
    const user = userEvent.setup();
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading documents...')).not.toBeInTheDocument();
    });
    
    // Initially shows owned documents
    expect(screen.getByText('My Document 1')).toBeInTheDocument();
    expect(screen.queryByText('Shared With Me 1')).not.toBeInTheDocument();
    
    // Switch to shared documents
    await user.click(screen.getByText(/Shared With Me/));
    
    // Should now show shared documents
    expect(screen.queryByText('My Document 1')).not.toBeInTheDocument();
    expect(screen.getByText('Shared With Me 1')).toBeInTheDocument();
  });
  
  test('shows empty state message when no documents', async () => {
    // FIXED: Mock empty document lists
    global.fetch = jest.fn(() => {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          ownedDocuments: [],
          sharedDocuments: []
        })
      });
    });
    
    renderListUserDocuments();
    const user = userEvent.setup();
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading documents...')).not.toBeInTheDocument();
    });
    
    // Should show empty state for owned documents
    expect(screen.getByText("You don't have any documents yet. Create one to get started!")).toBeInTheDocument();
    
    // Switch to shared documents
    await user.click(screen.getByText(/Shared With Me/));
    
    // Should show empty state for shared documents
    expect(screen.getByText("No documents have been shared with you yet.")).toBeInTheDocument();
  });
  
  test('navigates to document when clicked', async () => {
    renderListUserDocuments();
    const user = userEvent.setup();
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading documents...')).not.toBeInTheDocument();
    });
    
    // Click on a document
    await user.click(screen.getByText('My Document 1'));
    
    // Should navigate to document page
    expect(mockNavigate).toHaveBeenCalledWith('/document/owned-123');
  });
  
  test('handles document deletion', async () => {
    global.confirm.mockReturnValueOnce(true); // User confirms deletion
    
    global.fetch = jest.fn((url) => {
      if (url.includes('/delete/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'Document deleted successfully' })
        });
      }
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockDocuments)
      });
    });
    
    renderListUserDocuments();
    const user = userEvent.setup();
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading documents...')).not.toBeInTheDocument();
    });
    
    // Find the delete button for the first document
    const deleteButtons = screen.getAllByTitle('Delete document');
    
    // Click delete button
    await user.click(deleteButtons[0]);
    
    // Should call confirm
    expect(global.confirm).toHaveBeenCalledWith(expect.stringContaining('Are you sure'));
    
    // Should make delete request
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/delete/'),
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
    
    // Should show success message
    await waitFor(() => {
      expect(screen.getByText('Document deleted successfully')).toBeInTheDocument();
    });
  });
  
  test('handles leaving shared document', async () => {
    global.confirm.mockReturnValueOnce(true); // User confirms leaving
    
    global.fetch = jest.fn((url) => {
      if (url.includes('/leave')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: "You've left the document" })
        });
      }
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockDocuments)
      });
    });
    
    renderListUserDocuments();
    const user = userEvent.setup();
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading documents...')).not.toBeInTheDocument();
    });
    
    // Switch to shared documents tab
    await user.click(screen.getByText(/Shared With Me/));
    
    // Find the leave button
    const leaveButton = screen.getByTitle('Leave document');
    
    // Click leave button
    await user.click(leaveButton);
    
    // Should call confirm
    expect(global.confirm).toHaveBeenCalledWith(expect.stringContaining('Are you sure'));
    
    // Should make leave request
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/leave'),
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
    
    // Should show success message
    await waitFor(() => {
      expect(screen.getByText("You've left the document")).toBeInTheDocument();
    });
  });
  
  test('handles fetch error', async () => {
    global.fetch = jest.fn(() => {
      return Promise.reject(new Error('Network error'));
    });
    
    renderListUserDocuments();
    
    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
  });
});