import { EcsError } from "./ecs-error";

export class UnrecognizedComponentError extends EcsError {
    constructor(
        public message: string,
        public name: string = 'UnrecognizedComponentError'
    ) {
        super(message);
    }
}