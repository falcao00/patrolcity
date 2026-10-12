import Phaser from 'phaser';

const BOX_W = 500;
const BOX_H = 300;

// Tela com uma imagem centralizada e uma frase embaixo.
// Usada pelos botões do menu (CIDADE, TREINAR...).
export class ImageScene extends Phaser.Scene {
  constructor(key, { imageUrl, caption }) {
    super(key);
    this.imageUrl = imageUrl;
    this.captionText = caption;
    this.textureKey = `${key}-image`;
  }

  preload() {
    this.load.image(this.textureKey, this.imageUrl);
  }

  create() {
    this.frame = this.add.graphics();
    this.image = this.add.image(0, 0, this.textureKey);

    this.caption = this.add
      .text(0, 0, `"${this.captionText}"`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        color: '#e8ebf1',
      })
      .setOrigin(0.5, 0);

    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));
  }

  layout() {
    const { width: fullW, height } = this.scale;

    // Telas com painel lateral (ex.: log da luta) reservam espaço à direita;
    // a imagem e o conteúdo ficam centralizados no espaço que sobra.
    const sideW = this.sidePanelWidth?.(fullW) ?? 0;
    const width = fullW - sideW;

    // Todas as telas usam a mesma moldura (BOX_W x BOX_H, proporção 5:3).
    const boxScale = Math.min(1, (width * 0.75) / BOX_W, (height * 0.6) / BOX_H);
    const boxW = BOX_W * boxScale;
    const boxH = BOX_H * boxScale;
    const top = 62;

    // A imagem cobre a moldura inteira; o que sobra é cortado a partir do centro.
    const srcW = this.image.frame.realWidth;
    const srcH = this.image.frame.realHeight;
    const boxRatio = BOX_W / BOX_H;
    const cropW = srcW / srcH > boxRatio ? srcH * boxRatio : srcW;
    const cropH = srcW / srcH > boxRatio ? srcH : srcW / boxRatio;

    this.image
      .setCrop((srcW - cropW) / 2, (srcH - cropH) / 2, cropW, cropH)
      .setScale(boxW / cropW)
      .setPosition(width / 2, top + boxH / 2);

    this.frame.clear();
    this.frame.lineStyle(3, 0x262c38);
    this.frame.strokeRect(width / 2 - boxW / 2 - 2, top - 2, boxW + 4, boxH + 4);

    this.caption.setPosition(width / 2, top + boxH + 28);

    // Telas com conteúdo extra (ex.: botões de atividade) o posicionam abaixo da frase.
    this.layoutContent?.(width / 2, this.caption.y + this.caption.height + 16, boxW);
    if (sideW) this.layoutSidePanel?.(width, sideW, height);
  }
}
