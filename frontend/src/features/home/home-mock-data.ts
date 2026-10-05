// Cinema and offer presentation fixtures only; Movie content comes from the public API.
export const CINEMAS = [
  { name: "Smart Cinema Landmark Tower", address: "Tầng 4, Landmark 81, Bình Thạnh, TP. Hồ Chí Minh", image: "landmark" },
  { name: "Smart Cinema West Lake", address: "Lotte Mall West Lake, tầng 4, Tây Hồ, Hà Nội", image: "west-lake" },
  { name: "Smart Cinema Riverside", address: "Crescent Promenade khu B, Quận 7, TP. Hồ Chí Minh", image: "riverside" },
];
export const VND_FORMAT = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
export const OFFERS = [
  { title: "Ưu đãi vé sinh viên", icon: "school" as const, description: "Giảm 30% vé thường từ thứ Hai đến thứ Tư khi có thẻ sinh viên hợp lệ.", validity: "Có hiệu lực đến 31/12/2025" },
  { title: "Ưu đãi cho cặp đôi", icon: "heart" as const, description: "Gói mẫu: một ghế đôi không thể tách cho hai khách cùng combo bắp rang. Chưa có ưu đãi đang áp dụng.", validity: "Chỉ là ví dụ thiết kế" },
  { title: "Ưu đãi suất chiếu sớm cuối tuần", icon: "sun" as const, description: `Đặt suất chiếu trước 12:00 vào thứ Bảy và Chủ nhật với giá cố định ${VND_FORMAT.format(95000)}.`, validity: "Ưu đãi cuối tuần" },
];
