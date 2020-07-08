import {System, SystemFn} from './system.model';
import {Entity, EntityEntry} from './entity.model';
import {Component} from './component.model';
import {EntityQueryResult, EscQuery, QueryNode, QueryToken, isQueryNode, QueryLeafNode, isQueryLeafNode} from './esc-query.model';
import { DispatchSubject } from '../observer/dispatch-subject';
import { createQueryFromIdentifierList } from './query-builder';
import { ComponentPool } from '../pool/component-pool';
import { isNumber } from 'util';

/**
 * Builder for entities. Enables end user to chain operations.
 * Example:
 * ```ts
 * new ECSManager().createEntity().addComponent(new TestComp());
 * ```
 */
export class EntityBuilder {

  /**
   * This should not be used manually
   * @param id  id of entity that is supposed to be updated
   * @param ecsManager manager that is creating the builder
   */
  constructor(private id: number, private ecsManager: ECSManager) {}

  /**
   * Retrieve the id of the entity that is being built
   */
  get entityId(): number {
    return this.id;
  }

  /**
   * A facade to {@link ECSManager.addComponent}
   * @typeParam T  any class that implements ComponentIdentifier
   * @param component   a new component to be connected with given entity.
   */
  public addComponent<T extends object>(typeStr: string, component?: T): EntityBuilder {
    return this.ecsManager.addComponent(this.id, typeStr, component, this) as EntityBuilder;
  }

  /**
   * A facade to {@link ECSManager.removeComponent}
   * @typeParam T  any class that implements ComponentIdentifier
   * @param typeStr   the type typeStrs for the component you want to remove
   */
  public removeComponent(typeStrs: string): EntityBuilder {
    return this.ecsManager.removeComponent(this.id, typeStrs, this) as EntityBuilder;
  }
}

/**
 * The main class, and usually a singleton for your program that will manage your game state
 */
export class ECSManager {
  /**
   * @ignore
   */
  private events: System<Event>[] = [];

  /**
   * @ignore
   */
  private systems: System<number>[] = [];

  /**
   * @ignore
   */
  private entities: Entity[] = [];

  /**
   * @ignore
   */
  private components = new Map<string, ComponentPool<object>>();

  /**
   * @ignore
   */
  private entityId = 0;

  /**
   * @ignore
   */
  private prevRun: number;

  /**
   * @ignore
   */
  private afterUpdateLoop: DispatchSubject<null> = new DispatchSubject<null>();

  /**
   * @ignore
   */
  private isRunningSystems = false;

  /**
   * Register a system meant to be called manually by the callee
   *
   * @param system  A function that will read/write to components
   * @param query  The query used to fetch system parameters
   */
  public registerEventWithEscQuery(
    system: SystemFn<Event>,
    query: EscQuery)
    : number {
      this.events.push({
        query,
        qResult: this.queryEntities(query),
        system
      });

      return this.events.length - 1;
  }

    /**
   * Register a system meant to be called manually by the callee
   *
   * @param system  A function that will read/write to components
   * @param typeStrs  A list of types as string
   */
  public registerEvent(system: SystemFn<Event>, typeStrs: string[]): void {
    const query = createQueryFromIdentifierList(typeStrs);
    this.registerEventWithEscQuery(system, query);
  }


  /**
   * Register a system meant to be called each frame by the manager
   *
   * @param system  A function that will read/write to components
   * @param query  The query used to fetch system parameters
   */
  public registerSystemWithEscQuery(system: SystemFn<number>,  query: EscQuery): void {
    this.systems.push({
      query,
      qResult: this.queryEntities(query),
      system
    });
  }

  /**
   * Register a system meant to be called each frame by the manager
   *
   * @param system  A function that will read/write to components
   * @param typeStr  A list of types as string
   */
  public registerSystem(system: SystemFn<number>, typeStr: string[]): void {
    const query = createQueryFromIdentifierList(typeStr);
    this.registerSystemWithEscQuery(system, query);
  }

  /**
   * Creates a new entity
   */
  public createEntity(): EntityBuilder {
    this.entities.push({ id: this.entityId++ });
    return new EntityBuilder(this.entityId - 1, this);
  }

  /**
   * This is the non transform version of registerComponentType
   * You should probably call {@link registerComponentType} from the index instead
   * 
   * Used to preallocate storage for a given component type
   * avoid calling this in a game loop
   * @param typeStr the type of the component as a string 
   * @param defaultValue 
   */
  public registerComponentType<T extends object>(typeStr: string, defaultValue: T) {
    if (this.components.has(typeStr)) {
      return;
    }

    this.components.set(typeStr, new ComponentPool<T>(defaultValue));
  }

