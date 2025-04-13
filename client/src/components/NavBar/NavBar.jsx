import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faSignOutAlt, faHome, faKey, faCog} from "@fortawesome/free-solid-svg-icons";
import '../../styles/NavBar.css';
import { useAuth } from '../../context/AuthContext';

// NavBar component 
export default function NavBar() {
    // useAuth hook to access authentication context
    const { isAuthenticated, logout, user } = useAuth();

    // state variables for settings dropdown and user colour
    const [showSettings, setShowSettings] = useState(false);
    const [userColour, setUserColour] = useState(user?.colour || "#3498db");

    // reference to settings dropdown to handle outside clicks
    const settingsRef = useRef(null);
    
    // extract username from user object
    const username = user?.username?.split(' ')[0] || user?.username || "User";
    
    // display colour options
    const colourOptions = [
        "#3498db", // default blue
        "#e74c3c",
        "#2ecc71",
        "#f1c40f",
        "#9b59b6",
        "#1abc9c",
        "#e67e22",
        "#34495e",
        "#fd79a8",
        "#16a085",
        "#f39c12",
        "#8e44ad",
        "#c0392b",
        "#27ae60",
        "#2980b9"
    ];
    
    useEffect(() => {
        // function to handle click outside of settings dropdown
        function handleClickOutside(event) {
            if (settingsRef.current && !settingsRef.current.contains(event.target)) {
                setShowSettings(false);
            }
        }
        // add event listener for click outside
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);
    
    // function to handle colour selection
    const handleColourSelect = async (colour) => {
        try {
            // set user colour in local state
            setUserColour(colour);

            // get token from local storage
            const token = localStorage.getItem("token");

            // update colour in DB
            const response = await fetch("http://localhost:3001/api/user-settings/update-colour", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ colour })
            });

            // check if response is ok and update token in local storage
            if (!response.ok) {
                throw new Error("Failed to update colour preference");
            }

            // parse response data
            const data = await response.json();

            // check if token is present in response
            if (response.status === 200 && data.token) {
                
                // update token in local storage
                localStorage.setItem("token", data.token);

                console.log("Colour preference updated successfully");
            } 
        } catch (error) {
            console.error("Failed to update colour preference:", error);
            setUserColour(colour)
        } finally {
            setShowSettings(false);
        }
    };

    // set user colour when user object changes
    useEffect(() => {
        if (user && user.colour)
            setUserColour(user.colour);
    }, [user]);
    
    return (
        <div className='navigation-menu'>
            {/* left section for brand navigation and links */}
            <div className="left-section">
                <div className="nav-brand">
                    <Link to="/" className="brand-link">
                        <span className="brand-text">CoLab</span>
                    </Link>
                </div>
                
                <nav>
                    <ol className="nav-links">
                        { /* if logged in display home button, else display login and register */}
                        {isAuthenticated ? (
                            <li><Link to="/"><FontAwesomeIcon icon={faHome} /> Home</Link></li>
                        ) : (
                            <>
                                <li><Link to="/login">Login</Link></li>
                                <li><Link to="/register">Register</Link></li>
                            </>
                        )}
                    </ol>
                </nav>
            </div>
            
            {/* right side for user info, setting dropdown and user icon */}
            {isAuthenticated && (
                <div className="right-section">
                    <div className="user-info">
                        <span className="user-name">Hello, {username}</span>
                        <div className="user-settings">
                            <div className="settings-cog" title="Settings" onClick={() => setShowSettings(!showSettings)}>
                                <FontAwesomeIcon icon={faCog} size="lg"/>
                            </div>
                        </div>
                        <div className="user-settings" ref={settingsRef}>
                            <div className="user-icon" style={{ backgroundColor: userColour }} title="User Icon">
                                <FontAwesomeIcon icon={faUser}/>
                            </div>
                            
                            {showSettings && (
                                <div className="settings-dropdown">
                                    <div className="settings-header">
                                        <h3>Settings</h3>
                                    </div>
                                    
                                    { /* change password button - not set up yet */}
                                    <div className="change-password">
                                        <Link to="/change-password" className="change-password-link">
                                            <FontAwesomeIcon icon={faKey} />
                                            <span>Change Password</span>
                                        </Link>
                                    </div>
                                    
                                    <div className="colour-picker">
                                        <p>Choose your collaboration colour:</p>
                                        <div className="colour-options">
                                            {/* map through colour options and display them */}
                                            {colourOptions.map((colour, index) => (
                                                <div 
                                                    key={index}
                                                    className={`colour-option ${colour === userColour ? "selected" : ""}`}
                                                    style={{ backgroundColor: colour }}
                                                    onClick={() => handleColourSelect(colour)} // handle colour selection
                                                >
                                                    {colour === userColour && <div className="colour-selected"></div>} { /* show selected colour indicator */}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    {/* logout button */}
                                    <div className="settings-footer">
                                        <button onClick={logout} className="logout-button">
                                            <FontAwesomeIcon icon={faSignOutAlt} /> Logout
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}