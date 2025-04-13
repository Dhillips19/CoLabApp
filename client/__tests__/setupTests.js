import '@testing-library/jest-dom';

// Import MSW server if used
import { server } from './__mocks__/server';

// Setup MSW
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn(key => {
      if (key === 'token') return 'mock-token';
      return null;
    }),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  },
  writable: true
});

// Mock alert and confirm
window.alert = jest.fn();
window.confirm = jest.fn();

// Suppress React Router warnings in tests
jest.mock('react-router-dom', () => {
  const originalModule = jest.requireActual('react-router-dom');
  return {
    __esModule: true,
    ...originalModule,
    useNavigate: () => jest.fn(),
    BrowserRouter: ({ children }) => <div>{children}</div>
  };
});

// Mock fetch globally
global.fetch = jest.fn().mockImplementation(() => {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve([])
  });
});