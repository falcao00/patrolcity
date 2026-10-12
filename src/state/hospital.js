import { player } from './player.js';
import { activities } from './activities.js';

// Ao chegar a 0 de vida o personagem é internado; recebe alta com vida cheia depois de 8 horas.
export const RECOVERY_MS = 8 * 60 * 60 * 1000;

// Tratamento pago: cura vida na hora. Só para quem NÃO está internado —
// internado (vida 0) o personagem fica as 8 horas inteiras.
export const TREATMENT_COST = 100;
export const TREATMENT_HEAL = 50;

let stay = null;
let timer = null;
const listeners = new Set();

function emit() {
  for (const fn of listeners) fn();
}

function admit() {
  activities.cancel();
  const now = Date.now();
  stay = { startedAt: now, endsAt: now + RECOVERY_MS };
  timer = setTimeout(() => discharge(), RECOVERY_MS);
  emit();
}

function discharge() {
  clearTimeout(timer);
  timer = null;
  stay = null;
  player.setHp(100);
  emit();
}

export const hospital = {
  isAdmitted: () => stay !== null,
  remaining: () => (stay ? Math.max(0, stay.endsAt - Date.now()) : 0),
  progress: () => (stay ? Math.min(1, (Date.now() - stay.startedAt) / RECOVERY_MS) : 0),

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  // Retorna null se o tratamento foi feito, ou { message } com o motivo de não poder.
  treat() {
    const p = player.get();
    if (stay) return { message: 'Internado não pode fazer tratamento. Aguarde a alta.' };
    if (p.hp >= 100) return { message: 'Sua vida já está cheia.' };
    if (p.money < TREATMENT_COST) return { message: `Você precisa de R$ ${TREATMENT_COST}.` };

    player.changeMoney(-TREATMENT_COST);
    player.setHp(Math.min(100, p.hp + TREATMENT_HEAL));
    return null;
  },

  // Alta imediata (atalho de teste).
  dischargeNow() {
    if (stay) discharge();
  },

  // Passa a internar o personagem sempre que a vida chegar a 0.
  init() {
    player.subscribe((p) => {
      if (p.hp <= 0 && !stay) admit();
    });
  },
};
