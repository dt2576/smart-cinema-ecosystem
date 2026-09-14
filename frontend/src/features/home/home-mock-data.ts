import type { Movie } from "@/features/movie/movie.types";

export const HOME_HERO_BACKDROP_URL = "/images/home/dune-part-two-hero.jpg";

// Presentation fixtures from Stitch; not live listings or pricing rules.
export const NOW_SHOWING: Movie[] = [
  { id: "dune", title: "Dune: Part Two", posterUrl: "/images/movies/dune-part-two.jpg", ageRating: "T16", metadata: "2h 46m • Sci-Fi • Adventure" },
  { id: "oppenheimer", title: "Oppenheimer", posterUrl: "/images/movies/oppenheimer.jpg", ageRating: "T18", metadata: "3h 00m • Biography • Drama" },
  { id: "civil-war", title: "Civil War", posterUrl: "/images/movies/civil-war.jpg", ageRating: "T18", metadata: "1h 49m • Action • Thriller" },
  { id: "past-lives", title: "Past Lives", posterUrl: "/images/movies/past-lives.jpg", ageRating: "T13", metadata: "1h 45m • Romance • Drama" },
  { id: "spider-verse", title: "Spider-Man: Across the Spider-Verse", posterUrl: "/images/movies/spider-man-across-the-spider-verse.jpg", ageRating: "P", metadata: "2h 20m • Animation • Action" },
];
export const COMING_SOON: Movie[] = [
  { id: "furiosa", title: "Furiosa: A Mad Max Saga", posterUrl: "/images/movies/furiosa.jpg", ageRating: "Expected T16", metadata: "", opening: "Nov 15, 2025" },
  { id: "gladiator", title: "Gladiator II", posterUrl: "/images/movies/gladiator-ii.jpg", ageRating: "Expected T18", metadata: "", opening: "Nov 22, 2025" },
  { id: "interstellar", title: "Interstellar 10th Anniversary", posterUrl: "/images/movies/interstellar-10th-anniversary.jpg", ageRating: "T13", metadata: "", opening: "Dec 05, 2025" },
  { id: "avatar", title: "Avatar: Fire and Ash", posterUrl: "/images/movies/avatar-fire-and-ash.jpg", ageRating: "Expected T13", metadata: "", opening: "Dec 19, 2025" },
];
export const CINEMAS = [
  { name: "Smart Cinema Landmark Tower", address: "Level 4, Landmark 81, Binh Thanh, HCMC", image: "landmark" },
  { name: "Smart Cinema West Lake", address: "Lotte Mall West Lake, 4th Floor, Tay Ho, Hanoi", image: "west-lake" },
  { name: "Smart Cinema Riverside", address: "Crescent Promenade Wing B, District 7, HCMC", image: "riverside" },
];
export const DUNE_SYNOPSIS = "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family, facing a choice between love and the fate of the universe.";
export const VND_FORMAT = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
export const OFFERS = [
  { title: "Student Ticket Offer", icon: "school" as const, description: "Enjoy 30% off standard tickets every Monday through Wednesday with valid student ID.", validity: "Valid until Dec 31, 2025" },
  { title: "Couples Night Promotion", icon: "heart" as const, description: "Pair two Couple Lounger seats with complimentary gourmet popcorn combo on Friday evenings.", validity: "Every Friday after 18:00" },
  { title: "Early Bird Weekend", icon: "sun" as const, description: `Book any screening before 12:00 PM on Saturdays and Sundays for flat ${VND_FORMAT.format(95000)} pricing.`, validity: "Ongoing Weekend Offer" },
];
