import { withLogger } from './util/logger';
import { ICardReader } from './hardware/CardReader/ICardReader';
import { IState } from './state/IState';
import { AwaitingCustomerState } from './state/AwaitingCustomerState';
import { DisplayErrorPrompt, ITouchDisplay } from './hardware/TouchDisplay/ITouchDisplay';
import { MainMenuState } from './state/MainMenuState';
import { BalanceCheckState } from './state/BalanceCheckState';
import { UserAccountDTO } from './network/bank/dto/AuthenticatedUserSession';
import { IBankAPI } from './network/bank/bank.api';
import { DepositState } from './state/DepositState';
import { WithdrawState } from './state/WithdrawState';
import { TransferOperationDTO, WithdrawOperationDTO } from './hardware/TouchDisplay/dto/OperationPayload';
import { TransferState } from './state/TransferState';
import { MaintenanceRequiredState } from './state/MaintenanceRequiredState';

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

    public createDepositState(userData: UserAccountDTO) {
        return new DepositState(this, userData, this.dispenser, this.bank, this.display)
    }

    public createWithdrawState(userData: UserAccountDTO, withdrawDTO: WithdrawOperationDTO) {
        return new WithdrawState(this, userData, this.display, this.dispenser, this.bank, withdrawDTO);
    }

    public createTransferState(userData: UserAccountDTO, transferDTO: TransferOperationDTO) {
        return new TransferState(this, userData, this.bank, this.display, transferDTO);
    }

    public createMaintenanceRequiredState() {
        return new MaintenanceRequiredState(this, this.display);
    }

    public async endSessionWithDisplayError(error: DisplayErrorPrompt) {
        await Promise.all([
            await this.display.showErrorPrompt(error),
            await this.cardReader.releaseCard()
        ]);
        await this.cardReader.awaitCardRemoval();
        return this.createAwaitingCustomerState();
    }

    async start() {
        let state: IState | undefined = this.createAwaitingCustomerState();
        while(state) {
            state = await state.process();
        }
    }
}
