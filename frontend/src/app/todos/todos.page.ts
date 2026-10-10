import { DatePipe } from '@angular/common';
import {
  Component,
  DestroyRef,
  type ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  IonAvatar,
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonList,
  IonPopover,
  IonRefresher,
  IonRefresherContent,
  IonReorder,
  IonReorderGroup,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ModalController,
  ToastController,
  type RefresherEventDetail,
  type ReorderEndCustomEvent,
} from '@ionic/angular';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { addIcons } from 'ionicons';
import {
  add,
  calendarOutline,
  checkmark,
  close,
  checkmarkDoneOutline,
  cloudOfflineOutline,
  contrastOutline,
  documentTextOutline,
  downloadOutline,
  languageOutline,
  logOutOutline,
  micOutline,
  trashOutline,
} from 'ionicons/icons';
import type { Todo } from '../core/api';
import { AuthService } from '../core/auth.service';
import { ClientConfigService } from '../core/client-config.service';
import { LanguageService } from '../core/i18n';
import { SyncService } from '../core/sync.service';
import {
  VoiceInputError,
  VoiceInputService,
} from '../core/voice-input.service';
import { LanguageSwitchComponent } from '../shared/language-switch.component';
import { ThemeSwitchComponent } from '../shared/theme-switch.component';
import { VoiceWaveformComponent } from '../shared/voice-waveform.component';
import { TodoEditComponent, type EditResult } from './todo-edit.component';
import { TodoStore } from './todo.store';

type Filter = 'open' | 'done';

@Component({
  selector: 'app-todos',
  templateUrl: './todos.page.html',
  styleUrl: './todos.page.scss',
  imports: [
    DatePipe,
    FormsModule,
    IonAvatar,
    IonButton,
    IonButtons,
    IonCheckbox,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonItemOption,
    IonItemOptions,
    IonItemSliding,
    IonLabel,
    IonList,
    IonPopover,
    IonRefresher,
    IonRefresherContent,
    IonReorder,
    IonReorderGroup,
    IonSegment,
    IonSegmentButton,
    IonSpinner,
    IonTitle,
    IonToolbar,
    LanguageSwitchComponent,
    ThemeSwitchComponent,
    TranslocoPipe,
    VoiceWaveformComponent,
  ],
})
export class TodosPage {
  protected readonly store = inject(TodoStore);
  protected readonly auth = inject(AuthService);
  protected readonly sync = inject(SyncService);
  protected readonly clientConfig = inject(ClientConfigService);
  protected readonly language = inject(LanguageService);
  protected readonly voice = inject(VoiceInputService);
  private readonly transloco = inject(TranslocoService);
  private readonly modals = inject(ModalController);
  private readonly toasts = inject(ToastController);

  protected readonly filter = signal<Filter>('open');
  protected readonly visible = computed(() =>
    this.filter() === 'open' ? this.store.open() : this.store.done(),
  );
  protected readonly initials = computed(() => {
    const name = this.auth.user()?.displayName ?? '';
    return (
      name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || '?'
    );
  });
  /** Current time, refreshed every minute so "today"/"overdue" stay right. */
  private readonly now = signal(new Date());
  private readonly clock = setInterval(() => this.now.set(new Date()), 60_000);

  protected newTitle = '';
  private readonly titleInput =
    viewChild<ElementRef<HTMLInputElement>>('titleInput');

  constructor() {
    addIcons({
      add,
      calendarOutline,
      checkmark,
      checkmarkDoneOutline,
      close,
      cloudOfflineOutline,
      contrastOutline,
      documentTextOutline,
      downloadOutline,
      languageOutline,
      logOutOutline,
      micOutline,
      trashOutline,
    });

    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => {
      clearInterval(this.clock);
      // Never leave the microphone on when the page goes away.
      void this.voice.cancel();
    });
    this.store.errors$
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((key) => void this.toast(this.transloco.translate(key)));

