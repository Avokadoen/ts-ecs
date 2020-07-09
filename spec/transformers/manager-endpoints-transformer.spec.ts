import { ECSManager } from "../../src/ecs/manager";
import { registerSystem, System, registerEvent, registerComponentType, addComponent, removeComponent, accessComponentData } from "../../index";
import { TestCompTwo, TestCompOne } from "../utility";
import { Component } from "../../src/ecs/component.model";
import { QueryToken, QueryNode } from "../../src/ecs/esc-query.model";
import { ComponentPool } from "../../src/pool/component-pool";

// TODO: find a way to test compile errors

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
        typeStr: 'TestCompOne'
    },
    rightChild: {
        typeStr: 'TestCompTwo'
    }
};

const complexSystemType = <T>(_: T, tOne: Component<OtherClass<OtherClass<TestCompOne>>>) => {
    console.log('wow2');
};

const complexQueryResult: QueryNode = {
    token: QueryToken.OR,
    leftChild: {
        typeStr: 'OtherClass<OtherClass<TestCompOne>>'
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
                        typeStr: 'OtherClass<OtherClass<TestCompOne>>'
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
            
        class Prime<T> {
            constructor(public transformThis: T) {

            }
        }
        const complexDefaultValue = new Prime(defaultValue); 

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

                const builder = manager.createEntity();

                addComponent<Optimus>(manager, builder.entityId);

                expect(manager.accessComponentData<Optimus>(builder.entityId, 'Optimus')).toBeDefined();
            });

            it('Should add with override value', () => {
                const manager = new ECSManager();
                manager.registerComponentType('Optimus', defaultValue);

                const builder = manager.createEntity();
                const overrideValue: Optimus = {
                    name: 'Sam'
                };

                addComponent(manager, builder.entityId, overrideValue);

                expect(manager.accessComponentData<Optimus>(builder.entityId, 'Optimus').name).toBe('Sam');
            });
        });

        describe('Remove component', () => {

            it('Should remove simple type', () => {
                const manager = new ECSManager();
                manager.registerComponentType('Optimus', defaultValue);
                const builder = manager.createEntity();

                manager.addComponent(builder.entityId, 'Optimus');
                expect(manager.accessComponentData<Optimus>(builder.entityId, 'Optimus')).toBeDefined();

                removeComponent<Optimus>(manager, builder.entityId);

                expect(manager.accessComponentData<Optimus>(builder.entityId, 'Optimus')).toBeUndefined();
            });

            it('Should remove generic type', () => {
                const manager = new ECSManager();
                manager.registerComponentType('Prime<Optimus>', complexDefaultValue);
                const builder = manager.createEntity();

                manager.addComponent(builder.entityId, 'Prime<Optimus>');
                expect(manager.accessComponentData<Prime<Optimus>>(builder.entityId, 'Prime<Optimus>')).toBeDefined();

                removeComponent<Prime<Optimus>>(manager, builder.entityId);

                expect(manager.accessComponentData<Prime<Optimus>>(builder.entityId, 'Prime<Optimus>')).toBeUndefined();
            });
        });

        describe('Access component data', () => {
            it('Should access simple type', () => {
                const manager = new ECSManager();
                manager.registerComponentType('Optimus', defaultValue);
                const builder = manager.createEntity();
                manager.addComponent(builder.entityId, 'Optimus');

                expect(accessComponentData<Optimus>(manager, builder.entityId)).toBeDefined();
            });
    
            it('Should access generic type', () => {
                const manager = new ECSManager();
                manager.registerComponentType('Prime<Optimus>', complexDefaultValue);
                const builder = manager.createEntity();
                manager.addComponent(builder.entityId, 'Prime<Optimus>');

                expect(accessComponentData<Prime<Optimus>>(manager, builder.entityId)).toBeDefined();
            });
    
        });
    });
});
