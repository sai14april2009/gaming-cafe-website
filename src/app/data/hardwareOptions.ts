// Curated hardware suggestions for the "Add System" form autocomplete.
// Grouped by brand for scannability. The combobox allows freeform input for
// anything not listed. Keep names in the standard marketing form (what
// customers search for).

export interface HardwareGroup {
  label: string;
  items: string[];
}

export const GPU_GROUPS: HardwareGroup[] = [
  {
    label: "NVIDIA GeForce",
    items: [
      // RTX 50
      "NVIDIA RTX 5090", "NVIDIA RTX 5080", "NVIDIA RTX 5070 Ti", "NVIDIA RTX 5070", "NVIDIA RTX 5060 Ti", "NVIDIA RTX 5060", "NVIDIA RTX 5050",
      // RTX 40
      "NVIDIA RTX 4090", "NVIDIA RTX 4080 Super", "NVIDIA RTX 4080", "NVIDIA RTX 4070 Ti Super", "NVIDIA RTX 4070 Ti",
      "NVIDIA RTX 4070 Super", "NVIDIA RTX 4070", "NVIDIA RTX 4060 Ti", "NVIDIA RTX 4060",
      // RTX 30
      "NVIDIA RTX 3090 Ti", "NVIDIA RTX 3090", "NVIDIA RTX 3080 Ti", "NVIDIA RTX 3080", "NVIDIA RTX 3070 Ti",
      "NVIDIA RTX 3070", "NVIDIA RTX 3060 Ti", "NVIDIA RTX 3060", "NVIDIA RTX 3050",
      // RTX 20
      "NVIDIA RTX 2080 Ti", "NVIDIA RTX 2080 Super", "NVIDIA RTX 2070 Super", "NVIDIA RTX 2070", "NVIDIA RTX 2060 Super", "NVIDIA RTX 2060",
      // GTX 16 / 10 — still the budget-cafe workhorse across India, China, Korea
      "NVIDIA GTX 1660 Ti", "NVIDIA GTX 1660 Super", "NVIDIA GTX 1660", "NVIDIA GTX 1650 Super", "NVIDIA GTX 1650",
      "NVIDIA GTX 1080 Ti", "NVIDIA GTX 1080", "NVIDIA GTX 1070 Ti", "NVIDIA GTX 1070", "NVIDIA GTX 1060", "NVIDIA GTX 1050 Ti",
    ],
  },
  {
    label: "AMD Radeon",
    items: [
      "AMD Radeon RX 9070 XT", "AMD Radeon RX 9070", "AMD Radeon RX 9060 XT", "AMD Radeon RX 9060",
      "AMD Radeon RX 7900 XTX", "AMD Radeon RX 7900 XT", "AMD Radeon RX 7800 XT", "AMD Radeon RX 7700 XT",
      "AMD Radeon RX 7600 XT", "AMD Radeon RX 7600",
      "AMD Radeon RX 6950 XT", "AMD Radeon RX 6800 XT", "AMD Radeon RX 6750 XT", "AMD Radeon RX 6700 XT",
      "AMD Radeon RX 6650 XT", "AMD Radeon RX 6600 XT", "AMD Radeon RX 6600", "AMD Radeon RX 6500 XT",
      // Polaris — still common in budget venues
      "AMD Radeon RX 590", "AMD Radeon RX 580", "AMD Radeon RX 570",
    ],
  },
  {
    label: "Intel Arc",
    items: ["Intel Arc B580", "Intel Arc A770", "Intel Arc A750"],
  },
];

