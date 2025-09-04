
import db from '../database/db.js';


export const getAllArt = async (req, res) => {
  try {
    const { profileId, page = 1, pageSize = 12 } = req.query;

    let query = db
      .from('art')
      .select('*')
      .order('datePosted', { ascending: false });

    if (profileId) {
      query = query.eq('profileId', profileId); 
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


export const getArtById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await db
      .from('art')
      .select('*')
      .eq('artId', id)
      .single(); 

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
};


export const getArtForProfile = async (req, res) => {
  try {
    const { profileId } = req.params;
    const { page = 1, pageSize = 12 } = req.query;

    const from = (Number(page) - 1) * Number(pageSize);
    const to = from + Number(pageSize) - 1;

    const { data, error } = await db
      .from('art')
      .select('*')
      .eq('profileId', profileId)
      .order('datePosted', { ascending: false })
      .range(from, to);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const createArt = async (req, res) => {
  try {
    const { description, image, profileId } = req.body;
    if (!profileId || !description) {
      return res
        .status(400)
        .json({ error: 'profileId and description are required' });
    }

    const payload = {
      description,
      image: image ?? null,       
      profileId,

    };

    const { data, error } = await db
      .from('art')
      .insert([payload])
      .select()
      .single(); 

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/art/:id
export const deleteArt = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await db
      .from('art')
      .delete()
      .eq('artId', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ deleted: data.artId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
