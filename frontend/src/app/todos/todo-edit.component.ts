import { Component, Input, inject, type OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonTextarea,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular';
import { TranslocoPipe } from '@jsverse/transloco';
import type { Todo } from '../core/api';
import type { TodoPatch } from './todo.store';

export type EditResult =
  { action: 'save'; patch: TodoPatch } | { action: 'delete' };

/** Edit dialog for a single todo. Returns an EditResult via dismiss(). */
@Component({
  selector: 'app-todo-edit',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="cancel()">{{ 'edit.cancel' | transloco }}</ion-button>
        </ion-buttons>
        <ion-title>{{ 'edit.heading' | transloco }}</ion-title>
        <ion-buttons slot="end">
          <ion-button strong [disabled]="!title.trim()" (click)="save()">
            {{ 'edit.save' | transloco }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <form class="fields" (ngSubmit)="save()">
        <ion-input
          [label]="'edit.title' | transloco"
          labelPlacement="floating"
          fill="outline"
          name="title"
          maxlength="500"
          required
          [(ngModel)]="title"
        />
        <ion-textarea
          [label]="'edit.notes' | transloco"
          labelPlacement="floating"
          fill="outline"
          name="notes"
          maxlength="10000"
          [autoGrow]="true"
          rows="4"
          [(ngModel)]="notes"
        />
        <div class="due">
          <ion-input
            [label]="'edit.dueDate' | transloco"
            labelPlacement="stacked"
            fill="outline"
            type="date"
            name="dueDate"
            [(ngModel)]="dueDate"
          />
          <ion-input
            [label]="'edit.dueTime' | transloco"
            labelPlacement="stacked"
            fill="outline"
            type="time"
            name="dueTime"
            [disabled]="!dueDate"
            [helperText]="dueDate ? '' : ('edit.dueTimeHint' | transloco)"
            [(ngModel)]="dueTime"
          />
        </div>
        <ion-button
          class="delete"
          expand="block"
          fill="clear"
          color="danger"
          (click)="remove()"
        >
          {{ 'edit.delete' | transloco }}
        </ion-button>
      </form>
    </ion-content>
  `,
  styles: `
    .fields {
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-width: 560px;
      margin: 0 auto;
    }
    .due {
      display: grid;
      /* The time label is the longer one in every language
         ("Vrijeme (neobavezno)"), the date value needs less room. */
      grid-template-columns: minmax(0, 4fr) minmax(0, 5fr);
      gap: 12px;
    }
    /* Very narrow phones: date and time below each other. */
    @media (max-width: 359px) {
      .due {
        grid-template-columns: minmax(0, 1fr);
      }
    }
    .delete {
      margin-top: 16px;
    }
  `,
  imports: [
    FormsModule,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonInput,
    IonTextarea,
    IonTitle,
    IonToolbar,
    TranslocoPipe,
  ],
})
export class TodoEditComponent implements OnInit {
  private readonly modal = inject(ModalController);

  /** Set through ModalController componentProps. */
  @Input({ required: true }) todo!: Todo;

  protected title = '';
  protected notes = '';
  protected dueDate = '';
  protected dueTime = '';

  ngOnInit(): void {
    const todo = this.todo;
    this.title = todo.title;
    this.notes = todo.notes ?? '';
    this.dueDate = todo.dueDate ?? '';
    this.dueTime = todo.dueTime ?? '';
  }

  protected cancel(): void {
    void this.modal.dismiss();
  }

  protected save(): void {
    const title = this.title.trim();
    if (!title) {
      return;
    }
    const todo = this.todo;
    const patch: TodoPatch = {};
    if (title !== todo.title) patch.title = title;
    const notes = this.notes.trim() || null;
    if (notes !== todo.notes) patch.notes = notes;
    const dueDate = this.dueDate || null;
    if (dueDate !== todo.dueDate) patch.dueDate = dueDate;
    // A time only counts together with a date.
    const dueTime = (dueDate && this.dueTime) || null;
    if (dueTime !== todo.dueTime) patch.dueTime = dueTime;

    const result: EditResult = { action: 'save', patch };
    void this.modal.dismiss(result);
  }

  protected remove(): void {
    const result: EditResult = { action: 'delete' };
    void this.modal.dismiss(result);
  }
}
