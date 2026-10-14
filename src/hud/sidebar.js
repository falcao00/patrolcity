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

const PHOTO_MAX_SIZE = 256;

// Reduz a foto para no máximo 256 px (JPEG) para caber no jogo salvo do navegador.
function shrinkPhoto(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, PHOTO_MAX_SIZE / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Imagem inválida'));
    };
    img.src = url;
  });
}

export function initSidebar() {
  const $ = (id) => document.getElementById(id);
  const avatarImg = $('avatar-img');
  const avatarInput = $('avatar-input');

  avatarInput.addEventListener('change', () => {
    const file = avatarInput.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    shrinkPhoto(file)
      .then((dataUrl) => player.setPhoto(dataUrl))
      .catch((err) => console.warn('Não foi possível carregar a foto:', err));
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
