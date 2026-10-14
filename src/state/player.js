// Estado do personagem. A sidebar e as cenas do Phaser leem e alteram por aqui.
const MIN = 0;
const MAX = 100;

const clamp = (value) => Math.max(MIN, Math.min(MAX, Math.round(value)));

// XP necessária para sair de um nível: 100, 200, 400, 800...
export const xpToNextLevel = (level) => 100 * 2 ** (level - 1);

const initialStats = () => ({
  level: 1,
  hp: 100,
  energy: 100,
  xp: 0,
  xpToNext: xpToNextLevel(1),
  reputation: 0,
  money: 0,
  attributes: { for: 0, des: 0, con: 0, int: 0, car: 0, sor: 0 },
});

export const ATTRIBUTE_NAMES = {
  for: 'FOR', des: 'DES', con: 'CON', int: 'INT', car: 'CAR', sor: 'SOR',
};

const state = {
  name: 'Patrulheiro',
  ...initialStats(),
  photo: null,
};

const listeners = new Set();

const snapshot = () => ({ ...state, attributes: { ...state.attributes } });

function emit() {
  for (const fn of listeners) fn(snapshot());
}

export const player = {
  get: snapshot,

  subscribe(fn) {
    listeners.add(fn);
    fn(snapshot());
    return () => listeners.delete(fn);
  },

  setHp(value) { state.hp = clamp(value); emit(); },
  setEnergy(value) { state.energy = clamp(value); emit(); },
  changeHp(delta) { this.setHp(state.hp + delta); },
  changeEnergy(delta) { this.setEnergy(state.energy + delta); },
  // Ao completar a barra, sobe de nível e o que sobrar passa para o próximo.
  setXp(value) {
    let xp = Math.max(0, Math.round(value));
    while (xp >= state.xpToNext) {
      xp -= state.xpToNext;
      state.level += 1;
      state.xpToNext = xpToNextLevel(state.level);
    }
    state.xp = xp;
    emit();
  },
  changeXp(delta) { this.setXp(state.xp + delta); },

  setReputation(value) { state.reputation = Math.round(value); emit(); },
  changeReputation(delta) { this.setReputation(state.reputation + delta); },
  setMoney(value) { state.money = Math.max(0, Math.round(value)); emit(); },
  changeMoney(delta) { this.setMoney(state.money + delta); },

  // Soma valores aos atributos, ex.: changeAttributes({ des: 1, car: 1 }).
  changeAttributes(deltas) {
    for (const [key, delta] of Object.entries(deltas)) {
      state.attributes[key] = Math.max(0, state.attributes[key] + delta);
    }
    emit();
  },

  // Volta nível, barras, reputação, dinheiro e atributos ao início. Nome e foto ficam.
  reset() { Object.assign(state, initialStats()); emit(); },

  setName(name) { state.name = name; emit(); },
  setLevel(level) {
    state.level = level;
    state.xpToNext = xpToNextLevel(level);
    state.xp = Math.min(state.xp, state.xpToNext - 1);
    emit();
  },
  setPhoto(dataUrl) { state.photo = dataUrl; emit(); },

  // Persistência: dados a salvar (a foto é salva à parte, em save.js).
  serialize() {
    const { photo, ...data } = snapshot();
    return data;
  },

  // Restaura dados salvos, ignorando campos ausentes ou inválidos.
  restore(data) {
    if (!data) return;
    const num = (v) => typeof v === 'number' && Number.isFinite(v);
    if (typeof data.name === 'string') state.name = data.name;
    if (num(data.level) && data.level >= 1) state.level = Math.floor(data.level);
    state.xpToNext = xpToNextLevel(state.level);
    if (num(data.xp)) state.xp = Math.max(0, Math.min(state.xpToNext - 1, Math.round(data.xp)));
    if (num(data.hp)) state.hp = clamp(data.hp);
    if (num(data.energy)) state.energy = clamp(data.energy);
    if (num(data.reputation)) state.reputation = Math.round(data.reputation);
    if (num(data.money)) state.money = Math.max(0, Math.round(data.money));
    for (const key of Object.keys(state.attributes)) {
      const value = data.attributes?.[key];
      if (num(value)) state.attributes[key] = Math.max(0, Math.round(value));
    }
    emit();
  },
};
