import { App } from '../App';
import { ICardReader } from '../hardware/CardReader/ICardReader';
import { DisplayPrompt, ITouchDisplay } from '../hardware/TouchDisplay/ITouchDisplay';
import { UserAccountDTO } from '../network/bank/dto/AuthenticatedUserSession';
import { IState } from './IState';
import { withLogger } from '../util/logger';
import { OperationDTOOpCodes } from '../hardware/TouchDisplay/dto/OperationPayload';

const log = withLogger('MainMenuState');

/**
 * The main menu state represents a display focused state in which
 * the user is expected to navigate and make a decision regarding what
 * kind of banking operation they would like to conduct.
 * This interaction is largely display driven by the awaitUserOperation.
 * This state will transition to a new state once the user has selected
 * an operation to conduct or is ready to conclude business at the ATM.
 */
export class MainMenuState implements IState {

    constructor(
        private app: App,
        private display: ITouchDisplay,
        private cardReader: ICardReader,
        private userData: UserAccountDTO
    ) {
        log.debug('Creating MainMenuState');
    }

    async process(): Promise<IState> {
        // Await user navigating main menu and selecting an operation to conduct
        const operationPayload = await this.display.awaitUserOperation();

        // Based on data payload provided, transition to next appropriate state
        switch(operationPayload.opCode) {
            case OperationDTOOpCodes.EXIT:
                log.debug(`Ending session with token ${this.userData.sessionToken}`);
                const [ closePrompt ] = await Promise.all([
                    this.display.showPrompt(DisplayPrompt.RETRIEVE_CARD),
                    this.cardReader.releaseCard()
                ]);

                await this.cardReader.awaitCardRemoval();
                await closePrompt();
                return this.app.createAwaitingCustomerState();
        
            case OperationDTOOpCodes.BALANCE_CHECK:
                return this.app.createBalanceCheckState(this.userData);

            case OperationDTOOpCodes.DEPOSIT:
                return this.app.createDepositState(this.userData);

            case OperationDTOOpCodes.WITHDRAWAL:
                return this.app.createWithdrawState(this.userData, operationPayload);

            case OperationDTOOpCodes.TRANSFER:
                return this.app.createTransferState(this.userData, operationPayload);
        }
    }
}