    void this.clientConfig.load();
    void this.store.start();
  }

  protected setFilter(value: unknown): void {
    this.filter.set(value === 'done' ? 'done' : 'open');
  }

  protected async addTodo(): Promise<void> {
    const title = this.newTitle.trim();
    if (!title) {
      return;
    }
    this.newTitle = '';
    if (this.filter() !== 'open') {
      this.filter.set('open');
    }
    await this.store.add(title);
  }

  /**
   * First tap starts recording, second tap stops it and appends the
   * recognised text to the input (to be checked, then added with +).
   */
  protected async toggleRecording(): Promise<void> {
    try {
      if (this.voice.state() === 'idle') {
        await this.voice.start();
        return;
      }
      const text = cleanTranscript(await this.voice.stop());
      if (!text) {
        void this.toast(this.transloco.translate('voice.errors.empty'));
        return;
      }
      this.newTitle = this.newTitle.trim()
        ? `${this.newTitle.trimEnd()} ${text}`
        : text;
      // The input is back after the recording; put the cursor at the end.
      setTimeout(() => this.titleInput()?.nativeElement.focus());
    } catch (error) {
      const key =
        error instanceof VoiceInputError ? error.message : 'voice.errors.failed';
      void this.toast(this.transloco.translate(key));
    }
  }

  protected toggle(todo: Todo): void {
    void this.store.toggle(todo);
  }

  protected async remove(todo: Todo, sliding?: IonItemSliding): Promise<void> {
    await sliding?.close();
    void this.store.remove(todo.id);
    const toast = await this.toasts.create({
      message: this.transloco.translate('todos.deleted'),
      duration: 4000,
      position: 'bottom',
      buttons: [
        {
          text: this.transloco.translate('todos.undo'),
          handler: () => void this.store.restore(todo),
        },
      ],
    });
    await toast.present();
  }

  protected async edit(todo: Todo): Promise<void> {
    const modal = await this.modals.create({
      component: TodoEditComponent,
      componentProps: { todo },
    });
    await modal.present();
    const { data } = await modal.onWillDismiss<EditResult>();
    if (data?.action === 'save' && Object.keys(data.patch).length > 0) {
      void this.store.update(todo.id, data.patch);
    } else if (data?.action === 'delete') {
      void this.remove(todo);
    }
  }

  protected reorder(event: ReorderEndCustomEvent): void {
    // Also fires when the item was dropped where it started (from === to);
    // move() then does nothing.
    const { from, to } = event.detail;
    // The store re-sorts the list itself; let Ionic only finish the gesture.
    event.detail.complete(false);
    void this.store.move(from, to);
  }

  protected async refresh(
    event: CustomEvent<RefresherEventDetail>,
  ): Promise<void> {
    await this.store.reload();
    await (event.target as HTMLIonRefresherElement).complete();
  }

  protected async clearCompleted(): Promise<void> {
    await this.store.clearCompleted();
  }

  protected async logout(popover: IonPopover): Promise<void> {
    await popover.dismiss();
    await this.auth.logout();
  }

  /**
   * "overdue" once the due date - or, if set, the due time - has passed;
   * "today" for anything still due today. Uses local time, like the inputs.
   */
  protected dueState(todo: Todo): 'overdue' | 'today' | null {
    if (!todo.dueDate) {
      return null;
    }
    const now = this.now();
    const today = localDate(now);
    if (todo.dueDate < today) {
      return 'overdue';
    }
    if (todo.dueDate > today) {
      return null;
    }
    if (todo.dueTime && todo.dueTime <= localTime(now)) {
      return 'overdue';
    }
    return 'today';
  }

  private async toast(message: string): Promise<void> {
    const toast = await this.toasts.create({
      message,
      duration: 3500,
      color: 'danger',
      position: 'bottom',
    });
    await toast.present();
  }
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "YYYY-MM-DD" in local time (toISOString() would use UTC). */
function localDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "HH:mm" in local time. */
function localTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Whisper writes sentences ("Milch kaufen."), a todo title is no sentence:
 * drop trailing punctuation and surrounding whitespace.
 */
function cleanTranscript(text: string): string {
  return text.trim().replace(/[.!?。]+$/u, '').trim();
}
