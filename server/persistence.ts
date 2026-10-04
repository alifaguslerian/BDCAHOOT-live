import { Worker } from 'node:worker_threads';
import { join, resolve } from 'node:path';
import type { LibraryRequest, LibraryResult } from '../types/quizLibrary';

export interface Persistence {
  initial: Buffer | null;
  save(data: Buffer): Promise<void>;
  close(): Promise<void>;
  library?(request: LibraryRequest): Promise<LibraryResult>;
}

export class SnapshotStore implements Persistence {
  initial: Buffer | null = null;
  private worker: Worker;
  private sequence = 0;
  private pending = new Map<number, { resolve: (data: unknown) => void; reject: (error: Error) => void }>();
  private failed?: Error;
  private closed = false;
  private closePromise?: Promise<void>;
  private constructor(path: string) {
    this.worker = new Worker(join(__dirname, 'persistenceWorker.mjs'), { workerData: { path: resolve(path) } });
    this.worker.on('message', (message: { id: number; data?: unknown; error?: string; expected?: boolean }) => {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) { const error = Error(message.error); if (!message.expected) this.failed = error; pending.reject(error); }
      else pending.resolve(message.data);
    });
    const fail = (error: Error) => {
      this.failed = error;
      for (const pending of this.pending.values()) pending.reject(error);
      this.pending.clear();
    };
    this.worker.on('error', fail);
    this.worker.on('exit', code => { if (!this.closed) fail(Error(`Storage worker stopped (${code})`)); });
  }
  static async open(path: string): Promise<SnapshotStore> {
    const store = new SnapshotStore(path);
    try {
      const data = await new Promise<unknown>((resolve, reject) => store.pending.set(0, { resolve, reject }));
      store.initial = data ? Buffer.from(data as Uint8Array) : null;
      return store;
    } catch (error) { await store.worker.terminate(); throw error; }
  }
  async library(request: LibraryRequest): Promise<LibraryResult> {
    if (this.failed) throw this.failed;
    if (this.closed || this.closePromise) throw Error('Storage closed');
    const id = ++this.sequence;
    return new Promise<LibraryResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(Error('Konfirmasi penyimpanan kuis belum diterima. Muat ulang sebelum mencoba lagi.'));
      }, 5000);
      this.pending.set(id, { resolve: data => { clearTimeout(timer); resolve(data as LibraryResult); }, reject: error => { clearTimeout(timer); reject(error); } });
      this.worker.postMessage({ id, library: request });
    });
  }
  async save(data: Buffer): Promise<void> {
    if (this.failed) throw this.failed;
    if (this.closed || this.closePromise) throw Error('Storage closed');
    const id = ++this.sequence;
    await new Promise<void>((resolve, reject) => {
      this.pending.set(id, { resolve: () => resolve(), reject });
      this.worker.postMessage({ id, data });
    });
  }
  close(): Promise<void> { return this.closePromise ??= this.closeOnce(); }
  private async closeOnce(): Promise<void> {
    if (this.closed) return;
    if (this.failed) { this.closed = true; await this.worker.terminate(); return; }
    const id = ++this.sequence;
    await new Promise<void>((resolve, reject) => {
      this.pending.set(id, { resolve: () => { this.closed = true; resolve(); }, reject });
      this.worker.postMessage({ id, close: true });
    });
  }
}
