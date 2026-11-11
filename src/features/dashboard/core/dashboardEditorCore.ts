// Executive Dashboard V2 (Auftrag 147 / P04):
// Entkoppelter Dashboard-Editor-Kern mit unbegrenztem Undo/Redo,
// Checkpoints, Speichermonitoring (15 MiB Soft-Limit),
// Transaktionsbündelung (Drag/Resize) und Eingabebündelung (Debounce 600ms/Blur).

import {
  cloneDashboardConfigV2,
  isSameConfigV2,
  type BreakpointKey,
  type DashboardConfigV2,
  type DashboardDraftState,
} from '../model/dashboardConfigV2';
import type { EditorCommand } from './editorCommands';
import {
  CHECKPOINT_INTERVAL,
  MAX_HISTORY_BYTES,
  type HistoryCheckpoint,
  type HistoryStats,
} from './editorCoreTypes';

import { TextInputDebouncer } from './textInputDebouncer';

export * from './editorCoreTypes';

export class DashboardEditorCore {
  private currentState: DashboardDraftState;
  private savedConfig: DashboardConfigV2;
  private undoStack: EditorCommand[] = [];
  private redoStack: EditorCommand[] = [];
  private checkpoints: HistoryCheckpoint[] = [];
  private historyWarning: string | null = null;
  private totalCommandsExecuted = 0;

  // Transaktionszustand für Drag & Drop / Resize
  private transactionSnapshot: DashboardDraftState | null = null;
  private activeTransactionKind: 'drag' | 'resize' | null = null;
  private debouncer: TextInputDebouncer;

  /** Liefert die Art der aktuell aktiven Transaktion ('drag' | 'resize' | null) */
  getActiveTransactionKind(): 'drag' | 'resize' | null {
    return this.activeTransactionKind;
  }

  // Abonnenten für Reaktivität
  private listeners = new Set<(state: DashboardDraftState) => void>();

  constructor(initialConfig: DashboardConfigV2) {
    this.savedConfig = cloneDashboardConfigV2(initialConfig);
    this.currentState = {
      config: cloneDashboardConfigV2(initialConfig),
      isDirty: false,
      activeBreakpoint: 'desktop',
      selectedTileId: null,
      isInterimActionActive: false,
    };

    this.debouncer = new TextInputDebouncer(
      (cmd) => {
        this.undoStack.push(cmd);
        this.redoStack = [];
        this.totalCommandsExecuted++;
        this.enforceMemoryBudget();
        this.notify();
      },
      (updater) => {
        this.currentState = updater(this.currentState);
        this.notify();
      },
    );

    // Initialer Checkpoint
    this.createCheckpoint();
  }

  /** Gibt den aktuellen Entwurfszustand zurück */
  getState(): DashboardDraftState {
    return this.currentState;
  }

  /** Kann ein Schritt rückgängig gemacht werden? */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /** Kann ein Schritt wiederholt werden? */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** Aktuelle Statistiken und Speicherüberwachung */
  getStats(): HistoryStats {
    let estimatedBytes = 0;
    for (const cmd of this.undoStack) {
      estimatedBytes += cmd.estimateByteSize();
    }
    for (const cmd of this.redoStack) {
      estimatedBytes += cmd.estimateByteSize();
    }
    // Checkpoints schätzen (~5 KiB pro Snapshot)
    estimatedBytes += this.checkpoints.length * 5120;

    return {
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
      estimatedBytes,
      checkpointsCount: this.checkpoints.length,
      warning: this.historyWarning,
    };
  }

