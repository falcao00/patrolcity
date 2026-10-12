import Phaser from 'phaser';
import { INVENTORY_CAPACITY, WEAR_SLOTS, checkUse, formatEffect, inventory, isWearable } from '../state/inventory.js';
import { player } from '../state/player.js';
import { COLORS, FONT } from './components/ActivityPanel.js';

const COLS = 5;
const SLOT_W = 112;
const SLOT_H = 84;
const SLOT_GAP = 12;
const TOP = 62;

const WEAR_W = 200;

// Inventário: espaços de vestíveis (arma + armadura) e grade de 10 itens.
// Clicar num item usa ou equipa; clicar num vestível equipado guarda de volta.
export class InventoryScene extends Phaser.Scene {
  constructor() {
    super('InventoryScene');
  }

  create() {
    this.title = this.add.text(0, 0, 'Inventário', { fontFamily: FONT, fontSize: '22px', color: COLORS.text }).setOrigin(0.5, 0);
    this.capacity = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '14px', color: COLORS.muted }).setOrigin(0.5, 0);
    this.help = this.add
      .text(0, 0, 'Clique em um item para usar ou equipar. Clique no que está equipado para guardar.', { fontFamily: FONT, fontSize: '13px', color: COLORS.muted })
      .setOrigin(0.5, 0);
    this.message = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '14px' }).setOrigin(0.5, 0);
    this.result = null;

    this.slots = Array.from({ length: INVENTORY_CAPACITY }, (_, index) => this.createSlot(index));

    const sectionStyle = { fontFamily: FONT, fontSize: '12px', color: COLORS.muted, fontStyle: 'bold' };
    this.wearTitle = this.add.text(0, 0, 'VESTÍVEIS', sectionStyle).setOrigin(0.5, 0);
    this.itemsTitle = this.add.text(0, 0, 'ITENS', sectionStyle).setOrigin(0.5, 0);
    this.wearSlots = Object.entries(WEAR_SLOTS).map(([id, def]) => this.createWearSlot(id, def));

    this.layout();
    this.scale.on('resize', this.layout, this);

    const offInventory = inventory.subscribe(() => this.refresh());
    const offPlayer = player.subscribe(() => this.refresh());
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.layout, this);
      offInventory();
      offPlayer();
    });
    this.refresh();
  }

  createWearSlot(id, def) {
    const bg = this.add.rectangle(0, 0, WEAR_W, SLOT_H, COLORS.bg).setStrokeStyle(1, COLORS.border);
    const label = this.add.text(0, 0, def.label, { fontFamily: FONT, fontSize: '12px', color: COLORS.muted }).setOrigin(0.5, 1);
    const value = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '14px', color: COLORS.text, align: 'center', wordWrap: { width: WEAR_W - 16 } })
      .setOrigin(0.5, 0);
    const wear = { id, bg, label, value, hover: false };

    bg.setInteractive({ useHandCursor: true })
      .on('pointerover', () => { wear.hover = true; this.refresh(); })
      .on('pointerout', () => { wear.hover = false; this.refresh(); })
      .on('pointerdown', () => {
        const item = inventory.equipped()[id];
        if (!item) return;
        const error = inventory.unequip(id);
        this.result = error
          ? { text: error.message, color: COLORS.danger }
          : { text: `Guardou ${item.name} no inventário.`, color: COLORS.success };
        this.refresh();
      });

    return wear;
  }

  createSlot(index) {
    const bg = this.add.rectangle(0, 0, SLOT_W, SLOT_H, COLORS.bg).setStrokeStyle(1, COLORS.border);
    const name = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '13px', color: COLORS.text, align: 'center', wordWrap: { width: SLOT_W - 12 } })
      .setOrigin(0.5, 1);
    const info = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '12px', color: COLORS.muted, align: 'center' }).setOrigin(0.5, 0);
    const slot = { index, bg, name, info, hover: false };

    bg.setInteractive({ useHandCursor: true })
      .on('pointerover', () => { slot.hover = true; this.refresh(); })
      .on('pointerout', () => { slot.hover = false; this.refresh(); })
      .on('pointerdown', () => {
        const item = inventory.items()[index];
        if (!item) return;
        const error = inventory.use(index);
        this.result = error
          ? { text: error.message, color: COLORS.danger }
          : isWearable(item)
            ? { text: `Equipou ${item.name}.`, color: COLORS.success }
            : { text: `Usou ${item.name}: ${formatEffect(item)}`, color: COLORS.success };
        this.refresh();
      });

    return slot;
  }

  layout() {
    const { width } = this.scale;
    const cx = width / 2;
    const rows = Math.ceil(INVENTORY_CAPACITY / COLS);
    const gridW = COLS * SLOT_W + (COLS - 1) * SLOT_GAP;
    const wearTop = TOP + 64;
    const gridTop = wearTop + SLOT_H + 52;

    this.title.setPosition(cx, TOP);

    // Vestíveis, centralizados.
    this.wearTitle.setPosition(cx, wearTop - 22);
    const wearW = this.wearSlots.length * WEAR_W + (this.wearSlots.length - 1) * SLOT_GAP;
    this.wearSlots.forEach(({ bg, label, value }, i) => {
      const x = cx - wearW / 2 + i * (WEAR_W + SLOT_GAP) + WEAR_W / 2;
      const y = wearTop + SLOT_H / 2;
      bg.setPosition(x, y);
      label.setPosition(x, y - 8);
      value.setPosition(x, y - 4);
    });

    // Itens.
    this.itemsTitle.setPosition(cx, gridTop - 42);
    this.capacity.setPosition(cx, gridTop - 24);

    this.slots.forEach(({ bg, name, info }, i) => {
      const x = cx - gridW / 2 + (i % COLS) * (SLOT_W + SLOT_GAP) + SLOT_W / 2;
      const y = gridTop + Math.floor(i / COLS) * (SLOT_H + SLOT_GAP) + SLOT_H / 2;
      bg.setPosition(x, y);
      name.setPosition(x, y - 2);
      info.setPosition(x, y + 4);
    });

    const gridBottom = gridTop + rows * SLOT_H + (rows - 1) * SLOT_GAP;
    this.help.setPosition(cx, gridBottom + 20);
    this.message.setPosition(cx, gridBottom + 44);
  }

  refresh() {
    if (!this.slots) return;

    const items = inventory.items();
    this.capacity.setText(`${items.length} / ${INVENTORY_CAPACITY} itens`);

    const equipped = inventory.equipped();
    for (const wear of this.wearSlots) {
      const item = equipped[wear.id];
      wear.value.setText(item ? item.name : 'Nenhuma').setColor(item ? COLORS.text : COLORS.muted);
      wear.bg.setFillStyle(item && wear.hover ? COLORS.bgHover : COLORS.bg).setStrokeStyle(1, item ? 0x1e88e5 : COLORS.border);
    }

    for (const slot of this.slots) {
      const item = items[slot.index];
      if (!item) {
        slot.name.setText('');
        slot.info.setText('vazio').setColor(COLORS.muted);
        slot.bg.setFillStyle(COLORS.bg).setAlpha(0.4);
        slot.info.setAlpha(0.6);
        continue;
      }

      const blocked = checkUse(item);
      slot.name.setText(item.name);
      slot.info.setText(blocked ? blocked.short : formatEffect(item)).setColor(blocked ? COLORS.danger : COLORS.muted);
      slot.bg.setAlpha(1).setFillStyle(slot.hover && !blocked ? COLORS.bgHover : COLORS.bg);
      for (const part of [slot.name, slot.info]) part.setAlpha(blocked ? 0.6 : 1);
    }

    this.message.setText(this.result?.text ?? '').setColor(this.result?.color ?? COLORS.muted);
  }
}
