export interface Review {
  id: string;
  userName: string;
  userAvatar: string;
  rating: number;
  date: string;
  comment: string;
  photos: string[];
}

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

export interface GamingCafe {
  id: string;
  name: string;
  location: string;
  city: string;
  rating: number;
  reviews: number;
  pricePerHour: number;
  image: string;
  images: string[];
  description: string;
  games: string[];
  hardware: {
    gpu: string[];
    cpu: string[];
    ram: string;
    monitors: string;
    consoles: string[];
    vr: boolean;
  };
  amenities: string[];
  totalStations: number;
  operatingHours: { start: number; end: number }; // 24-hour format
  userReviews: Review[];
  gamingSystems: GamingSystem[];
}

export const allGames = [
  "Valorant",
  "League of Legends",
  "CS2",
  "Dota 2",
  "Fortnite",
  "Apex Legends",
  "Overwatch 2",
  "Call of Duty: Warzone",
  "Rainbow Six Siege",
  "Rocket League",
  "Minecraft",
  "GTA V",
  "Cyberpunk 2077",
  "Elden Ring",
  "FIFA 24",
  "NBA 2K24",
  "Street Fighter 6",
  "Tekken 8",
  "The Last of Us",
  "God of War",
  "Spider-Man",
  "Horizon Forbidden West",
];

