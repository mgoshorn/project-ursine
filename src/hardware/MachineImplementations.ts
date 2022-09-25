import { ICardReader } from './CardReader/ICardReader';

export type MachineImplementations = {
    cardReader: ICardReader,
    dispenser: IDispenser,
    touchDisplay: ITouchDisplay
}
