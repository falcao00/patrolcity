import { player } from './player.js';

// Inventário do personagem: até 10 itens (cada unidade ocupa um espaço),
// mais os vestíveis equipados (arma e armadura), que não ocupam espaço.
export const INVENTORY_CAPACITY = 10;

export const WEAR_SLOTS = {
  weapon: { label: 'Arma' },
  armor: { label: 'Armadura' },
};

const EFFECT_LABELS = {
  hp: { name: 'vida', full: 'Vida cheia' },
  energy: { name: 'energia', full: 'Energia cheia' },
};

export const isWearable = (item) => Boolean(item.slot);

// Texto do efeito de um item, ex.: "+15 vida". Vestíveis mostram o tipo (Arma/Armadura).
export function formatEffect(item) {
  if (isWearable(item)) return WEAR_SLOTS[item.slot].label;
  return Object.entries(item.effect)
    .map(([key, value]) => `+${value} ${EFFECT_LABELS[key].name}`)
    .join(', ');
}

// Retorna null se o item pode ser usado agora, ou { short, message } com o motivo.
export function checkUse(item, p = player.get()) {
  if (isWearable(item)) return null;
  const full = Object.keys(item.effect).find((key) => p[key] >= 100);
  if (full) return { short: EFFECT_LABELS[full].full, message: `Sua ${EFFECT_LABELS[full].name} já está cheia.` };
  return null;
}

let items = [];
let equipped = { weapon: null, armor: null };
const listeners = new Set();

function emit() {
  for (const fn of listeners) fn();
}

export const inventory = {
  items: () => [...items],
  equipped: () => ({ ...equipped }),
  count: () => items.length,
  isFull: () => items.length >= INVENTORY_CAPACITY,

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  // Retorna null se guardou, ou { message } se o inventário está cheio.
  add(item) {
    if (inventory.isFull()) return { message: `Inventário cheio (${INVENTORY_CAPACITY} itens).` };
    items.push(item);
    emit();
    return null;
  },

  // Usa o item do espaço `index` (vestíveis são equipados).
  // Retorna null se deu certo, ou { message } com o motivo.
  use(index) {
    const item = items[index];
    if (!item) return { message: 'Espaço vazio.' };

    if (isWearable(item)) {
      // Equipa; se já havia algo no espaço, ele volta para o lugar deste item.
      const previous = equipped[item.slot];
      equipped[item.slot] = item;
      if (previous) items[index] = previous;
      else items.splice(index, 1);
      emit();
      return null;
    }

    const blocked = checkUse(item);
    if (blocked) return blocked;

    items.splice(index, 1);
    if (item.effect.hp) player.changeHp(item.effect.hp);
    if (item.effect.energy) player.changeEnergy(item.effect.energy);
    emit();
    return null;
  },

  // Tira o vestível do espaço e devolve ao inventário. Retorna null ou { message }.
  unequip(slot) {
    const item = equipped[slot];
    if (!item) return { message: 'Nada equipado.' };
    if (inventory.isFull()) return { message: 'Inventário cheio: não há onde guardar.' };
    equipped[slot] = null;
    items.push(item);
    emit();
    return null;
  },

  // Persistência: guarda só os ids dos itens.
  serialize() {
    return {
      items: items.map((item) => item.id),
      equipped: { weapon: equipped.weapon?.id ?? null, armor: equipped.armor?.id ?? null },
    };
  },

  // Restaura a partir dos ids, usando `catalog` (lista de todos os itens que existem).
  restore(data, catalog) {
    if (!data) return;
    const byId = new Map(catalog.map((item) => [item.id, item]));
    items = (data.items ?? []).map((id) => byId.get(id)).filter(Boolean).slice(0, INVENTORY_CAPACITY);
    equipped = {
      weapon: byId.get(data.equipped?.weapon) ?? null,
      armor: byId.get(data.equipped?.armor) ?? null,
    };
    emit();
  },

  clear() {
    items = [];
    equipped = { weapon: null, armor: null };
    emit();
  },
};