export const gameImages: Record<string, string> = {
  "Valorant": "https://images.unsplash.com/photo-1542826437-caedec254275?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcGV4JTIwbGVnZW5kcyUyMGdhbWV8ZW58MXx8fHwxNzczMDk5NzkzfDA&ixlib=rb-4.1.0&q=80&w=1080",
  "League of Legends": "https://images.unsplash.com/photo-1619017120139-fb150367d4fb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsZWFndWUlMjBvZiUyMGxlZ2VuZHMlMjBnYW1lfGVufDF8fHx8MTc3MzA0OTEyMXww&ixlib=rb-4.1.0&q=80&w=1080",
  "CS2": "https://images.unsplash.com/photo-1721594836631-1e899ef7b033?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3VudGVyJTIwc3RyaWtlJTIwY3MyJTIwZ2FtZXxlbnwxfHx8fDE3NzMxMjgwMjV8MA&ixlib=rb-4.1.0&q=80&w=1080",
  "Dota 2": "https://images.unsplash.com/photo-1624138149925-6c1dd2d60460?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkb3RhJTIwMiUyMGdhbWV8ZW58MXx8fHwxNzczMDMxOTk1fDA&ixlib=rb-4.1.0&q=80&w=1080",
  "Fortnite": "https://images.unsplash.com/photo-1583361703638-83bcdf354425?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmb3J0bml0ZSUyMGdhbWUlMjBzY3JlZW58ZW58MXx8fHwxNzczMTI4MDI1fDA&ixlib=rb-4.1.0&q=80&w=1080",
  "Apex Legends": "https://images.unsplash.com/photo-1542826437-caedec254275?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcGV4JTIwbGVnZW5kcyUyMGdhbWV8ZW58MXx8fHwxNzczMDk5NzkzfDA&ixlib=rb-4.1.0&q=80&w=1080",
  "Overwatch 2": "https://images.unsplash.com/photo-1636617920878-b780053fef18?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvdmVyd2F0Y2glMjBnYW1lJTIwc2NyZWVuc2hvdHxlbnwxfHx8fDE3NzMxMjgwMjZ8MA&ixlib=rb-4.1.0&q=80&w=1080",
  "Call of Duty: Warzone": "https://images.unsplash.com/photo-1593305841991-05c297ba4575?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYWxsJTIwb2YlMjBkdXR5JTIwd2Fyem9uZXxlbnwxfHx8fDE3NzMwOTk3OTJ8MA&ixlib=rb-4.1.0&q=80&w=1080",
  "Rainbow Six Siege": "https://images.unsplash.com/photo-1623475618918-323dfca69862?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyYWluYm93JTIwc2l4JTIwc2llZ2UlMjBnYW1lfGVufDF8fHx8MTc3MzEyODAzMXww&ixlib=rb-4.1.0&q=80&w=1080",
  "Rocket League": "https://images.unsplash.com/photo-1572425914445-addf19106140?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyb2NrZXQlMjBsZWFndWUlMjBnYW1lfGVufDF8fHx8MTc3MzA0OTEyMXww&ixlib=rb-4.1.0&q=80&w=1080",
  "Minecraft": "https://images.unsplash.com/photo-1725439507649-dd6345bf9c7f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtaW5lY3JhZnQlMjBnYW1lJTIwb2ZmaWNpYWx8ZW58MXx8fHwxNzczMTI4MDI2fDA&ixlib=rb-4.1.0&q=80&w=1080",
  "GTA V": "https://images.unsplash.com/photo-1579894097903-bf6a37819b79?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxHVEElMjA1JTIwZ2FtZSUyMHNjcmVlbnxlbnwxfHx8fDE3NzMxMjgwMzB8MA&ixlib=rb-4.1.0&q=80&w=1080",
  "Cyberpunk 2077": "https://images.unsplash.com/photo-1607896426171-99097eb60cb6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjeWJlcnB1bmslMjAyMDc3JTIwZ2FtZXxlbnwxfHx8fDE3NzMxMjgwMjd8MA&ixlib=rb-4.1.0&q=80&w=1080",
  "Elden Ring": "https://images.unsplash.com/photo-1607896426171-99097eb60cb6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjeWJlcnB1bmslMjAyMDc3JTIwZ2FtZXxlbnwxfHx8fDE3NzMxMjgwMjd8MA&ixlib=rb-4.1.0&q=80&w=1080",
  "FIFA 24": "https://images.unsplash.com/photo-1520298064646-747b5051dbb2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaWZhJTIwZ2FtZSUyMHNvY2NlcnxlbnwxfHx8fDE3NzMxMjgwMzJ8MA&ixlib=rb-4.1.0&q=80&w=1080",
  "NBA 2K24": "https://images.unsplash.com/photo-1520298064646-747b5051dbb2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaWZhJTIwZ2FtZSUyMHNvY2NlcnxlbnwxfHx8fDE3NzMxMjgwMzJ8MA&ixlib=rb-4.1.0&q=80&w=1080",
  "Street Fighter 6": "https://images.unsplash.com/photo-1606254789997-29068d6b4640?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHJlZXQlMjBmaWdodGVyJTIwZ2FtZXxlbnwxfHx8fDE3NzMxMjgwMzJ8MA&ixlib=rb-4.1.0&q=80&w=1080",
  "Tekken 8": "https://images.unsplash.com/photo-1606254789997-29068d6b4640?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHJlZXQlMjBmaWdodGVyJTIwZ2FtZXxlbnwxfHx8fDE3NzMxMjgwMzJ8MA&ixlib=rb-4.1.0&q=80&w=1080",
  "The Last of Us": "https://images.unsplash.com/photo-1666296420099-3300fa374196?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwbGF5c3RhdGlvbiUyMGdhbWV8ZW58MXx8fHwxNzczMTI4MDMzfDA&ixlib=rb-4.1.0&q=80&w=1080",
  "God of War": "https://images.unsplash.com/photo-1666296420099-3300fa374196?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwbGF5c3RhdGlvbiUyMGdhbWV8ZW58MXx8fHwxNzczMTI4MDMzfDA&ixlib=rb-4.1.0&q=80&w=1080",
  "Spider-Man": "https://images.unsplash.com/photo-1666296420099-3300fa374196?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwbGF5c3RhdGlvbiUyMGdhbWV8ZW58MXx8fHwxNzczMTI4MDMzfDA&ixlib=rb-4.1.0&q=80&w=1080",
  "Horizon Forbidden West": "https://images.unsplash.com/photo-1666296420099-3300fa374196?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwbGF5c3RhdGlvbiUyMGdhbWV8ZW58MXx8fHwxNzczMTI4MDMzfDA&ixlib=rb-4.1.0&q=80&w=1080",
  "Mario Kart": "https://images.unsplash.com/photo-1666296420099-3300fa374196?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwbGF5c3RhdGlvbiUyMGdhbWV8ZW58MXx8fHwxNzczMTI4MDMzfDA&ixlib=rb-4.1.0&q=80&w=1080",
  "Smash Bros": "https://images.unsplash.com/photo-1666296420099-3300fa374196?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwbGF5c3RhdGlvbiUyMGdhbWV8ZW58MXx8fHwxNzczMTI4MDMzfDA&ixlib=rb-4.1.0&q=80&w=1080",
};

