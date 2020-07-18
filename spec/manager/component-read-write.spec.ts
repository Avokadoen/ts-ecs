import { ECSManager } from "../../src/ecs/manager";
import { TestCompOne, TestCompFour, TestCompTwo, TestCompThree } from "../utility";
import { EcsError } from "../../src/errors/ecs-error";

describe('Component read/write', () => {
    let manager: ECSManager;
    beforeEach(() => {
        manager = new ECSManager();
        manager.registerComponentType(TestCompOne.identifier, new TestCompOne());
        manager.registerComponentType(TestCompFour.identifier, new TestCompFour(0));
    });

    describe('AddComponent', () => {
        it('Should succeed on simple', () => {
            expect(manager.createEntity().addComponent(TestCompOne.identifier, new TestCompOne()).entityId)
                .toBe(0, "First entity was of unexpected value");
            // tslint:disable-next-line: no-any
            expect((manager as any).components.get(TestCompOne.identifier).length).toBe(1);
        });
    
        it('Should succeed on nested addComponent', () => {
            expect(manager.createEntity()
                .addComponent(TestCompOne.identifier, new TestCompOne())
                .addComponent(TestCompFour.identifier, new TestCompFour(0))
                .entityId)
                .toBe(0, "First entity was of unexpected value");
            // tslint:disable-next-line: no-any
            expect((manager as any).components.get(TestCompOne.identifier).length).toBe(1);
            // tslint:disable-next-line: no-any
            expect((manager as any).components.get(TestCompFour.identifier).length).toBe(1);
        });

        it('Should fail on add with unrecognized type', () => {
            try {
                manager.createEntity().addComponent(TestCompThree.identifier, new TestCompThree());
            } catch(e) {
                expect(e.message).toBe(`Can not add a component of type ${TestCompThree.identifier} before it has been registered`);
                return;
            }
            expect(false).toBe(true, 'Reached unreachable');
        });

        it('Should fail on multiple adds to same entity with same type', () => {
            const eBuilder = manager.createEntity();
            try {
                eBuilder.addComponent(TestCompOne.identifier).addComponent(TestCompOne.identifier);
            } catch(e) {
                expect(e.message).toBe(`Component with id '${eBuilder.entityId}' already exist`);
                return;
            }
            expect(false).toBe(true, 'Reached unreachable');
        });

        it('Should fail on add with unrecognized entity', () => {
            const notEntityId = 9999;
            try {
                manager.addComponent(notEntityId, TestCompOne.identifier);
            } catch(e) {
                expect(e.message).toBe(`Can not find entity with id ${notEntityId}`);
                return;
            }
            expect(false).toBe(true, 'Reached unreachable');
        });
    });

    describe('Remove component', () => {
        it('Should fail on unrecognized type', () => {
            const manager = new ECSManager();

            try {
                manager.removeComponent(-999, 'UnrecognizedType');
            } catch(e) {
                expect(e.message).toBe(`Can't remove component of type that does not exist`);
                return;
            }
            expect(false).toBe(true, 'Reached unreachable');
        });
    });
    
    describe('AccessComponentData', () => {
        it('Should return component on valid request', () => {
            manager.createEntity().addComponent(TestCompFour.identifier, new TestCompFour(10));
        
            const testCompAccessed = manager.accessComponentData(0, TestCompFour.identifier) as TestCompFour;
            expect(testCompAccessed.someState).toBe(10, 'State had unexpected value!');
        });
    
        it('Should return null on invalid request', () => {
            manager.createEntity().addComponent(TestCompFour.identifier, new TestCompFour(10));

            const testCompAccessed = manager.accessComponentData(999, TestCompFour.identifier) as TestCompFour;
            expect(testCompAccessed).toBeUndefined('Got component on invalid access');
        });
    });

    describe('Register component', () => {
        it('Should fail on register component twice', () => {
            try {
                manager.registerComponentType(TestCompOne.identifier, new TestCompOne());
            } catch(e) {
                expect(e.message).toBe(`Component type ${TestCompOne.identifier} has already been registered`);
                return;
            }
            expect(false).toBe(true, 'Reached unreachable');
        });
    });
});


