import { ECSManager } from './src/ecs/manager';
import { SystemFn } from './src/ecs/system.model';

export * from './src/ecs/component.model';
export * from './src/ecs/component-identifier.model';
export * from './src/ecs/entity.model';
export * from './src/ecs/esc-query.model';
export * from './src/ecs/system.model';
export * from './src/observer/dispatch-subject'; 

export * from './src/ecs/manager';

export declare function registerSystem(manager: ECSManager, system: SystemFn<number>): void;