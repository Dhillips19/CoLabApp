import mongoose from 'mongoose';

// user model to store the user information
// each user has a unique username, email, password, colour, 
// an ownedDocuments array, and a sharedDocuments array
const userModel = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    colour: {
        type: String,
        default: '#3498db',
    },
    ownedDocuments: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Document' 
    }],
    sharedDocuments: 
    [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Document' 
    }],
}, {
    timestamps: true,
});

const User = mongoose.model('User', userModel);

export default User;