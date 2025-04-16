import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import CreateDocument from '../../../src/components/Documents/CreateDocument';
import '@testing-library/jest-dom';

// Mock the useNavigate and useLocation hooks
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/' })
}));

// Properly set up fetch mock
beforeAll(() => {
  global.fetch = jest.fn();
});

describe('CreateDocument Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset localStorage mock for each test
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn().mockReturnValue('mock-token'),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
      },
      writable: true
    });
    
    // Reset location mock for each test to default
    jest.spyOn(require('react-router-dom'), 'useLocation').mockReturnValue({ pathname: '/' });
    
    // Reset alert mock for each test
    global.alert = jest.fn();
  });

  afterEach(() => {
    // Clean up any remaining mocks
    jest.restoreAllMocks();
  });

  test('renders the create document button', () => {
    render(
      <BrowserRouter>
        <CreateDocument />
      </BrowserRouter>
    );
    
    const createButton = screen.getByRole('button', { name: /create new document/i });
    expect(createButton).toBeInTheDocument();
  });

  test('applies homepage styles when on home route', async () => {
    render(
      <BrowserRouter>
        <CreateDocument />
      </BrowserRouter>
    );
    
    // Use waitFor to ensure useEffect has completed
    await waitFor(() => {
      const createButton = screen.getByRole('button');
      expect(createButton).toHaveClass('create-document-button-homepage');
    });
  });

  test('applies regular styles when not on home route', async () => {
    // Create a new mock for this specific test
    jest.spyOn(require('react-router-dom'), 'useLocation').mockReturnValue({ pathname: '/somewhere-else' });
    
    render(
      <BrowserRouter>
        <CreateDocument />
      </BrowserRouter>
    );
    
    // Use waitFor to ensure useEffect has completed
    await waitFor(() => {
      const createButton = screen.getByRole('button');
      expect(createButton).not.toHaveClass('create-document-button-homepage');
    });
  });

  test('creates a new document when clicked', async () => {
    // Mock successful document creation - fixed implementation
    global.fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: async () => ({ documentId: 'new-doc-123' })
      })
    );
    
    render(
      <BrowserRouter>
        <CreateDocument />
      </BrowserRouter>
    );
    
    const user = userEvent.setup();
    const createButton = screen.getByRole('button', { name: /create new document/i });
    
    // Click create button
    await user.click(createButton);
    
    // Verify API call
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/documents/create',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token'
          }),
          body: JSON.stringify({})
        })
      );
    });
    
    // Verify navigation to new document page
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/document/new-doc-123');
    });
  });

  test('shows error alert when document creation fails', async () => {
    // Mock failed document creation - fixed implementation
    global.fetch.mockImplementationOnce(() => 
      Promise.reject(new Error('Network error'))
    );
    
    render(
      <BrowserRouter>
        <CreateDocument />
      </BrowserRouter>
    );
    
    const user = userEvent.setup();
    await user.click(screen.getByRole('button'));
    
    // Verify alert was shown
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Failed to create document.');
    });
  });
});