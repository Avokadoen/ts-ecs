import { ECSManager } from "../../src/ecs/manager";
import { TestCompOne, TestCompFour, TestCompTwo } from "../utility";
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
            }
        });
    });
});


