const retrigger = (element, className, delayMs = 0) => {
  if (!element) return;
  const run = () => {
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
    element.addEventListener('animationend', () => element.classList.remove(className), { once: true });
  };
  if (delayMs > 0) window.setTimeout(run, delayMs);
  else run();
};

export const animateReveal = (element, delayMs = 0) => retrigger(element, 'anim-reveal', delayMs);
export const animateFlagIn = element => retrigger(element, 'anim-flag-in');
export const animateFlagOut = element => retrigger(element, 'anim-flag-out');
export const animateImpact = element => retrigger(element, 'anim-impact');
export const pulseMascot = (element, state) => retrigger(element, `anim-mascot-${state}`);
