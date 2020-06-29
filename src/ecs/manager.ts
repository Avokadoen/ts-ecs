import {System, SystemFn} from './system.model';
import {Entity, EntityEntry} from './entity.model';
import {Component} from './component.model';
import {EntityQueryResult, EscQuery, QueryNode, QueryToken, isQueryNode, QueryLeafNode, isQueryLeafNode} from './esc-query.model';
import {ComponentIdentifier} from './component-identifier.model';
import { DispatchSubject } from '../observer/dispatch-subject';

// TODO: currently does not support multiple components of same type on one entity
//        - this silently fails when you add same type again, no error, memory leak created, queries broken
// TODO: System args should be cached, and not created each frame
// TODO: Event handling requires callee to keep relevant index to event. This should be encapsulated to reduce errors
// TODO: entity id should be defined by callee or generated if not definer. Should fail somehow if taken
// TODO: documentation using http://typedoc.org/
// TODO: queryAny: return one entity with components
// TODO: Async functions/manager
// TODO: register event could use observables to simplify api
// TODO: error object on invalid queries etc
// TODO: interpret query string to EscQuery
// TODO: delete entity function (make sure to remove all components also)
// TODO: instead of return bool on system. We should wait with removing components until we are done
//       with dispatch!
// TODO: Bug with shared followed by OR
// TODO: move TODO's to issues on github
// TODO: make specification for query syntax tree
//      - also for callee syntax

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
  public addComponent<T extends ComponentIdentifier>(component: T): EntityBuilder {
    return this.ecsManager.addComponent(this.id, component, this) as EntityBuilder;
  }

  /**
   * A facade to {@link ECSManager.removeComponent}
   * @typeParam T  any class that implements ComponentIdentifier
   * @param identifier   the type identifier for the component you want to remove
   */
  public removeComponent(identifier: string): EntityBuilder {
    return this.ecsManager.removeComponent(this.id, identifier, this) as EntityBuilder;
  }
}

interface DeleteEntry {
  entityId: number;
  identifier: string;
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
  private components = new Map<string, Component<object>[]>();

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
   * A system meant to be called manually by the callee
   *
   * @param system  A function that will read/write to components
   * @param query  The query used to fetch system parameters
   */
  public registerEvent(
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
   * A system meant to be called each frame by the manager
   *
   * @param system  A function that will read/write to components
   * @param query  The query used to fetch system parameters
   */
  public registerSystem(
    system: SystemFn<number>,
    query: EscQuery)
    : void {
    this.systems.push({
      query,
      qResult: this.queryEntities(query),
      system
    });
  }

  /**
   * Creates a new entity
   */
  public createEntity(): EntityBuilder {
    this.entities.push({ id: this.entityId++ });
    return new EntityBuilder(this.entityId - 1, this);
  }

  // TODO: update relevant systems query results (see top todo)
  /**
   * @typeParam T  any class that implements ComponentIdentifier
   * @param entityId  id of entity that is supposed to be updated
   * @param component  a new component to be connected with given entity.
   * @param builder  Used by the EntityBuilder to cache itself, can be ignored usually
   */
  public addComponent<T extends ComponentIdentifier>(entityId: number, component: T, builder?: EntityBuilder): EntityBuilder | void  {
    if (this.isRunningSystems) {
      this.afterUpdateLoop.subscribe(() => {
        this.addComponent(entityId, component);
      });
      return;
    }

    const compName = component.identifier();
    if (!this.components.has(compName)) {
      this.components.set(compName, new Array<Component<T>>());
    }
    const actualComponent = {entityId, data: component};
    this.components.get(compName).push(actualComponent);

    this.invalidateQueryResults(compName);
    return builder ?? new EntityBuilder(entityId, this);
  }

  /**
   * @param entityId  id of entity that is supposed to be updated
   * @param identifier   the type identifier for the component you want to remove
   * @param builder  Used by the EntityBuilder to cache itself, can be ignored usually
   */
  public removeComponent(entityId: number, identifier: string, builder?: EntityBuilder): EntityBuilder | void {
    if (this.isRunningSystems) {
      this.afterUpdateLoop.subscribe(() => {
        this.removeComponent(entityId, identifier);
      });
      return;
    }

    const components = this.components.get(identifier).filter(c => c.entityId !== entityId);
    this.components.set(identifier, components);

    this.invalidateQueryResults(identifier);
    return builder ?? new EntityBuilder(entityId, this);
  }

  /**
   * @param query  filter for which entities to retrieve
   * @return returns a object containing entities that are meant to
   * be iterated by the manager under dispatch/event and shared entities that
   * will be shared each iteration
   */
  public queryEntities(query: EscQuery): EntityQueryResult {
    const entityIdReducer = (previousValues: EntityEntry[], value: Component<object>, currentIndex: number): EntityEntry[] => {
      const existing = previousValues.find(n => n.id === value.entityId);
      if (!existing) {
        let newEntry: EntityEntry = { id: value.entityId, components: new Map() };
        newEntry.components.set((value.data as ComponentIdentifier).identifier(), currentIndex);
        previousValues.push(newEntry);
      } else {
        existing.components.set((value.data as ComponentIdentifier).identifier(), currentIndex);
      }
      return previousValues;
    };

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
        const qLResult = queryStep(query.left_sibling);
        const qRResult = queryStep(query.right_sibling);

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
        const components = this.components.get(query.identifier);
        const thisResult: EntityEntry[] = components?.filter(c => !isNaN(c.entityId)).reduce(entityIdReducer, []) ?? [];
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

      const leftList = findShared(query.left_sibling);
      const rightList = findShared(query.right_sibling);

      return leftList ?? rightList;
    };

    const sharedNode = findShared(query);
    const sharedEntityEntries = sharedNode ? queryStep(sharedNode.left_sibling) : null;

    let sharedArgs: Component<object>[] | null = null;
    if (sharedEntityEntries) {
      sharedArgs = [];
      for (const entry of sharedEntityEntries) {
        sharedArgs = sharedArgs.concat(this.createArgs(entry));
      }
    }

    let result: EntityQueryResult =  {
      sharedArgs,
      entities: queryStep(query),
    };
    
    return result;
  }

