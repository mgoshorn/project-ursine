import { App } from '../App';
import { ICardReader } from '../hardware/CardReader/ICardReader';
import { DisplayPrompt, ITouchDisplay } from '../hardware/TouchDisplay/ITouchDisplay';
import { UserAccountDTO } from '../network/bank/dto/AuthenticatedUserSession';
import { IState } from './IState';

export class MainMenuState implements IState {

    constructor(
        private app: App,
        private display: ITouchDisplay,
        private cardReader: ICardReader,
        private userData: UserAccountDTO
    ) {

    }

    async process() {
        const operationPayload = await this.display.awaitUserOperation();

        switch(operationPayload.opCode) {
            case 'EXIT': 
                const [ closePrompt ] = await Promise.all([
                    this.display.showPrompt(DisplayPrompt.RETRIEVE_CARD),
                    this.cardReader.releaseCard()
                ]);

                await this.cardReader.awaitCardRemoval();
                await closePrompt();
                return this.app.createAwaitingCustomerState();
        
            case 'BALANCE_CHECK':
                return this.app.createBalanceCheckState(this.userData);
        }



        return undefined;
    }
}