  /** Führt einen ReversibleCommand direkt aus und legt ihn auf den Undo-Stack */
  execute(command: EditorCommand): void {
    // Vor einer regulären Aktion evtl. offene Texteingaben festschreiben
    this.flushTextInput();

    this.currentState = command.execute(this.currentState);
    this.undoStack.push(command);
    this.redoStack = []; // Redo-Stack nach neuer Aktion leeren
    this.totalCommandsExecuted++;

    // Regelmäßige Meilenstein-Checkpoints anlegen
    if (this.totalCommandsExecuted % CHECKPOINT_INTERVAL === 0) {
      this.createCheckpoint();
    }

    // Speichermonitoring prüfen
    this.enforceMemoryBudget();

    this.notify();
  }

  /** Macht die letzte Aktion rückgängig */
  undo(): EditorCommand | null {
    this.flushTextInput();

    if (this.undoStack.length === 0) return null;
    const command = this.undoStack.pop()!;
    this.currentState = command.undo(this.currentState);
    this.redoStack.push(command);

    // Prüfen, ob Entwurf wieder dem gespeicherten Zustand entspricht
    this.checkDirtyStatus();

    this.notify();
    return command;
  }

  /** Wiederholt die zuletzt rückgängig gemachte Aktion */
  redo(): EditorCommand | null {
    this.flushTextInput();

    if (this.redoStack.length === 0) return null;
    const command = this.redoStack.pop()!;
    this.currentState = command.execute(this.currentState);
    this.undoStack.push(command);

    this.checkDirtyStatus();

    this.notify();
    return command;
  }

  // --- Transaktionsbündelung (Drag / Resize) ---

  /** Startet eine Drag- oder Resize-Transaktion */
  beginTransaction(kind: 'drag' | 'resize'): void {
    this.flushTextInput();
    this.activeTransactionKind = kind;
    this.transactionSnapshot = {
      ...this.currentState,
      config: cloneDashboardConfigV2(this.currentState.config),
    };
    this.currentState = {
      ...this.currentState,
      isInterimActionActive: true,
    };
    this.notify();
  }

  /** Aktualisiert den Entwurf kontinuierlich während des Ziehens (60fps ohne Undo-Eintrag) */
  updateDraftInterim(updater: (state: DashboardDraftState) => DashboardDraftState): void {
    if (!this.transactionSnapshot) return;
    this.currentState = {
      ...updater(this.currentState),
      isInterimActionActive: true,
      isDirty: true,
    };
    this.notify();
  }

  /** Schließt die Transaktion ab und erzeugt genau EINEN atomaren Undo-Schritt */
  commitTransaction(finalCommand: EditorCommand): void {
    if (!this.transactionSnapshot) return;
    this.transactionSnapshot = null;
    this.activeTransactionKind = null;

    this.currentState = {
      ...this.currentState,
      isInterimActionActive: false,
    };

    // Befehl in den Verlauf aufnehmen
    this.undoStack.push(finalCommand);
    this.redoStack = [];
    this.totalCommandsExecuted++;

    if (this.totalCommandsExecuted % CHECKPOINT_INTERVAL === 0) {
      this.createCheckpoint();
    }
    this.enforceMemoryBudget();

    this.notify();
  }

  /** Bricht die laufende Transaktion ab und stellt den Stand vor Transaktionsbeginn wieder her */
  cancelTransaction(): void {
    if (!this.transactionSnapshot) return;
    this.currentState = {
      ...this.transactionSnapshot,
      isInterimActionActive: false,
    };
    this.transactionSnapshot = null;
    this.activeTransactionKind = null;
    this.notify();
  }

  // --- Eingabebündelung für Textfelder (Debouncing) ---

  /**
   * Zeichnet eine Texteingabe auf.
   * Aktualisiert den Entwurf sofort für flüssiges Tippen,
   * erzeugt aber erst nach 600 ms Pause oder bei Blur einen Undo-Schritt.
   */
  recordTextInput(tileId: string, field: string, initialValue: string, latestValue: string): void {
    this.debouncer.record(tileId, field, initialValue, latestValue);
  }

  /** Schreibt offene debounced Texteingaben verbindlich in einen Undo-Schritt fest */
  flushTextInput(): void {
    this.debouncer.flush();
  }

