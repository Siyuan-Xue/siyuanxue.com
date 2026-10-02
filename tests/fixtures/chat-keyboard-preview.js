// Local-only UI fixture. It does not emulate a real OS keyboard or ship in dist.
const viewport = Object.assign(new EventTarget(), { height: innerHeight, offsetTop: 0, scale: 1 });
Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
addEventListener('DOMContentLoaded', () => {
  const controls = document.createElement('div');
  controls.style.cssText = 'position:fixed;inset:0 0 auto;height:70px;z-index:1000;background:#ddd;color:#222;display:flex;gap:4px;align-items:center;justify-content:center;font:12px sans-serif';
  const keyboard = document.createElement('div');
  keyboard.style.cssText = 'position:fixed;inset:auto 0 0;z-index:1000;background:#ddd;color:#333;text-align:center;padding:28px;font:14px sans-serif;display:none';
  keyboard.textContent = 'Simulated keyboard — not a device test';
  const update = (height, top, event) => {
    viewport.height = height;
    viewport.offsetTop = top;
    keyboard.style.top = `${top + height}px`;
    keyboard.style.display = height < innerHeight ? 'block' : 'none';
    viewport.dispatchEvent(new Event(event));
  };
  const actions = {
    'Open keyboard': () => { document.querySelector('textarea')?.focus({ preventScroll: true }); update(420, 80, 'resize'); },
    'Pan': () => update(viewport.height, 110, 'scroll'),
    'Short viewport': () => update(180, 80, 'resize'),
    'Tiny viewport': () => update(140, 80, 'resize'),
    'Close keyboard': () => { document.querySelector('textarea')?.blur(); update(innerHeight, 0, 'resize'); },
  };
  Object.entries(actions).forEach(([label, action]) => {
    const button = document.createElement('button');
    button.textContent = label;
    button.style.cssText = 'background:white;border:1px solid #aaa;border-radius:5px;padding:6px;max-width:90px';
    button.addEventListener('click', action);
    controls.append(button);
  });
  document.body.append(controls, keyboard);
});