  /**
   * This is the non transform version of addComponent
   * You should probably call {@link addComponent} from the index instead
   * 
   * @typeParam T  any class that implements ComponentIdentifier
   * @param entityId  id of entity that is supposed to be updated
   * @param component  a new component to be connected with given entity.
   * @param builder  Used by the EntityBuilder to cache itself, can be ignored usually
   */
  public addComponent<T extends object>(entityId: number, typeStr: string, component?: T, builder?: EntityBuilder): EntityBuilder | void  {
    const builderRtr = (builder?: EntityBuilder) => {
      return builder ?? new EntityBuilder(entityId, this);
    };

    if (!this.components.has(typeStr)) {
      return; // TODO: errorhandling
    }

    const components = this.components.get(typeStr);

    if (components?.find(c => c.entityId === entityId)) {
      return; // TODO: errorhandling
    }

    if (this.isRunningSystems) {
      this.afterUpdateLoop.subscribe(() => {
        this.addComponent(entityId, typeStr, component);
      });
      return builderRtr(builder);
    }

    components.add(entityId, component);

    this.invalidateQueryResults(typeStr);
    return builderRtr(builder);
  }

  /**
   * This is the non transform version of removeComponent
   * You should probably call {@link removeComponent} from the index instead
   * 
   * @param entityId  id of entity that is supposed to be updated
   * @param typeStr   the type as string for the component you want to remove
   * @param builder  Used by the EntityBuilder to cache itself, can be ignored usually
   */
  public removeComponent(entityId: number, typeStr: string, builder?: EntityBuilder): EntityBuilder | void {
    if (this.isRunningSystems) {
      this.afterUpdateLoop.subscribe(() => {
        this.removeComponent(entityId, typeStr);
      });
      return;
    }

    this.components.get(typeStr).remove(entityId);

    this.invalidateQueryResults(typeStr);
    return builder ?? new EntityBuilder(entityId, this);
  }

  /**
   * @param query  filter for which entities to retrieve
   * @return returns a object containing entities that are meant to
   * be iterated by the manager under dispatch/event and shared entities that
   * will be shared each iteration
   */
  public queryEntities(query: EscQuery): EntityQueryResult {
    const andFn = (thisResult: EntityEntry[], values: EntityEntry[]): EntityEntry[] => {
      const least = (thisResult.length < values.length) ? thisResult : values;
      const biggest = (thisResult.length >= values.length) ? thisResult : values;
      values = [];
      for (const bEntity of biggest) {
        const lEntity = least.find(e => e.id === bEntity.id);
        if (lEntity) {
          const value = {
            id: lEntity.id,
            components: new Map(function*() { yield* bEntity.components; yield* lEntity.components; }())
          };
          values.push(value);
        }
      }
      return values;
    };

    const orReducer = (previousValues: EntityEntry[], value: EntityEntry) => {
      if (!previousValues.find(n => n.id === value.id)) {
        previousValues.push(value);
      }
      return previousValues;
    };

    const queryStep = (query: QueryNode | QueryLeafNode | null): EntityEntry[] => {
      if (!query) {
        return [];
      }

      if (isQueryNode(query)) {
        const qLResult = queryStep(query.leftChild);
        const qRResult = queryStep(query.rightChild);

        switch (query.token) {
          case QueryToken.AND:
            return andFn(qLResult, qRResult);
          case QueryToken.OR:
            return qLResult.concat(qRResult).reduce(orReducer, []);
          case QueryToken.NOT:
            return qLResult.filter(entity => !qRResult.find((oe: Entity) => oe.id == entity.id));
          case QueryToken.SHARED: 
            return [];
        }
      } else {
        const typeStr = query.typeStr;

        const components = this.components.get(typeStr);

        // TODO: refactor so we don't need variable from outside scope
        //       clean so it's more readable
        const thisResult: EntityEntry[] = components?.filter(c => isNumber(c.entityId) && c.entityId >= 0)
        .reduce((
          previousValues: EntityEntry[], 
          value: Component<object>, 
          currentIndex: number): EntityEntry[] => {
            const existing = previousValues.find(n => n.id === value.entityId);
            if (!existing) {
              let newEntry: EntityEntry = { id: value.entityId, components: new Map() };
              newEntry.components.set(typeStr, currentIndex);
              previousValues.push(newEntry);
            } else {
              existing.components.set(typeStr, currentIndex);
            }
            return previousValues;
        }, []) ?? [];

        return thisResult;
      }
    };

    const findShared = (query: QueryNode | QueryLeafNode): QueryNode | null => {
      if (!query || isQueryLeafNode(query)) {
        return null;
      }

      if (query.token === QueryToken.SHARED) {
        return query;
      }

      const leftList = findShared(query.leftChild);
      const rightList = findShared(query.rightChild);

      return leftList ?? rightList;
    };

    const extractLeafNodes = (query: QueryNode | QueryLeafNode | undefined): QueryLeafNode[] | undefined => {
      if (!query) {
        return;
      }

      if (isQueryNode(query)) {
        const leftLeafs = extractLeafNodes(query.leftChild);
        const rightLeafs = extractLeafNodes(query.rightChild);
        return (leftLeafs ?? []).concat(rightLeafs ?? []); 
      }
      
      return [query];
    };

    const sharedNode = findShared(query);
    const sharedLeafs = extractLeafNodes(sharedNode);

    const sharedEntityEntries = sharedLeafs ? sharedLeafs.map(l => queryStep(l)) : null;
    let sharedArgs: Component<object>[][] | null = null;
    if (sharedEntityEntries) {
      sharedArgs = [];
      for (const entry of sharedEntityEntries) {
        let compArgs: Component<object>[] = [];
        for (const entity of entry) {
          compArgs = compArgs.concat(this.createArgs(entity));
        }
        sharedArgs.push(compArgs);
      }
    }

    let result: EntityQueryResult =  {
      sharedArgs,
      entities: queryStep(query),
    };
    
    return result;
  }

