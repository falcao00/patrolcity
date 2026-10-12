import { player } from './player.js';
import { inventory, INVENTORY_CAPACITY } from './inventory.js';

// Itens da loja: ao comprar, vão para o inventário para serem usados depois.
// effect: o que o item restaura (hp = vida, energy = energia), sempre até no máximo 100.
export const SHOP_ITEMS = [
  { id: 'energetico', name: 'Energético', price: 20, effect: { energy: 20 } },
  { id: 'pizza', name: 'Pizza', price: 15, effect: { hp: 15 } },
];

// Armas e armaduras: vão para o inventário e podem ser equipadas.
// Ainda sem efeito no jogo (bônus a definir).
export const SHOP_WEAPONS = [
  { id: 'espada-curta', name: 'Espada curta', price: 10, slot: 'weapon' },
  { id: 'espada-longa', name: 'Espada longa', price: 50, slot: 'weapon' },
  { id: 'espada-duas-maos', name: 'Espada de duas mãos', price: 100, slot: 'weapon' },
];

export const SHOP_ARMORS = [
  { id: 'armadura-simples', name: 'Armadura simples', price: 10, slot: 'armor' },
  { id: 'armadura-couro', name: 'Armadura de couro', price: 50, slot: 'armor' },
  { id: 'armadura-cota-malha', name: 'Armadura de cota de malha', price: 100, slot: 'armor' },
];

// Retorna null se pode comprar, ou { short, message } com o motivo.
export function checkPurchase(item, p = player.get()) {
  if (inventory.isFull()) return { short: 'Inventário cheio', message: `Inventário cheio (${INVENTORY_CAPACITY} itens).` };
  if (p.money < item.price) return { short: 'Sem dinheiro', message: `Você precisa de R$ ${item.price}.` };
  return null;
}

export const shop = {
  // Retorna null se comprou, ou { message } com o motivo de não poder.
  buy(item) {
    const blocked = checkPurchase(item);
    if (blocked) return blocked;

    player.changeMoney(-item.price);
    inventory.add(item);
    return null;
  },
};
