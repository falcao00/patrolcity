import { hospital } from '../state/hospital.js';

const HOSPITAL_SCENE = 'HospitalScene';

// Botões com data-scene trocam a cena exibida na área central.
// Internado, o personagem vai direto para o hospital e os outros botões ficam travados.
export function initTopMenu(game) {
  const buttons = document.querySelectorAll('.menu-btn[data-scene]');

  function goTo(target) {
    for (const scene of game.scene.getScenes(true)) {
      if (scene.scene.key !== target) game.scene.stop(scene.scene.key);
    }
    game.scene.start(target);

    buttons.forEach((b) => b.classList.toggle('active', b.dataset.scene === target));
  }

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => goTo(btn.dataset.scene));
  });

  function syncHospital() {
    const admitted = hospital.isAdmitted();
    document.querySelectorAll('.menu-btn').forEach((b) => {
      b.disabled = admitted && b.dataset.scene !== HOSPITAL_SCENE;
    });
    if (admitted && !game.scene.isActive(HOSPITAL_SCENE)) goTo(HOSPITAL_SCENE);
  }

  hospital.subscribe(syncHospital);
  syncHospital();
}
