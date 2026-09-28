// Cinema and offer presentation fixtures only; Movie content comes from the public API.
export const CINEMAS = [
  { name: "Smart Cinema Landmark Tower", address: "Level 4, Landmark 81, Binh Thanh, HCMC", image: "landmark" },
  { name: "Smart Cinema West Lake", address: "Lotte Mall West Lake, 4th Floor, Tay Ho, Hanoi", image: "west-lake" },
  { name: "Smart Cinema Riverside", address: "Crescent Promenade Wing B, District 7, HCMC", image: "riverside" },
];
export const VND_FORMAT = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
export const OFFERS = [
  { title: "Student Ticket Offer", icon: "school" as const, description: "Enjoy 30% off standard tickets every Monday through Wednesday with valid student ID.", validity: "Valid until Dec 31, 2025" },
  { title: "Couples Night Promotion", icon: "heart" as const, description: "Pair two Couple Lounger seats with complimentary gourmet popcorn combo on Friday evenings.", validity: "Every Friday after 18:00" },
  { title: "Early Bird Weekend", icon: "sun" as const, description: `Book any screening before 12:00 PM on Saturdays and Sundays for flat ${VND_FORMAT.format(95000)} pricing.`, validity: "Ongoing Weekend Offer" },
];
