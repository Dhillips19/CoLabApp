import React from 'react';
import NavBar from '../components/NavBar/NavBar';
import CreateDocument from '../components/Documents/CreateDocument';
import ListUserDocuments from '../components/Documents/ListUserDocuments';
import '../styles/HomePage.css';

const HomePage = () => {
    return (
        <div>
            <NavBar/>
            <div className='home-page-create-document'>
                <CreateDocument/>
            </div>
            
            <ListUserDocuments/>
        </div>
    )
}

export default HomePage;