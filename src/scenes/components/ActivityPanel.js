import { player } from '../../state/player.js';
import { activities, checkRequirements, durationFor, formatStats, formatTime, KIND_LABELS } from '../../state/activities.js';

export const BTN_H = 36;
export const GAP = 8;
export const FONT = 'system-ui, sans-serif';

export const COLORS = {
  bg: 0x2a303d,
  bgHover: 0x343b4a,
  border: 0x262c38,
  progress: 0x1e88e5,
  text: '#e8ebf1',
  muted: '#8a93a6',
  danger: '#e57373',
  success: '#81c784',
};

// Lista de botões de ações com tempo (patrulhas, treinos...) mostrada abaixo da frase das telas.
// - list: atividades a mostrar
// - columns: quantas colunas de botões
// - label(activity): texto do botão quando parado
export class ActivityPanel {
  constructor(scene, { list, columns = 1, label }) {
    this.scene = scene;
    this.list = list;
    this.columns = columns;
    this.labelFor = label;
    this.statusError = null;

    this.buttons = list.map((activity) => this.createButton(activity));
    this.status = scene.add.text(0, 0, '', { fontFamily: FONT, fontSize: '14px' }).setOrigin(0.5, 0);
    this.hint = scene.add
      .text(0, 0, 'Teste:  1 → concluir ação   ·   2 → energia 100', {
        fontFamily: FONT,
        fontSize: '13px',
        color: COLORS.muted,
      })
      .setOrigin(0.5, 0.5);

    const offPlayer = player.subscribe(() => this.refresh());
    const offActivities = activities.subscribe(() => {
      this.statusError = null;
      this.refresh();
    });
    scene.time.addEvent({ delay: 250, loop: true, callback: this.refresh, callbackScope: this });

    // Teclas de teste: 1 conclui na hora a ação em andamento, 2 enche a energia.
    const testKeys = [
      ['ONE', () => activities.completeNow()],
      ['TWO', () => player.setEnergy(100)],
    ];
    for (const [name, action] of testKeys) {
      scene.input.keyboard.on(`keydown-${name}`, action);
      scene.input.keyboard.on(`keydown-NUMPAD_${name}`, action);
    }

    scene.events.once('shutdown', () => {
      offPlayer();
      offActivities();
    });
  }

  createButton(activity) {
    const { scene } = this;
    const bg = scene.add.rectangle(0, 0, 100, BTN_H, COLORS.bg).setStrokeStyle(1, COLORS.border);
    const fill = scene.add.rectangle(0, 0, 0, BTN_H, COLORS.progress, 0.35).setOrigin(0, 0.5);
    const label = scene.add.text(0, 0, '', { fontFamily: FONT, fontSize: '14px', color: COLORS.text }).setOrigin(0, 0.5);
    const info = scene.add.text(0, 0, '', { fontFamily: FONT, fontSize: '13px', color: COLORS.muted }).setOrigin(1, 0.5);

    const button = { activity, bg, fill, label, info, width: 100, hover: false };

    bg.setInteractive({ useHandCursor: true })
      .on('pointerover', () => { button.hover = true; this.refresh(); })
      .on('pointerout', () => { button.hover = false; this.refresh(); })
      .on('pointerdown', () => {
        const error = activities.start(activity);
        this.statusError = error?.message ?? null;
        this.refresh();
      });

    return button;
  }

  layout(centerX, y, width) {
    const cols = this.columns;
    const btnW = (width - GAP * (cols - 1)) / cols;
    const rows = Math.ceil(this.buttons.length / cols);

    this.buttons.forEach((b, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      // A última linha, se incompleta, fica centralizada.
      const inRow = row === rows - 1 ? this.buttons.length - row * cols : cols;
      const rowW = inRow * btnW + (inRow - 1) * GAP;
      const left = centerX - rowW / 2 + col * (btnW + GAP);
      const cy = y + row * (BTN_H + GAP) + BTN_H / 2;

      b.width = btnW;
      b.bg.setPosition(left + btnW / 2, cy).setSize(btnW, BTN_H);
      b.bg.input?.hitArea.setSize(btnW, BTN_H);
      b.fill.setPosition(left, cy);
      b.label.setPosition(left + 12, cy);
      b.info.setPosition(left + btnW - 12, cy);
    });

    this.status.setPosition(centerX, y + rows * (BTN_H + GAP) + 4);
    this.hint.setPosition(centerX, 31);
    this.refresh();
  }

  refresh() {
    const current = activities.current();

    for (const b of this.buttons) {
      const { activity } = b;
      const running = current?.activity.id === activity.id;
      const blocked = running ? null : checkRequirements(activity);
      const available = !current && !blocked;

      if (running) {
        b.label.setText(`${activity.short} — em andamento`);
        b.info.setText(formatTime(activities.remaining())).setColor(COLORS.text);
        b.fill.width = b.width * activities.progress();
      } else {
        b.label.setText(this.labelFor(activity));
        const duration = durationFor(activity);
        const saved = activity.durationMs - duration;
        const time = saved > 0 ? `${formatTime(duration)} (-${Math.round(saved / 1000)}s)` : formatTime(duration);
        b.info.setText(blocked ? blocked.short : time).setColor(blocked ? COLORS.danger : COLORS.muted);
        b.fill.width = 0;
      }

      // Se o texto não couber ao lado do tempo, diminui a fonte até caber.
      b.label.setScale(1);
      const room = b.width - 24 - b.info.width - 10;
      if (b.label.width > room) b.label.setScale(room / b.label.width);

      const dimmed = !running && !available;
      for (const part of [b.bg, b.label, b.info]) part.setAlpha(dimmed ? 0.5 : 1);
      b.bg.setFillStyle(b.hover && available ? COLORS.bgHover : COLORS.bg);
    }

    const last = activities.lastResult();
    const isMine = (activity) => this.list.includes(activity);

    if (this.statusError) {
      this.status.setText(this.statusError).setColor(COLORS.danger);
    } else if (current && !isMine(current.activity)) {
      // Ação de outra tela rodando: avisa aqui também.
      this.status
        .setText(`${current.activity.name} em andamento (${formatTime(activities.remaining())})`)
        .setColor(COLORS.muted);
    } else if (last && !current && isMine(last.activity)) {
      const { activity } = last;
      const parts = [
        activity.xp ? `+${activity.xp} XP` : null,
        activity.money ? `+R$ ${activity.money}` : null,
        `-${activity.energy} energia`,
        formatStats(activity.stats) || null,
      ].filter(Boolean);
      this.status.setText(`${KIND_LABELS[activity.kind].done}: ${parts.join(', ')}`).setColor(COLORS.success);
    } else {
      this.status.setText('');
    }
  }
}