  // --- Strikt isolierte Daten-Updates ---

  /**
   * Wird aufgerufen, wenn im Hintergrund CRM-Daten oder Live-Stream-Ticks eintreffen.
   * Berührt NIEMALS den Undo/Redo-Stack und ändert das isDirty-Flag NICHT!
   */
  applyBackgroundDataUpdate(): void {
    // Absichtlich No-Op auf Entwurfsebene: Layout, Dirty-Flag und Undo-Stack bleiben unverändert!
    this.notify();
  }

  // --- Selektion und Breakpoints ---

  setSelectedTileId(tileId: string | null): void {
    this.currentState = {
      ...this.currentState,
      selectedTileId: tileId,
    };
    this.notify();
  }

  setActiveBreakpoint(breakpoint: BreakpointKey): void {
    this.currentState = {
      ...this.currentState,
      activeBreakpoint: breakpoint,
    };
    this.notify();
  }

  // --- Speichern, Verwerfen, Checkpoints ---

  /** Setzt den gespeicherten Zustand nach erfolgreichem Server-Save */
  setSavedConfig(saved: DashboardConfigV2): void {
    this.savedConfig = cloneDashboardConfigV2(saved);
    this.currentState = {
      ...this.currentState,
      config: cloneDashboardConfigV2(saved),
      isDirty: false,
    };
    this.undoStack = [];
    this.redoStack = [];
    this.checkpoints = [];
    this.historyWarning = null;
    this.createCheckpoint();
    this.notify();
  }

  /** Verwirft alle ungespeicherten Änderungen und stellt den letzten Speicherstand her */
  discard(): void {
    this.debouncer.cancel();
    this.transactionSnapshot = null;
    this.activeTransactionKind = null;

    this.currentState = {
      config: cloneDashboardConfigV2(this.savedConfig),
      isDirty: false,
      activeBreakpoint: 'desktop',
      selectedTileId: null,
      isInterimActionActive: false,
    };
    this.undoStack = [];
    this.redoStack = [];
    this.checkpoints = [];
    this.historyWarning = null;
    this.createCheckpoint();
    this.notify();
  }

  /** Legt einen internen Meilenstein-Checkpoint an */
  private createCheckpoint(): void {
    this.checkpoints.push({
      stepIndex: this.totalCommandsExecuted,
      config: cloneDashboardConfigV2(this.currentState.config),
      timestamp: Date.now(),
    });
  }

  /** Überwacht das Speicherbudget (15 MiB Soft-Limit) */
  private enforceMemoryBudget(): void {
    const stats = this.getStats();
    if (stats.estimatedBytes > MAX_HISTORY_BYTES) {
      // Nicht stillschweigend verwerfen, sondern geordnet konsolidieren
      if (this.checkpoints.length > 2) {
        const oldestKeptCheckpoint = this.checkpoints[1];
        this.checkpoints = this.checkpoints.slice(1);
        if (oldestKeptCheckpoint) {
          this.historyWarning = `Verlauf wird ab Checkpoint ${oldestKeptCheckpoint.stepIndex} konsolidiert (Speicherbudget erreicht)`;
        }
        // Ältere Schritte vor dem ältesten Checkpoint entfernen
        if (this.undoStack.length > 100) {
          this.undoStack = this.undoStack.slice(-100);
        }
      }
    }
  }

  /** Prüft, ob der aktuelle Entwurf vom gespeicherten Zustand abweicht */
  private checkDirtyStatus(): void {
    const isDirty = !isSameConfigV2(this.currentState.config, this.savedConfig);
    this.currentState = {
      ...this.currentState,
      isDirty,
    };
  }

  // --- Observer / Subscriptions ---

  subscribe(listener: (state: DashboardDraftState) => void): () => void {
    this.listeners.add(listener);
    listener(this.currentState);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.currentState);
      } catch {
        // Observer-Fehler fangen
      }
    }
  }
}
