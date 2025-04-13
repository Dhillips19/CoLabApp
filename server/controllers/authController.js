import User from '../DB/models/userModel.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// function to register new user
export const registerUser = async (req, res) => {
    try {
        const { username, email, password, confirmPassword } = req.body;

        // check passwords match
        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match"});
        }

        // check unique username
        let existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: "Account with that username already exists"});
        }

        // check unique email
        let existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({ message: "Account with that email already exists"});
        }

        // hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // save new user in db
        const user = new User({
            username,
            email,
            password: hashedPassword,
        });
        await user.save();

        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// function to log user in
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // validate email
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Incorrect Email"});
        }

        // validate password
        let isPasswordCorrect = await bcrypt.compare(password, user.password)
        if (!isPasswordCorrect) {
            return res.status(400).json({ message: "Incorrect Password"});
        }

        // generate JWT token
        const token = jwt.sign(
            { id: user._id, username: user.username, colour: user.colour }, 
            process.env.JWT_SECRET, 
            { expiresIn: "3h" }
        );

        res.status(200).json({ message: "User login successful", token });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};