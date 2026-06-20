import './style.css';
import './game/main';

// Once Phaser injects its canvas, hide the HTML loading screen.
const markBooted = () => {
  const app = document.getElementById('app');
  if (app && app.querySelector('canvas')) {
    document.body.classList.add('booted');
    return true;
  }
  return false;
};

const poll = window.setInterval(() => {
  if (markBooted()) window.clearInterval(poll);
}, 100);

// Safety: stop polling after 8s regardless.
window.setTimeout(() => window.clearInterval(poll), 8000);
