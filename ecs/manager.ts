import {System, SystemFn} from './system.model';
import {Entity, EntityEntry} from './entity.model';
import {Component} from './component.model';
import {ComponentQueryResult, EntityQueryResult, EscQuery, QueryNode, QueryToken} from './esc-query.model';
import {ComponentIdentifier} from './component-identifier.model';

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
    return this.ecsManager.addComponent(this.id, component, this);
  }

  /**
   * A facade to {@link ECSManager.removeComponent}
   * @typeParam T  any class that implements ComponentIdentifier
   * @param identifier   the type identifier for the component you want to remove
   */
  public removeComponent(identifier: string): EntityBuilder {
    return this.ecsManager.removeComponent(this.id, identifier, this);
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
      qResult: this.queryComponents(query),
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
      qResult: this.queryComponents(query),
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

  /**
   * @typeParam T  any class that implements ComponentIdentifier
   * @param components  an array of components that are to be added to a new entity
   */
  public createEntityWithComponents<T extends ComponentIdentifier>(components: T[]): EntityBuilder {
    const entityBuilder = this.createEntity();
    for (const component of components) {
      this.addComponent(entityBuilder.entityId, component);
    }
    return new EntityBuilder(this.entityId - 1, this);
  }

  // TODO: update relevant systems query results (see top todo)
  /**
   * @typeParam T  any class that implements ComponentIdentifier
   * @param entityId  id of entity that is supposed to be updated
   * @param component  a new component to be connected with given entity.
   * @param builder  Used by the EntityBuilder to cache itself, can be ignored usually
   */
  public addComponent<T extends ComponentIdentifier>(entityId: number, component: T, builder?: EntityBuilder): EntityBuilder {
    const compName = component.identifier();
    if (!this.components.has(compName)) {
      this.components.set(compName, new Array<Component<T>>());
    }
    const actualComponent = {entityId, data: component};
    this.components.get(compName).push(actualComponent);

    this.invalidateQueryResults();
    return builder ?? new EntityBuilder(entityId, this);
  }

  /**
   * @param entityId  id of entity that is supposed to be updated
   * @param identifier   the type identifier for the component you want to remove
   * @param builder  Used by the EntityBuilder to cache itself, can be ignored usually
   */
  public removeComponent(entityId: number, identifier: string, builder?: EntityBuilder): EntityBuilder {
    const components = this.components.get(identifier).filter(c => c.entityId !== entityId);
    this.components.set(identifier, components);

    this.invalidateQueryResults();
    return builder ?? new EntityBuilder(entityId, this);
  }

  /**
   * @param query  filter for which entities to retrieve
   * @return returns a object containing entities that are meant to
   * be iterated by the manager under dispatch/event and shared entities that
   * will be shared each iteration
   */
  public queryEntities(query: EscQuery): EntityQueryResult {
    const entityIdReducer = (previousValues: Entity[], value: Component<object>) => {
      if (!previousValues.find(n => n.id === value.entityId)) {
        previousValues.push({ id: value.entityId });
      }
      return previousValues;
    };

    const orReducer = (previousValues: Entity[], value: Entity) => {
      if (!previousValues.find(n => n.id === value.id)) {
        previousValues.push(value);
      }
      return previousValues;
    };

    let result: EntityQueryResult =  {
      sharedEntities: null,
      entities: []
    };

    const andFn = (thisResult: Entity[], values: Entity[]) => {
      const least = (thisResult.length < values.length) ? thisResult : values;
      const biggest = (thisResult.length >= values.length) ? thisResult : values;
      values = [];
      for (const r of biggest) {
        if (least.find(b => b.id === r.id)) {
          values.push(r);
        }
      }

      return values;
    };

    let isSharedState = false;
    for (const q of query) {
      const components = this.components.get(q.componentIdentifier);

      const thisResult: Entity[] = components?.filter(c => !isNaN(c.entityId)).reduce(entityIdReducer, []) ?? [];
      let workingEntities = (isSharedState) ? (result.sharedEntities ?? []) : result.entities;

      switch (q.token) {
        case QueryToken.FIRST:
          workingEntities = thisResult;
          break;

        case QueryToken.AND:
          workingEntities = andFn(thisResult, workingEntities);
          break;

        case QueryToken.OR:
          workingEntities = workingEntities.concat(thisResult).reduce(orReducer, []);
          break;

        case QueryToken.AND_NOT: {
          workingEntities = workingEntities.filter(entity => !thisResult.find((oe: Entity) => oe.id == entity.id));
          break;
        }

        case QueryToken.SHARED: {
          result.sharedEntities = result.sharedEntities ?? [];
          workingEntities = result.sharedEntities;
          workingEntities = workingEntities.concat(thisResult).reduce(orReducer, []);
          isSharedState = true;
          break;
        }
      }

      if (isSharedState) {
        result.sharedEntities = workingEntities;
      } else {
        result.entities = workingEntities;
      }
    }

    return result;
  }

  /**
   * @param query  filter for which components to retrieve
   * @return  similarly to {@link ECSManager.queryEntities} with added relevant components connected
   * to given entities
   */
  public queryComponents(query: EscQuery): ComponentQueryResult {
    // TODO: comment code (not just here)
    const entityResult = this.queryEntities(query);

    const result: ComponentQueryResult = {
      entities: [],
      sharedArgs: (entityResult.sharedEntities) ? [] : null
    };

    let isBeforeShared = false;
    const componentIds = query.reduce((previousValues: string[], value: QueryNode) => {
      if (value.token === QueryToken.SHARED || isBeforeShared) {
        isBeforeShared = true;
        return previousValues;
      }

      if (!previousValues.find(cId => cId === value.componentIdentifier)) {
        previousValues.push(value.componentIdentifier);
      }
      return previousValues;
    }, []);

    const setEntityEntry = (cId: string, entity: Entity, values: EntityEntry[]) => {
      const compIndex = this.components.get(cId).findIndex(c => c.entityId === entity.id);
      if (compIndex >= 0) {
        const indexOf = values.findIndex(entry => entry.id === entity.id);
        if (indexOf === -1) {
          values.push({
            id: entity.id,
            components: new Map<string, number>()
          });
        }
        values.find(entry => entry.id === entity.id).components.set(cId, compIndex);
      }

      return values;
    };

    for (const cId of componentIds) {
      for (const entity of entityResult.entities) {
        result.entities = setEntityEntry(cId, entity, result.entities);
      }
    }

    if (!entityResult.sharedEntities) {
      return result;
    }

    let isAfterShared = false;
    const sharedIds = query.reduce((previousValues: string[], value: QueryNode) => {
      if (value.token === QueryToken.SHARED) {
        isAfterShared = true;
      }

      if (!isAfterShared) {
        return previousValues;
      }

      if (!previousValues.find(cId => cId === value.componentIdentifier)) {
        previousValues.push(value.componentIdentifier);
      }
      return previousValues;
    }, []);

    let sharedEntities: EntityEntry[] = [];
    for (const cId of sharedIds) {
      for (const entity of entityResult.sharedEntities) {
        sharedEntities = setEntityEntry(cId, entity, sharedEntities);
      }
    }

    for (const entity of sharedEntities) {
      result.sharedArgs = result.sharedArgs.concat(this.createArgs(entity));
    }

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
    const subscriber = this.events[index];

    for (const entity of subscriber.qResult.entities) {
      const args = this.createArgs(entity);
      const changedStorage = this.events[index].system(event, args, subscriber.qResult.sharedArgs);
      if (changedStorage === true) {
        break;
      }
    }
  }

  /**
   * Invokes all normal systems and supplies them with relevant based on previous query arguments
   * and a common delta time
   */
  public dispatch() {
    this.prevRun = (this.prevRun) ? this.prevRun : Date.now();

    const now = Date.now();

    const deltaTime = (now - this.prevRun) / 1000;

    for (const system of this.systems) {
      for (const entity of system.qResult.entities) {
        let args = this.createArgs(entity);
        const changedStorage = system.system(deltaTime, args, system.qResult.sharedArgs);
        if (changedStorage === true) {
          break;
        }
      }
    }

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
  private invalidateQueryResults(): void {
    for (const system of this.systems) {
      system.qResult = this.queryComponents(system.query);
    }
    for (const system of this.events) {
      system.qResult = this.queryComponents(system.query);
    }
  }
}
