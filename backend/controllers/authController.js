import db from '../database/db.js';
import bcrypt from "bcrypt"
import jwt from 'jsonwebtoken'

const generateAccess = (user) => { //generate access key
    const ACCESS_SECRET = process.env.ACCESS_SECRET;
    const accessToken = jwt.sign(
        { id: user.id, email: user.email },
        ACCESS_SECRET,
        { expiresIn: "30s" }
    )
    return accessToken;
};

const generateRefresh = (user) =>{ //generate ng refresh key
    const REFRESH_SECRET = process.env.REFRESH_SECRET;
    const refreshToken = jwt.sign(
        { id: user.id },
        REFRESH_SECRET,
        { expiresIn: "7d" }
    )
    return  refreshToken;
    
}

const uploadRefresh = async (email, refreshKey) => { // upload refresh key sa database
  try {
    const { data, error } = await db
      .from('refreshkey')
      .upsert(
        { email: email, refresh_token: refreshKey }, 
        { onConflict: 'email' }
      );

    if (error) throw error;

    console.log('Refresh key stored/updated:', data);
    return data;

  } catch (err) {
    console.error('Error uploading refresh key:', err.message);
    return null;
  }
};

export const loginUser = async (req, res) =>{ //login
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
        const accessToken = generateAccess(user);
        const refreshToken = generateRefresh(user);
        console.log(accessToken,"test")
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        uploadRefresh(email,refreshToken); //tawag para upload refresh key sa db
        res.json({
            message: "Login successful",
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name 
            },
        });
    }catch(error){
        console.error('Login error:', error);
        res.status(500).json({ error: "Internal server error" });
    }
    
};

export const registerUser = async (req, res) => { //register ng user
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

export const verifyToken =  async (req, res) =>{ //verify if token ay valid
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Malformed token' });
    }
    try {
        // Verify both signature AND expiration
        const decoded = jwt.verify(token, process.env.ACCESS_SECRET); 
        // (No need for `ignoreExpiration: false` since it's default)
        return res.status(200).json({ valid: true, message: 'Token is valid' });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ valid: false, error: 'Token expired' });
        }
        return res.status(401).json({ valid: false, error: 'Invalid token' });
    }
}

export const refreshAccessToken = async (req, res) => { //nirerefresh access token if expired
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ error: 'No refresh token provided' });
  }
  try {
    const payload = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
    const { data, error } = await db
    .from('user')
    .select("*")
    .eq('id', payload.id)
    .single();

    if (error || !data) {
    return res.status(404).json({ error: 'User not found' });
    }

    const accessToken = jwt.sign(
      { id: payload.id, email: data.email },
      process.env.ACCESS_SECRET,
      { expiresIn: '30s' }
    );
    res.json({ accessToken });

  } catch (err) {
    // Clear the refresh token cookie if invalid or expired
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    return res.status(403).json({ error: 'Invalid or expired refresh token' });
  }
};

