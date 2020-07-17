export class EcsError extends Error {
    constructor(
        public message: string,
        public name: string = 'EcsError'
    ) {
        super(message);
    }
}