  // TODO: there should be an alternative one where you use entityId and identifier
  /**
   * Retrieves a component from the internal storage
   *
   * @typeParam T  any class that implements ComponentIdentifier
   *
   * @param compType any instance of same type as target component
   * @param index index of the component in the internal storage
   *
   * @return requested component or null
   */
  public accessComponentData<T extends ComponentIdentifier>(compType: T, index: number): T | null {
    if (index < 0) {
      return null;
    }

    const components = this.components.get(compType.identifier());
    if (components.length <= index) {
      return null;
    }

    return components[index].data as T;
  }

  /**
   * Invokes a system event and supplies them with relevant based on previous query arguments
   * @param index The index of the event being fired
   * @param event Event data
   */
  public onEvent(index: number, event: Event) {
    this.isRunningSystems = true;
    const subscriber = this.events[index];

    for (const entity of subscriber.qResult.entities) {
      const args = this.createArgs(entity);
      this.events[index].system(event, args, subscriber.qResult.sharedArgs);
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

    const deltaTime = (now - this.prevRun) / 1000;

    for (const system of this.systems) {
      for (const entity of system.qResult.entities) {
        let args = this.createArgs(entity);
        system.system(deltaTime, args, system.qResult.sharedArgs);
      }
    }

    this.isRunningSystems = false;
    this.afterUpdateLoop.trigger();
    this.prevRun = now;
  }

  // TODO: this probably causes GC spikes
  //       we can cache this in the ComponentQueryResult and only create on
  //       invalidated query
  /**
   * @ignore
   */
  private createArgs(entry: EntityEntry): Component<object>[] {
    const args = [];
    for (const component of entry.components) {
      const argComp = this.components.get(component[0])[component[1]];
      args.push(argComp);
    }

    return args;
  }

  // TODO: this can be optimized!
  /**
   * @ignore
   */
  private invalidateQueryResults(changedIdentifier: string): void {
    const isComponentInQuery = (identifier: string, node: QueryNode | QueryLeafNode | null): boolean => {
      if (!node) {
        return false;
      }

      if (isQueryNode(node)) {
        const leftFind = isComponentInQuery(identifier, node.left_sibling);
        if (leftFind) {
          return true;
        }

        const rightFind = isComponentInQuery(identifier, node.right_sibling);
        if (rightFind) {
          return true;
        }

        return false;
      } else {
        return node.identifier === identifier;
      }
    };

    const updatedSystem = <T>(system: System<T>) => {
      if (isComponentInQuery(changedIdentifier, system.query)) {
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
