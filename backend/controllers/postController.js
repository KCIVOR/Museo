
import db from '../database/db.js';


export const getAllPosts = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, userId } = req.query;

    let query = db.from('post')
      .select('*')
      .order('datePosted', { ascending: false }); 


    if (userId) {
      query = query.eq('userId', userId);
    }


    const from = (Number(page) - 1) * Number(pageSize);
    const to = from + Number(pageSize) - 1;
    query = query.range(from, to); 
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const getPostById = async (req, res) => {
  try {
    const postId = req.params.id;
    const { data, error } = await db
      .from('post')
      .select('*')
      .eq('postId', postId)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
};


export const createPost = async (req, res) => {
  try {
    const { description, image, newsfeedId, userId } = req.body;
    if (!description || !userId) {
      return res.status(400).json({ error: 'description and userId are required' });
    }

    const payload = {
      description,
      image: image ?? null,
      newsfeedId: newsfeedId ?? null,
      userId,

    };

    const { data, error } = await db
      .from('post')
      .insert([payload])
      .select()
      .single(); 

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await db
      .from('post')
      .delete()
      .eq('postId', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ deleted: data.postId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
