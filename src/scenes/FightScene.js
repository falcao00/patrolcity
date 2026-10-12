import { ImageScene } from './ImageScene.js';
import lutaUrl from '../../assets/luta.jpg';
import { BTN_H, COLORS, FONT, GAP } from './components/ActivityPanel.js';
import { ENEMIES } from '../data/enemies.js';
import { ATTRIBUTE_NAMES, player } from '../state/player.js';
import { combat, FIGHT_ENERGY, ROUNDS } from '../state/combat.js';
import { formatTime } from '../state/activities.js';

const PANEL_PAD = 14;
const HP_BAR_H = 16;

const TONES = {
  heading: COLORS.muted,
  normal: COLORS.text,
  muted: COLORS.muted,
  good: COLORS.success,
  bad: COLORS.danger,
  win: COLORS.success,
  loss: COLORS.danger,
};

const formatEnemyInfo = ({ hp, stats }) =>
  [`VIDA ${hp}`, ...Object.entries(stats ?? {}).map(([key, value]) => `${ATTRIBUTE_NAMES[key]} ${value}`)].join('  ');

export class FightScene extends ImageScene {
  constructor() {
    super('FightScene', { imageUrl: lutaUrl, caption: 'Serei o mais forte' });
  }

  // Log do combate na lateral direita.
  sidePanelWidth(width) {
    return Math.max(230, Math.min(320, width * 0.3));
  }

