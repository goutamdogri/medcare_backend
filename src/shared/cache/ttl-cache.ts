/**
 * Minimal in-memory TTL cache for read-heavy, slowly-changing data
 * (master tables). Single-process only — sufficient for this API's scale.
 */
interface Entry<T> {
  value: T;
  expiresAt: number;
}

export class TtlCache<T> {
  private store = new Map<string, Entry<T>>();

  constructor(private readonly ttlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    if (this.store.size > 1000) this.store.clear(); // crude overflow guard
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  /** Cache-aside helper: returns cached value or computes/stores it. */
  async wrap(key: string, compute: () => Promise<T>): Promise<T> {
    const hit = this.get(key);
    if (hit !== undefined) return hit;
    const value = await compute();
    this.set(key, value);
    return value;
  }
}
