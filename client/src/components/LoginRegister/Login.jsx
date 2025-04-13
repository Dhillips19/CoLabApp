import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faLock, faSpinner } from '@fortawesome/free-solid-svg-icons';
import '../../styles/LoginRegister.css';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// function for the login component
const Login = () => {
    // state variables for form data, error messages, success messages, and loading state
    const [formData, setFormData] = useState({ 
        email: '', 
        password: '' 
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // useAuth hook to access authentication context
    const { login } = useAuth();

    // function to handle input changes
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // function to handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault(); // prevent default form submission
        // set error and loading state
        setError('');
        setIsLoading(true);

        // send form data to the server for authentication
        try {
            const res = await axios.post('http://localhost:3001/api/auth/login', formData);
            login(res.data.token); // call login function from useAuth to set the token in local storage
            setSuccess("Login successful! Redirecting...");
        } catch (err) {
            console.error("Login error:", err);
            setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    // render the login form
    return (
        <div className='wrapper'>
            <div className='container'>
                <div className='header'>
                    <div className='text'>Welcome Back</div>
                    <div className="underline"></div>
                </div>

                {/* display error or success messages */}
                {error && <div className="error">{error}</div>}
                {success && <div className="success">{success}</div>}

                <form className="inputs" onSubmit={handleSubmit}>
                    <div className="input">
                        <FontAwesomeIcon icon={faEnvelope} />
                        <input 
                            type="email" 
                            name="email" 
                            placeholder='Email Address' 
                            value={formData.email} 
                            onChange={handleChange}              
                            required 
                            disabled={isLoading}
                        />
                    </div>

                    <div className="input">
                        <FontAwesomeIcon icon={faLock} />
                        <input 
                            type="password" 
                            name="password" 
                            placeholder='Password' 
                            value={formData.password} 
                            onChange={handleChange} 
                            required 
                            disabled={isLoading}
                        />
                    </div>

                    <div className="submit-container">
                        <button 
                            type="submit" 
                            className="submit"
                            disabled={isLoading}
                        >
                            Sign In
                            {isLoading && <FontAwesomeIcon icon={faSpinner} className="spinner-icon" />}
                        </button>
                    </div>
                </form>

                {/* display forgot password and create account links */}
                {/* <div className="forgot-password">
                    Forgot your password?
                    <span>Reset it here</span>
                </div> */}

                <div className="account-link">
                    Don't have an account?
                    <Link to="/register">Create account</Link>
                </div>
            </div>
        </div>
    );
};

export default Login;