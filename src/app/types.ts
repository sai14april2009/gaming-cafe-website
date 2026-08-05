export interface BookingStatus {
  isBooked: boolean;
  isLive?: boolean;
  endTime?: string; // ISO string for live sessions
  nextAvailableTime?: string; // ISO string for future bookings
}

export interface TimeSlot {
  hour: number; // 0-23 (24-hour format)
  isBooked: boolean;
  bookedBy?: string; // user identifier
}

export interface GamingSystem {
  id: string;
  name: string;
  type: "PC" | "Console";
  monitor?: string;
  cpu?: string;
  gpu?: string;
  ram?: string;
  storage?: string;
  console?: string;
  bookingStatus: BookingStatus;
  timeSlots: TimeSlot[]; // Available time slots for today
}
