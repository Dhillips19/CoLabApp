import React from "react";
import "../../styles/UserList.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUsers } from "@fortawesome/free-solid-svg-icons";

// function for the user list component
const UserList = ({ users = [] }) => {
    
    // maximum number of users to show 
    const MAX_VISIBLE = 5;
    
    // fucntion to get the initials of a username
    const getInitials = (username) => {
        if (!username) return "?";
        return username
            .split(" ")
            .map(part => part[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };
    
    // no other users in the document, display a message
    if (!users || users.length === 0) {
        return <div className="user-list"><span className="no-users">No active users</span></div>;
    }
    
    // calculate how many users to show and how many are remaining
    const visibleUsers = users.slice(0, MAX_VISIBLE);
    const remainingCount = Math.max(0, users.length - MAX_VISIBLE);
    
    return (
        <div className="user-list">
            <div className="user-icons-container">
                { /* map through the visible users and display their initials */}
                {visibleUsers.map((user, index) => (
                    <div 
                        key={index}
                        className="user-icon"
                        style={{ backgroundColor: user.colour || "#888" }}
                        title={user.username}
                    >
                        {getInitials(user.username)}
                    </div>
                ))}
                
                { /* if there are more than 5 users, show the count over 5 */}
                <div className="user-list-display">
                    {remainingCount > 0 ? `+${remainingCount}` : <FontAwesomeIcon icon={faUsers} />}
                    
                    { /* tooltip to show all users when hovered */}
                    <div className="user-tooltip">
                        <div className="tooltip-header">All Users</div>
                        { /* map through the all users and display their initials */}
                        {users.map((user, index) => (
                            <div key={index} className="tooltip-user">
                                <div 
                                    className="tooltip-icon" 
                                    style={{ backgroundColor: user.colour || "#888" }}
                                >
                                    {getInitials(user.username)}
                                </div>
                                <span className="tooltip-name">{user.username}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserList;