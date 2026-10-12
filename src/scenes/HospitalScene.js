import { ImageScene } from './ImageScene.js';
import hospitalUrl from '../../assets/hospital.jpg';
import { hospital, TREATMENT_COST, TREATMENT_HEAL } from '../state/hospital.js';
import { formatTime } from '../state/activities.js';
import { player } from '../state/player.js';
import { BTN_H, COLORS, FONT } from './components/ActivityPanel.js';

const BAR_H = 14;

export class HospitalScene extends ImageScene {
  constructor() {
    super('HospitalScene', { imageUrl: hospitalUrl, caption: 'Os melhores cuidados' });
  }

  create() {
    this.statusText = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '16px', color: COLORS.text })
      .setOrigin(0.5, 0);
    this.barBg = this.add.rectangle(0, 0, 100, BAR_H, 0x2a303d).setOrigin(0, 0);
    this.barFill = this.add.rectangle(0, 0, 0, BAR_H, 0xe53935).setOrigin(0, 0);
    this.hint = this.add
      .text(0, 0, 'Teste:  1 → alta imediata   ·   2 → +R$ 100', { fontFamily: FONT, fontSize: '13px', color: COLORS.muted })
      .setOrigin(0.5, 0.5);
    this.barWidth = 100;

    // Tratamento médico pago.
    this.treatBg = this.add.rectangle(0, 0, 100, BTN_H, COLORS.bg).setStrokeStyle(1, COLORS.border);
    this.treatLabel = this.add
      .text(0, 0, `Tratamento médico - R$ ${TREATMENT_COST}`, { fontFamily: FONT, fontSize: '14px', color: COLORS.text })
      .setOrigin(0, 0.5);
    this.treatInfo = this.add
      .text(0, 0, `+${TREATMENT_HEAL} vida`, { fontFamily: FONT, fontSize: '13px', color: COLORS.muted })
      .setOrigin(1, 0.5);
    this.treatMsg = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '14px' }).setOrigin(0.5, 0);
    this.treatHover = false;
    this.treatResult = null;

    this.treatBg.setInteractive({ useHandCursor: true })
      .on('pointerover', () => { this.treatHover = true; this.refresh(); })
      .on('pointerout', () => { this.treatHover = false; this.refresh(); })
      .on('pointerdown', () => {
        const error = hospital.treat();
        this.treatResult = error
          ? { text: error.message, color: COLORS.danger }
          : { text: `Tratamento feito: +${TREATMENT_HEAL} vida, -R$ ${TREATMENT_COST}`, color: COLORS.success };
        this.refresh();
      });

    super.create();

    const offHospital = hospital.subscribe(() => this.refresh());
    const offPlayer = player.subscribe(() => this.refresh());
    this.time.addEvent({ delay: 500, loop: true, callback: this.refresh, callbackScope: this });

    // Teclas de teste: 1 dá alta na hora, 2 dá R$ 100.
    const testKeys = [
      ['ONE', () => hospital.dischargeNow()],
      ['TWO', () => player.changeMoney(100)],
    ];
    for (const [name, action] of testKeys) {
      this.input.keyboard.on(`keydown-${name}`, action);
      this.input.keyboard.on(`keydown-NUMPAD_${name}`, action);
    }

    this.events.once('shutdown', () => {
      offHospital();
      offPlayer();
    });
    this.refresh();
  }

  layoutContent(centerX, y, width) {
    const left = centerX - width / 2;
    this.barWidth = width;
    this.statusText.setPosition(centerX, y);
    this.barBg.setPosition(left, y + 28).setSize(width, BAR_H);
    this.barFill.setPosition(left, y + 28);

    const btnY = y + 58 + BTN_H / 2;
    this.treatBg.setPosition(centerX, btnY).setSize(width, BTN_H);
    this.treatBg.input?.hitArea.setSize(width, BTN_H);
    this.treatLabel.setPosition(left + 12, btnY);
    this.treatInfo.setPosition(left + width - 12, btnY);
    this.treatMsg.setPosition(centerX, btnY + BTN_H / 2 + 8);

    this.hint.setPosition(centerX, 31);
    this.refresh();
  }

  refresh() {
    if (!this.treatBg) return;

    const admitted = hospital.isAdmitted();
    const p = player.get();

    this.statusText.setText(
      admitted ? `Recuperando-se… alta em ${formatTime(hospital.remaining())}` : `Vida ${p.hp} / 100`
    );
    this.barBg.setVisible(admitted);
    this.barFill.setVisible(admitted);
    this.barFill.width = this.barWidth * hospital.progress();

    // Tratamento: precisa não estar internado, ter vida abaixo de 100 e dinheiro suficiente.
    // Internado não pode: fica as 8 horas inteiras.
    const blocked = admitted
      ? 'Internado'
      : p.hp >= 100
        ? 'Vida cheia'
        : p.money < TREATMENT_COST
          ? 'Sem dinheiro'
          : null;
    this.treatInfo
      .setText(blocked ?? `+${TREATMENT_HEAL} vida`)
      .setColor(blocked ? COLORS.danger : COLORS.muted);
    for (const part of [this.treatBg, this.treatLabel, this.treatInfo]) part.setAlpha(blocked ? 0.5 : 1);
    this.treatBg.setFillStyle(this.treatHover && !blocked ? COLORS.bgHover : COLORS.bg);

    this.treatMsg.setText(this.treatResult?.text ?? '').setColor(this.treatResult?.color ?? COLORS.muted);
  }
}
