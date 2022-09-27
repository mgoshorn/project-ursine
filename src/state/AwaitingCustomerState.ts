import { App } from '../App';
import { GenericHardwareOperationError, NetworkAccessError } from '../errors/UrsineErrors';
import { ICardReader } from '../hardware/CardReader/ICardReader';
import { DisplayErrorPrompt, ITouchDisplay } from '../hardware/TouchDisplay/ITouchDisplay';
import { IBankAPI } from '../network/bank/bank.api';
import { UserAccountDTO } from '../network/bank/dto/AuthenticatedUserSession';
import { endSessionWithDisplayError } from './common';
import { IState } from './IState';
import { withLogger } from '../util/logger';
import { CardDataPayload } from '../hardware/CardReader/dto/CardDataPayload';

const log = withLogger('AwaitingCustomerState');
export class AwaitingCustomerState implements IState {

    constructor(private app: App, private cardReader: ICardReader, private display: ITouchDisplay, private bank: IBankAPI) {
        log.debug(`Transitioning to AwaitingCustomerState`);
    }

    async process(): Promise<IState | undefined> {
        let cardData: CardDataPayload | undefined;
        try {
            cardData = await this.cardReader.readCard();
        } catch (err) {
            if (err instanceof GenericHardwareOperationError) {
                log.error(`Hardware error detected while attempting to read card data`);
                await this.display.showErrorPrompt(DisplayErrorPrompt.ATM_HARDWARE_ERROR);
                return this.app.createMaintenanceRequiredState();
            }
            log.error(`Unexpected error encountered while attempting to read card data`);
            await this.display.showErrorPrompt(DisplayErrorPrompt.UNKNOWN_ERROR);
            try {
                await this.cardReader.releaseCard();
                return this;
            } catch (err) {
                return this.app.createMaintenanceRequiredState();
            }
        }
        
        if (!cardData) {
            log.debug(`Unable to read card data, releasing card`);
            await endSessionWithDisplayError(this.display, DisplayErrorPrompt.CARD_UNREADABLE, this.cardReader);
            return this;
        }

        // Check, handle card expired
        if (cardData.expirationDate.valueOf() < new Date().valueOf()) {
            log.debug(`Inserted card expired, releasing card`);
            await endSessionWithDisplayError(this.display, DisplayErrorPrompt.CARD_EXPIRED, this.cardReader);
            return this;
        }
        
        const enteredPIN = await this.display.requestPINEntry();

        if (!enteredPIN) {
            log.debug(`User cancelled PIN entry, releasing card`);
            await this.cardReader.releaseCard();
            return this;
        }

        let customerData: UserAccountDTO | undefined;
        try {
            customerData = await this.bank.retrieveAccountData(cardData.PAN, enteredPIN);
        } catch (err) {
            if (err instanceof NetworkAccessError) {
                log.warn(`Unable to reach bank API to authenticate ATM user`);
                await endSessionWithDisplayError(this.display, DisplayErrorPrompt.NETWORK_FAILURE, this.cardReader);
                return this;
            }
        }
        
        if (!customerData) {
            log.debug('Customer data not retrieved with provided card data and PIN')
            await endSessionWithDisplayError(this.display, DisplayErrorPrompt.INVALID_PIN, this.cardReader);
            return this;
        }

        log.debug(`User data retrieved, transitioning to main menu`)
        return this.app.createMainMenuState(customerData);
    }
}
