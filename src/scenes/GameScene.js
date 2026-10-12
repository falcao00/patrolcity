import Phaser from 'phaser';
import { player } from '../state/player.js';
import { inventory } from '../state/inventory.js';

// Teclas de teste da tela inicial (fileira de números ou teclado numérico).
const TEST_KEYS = [
  ['ONE', () => player.changeHp(-10)],
  ['TWO', () => player.changeHp(10)],
  ['THREE', () => player.changeEnergy(-10)],
  ['FOUR', () => player.changeEnergy(10)],
  ['FIVE', () => player.changeXp(-10)],
  ['SIX', () => player.changeXp(10)],
  ['SEVEN', () => player.changeXp(100)],
  ['EIGHT', () => player.changeReputation(10)],
  ['NINE', () => player.changeMoney(100)],
  ['ZERO', () => {
    player.reset();
    inventory.clear();
  }],
];

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    this.info = this.add
      .text(0, 0, [
        'Patrol City',
        '',
        'Teclas de teste:',
        '1 / 2  →  -10 / +10 vida',
        '3 / 4  →  -10 / +10 energia',
        '5 / 6  →  -10 / +10 experiência',
        '7  →  +100 experiência',
        '8  →  +10 reputação',
        '9  →  +R$ 100',
        '0  →  resetar personagem e inventário',
        'T  →  +5 em todos os status',
      ].join('\n'), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: '#8a93a6',
        align: 'center',
        lineSpacing: 6,
      })
      .setOrigin(0.5);

    this.center();
    this.scale.on('resize', this.center, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.center, this));

    const keys = this.input.keyboard;
    for (const [name, action] of TEST_KEYS) {
      keys.on(`keydown-${name}`, action);
      keys.on(`keydown-NUMPAD_${name}`, action);
    }

    // T: +5 em todos os status (FOR, DES, CON, INT, CAR, SOR).
    keys.on('keydown-T', () =>
      player.changeAttributes({ for: 5, des: 5, con: 5, int: 5, car: 5, sor: 5 })
    );
  }

  center() {
    this.info.setPosition(this.scale.width / 2, this.scale.height / 2);
  }
}
