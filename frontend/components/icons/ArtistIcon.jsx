export default function ArtistIcon({ className = "w-5 h-5", color = "currentColor" }) {
  return (
    <svg 
      className={className} 
      fill="none" 
      stroke={color} 
      viewBox="0 0 24 24" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM7 3V1m0 18v2m8-10a4 4 0 00-4-4H9m12 4a4 4 0 01-4 4h-2m4-4a4 4 0 00-4-4h-2m4 4v6a2 2 0 01-2 2h-4a2 2 0 01-2-2v-6" 
      />
    </svg>
  );
}
