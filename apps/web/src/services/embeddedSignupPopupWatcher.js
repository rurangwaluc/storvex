export function stopEmbeddedSignupPopupWatcher({ timerRef, popupRef, clearInterval }) {
  if (timerRef.current) clearInterval(timerRef.current);
  timerRef.current = null;
  popupRef.current = null;
}

export function isEmbeddedSignupHandoffReady({ active, completing, code, session }) {
  return Boolean(active && !completing && code && session);
}
