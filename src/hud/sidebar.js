import { player } from '../state/player.js';

const DEFAULT_AVATAR =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
      '<rect width="100" height="100" fill="#2a303d"/>' +
      '<circle cx="50" cy="38" r="18" fill="#8a93a6"/>' +
      '<path d="M18 92c4-20 18-30 32-30s28 10 32 30z" fill="#8a93a6"/>' +
      '</svg>'
  );

export function initSidebar() {
  const $ = (id) => document.getElementById(id);
  const avatarImg = $('avatar-img');
  const avatarInput = $('avatar-input');

  avatarInput.addEventListener('change', () => {
    const file = avatarInput.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = () => player.setPhoto(reader.result);
    reader.readAsDataURL(file);
    avatarInput.value = '';
  });

  player.subscribe((p) => {
    avatarImg.src = p.photo ?? DEFAULT_AVATAR;
    $('char-name').textContent = p.name;
    $('char-level').textContent = `Nível ${p.level}`;
    $('rep-value').textContent = p.reputation.toLocaleString('pt-BR');
    $('money-value').textContent = `R$ ${p.money.toLocaleString('pt-BR')}`;

    $('hp-value').textContent = `${p.hp} / 100`;
    $('hp-fill').style.width = `${p.hp}%`;

    $('energy-value').textContent = `${p.energy} / 100`;
    $('energy-fill').style.width = `${p.energy}%`;

    $('xp-value').textContent = `${p.xp} / ${p.xpToNext}`;
    $('xp-fill').style.width = `${(p.xp / p.xpToNext) * 100}%`;

    for (const [key, value] of Object.entries(p.attributes)) {
      $(`attr-${key}`).textContent = value;
    }
  });
}
