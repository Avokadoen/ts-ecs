import { ECSManager } from './src/ecs/manager';
import { SystemFn } from './src/ecs/system.model';

export * from './src/ecs/component.model';
export * from './src/ecs/entity.model';
export * from './src/ecs/esc-query.model';
export * from './src/ecs/system.model';
export * from './src/observer/dispatch-subject'; 

export * from './src/ecs/manager';

export declare function registerSystem(manager: ECSManager, system: SystemFn<number>): void;
export declare function registerEvent(manager: ECSManager, system: SystemFn<Event>): void;

// export declare function addComponent<T>(manager: ECSManager, entityId: number): void;
// export declare function addComponent<T>(manager: ECSManager, entityId: number, initial: T): void;