import { App } from '../App';
import { ICardReader } from '../hardware/CardReader/ICardReader';
import { DisplayErrorPrompt, DisplayPrompt, ITouchDisplay } from '../hardware/TouchDisplay/ITouchDisplay';
import { IBankAPI } from '../network/bank/bank.api';
import { IState } from './IState';
import { withLogger } from '../util/logger';
import { WithdrawOperationDTO } from '../hardware/TouchDisplay/dto/OperationPayload';
import { UserAccountDTO } from '../network/bank/dto/AuthenticatedUserSession';
import { MainMenuState } from './MainMenuState';
import { NetworkAccessError, TransactionConflictError } from '../errors/UrsineErrors';

const log = withLogger('WithdrawState');

export class WithdrawState implements IState {
    constructor(
        private app: App,
        private userData: UserAccountDTO,
        private display: ITouchDisplay,
        private dispenser: IDispenser,
        private bank: IBankAPI,
        private withdrawDTO: WithdrawOperationDTO
    ) {
        log.debug(`Creating WithdrawState for session with ID: ${userData.sessionToken}`);
    }

    async process(): Promise<MainMenuState> {
        // Validate withdrawal will not exceed account limit
        if (this.withdrawDTO.amount > this.userData.withdrawalLimitRemaining) {
            await this.display.showErrorPrompt(DisplayErrorPrompt.EXCEEDS_ACCOUNT_LIMIT);
            return this.app.createMainMenuState(this.userData);
        }

        // Validate withdrawal will not result in negative balance
        const balance = await this.bank.retrieveAccountBalance(this.userData.accountNumber, this.userData.sessionToken);
        if (balance <= this.withdrawDTO.amount) {
            await this.display.showErrorPrompt(DisplayErrorPrompt.INSUFFICIENT_FUNDS);
            return this.app.createMainMenuState(this.userData);
        }

        // Validate that ATM has available funds to disperse requested amount
        const available = await this.dispenser.fundsAvailable(this.withdrawDTO.amount);
        if (!available) {
            log.warn(`Requested withdrawal amount for session ${this.userData.sessionToken} exceeds mechanically available funds and could not be completed.`);
            await this.display.showErrorPrompt(DisplayErrorPrompt.EXCEEDS_ATM_AVAILABLE_FUNDS);
            return this.app.createMainMenuState(this.userData);
        }

        // Update record
        try {
            await this.bank.processWithdrawal(this.userData.accountNumber, this.withdrawDTO.amount, this.userData.sessionToken);
        } catch (err) {
            if (err instanceof TransactionConflictError) {
                await this.display.showErrorPrompt(DisplayErrorPrompt.ACCOUNT_CHANGED);
                return this.app.createMainMenuState(this.userData);
            } else if (err instanceof NetworkAccessError) {
                await this.display.showErrorPrompt(DisplayErrorPrompt.NETWORK_FAILURE);
                return this.app.createMainMenuState(this.userData);
            } else {
                log.error(`Unexpected error occurred processing withdrawal: ${err.message}`);
            }
        }

        // Mechanically release funds
        try {
            await this.dispenser.disperse(this.withdrawDTO.amount);
        } catch (err) {
            // Credit account in case of mechanical failure
            await this.bank.creditAccount(this.userData.accountNumber, this.withdrawDTO.amount, this.userData.sessionToken, 'Withdrawal Credit - Mechanical Dispersal Failure');
        }

        // Show take cash prompt and await emptying of dispenser
        const [ closePrompt ] = await Promise.all([
            this.display.showPrompt(DisplayPrompt.RETRIEVE_DISPENSED_FUNDS),
            this.dispenser.awaitDispenserEmptied()
        ]);
        
        // end prompt message now that cash has been taken
        await closePrompt();

        return this.app.createMainMenuState(this.userData);
    }
}