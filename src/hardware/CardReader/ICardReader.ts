import { CardDataPayload } from './dto/CardDataPayload';

/**
 * Interface used to control hardware operations related to the ATM Card reader.
 */
export interface ICardReader {
    /**
     * Mechanically releases that card, leaving the card in a position in which a customer
     * can remove it.
     */
    releaseCard: () => Promise<unknown>;

    /**
     * Awaits the physical removal of the card from the card reader from the dispenser.
     * This function should be paired with displays that remind the user to take their card.
     */
    awaitCardRemoval: () => Promise<void>;
    setReady: () => Promise<unknown>;

    /**
     * Interface reads second track of card, processes raw data, and returns
     * an object containing the primary account number (PAN) and the card's
     * expiration date.
     * @returns CardDataPayload when valid card data is read
     * @returns undefined when the card is unrecognized or unreadable
     */
    readCard: () => Promise<CardDataPayload | undefined>;
}
