import { Worker } from 'node:worker_threads';
import { join, resolve } from 'node:path';

export interface Persistence {
  initial: Buffer | null;
  save(data: Buffer): Promise<void>;
  close(): Promise<void>;
}

export class SnapshotStore implements Persistence {
  initial: Buffer | null = null;
  private worker: Worker;
  private sequence = 0;
  private pending = new Map<number, { resolve: (data?: Uint8Array | null) => void; reject: (error: Error) => void }>();
  private failed?: Error;
  private closed = false;
  private closePromise?: Promise<void>;
  private constructor(path: string) {
    this.worker = new Worker(join(__dirname, 'persistenceWorker.mjs'), { workerData: { path: resolve(path) } });
    this.worker.on('message', (message: { id: number; data?: Uint8Array | null; error?: string }) => {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) { this.failed = Error(message.error); pending.reject(this.failed); }
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
      const data = await new Promise<Uint8Array | null | undefined>((resolve, reject) => store.pending.set(0, { resolve, reject }));
      store.initial = data ? Buffer.from(data) : null;
      return store;
    } catch (error) { await store.worker.terminate(); throw error; }
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
