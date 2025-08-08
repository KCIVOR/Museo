import db from '../database/db.js';
import bcrypt from "bcrypt"

export const getAllUsers = async (req, res) =>{
    try {
        const { data, error } = await db
        .from('user')
        .select('*')
        if (error) throw error
        res.json(data)
    } catch (error) {
        res.status(500).json({ error: error.message })
  }
};


export const createUsers = async (req, res) => {
    try {
        const { username, password, email } = req.body
        const hashedPassword = await bcrypt.hash(password, 10);
        if (!username || !password || !email) {
            return res.status(400).json({ error: 'All fields are required.' });
        }
        const { data, error } = await db
        .from('user')
        .insert([{username, password:hashedPassword, email }])
        .select()
        
        if (error) throw error
        res.status(201).json(data[0])
    } catch (error) {
        res.status(500).json({ error: error.message })
  }
};


export const getUser = async (req, res) =>{

};
export const updateUser = async (req, res) =>{

};
export const deleteUser = async (req, res) =>{

};



//const isMatch = await bcrypt.compare(password, data.password); check password