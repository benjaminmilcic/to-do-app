import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { type Observable, Subject, firstValueFrom } from 'rxjs';
import { API_URL, type Todo } from '../core/api';
import { AuthService } from '../core/auth.service';
import { SyncService } from '../core/sync.service';

export type TodoPatch = Partial<
  Pick<Todo, 'title' | 'notes' | 'done' | 'dueDate' | 'dueTime' | 'position'>
>;

const CACHE_KEY = 'todo.cache';

/**
 * Single source of truth for the todo list on this device.
 *
 * Every change is applied locally first (optimistic UI) and then sent to the
 * API. If the API rejects it, the list is reloaded from the server. Changes
 * from other devices arrive through the sync connection.
 */
@Injectable({ providedIn: 'root' })
export class TodoStore {
  private readonly http = inject(HttpClient);
  private readonly sync = inject(SyncService);
  private readonly auth = inject(AuthService);

  private readonly _todos = signal<Todo[]>([]);
  readonly loading = signal(false);
  readonly loaded = signal(false);
  /** Translation keys of user-facing errors (shown as toasts). */
  readonly errors$ = new Subject<string>();

  readonly open = computed(() =>
    this._todos()
      .filter((t) => !t.done)
      .sort((a, b) => a.position - b.position),
  );
  readonly done = computed(() =>
    this._todos()
      .filter((t) => t.done)
      .sort((a, b) =>
        (b.completedAt ?? b.updatedAt).localeCompare(
          a.completedAt ?? a.updatedAt,
        ),
      ),
  );

  private started = false;

  constructor() {
    this.auth.onLogout(() => {
      this._todos.set([]);
      this.loaded.set(false);
      void Preferences.remove({ key: CACHE_KEY });
    });
  }

  /** Loads the list and subscribes to live updates. Safe to call repeatedly. */
  async start(): Promise<void> {
    if (!this.started) {
      this.started = true;
      this.sync.upserted$.subscribe((todo) => this.applyUpsert(todo));
      this.sync.deleted$.subscribe((ids) => this.applyDelete(ids));
      // Reload after every reconnect: catches everything missed while offline.
      this.sync.connected$.subscribe(() => void this.reload());
      document.addEventListener('visibilitychange', () => {
        if (
          document.visibilityState === 'visible' &&
          this.sync.status() !== 'online'
        ) {
          void this.reload();
        }
      });
      await this.restoreCache();
    }
    this.sync.connect();
    await this.reload();
  }

  async reload(): Promise<void> {
    if (!this.auth.isLoggedIn()) {
      return;
    }
    this.loading.set(true);
    try {
      const todos = await firstValueFrom(
        this.http.get<Todo[]>(`${API_URL}/todos`),
      );
      this._todos.set(todos);
      this.loaded.set(true);
      void this.saveCache();
    } catch {
      if (!this.loaded()) {
        this.errors$.next(
          'todos.errors.load',
        );
      }
    } finally {
      this.loading.set(false);
    }
  }

  async add(title: string, dueDate: string | null = null): Promise<void> {
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }
    const now = new Date().toISOString();
    const minPosition = Math.min(0, ...this._todos().map((t) => t.position));
    const todo: Todo = {
      id: newId(),
      title: trimmed,
      notes: null,
      done: false,
      dueDate,
      dueTime: null,
      position: minPosition - 1,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.applyUpsert(todo);

    await this.write(
      this.http.post<Todo>(`${API_URL}/todos`, {
        id: todo.id,
        title: todo.title,
        dueDate,
      }),
      'todos.errors.save',
    );
  }

  async update(id: string, patch: TodoPatch): Promise<void> {
    const current = this._todos().find((t) => t.id === id);
    if (!current) {
      return;
    }
    const optimistic: Todo = { ...current, ...patch };
    // Same rule as the API: no date, no time.
    if (!optimistic.dueDate) {
      optimistic.dueTime = null;
    }
    if (patch.done !== undefined && patch.done !== current.done) {
      optimistic.completedAt = patch.done ? new Date().toISOString() : null;
    }
    this.applyUpsert(optimistic);

    await this.write(
      this.http.patch<Todo>(`${API_URL}/todos/${id}`, patch),
      'todos.errors.update',
    );
  }

