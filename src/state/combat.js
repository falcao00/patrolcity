import { player } from './player.js';
import { activities } from './activities.js';

// Regras do combate:
// - Ataque = 1d20 + FOR do atacante; Defesa = 1d20 + DES do defensor.
// - Ataque >= Defesa: acerta. Dano = 1d10 - (CON do defensor / 10, arredondado para baixo), nunca negativo.
// - Defesa > Ataque: esquiva, nada acontece.
// - Cada rodada: jogador ataca, depois o inimigo. Até 5 rodadas ou até alguém chegar a 0 de vida.
// - Cada luta custa energia. A vida perdida pelo inimigo é mantida entre as lutas;
//   ao chegar a 0 ele fica indisponível por 8 horas e depois volta com vida cheia.
export const ROUNDS = 5;
export const STEP_MS = 900;
export const FIGHT_ENERGY = 20;
export const ENEMY_RECOVERY_MS = 8 * 60 * 60 * 1000;

export const rollDie = (sides, rng = Math.random) => 1 + Math.floor(rng() * sides);

// Resolve um ataque (função pura; rng pode ser trocado nos testes).
export function resolveAttack(attacker, defender, rng = Math.random) {
  const atkDie = rollDie(20, rng);
  const defDie = rollDie(20, rng);
  const attack = atkDie + attacker.for;
  const defense = defDie + defender.des;
  const reduction = Math.floor(defender.con / 10);
  const hit = attack >= defense;
  const dmgDie = hit ? rollDie(10, rng) : null;
  const damage = hit ? Math.max(0, dmgDie - reduction) : 0;
  return { atkDie, defDie, attack, defense, hit, dmgDie, reduction, damage };
}

let fight = null;
let timer = null;
const listeners = new Set();

// Vida atual e período de indisponibilidade de cada inimigo (por id).
const enemyState = new Map();

function stateOf(enemy) {
  let st = enemyState.get(enemy.id);
  if (!st) {
    st = { hp: enemy.hp, downUntil: null };
    enemyState.set(enemy.id, st);
  }
  // Passadas as 8 horas, volta com vida cheia.
  if (st.downUntil && Date.now() >= st.downUntil) {
    st.hp = enemy.hp;
    st.downUntil = null;
  }
  return st;
}

function emit() {
  for (const fn of listeners) fn();
}

function log(text, tone = 'normal') {
  fight.log.push({ text, tone });
}

function describe(r, attackerStats, defenderStats) {
  const roll = `${r.attack} (d20 ${r.atkDie} + FOR ${attackerStats.for}) × ${r.defense} (d20 ${r.defDie} + DES ${defenderStats.des})`;
  if (!r.hit) return { roll, outcome: 'esquivou' };
  return { roll, outcome: `acertou! Dano ${r.damage} (d10 ${r.dmgDie} - CON ${r.reduction})` };
}

function finish(result, text) {
  clearTimeout(timer);
  timer = null;
  fight.over = true;
  fight.result = result;
  log(text, result === 'win' ? 'win' : result === 'loss' ? 'loss' : 'normal');
  emit();
}

function playerTurn() {
  const me = player.get().attributes;
  const { enemy } = fight;
  const r = resolveAttack(me, enemy.stats);
  const d = describe(r, me, enemy.stats);

  const st = stateOf(enemy);
  st.hp = Math.max(0, st.hp - r.damage);
  fight.enemyHp = st.hp;
  fight.dealt += r.damage;
  log(`Você ataca: ${d.roll} → ${d.outcome}${r.hit ? ` · ${enemy.name}: ${fight.enemyHp}/${enemy.hp}` : ''}`, r.hit ? 'good' : 'muted');

  if (st.hp <= 0) {
    st.downUntil = Date.now() + ENEMY_RECOVERY_MS;
    finish('win', `Vitória! ${enemy.name} foi nocauteado e ficará fora por 8 horas.`);
  }
}

function enemyTurn() {
  const me = player.get().attributes;
  const { enemy } = fight;
  const r = resolveAttack(enemy.stats, me);
  const d = describe(r, enemy.stats, me);

  fight.taken += r.damage;
  const hpAfter = Math.max(0, player.get().hp - r.damage);
  log(`${enemy.name} ataca: ${d.roll} → ${d.outcome}${r.hit ? ` · Você: ${hpAfter}/100` : ''}`, r.hit ? 'bad' : 'muted');
  if (r.damage > 0) player.changeHp(-r.damage);

  if (player.get().hp <= 0) finish('loss', 'Derrota. Você foi nocauteado e levado ao hospital.');
}

function step() {
  if (!fight || fight.over) return;

  if (fight.turn === 'player') {
    fight.round += 1;
    log(`— Rodada ${fight.round} de ${ROUNDS} —`, 'heading');
    playerTurn();
    fight.turn = 'enemy';
  } else {
    enemyTurn();
    fight.turn = 'player';
    if (!fight.over && fight.round >= ROUNDS) {
      const { dealt, taken } = fight;
      if (dealt > taken) finish('win', `Fim das ${ROUNDS} rodadas: vitória por dano (${dealt} × ${taken}).`);
      else if (dealt < taken) finish('loss', `Fim das ${ROUNDS} rodadas: derrota por dano (${dealt} × ${taken}).`);
      else finish('draw', `Fim das ${ROUNDS} rodadas: empate (${dealt} × ${taken}).`);
    }
  }

  if (!fight.over) {
    emit();
    timer = setTimeout(step, STEP_MS);
  }
}

export const combat = {
  current: () => fight,
  isFighting: () => fight !== null && !fight.over,

  // Vida atual do inimigo e quanto falta para ele voltar (0 se disponível).
  enemyStatus(enemy) {
    const st = stateOf(enemy);
    return { hp: st.hp, downMs: st.downUntil ? Math.max(0, st.downUntil - Date.now()) : 0 };
  },

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  // Persistência: vida e indisponibilidade de cada inimigo.
  serialize: () => Object.fromEntries(enemyState),

  restore(data) {
    if (!data) return;
    for (const [id, st] of Object.entries(data)) {
      if (typeof st?.hp === 'number') enemyState.set(id, { hp: st.hp, downUntil: st.downUntil ?? null });
    }
    emit();
  },

  // Retorna null se a luta começou, ou { message } com o motivo de não poder.
  start(enemy) {
    if (combat.isFighting()) return { message: 'Você já está em uma luta.' };
    if (!enemy.stats) return { message: `${enemy.name} ainda não tem status definidos.` };
    if (stateOf(enemy).downUntil) return { message: `${enemy.name} está se recuperando e ainda não pode lutar.` };
    if (player.get().hp <= 0) return { message: 'Você precisa ter vida acima de 0.' };
    if (player.get().energy < FIGHT_ENERGY) return { message: `Requer ${FIGHT_ENERGY} de energia.` };
    const running = activities.current();
    if (running) return { message: `Termine antes: ${running.activity.name}.` };

    player.changeEnergy(-FIGHT_ENERGY);
    fight = { enemy, enemyHp: stateOf(enemy).hp, round: 0, turn: 'player', dealt: 0, taken: 0, log: [], over: false, result: null };
    log(`Luta contra ${enemy.name}! (-${FIGHT_ENERGY} energia)`, 'heading');
    emit();
    timer = setTimeout(step, STEP_MS);
    return null;
  },
};

// Enquanto houver luta, patrulhas e treinos ficam bloqueados.
activities.setBlocker(() => (combat.isFighting() ? 'Você está em uma luta.' : null));
