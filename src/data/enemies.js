// Todo inimigo começa com esta vida.
export const ENEMY_MAX_HP = 100;

// Oponentes das lutas. stats: null enquanto não definidos.
export const ENEMIES = [
  {
    id: 'jack',
    name: "Jack o' Lanter",
    stats: { for: 3, des: 5, con: 10, int: 2, car: 0, sor: 0 },
  },
  { id: 'motoserra', name: 'O Maluco da MotoSerra', stats: null },
  { id: 'imparavel', name: 'O imparavel', stats: null },
].map((enemy) => ({ hp: ENEMY_MAX_HP, ...enemy }));
