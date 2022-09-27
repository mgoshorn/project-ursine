import { App } from '../../App';
import { UserAccountDTO } from '../../network/bank/dto/AuthenticatedUserSession';
import { DepositState } from '../../state/DepositState';
import { DepositCancelledFromDisplayDTO, DepositConfirmationReponseDTO, DepositResolvedNormallyDTO, DisplayViewResponse, DisplayViewResponseOpCodes } from '../../state/dtos/TransferConfirmationResponse';
import { MainMenuState } from '../../state/MainMenuState';
import { BankTestingImpl } from '../test-implementations/BankTestingImpl';
import { CardReaderTesting } from '../test-implementations/CardReaderTesting';
import { DispenserTestImplementation } from '../test-implementations/DispenserTesting';
import { TouchDisplayTesting } from '../test-implementations/TouchDisplayTesting';
import { setTimeout } from 'timers/promises';
import { GenericHardwareOperationError, NetworkAccessError } from '../../errors/UrsineErrors';
import { MaintenanceRequiredState } from '../../state/MaintenanceRequiredState';
import { DisplayView } from '../../hardware/TouchDisplay/ITouchDisplay';

describe('DepositState', () => {

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
        withdrawalLimit: BigInt(100_000_000),
        withdrawalLimitRemaining: BigInt(100_000_000),
    }

    describe('process', () => {
        let depositState: DepositState;
        beforeEach(() => {
            depositState = new DepositState(app, userData, testDispenser, testBankAPI, testTouchDisplay);
            jest.resetAllMocks();
        });

        describe('race logic handling', () => {
            let showViewRaceResolver: (response: DepositCancelledFromDisplayDTO | DepositResolvedNormallyDTO) => void;
            let awaitCashInsertionRaceResolver: (inserted: boolean) => void;
            beforeEach(() => {
                // Assigns resolver functions that can be used to control the resolution order of promises
                const showViewPromise = new Promise((resolve, _) => { showViewRaceResolver = (value: any) => resolve(value); });
                const awaitCashInsertionPromise = new Promise((resolve, _) => { awaitCashInsertionRaceResolver = (value: any) => resolve(value); });
                
                testTouchDisplay.showView.mockImplementationOnce(() => showViewPromise);
                testDispenser.awaitCashInsertion.mockImplementationOnce(() =>awaitCashInsertionPromise);
            })

            describe('showView resolves first', () => {
                test('then deposit then refund any inserted cash and return to main menu', async () => {
                    // Setup
                    testDispenser.cancelDeposit.mockResolvedValue(true);
                    testTouchDisplay.showPrompt.mockResolvedValueOnce({});
                    testDispenser.awaitDispenserEmptied.mockResolvedValueOnce({});
                    testTouchDisplay.showView.mockResolvedValueOnce({});
                    
                    // Execute
                    const processPromise = depositState.process();

                    // Control
                    showViewRaceResolver({
                        opCode: DisplayViewResponseOpCodes.DEPOSIT_CANCELLED_FROM_DISPLAY
                    });

                    // should be capable of resolving normally now
                    const result = await processPromise;
                    expect(result).toBeInstanceOf(MainMenuState);
                    expect(testBankAPI.processDeposit).not.toBeCalled();

                    // clean up
                    awaitCashInsertionRaceResolver(false);
                });
            });

            describe('awaitCashInsertion resolves first', () => {
                test('and showView also resolves with cancelled then refund any inserted cash and return to main menu', async () => {
                    // Setup
                    testDispenser.cancelDeposit.mockResolvedValue(true);
                    testTouchDisplay.showPrompt.mockResolvedValueOnce({});
                    testDispenser.awaitDispenserEmptied.mockResolvedValueOnce({});
                    testTouchDisplay.showView.mockResolvedValueOnce({});
                    
                    // Execute
                    const processPromise = depositState.process();

                    // Control
                    awaitCashInsertionRaceResolver(false);

                    // Give code a chance to run
                    await setTimeout(1);

                    // Cancel deposit
                    showViewRaceResolver({
                        opCode: DisplayViewResponseOpCodes.DEPOSIT_CANCELLED_FROM_DISPLAY
                    });

                    // should be capable of resolving normally now
                    const result = await processPromise;

                    expect(result).toBeInstanceOf(MainMenuState);
                    expect(testBankAPI.processDeposit).not.toBeCalled();
                });

                test('and showView also resolves with unexpected OP code, then refund any inserted cash and return to main menu', async () => {
                    // Setup
                    testDispenser.cancelDeposit.mockResolvedValue(true);
                    testTouchDisplay.showPrompt.mockResolvedValueOnce({});
                    testDispenser.awaitDispenserEmptied.mockResolvedValueOnce({});
                    testTouchDisplay.showView.mockResolvedValueOnce({});
                    
                    // Execute
                    const processPromise = depositState.process();

                    // Control
                    awaitCashInsertionRaceResolver(false);

                    // Give code a chance to run
                    await setTimeout(1);

                    // Cancel deposit
                    showViewRaceResolver({
                        opCode: DisplayViewResponseOpCodes.TRANSFER_CONFIRMATION_RESPONSE
                    } as unknown as DepositResolvedNormallyDTO);

                    // should be capable of resolving normally now
                    const result = await processPromise;

                    expect(result).toBeInstanceOf(MainMenuState);
                    expect(testBankAPI.processDeposit).not.toBeCalled();
                });
            });
        });

        describe('deposit processing', () => {
            let showViewRaceResolver: (response: DepositCancelledFromDisplayDTO | DepositResolvedNormallyDTO) => void;
            let awaitCashInsertionRaceResolver: (inserted: boolean) => void;
            let continueProcess;
            let processPromise;

            beforeEach(() => {
                // Assigns resolver functions that can be used to control the resolution order of promises
                const showViewPromise = new Promise((resolve, _) => { showViewRaceResolver = (value: any) => resolve(value); });
                const awaitCashInsertionPromise = new Promise((resolve, _) => { awaitCashInsertionRaceResolver = (value: any) => resolve(value); });
                
                testTouchDisplay.showView.mockImplementationOnce(() => showViewPromise);
                testDispenser.awaitCashInsertion.mockImplementationOnce(() =>awaitCashInsertionPromise);
            
                // Setup
                testDispenser.cancelDeposit.mockResolvedValue(true);
                testTouchDisplay.showPrompt.mockResolvedValueOnce({});
                testDispenser.awaitDispenserEmptied.mockResolvedValueOnce({});

                // Execute
                processPromise = depositState.process();

                // Control
                awaitCashInsertionRaceResolver(false);

                continueProcess = () => showViewRaceResolver({
                    opCode: DisplayViewResponseOpCodes.DEPOSIT_RESOLVED_NORMALLY
                });
            });

            test('when dispenser.countDeposit rejects go to Maintenance mode', async () => {
                testDispenser.countDeposit.mockRejectedValueOnce(new GenericHardwareOperationError('test-hardware-error'));
                continueProcess();

                // should be capable of resolving normally now
                const result = await processPromise;
    
                expect(result).toBeInstanceOf(MaintenanceRequiredState);
                expect(testBankAPI.processDeposit).not.toBeCalled();
                expect(testDispenser.countDeposit).toBeCalled();
            });

            test('user cancels deposit at confirmation view', async () => {
                testDispenser.countDeposit.mockResolvedValueOnce(100n);
                testTouchDisplay.showView.mockResolvedValueOnce({
                    opCode: DisplayViewResponseOpCodes.DEPOSIT_CONFIRMATION_RESPONSE,
                    confirmed: false
                })
                continueProcess();

                // should be capable of resolving normally now
                const result = await processPromise;
    
                expect(result).toBeInstanceOf(MainMenuState);
                expect(testBankAPI.processDeposit).not.toBeCalled();
                expect(testDispenser.countDeposit).toBeCalled();
            });

            test('unexpected opCode sent from display when prompting user to confirm', async () => {
                testDispenser.countDeposit.mockResolvedValueOnce(100n);
                testTouchDisplay.showView.mockResolvedValueOnce({
                    opCode: 'x',
                    confirmed: false
                });
                continueProcess();

                // should be capable of resolving normally now
                const result = await processPromise;

                expect(result).toBeInstanceOf(MainMenuState);
                expect(testBankAPI.processDeposit).not.toBeCalled();
                expect(testDispenser.countDeposit).toBeCalled();
            });

            describe('network failures processing deposit', () => {
                const errors = [
                    new NetworkAccessError('NetworkAccessError'),
                    new Error('Error')
                ];

                errors.forEach((err) => {
                    test(err.message, async () => {
                        testDispenser.countDeposit.mockResolvedValueOnce(100n);
                        testTouchDisplay.showView.mockResolvedValueOnce({
                            opCode: DisplayViewResponseOpCodes.DEPOSIT_CONFIRMATION_RESPONSE,
                            confirmed: true
                        });
                        testBankAPI.retrieveAccountBalance.mockResolvedValueOnce(1000n);
                        testBankAPI.processDeposit.mockRejectedValueOnce(err);
                        continueProcess();
        
                        // should be capable of resolving normally now
                        const result = await processPromise;
            
                        expect(result).toBeInstanceOf(MainMenuState);
                        expect(testBankAPI.processDeposit).toBeCalled();
                        expect(testDispenser.countDeposit).toBeCalled();
                    });
                });
            });

            test('when a mechanical error is encountered loading cash out of the dispenser into ATM storage deposit summary shown and ATM enters maintenance mode', async () => {
                testDispenser.countDeposit.mockResolvedValueOnce(100n);
                testTouchDisplay.showView.mockResolvedValueOnce({
                    opCode: DisplayViewResponseOpCodes.DEPOSIT_CONFIRMATION_RESPONSE,
                    confirmed: true
                });
                testBankAPI.retrieveAccountBalance.mockResolvedValueOnce(1000n);
                testBankAPI.processDeposit.mockResolvedValueOnce(200n);
                testDispenser.acceptDeposit.mockRejectedValueOnce(new GenericHardwareOperationError('test-generic-error'));
                testTouchDisplay.showView.mockResolvedValueOnce({})
                
                continueProcess();

                // should be capable of resolving normally now
                const result = await processPromise;
    
                expect(result).toBeInstanceOf(MaintenanceRequiredState);
                expect(testBankAPI.processDeposit).toBeCalled();
                expect(testDispenser.countDeposit).toBeCalled();
                expect(testTouchDisplay.showView).toBeCalledWith(DisplayView.DEPOSIT_SUMMARY, expect.any(Object))
            });

            test('when cash successfully deposited summary shown and ATM returns to MainMenu', async () => {
                testDispenser.countDeposit.mockResolvedValueOnce(100n);
                testTouchDisplay.showView.mockResolvedValueOnce({
                    opCode: DisplayViewResponseOpCodes.DEPOSIT_CONFIRMATION_RESPONSE,
                    confirmed: true
                });
                testBankAPI.retrieveAccountBalance.mockResolvedValueOnce(1000n);
                testBankAPI.processDeposit.mockResolvedValueOnce(200n);
                testDispenser.acceptDeposit.mockResolvedValue({})
                testTouchDisplay.showView.mockResolvedValueOnce({})
                
                continueProcess();

                // should be capable of resolving normally now
                const result = await processPromise;
    
                expect(result).toBeInstanceOf(MainMenuState);
                expect(testBankAPI.processDeposit).toBeCalled();
                expect(testDispenser.countDeposit).toBeCalled();
                expect(testTouchDisplay.showView).toBeCalledWith(DisplayView.DEPOSIT_SUMMARY, expect.any(Object))
            });
        });


        
    });
})
