import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../../src/context/AuthContext';
import { MemoryRouter } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import '@testing-library/jest-dom';

// Mock jwt-decode
jest.mock('jwt-decode', () => ({
  jwtDecode: jest.fn()
}));

// Mock navigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  MemoryRouter: jest.requireActual('react-router-dom').MemoryRouter
}));

// Mock fetch
global.fetch = jest.fn(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ user: { username: 'testuser' } })
  })
);

// Create a test component that uses the auth context
const TestComponent = () => {
  const { isAuthenticated, isLoading, user, login, logout } = useAuth();
  
  return (
    <div>
      <div data-testid="loading-status">Loading: {String(isLoading)}</div>
      <div data-testid="auth-status">Authenticated: {String(isAuthenticated)}</div>
      <div data-testid="username">{user?.username || 'No user'}</div>
      <button onClick={() => login('test-token')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  // Mock localStorage
  let mockLocalStorage = {};
  
  beforeEach(() => {
    mockLocalStorage = {};
    
    // Mock localStorage methods
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(key => mockLocalStorage[key] || null),
        setItem: jest.fn((key, value) => {
          mockLocalStorage[key] = value;
        }),
        removeItem: jest.fn(key => {
          delete mockLocalStorage[key];
        }),
        clear: jest.fn(() => {
          mockLocalStorage = {};
        })
      },
      writable: true
    });
    
    jest.clearAllMocks();
    
    // Default mock for jwtDecode
    jwtDecode.mockReturnValue({
      id: 'user123',
      username: 'testuser',
      colour: '#ff0000'
    });
    
    // Default mock for fetch - reinitialize with implementation
    global.fetch = jest.fn(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ user: { username: 'testuser' } })
      })
    );
  });
    
  test('loads user from existing token in localStorage', async () => {
    // Setup localStorage with a token
    window.localStorage.getItem.mockReturnValueOnce('valid-token');
    
    // Mock fetch for token verification - successful
    global.fetch = jest.fn(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
    );
    
    render(
      <MemoryRouter>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </MemoryRouter>
    );
    
    // Wait for auth check to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading-status').textContent).toBe('Loading: false');
    });
    
    expect(screen.getByTestId('auth-status').textContent).toBe('Authenticated: true');
    expect(screen.getByTestId('username').textContent).toBe('testuser');
  });
  
  test('login function updates authentication state and stores token', async () => {
    const user = userEvent.setup();
    
    render(
      <MemoryRouter>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </MemoryRouter>
    );
    
    // Wait for initial loading to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading-status').textContent).toBe('Loading: false');
    });
    
    // Click login button
    await user.click(screen.getByText('Login'));
    
    // Check that token was stored and state updated
    expect(window.localStorage.setItem).toHaveBeenCalledWith('token', 'test-token');
    expect(screen.getByTestId('auth-status').textContent).toBe('Authenticated: true');
    expect(screen.getByTestId('username').textContent).toBe('testuser');
    
    // Verify navigation was called
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    }, { timeout: 600 });
  });
  
  test('logout function clears authentication state and removes token', async () => {
    // Set initial authenticated state
    window.localStorage.getItem.mockReturnValue('valid-token');
    
    // Mock fetch for token verification - successful
    global.fetch = jest.fn(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
    );
    
    const user = userEvent.setup();
    
    render(
      <MemoryRouter>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </MemoryRouter>
    );
    
    // Wait for authentication to complete
    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe('Authenticated: true');
    });
    
    // Click logout button
    await user.click(screen.getByText('Logout'));
    
    // Check that token was removed and state cleared
    expect(window.localStorage.removeItem).toHaveBeenCalledWith('token');
    expect(screen.getByTestId('auth-status').textContent).toBe('Authenticated: false');
    expect(screen.getByTestId('username').textContent).toBe('No user');
    
    // Verify navigation
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
  
  test('handles invalid token in localStorage', async () => {
    // Setup localStorage with an invalid token
    window.localStorage.getItem.mockReturnValue('invalid-token');
    
    // Mock fetch for token verification - fails for invalid token
    global.fetch = jest.fn(() => 
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ message: 'Invalid token' })
      })
    );
    
    render(
      <MemoryRouter>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </MemoryRouter>
    );
    
    // Wait for auth check to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading-status').textContent).toBe('Loading: false');
    });
    
    // Should be unauthenticated after invalid token verification
    expect(screen.getByTestId('auth-status').textContent).toBe('Authenticated: false');
    expect(window.localStorage.removeItem).toHaveBeenCalledWith('token');
  });
});