import { BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateTodoDto } from './dto/todo.dto.js';
import { Todo } from './todo.entity.js';
import { TodosService } from './todos.service.js';

/** Minimal in-memory repository holding a single todo. */
function setup(initial: Partial<Todo>) {
  const todo = { id: 't1', userId: 'u1', done: false, ...initial } as Todo;
  const repo = {
    findOne: async () => ({ ...todo }),
    save: async (t: Todo) => t,
  };
  const sync = { broadcast: () => undefined };
  return new TodosService(repo as never, sync as never);
}

const patch = (service: TodosService, dto: Partial<UpdateTodoDto>) =>
  service.update('u1', 't1', dto as UpdateTodoDto);

describe('due time', () => {
  it('accepts valid and rejects invalid times', async () => {
    for (const [value, ok] of [
      ['09:30', true],
      ['23:59', true],
      ['24:00', false],
      ['9:30', false],
      ['09:30:00', false],
    ] as const) {
      const errors = await validate(
        plainToInstance(UpdateTodoDto, { dueTime: value }),
      );
      expect(errors.length === 0).toBe(ok);
    }
  });

  it('sets a time on a todo with a date', async () => {
    const service = setup({ dueDate: '2026-10-12', dueTime: null });
    const saved = await patch(service, { dueTime: '14:15' });
    expect(saved.dueTime).toBe('14:15');
  });

  it('removes the time together with the date', async () => {
    const service = setup({ dueDate: '2026-10-12', dueTime: '14:15' });
    const saved = await patch(service, { dueDate: null });
    expect(saved.dueDate).toBeNull();
    expect(saved.dueTime).toBeNull();
  });

  it('rejects a time without a date', async () => {
    const service = setup({ dueDate: null, dueTime: null });
    await expect(patch(service, { dueTime: '14:15' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
