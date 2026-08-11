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
}
