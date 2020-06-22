import { ECSManager } from '../ecs/manager';
import {ComponentIdentifier} from '../ecs/component-identifier.model';
import {QueryToken} from '../ecs/esc-query.model';

class TestCompOne implements ComponentIdentifier {
    static readonly identifier = 'TestComp1';

    identifier(): string {
        return TestCompOne.identifier;
    }
}

class TestCompTwo implements ComponentIdentifier {
    static readonly identifier = 'TestComp2';

    identifier(): string {
        return TestCompTwo.identifier;
    }
}

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

    const createSimpleQueryScenario = (manager: ECSManager) => {
        manager.createEntity()
            .addComponent(new TestCompOne())
            .addComponent(new TestCompOne())
            .addComponent(new TestCompOne());

        manager.createEntity();

        manager.createEntity().addComponent(new TestCompTwo());

        manager.createEntity().addComponent(new TestCompOne());

        return manager;
    };

    it('Should succeed on single comp query entity', () => {
        const manager = createSimpleQueryScenario(new ECSManager());

        const query = [
            {
                componentIdentifier: TestCompTwo.identifier,
                token: QueryToken.FIRST
            }
        ];


        expect(manager.queryEntities(query))
            .toEqual([{ id: 2 }], "Query returned unexpected result");
    });
});