  create() {
    this.buttons = ENEMIES.map((enemy) => this.createButton(enemy));
    this.status = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '14px', color: COLORS.danger }).setOrigin(0.5, 0);
    this.statusError = null;
    this.costHint = this.add
      .text(0, 31, `Cada luta custa ${FIGHT_ENERGY} de energia`, { fontFamily: FONT, fontSize: '13px', color: COLORS.muted })
      .setOrigin(0.5, 0.5);

    // Painel lateral: vida do inimigo em destaque + log das rolagens.
    this.panelBg = this.add.rectangle(0, 0, 10, 10, 0x171b24).setOrigin(0, 0).setStrokeStyle(1, COLORS.border);
    this.panelTitle = this.add.text(0, 0, 'COMBATE', { fontFamily: FONT, fontSize: '12px', color: COLORS.muted });
    this.enemyName = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '18px', color: COLORS.text, fontStyle: 'bold' });
    this.enemyHpBg = this.add.rectangle(0, 0, 10, HP_BAR_H, 0x2a303d).setOrigin(0, 0);
    this.enemyHpFill = this.add.rectangle(0, 0, 0, HP_BAR_H, 0xe53935).setOrigin(0, 0);
    this.enemyHpText = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '13px', color: COLORS.text }).setOrigin(1, 0);
    this.roundText = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '12px', color: COLORS.muted });
    this.logTexts = [];
    this.panel = { x: 0, y: 0, w: 10, h: 10 };

    super.create();

    const off = combat.subscribe(() => {
      this.statusError = null;
      this.refresh();
    });
    // Atualiza a contagem dos inimigos fora de combate e a energia disponível.
    const offPlayer = player.subscribe(() => this.refresh());
    this.time.addEvent({ delay: 500, loop: true, callback: this.refresh, callbackScope: this });
    this.events.once('shutdown', () => {
      off();
      offPlayer();
    });
    this.refresh();
  }

  createButton(enemy) {
    const bg = this.add.rectangle(0, 0, 100, BTN_H, COLORS.bg).setStrokeStyle(1, COLORS.border);
    const label = this.add.text(0, 0, enemy.name, { fontFamily: FONT, fontSize: '14px', color: COLORS.text }).setOrigin(0, 0.5);
    const info = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '12px', color: COLORS.muted }).setOrigin(1, 0.5);
    const button = { enemy, bg, label, info, hover: false };

    bg.setInteractive({ useHandCursor: true })
      .on('pointerover', () => { button.hover = true; this.refresh(); })
      .on('pointerout', () => { button.hover = false; this.refresh(); })
      .on('pointerdown', () => {
        this.statusError = combat.start(enemy)?.message ?? null;
        this.refresh();
      });

    return button;
  }

  layoutContent(centerX, y, width) {
    this.buttons.forEach((b, i) => {
      const { bg, label, info } = b;
      const cy = y + i * (BTN_H + GAP) + BTN_H / 2;
      b.width = width;
      bg.setPosition(centerX, cy).setSize(width, BTN_H);
      bg.input?.hitArea.setSize(width, BTN_H);
      label.setPosition(centerX - width / 2 + 12, cy);
      info.setPosition(centerX + width / 2 - 12, cy);
    });
    this.status.setPosition(centerX, y + this.buttons.length * (BTN_H + GAP) + 4);
    this.costHint.setX(centerX);
  }

  layoutSidePanel(x, w, height) {
    const top = 16;
    this.panel = { x, y: top, w: w - 16, h: height - top - 16 };
    const { x: px, y: py, w: pw, h: ph } = this.panel;
    const inner = pw - PANEL_PAD * 2;

    this.panelBg.setPosition(px, py).setSize(pw, ph);
    this.panelTitle.setPosition(px + PANEL_PAD, py + PANEL_PAD);
    this.enemyName.setPosition(px + PANEL_PAD, py + PANEL_PAD + 18);
    this.enemyHpBg.setPosition(px + PANEL_PAD, py + PANEL_PAD + 48).setSize(inner, HP_BAR_H);
    this.enemyHpFill.setPosition(px + PANEL_PAD, py + PANEL_PAD + 48);
    this.enemyHpText.setPosition(px + pw - PANEL_PAD, py + PANEL_PAD + 68);
    this.roundText.setPosition(px + PANEL_PAD, py + PANEL_PAD + 68);
    this.refresh();
  }

  refresh() {
    if (!this.buttons) return;

    const fight = combat.current();
    const fighting = combat.isFighting();

    // Botões dos oponentes.
    for (const b of this.buttons) {
      const isCurrent = fight?.enemy.id === b.enemy.id;
      const { hp, downMs } = combat.enemyStatus(b.enemy);
      const available = !fighting && !!b.enemy.stats && downMs === 0;
      const info = !b.enemy.stats
        ? 'Sem status'
        : downMs > 0
          ? `Nocauteado · volta em ${formatTime(downMs)}`
          : formatEnemyInfo({ ...b.enemy, hp });

      b.info.setText(info).setScale(1);
      // Se os status não couberem ao lado do nome, diminui a fonte até caber.
      const room = (b.width ?? 0) - 24 - b.label.width - 16;
      if (room > 0 && b.info.width > room) b.info.setScale(room / b.info.width);
      const dimmed = !available && !(fighting && isCurrent);
      for (const part of [b.bg, b.label, b.info]) part.setAlpha(dimmed ? 0.5 : 1);
      b.bg.setFillStyle(b.hover && available ? COLORS.bgHover : COLORS.bg);
      b.bg.setStrokeStyle(1, fighting && isCurrent ? 0xe53935 : COLORS.border);
    }
    this.status.setText(this.statusError ?? '');

    // Vida do inimigo em destaque.
    const inner = this.panel.w - PANEL_PAD * 2;
    if (fight) {
      const { enemy, enemyHp } = fight;
      this.enemyName.setText(enemy.name);
      this.enemyHpFill.width = inner * (enemyHp / enemy.hp);
      this.enemyHpText.setText(`Vida ${enemyHp} / ${enemy.hp}`);
      this.roundText.setText(fighting ? `Rodada ${Math.max(1, fight.round)} de ${ROUNDS}` : 'Luta encerrada');
    } else {
      this.enemyName.setText('Escolha um oponente');
      this.enemyHpFill.width = 0;
      this.enemyHpText.setText('');
      this.roundText.setText('');
    }
    for (const part of [this.enemyHpBg, this.enemyHpFill]) part.setVisible(!!fight);

    this.renderLog(fight?.log ?? []);
  }

  // Mostra as entradas mais recentes que couberem no painel (as antigas saem por cima).
  renderLog(entries) {
    for (const t of this.logTexts) t.destroy();
    this.logTexts = [];

    const { x, y, w, h } = this.panel;
    const logTop = y + PANEL_PAD + 96;
    let bottom = y + h - PANEL_PAD;

    for (let i = entries.length - 1; i >= 0; i--) {
      const { text, tone } = entries[i];
      const t = this.add
        .text(x + PANEL_PAD, 0, text, {
          fontFamily: FONT,
          fontSize: '12px',
          color: TONES[tone] ?? COLORS.text,
          fontStyle: tone === 'win' || tone === 'loss' ? 'bold' : 'normal',
          wordWrap: { width: w - PANEL_PAD * 2 },
          lineSpacing: 2,
        })
        .setOrigin(0, 1);

      if (bottom - t.height < logTop) {
        t.destroy();
        break;
      }
      t.setY(bottom);
      bottom -= t.height + 6;
      this.logTexts.push(t);
    }
  }
}
