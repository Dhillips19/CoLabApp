import User from '../DB/models/userModel.js';
import jwt from 'jsonwebtoken';

// function to update user's colour
export const updateUserColour = async (req, res) => {
    try {
        const { colour } = req.body;
        const userId = req.user.id;
        
        if (!colour) {
            return res.status(400).json({ message: "Colour is required" });
        }
        
        // finc user in DB
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        // update user's colour
        user.colour = colour;
        await user.save();

        // sign the stored jwt token with the updated colour
        const token = jwt.sign(
            {
                id: user._id,
                username: user.username,
                colour: user.colour
            },
            process.env.JWT_SECRET,
            { expiresIn: "3h" }
        )
        
        res.status(200).json({ 
            message: "Colour preference updated successfully",
            colour: user.colour,
            token: token
        });
    } catch (error) {
        console.error('Error updating user colour:', error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};