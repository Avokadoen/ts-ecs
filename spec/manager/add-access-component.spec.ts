import { ECSManager } from "../../src/ecs/manager";
import { TestCompOne, TestCompFour } from "./utility";

describe('AddComponent', () => {
    it('Should succeed on ComponentIdentifier', () => {
        const manager = new ECSManager();
        const testComp = new TestCompOne();
        expect(manager.createEntity().addComponent(testComp).entityId)
            .toBe(0, "First entity was of unexpected value");
    });

    it('Should succeed on nested addComponent', () => {
        const manager = new ECSManager();
        const testComp = new TestCompOne();
        const testComp1 = new TestCompOne();
        const testComp2 = new TestCompOne();
        expect(manager.createEntity()
            .addComponent(testComp)
            .addComponent(testComp1)
            .addComponent(testComp2)
            .entityId)
            .toBe(0, "First entity was of unexpected value");
    });
});

describe('AccessComponentData', () => {
   it('Should return component on valid request', () => {
       const manager = new ECSManager();

       const testComp = new TestCompFour(10);
       manager.createEntity().addComponent(testComp);

       const testCompAccessed = manager.accessComponentData(testComp, 0);
       expect(testCompAccessed.someState).toBe(10, 'State had unexpected type!');
   });

    it('Should return null on invalid request', () => {
        const manager = new ECSManager();

        const testComp = new TestCompFour(10);
        manager.createEntity().addComponent(testComp);

        const testCompAccessed = manager.accessComponentData(testComp, 999);
        expect(testCompAccessed).toBeNull('Got component on invalid access');
    });
});

