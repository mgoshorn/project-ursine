import { App } from '../../App';
import { NetworkAccessError, TransactionConflictError } from '../../errors/UrsineErrors';
import { OperationDTOOpCodes, TransferOperationDTO } from '../../hardware/TouchDisplay/dto/OperationPayload';
import { DisplayView } from '../../hardware/TouchDisplay/ITouchDisplay';
import { UserAccountDTO } from '../../network/bank/dto/AuthenticatedUserSession';
import { PublicAccountDataDTO } from '../../network/bank/dto/PublicAccountData';
import { DisplayViewResponse, DisplayViewResponseOpCodes, TransferConfirmationResponseDTO } from '../../state/dtos/TransferConfirmationResponse';
import { MainMenuState } from '../../state/MainMenuState';
import { TransferState } from '../../state/TransferState';
import { BankTestingImpl } from '../test-implementations/BankTestingImpl';
import { CardReaderTesting } from '../test-implementations/CardReaderTesting';
import { DispenserTestImplementation } from '../test-implementations/DispenserTesting';
import { TouchDisplayTesting } from '../test-implementations/TouchDisplayTesting';

describe('TransferState', () => {

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

    const defaultUserData: UserAccountDTO = {
        accountNickname: 'test-acc-nickname',
        accountNumber: '1111222233334444',
        sessionToken: 'test-session-token',
        withdrawalLimit: BigInt(100_000_000),
        withdrawalLimitRemaining: BigInt(100_000_000),
    }
    
    const transferOperationDTO: TransferOperationDTO = {
        amount: 100n,
        opCode: OperationDTOOpCodes.TRANSFER,
        targetAccount: '1111222233334445',
    }
    
    const publicUserData: PublicAccountDataDTO = {
        accountNumber: transferOperationDTO.targetAccount,
        accountNickname: 'public account test nickname',
    }

    describe('process', () => {
        let transferState: TransferState;
        beforeEach(() => {
            transferState = new TransferState(app, defaultUserData, testBankAPI, testTouchDisplay, transferOperationDTO);
            jest.resetAllMocks();
        });

        describe('common preliminary request failures', () => {
            test('Request transfer negative amount return to MainMenu', async () => {
                const negativeRequest = {
                    ...transferOperationDTO,
                    amount: -100n,
                }
                transferState = new TransferState(app, defaultUserData, testBankAPI, testTouchDisplay, negativeRequest);
                testTouchDisplay.showErrorPrompt.mockResolvedValue(undefined);

                const nextState = await transferState.process();

                expect(nextState).toBeInstanceOf(MainMenuState);
                expect(testTouchDisplay.showErrorPrompt).toBeCalled();
                expect(testBankAPI.retrievePublicAccountData).not.toBeCalled();
            });

            test('Request transfer zero return to MainMenu', async () => {
                const negativeRequest = {
                    ...transferOperationDTO,
                    amount: 0n,
                }
                transferState = new TransferState(app, defaultUserData, testBankAPI, testTouchDisplay, negativeRequest);
                testTouchDisplay.showErrorPrompt.mockResolvedValue(undefined);

                const nextState = await transferState.process();

                expect(nextState).toBeInstanceOf(MainMenuState);
                expect(testTouchDisplay.showErrorPrompt).toBeCalled();
                expect(testBankAPI.retrievePublicAccountData).not.toBeCalled();
            });

            test('Request transfer amount exceeds remaining limit return to MainMenu', async () => {
                const excessiveRequest = {
                    ...transferOperationDTO,
                    amount: 200_000_000n
                }
                transferState = new TransferState(app, defaultUserData, testBankAPI, testTouchDisplay, excessiveRequest);
                testTouchDisplay.showErrorPrompt.mockResolvedValue(undefined);

                const nextState = await transferState.process();

                expect(nextState).toBeInstanceOf(MainMenuState);
                expect(testTouchDisplay.showErrorPrompt).toBeCalled();
                expect(testBankAPI.retrievePublicAccountData).not.toBeCalled();

            });

            test('Request transfer exceeds current balance return to MainMenu', async () => {
                transferState = new TransferState(app, defaultUserData, testBankAPI, testTouchDisplay, transferOperationDTO);
                testTouchDisplay.showErrorPrompt.mockResolvedValue(undefined);
                testBankAPI.retrieveAccountBalance.mockResolvedValueOnce(20n);

                const nextState = await transferState.process();

                expect(nextState).toBeInstanceOf(MainMenuState);
                expect(testTouchDisplay.showErrorPrompt).toBeCalled();
                expect(testBankAPI.retrievePublicAccountData).not.toBeCalled();
            });

            test('Target account not found return to MainMenu', async () => {
                transferState = new TransferState(app, defaultUserData, testBankAPI, testTouchDisplay, transferOperationDTO);
                testTouchDisplay.showErrorPrompt.mockResolvedValue(undefined);
                testBankAPI.retrieveAccountBalance.mockResolvedValueOnce(100_000n);
                testBankAPI.retrievePublicAccountData.mockResolvedValue(undefined);

                const nextState = await transferState.process();

                expect(nextState).toBeInstanceOf(MainMenuState);
                expect(testTouchDisplay.showErrorPrompt).toBeCalled();
                expect(testBankAPI.retrievePublicAccountData).toBeCalled();
            });
        });

        test('when user cancels transfer at confirmation stage, should not execute transfer and return to MainMenu', async () => {
            transferState = new TransferState(app, defaultUserData, testBankAPI, testTouchDisplay, transferOperationDTO);
            testBankAPI.retrieveAccountBalance.mockResolvedValueOnce(100_000n);
            testBankAPI.retrievePublicAccountData.mockResolvedValue(publicUserData);

            const cancelledResponse: TransferConfirmationResponseDTO = {
                opCode: DisplayViewResponseOpCodes.TRANSFER_CONFIRMATION_RESPONSE,
                confirmed: false
            }

            testTouchDisplay.showView.mockReturnValue(cancelledResponse)

            const nextState = await transferState.process();

            expect(nextState).toBeInstanceOf(MainMenuState);
            expect(testTouchDisplay.showView).toBeCalled();
            expect(testBankAPI.executeTransfer).not.toBeCalled();
        });

        test('when display returns invalid operation code, should not execute transfer and return to main menu', async () => {
            transferState = new TransferState(app, defaultUserData, testBankAPI, testTouchDisplay, transferOperationDTO);
            testTouchDisplay.showErrorPrompt.mockResolvedValue(undefined);
            testBankAPI.retrieveAccountBalance.mockResolvedValueOnce(100_000n);
            testBankAPI.retrievePublicAccountData.mockResolvedValue(publicUserData);

            const invalidResponse: DisplayViewResponse = {
                opCode: DisplayViewResponseOpCodes.DEPOSIT_CONFIRMATION_RESPONSE,
                confirmed: true,
            }

            testTouchDisplay.showView.mockReturnValue(invalidResponse)

            const nextState = await transferState.process();

            expect(nextState).toBeInstanceOf(MainMenuState);
            expect(testTouchDisplay.showView).toBeCalled();
            expect(testBankAPI.executeTransfer).not.toBeCalled();
        });

        describe('when executeTransfer', () => {
            beforeEach(() => {
                transferState = new TransferState(app, defaultUserData, testBankAPI, testTouchDisplay, transferOperationDTO);
                testTouchDisplay.showErrorPrompt.mockResolvedValue(undefined);
                testBankAPI.retrieveAccountBalance.mockResolvedValueOnce(100_000n);
                testBankAPI.retrievePublicAccountData.mockResolvedValue(publicUserData);

                const acceptedResponse: TransferConfirmationResponseDTO = {
                    opCode: DisplayViewResponseOpCodes.TRANSFER_CONFIRMATION_RESPONSE,
                    confirmed: true
                };
    
                testTouchDisplay.showView.mockReturnValue(acceptedResponse);
            })
            
            test('rejects with NetworkAccessError will not show success and return to main menu', async () => {
                testBankAPI.executeTransfer.mockRejectedValueOnce(new NetworkAccessError('test-network-error'));
                const nextState = await transferState.process();
    
                expect(nextState).toBeInstanceOf(MainMenuState);
                expect(testTouchDisplay.showView).toBeCalled();
                expect(testBankAPI.executeTransfer).toBeCalled();
                expect(testTouchDisplay.showView).not.toBeCalledWith(DisplayView.TRANSFER_SUCCESS);
            });
    
            test('rejects with TransactionConflictError will not show success and return to main menu', async () => {
                testBankAPI.executeTransfer.mockRejectedValueOnce(new TransactionConflictError('test-conflict-error'));
                const nextState = await transferState.process();
    
                expect(nextState).toBeInstanceOf(MainMenuState);
                expect(testTouchDisplay.showView).toBeCalled();
                expect(testBankAPI.executeTransfer).toBeCalled();
                expect(testTouchDisplay.showView).not.toBeCalledWith(DisplayView.TRANSFER_SUCCESS);
            })

            test('rejects with unexpected error will not show success and return to main menu', async () => {
                testBankAPI.executeTransfer.mockRejectedValueOnce(new Error('test-conflict-error'));
                const nextState = await transferState.process();
    
                expect(nextState).toBeInstanceOf(MainMenuState);
                expect(testTouchDisplay.showView).toBeCalled();
                expect(testBankAPI.executeTransfer).toBeCalled();
                expect(testTouchDisplay.showView).not.toBeCalledWith(DisplayView.TRANSFER_SUCCESS);
            });

            
            test('resolves, shows success view and returns to main menu', async () => {
                testBankAPI.executeTransfer.mockResolvedValue(undefined);
                const nextState = await transferState.process();
    
                expect(nextState).toBeInstanceOf(MainMenuState);
                expect(testTouchDisplay.showView).toBeCalled();
                expect(testBankAPI.executeTransfer).toBeCalled();
                expect(testTouchDisplay.showView).toBeCalledWith(DisplayView.TRANSFER_SUCCESS);
            });
        });

    });
})
