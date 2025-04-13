import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();

// AuthProvider component to provide authentication context to the app
// this component wraps around the main app component to provide authentication for page access
export const AuthProvider = ({ children }) => {
	// state variables to manage authentication status, loading state, and user data
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState(null);

	// useNavigate hook to navigate pages
    const navigate = useNavigate();

	// function to extract user data from JWT token
    const extractUserFromToken = (token) => {
        try {
            const decoded = jwtDecode(token);
            return decoded;
        } catch (error) {
            console.error('Failed to decode token:', error);
            return null;
        }
    };

	// useEffect to verify token on component mount
	useEffect(() => {
		// function to verify token and set authentication state
		const verifyToken = async () => {
			setIsLoading(true);
			const token = localStorage.getItem('token');
		
			// check if token exists in local storage
			if (!token) {
				setIsAuthenticated(false);
				setIsLoading(false);
				setUser(null);
				return;
			}
			
			// verify token with the server
			try {
				const response = await fetch('http://localhost:3001/api/auth/verify', {
					headers: {
						'Authorization': `Bearer ${token}`
					}
				});
				
				// if response is ok, set authenticated state and user data
				if (response.ok) {
					setIsAuthenticated(true);
					const userData = extractUserFromToken(token);
					setUser(userData);
				} else {
					localStorage.removeItem('token');
					setIsAuthenticated(false);
					setUser(null);
				}
			} catch (error) {
				console.error('Token verification failed:', error);
				localStorage.removeItem('token');
				setIsAuthenticated(false);
				setUser(null);
			} finally {
				setIsLoading(false);
			}
		};
		
		verifyToken(); // call the function to verify token on component mount
	}, []);

	// function to log in the user and set authentication state
	const login = (token) => {
		// check if token is valid before setting it in local storage
		if (!token) {
			console.error('Invalid token provided for login.');
			return;
		}

		// set token in local storage and update authentication state
		localStorage.setItem('token', token);
		setIsAuthenticated(true);

		// decode the token to extract user data
		const userData = extractUserFromToken(token);
		setUser(userData);

		// navigate to the home page after half a second
		setTimeout(() => navigate('/'), 500);
	};
	
	// function to log out the user and clear authentication state
	const logout = () => {
		localStorage.removeItem('token');
		setIsAuthenticated(false);
		setUser(null);
		navigate('/login');
	};
	
	// provide authentication context to the app
	// this allows any component in the app to access authentication state and functions
	return (
		<AuthContext.Provider value={{ 
			isAuthenticated, 
			isLoading,
			user, 
			login, 
			logout 
		}}>
			{children}
		</AuthContext.Provider>
	);
};

// custom hook to use the AuthContext in any component
export const useAuth = () => useContext(AuthContext);