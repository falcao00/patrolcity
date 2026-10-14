import { player } from './player.js';
import { activities } from './activities.js';
import { hospital } from './hospital.js';
import { inventory } from './inventory.js';
import { combat } from './combat.js';
import { SHOP_ARMORS, SHOP_ITEMS, SHOP_WEAPONS } from './shop.js';

// Persistência no navegador (localStorage): o jogo salva sozinho a cada mudança
// e é restaurado ao abrir a página. A foto fica numa chave separada por ser grande.
const SAVE_KEY = 'patrolcity:save';
const PHOTO_KEY = 'patrolcity:photo';
const VERSION = 1;
const SAVE_DELAY_MS = 300;

const ITEM_CATALOG = [...SHOP_ITEMS, ...SHOP_WEAPONS, ...SHOP_ARMORS];

let pending = null;
let lastPhoto;
let enabled = true;

function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.warn(`Não foi possível salvar "${key}":`, err);
    return false;
  }
}

function writeNow() {
  clearTimeout(pending);
  pending = null;
  if (!enabled) return;

  const data = {
    version: VERSION,
    savedAt: Date.now(),
    player: player.serialize(),
    inventory: inventory.serialize(),
    activity: activities.serialize(),
    hospital: hospital.serialize(),
    enemies: combat.serialize(),
  };
  write(SAVE_KEY, JSON.stringify(data));
}

function scheduleSave() {
  if (!pending) pending = setTimeout(writeNow, SAVE_DELAY_MS);
}

function savePhoto(photo) {
  if (photo === lastPhoto || !enabled) return;
  lastPhoto = photo;
  write(PHOTO_KEY, photo);
}

// Carrega o jogo salvo. Chamar ANTES de hospital.init() e da interface.
// Retorna true se havia um jogo salvo.
export function loadGame() {
  lastPhoto = read(PHOTO_KEY);
  if (lastPhoto) player.setPhoto(lastPhoto);

  let data = null;
  try {
    data = JSON.parse(read(SAVE_KEY) ?? 'null');
  } catch {
    data = null;
  }
  if (!data || data.version !== VERSION) return false;

  // Ordem importa: personagem primeiro; a atividade pode concluir na hora e dar recompensas.
  player.restore(data.player);
  inventory.restore(data.inventory, ITEM_CATALOG);
  combat.restore(data.enemies);
  hospital.restore(data.hospital);
  activities.restore(data.activity);
  return true;
}

// Passa a salvar automaticamente qualquer mudança (e ao fechar a página).
export function startAutoSave() {
  player.subscribe((p) => {
    savePhoto(p.photo);
    scheduleSave();
  });
  inventory.subscribe(scheduleSave);
  activities.subscribe(scheduleSave);
  hospital.subscribe(scheduleSave);
  combat.subscribe(scheduleSave);
  window.addEventListener('beforeunload', writeNow);
}

// Apaga o jogo salvo (para recomeçar do zero). Recarregue a página em seguida.
export function deleteSave() {
  enabled = false;
  clearTimeout(pending);
  pending = null;
  write(SAVE_KEY, null);
  write(PHOTO_KEY, null);
}
