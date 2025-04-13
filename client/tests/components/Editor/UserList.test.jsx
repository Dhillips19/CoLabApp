import React from 'react';
import { render, screen } from '@testing-library/react';
import UserList from '../../../src/components/Editor/UserList';
import '@testing-library/jest-dom';

// Mock FontAwesomeIcon to make testing easier
jest.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: () => <div data-testid="users-icon">Users Icon</div>
}));

describe('UserList Component', () => {
  // Clear the DOM between tests to avoid conflicts
  afterEach(() => {
    document.body.innerHTML = '';
  });

  const mockUsers = [
    { username: 'user1', colour: '#ff0000' },
    { username: 'user2', colour: '#00ff00' },
    { username: 'user3', colour: '#0000ff' }
  ];
  
  test('renders empty state when no users provided', () => {
    render(<UserList users={[]} />);
    expect(screen.getByText('No active users')).toBeInTheDocument();
  });
  
  test('renders empty state when users is null or undefined', () => {
    // We'll use a clean render for each variant to avoid conflicts
    const { unmount } = render(<UserList users={null} />);
    expect(screen.getByText('No active users')).toBeInTheDocument();

    // Unmount the previous component before rendering the next one
    unmount();
    render(<UserList users={undefined} />);
    expect(screen.getByText('No active users')).toBeInTheDocument();
  });
  
  test('renders user icons for each user', () => {
    const testUsers = [
      { username: 'John Doe', colour: '#ff0000' },
      { username: 'Jane Smith', colour: '#00ff00' }
    ];
    
    const { container } = render(<UserList users={testUsers} />);
    
    // Use container.querySelector to target only the user-icon elements, not tooltip icons
    const johnIcon = container.querySelector('.user-icon[title="John Doe"]');
    const janeIcon = container.querySelector('.user-icon[title="Jane Smith"]');
    
    expect(johnIcon).toHaveTextContent('JD');
    expect(janeIcon).toHaveTextContent('JS');
  });
  
  test('generates correct user initials', () => {
    const testUsers = [
      { username: 'John Doe', colour: '#ff0000' },
      { username: 'Jane', colour: '#00ff00' },
      { username: 'Robert John Smith', colour: '#0000ff' }
    ];
    
    const { container } = render(<UserList users={testUsers} />);
    
    // Use more specific selectors to target only the visible user icons
    const johnIcon = container.querySelector('.user-icon[title="John Doe"]');
    const janeIcon = container.querySelector('.user-icon[title="Jane"]');
    const robertIcon = container.querySelector('.user-icon[title="Robert John Smith"]');
    
    expect(johnIcon).toHaveTextContent('JD');
    expect(janeIcon).toHaveTextContent('J');
    expect(robertIcon).toHaveTextContent('RJ');
  });
  
  test('shows overflow count when more than MAX_VISIBLE users', () => {
    // Create 7 users (MAX_VISIBLE is 5)
    const testUsers = Array.from({ length: 7 }, (_, i) => ({
      username: `User ${i+1}`,
      colour: `#${i}${i}${i}`
    }));
    
    render(<UserList users={testUsers} />);
    
    // Check for +2 overflow indicator
    expect(screen.getByText('+2')).toBeInTheDocument();
  });
  
  test('shows users icon when no overflow', () => {
    // Create 3 users (less than MAX_VISIBLE of 5)
    const testUsers = Array.from({ length: 3 }, (_, i) => ({
      username: `User ${i+1}`,
      colour: `#${i}${i}${i}`
    }));
    
    render(<UserList users={testUsers} />);
    
    // Check for the users icon
    expect(screen.getByTestId('users-icon')).toBeInTheDocument();
  });

  test('handles users with missing username or colour', () => {
    const testUsers = [
      { username: undefined, colour: '#ff0000' },
      { username: 'Jane', colour: undefined }
    ];
    
    const { container } = render(<UserList users={testUsers} />);
    
    // Use container queries for more specific targeting
    const placeholderIcon = container.querySelector('.user-icon:not([title])');
    const janeIcon = container.querySelector('.user-icon[title="Jane"]');
    
    expect(placeholderIcon).toHaveTextContent('?');
    expect(janeIcon).toHaveTextContent('J');
  });
  
  test('tooltip contains all users', () => {
    // Create 7 users (MAX_VISIBLE is 5)
    const testUsers = Array.from({ length: 7 }, (_, i) => ({
      username: `User ${i+1}`,
      colour: `#${i}${i}${i}`
    }));
    
    render(<UserList users={testUsers} />);
    
    // Check tooltip header exists
    expect(screen.getByText('All Users')).toBeInTheDocument();
    
    // Check all usernames appear in the tooltip (using tooltip-name class)
    testUsers.forEach(user => {
      const tooltipName = screen.getByText(user.username);
      expect(tooltipName).toHaveClass('tooltip-name');
    });
  });
});