import { App } from '../../App';
import { OperationDTOOpCodes } from '../../hardware/TouchDisplay/dto/OperationPayload';
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

describe('MainMenuState', () => {

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
        let mainMenuState: MainMenuState;
        
        beforeEach(() => {
            jest.clearAllMocks();
            mainMenuState = new MainMenuState(app, testTouchDisplay, testCardReader, userData);
        });

        const ops: [OperationDTOOpCodes, new (...args: any[]) => IState][] = [
            [ OperationDTOOpCodes.BALANCE_CHECK, BalanceCheckState],
            [ OperationDTOOpCodes.DEPOSIT, DepositState],
            [ OperationDTOOpCodes.WITHDRAWAL, WithdrawState],
            [ OperationDTOOpCodes.TRANSFER, TransferState],
        ];

        ops.forEach(([opCode, classRef]) => {
            describe(`when opCode -> ${opCode}`, () => {
                test(`Application transitions to ${classRef.name}`, async () => {
                    testTouchDisplay.awaitUserOperation.mockResolvedValue({
                        opCode
                    });
                    
                    const result = await mainMenuState.process();
                    expect(result).toBeInstanceOf(classRef);
                });
            });
        });

        describe(`when opCode -> ${OperationDTOOpCodes.EXIT}`, () => {
            test('Application transitions to AwaitingCustomerState when resolving normally', async () => {
                testTouchDisplay.awaitUserOperation.mockResolvedValue({
                    opCode: OperationDTOOpCodes.EXIT
                });
                testTouchDisplay.showPrompt.mockResolvedValue(() => Promise.resolve());
                testCardReader.releaseCard.mockResolvedValue(undefined);
                testCardReader.awaitCardRemoval.mockResolvedValue(undefined);
    
                const result = await mainMenuState.process();
                expect(result).toBeInstanceOf(AwaitingCustomerState);
            })
        });
    });
})
