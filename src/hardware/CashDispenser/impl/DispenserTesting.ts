import { setTimeout } from 'timers/promises';

export class DispenserTestImplementation implements IDispenser {
    private resolveDelay: number;
    availableFunds;

    constructor(resolveDelay = 0) {
        this.resolveDelay = resolveDelay;
    }

    setResolveDelay(millis: number) {
        this.resolveDelay = millis;
        return this;
    }

    async fundsAvailable(amount: number): Promise<boolean> {
        await setTimeout(this.resolveDelay);
        return true;    
    }

    async openDispenser() {
        await setTimeout(this.resolveDelay);

    }

    async closeDispenser() {
        await setTimeout(this.resolveDelay);

    }

    async disperse() {
        await setTimeout(this.resolveDelay);

    }

    async count(amount: number) {
        await setTimeout(this.resolveDelay);
        return 1;
    }
}
