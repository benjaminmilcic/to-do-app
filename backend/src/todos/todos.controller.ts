import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Auth, JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AccessTokenPayload } from '../auth/tokens.service.js';
import { CreateTodoDto, UpdateTodoDto } from './dto/todo.dto.js';
import { TodosService } from './todos.service.js';

/**
 * `X-Socket-Id` identifies the caller's own sync connection so that the
 * change is not echoed back to the device that made it.
 */
@Controller('todos')
@UseGuards(JwtAuthGuard)
export class TodosController {
  constructor(private readonly todos: TodosService) {}

  @Get()
  list(@Auth() auth: AccessTokenPayload) {
    return this.todos.list(auth.sub);
  }

  @Post()
  create(
    @Auth() auth: AccessTokenPayload,
    @Body() dto: CreateTodoDto,
    @Headers('x-socket-id') socketId?: string,
  ) {
    return this.todos.create(auth.sub, dto, socketId);
  }

  // Declared before ':id' so that "completed" is not parsed as an id.
  @Delete('completed')
  async clearCompleted(
    @Auth() auth: AccessTokenPayload,
    @Headers('x-socket-id') socketId?: string,
  ) {
    return { ids: await this.todos.clearCompleted(auth.sub, socketId) };
  }

  @Patch(':id')
  update(
    @Auth() auth: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTodoDto,
    @Headers('x-socket-id') socketId?: string,
  ) {
    return this.todos.update(auth.sub, id, dto, socketId);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Auth() auth: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-socket-id') socketId?: string,
  ): Promise<void> {
    await this.todos.remove(auth.sub, id, socketId);
  }
}
