import { CardDataPayload } from './dto/CardDataPayload';

/**
 * Interface used to control hardware operations related to the ATM Card reader.
 */
export interface ICardReader {
    releaseCard: () => Promise<unknown>;
    setReady: () => Promise<unknown>;
    eatCard: () => Promise<unknown>;

    /**
     * Interface reads second track of card, processes raw data, and returns
     * an object containing the primary account number (PAN) and the card's
     * expiration date.
     */
    readCard: () => Promise<CardDataPayload>;
}
