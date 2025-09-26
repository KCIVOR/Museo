import supabase from "../database/db.js";


export const getProfile = async (req, res) => {
    try {
        console.log("User ID from auth middleware:", req.user.id);
        const { data: profile, error } = await supabase
            .from("profile")
            .select("*")
            .eq("userId", req.user.id)
            .single();

        if (error) {
            console.error("Supabase error:", error);
            return res.status(500).json({ error: error.message });
        }

        console.log("Fetched profile:", profile);
        res.status(200).json({ profile });

    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}