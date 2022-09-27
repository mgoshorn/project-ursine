
import { App } from '../App';
import { NetworkAccessError } from '../errors/UrsineErrors';
import { DisplayErrorPrompt, DisplayPrompt, DisplayView, ITouchDisplay } from '../hardware/TouchDisplay/ITouchDisplay';
import { IBankAPI } from '../network/bank/bank.api';
import { UserAccountDTO } from '../network/bank/dto/AuthenticatedUserSession';
import { withLogger } from '../util/logger';
import { DepositConfirmationDTO, DepositSummaryDTO, DisplayViewOpCodes } from './dtos/DisplayViewDTOs';
import { DisplayViewResponse, DisplayViewResponseOpCodes } from './dtos/TransferConfirmationResponse';
import { IState } from './IState';

const log = withLogger('DepositState');

export class DepositState {
    constructor(
        private app: App,
        private userData: UserAccountDTO,
        private dispenser: IDispenser,
        private bank: IBankAPI,
        private display: ITouchDisplay
    ) {
        log.debug(`Creating DepositState for session ${userData.sessionToken}`)
    }

    async process(): Promise<IState> {
        await this.dispenser.allowDeposit();

        /**
         * At this point we have some diverging behavior and race conditions -
         * The dispenser will accept cash from them, but should also
         * be a button on the display which will cancel the interaction.
         */
        
        const responsePromise = this.display.showView(DisplayView.INSERT_CASH_TO_DEPOSIT);
        const cashInsertionPromise = this.dispenser.awaitCashInsertion();

        let result: Promise<boolean | DisplayViewResponse>;
        let amountDeposited: BigInt;
        try {
            result = Promise.race([ responsePromise, cashInsertionPromise ]);
    
            if (typeof result === 'boolean') {
                // In this case we detected cash insertion before any response from the display
                const response = await responsePromise;
                
                // Cash was inserted, but deposit was cancelled from Display
                if(response.opCode === DisplayViewResponseOpCodes.DEPOSIT_CANCELLED_FROM_DISPLAY) {
                    return await this.cancelDeposit();
                } else if(response.opCode !== DisplayViewResponseOpCodes.DEPOSIT_RESOLVED_NORMALLY) {
                    log.error(`Invalid response code from display. Received ${response.opCode}. Acceptable response codes: ${[
                        DisplayViewResponseOpCodes.DEPOSIT_RESOLVED_NORMALLY, DisplayViewResponseOpCodes.DEPOSIT_CANCELLED_FROM_DISPLAY
                    ]}`);
                    log.warn(`Continuing under assumption deposit was not cancelled - Customer will have chance to confirm`);
                }
            } else {
                return await this.cancelDeposit();
            }
            amountDeposited = await this.dispenser.countDeposit();

        } catch (err) {
            // Mechanical error encountered, cannot process deposit
            log.error(`Error processing deposit`);
            return this.app.createMaintenanceRequiredState();
        }

        // Continue processing deposit

        const dto: DepositConfirmationDTO = {
            opCode: DisplayViewOpCodes.DEPOSIT_CONFIRMATION,
            data: {
                depositAmount: amountDeposited,
                targetAccount: this.userData.accountNumber
            }
        }

        const response = await this.display.showView(DisplayView.DEPOSIT_CONFIRMATION, dto);

        if (response.opCode === DisplayViewResponseOpCodes.DEPOSIT_CONFIRMATION_RESPONSE) {
            if (!response.confirmed) {
                log.debug(`Deposit cancelled, refunding inserted funds`);
                return await this.cancelDeposit();
            }
        } else {
            log.error(`Invalid response code from display. Received ${response.opCode}, expected ${DisplayViewResponseOpCodes.DEPOSIT_CONFIRMATION_RESPONSE}. Cancelling deposit.`);
            return await this.cancelDeposit();
        }

        let previousBalance: BigInt;
        let newBalance: BigInt;

        log.silly(`Processing deposit for amount ${amountDeposited} into account ${this.userData.accountNumber}`)
        try {
            previousBalance = await this.bank.retrieveAccountBalance(this.userData.accountNumber, this.userData.sessionToken);
            newBalance = await this.bank.processDeposit(this.userData.accountNumber, amountDeposited, this.userData.sessionToken);
        } catch (err) {
            if (err instanceof NetworkAccessError) {
                log.warn(`Network error detected while processing deposit. Operation cancelled.`)
                await this.display.showErrorPrompt(DisplayErrorPrompt.NETWORK_FAILURE);
            } else {
                log.warn(`Unexpected error (${err.message}) while processing deposit. Refunding cash. Caused by: ${err.stack}`)
                await this.display.showErrorPrompt(DisplayErrorPrompt.UNKNOWN_ERROR);
            }
            return await this.cancelDeposit();
        }

        log.debug(`Deposit processed successfully`);
        let mechanicalError = false;
        try {
            // At this point the deposit is already successful, so mechanical errors will not fail the deposit process
            await this.dispenser.acceptDeposit();
        } catch (err) {
            mechanicalError = true;
        }

        const depositSummaryDTO: DepositSummaryDTO = {
            opCode: DisplayViewOpCodes.DEPOSIT_SUMMARY,
            data: {
                accountNumber: this.userData.accountNumber,
                previousBalance,
                newBalance,
                depositAmount: amountDeposited
            }
        }

        log.silly('Displaying deposit summary information');
        await this.display.showView(DisplayView.DEPOSIT_SUMMARY, depositSummaryDTO);

        if (mechanicalError) {
            return this.app.createMaintenanceRequiredState();
        }

        return this.app.createMainMenuState(this.userData);
    }


    /**
     * Helper function to hold repeated logic related to cancelling and refunding cash
     * @returns 
     */
    private async cancelDeposit(): Promise<IState> {
        // In this scenario, we have detected a cancel interaction in the view first
        const cashWasInserted = await this.dispenser.cancelDeposit();

        // If cash was inserted, then re-dispense and await user taking funds
        if (cashWasInserted) {
            await Promise.all([
                this.display.showPrompt(DisplayPrompt.RETRIEVE_DISPENSED_FUNDS),
                this.dispenser.awaitDispenserEmptied()
            ]);
        }            

        // Show operation successfully cancelled message
        await this.display.showView(DisplayView.ACTION_CANCELLED);
        return this.app.createMainMenuState(this.userData); 
    }
}