export const hardwareOptions = {
  gpu: [
    "NVIDIA RTX 4090",
    "NVIDIA RTX 4080",
    "NVIDIA RTX 4070 Ti",
    "NVIDIA RTX 4070",
    "NVIDIA RTX 4060 Ti",
    "NVIDIA RTX 3090",
    "NVIDIA RTX 3080",
    "AMD RX 7900 XTX",
    "AMD RX 7900 XT",
    "AMD RX 6900 XT",
  ],
  cpu: [
    "Intel Core i9-14900K",
    "Intel Core i9-13900K",
    "Intel Core i7-14700K",
    "Intel Core i7-13700K",
    "AMD Ryzen 9 7950X",
    "AMD Ryzen 9 7900X",
    "AMD Ryzen 7 7800X3D",
    "AMD Ryzen 7 7700X",
  ],
  consoles: ["PS5", "PS5 Digital", "Xbox Series X", "Xbox Series S", "Nintendo Switch"],
};

// Helper function to generate time slots
const generateTimeSlots = (bookedHours: number[] = []): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  for (let hour = 10; hour <= 23; hour++) {
    slots.push({
      hour,
      isBooked: bookedHours.includes(hour),
      bookedBy: bookedHours.includes(hour) ? `user${Math.floor(Math.random() * 100)}` : undefined,
    });
  }
  return slots;
};

// Helper function to generate gaming systems
const generateGamingSystems = (
  count: number,
  cafeId: string,
  hardware: { gpu: string[]; cpu: string[]; monitors: string; consoles: string[] }
): GamingSystem[] => {
  const systems: GamingSystem[] = [];
  const pcRatio = 0.7; // 70% PCs, 30% Consoles
  const pcCount = Math.floor(count * pcRatio);
  
  for (let i = 0; i < count; i++) {
    const systemId = `${cafeId}-sys${i + 1}`;
    const isPC = i < pcCount;
    
    // Random booking pattern - about 20% booked
    const isBooked = Math.random() < 0.2;
    const isLive = isBooked && Math.random() < 0.5;
    
    let bookingStatus: BookingStatus;
    let bookedHours: number[] = [];
    
    if (isBooked) {
      if (isLive) {
        // Live session - currently in progress
        const remainingMinutes = Math.floor(Math.random() * 90) + 15; // 15-105 minutes
        bookingStatus = {
          isBooked: true,
          isLive: true,
          endTime: new Date(Date.now() + remainingMinutes * 60 * 1000).toISOString(),
        };
        bookedHours = [10, 11]; // Morning booking
      } else {
        // Advance booking
        const hoursFromNow = Math.floor(Math.random() * 6) + 2; // 2-8 hours from now
        bookingStatus = {
          isBooked: true,
          isLive: false,
          nextAvailableTime: new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString(),
        };
        // Book some afternoon slots
        const startHour = 13 + Math.floor(Math.random() * 5);
        const duration = Math.floor(Math.random() * 3) + 1;
        for (let h = startHour; h < startHour + duration && h <= 23; h++) {
          bookedHours.push(h);
        }
      }
    } else {
      bookingStatus = { isBooked: false };
    }
    
    if (isPC) {
      const gpu = hardware.gpu[Math.floor(Math.random() * hardware.gpu.length)];
      const cpu = hardware.cpu ? hardware.cpu[Math.floor(Math.random() * hardware.cpu.length)] : "Intel Core i7-14700K";
      
      systems.push({
        id: systemId,
        name: `System ${i + 1}`,
        type: "PC",
        monitor: hardware.monitors || '27" 240Hz',
        cpu,
        gpu,
        ram: gpu.includes("4090") || gpu.includes("4080") ? "64GB DDR5" : "32GB DDR5",
        storage: "2TB NVMe SSD",
        bookingStatus,
        timeSlots: generateTimeSlots(bookedHours),
      });
    } else {
      const console = hardware.consoles[Math.floor(Math.random() * hardware.consoles.length)];
      systems.push({
        id: systemId,
        name: `System ${i + 1}`,
        type: "Console",
        console,
        bookingStatus,
        timeSlots: generateTimeSlots(bookedHours),
      });
    }
  }
  
  return systems;
};