export const CPU_GROUPS: HardwareGroup[] = [
  {
    label: "Intel Core Ultra",
    items: ["Intel Core Ultra 9 285K", "Intel Core Ultra 7 265K", "Intel Core Ultra 5 245K"],
  },
  {
    label: "Intel Core (14th–12th gen)",
    items: [
      "Intel Core i9-14900K", "Intel Core i7-14700K", "Intel Core i5-14600K", "Intel Core i5-14400F", "Intel Core i5-14400",
      "Intel Core i9-13900K", "Intel Core i7-13700K", "Intel Core i5-13600K", "Intel Core i5-13400F", "Intel Core i5-13400",
      "Intel Core i9-12900K", "Intel Core i7-12700K", "Intel Core i5-12600K", "Intel Core i5-12400F", "Intel Core i5-12400",
    ],
  },
  {
    label: "Intel Core (11th–8th gen)",
    items: [
      "Intel Core i7-11700K", "Intel Core i5-11600K", "Intel Core i5-11400F",
      "Intel Core i9-10900K", "Intel Core i7-10700K", "Intel Core i5-10600K", "Intel Core i5-10400F",
      "Intel Core i7-9700K", "Intel Core i5-9600K", "Intel Core i5-9400F",
      "Intel Core i7-8700K", "Intel Core i5-8400",
    ],
  },
  {
    label: "Intel Core (7th gen & older)",
    items: [
      "Intel Core i7-7700K", "Intel Core i5-7500", "Intel Core i5-6600", "Intel Core i5-6500", "Intel Core i5-4590",
    ],
  },
  {
    label: "AMD Ryzen 9000 (Zen 5)",
    items: [
      "AMD Ryzen 9 9950X", "AMD Ryzen 9 9900X", "AMD Ryzen 7 9800X3D", "AMD Ryzen 7 9700X", "AMD Ryzen 5 9600X",
    ],
  },
  {
    label: "AMD Ryzen 7000 (Zen 4)",
    items: [
      "AMD Ryzen 9 7950X3D", "AMD Ryzen 9 7950X", "AMD Ryzen 9 7900X", "AMD Ryzen 7 7800X3D", "AMD Ryzen 7 7700X",
      "AMD Ryzen 5 7600X", "AMD Ryzen 5 7600",
    ],
  },
  {
    label: "AMD Ryzen 5000 (Zen 3)",
    items: [
      "AMD Ryzen 9 5950X", "AMD Ryzen 9 5900X", "AMD Ryzen 7 5800X3D", "AMD Ryzen 7 5800X", "AMD Ryzen 7 5700X",
      "AMD Ryzen 5 5600X", "AMD Ryzen 5 5600", "AMD Ryzen 5 5500",
    ],
  },
  {
    label: "AMD Ryzen 3000/2000 (Zen 2 / Zen+)",
    items: [
      "AMD Ryzen 9 3900X", "AMD Ryzen 7 3700X", "AMD Ryzen 5 3600X", "AMD Ryzen 5 3600", "AMD Ryzen 5 3500",
      "AMD Ryzen 7 2700X", "AMD Ryzen 5 2600",
    ],
  },
];

export const RAM_GROUPS: HardwareGroup[] = [
  {
    label: "DDR5",
    items: [
      "16GB DDR5", "16GB DDR5 5200MHz", "16GB DDR5 6000MHz",
      "32GB DDR5", "32GB DDR5 5200MHz", "32GB DDR5 6000MHz", "32GB DDR5 6400MHz",
      "64GB DDR5", "64GB DDR5 6000MHz", "128GB DDR5",
    ],
  },
  {
    label: "DDR4",
    items: [
      "8GB DDR4", "16GB DDR4", "16GB DDR4 3200MHz", "16GB DDR4 3600MHz",
      "32GB DDR4", "32GB DDR4 3200MHz", "32GB DDR4 3600MHz",
    ],
  },
];

export const CONSOLE_GROUPS: HardwareGroup[] = [
  {
    label: "PlayStation",
    items: ["PlayStation 5 Pro", "PlayStation 5", "PlayStation 5 Slim", "PlayStation 4 Pro", "PlayStation 4"],
  },
  {
    label: "Xbox",
    items: ["Xbox Series X", "Xbox Series S", "Xbox One X", "Xbox One S"],
  },
  {
    label: "Nintendo",
    items: ["Nintendo Switch 2", "Nintendo Switch OLED", "Nintendo Switch", "Nintendo Switch Lite"],
  },
  {
    label: "Handheld PC",
    items: ["Steam Deck OLED", "Steam Deck", "ASUS ROG Ally X", "ASUS ROG Ally", "Lenovo Legion Go"],
  },
];
