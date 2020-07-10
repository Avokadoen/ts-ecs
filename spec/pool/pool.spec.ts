import { ComponentPool } from "../../src/pool/component-pool";
import { TestCompOne, TestCompFour } from "../utility";

describe('Pool', () => {

    it('Should add component', () => {
        const pool = new ComponentPool(new TestCompOne());

        pool.add(1);
        
        expect((pool as any).length).toBe(1); // tslint:disable-line: no-any
    });

    it('Should remove component', () => {
        const pool = new ComponentPool(new TestCompOne());

        pool.add(1);
        pool.remove(1);
        
        expect((pool as any).length).toBe(0); // tslint:disable-line: no-any
    });

    it('Should add beyond stride', () => {
        const pool = new ComponentPool(new TestCompOne(), 2);

        pool.add(1);
        pool.add(2);
        pool.add(3);

        
        expect((pool as any).length).toBe(3); // tslint:disable-line: no-any
        expect((pool as any).pool.length).toBe(4); // tslint:disable-line: no-any
    });

    it('Should loop with for of', () => {
        const pool = new ComponentPool(new TestCompOne());

        pool.add(1);
        pool.add(2);
        pool.add(3);
        pool.add(4);
        pool.add(5);

        for (const comp of pool) {
            // loop once to ensure we can loop multiple times
        }

        let count = 1;
        for (const comp of pool) {
            expect(comp.entityId).toBe(count++);
            expect(comp.data).toBeDefined();
        }

        expect(count - 1).toBe(5);
    });

    it('Should deep copy and clone', () => {
        interface MyComp {
            someData: TestCompFour;
        }

        const defaultValue: MyComp = {
            someData: new TestCompFour(1)
        };
        const pool = new ComponentPool(defaultValue);

        pool.add(1);

        const overrideValue: MyComp = {
            someData: new TestCompFour(42)
        };
        pool.add(2, overrideValue);

        let count = 1;
        for (const comp of pool) {
            if (count === 1) {
                expect(comp.data).not.toBe(defaultValue);
                expect(comp.data).toEqual(defaultValue);
            } else {
                expect(comp.data).not.toBe(overrideValue);
                expect(comp.data).toEqual(overrideValue);
            }

            count += 1;
        }
    });
    
});