  /**
   * This is the non transform version of accessComponentData
   * You should probably call {@link accessComponentData} from the index instead
   * 
   * @typeParam T component data type
   *
   * @param compType any instance of same type as target component
   * @param entityId id of entity owner of component
   *
   * @return requested component or null
   */
  public accessComponentData<T extends object>(typeStr: string, entityId: number): T | undefined {
    const components = this.components.get(typeStr);

    return components.find(c => c.entityId === entityId)?.data as T;
  }

  /**
   * Invokes a system event and supplies them with relevant based on previous query arguments
   * @param index The index of the event being fired
   * @param event Event data
   */
  public onEvent(index: number, event: Event) {
    this.isRunningSystems = true;
    const subscriber = this.events[index];

    const eventArr: Array<Event|Component<object>|Component<object>[]> = [event];
    for (const entity of subscriber.qResult.entities) {
      const args = eventArr.concat(this.createArgs(entity));
      this.events[index].system.apply(null, args.concat(subscriber.qResult.sharedArgs));
    }
    this.isRunningSystems = false;
    this.afterUpdateLoop.trigger();
  }

  /**
   * Invokes all normal systems and supplies them with delta time and
   * relevant arguments based on system query
   */
  public dispatch() {
    this.isRunningSystems = true;
    
    this.prevRun = (this.prevRun) ? this.prevRun : Date.now();

    const now = Date.now();

    const deltaTime: Array<number|Component<object>|Component<object>[]> = [(now - this.prevRun) / 1000];
    for (const system of this.systems) {
      for (const entity of system.qResult.entities) {
        let args = deltaTime.concat(this.createArgs(entity));
        system.system.apply(null, args.concat(system.qResult.sharedArgs));
      }
    }

    this.isRunningSystems = false;
    this.afterUpdateLoop.trigger();
    this.prevRun = now;
  }

  /**
   * @ignore
   */
  private createArgs(entry: EntityEntry): Component<object>[] {
    const args = [];
    for (const [typeStr, index] of entry.components.entries()) {
      const argComp = this.components.get(typeStr).unsafeGet(index);
      args.push(argComp);
    }

    return args;
  }

  /**
   * @ignore
   */
  private invalidateQueryResults(changeTypeStr: string): void {
    const isComponentInQuery = (typeStr: string, node: QueryNode | QueryLeafNode | null): boolean => {
      if (!node) {
        return false;
      }

      if (isQueryNode(node)) {
        const leftFind = isComponentInQuery(typeStr, node.leftChild);
        if (leftFind) {
          return true;
        }

        const rightFind = isComponentInQuery(typeStr, node.rightChild);
        if (rightFind) {
          return true;
        }

        return false;
      } else {
        return node.typeStr === typeStr;
      }
    };

    const updatedSystem = <T>(system: System<T>) => {
      if (isComponentInQuery(changeTypeStr, system.query)) {
        return this.queryEntities(system.query);
      }
      return system.qResult;
    };

    for (const system of this.systems) {
      system.qResult = updatedSystem(system);
    }
    for (const system of this.events) {
      system.qResult = updatedSystem(system);
    }
  }
}
