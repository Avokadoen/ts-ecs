import {System, SystemFn} from './system.model';
import {Entity} from './entity.model';
import {Component} from './component.model';
import {ComponentQueryResult, EntityEntry, EscQuery, QueryNode, QueryToken} from './esc-query.model';
import {ComponentIdentifier} from './component-identifier.model';

// TODO: currently does not support multiple components of same type on one entity
//        - this silently fails when you add same type again, no error, memory leak created, queries broken
// TODO: All query results must be invalidated on change in entity/component
// TODO: Event handling requires callee to keep relevant index to event. This should be encapsulated to reduce errors
// TODO: entity id should be defined by callee or generated if not definer. Should fail somehow if taken
// TODO: documentation using http://typedoc.org/
// TODO: queryAny: return one entity with components
// TODO: Async functions/manager
// TODO: register event could use observables to simplify api
// TODO: error object on invalid queries etc

export class EntityBuilder {
  constructor(private id: number, private ecsManager: ECSManager) {}

  get entityId(): number {
    return this.id;
  }

  public addComponent<T extends ComponentIdentifier>(component: T): EntityBuilder {
    return this.ecsManager.addComponent(this.id, component, this);
  }

  public removeComponent(identifier: string): EntityBuilder {
    return this.ecsManager.removeComponent(this.id, identifier, this);
  }
}

export class ECSManager {
  private events: System<Event>[] = [];
  private systems: System<number>[] = [];
  private entities: Entity[] = [];
  private components = new Map<string, Component<Object>[]>();

  private entityId = 0;

  private prevRun: number;

  public constructor() {}

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

  public createEntity(): EntityBuilder {
    this.entities.push({ id: this.entityId++ });
    return new EntityBuilder(this.entityId - 1, this);
  }

  public createEntityWithComponents<T extends ComponentIdentifier>(components: T[]): EntityBuilder {
    const entityBuilder = this.createEntity();
    for (const component of components) {
      this.addComponent(entityBuilder.entityId, component);
    }
    return new EntityBuilder(this.entityId - 1, this);
  }

  // TODO: update relevant systems query results (see top todo)
  public addComponent<T extends ComponentIdentifier>(entityId: number, component: T, builder?: EntityBuilder): EntityBuilder {
    const compName = component.identifier();
    if (!this.components.has(compName)) {
      this.components.set(compName, new Array<Component<typeof compName>>());
    }
    const actualComponent = {entityId, data: component};
    this.components.get(compName).push(actualComponent);

    this.invalidateQueryResults();
    return builder ?? new EntityBuilder(entityId, this);
  }

  public removeComponent(entityId: number, identifier: string, builder?: EntityBuilder): EntityBuilder {
    const components = this.components.get(identifier).filter(c => c.entityId !== entityId);
    this.components.set(identifier, components);

    this.invalidateQueryResults();
    return builder ?? new EntityBuilder(entityId, this);
  }

  public queryEntities(query: EscQuery): Entity[] {
    const entityIdReducer = (previousValues: Entity[], value: Component<Object>) => {
      if (!previousValues.find(n => n.id === value.entityId)) {
        previousValues.push({ id: value.entityId });
      }
      return previousValues;
    };

    let result: Entity[] = [];
    for (const q of query) {
      const components = this.components.get(q.componentIdentifier);

      const thisResult: Entity[] = components?.filter(c => !isNaN(c.entityId)).reduce(entityIdReducer, []) ?? [];

      switch (q.token) {

        case QueryToken.FIRST:
          result = thisResult;
          break;

        case QueryToken.AND:
          const least = (thisResult.length < result.length) ? thisResult : result;
          const biggest = (thisResult.length >= result.length) ? thisResult : result;
          result = [];
          for (const r of biggest) {
            if (least.find(b => b.id === r.id)) {
              result.push(r);
            }
          }
          break;

        case QueryToken.OR:
          result = result.concat(thisResult).reduce((previousValues: Entity[], value: Entity) => {
            if (!previousValues.find(n => n.id === value.id)) {
              previousValues.push(value);
            }
            return previousValues;
          }, []);
          break;

        case QueryToken.AND_NOT: {
          result = result.filter(entity => !thisResult.find((oe: Entity) => oe.id == entity.id));
          break;
        }
      }
    }

    return result;
  }

  public queryComponents(query: EscQuery): ComponentQueryResult {
    const queryReducer = (previousValues: string[], value: QueryNode) => {
      if (!previousValues.find(cId => cId === value.componentIdentifier)) {
        previousValues.push(value.componentIdentifier);
      }
      return previousValues;
    };

    const componentIds = query.reduce(queryReducer, []);
    const entities = this.queryEntities(query);

    const result: ComponentQueryResult = {
      entities: []
    };

    for (const cId of componentIds) {
      for (const entity of entities) {
        const compIndex = this.components.get(cId).findIndex(c => c.entityId === entity.id);
        if (compIndex >= 0) {
          let indexOf = result.entities.findIndex(entry => entry.id === entity.id);
          if (indexOf === -1) {
            result.entities.push({
              id: entity.id,
              components: new Map<string, number>()
            });
            indexOf = result.entities.length - 1;
          }
          result.entities.find(entry => entry.id === entity.id).components.set(cId, compIndex);
        }
      }
    }
    return result;
  }

  // TODO: there should be an alternative one where you use entityId and identifier
  public accessComponentData<T extends ComponentIdentifier>(compType: T, index: number): T {
    if (index < 0) {
      return null;
    }

    const components = this.components.get(compType.identifier());
    if (components.length <= index) {
      return null;
    }

    return components[index].data as T;
  }

  public onEvent(index: number, event: Event) {
    for (const entity of this.events[index].qResult.entities) {
      const args = this.createArgs(entity);
      this.events[index].system(event, args);
    }
  }

  public dispatch() {
    this.prevRun = (this.prevRun) ? this.prevRun : Date.now();

    const now = Date.now();

    const deltaTime = (now - this.prevRun) / 1000;
    for (const system of this.systems) {
      for (const entity of system.qResult.entities) {
        const args = this.createArgs(entity);
        system.system(deltaTime, args);
      }
    }


    this.prevRun = now;
  }

  // TODO: this probably causes GC spikes
  private createArgs(entry: EntityEntry): Component<Object>[] {
    const args = [];
    for (const component of entry.components) {
      const argComp = this.components.get(component[0])[component[1]];
      args.push(argComp);
    }

    return args;
  }

  // TODO: this can be optimized!
  private invalidateQueryResults(): void {
    for (const system of this.systems) {
      system.qResult = this.queryComponents(system.query);
    }
  }
}
