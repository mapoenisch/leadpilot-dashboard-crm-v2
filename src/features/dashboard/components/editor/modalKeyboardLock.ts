// Executive Dashboard V2 (Auftrag 165 / P12):
// Zählt geöffnete Dialoge aus `useModalA11y` (Versionsbereich, Wiederherstellen, Import).
// Fenster-weite Editor-Tastaturaktionen (Undo/Redo, Alt+Pfeil im Raster) prüfen diese Sperre,
// damit sich der verdeckte Entwurf nicht ändert, während ein Dialog offen ist.

let openModalCount = 0;

export function acquireModalKeyboardLock(): () => void {
  openModalCount += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    openModalCount = Math.max(0, openModalCount - 1);
  };
}

export function isModalKeyboardLocked(): boolean {
  return openModalCount > 0;
}
