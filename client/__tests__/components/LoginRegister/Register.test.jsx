import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom'; // Switch to MemoryRouter
import Register from '../../../src/components/LoginRegister/Register';
import '@testing-library/jest-dom';

jest.mock('axios', () => ({
    post: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
    put: jest.fn()
}));

// Import axios after mocking it
import axios from 'axios';

// Mock navigate function
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  MemoryRouter: jest.requireActual('react-router-dom').MemoryRouter // Preserve MemoryRouter
}));

const renderRegister = () => {
  return render(
    <MemoryRouter> {/* Use MemoryRouter instead of BrowserRouter */}
      <Register />
    </MemoryRouter>
  );
};

describe('Register Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('renders register form correctly', () => {
    renderRegister();
    
    // Use a more specific selector for the header text
    expect(screen.getByText('Create Account', { selector: '.text' })).toBeInTheDocument();
    
    // Check for form elements
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email Address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirm Password')).toBeInTheDocument();
    
    // Use role for the button instead of text
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });
  
  test('validates passwords match', async () => {
    renderRegister();
    const user = userEvent.setup();
    
    // Fill in form with mismatched passwords
    await user.type(screen.getByPlaceholderText('Username'), 'testuser');
    await user.type(screen.getByPlaceholderText('Email Address'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Password'), 'password123');
    await user.type(screen.getByPlaceholderText('Confirm Password'), 'different');
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /create account/i }));
    
    // Check error message
    expect(screen.getByText("Passwords don't match")).toBeInTheDocument();
    expect(axios.post).not.toHaveBeenCalled();
  });
  
  test('handles successful registration', async () => {
    axios.post.mockResolvedValueOnce({
      data: { message: 'User registered successfully' }
    });
    
    renderRegister();
    const user = userEvent.setup();
    
    // Fill in form
    await user.type(screen.getByPlaceholderText('Username'), 'testuser');
    await user.type(screen.getByPlaceholderText('Email Address'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Password'), 'password123');
    await user.type(screen.getByPlaceholderText('Confirm Password'), 'password123');
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /create account/i }));
    
    // Check API call
    expect(axios.post).toHaveBeenCalledWith('http://localhost:3001/api/auth/register', {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123'
    });
    
    // Check success message
    await waitFor(() => {
      expect(screen.getByText(/account created successfully/i)).toBeInTheDocument();
    });
    
    // Check navigation after timeout
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login', {
        state: { message: 'Account created successfully! You can now login.' }
      });
    }, { timeout: 1500 });
  });
  
  test('handles username already exists error', async () => {
    axios.post.mockRejectedValueOnce({
      response: {
        data: {
          message: 'Account with that username already exists'
        }
      }
    });
    
    renderRegister();
    const user = userEvent.setup();
    
    // Fill in form
    await user.type(screen.getByPlaceholderText('Username'), 'existinguser');
    await user.type(screen.getByPlaceholderText('Email Address'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Password'), 'password123');
    await user.type(screen.getByPlaceholderText('Confirm Password'), 'password123');
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /create account/i }));
    
    // Check error message
    await waitFor(() => {
      expect(screen.getByText('Account with that username already exists')).toBeInTheDocument();
    });
  });
  
  test('handles email already exists error', async () => {
    axios.post.mockRejectedValueOnce({
      response: {
        data: {
          message: 'Account with that email already exists'
        }
      }
    });
    
    renderRegister();
    const user = userEvent.setup();
    
    // Fill in form
    await user.type(screen.getByPlaceholderText('Username'), 'newuser');
    await user.type(screen.getByPlaceholderText('Email Address'), 'existing@example.com');
    await user.type(screen.getByPlaceholderText('Password'), 'password123');
    await user.type(screen.getByPlaceholderText('Confirm Password'), 'password123');
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /create account/i }));
    
    // Check error message
    await waitFor(() => {
      expect(screen.getByText('Account with that email already exists')).toBeInTheDocument();
    });
  });
  
  test('navigates to login page when "Sign in" is clicked', async () => {
    renderRegister();
    const user = userEvent.setup();
    
    // Click the login link
    await user.click(screen.getByText(/sign in/i));
    
    // Check that the link has the correct href
    expect(screen.getByText(/sign in/i).closest('a')).toHaveAttribute('href', '/login');
  });
});