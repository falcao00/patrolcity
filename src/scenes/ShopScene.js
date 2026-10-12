import { ImageScene } from './ImageScene.js';
import lojaUrl from '../../assets/Loja.png';
import { player } from '../state/player.js';
import { SHOP_ARMORS, SHOP_ITEMS, SHOP_WEAPONS, checkPurchase, shop } from '../state/shop.js';
import { INVENTORY_CAPACITY, formatEffect, inventory } from '../state/inventory.js';
import { BTN_H, COLORS, FONT, GAP } from './components/ActivityPanel.js';

const PANEL_PAD = 14;
const SECTION_H = 24;

export class ShopScene extends ImageScene {
  constructor() {
    super('ShopScene', { imageUrl: lojaUrl, caption: 'O melhor preço da cidade' });
  }

  // Armas e armaduras ficam num painel à direita.
  sidePanelWidth(width) {
    return Math.max(230, Math.min(300, width * 0.28));
  }

  create() {
    this.buttons = SHOP_ITEMS.map((item) => this.createButton(item));
    this.gearButtons = [...SHOP_WEAPONS, ...SHOP_ARMORS].map((item) => this.createButton(item));
    this.message = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '14px' }).setOrigin(0.5, 0);
    this.result = null;
    this.capacity = this.add.text(0, 31, '', { fontFamily: FONT, fontSize: '13px', color: COLORS.muted }).setOrigin(0.5, 0.5);

    // Fundo do painel atrás dos botões (que foram criados antes).
    this.panelBg = this.add.rectangle(0, 0, 10, 10, 0x171b24).setOrigin(0, 0).setStrokeStyle(1, COLORS.border).setDepth(-1);
    const sectionStyle = { fontFamily: FONT, fontSize: '12px', color: COLORS.muted, fontStyle: 'bold' };
    this.panelTitle = this.add.text(0, 0, 'ARMAS E ARMADURAS', sectionStyle);
    this.weaponsTitle = this.add.text(0, 0, 'Armas', { fontFamily: FONT, fontSize: '13px', color: COLORS.text });
    this.armorsTitle = this.add.text(0, 0, 'Armaduras', { fontFamily: FONT, fontSize: '13px', color: COLORS.text });

    super.create();

    const offPlayer = player.subscribe(() => this.refresh());
    const offInventory = inventory.subscribe(() => this.refresh());
    this.events.once('shutdown', () => {
      offPlayer();
      offInventory();
    });
    this.refresh();
  }

  createButton(item) {
    const bg = this.add.rectangle(0, 0, 100, BTN_H, COLORS.bg).setStrokeStyle(1, COLORS.border);
    const label = this.add
      .text(0, 0, item.slot ? item.name : `${item.name} - R$ ${item.price}`, { fontFamily: FONT, fontSize: '14px', color: COLORS.text })
      .setOrigin(0, 0.5);
    const info = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '13px', color: COLORS.muted }).setOrigin(1, 0.5);
    const button = { item, bg, label, info, width: 100, hover: false };

    bg.setInteractive({ useHandCursor: true })
      .on('pointerover', () => { button.hover = true; this.refresh(); })
      .on('pointerout', () => { button.hover = false; this.refresh(); })
      .on('pointerdown', () => {
        const error = shop.buy(item);
        this.result = error
          ? { text: error.message, color: COLORS.danger }
          : { text: `Comprou ${item.name} (-R$ ${item.price}). Veja no INVENTÁRIO.`, color: COLORS.success };
        this.refresh();
      });

    return button;
  }

  placeButton(b, left, cy, width) {
    b.width = width;
    b.bg.setPosition(left + width / 2, cy).setSize(width, BTN_H);
    b.bg.input?.hitArea.setSize(width, BTN_H);
    b.label.setPosition(left + 12, cy);
    b.info.setPosition(left + width - 12, cy);
  }

  layoutContent(centerX, y, width) {
    const left = centerX - width / 2;
    this.buttons.forEach((b, i) => this.placeButton(b, left, y + i * (BTN_H + GAP) + BTN_H / 2, width));
    this.message.setPosition(centerX, y + this.buttons.length * (BTN_H + GAP) + 4);
    this.capacity.setX(centerX);
  }

  layoutSidePanel(x, w, height) {
    const px = x;
    const py = 16;
    const pw = w - 16;
    const inner = pw - PANEL_PAD * 2;
    const left = px + PANEL_PAD;
    this.panelBg.setPosition(px, py).setSize(pw, height - py - 16);
    this.panelTitle.setPosition(left, py + PANEL_PAD);

    let y = py + PANEL_PAD + 28;
    this.weaponsTitle.setPosition(left, y);
    y += SECTION_H;
    this.gearButtons.slice(0, SHOP_WEAPONS.length).forEach((b) => {
      this.placeButton(b, left, y + BTN_H / 2, inner);
      y += BTN_H + GAP;
    });

    y += 10;
    this.armorsTitle.setPosition(left, y);
    y += SECTION_H;
    this.gearButtons.slice(SHOP_WEAPONS.length).forEach((b) => {
      this.placeButton(b, left, y + BTN_H / 2, inner);
      y += BTN_H + GAP;
    });

    this.refresh();
  }

  refresh() {
    if (!this.buttons || !this.gearButtons) return;

    for (const b of [...this.buttons, ...this.gearButtons]) {
      const blocked = checkPurchase(b.item);
      if (b.item.slot) {
        // Armas/armaduras: nome à esquerda, preço à direita (vermelho se não der para comprar).
        b.info.setText(`R$ ${b.item.price}`).setColor(blocked ? COLORS.danger : COLORS.muted);
      } else {
        b.info.setText(blocked ? blocked.short : formatEffect(b.item)).setColor(blocked ? COLORS.danger : COLORS.muted);
      }
      for (const part of [b.bg, b.label, b.info]) part.setAlpha(blocked ? 0.5 : 1);
      b.bg.setFillStyle(b.hover && !blocked ? COLORS.bgHover : COLORS.bg);

      // Se o nome não couber ao lado da informação, diminui a fonte até caber.
      b.label.setScale(1);
      const room = b.width - 24 - b.info.width - 10;
      if (room > 0 && b.label.width > room) b.label.setScale(room / b.label.width);
    }
    this.message.setText(this.result?.text ?? '').setColor(this.result?.color ?? COLORS.muted);
    this.capacity.setText(`Inventário: ${inventory.count()} / ${INVENTORY_CAPACITY}`);
  }
}
