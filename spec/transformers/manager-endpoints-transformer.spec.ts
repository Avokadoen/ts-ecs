import { ECSManager } from "../../src/ecs/manager";
import { registerSystem, System, registerEvent, registerComponentType, addComponent } from "../../index";
import { TestCompTwo, TestCompOne } from "../utility";
import { Component } from "../../src/ecs/component.model";
import { QueryToken, QueryNode } from "../../src/ecs/esc-query.model";
import { ComponentPool } from "../../src/pool/component-pool";

class OtherClass<T extends object> {
    identifier: () => 'OtherClass';
    myOtherClass: T;
}

const simpleSystemType = <T>(_: T, tOne: Component<TestCompOne>, tTwo: Component<TestCompTwo>) => {
    console.log('wow1');
};

const simpleQueryResult: QueryNode = {
    token: QueryToken.AND,
    leftChild: {
        typeStr: 'Component<TestCompOne>'
    },
    rightChild: {
        typeStr: 'Component<TestCompTwo>'
    }
};

const complexSystemType = <T>(_: T, tOne: Component<OtherClass<OtherClass<TestCompOne>>>) => {
    console.log('wow2');
};

const complexQueryResult: QueryNode = {
    token: QueryToken.OR,
    leftChild: {
        typeStr: 'Component<OtherClass<OtherClass<TestCompOne>>>'
    },
};

describe('Transformers', () => {
    describe('Register system', () => {
        it('Transform call to valid register call', () => {
            const manager = new ECSManager();
    
            registerSystem(manager, simpleSystemType);
    
            // tslint:disable-next-line: no-any
            const systems:  System<number>[] = (manager as any).systems;
    
            expect(systems.length).toBe(1);
            expect(systems[0].query).toEqual(simpleQueryResult);
        });
    
        it('Transform nested generic', () => {
            const manager = new ECSManager();
    
            registerSystem(manager, complexSystemType);
    
            // tslint:disable-next-line: no-any
            const systems:  System<number>[] = (manager as any).systems;
    
            expect(systems.length).toBe(1);
            expect(systems[0].query).toEqual(complexQueryResult);
        });
    });
    
    describe('Register event', () => {
        it('Transform call to valid register call', () => {
            const manager = new ECSManager();
    
            registerEvent(manager, simpleSystemType);
    
            // tslint:disable-next-line: no-any
            const events:  System<Event>[] = (manager as any).events;
    
            expect(events.length).toBe(1);
            expect(events[0].query).toEqual(simpleQueryResult);
        });
    
        it('Transform nested generic', () => {
            const manager = new ECSManager();
    
            registerEvent(manager, complexSystemType);
    
            // tslint:disable-next-line: no-any
            const events:  System<number>[] = (manager as any).events;
    
            expect(events.length).toBe(1);
            expect(events[0].query).toEqual(
                {
                    token: QueryToken.OR,
                    leftChild: {
                        typeStr: 'Component<OtherClass<OtherClass<TestCompOne>>>'
                    },
                }
            );
        });
    });

    describe('Components', () => {
        interface Optimus {
            name: string;
        }
        const defaultValue: Optimus = { name: 'Prime' };

        describe('Register component type', () => {
        
            it('Transform call to valid register component type call', () => {
                const manager = new ECSManager();
    
                registerComponentType(manager, defaultValue);
    
                // tslint:disable-next-line: no-any
                const optComponents = (manager as any).components.get('Optimus') as ComponentPool<Optimus>; 
    
                expect(optComponents).toBeDefined();
                // tslint:disable-next-line: no-any
                expect((optComponents as any).defaultValue).toBe(defaultValue);
            });
    
            it('Transform nested generic', () => {
                const manager = new ECSManager();
    
                class Prime<T> {
                    constructor(public transformThis: T) {
    
                    }
                }
        
                const complexDefaultValue = new Prime(defaultValue); 
    
                registerComponentType(manager, complexDefaultValue);
    
                // tslint:disable-next-line: no-any
                const optComponents = (manager as any).components.get('Prime<Optimus>') as ComponentPool<Optimus>; 
    
                expect(optComponents).toBeDefined();
                // tslint:disable-next-line: no-any
                expect((optComponents as any).defaultValue).toBe(complexDefaultValue);
            });
        });
    
            
        describe('Add component', () => {

            it('Should add with default value', () => {
                const manager = new ECSManager();
                manager.registerComponentType('Optimus', defaultValue);

                const entityB = manager.createEntity();

                addComponent<Optimus>(manager, entityB.entityId);

                expect(manager.accessComponentData<Optimus>('Optimus', entityB.entityId)).toBeDefined();
            
            });

            it('Should add with override value', () => {
                const manager = new ECSManager();
                manager.registerComponentType('Optimus', defaultValue);

                const entityB = manager.createEntity();
                const overrideValue: Optimus = {
                    name: 'Sam'
                };

                addComponent(manager, entityB.entityId, overrideValue);

                expect(manager.accessComponentData<Optimus>('Optimus', entityB.entityId).name).toBe('Sam');
            });
        });
    });
});
