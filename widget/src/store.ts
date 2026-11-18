import type { DesignState } from './types';

const HISTORY_LIMIT = 100;
const COALESCE_MS = 1200;

/** Holds the design and an undo/redo history of JSON snapshots. */
export class Store {
  state: DesignState;
  private past: string[] = [];
  private future: string[] = [];
  private lastKey: string | null = null;
  private lastTime = 0;
  private listeners = new Set<() => void>();

  constructor(initial: DesignState) {
    this.state = initial;
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /**
   * Apply a change. Changes sharing the same `key` in quick succession
   * (slider drags, element drags) become one undo step.
   */
  commit(fn: (s: DesignState) => void, key?: string): void {
    const now = performance.now();
    // Pointer drags end explicitly with endGroup(), so they never split on a pause.
    const coalesce = key !== undefined && key === this.lastKey && (key === 'drag' || now - this.lastTime < COALESCE_MS);
    const before = JSON.stringify(this.state);
    fn(this.state);
    if (JSON.stringify(this.state) === before) return; // nothing changed: no empty undo step
    if (!coalesce) {
      this.past.push(before);
      if (this.past.length > HISTORY_LIMIT) this.past.shift();
      this.future = [];
    }
    this.lastKey = key ?? null;
    this.lastTime = now;
    this.emit();
  }

  /** Ends a coalescing group (e.g. on pointer up / slider release). */
  endGroup(): void {
    this.lastKey = null;
  }

  undo(): void {
    const prev = this.past.pop();
    if (!prev) return;
    this.future.push(JSON.stringify(this.state));
    this.state = JSON.parse(prev);
    this.lastKey = null;
    this.emit();
  }

  redo(): void {
    const next = this.future.pop();
    if (!next) return;
    this.past.push(JSON.stringify(this.state));
    this.state = JSON.parse(next);
    this.lastKey = null;
    this.emit();
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  private emit(): void {
    this.listeners.forEach((fn) => fn());
  }
}
