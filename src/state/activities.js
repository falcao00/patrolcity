import { player, ATTRIBUTE_NAMES } from './player.js';

// Atividades com tempo. Só uma roda por vez (no jogo todo); o timer continua mesmo trocando de tela.
// city: true -> ação da cidade (recebe o desconto de tempo da destreza).
export const PATROLS = [
  // stats: atributos ganhos ao concluir (+1 no nível 1, +2 no nível 2, +3 no nível 3); money: R$ ganhos.
  { id: 'vizinhanca', kind: 'patrol', city: true, name: 'Patrulhar Vizinhança Tranquila', short: 'Vizinhança Tranquila', xp: 15, money: 15, energy: 10, durationMs: 60_000, minLevel: 1, stats: { des: 1, car: 1 } },
  { id: 'centro', kind: 'patrol', city: true, name: 'Patrulhar Centro da Cidade', short: 'Centro da Cidade', xp: 40, money: 40, energy: 25, durationMs: 150_000, minLevel: 2, stats: { des: 2, car: 2 } },
  { id: 'becos', kind: 'patrol', city: true, name: 'Patrulhar Becos Escuros', short: 'Becos Escuros', xp: 70, money: 60, energy: 40, durationMs: 240_000, minLevel: 3, stats: { des: 3, car: 3 } },
];

// Treinos: +1 no atributo treinado (todos menos Sorte).
const TRAINING_STATS = [
  ['for', 'Força', 'ACADEMIA'],
  ['des', 'Destreza', 'CORRENDO'],
  ['con', 'Constituição', 'SACO DE PANCADA'],
  ['int', 'Inteligência', 'BIBLIOTECA'],
  ['car', 'Carisma', 'CONVERSANDO'],
];

export const TRAININGS = TRAINING_STATS.map(([key, stat, title]) => ({
  id: `treino-${key}`,
  kind: 'training',
  name: `${title} (${stat})`,
  short: title,
  xp: 0,
  energy: 10,
  durationMs: 60_000,
  minLevel: 1,
  stats: { [key]: 1 },
}));

export const KIND_LABELS = {
  patrol: { done: 'Patrulha concluída' },
  training: { done: 'Treino concluído' },
};

// Destreza acelera as ações da cidade: -5 s a cada 10 pontos (0-9: nada, 10-19: -5 s, 20-29: -10 s...).
const DEX_STEP = 10;
const SECONDS_PER_STEP = 5;
const MIN_DURATION_MS = 5_000;

export function dexReductionMs(p = player.get()) {
  return Math.floor(p.attributes.des / DEX_STEP) * SECONDS_PER_STEP * 1000;
}

// Duração real da ação para o personagem, já com o desconto da destreza.
export function durationFor(activity, p = player.get()) {
  if (!activity.city) return activity.durationMs;
  return Math.max(MIN_DURATION_MS, activity.durationMs - dexReductionMs(p));
}

// Texto das recompensas de atributo, ex.: "+1 DES, +1 CAR".
export function formatStats(stats = {}) {
  return Object.entries(stats).map(([key, value]) => `+${value} ${ATTRIBUTE_NAMES[key]}`).join(', ');
}

// m:ss, ou h:mm:ss a partir de 1 hora.
export function formatTime(ms) {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

// Retorna null se pode fazer a atividade, ou { short, message } com o motivo.
export function checkRequirements(activity, p = player.get()) {
  if (p.level < activity.minLevel) {
    return { short: `Nível ${activity.minLevel}`, message: `Requer nível ${activity.minLevel} ou maior.` };
  }
  if (p.hp <= 0) {
    return { short: 'Sem vida', message: 'Você precisa ter vida acima de 0.' };
  }
  if (p.energy < activity.energy) {
    return { short: 'Sem energia', message: `Requer ${activity.energy} de energia.` };
  }
  return null;
}

let current = null;
let timer = null;
let blocker = null;
let lastResult = null;
const listeners = new Set();

function emit() {
  for (const fn of listeners) fn();
}

function finish() {
  const { activity } = current;
  clearTimeout(timer);
  timer = null;
  current = null;
  player.changeEnergy(-activity.energy);
  if (activity.xp) player.changeXp(activity.xp);
  if (activity.money) player.changeMoney(activity.money);
  if (activity.stats) player.changeAttributes(activity.stats);
  lastResult = { activity };
  emit();
}

export const activities = {
  current: () => current,
  lastResult: () => lastResult,

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  remaining: () => (current ? Math.max(0, current.endsAt - Date.now()) : 0),

  progress() {
    if (!current) return 0;
    return Math.min(1, (Date.now() - current.startedAt) / current.durationMs);
  },

  // Outro sistema (ex.: luta) pode impedir ações: fn retorna o motivo ou null.
  setBlocker(fn) {
    blocker = fn;
  },

  // Interrompe a atividade em andamento sem dar recompensa (ex.: ao ser internado).
  cancel() {
    if (!current) return;
    clearTimeout(timer);
    timer = null;
    current = null;
    lastResult = null;
    emit();
  },

  // Conclui na hora a atividade em andamento (atalho de teste).
  completeNow() {
    if (current) finish();
  },

  // Retorna null se começou, ou { message } com o motivo de não poder.
  start(activity) {
    if (current) return { message: `Já existe uma ação em andamento: ${current.activity.name}.` };

    const busy = blocker?.();
    if (busy) return { message: busy };

    const blocked = checkRequirements(activity);
    if (blocked) return blocked;

    const now = Date.now();
    const durationMs = durationFor(activity);
    current = { activity, durationMs, startedAt: now, endsAt: now + durationMs };
    lastResult = null;
    timer = setTimeout(finish, durationMs);
    emit();
    return null;
  },
};
