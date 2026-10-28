// HTTP fixtures for frontend behavior only. Not real identities, scopes or database proof.
export const managerCinema = { id: "11", name: "Rạp thử nghiệm rất dài tại Thành phố Hồ Chí Minh", address: "Địa chỉ thử nghiệm", contact: "Liên hệ QA", operatingInformation: null, status: "ACTIVE" };
export const managerHall = { id: "21", cinemaId: "11", name: "Phòng thử nghiệm", capacity: 3, type: "2D", status: "ACTIVE", layoutInitialized: true };
export const managerSeats = [
  { id: "31", hallId: "21", row: "A", number: "1", type: "STANDARD", physicalStatus: "ACTIVE", guestCapacity: 1, structureEditable: false },
  { id: "32", hallId: "21", row: "A", number: "2-3", type: "COUPLE", physicalStatus: "MAINTENANCE", guestCapacity: 2, structureEditable: false },
];
export const managerShowtime = { id: "41", movieId: "51", movieTitle: "Phim thử nghiệm", cinemaId: "11", cinemaName: managerCinema.name, hallId: "21", hallName: managerHall.name, startsAt: "2035-10-28T03:00:00.123456Z", endsAt: "2035-10-28T05:00:00.123456Z", occupiedUntil: "2035-10-28T05:00:00.123456Z", bookingCutOff: "2035-10-28T03:00:00.123456Z", basePrice: "999999999999999.1234", status: "DRAFT", editable: true, transitions: ["SCHEDULED", "OPEN_FOR_BOOKING", "CANCELLED"] };
export const managerAccount = { id: "61", fullName: "Quản lý thử nghiệm", email: "manager@example.test", phone: "+84910000000", status: "ACTIVE" };
export const managerAssignment = { id: "71", userId: "61", cinemaId: "11", cinemaName: managerCinema.name, assignmentType: "MANAGER", status: "ACTIVE", effectiveAt: "2035-10-28T03:00:00Z" };
