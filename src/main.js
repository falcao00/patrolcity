import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene.js';
import { CityScene } from './scenes/CityScene.js';
import { TrainScene } from './scenes/TrainScene.js';
import { FightScene } from './scenes/FightScene.js';
import { ShopScene } from './scenes/ShopScene.js';
import { HospitalScene } from './scenes/HospitalScene.js';
import { InventoryScene } from './scenes/InventoryScene.js';
import { initSidebar } from './hud/sidebar.js';
import { initTopMenu } from './hud/topMenu.js';
import { hospital } from './state/hospital.js';

initSidebar();
hospital.init();

function startGame() {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#0f1218',
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: 800,
      height: 600,
    },
    scene: [GameScene, CityScene, TrainScene, FightScene, ShopScene, HospitalScene, InventoryScene],
  });

  initTopMenu(game);
}

// O Phaser (WebGL) quebra se iniciar com a área do jogo em 0x0, o que acontece
// quando a página carrega numa aba oculta. Espera a área ter tamanho.
const container = document.getElementById('game');
if (container.clientWidth > 0 && container.clientHeight > 0) {
  startGame();
} else {
  const observer = new ResizeObserver(() => {
    if (container.clientWidth > 0 && container.clientHeight > 0) {
      observer.disconnect();
      startGame();
    }
  });
  observer.observe(container);
}
