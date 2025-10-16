import { useNavigate } from "react-router-dom";
import "./css/gallery.css";

/* Comprehensive artwork collection - 50 masterpieces with varied heights for optimal masonry */
const artworks = [
  {
    id: 1,
    title: "Starry Night Over the Rhône",
    artist: "Vincent van Gogh",
    year: "1888",
    category: "Post-Impressionist",
    image: "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/04c37008-cda2-4cb0-94d9-395ff110c84c/1760455905634-846202A3-8380-4C72-B043-E57CE744AB37.png",
    height: 400
  },
  {
    id: 2,
    title: "The Great Wave",
    artist: "Katsushika Hokusai",
    year: "1831",
    category: "Ukiyo-e",
    image: "https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=400&h=300&fit=crop",
    height: 250
  },
  {
    id: 3,
    title: "Girl with a Pearl Earring",
    artist: "Johannes Vermeer",
    year: "1665",
    category: "Baroque",
    image: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=500&fit=crop",
    height: 350
  },
  {
    id: 4,
    title: "The Persistence of Memory",
    artist: "Salvador Dalí",
    year: "1931",
    category: "Surrealism",
    image: "https://images.unsplash.com/photo-1549490349-8643362247b5?w=400&h=320&fit=crop",
    height: 280
  },
  {
    id: 5,
    title: "The Thinker",
    artist: "Auguste Rodin",
    year: "1904",
    category: "Sculpture",
    image: "https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400&h=550&fit=crop",
    height: 450
  },
  {
    id: 6,
    title: "Composition VII",
    artist: "Wassily Kandinsky",
    year: "1913",
    category: "Abstract",
    image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=280&fit=crop",
    height: 220
  },
  {
    id: 7,
    title: "American Gothic",
    artist: "Grant Wood",
    year: "1930",
    category: "Regionalism",
    image: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&h=480&fit=crop",
    height: 380
  },
  {
    id: 8,
    title: "The Birth of Venus",
    artist: "Sandro Botticelli",
    year: "1485",
    category: "Renaissance",
    image: "https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=400&h=350&fit=crop",
    height: 300
  },
  {
    id: 9,
    title: "Guernica",
    artist: "Pablo Picasso",
    year: "1937",
    category: "Cubism",
    image: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=200&fit=crop",
    height: 180
  },
  {
    id: 10,
    title: "The Scream",
    artist: "Edvard Munch",
    year: "1893",
    category: "Expressionism",
    image: "https://images.unsplash.com/photo-1549490349-8643362247b5?w=400&h=420&fit=crop",
    height: 320
  },
  {
    id: 11,
    title: "Water Lilies",
    artist: "Claude Monet",
    year: "1919",
    category: "Impressionism",
    image: "https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=400&h=260&fit=crop",
    height: 240
  },
  {
    id: 12,
    title: "The Kiss",
    artist: "Gustav Klimt",
    year: "1908",
    category: "Art Nouveau",
    image: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=400&fit=crop",
    height: 360
  },
  {
    id: 13,
    title: "Las Meninas",
    artist: "Diego Velázquez",
    year: "1656",
    category: "Baroque",
    image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=520&fit=crop",
    height: 420
  },
  {
    id: 14,
    title: "The Son of Man",
    artist: "René Magritte",
    year: "1964",
    category: "Surrealism",
    image: "https://images.unsplash.com/photo-1549490349-8643362247b5?w=400&h=300&fit=crop",
    height: 270
  },
  {
    id: 15,
    title: "David",
    artist: "Michelangelo",
    year: "1504",
    category: "Renaissance",
    image: "https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400&h=600&fit=crop",
    height: 480
  },
  {
    id: 16,
    title: "Campbell's Soup Cans",
    artist: "Andy Warhol",
    year: "1962",
    category: "Pop Art",
    image: "https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=400&h=220&fit=crop",
    height: 200
  },
  {
    id: 17,
    title: "The Night Watch",
    artist: "Rembrandt van Rijn",
    year: "1642",
    category: "Dutch Golden Age",
    image: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&h=340&fit=crop",
    height: 310
  },
  {
    id: 18,
    title: "A Sunday on La Grande Jatte",
    artist: "Georges Seurat",
    year: "1886",
    category: "Neo-Impressionism",
    image: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=280&fit=crop",
    height: 250
  },
  {
    id: 19,
    title: "The Creation of Adam",
    artist: "Michelangelo",
    year: "1512",
    category: "High Renaissance",
    image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=240&fit=crop",
    height: 220
  },
  {
    id: 20,
    title: "Liberty Leading the People",
    artist: "Eugène Delacroix",
    year: "1830",
    category: "Romanticism",
    image: "https://images.unsplash.com/photo-1549490349-8643362247b5?w=400&h=380&fit=crop",
    height: 340
  },
  {
    id: 21,
    title: "The Arnolfini Portrait",
    artist: "Jan van Eyck",
    year: "1434",
    category: "Northern Renaissance",
    image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=460&fit=crop",
    height: 390
  },
  {
    id: 22,
    title: "Nighthawks",
    artist: "Edward Hopper",
    year: "1942",
    category: "American Realism",
    image: "https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=400&h=280&fit=crop",
    height: 230
  },
  {
    id: 23,
    title: "The Garden of Earthly Delights",
    artist: "Hieronymus Bosch",
    year: "1515",
    category: "Northern Renaissance",
    image: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=320&fit=crop",
    height: 260
  },
  {
    id: 24,
    title: "Olympia",
    artist: "Édouard Manet",
    year: "1863",
    category: "Realism",
    image: "https://images.unsplash.com/photo-1549490349-8643362247b5?w=400&h=300&fit=crop",
    height: 250
  },
  {
    id: 25,
    title: "The Weeping Woman",
    artist: "Pablo Picasso",
    year: "1937",
    category: "Cubism",
    image: "https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400&h=380&fit=crop",
    height: 320
  },
  {
    id: 26,
    title: "Impression, Sunrise",
    artist: "Claude Monet",
    year: "1872",
    category: "Impressionism",
    image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop",
    height: 240
  },
  {
    id: 27,
    title: "The Dance",
    artist: "Henri Matisse",
    year: "1910",
    category: "Fauvism",
    image: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&h=320&fit=crop",
    height: 270
  },
  {
    id: 28,
    title: "Black Square",
    artist: "Kazimir Malevich",
    year: "1915",
    category: "Suprematism",
    image: "https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=400&h=400&fit=crop",
    height: 350
  },
  {
    id: 29,
    title: "The Hay Wain",
    artist: "John Constable",
    year: "1821",
    category: "Romanticism",
    image: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=300&fit=crop",
    height: 250
  },
  {
    id: 30,
    title: "Venus de Milo",
    artist: "Alexandros of Antioch",
    year: "130 BC",
    category: "Ancient Greek",
    image: "https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400&h=500&fit=crop",
    height: 420
  },
  {
    id: 31,
    title: "The Potato Eaters",
    artist: "Vincent van Gogh",
    year: "1885",
    category: "Post-Impressionist",
    image: "https://images.unsplash.com/photo-1549490349-8643362247b5?w=400&h=320&fit=crop",
    height: 280
  },
  {
    id: 32,
    title: "Christina's World",
    artist: "Andrew Wyeth",
    year: "1948",
    category: "Contemporary Realism",
    image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop",
    height: 240
  },
  {
    id: 33,
    title: "The Treachery of Images",
    artist: "René Magritte",
    year: "1929",
    category: "Surrealism",
    image: "https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=400&h=240&fit=crop",
    height: 200
  },
  {
    id: 34,
    title: "Number 1, 1950",
    artist: "Jackson Pollock",
    year: "1950",
    category: "Abstract Expressionism",
    image: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&h=280&fit=crop",
    height: 230
  },
  {
    id: 35,
    title: "The Luncheon on the Grass",
    artist: "Édouard Manet",
    year: "1863",
    category: "Realism",
    image: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=320&fit=crop",
    height: 270
  },
  {
    id: 36,
    title: "The School of Athens",
    artist: "Raphael",
    year: "1511",
    category: "High Renaissance",
    image: "https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400&h=280&fit=crop",
    height: 230
  },
  {
    id: 37,
    title: "Café Terrace at Night",
    artist: "Vincent van Gogh",
    year: "1888",
    category: "Post-Impressionist",
    image: "https://images.unsplash.com/photo-1549490349-8643362247b5?w=400&h=360&fit=crop",
    height: 310
  },
  {
    id: 38,
    title: "The Ambassadors",
    artist: "Hans Holbein the Younger",
    year: "1533",
    category: "Northern Renaissance",
    image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop",
    height: 350
  },
  {
    id: 39,
    title: "Balloon Dog",
    artist: "Jeff Koons",
    year: "1994",
    category: "Contemporary",
    image: "https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=400&h=320&fit=crop",
    height: 270
  },
  {
    id: 40,
    title: "The Raft of the Medusa",
    artist: "Théodore Géricault",
    year: "1819",
    category: "Romanticism",
    image: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&h=300&fit=crop",
    height: 250
  },
  {
    id: 41,
    title: "Whistler's Mother",
    artist: "James McNeill Whistler",
    year: "1871",
    category: "Realism",
    image: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=320&fit=crop",
    height: 280
  },
  {
    id: 42,
    title: "The Swing",
    artist: "Jean-Honoré Fragonard",
    year: "1767",
    category: "Rococo",
    image: "https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400&h=380&fit=crop",
    height: 330
  },
  {
    id: 43,
    title: "Composition with Red Blue and Yellow",
    artist: "Piet Mondrian",
    year: "1930",
    category: "De Stijl",
    image: "https://images.unsplash.com/photo-1549490349-8643362247b5?w=400&h=400&fit=crop",
    height: 350
  },
  {
    id: 44,
    title: "The Hunters in the Snow",
    artist: "Pieter Bruegel the Elder",
    year: "1565",
    category: "Northern Renaissance",
    image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=280&fit=crop",
    height: 230
  },
  {
    id: 45,
    title: "Marilyn Diptych",
    artist: "Andy Warhol",
    year: "1962",
    category: "Pop Art",
    image: "https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=400&h=300&fit=crop",
    height: 250
  },
  {
    id: 46,
    title: "The Sleeping Gypsy",
    artist: "Henri Rousseau",
    year: "1897",
    category: "Naïve Art",
    image: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&h=320&fit=crop",
    height: 270
  },
  {
    id: 47,
    title: "Autumn Rhythm",
    artist: "Jackson Pollock",
    year: "1950",
    category: "Abstract Expressionism",
    image: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=240&fit=crop",
    height: 200
  },
  {
    id: 48,
    title: "The Blue Boy",
    artist: "Thomas Gainsborough",
    year: "1770",
    category: "Rococo",
    image: "https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400&h=460&fit=crop",
    height: 400
  },
  {
    id: 49,
    title: "Nightwatch",
    artist: "Rembrandt van Rijn",
    year: "1642",
    category: "Baroque",
    image: "https://images.unsplash.com/photo-1549490349-8643362247b5?w=400&h=340&fit=crop",
    height: 290
  },
  {
    id: 50,
    title: "The Tower of Babel",
    artist: "Pieter Bruegel the Elder",
    year: "1563",
    category: "Northern Renaissance",
    image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=360&fit=crop",
    height: 310
  }
];

export default function Gallery() {
  
  return (
    <div className="gallery-container">
      <div className="gallery-header">
        <h1 className="gallery-title">
          Curated Collection
        </h1>
        <p className="gallery-subtitle">
          Discover masterpieces from across centuries and movements
        </p>
      </div>
      
      <div className="gallery-masonry">
        {artworks.map((artwork) => (
          <div key={artwork.id} className="artwork-card">
            <img 
              src={artwork.image} 
              alt={artwork.title}
              className="artwork-image"
              style={{ height: `${artwork.height}px` }}
            />
            <div className="artwork-placard">
              <h3 className="artwork-title">
                {artwork.title}
              </h3>
              <p className="artwork-artist">
                {artwork.artist}
              </p>
              <div className="artwork-meta">
                <span className="artwork-year">{artwork.year}</span>
                <span>•</span>
                <span>{artwork.category}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="gallery-stats">
        <h3 className="gallery-stats-title">Gallery Collection</h3>
        <p className="gallery-stats-text">
          Featuring {artworks.length} carefully curated masterpieces spanning multiple centuries and artistic movements. 
          Each piece represents a significant moment in art history, from classical Renaissance works to modern abstract expressions.
        </p>
      </div>
    </div>
  )
}
