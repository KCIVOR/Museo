import db from '../database/db.js';
import bcrypt from "bcrypt"
import jwt from 'jsonwebtoken'

export const loginUser = async (req, res) =>{
    try{
        const {  email, password } = req.body

        const {data:user, error} = await db
        .from('user')
        .select("*")
        .eq('email', email)
        .single();

        if (error|| !user){
            return res.status(400).json({error:"Invalid username or password"})
        }

        const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) {
            return res.status(401).json({ error: "Invalid username or password" });
        }

        const JWT_SECRET = process.env.JWT_SECRET || "yourSuperSecretKey";
        const token = jwt.sign(
            { id: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: "1h" }
        )

        res.json({
            message: "Login successful",
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name // add more fields if needed
            },
            });


    }catch(error){
        console.error('Login error:', error);
        res.status(500).json({ error: "Internal server error" });
    }
    
};

export const registerUser = async (req, res) => {
    try {
        const { username, password, email } = req.body; 

        if (!username || !password || !email) {
            return res.status(400).json({ error: 'All fields are required.' });
        }

        
        const { data: existingUser, error: checkError } = await db
            .from('user')
            .select('*')
            .eq('email', email)
            .single(); 

        if (checkError && checkError.code !== 'PGRST116') { 
            throw checkError;
        }

        if (existingUser) {
            return res.status(400).json({ error: 'Email is already taken.' });
        }

       
        const hashedPassword = await bcrypt.hash(password, 10);

       
        const { data, error } = await db
            .from('user')
            .insert([{ username, password: hashedPassword, email }])
            .select();

        if (error) throw error;

        res.status(201).json(data[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
