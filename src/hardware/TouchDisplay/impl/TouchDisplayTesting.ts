import { setTimeout } from 'timers/promises';
import { OperationDTO } from '../dto/OperationPayload';
import { DisplayErrorPrompt, ITouchDisplay } from '../ITouchDisplay';

export class TouchDisplayTesting implements ITouchDisplay {
    private resolveDelay: number;

    constructor(resolveDelay = 0) {
        this.resolveDelay = resolveDelay;
    }

    setResolveDelay(millis: number) {
        this.resolveDelay = millis;
        return this;
    }

    async setState() {
        await setTimeout(this.resolveDelay);
    }

    async showErrorPrompt(error: DisplayErrorPrompt): Promise<void> {
        await setTimeout(this.resolveDelay);
    }

    async awaitUserOperation(): Promise<OperationDTO> {
        await setTimeout(this.resolveDelay);
        return {
            opCode: 'EXIT'
        };
    }

    async requestPINEntry(): Promise<number> {
        await setTimeout(this.resolveDelay);
        return 1234;
    }
}
