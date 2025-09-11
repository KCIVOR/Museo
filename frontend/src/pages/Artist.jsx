import { Link } from "react-router-dom";
import "./css/artist.css";

// Dictionary data
const ARTISTS = {
  "james-morgan-mcgill": {
    id: "james-morgan-mcgill",
    name: "James Morgan McGill",
    hero: "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/random-l.jpg"
  },
  "mike-ehrmantraut": {
    id: "mike-ehrmantraut",
    name: "Mike Ehrmantraut",
    hero: "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/images%20(4).jpg"
  },
  "gustavo-fring": {
    id: "gustavo-fring",
    name: "Gustavo Fring",
    hero: "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/images%20(2).jpg"
  },
  "frank-stella": {
    id: "frank-stella",
    name: "Frank Stella",
    hero: "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/images%20(3).jpg"
  },
  "ge-fring": {                  // was "GE" with duplicate id
    id: "ge-fring",
    name: "GE Fring",
    hero: "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/images%20(3).jpg"
  }
};

export default function Artist() {
  const items = Object.values(ARTISTS);

  return (
    <div className="artistPage">
      <div className="artistFeed">
        <div className="artistGrid">
          {items.map((a) => (
            <div key={a.id} className="artistCard">
              <Link
                to={`/artist/${a.id}`}
                className="artistCard__link"
                style={{ display: "block", textDecoration: "none", color: "inherit" }}
              >
                <img src={a.hero} alt="" className="artistAvatar" />
                <div className="artistName">{a.name}</div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
