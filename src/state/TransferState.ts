import { App } from '../App';
import { NetworkAccessError, TransactionConflictError } from '../errors/UrsineErrors';
import { TransferOperationDTO } from '../hardware/TouchDisplay/dto/OperationPayload';
import { DisplayErrorPrompt, DisplayPrompt, DisplayView, ITouchDisplay } from '../hardware/TouchDisplay/ITouchDisplay';
import { IBankAPI } from '../network/bank/bank.api';
import { UserAccountDTO } from '../network/bank/dto/AuthenticatedUserSession';
import { withLogger } from '../util/logger';
import { DisplayViewOpCodes, TransferConfirmationDTO } from './dtos/DisplayViewDTOs';
import { DisplayViewResponseOpCodes } from './dtos/TransferConfirmationResponse';
import { IState } from './IState';

const log = withLogger('TransferState');

export class TransferState {
    constructor(
        private app: App,
        private userData: UserAccountDTO,
        private bank: IBankAPI,
        private display: ITouchDisplay,
        private transferOperation: TransferOperationDTO
    ) {
        log.debug(`Creating TransferState for session ${userData.sessionToken}`)
    }

    async process(): Promise<IState> {
        // Verify request would not overrun withdrawal/transfer limit
        if (this.transferOperation.amount > this.userData.withdrawalLimitRemaining) {
            await this.display.showErrorPrompt(DisplayErrorPrompt.EXCEEDS_ACCOUNT_LIMIT);
            return this.app.createMainMenuState(this.userData);
        }

        // Verify source account balance
        const balance = await this.bank.retrieveAccountBalance(this.userData.accountNumber, this.userData.sessionToken);
        if (balance <= this.transferOperation.amount) {
            await this.display.showErrorPrompt(DisplayErrorPrompt.INSUFFICIENT_FUNDS);
            return this.app.createMainMenuState(this.userData);
        }
        
        // Retrieve target account nickname for confirmation message
        const targetAccount = await this.bank.retrievePublicAccountData(this.transferOperation.targetAccount);

        // Handle no account
        if (!targetAccount) {
            await this.display.showErrorPrompt(DisplayErrorPrompt.TARGET_ACCOUNT_NOT_FOUND);
            return this.app.createMainMenuState(this.userData);
        }

        // Create payload to send to display 
        const dto: TransferConfirmationDTO = {
            opCode: DisplayViewOpCodes.TRANSFER_CONFIRMATION,
            data: {
                sourceAccount: this.userData.accountNumber,
                targetAccount: this.transferOperation.targetAccount,
                targetAccountNickname: targetAccount.accountNickname,
                transferAmount: this.transferOperation.amount
            }
        }

        const response = await this.display.showView(DisplayView.TRANSFER_CONFIRMATION, dto);

        if (response.opCode !== DisplayViewResponseOpCodes.TRANSFER_CONFIRMATION_RESPONSE) {
            log.error(`Invalid operational code returned from display for transfer opration \
using session ${this.userData.sessionToken}. Received code: ${response.opCode}. \
Expected: ${DisplayViewResponseOpCodes.TRANSFER_CONFIRMATION_RESPONSE}`)
            await this.display.showErrorPrompt(DisplayErrorPrompt.INVALID_DISPLAY_PAYLOAD);
            return this.app.createMainMenuState(this.userData);
        }

        if (response.confirmed) {
            // Attempt funds transfer
            try {
                await this.bank.executeTransfer(this.userData.accountNumber, this.transferOperation.targetAccount, this.transferOperation.amount, this.userData.sessionToken);
                await this.display.showView(DisplayView.TRANSFER_SUCCESS);
            } catch (err) {
                // Handle potential failure states
                if (err instanceof NetworkAccessError) {
                    await this.display.showErrorPrompt(DisplayErrorPrompt.NETWORK_FAILURE);
                }
                if (err instanceof TransactionConflictError) {
                    await this.display.showErrorPrompt(DisplayErrorPrompt.ACCOUNT_CHANGED);
                }
            }
        } else {
            // Show transfer cancelled message
            await this.display.showView(DisplayView.ACTION_CANCELLED);
        }

        // Return to main menu
        return this.app.createMainMenuState(this.userData);
    }
}
