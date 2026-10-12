import { ImageScene } from './ImageScene.js';
import cidadeUrl from '../../assets/cidade.jpg';
import { PATROLS } from '../state/activities.js';
import { ActivityPanel } from './components/ActivityPanel.js';

export class CityScene extends ImageScene {
  constructor() {
    super('CityScene', { imageUrl: cidadeUrl, caption: 'Patrulhe a Cidade Costeira' });
  }

  create() {
    this.panel = new ActivityPanel(this, {
      list: PATROLS,
      label: (p) => `${p.name} - ${p.xp} XP - R$ ${p.money} - ${p.energy} ENERGIA`,
    });
    super.create();
  }

  layoutContent(centerX, y, width) {
    this.panel.layout(centerX, y, width);
  }
}
