import { ECSManager, EntityBuilder } from './src/ecs/manager';
import { SystemFn } from './src/ecs/system.model';

export * from './src/ecs/component.model';
export * from './src/ecs/entity.model';
export * from './src/ecs/esc-query.model';
export * from './src/ecs/system.model';
export * from './src/ecs/query-builder';
export * from './src/ecs/manager';

export * from './src/observer/dispatch-subject'; 


/**
 * A semi typesafe wrapper to manager's {@link ECSManager.registerSystem}
 * 
 * @param manager manager to register to
 * @param system system you want to register
 */
export declare function registerSystem(manager: ECSManager, system: SystemFn<number>): void;

/**
 * A semi typesafe wrapper to manager's {@link ECSManager.registerEvent}
 * 
 * @param manager manager to register to
 * @param system event you want to register
 */
export declare function registerEvent(manager: ECSManager, system: SystemFn<Event>): number;

/**
 * A semi typesafe wrapper to manager's {@link ECSManager.registerComponentType}
 * 
 * @param manager manager to register to
 * @param defaultValue the default value you want for any new component you instantiate of this type
 */
export declare function registerComponentType<T extends object>(manager: ECSManager, defaultValue: T, cacheStride?: number): void;

/**
 * A semi typesafe wrapper to manager's {@link ECSManager.addComponent}
 * @typeParam T any object you would like to be a component. Should only be data, and not any functions. This will be used to infer typeStr
 * @param manager manager to add to
 * @param entityId entity you want to add your new component to
 */
export declare function addComponent<T extends object>(manager: ECSManager, entityId: number): void;

/**
 * A semi typesafe wrapper to manager's {@link ECSManager.addComponent}
 * @typeParam T any object you would like to be a component. Should only be data, and not any functions. This will be used to infer typeStr
 * @param manager manager to add to
 * @param entityId entity you want to add your new component to
 * @param startValue an override value for your new component
 */
export declare function addComponent<T extends object>(manager: ECSManager, entityId: number, startValue: T): void;

/**
 * A semi typesafe wrapper to manager's {@link ECSManager.removeComponent}
 * @typeParam T type of the component you would like to remove
 * @param manager manager to remove from
 * @param entityId id of entity to edit
 */
export declare function removeComponent<T extends object>(manager: ECSManager, entityId: number): T;

/**
 * A semi typesafe wrapper to manager's {@link ECSManager.accessComponentData}
 * @typeParam T type of the component you would like to access
 * @param manager manager to access from
 * @param entityId id of entity that owns the component
 */
export declare function accessComponentData<T extends object>(manager: ECSManager, entityId: number): T;