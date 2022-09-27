import { ICardReader } from '../../hardware/CardReader/ICardReader';

/**
 * An implementation of ICardReader with additional functions allowing manual control of features.
 * This implementation is intended for use with automated testing systems.
 */
export class CardReaderTesting implements ICardReader {

    releaseCard = jest.fn();

    awaitCardRemoval = jest.fn();

    setReady = jest.fn();

    readCard = jest.fn();

}
