import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../../src/context/AuthContext';
import Login from '../../../src/components/LoginRegister/Login';
import '@testing-library/jest-dom';

// Mock the entire axios module
jest.mock('axios', () => ({
  post: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
  put: jest.fn()
}));

// Import axios after mocking it
import axios from 'axios';

// We need to mock the navigate function since we're not using the real router
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  MemoryRouter: jest.requireActual('react-router-dom').MemoryRouter
}));

const renderLogin = () => {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('Login Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockReset();
  });
  
  test('renders login form correctly', () => {
    renderLogin();
    
    // Check for form elements
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email Address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
    expect(screen.getByText(/create account/i)).toBeInTheDocument();
  });
  
  test('handles successful login', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        message: 'User login successful',
        token: 'test-token'
      }
    });
    
    renderLogin();
    const user = userEvent.setup();
    
    // Fill in the form
    await user.type(screen.getByPlaceholderText('Email Address'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Password'), 'password123');
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    
    // Check API call
    expect(axios.post).toHaveBeenCalledWith('http://localhost:3001/api/auth/login', {
      email: 'test@example.com',
      password: 'password123'
    });
    
    // Check for success message
    await waitFor(() => {
      expect(screen.getByText(/login successful/i)).toBeInTheDocument();
    });
  });
  
  test('handles failed login attempt', async () => {
    axios.post.mockRejectedValueOnce({
      response: {
        data: {
          message: 'Incorrect Email'
        }
      }
    });
    
    renderLogin();
    const user = userEvent.setup();
    
    // Fill in the form
    await user.type(screen.getByPlaceholderText('Email Address'), 'wrong@example.com');
    await user.type(screen.getByPlaceholderText('Password'), 'wrongpass');
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    
    // Check for error message
    await waitFor(() => {
      expect(screen.getByText('Incorrect Email')).toBeInTheDocument();
    });
  });
  
  test('disables form during submission', async () => {
    // Make the API call take some time
    axios.post.mockImplementationOnce(() => {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({ data: { token: 'test-token' } });
        }, 100);
      });
    });
    
    renderLogin();
    const user = userEvent.setup();
    
    // Fill in the form
    await user.type(screen.getByPlaceholderText('Email Address'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Password'), 'password123');
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    
    // Check that inputs and button are disabled during submission
    expect(screen.getByPlaceholderText('Email Address')).toBeDisabled();
    expect(screen.getByPlaceholderText('Password')).toBeDisabled();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled();
    
    // Wait for submission to complete
    await waitFor(() => {
      expect(screen.getByText(/login successful/i)).toBeInTheDocument();
    });
  });
  
  test('navigates to register page when "Create account" is clicked', async () => {
    renderLogin();
    const user = userEvent.setup();
    
    // Click the register link
    await user.click(screen.getByText(/create account/i));
    
    // In a real test, we'd check for navigation, but in this isolated test
    // we can just verify the link has the correct href
    expect(screen.getByText(/create account/i).closest('a')).toHaveAttribute('href', '/register');
  });
});