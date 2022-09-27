import { App } from '../../App';
import { NetworkAccessError } from '../../errors/UrsineErrors';
import { ICardReader } from '../../hardware/CardReader/ICardReader';
import { OperationDTO, OperationDTOOpCodes } from '../../hardware/TouchDisplay/dto/OperationPayload';
import { ITouchDisplay } from '../../hardware/TouchDisplay/ITouchDisplay';
import { UserAccountDTO } from '../../network/bank/dto/AuthenticatedUserSession';
import { AwaitingCustomerState } from '../../state/AwaitingCustomerState';
import { BalanceCheckState } from '../../state/BalanceCheckState';
import { DepositState } from '../../state/DepositState';
import { IState } from '../../state/IState';
import { MainMenuState } from '../../state/MainMenuState';
import { TransferState } from '../../state/TransferState';
import { WithdrawState } from '../../state/WithdrawState';
import { BankTestingImpl } from '../test-implementations/BankTestingImpl';
import { CardReaderTesting } from '../test-implementations/CardReaderTesting';
import { DispenserTestImplementation } from '../test-implementations/DispenserTesting';
import { TouchDisplayTesting } from '../test-implementations/TouchDisplayTesting';

describe('BalanceCheckState', () => {

    const testCardReader = new CardReaderTesting();
    const testDispenser = new DispenserTestImplementation();
    const testTouchDisplay = new TouchDisplayTesting();
    const testBankAPI = new BankTestingImpl();

    // Create app instance with mock/stubbed device implementations
    const app = new App(
        testCardReader,
        testDispenser,
        testTouchDisplay,
        testBankAPI
    );

    const userData: UserAccountDTO = {
        accountNickname: 'test-acc-nickname',
        accountNumber: '1111222233334444',
        sessionToken: 'test-session-token',
        withdrawalLimit: 100_000_000n,
        withdrawalLimitRemaining: 100_000_000n,
    }

    describe('process', () => {
        let balanceCheckState: BalanceCheckState;
        beforeEach(() => {
            balanceCheckState = new BalanceCheckState(app, userData, testBankAPI, testTouchDisplay);
        });

        describe('when bank.retrieveAccountBalance rejects', () => {
            // Stub functions related to ending session and returning card for this block
            beforeEach(() => {
                testTouchDisplay.showErrorPrompt.mockResolvedValue(undefined);
                testCardReader.releaseCard.mockResolvedValue(undefined);
                testCardReader.awaitCardRemoval.mockResolvedValue(undefined);
            })
            
            test('with NetworkAccessError -> awaitingCustomerState', async () => {
                testBankAPI.retrieveAccountBalance.mockRejectedValueOnce(new NetworkAccessError('test network error'));
                const nextState = await balanceCheckState.process();

                expect(nextState).toBeInstanceOf(AwaitingCustomerState);
                expect(testTouchDisplay.showView).not.toBeCalled();
            });
            test('with unexpected error -> awaitingCustomerState', async () => {
                testBankAPI.retrieveAccountBalance.mockRejectedValueOnce(new Error('test generic error'));
                const nextState = await balanceCheckState.process();

                expect(nextState).toBeInstanceOf(AwaitingCustomerState);
                expect(testTouchDisplay.showView).not.toBeCalled();
            });
        });

        test('show balance view and return to MainMenu', async () => {
            testBankAPI.retrieveAccountBalance.mockResolvedValue(500_000n)
            testTouchDisplay.showView.mockResolvedValue(undefined);

            const nextState = await balanceCheckState.process();

            expect(nextState).toBeInstanceOf(MainMenuState);
            expect(testTouchDisplay.showView).toBeCalled();
        });
    });
})
