import { ImageScene } from './ImageScene.js';
import treinarUrl from '../../assets/treinar.jpg';
import { TRAININGS } from '../state/activities.js';
import { ActivityPanel } from './components/ActivityPanel.js';

export class TrainScene extends ImageScene {
  constructor() {
    super('TrainScene', { imageUrl: treinarUrl, caption: 'Preciso ficar mais forte' });
  }

  create() {
    this.panel = new ActivityPanel(this, {
      list: TRAININGS,
      columns: 2,
      label: (t) => `${t.short} - ${t.energy} ENERGIA`,
    });
    super.create();
  }

  layoutContent(centerX, y, width) {
    this.panel.layout(centerX, y, width);
  }
}