  toggle(todo: Todo): Promise<void> {
    return this.update(todo.id, { done: !todo.done });
  }

  async remove(id: string): Promise<void> {
    this.applyDelete([id]);
    await this.write(
      this.http.delete<void>(`${API_URL}/todos/${id}`),
      'todos.errors.delete',
    );
  }

  /** Re-inserts a deleted todo (undo). */
  async restore(todo: Todo): Promise<void> {
    this.applyUpsert(todo);
    await this.write(
      this.http.post<Todo>(`${API_URL}/todos`, {
        id: todo.id,
        title: todo.title,
        notes: todo.notes,
        dueDate: todo.dueDate,
        dueTime: todo.dueTime,
      }),
      'todos.errors.restore',
    );
    // The server creates restored todos as open and on top; put back the
    // original state.
    await this.update(todo.id, { done: todo.done, position: todo.position });
  }

  async clearCompleted(): Promise<void> {
    const ids = this.done().map((t) => t.id);
    if (ids.length === 0) {
      return;
    }
    this.applyDelete(ids);
    await this.write(
      this.http.delete<{ ids: string[] }>(`${API_URL}/todos/completed`),
      'todos.errors.clearDone',
    );
  }

  /** Moves an open todo from one index to another (drag & drop). */
  async move(from: number, to: number): Promise<void> {
    const list = [...this.open()];
    const [moved] = list.splice(from, 1);
    if (!moved || from === to) {
      return;
    }
    list.splice(to, 0, moved);

    // Place it between its new neighbours; positions are floats, so only
    // the moved item changes.
    const before = list[to - 1]?.position;
    const after = list[to + 1]?.position;
    let position: number;
    if (before === undefined && after === undefined) {
      position = 0;
    } else if (before === undefined) {
      position = after! - 1;
    } else if (after === undefined) {
      position = before + 1;
    } else {
      position = (before + after) / 2;
    }
    await this.update(moved.id, { position });
  }

  private async write<T>(
    request: Observable<T>,
    errorKey: string,
  ): Promise<void> {
    try {
      const result = await firstValueFrom(request);
      if (result && typeof result === 'object' && 'id' in result) {
        this.applyUpsert(result as unknown as Todo);
      }
      void this.saveCache();
    } catch {
      this.errors$.next(errorKey);
      await this.reload();
    }
  }

  private applyUpsert(todo: Todo): void {
    this._todos.update((list) => {
      const index = list.findIndex((t) => t.id === todo.id);
      if (index === -1) {
        return [...list, todo];
      }
      const copy = [...list];
      copy[index] = todo;
      return copy;
    });
  }

  private applyDelete(ids: string[]): void {
    const set = new Set(ids);
    this._todos.update((list) => list.filter((t) => !set.has(t.id)));
  }

  private async restoreCache(): Promise<void> {
    const userId = this.auth.user()?.id;
    const { value } = await Preferences.get({ key: CACHE_KEY });
    if (!value || !userId) {
      return;
    }
    try {
      const cache = JSON.parse(value) as { userId: string; todos: Todo[] };
      if (cache.userId === userId && !this.loaded()) {
        this._todos.set(cache.todos);
      }
    } catch {
      // Corrupt cache: ignore, the server list replaces it anyway.
    }
  }

  private async saveCache(): Promise<void> {
    const userId = this.auth.user()?.id;
    if (!userId) {
      return;
    }
    await Preferences.set({
      key: CACHE_KEY,
      value: JSON.stringify({ userId, todos: this._todos() }),
    });
  }
}

function newId(): string {
  if (window.isSecureContext) {
    return crypto.randomUUID();
  }
  // Fallback for insecure contexts (e.g. testing over plain http on a LAN IP).
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
