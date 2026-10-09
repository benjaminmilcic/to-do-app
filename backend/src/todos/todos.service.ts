import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CreateTodoDto, UpdateTodoDto } from './dto/todo.dto.js';
import { SyncGateway } from './sync.gateway.js';
import { Todo } from './todo.entity.js';

@Injectable()
export class TodosService {
  constructor(
    @InjectRepository(Todo) private readonly todos: Repository<Todo>,
    private readonly sync: SyncGateway,
  ) {}

  list(userId: string): Promise<Todo[]> {
    return this.todos.find({
      where: { userId },
      order: { position: 'ASC', createdAt: 'DESC' },
    });
  }

  async create(
    userId: string,
    dto: CreateTodoDto,
    socketId?: string,
  ): Promise<Todo> {
    // Retried request with the same id: return what was stored the first time.
    const existing = await this.todos.findOne({ where: { id: dto.id } });
    if (existing) {
      if (existing.userId !== userId) {
        throw new NotFoundException();
      }
      return existing;
    }

    // New todos go to the top of the list.
    const { min } = (await this.todos
      .createQueryBuilder('todo')
      .select('MIN(todo.position)', 'min')
      .where('todo.userId = :userId', { userId })
      .getRawOne<{ min: number | null }>()) ?? { min: null };

    const todo = await this.todos.save(
      this.todos.create({
        id: dto.id,
        userId,
        title: dto.title,
        notes: dto.notes ?? null,
        dueDate: dto.dueDate ?? null,
        done: false,
        completedAt: null,
        position: min === null ? 0 : Number(min) - 1,
      }),
    );
    this.sync.broadcast(userId, 'todo:upsert', todo, socketId);
    return todo;
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateTodoDto,
    socketId?: string,
  ): Promise<Todo> {
    const todo = await this.findOwned(userId, id);

    if (dto.title !== undefined) todo.title = dto.title;
    if (dto.notes !== undefined) todo.notes = dto.notes;
    if (dto.dueDate !== undefined) todo.dueDate = dto.dueDate;
    if (dto.position !== undefined) todo.position = dto.position;
    if (dto.done !== undefined && dto.done !== todo.done) {
      todo.done = dto.done;
      todo.completedAt = dto.done ? new Date() : null;
    }

    const saved = await this.todos.save(todo);
    this.sync.broadcast(userId, 'todo:upsert', saved, socketId);
    return saved;
  }

  async remove(userId: string, id: string, socketId?: string): Promise<void> {
    const result = await this.todos.delete({ id, userId });
    if (!result.affected) {
      // Already gone (e.g. deleted on another device): nothing to do.
      return;
    }
    this.sync.broadcast(userId, 'todo:delete', { ids: [id] }, socketId);
  }

  /** Deletes all completed todos and returns their ids. */
  async clearCompleted(userId: string, socketId?: string): Promise<string[]> {
    const done = await this.todos.find({
      where: { userId, done: true },
      select: { id: true },
    });
    const ids = done.map((t) => t.id);
    if (ids.length > 0) {
      await this.todos.delete({ userId, id: In(ids) });
      this.sync.broadcast(userId, 'todo:delete', { ids }, socketId);
    }
    return ids;
  }

  private async findOwned(userId: string, id: string): Promise<Todo> {
    const todo = await this.todos.findOne({ where: { id, userId } });
    if (!todo) {
      throw new NotFoundException('Todo not found');
    }
    return todo;
  }
}
