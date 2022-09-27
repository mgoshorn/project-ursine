import { App } from '../../App';
import { GenericHardwareOperationError, NetworkAccessError, TransactionConflictError } from '../../errors/UrsineErrors';
import { OperationDTOOpCodes, WithdrawOperationDTO } from '../../hardware/TouchDisplay/dto/OperationPayload';
import { UserAccountDTO } from '../../network/bank/dto/AuthenticatedUserSession';
import { MainMenuState } from '../../state/MainMenuState';
import { MaintenanceRequiredState } from '../../state/MaintenanceRequiredState';
import { WithdrawState } from '../../state/WithdrawState';
import { BankTestingImpl } from '../test-implementations/BankTestingImpl';
import { CardReaderTesting } from '../test-implementations/CardReaderTesting';
import { DispenserTestImplementation } from '../test-implementations/DispenserTesting';
import { TouchDisplayTesting } from '../test-implementations/TouchDisplayTesting';

describe('WithdrawState', () => {

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

    const defaultWithdrawDTO: WithdrawOperationDTO = {
        amount: 500n,
        opCode: OperationDTOOpCodes.WITHDRAWAL
    };

    describe('process', () => {
        let withdrawState: WithdrawState;
        
        beforeEach(() => {
            jest.clearAllMocks();
            withdrawState = new WithdrawState(app, userData, testTouchDisplay, testDispenser, testBankAPI, defaultWithdrawDTO);
        });

        describe('preliminary validation failures', () => {
            
            test('when amount negative, should show error and return to main menu', async () => {
                const dto: WithdrawOperationDTO = { ...defaultWithdrawDTO, amount: -1n };
                withdrawState = new WithdrawState(app, userData, testTouchDisplay, testDispenser, testBankAPI, dto);

                const nextState = await withdrawState.process();

                expect(nextState).toBeInstanceOf(MainMenuState);
                expect(testTouchDisplay.showErrorPrompt).toBeCalled();
                expect(testBankAPI.processWithdrawal).not.toBeCalled();
            });

            test('when amount zero, should show error and return to main menu', async () => {
                const dto: WithdrawOperationDTO = { ...defaultWithdrawDTO, amount: 0n };
                withdrawState = new WithdrawState(app, userData, testTouchDisplay, testDispenser, testBankAPI, dto);

                const nextState = await withdrawState.process();

                expect(nextState).toBeInstanceOf(MainMenuState);
                expect(testTouchDisplay.showErrorPrompt).toBeCalled();
                expect(testBankAPI.processWithdrawal).not.toBeCalled();
            });

            test('when amount exceeds remaining limit, should show error and return to main menu', async () => {
                const dto: WithdrawOperationDTO = { ...defaultWithdrawDTO, amount: 100n };
                const limitedUserData: UserAccountDTO = { ...userData, withdrawalLimitRemaining: 0n}
                withdrawState = new WithdrawState(app, limitedUserData, testTouchDisplay, testDispenser, testBankAPI, dto);

                const nextState = await withdrawState.process();

                expect(nextState).toBeInstanceOf(MainMenuState);
                expect(testTouchDisplay.showErrorPrompt).toBeCalled();
                expect(testBankAPI.processWithdrawal).not.toBeCalled();
            });

            test('when amount exceeds user account balance, should show error and return to main menu', async () => {
                testBankAPI.retrieveAccountBalance.mockResolvedValueOnce(0n);
                const dto: WithdrawOperationDTO = { ...defaultWithdrawDTO, amount: 100n };
                withdrawState = new WithdrawState(app,userData, testTouchDisplay, testDispenser, testBankAPI, dto);

                const nextState = await withdrawState.process();

                expect(nextState).toBeInstanceOf(MainMenuState);
                expect(testTouchDisplay.showErrorPrompt).toBeCalled();
                expect(testBankAPI.processWithdrawal).not.toBeCalled();
            });

            test('when amount exceeds ATM available funds, should show error and return to main menu', async () => {
                testBankAPI.retrieveAccountBalance.mockResolvedValueOnce(100_000_000n);
                testDispenser.fundsAvailable.mockResolvedValueOnce(0n);
                const dto: WithdrawOperationDTO = { ...defaultWithdrawDTO, amount: 100n };
                withdrawState = new WithdrawState(app, userData, testTouchDisplay, testDispenser, testBankAPI, dto);

                const nextState = await withdrawState.process();

                expect(nextState).toBeInstanceOf(MainMenuState);
                expect(testTouchDisplay.showErrorPrompt).toBeCalled();
                expect(testBankAPI.processWithdrawal).not.toBeCalled();
            });
        });

        describe('when processWithdrawal rejects', () => {
            const errors = [
                new TransactionConflictError('TransactionConflictError'),
                new NetworkAccessError('NetworkAccessError'),
                new Error('Error')
            ];

            errors.forEach(err => {
                test(`with ${err.message}, show error and return to main menu`, async () => {
                    withdrawState = new WithdrawState(app, userData, testTouchDisplay, testDispenser, testBankAPI, defaultWithdrawDTO);
                    testBankAPI.retrieveAccountBalance.mockResolvedValueOnce(100_000_000n);
                    testDispenser.fundsAvailable.mockResolvedValueOnce(100_000n);
                    testBankAPI.processWithdrawal.mockRejectedValueOnce(err);
    
                    const nextState = await withdrawState.process();
    
                    expect(nextState).toBeInstanceOf(MainMenuState);
                    expect(testTouchDisplay.showErrorPrompt).toBeCalled();
                    expect(testBankAPI.processWithdrawal).toBeCalled();
                    expect(testDispenser.dispense).not.toBeCalled();
                });
            })
        });
        
        test(`when error encountered while dispensing, show error and move to Maintenance mode`, async () => {
            withdrawState = new WithdrawState(app, userData, testTouchDisplay, testDispenser, testBankAPI, defaultWithdrawDTO);
            testBankAPI.retrieveAccountBalance.mockResolvedValueOnce(100_000_000n);
            testDispenser.fundsAvailable.mockResolvedValueOnce(100_000n);
            testBankAPI.processWithdrawal.mockResolvedValueOnce({});
            testDispenser.dispense.mockRejectedValueOnce(new GenericHardwareOperationError());

            const nextState = await withdrawState.process();

            expect(nextState).toBeInstanceOf(MaintenanceRequiredState);
            expect(testTouchDisplay.showErrorPrompt).toBeCalled();
            expect(testDispenser.dispense).toBeCalled();
        });

        test(`when error encountered detecting dispenser emptying, show error and return to main menu`, async () => {
            withdrawState = new WithdrawState(app, userData, testTouchDisplay, testDispenser, testBankAPI, defaultWithdrawDTO);
            testBankAPI.retrieveAccountBalance.mockResolvedValueOnce(100_000_000n);
            testDispenser.fundsAvailable.mockResolvedValueOnce(100_000n);
            testBankAPI.processWithdrawal.mockResolvedValueOnce({});
            testDispenser.dispense.mockResolvedValueOnce(undefined);

            testTouchDisplay.showPrompt.mockRejectedValue(undefined);
            testDispenser.awaitDispenserEmptied.mockRejectedValueOnce(new Error());


            const nextState = await withdrawState.process();

            expect(nextState).toBeInstanceOf(MaintenanceRequiredState);
            expect(testTouchDisplay.showErrorPrompt).toBeCalled();
            expect(testDispenser.dispense).toBeCalled();
        });

        test(`when no error encountered, close prompt and return to main menu`, async () => {
            withdrawState = new WithdrawState(app, userData, testTouchDisplay, testDispenser, testBankAPI, defaultWithdrawDTO);
            testBankAPI.retrieveAccountBalance.mockResolvedValueOnce(100_000_000n);
            testDispenser.fundsAvailable.mockResolvedValueOnce(100_000n);
            testBankAPI.processWithdrawal.mockResolvedValueOnce({});
            testDispenser.dispense.mockResolvedValueOnce(undefined);

            testTouchDisplay.showPrompt.mockResolvedValueOnce(()=> {});
            testDispenser.awaitDispenserEmptied.mockResolvedValueOnce(undefined);

            const nextState = await withdrawState.process();

            expect(nextState).toBeInstanceOf(MainMenuState);
            expect(testTouchDisplay.showErrorPrompt).not.toBeCalled();
            expect(testDispenser.dispense).toBeCalled();
        });
    });
})
