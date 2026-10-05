export const VALENTINE_STREET_CONFIG = {
  zStart: -60,
  zEnd: 60,
  streetWidth: 8.0,
  boardwalkWidth: 2.0,
  elevationProfile: (z: number) => (z <= 20 ? 0 : ((z - 20) / 40) * 4.0)
};

export const VALENTINE_BUILDINGS = [
  { id: "saloon", name: "Smithfield's Saloon", pos: [9.0, -20], size: [10, 8, 6], rotY: -Math.PI / 2 },
  { id: "store", name: "Valentine General Store", pos: [9.0, 0], size: [8, 7, 5], rotY: -Math.PI / 2 },
  { id: "gunsmith", name: "Gunsmith", pos: [9.0, 15], size: [7, 6, 5], rotY: -Math.PI / 2 },
  { id: "sheriff", name: "Sheriff's Office", pos: [-9.0, -15], size: [8, 6, 5], rotY: Math.PI / 2 },
  { id: "doctor", name: "Doctor's Clinic", pos: [-9.0, 0], size: [7, 6, 5], rotY: Math.PI / 2 },
  { id: "stable", name: "Livery Stable", pos: [-10.0, 20], size: [12, 10, 7], rotY: Math.PI / 2 },
  { id: "church", name: "Church of Valentine", pos: [0.0, 50], size: [8, 14, 8], rotY: 0 },
  { id: "cemetery", name: "Cemetery", pos: [10.0, 50], size: [12, 12, 0], rotY: 0 }
];
