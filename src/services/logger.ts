/* eslint-disable no-console -- zentraler Logger, einzige erlaubte Stelle mit Konsolen-Zugriff (Gate G35, Auftrag 050 Block C) */

/**
 * Zentraler Logger (Gate G35 / Auftrag 050, Block C).
 *
 * Einzige Stelle im Produktcode mit direktem Konsolen-Zugriff.
 * Verhalten: in DEV alles an console durchreichen; in PROD `debug`/`info`
 * verwerfen, `warn`/`error` behalten.
 */

const isDev: boolean =
  typeof import.meta !== 'undefined' &&
  typeof import.meta.env !== 'undefined' &&
  import.meta.env.DEV === true;

function emit(method: 'debug' | 'info' | 'warn' | 'error', args: unknown[]): void {
  if (method === 'debug' || method === 'info') {
    if (isDev) {
      console[method](...args);
    }
    return;
  }
  console[method](...args);
}

export const logger = {
  debug: (...args: unknown[]): void => emit('debug', args),
  info: (...args: unknown[]): void => emit('info', args),
  warn: (...args: unknown[]): void => emit('warn', args),
  error: (...args: unknown[]): void => emit('error', args),
};
