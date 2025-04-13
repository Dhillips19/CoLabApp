import Chat from '../DB/models/chatModel.js';

// function to save a new chat messagee to the database
export async function saveChatMessage(documentId, chatMessage) {
    try {
        // store the chat message in the database
        const chat = await Chat.findOneAndUpdate(
            { documentId },
            { $push: { messages: chatMessage } },
            { new: true, upsert: true }
        );
        return chat; // send updated chat
    } catch (error) {
        console.error('Error saving chat message:', error);
    }
}

// function to load chat messages when document opens
export async function loadChatMessages(documentId) {
    try {
        // find chat by document Id
        const chat = await Chat.findOne({ documentId });
        return chat ? chat.messages : []; // send chat messages if chat exists, else send empty array
    } catch (error) {
        console.error('Error loading chat messages:', error);
        return [];
    }
}