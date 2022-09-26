import { withLogger } from './util/logger';
import { ICardReader } from './hardware/CardReader/ICardReader';
import { IState } from './state/IState';
import { AwaitingCustomerState } from './state/AwaitingCustomerState';
import { ITouchDisplay } from './hardware/TouchDisplay/ITouchDisplay';
import { MainMenuState } from './state/MainMenuState';
import { BalanceCheckState } from './state/BalanceCheckState';
import { UserAccountDTO } from './network/bank/dto/AuthenticatedUserSession';
import { IBankAPI } from './network/bank/bank.api';

const log = withLogger('App');

export class App {
    constructor(
        private cardReader: ICardReader,
        private dispenser: IDispenser,
        private display: ITouchDisplay,
        private bank: IBankAPI
    ) {
    }

    public createAwaitingCustomerState() {
        return new AwaitingCustomerState(this, this.cardReader, this.display, this.bank);
    }

    public createMainMenuState(userData: UserAccountDTO) {
        return new MainMenuState(this, this.display, this.cardReader, userData);
    }

    public createBalanceCheckState(userData: UserAccountDTO) {
        return new BalanceCheckState(this, userData, this.bank, this.display);
    }

    async start() {
        let state: IState | undefined = this.createAwaitingCustomerState();
        while(state) {
            state = await state.process();
        }
    }
}
