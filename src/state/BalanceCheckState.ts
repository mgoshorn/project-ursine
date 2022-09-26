import { App } from '../App';
import { DisplayView, ITouchDisplay } from '../hardware/TouchDisplay/ITouchDisplay';
import { DisplayBalanceDTO, DisplayViewOpCodes } from './dtos/DisplayViewDTOs';
import { IState } from './IState';
import { MainMenuState } from './MainMenuState';
import { withLogger } from '../util/logger';
import { UserAccountDTO } from '../network/bank/dto/AuthenticatedUserSession';
import { IBankAPI } from '../network/bank/bank.api';

const log = withLogger('BalanceCheckState');

export class BalanceCheckState implements IState {
    constructor(
        private app: App,
        private userData: UserAccountDTO,
        private bank: IBankAPI,
        private display: ITouchDisplay
    ) {
        log.debug(`Creating BalanceCheckState for session ${userData.sessionToken}`)
    }

    async process(): Promise<MainMenuState> {
        log.silly(`Retrieving balance for account with session ${this.userData.sessionToken}`);
        const balance = await this.bank.retrieveAccountBalance(this.userData.accountNumber, this.userData.sessionToken);
        const monitorMessage: DisplayBalanceDTO = {
            opCode: DisplayViewOpCodes.BALANCE,
            data: {
                balance,
                accountNumber: this.userData.accountNumber
            }
        };
        log.silly(`Showing balance to user with session ${this.userData.sessionToken}`)
        await this.display.showView(DisplayView.BALANCE_CHECK, monitorMessage);
        log.silly(`Balance check view closed, returning to main menu`);
        return this.app.createMainMenuState(this.userData);
    }
}
