import { App } from '../App';
import { ICardReader } from '../hardware/CardReader/ICardReader';
import { DisplayErrorPrompt, ITouchDisplay } from '../hardware/TouchDisplay/ITouchDisplay';
import { IBankAPI } from '../network/bank/bank.api';
import { endSessionWithDisplayError } from './common';
import { IState } from './IState';

export class AwaitingCustomerState implements IState {

    constructor(app: App, private cardReader: ICardReader, private display: ITouchDisplay, private bank: IBankAPI) { }

    async process(): Promise<IState | undefined> {
        const cardData = await this.cardReader.readCard();
        
        if (!cardData) {
            await endSessionWithDisplayError(this.display, DisplayErrorPrompt.CARD_UNREADABLE, this.cardReader);
            return this;
        }

        // Check, handle card expired
        if (cardData.expirationDate.valueOf() < new Date().valueOf()) {
            await endSessionWithDisplayError(this.display, DisplayErrorPrompt.CARD_EXPIRED, this.cardReader);
            return this;
        }
        
        const enteredPIN = await this.display.requestPINEntry();
        const customerData = await this.bank.retrieveAccountData(cardData.PAN, enteredPIN);
        
        if (!customerData) {
            await endSessionWithDisplayError(this.display, DisplayErrorPrompt.INVALID_PIN, this.cardReader);
            return this;
        }
        return undefined;
    }
}
