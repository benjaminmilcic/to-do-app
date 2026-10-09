import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { SyncGateway } from './sync.gateway.js';
import { Todo } from './todo.entity.js';
import { TodosController } from './todos.controller.js';
import { TodosService } from './todos.service.js';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Todo])],
  controllers: [TodosController],
  providers: [TodosService, SyncGateway],
})
export class TodosModule {}
