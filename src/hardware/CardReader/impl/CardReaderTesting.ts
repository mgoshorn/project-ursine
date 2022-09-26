import { ICardReader } from '../ICardReader';
import { setTimeout } from 'timers/promises';
import { CardDataPayload } from '../dto/CardDataPayload';

/**
 * An implementation of ICardReader with additional functions allowing manual control of features.
 * This implementation is intended for use with automated testing systems.
 */
export class CardReaderTesting implements ICardReader {

    private resolveDelay: number;

    constructor(resolveDelay = 0) {
        this.resolveDelay = resolveDelay;
    }

    setResolveDelay(millis: number) {
        this.resolveDelay = millis;
        return this;
    }

    async releaseCard(): Promise<unknown> {
        await setTimeout(this.resolveDelay);
        return;
    }

    async awaitCardRemoval(): Promise<void> {
        await setTimeout(this.resolveDelay);
        return;
    }


    async setReady(): Promise<unknown> {
        await setTimeout(this.resolveDelay);
        return;
    }

    async eatCard(): Promise<unknown> {
        await setTimeout(this.resolveDelay);
        return;
    }

    async readCard(): Promise<CardDataPayload> {
        await setTimeout(this.resolveDelay);
        return {
            expirationDate: new Date(),
            PAN: '000011112345'
        };
    }

}
