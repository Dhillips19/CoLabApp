import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faEnvelope, faLock, faSpinner } from '@fortawesome/free-solid-svg-icons';
import '../../styles/LoginRegister.css';
import axios from 'axios';
import { Link } from 'react-router-dom';

// function for the login component
const Register = () => {
    // state variables for form data, error messages, success messages, and loading state
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // useNavigate hook to navigate pages
    const navigate = useNavigate();


    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // function to handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault(); // prevent default form submission
        // set error and loading state
        setError("");
        setIsLoading(true);

        // ensure that password and confirm password match
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords don't match");
            setIsLoading(false);
            return;
        }

        // send form data to the server for registration
        try {
            await axios.post("http://localhost:3001/api/auth/register", formData);
            setSuccess("Account created successfully! You can now login."); 
            setFormData({ username: "", email: "", password: "", confirmPassword: "" }); // reset form data
            
            // set timeout to navigate to login page after 1 second
            setTimeout(() => {
                navigate("/login", { state: { message: "Account created successfully! You can now login." } });
            }, 1000);

        } catch (error) {
            setError(error.response?.data?.message || "Registration failed");
        } finally {
            setIsLoading(false);
        }
    };

    // render the registration form
    return (
        <div className='wrapper'>
            <div className='container'>
                <div className='header'>
                    <div className='text'>Create Account</div>
                    <div className="underline"></div>
                </div>

                {/* display error or success messages */}
                {error && <div className="error">{error}</div>}
                {success && <div className="success">{success}</div>}

                <form className="inputs" onSubmit={handleSubmit}>
                    <div className="input">
                        <FontAwesomeIcon icon={faUser} />
                        <input 
                            type="text" 
                            name="username" 
                            placeholder="Username" 
                            value={formData.username} 
                            onChange={handleChange} 
                            required 
                            disabled={isLoading}
                        />
                    </div>

                    <div className="input">
                        <FontAwesomeIcon icon={faEnvelope} />
                        <input 
                            type="email" 
                            name="email" 
                            placeholder="Email Address" 
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
                            placeholder="Password" 
                            value={formData.password} 
                            onChange={handleChange} 
                            required 
                            disabled={isLoading}
                        />
                    </div>

                    <div className="input">
                        <FontAwesomeIcon icon={faLock} />
                        <input 
                            type="password" 
                            name="confirmPassword" 
                            placeholder="Confirm Password" 
                            value={formData.confirmPassword} 
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
                            Create Account
                            {isLoading && <FontAwesomeIcon icon={faSpinner} className="spinner-icon" />}
                        </button>
                    </div>
                </form>

                {/* display login link */}
                <div className="account-link">
                    Already have an account?
                    <Link to="/login">Sign in</Link>
                </div>
            </div>
        </div>
    );
};

export default Register;