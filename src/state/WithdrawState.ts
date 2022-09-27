import { App } from '../App';
import { DisplayErrorPrompt, DisplayPrompt, ITouchDisplay } from '../hardware/TouchDisplay/ITouchDisplay';
import { IBankAPI } from '../network/bank/bank.api';
import { IState } from './IState';
import { withLogger } from '../util/logger';
import { WithdrawOperationDTO } from '../hardware/TouchDisplay/dto/OperationPayload';
import { UserAccountDTO } from '../network/bank/dto/AuthenticatedUserSession';
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

    async process(): Promise<IState> {
        // Validate amount
        if (this.withdrawDTO.amount <= 0n) {
            log.warn(`User attempted to withdraw non-positive amount. This should not be possible.`);
            await this.display.showErrorPrompt(DisplayErrorPrompt.INVALID_AMOUNT);
            return this.app.createMainMenuState(this.userData);
        }

        // Validate withdrawal will not exceed account limit
        if (this.withdrawDTO.amount > this.userData.withdrawalLimitRemaining) {
            log.debug(`Requested withdrawal amount exceeds remaining withdrawal limit`);
            await this.display.showErrorPrompt(DisplayErrorPrompt.EXCEEDS_ACCOUNT_LIMIT);
            return this.app.createMainMenuState(this.userData);
        }

        // Validate withdrawal will not result in negative balance
        const balance = await this.bank.retrieveAccountBalance(this.userData.accountNumber, this.userData.sessionToken);
        if (balance <= this.withdrawDTO.amount) {
            log.debug(`Requested withdrawal amount exceeds remaining balance`);
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
                await this.display.showErrorPrompt(DisplayErrorPrompt.UNKNOWN_ERROR);
                return this.app.createMainMenuState(this.userData);
            }
        }

        // Mechanically release funds
        try {
            await this.dispenser.dispense(this.withdrawDTO.amount);
        } catch (err) {
            // Credit account in case of mechanical failure
            await this.display.showErrorPrompt(DisplayErrorPrompt.ATM_HARDWARE_ERROR);
            await this.bank.creditAccount(this.userData.accountNumber, this.withdrawDTO.amount, this.userData.sessionToken, 'Withdrawal Credit - Mechanical Dispersal Failure');
            return this.app.createMaintenanceRequiredState();
        }

        // Show take cash prompt and await emptying of dispenser
        const [ closePrompt, dispenserResponse ] = await Promise.allSettled([
            this.display.showPrompt(DisplayPrompt.RETRIEVE_DISPENSED_FUNDS),
            this.dispenser.awaitDispenserEmptied()
        ]);
        
        if (closePrompt.status === "rejected") {
            log.warn(`Unexpected promise rejection from display`);
        } else {
            // end prompt message now that cash has been taken
            await closePrompt.value();
        }

        if (dispenserResponse.status === 'rejected') {
            log.error(`Mechanical error detected while awaiting dispenser emptying, return to MaintenanceMode`);
            await this.display.showErrorPrompt(DisplayErrorPrompt.MAINTENANCE_REQUIRED);
            return this.app.createMaintenanceRequiredState();
        }

        return this.app.createMainMenuState(this.userData);
    }
}
