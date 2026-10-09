import { DatePipe } from '@angular/common';
import {
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
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
  IonTitle,
  IonToolbar,
  ModalController,
  ToastController,
  type ItemReorderEventDetail,
  type RefresherEventDetail,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  add,
  calendarOutline,
  checkmarkDoneOutline,
  cloudOfflineOutline,
  documentTextOutline,
  downloadOutline,
  logOutOutline,
  trashOutline,
} from 'ionicons/icons';
import type { Todo } from '../core/api';
import { AuthService } from '../core/auth.service';
import { ClientConfigService } from '../core/client-config.service';
import { SyncService } from '../core/sync.service';
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
    IonTitle,
    IonToolbar,
  ],
})
export class TodosPage {
  protected readonly store = inject(TodoStore);
  protected readonly auth = inject(AuthService);
  protected readonly sync = inject(SyncService);
  protected readonly clientConfig = inject(ClientConfigService);
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
  protected readonly today = new Date().toISOString().slice(0, 10);

  protected newTitle = '';

  constructor() {
    addIcons({
      add,
      calendarOutline,
      checkmarkDoneOutline,
      cloudOfflineOutline,
      documentTextOutline,
      downloadOutline,
      logOutOutline,
      trashOutline,
    });

    this.store.errors$
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe((message) => void this.toast(message));

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

  protected toggle(todo: Todo): void {
    void this.store.toggle(todo);
  }

  protected async remove(todo: Todo, sliding?: IonItemSliding): Promise<void> {
    await sliding?.close();
    void this.store.remove(todo.id);
    const toast = await this.toasts.create({
      message: 'Aufgabe gelöscht',
      duration: 4000,
      position: 'bottom',
      buttons: [
        {
          text: 'Rückgängig',
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

  protected reorder(event: CustomEvent<ItemReorderEventDetail>): void {
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
