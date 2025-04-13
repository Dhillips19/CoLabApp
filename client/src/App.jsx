import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DocumentPage from './pages/DocumentPage';
import DocumentNotFound from './pages/DocumentNotFound';
import LoadingSpinner from './components/Loading/LoadingSpinner';

// ProtectedRoute component to protect routes that require authentication
const ProtectedRoute = ({ children }) => {
	const { isAuthenticated, isLoading } = useAuth();
	
	if (isLoading) {
		return <LoadingSpinner />;
	}
	
	return isAuthenticated ? children : <Navigate to="/login" />;
};

// main App component
const App = () => {
	const { isLoading } = useAuth();

	// check if the app is still loading
	if (isLoading) {
		return <LoadingSpinner />;
	}
	
	// define routes for the application
	// the routes are protected using the ProtectedRoute component
	return (
		<Routes>
			<Route path="/login" element={<LoginPage/>} />
			<Route path="/register" element={<RegisterPage/>} />
			<Route path="/" element={<ProtectedRoute> <HomePage/> </ProtectedRoute>} />
			<Route path="/document/:documentId" element={<ProtectedRoute> <DocumentPage/> </ProtectedRoute>} />
			<Route path="/document-not-found" element={<DocumentNotFound/>} />
		</Routes>
	);
};

export default App;