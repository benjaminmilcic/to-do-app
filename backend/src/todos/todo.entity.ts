import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'todo_items' })
@Index(['userId', 'position'])
export class Todo {
  /**
   * Generated on the client (UUID v4) so that a todo has a stable identity
   * before the server acknowledged it. The server validates the format.
   */
  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  @Column({ name: 'user_id', type: 'char', length: 36 })
  userId: string;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'boolean', default: false })
  done: boolean;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: string | null;

  /** Sort order within the user's list (ascending). */
  @Column({ type: 'double', default: 0 })
  position: number;

  @Column({
    name: 'completed_at',
    type: 'datetime',
    precision: 3,
    nullable: true,
  })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
  updatedAt: Date;
}