export const gamingCafes: GamingCafe[] = [
  {
    id: "1",
    name: "Pixel Paradise Gaming Lounge",
    location: "Downtown District",
    city: "San Francisco",
    rating: 4.8,
    reviews: 234,
    pricePerHour: 8,
    image: "https://images.unsplash.com/photo-1758410473735-c76baff30a79?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnYW1pbmclMjBjYWZlJTIwaW50ZXJpb3IlMjBjb21wdXRlcnN8ZW58MXx8fHwxNzcyOTY0ODE5fDA&ixlib=rb-4.1.0&q=80&w=1080",
    images: [
      "https://images.unsplash.com/photo-1758410473735-c76baff30a79?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnYW1pbmclMjBjYWZlJTIwaW50ZXJpb3IlMjBjb21wdXRlcnN8ZW58MXx8fHwxNzcyOTY0ODE5fDA&ixlib=rb-4.1.0&q=80&w=1080",
      "https://images.unsplash.com/photo-1726442116417-de02f3116eed?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlc3BvcnRzJTIwZ2FtaW5nJTIwcm9vbSUyMHNldHVwfGVufDF8fHx8MTc3MzAzMDg5OHww&ixlib=rb-4.1.0&q=80&w=1080",
      "https://images.unsplash.com/photo-1704871132546-d1d3b845ae65?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwYyUyMGdhbWluZyUyMHNldHVwJTIwcmdifGVufDF8fHx8MTc3MzAzMDg5OXww&ixlib=rb-4.1.0&q=80&w=1080",
    ],
    description: "Premium gaming experience with top-tier hardware and a vibrant atmosphere. Perfect for competitive gaming and casual hangouts.",
    games: ["Valorant", "League of Legends", "CS2", "Dota 2", "Fortnite", "Apex Legends", "Overwatch 2", "Minecraft", "GTA V"],
    hardware: {
      gpu: ["NVIDIA RTX 4090", "NVIDIA RTX 4080"],
      cpu: ["Intel Core i9-14900K", "AMD Ryzen 9 7950X"],
      ram: "64GB DDR5",
      monitors: '27" 240Hz',
      consoles: ["PS5", "Xbox Series X"],
      vr: true,
    },
    amenities: ["High-speed WiFi", "Food & Drinks", "Private Rooms", "Tournament Area", "Streaming Setup"],
    totalStations: 50,
    operatingHours: { start: 0, end: 23 }, // Open 24/7
    userReviews: [
      {
        id: "r1",
        userName: "Alex Chen",
        userAvatar: "https://images.unsplash.com/photo-1572955995017-e769428eb228?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYXBweSUyMGdhbWVyJTIwcG9ydHJhaXR8ZW58MXx8fHwxNzczMDMxMzQ3fDA&ixlib=rb-4.1.0&q=80&w=1080",
        rating: 5,
        date: "2026-03-05",
        comment: "Absolutely amazing experience! The RTX 4090 setups are incredible. Played Cyberpunk 2077 at max settings and it was buttery smooth. The staff is super friendly and the atmosphere is perfect for long gaming sessions.",
        photos: [
          "https://images.unsplash.com/photo-1704871132546-d1d3b845ae65?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwYyUyMGdhbWluZyUyMHNldHVwJTIwcmdifGVufDF8fHx8MTc3MzAzMDg5OXww&ixlib=rb-4.1.0&q=80&w=1080",
          "https://images.unsplash.com/photo-1576074209407-04b529a8ca81?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnYW1lciUyMGhlYWRzZXQlMjBzZXR1cCUyMHBob3RvfGVufDF8fHx8MTc3MzAzMTM0OXww&ixlib=rb-4.1.0&q=80&w=1080",
        ],
      },
      {
        id: "r2",
        userName: "Sarah Martinez",
        userAvatar: "https://images.unsplash.com/photo-1613441106927-070615c4bf42?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21hbiUyMHBsYXlpbmclMjB2aWRlb2dhbWVzfGVufDF8fHx8MTc3MzAzMTM0N3ww&ixlib=rb-4.1.0&q=80&w=1080",
        rating: 5,
        date: "2026-02-28",
        comment: "Best gaming cafe in SF! Clean facilities, top-notch equipment, and great food options. The private rooms are perfect for our gaming squad. Will definitely be coming back!",
        photos: [
          "https://images.unsplash.com/photo-1758410473735-c76baff30a79?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnYW1pbmclMjBjYWZlJTIwaW50ZXJpb3IlMjBjb21wdXRlcnN8ZW58MXx8fHwxNzcyOTY0ODE5fDA&ixlib=rb-4.1.0&q=80&w=1080",
        ],
      },
      {
        id: "r3",
        userName: "Mike Johnson",
        userAvatar: "https://images.unsplash.com/photo-1759701546655-d90ec831aa52?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMG1hbiUyMGVzcG9ydHMlMjBwbGF5ZXJ8ZW58MXx8fHwxNzczMDMxMzQ5fDA&ixlib=rb-4.1.0&q=80&w=1080",
        rating: 4,
        date: "2026-02-20",
        comment: "Great place for competitive gaming. The 240Hz monitors make a huge difference in Valorant. Only minor complaint is it can get a bit crowded on weekends.",
        photos: [],
      },
    ],
    gamingSystems: generateGamingSystems(50, "cafe1", {
      gpu: ["NVIDIA RTX 4090", "NVIDIA RTX 4080"],
      cpu: ["Intel Core i9-14900K", "AMD Ryzen 9 7950X"],
      monitors: '27" 240Hz',
      consoles: ["PS5", "Xbox Series X"],
    }),
  },
  {
    id: "2",
    name: "Neon Nexus eSports Arena",
    location: "Tech Hub",
    city: "Seattle",
    rating: 4.9,
    reviews: 456,
    pricePerHour: 10,
    image: "https://images.unsplash.com/photo-1726442116417-de02f3116eed?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlc3BvcnRzJTIwZ2FtaW5nJTIwcm9vbSUyMHNldHVwfGVufDF8fHx8MTc3MzAzMDg5OHww&ixlib=rb-4.1.0&q=80&w=1080",
    images: [
      "https://images.unsplash.com/photo-1726442116417-de02f3116eed?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlc3BvcnRzJTIwZ2FtaW5nJTIwcm9vbSUyMHNldHVwfGVufDF8fHx8MTc3MzAzMDg5OHww&ixlib=rb-4.1.0&q=80&w=1080",
      "https://images.unsplash.com/photo-1632017734927-48988a0efae7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnYW1pbmclMjB0b3VybmFtZW50JTIwdmVudWV8ZW58MXx8fHwxNzczMDMwOTAwfDA&ixlib=rb-4.1.0&q=80&w=1080",
    ],
    description: "State-of-the-art eSports facility designed for competitive gamers. Host tournaments and practice with the best equipment.",
    games: ["CS2", "Valorant", "League of Legends", "Dota 2", "Rainbow Six Siege", "Apex Legends", "Rocket League", "Overwatch 2"],
    hardware: {
      gpu: ["NVIDIA RTX 4090", "NVIDIA RTX 4080", "NVIDIA RTX 4070 Ti"],
      cpu: ["Intel Core i9-14900K", "Intel Core i9-13900K"],
      ram: "64GB DDR5",
      monitors: '27" 360Hz',
      consoles: ["PS5"],
      vr: false,
    },
    amenities: ["High-speed WiFi", "Food & Drinks", "Tournament Area", "Streaming Setup", "Coaching Available"],
    totalStations: 80,
    operatingHours: { start: 10, end: 23 }, // 10 AM - 11 PM
    userReviews: [
      {
        id: "r4",
        userName: "Emma Thompson",
        userAvatar: "https://images.unsplash.com/photo-1613441106927-070615c4bf42?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21hbiUyMHBsYXlpbmclMjB2aWRlb2dhbWVzfGVufDF8fHx8MTc3MzAzMTM0N3ww&ixlib=rb-4.1.0&q=80&w=1080",
        rating: 5,
        date: "2026-03-01",
        comment: "Perfect for esports practice! The 360Hz monitors and tournament-grade setups are exactly what we needed for our team. Highly recommend!",
        photos: [
          "https://images.unsplash.com/photo-1632017734927-48988a0efae7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnYW1pbmclMjB0b3VybmFtZW50JTIwdmVudWV8ZW58MXx8fHwxNzczMDMwOTAwfDA&ixlib=rb-4.1.0&q=80&w=1080",
        ],
      },
    ],
    gamingSystems: generateGamingSystems(80, "cafe2", {
      gpu: ["NVIDIA RTX 4090", "NVIDIA RTX 4080", "NVIDIA RTX 4070 Ti"],
      cpu: ["Intel Core i9-14900K", "Intel Core i9-13900K"],
      monitors: '27" 360Hz',
      consoles: ["PS5"],
    }),
  },
  {
    id: "3",
    name: "Console Kingdom",
    location: "Entertainment Plaza",
    city: "Los Angeles",
    rating: 4.7,
    reviews: 189,
    pricePerHour: 7,
    image: "https://images.unsplash.com/photo-1665592512676-840f7b669aeb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwbGF5c3RhdGlvbiUyMGdhbWluZyUyMHJvb218ZW58MXx8fHwxNzczMDMwOTAwfDA&ixlib=rb-4.1.0&q=80&w=1080",
    images: [
      "https://images.unsplash.com/photo-1665592512676-840f7b669aeb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwbGF5c3RhdGlvbiUyMGdhbWluZyUyMHJvb218ZW58MXx8fHwxNzczMDMwOTAwfDA&ixlib=rb-4.1.0&q=80&w=1080",
      "https://images.unsplash.com/photo-1762219214303-7e198a76d18e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnYW1pbmclMjBsb3VuZ2UlMjBuZW9ufGVufDF8fHx8MTc3MzAzMDg5OXww&ixlib=rb-4.1.0&q=80&w=1080",
    ],
    description: "Console gaming paradise with the latest PlayStation, Xbox, and Nintendo games. Great for couch co-op and exclusive titles.",
    games: ["FIFA 24", "NBA 2K24", "The Last of Us", "God of War", "Spider-Man", "Horizon Forbidden West", "Street Fighter 6", "Tekken 8"],
    hardware: {
      gpu: ["NVIDIA RTX 4070", "NVIDIA RTX 3080"],
      cpu: ["AMD Ryzen 7 7800X3D", "AMD Ryzen 7 7700X"],
      ram: "32GB DDR5",
      monitors: '32" 4K',
      consoles: ["PS5", "PS5 Digital", "Xbox Series X", "Xbox Series S", "Nintendo Switch"],
      vr: true,
    },
    amenities: ["High-speed WiFi", "Food & Drinks", "Private Rooms", "Party Rooms"],
    totalStations: 40,
    operatingHours: { start: 12, end: 23 }, // 12 PM - 11 PM
    userReviews: [],
    gamingSystems: generateGamingSystems(40, "cafe3", {
      gpu: ["NVIDIA RTX 4070", "NVIDIA RTX 3080"],
      cpu: ["AMD Ryzen 7 7800X3D", "AMD Ryzen 7 7700X"],
      monitors: '32" 4K',
      consoles: ["PS5", "PS5 Digital", "Xbox Series X", "Xbox Series S", "Nintendo Switch"],
    }),
  },
  {
    id: "4",
    name: "RGB Realm Gaming Hub",
    location: "University District",
    city: "Austin",
    rating: 4.6,
    reviews: 312,
    pricePerHour: 6,
    image: "https://images.unsplash.com/photo-1704871132546-d1d3b845ae65?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwYyUyMGdhbWluZyUyMHNldHVwJTIwcmdifGVufDF8fHx8MTc3MzAzMDg5OXww&ixlib=rb-4.1.0&q=80&w=1080",
    images: [
      "https://images.unsplash.com/photo-1704871132546-d1d3b845ae65?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwYyUyMGdhbWluZyUyMHNldHVwJTIwcmdifGVufDF8fHx8MTc3MzAzMDg5OXww&ixlib=rb-4.1.0&q=80&w=1080",
    ],
    description: "Student-friendly gaming cafe with competitive prices and a social atmosphere. Perfect for long gaming sessions with friends.",
    games: ["League of Legends", "Valorant", "Minecraft", "GTA V", "Fortnite", "Rocket League", "CS2"],
    hardware: {
      gpu: ["NVIDIA RTX 4070 Ti", "NVIDIA RTX 4070", "NVIDIA RTX 4060 Ti"],
      cpu: ["Intel Core i7-14700K", "Intel Core i7-13700K"],
      ram: "32GB DDR5",
      monitors: '24" 165Hz',
      consoles: ["PS5 Digital", "Xbox Series S"],
      vr: false,
    },
    amenities: ["High-speed WiFi", "Food & Drinks", "Study Area", "24/7 Access"],
    totalStations: 60,
    operatingHours: { start: 10, end: 22 }, // 10 AM - 10 PM
    userReviews: [],
    gamingSystems: generateGamingSystems(60, "cafe4", {
      gpu: ["NVIDIA RTX 4070 Ti", "NVIDIA RTX 4070", "NVIDIA RTX 4060 Ti"],
      cpu: ["Intel Core i7-14700K", "Intel Core i7-13700K"],
      monitors: '24" 165Hz',
      consoles: ["PS5 Digital", "Xbox Series S"],
    }),
  },
  {
    id: "5",
    name: "Elite Esports Lounge",
    location: "Financial District",
    city: "New York",
    rating: 4.9,
    reviews: 578,
    pricePerHour: 12,
    image: "https://images.unsplash.com/photo-1762219214303-7e198a76d18e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnYW1pbmclMjBsb3VuZ2UlMjBuZW9ufGVufDF8fHx8MTc3MzAzMDg5OXww&ixlib=rb-4.1.0&q=80&w=1080",
    images: [
      "https://images.unsplash.com/photo-1762219214303-7e198a76d18e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnYW1pbmclMjBsb3VuZ2UlMjBuZW9ufGVufDF8fHx8MTc3MzAzMDg5OXww&ixlib=rb-4.1.0&q=80&w=1080",
    ],
    description: "Luxury gaming experience with premium amenities and the latest hardware. VIP gaming at its finest.",
    games: ["Valorant", "CS2", "League of Legends", "Apex Legends", "Call of Duty: Warzone"],
    hardware: {
      gpu: ["NVIDIA RTX 4090"],
      cpu: ["Intel Core i9-14900K", "AMD Ryzen 9 7950X"],
      ram: "64GB DDR5",
      monitors: '27" 360Hz',
      consoles: ["PS5"],
      vr: true,
    },
    amenities: ["High-speed WiFi", "Premium Food & Drinks", "Private Rooms", "Concierge Service", "Streaming Setup"],
    totalStations: 30,
    operatingHours: { start: 14, end: 23 }, // 2 PM - 11 PM
    userReviews: [],
    gamingSystems: generateGamingSystems(30, "cafe5", {
      gpu: ["NVIDIA RTX 4090"],
      cpu: ["Intel Core i9-14900K", "AMD Ryzen 9 7950X"],
      monitors: '27" 360Hz',
      consoles: ["PS5"],
    }),
  },
  {
    id: "6",
    name: "Game Haven Family Center",
    location: "Suburban Center",
    city: "Chicago",
    rating: 4.5,
    reviews: 267,
    pricePerHour: 5,
    image: "https://images.unsplash.com/photo-1758410473735-c76baff30a79?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnYW1pbmclMjBjYWZlJTIwaW50ZXJpb3IlMjBjb21wdXRlcnN8ZW58MXx8fHwxNzcyOTY0ODE5fDA&ixlib=rb-4.1.0&q=80&w=1080",
    images: [
      "https://images.unsplash.com/photo-1758410473735-c76baff30a79?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnYW1pbmclMjBjYWZlJTIwaW50ZXJpb3IlMjBjb21wdXRlcnN8ZW58MXx8fHwxNzcyOTY0ODE5fDA&ixlib=rb-4.1.0&q=80&w=1080",
    ],
    description: "Family-friendly gaming center with a variety of games for all ages. Perfect for birthday parties and family outings.",
    games: ["Minecraft", "FIFA 24", "Mario Kart", "Smash Bros", "Rocket League", "Fortnite"],
    hardware: {
      gpu: ["NVIDIA RTX 4060 Ti", "NVIDIA RTX 3080"],
      cpu: ["Intel Core i7-13700K", "AMD Ryzen 7 7700X"],
      ram: "32GB DDR5",
      monitors: '24" 144Hz',
      consoles: ["PS5", "Xbox Series X", "Nintendo Switch"],
      vr: false,
    },
    amenities: ["High-speed WiFi", "Food & Drinks", "Birthday Parties", "Kids Area"],
    totalStations: 45,
    operatingHours: { start: 10, end: 23 }, // 10 AM - 11 PM
    userReviews: [],
    gamingSystems: generateGamingSystems(45, "cafe6", {
      gpu: ["NVIDIA RTX 4060 Ti", "NVIDIA RTX 3080"],
      cpu: ["Intel Core i7-13700K", "AMD Ryzen 7 7700X"],
      monitors: '24" 144Hz',
      consoles: ["PS5", "Xbox Series X", "Nintendo Switch"],
    }),
  },
];
