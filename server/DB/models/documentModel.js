import mongoose from 'mongoose';

// document model to store the document information
// each document has a unique documentId, a state (Buffer), 
// a title, an owner, an array of collaborators, 
// and timestamps for creation and updates
const DocumentSchema = new mongoose.Schema({
    documentId: { 
        type: String, 
        required: true, 
        unique: true 
    },
    state: { 
        type: Buffer, 
        required: true
    },
    documentTitle: {
        type: String,
        required: true,
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    collaborators: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    }],
    createdAt: {
        type: Date,
        default: Date.now,
        immutable: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true }); 

const Document = mongoose.model('Document', DocumentSchema);

export default Document;