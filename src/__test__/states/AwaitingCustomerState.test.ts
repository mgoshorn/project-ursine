import { App } from '../../App';
import { GenericHardwareOperationError, NetworkAccessError } from '../../errors/UrsineErrors';
import { UserAccountDTO } from '../../network/bank/dto/AuthenticatedUserSession';
import { AwaitingCustomerState } from '../../state/AwaitingCustomerState';
import { MainMenuState } from '../../state/MainMenuState';
import { MaintenanceRequiredState } from '../../state/MaintenanceRequiredState';
import { BankTestingImpl } from '../test-implementations/BankTestingImpl';
import { CardReaderTesting } from '../test-implementations/CardReaderTesting';
import { DispenserTestImplementation } from '../test-implementations/DispenserTesting';
import { TouchDisplayTesting } from '../test-implementations/TouchDisplayTesting';


describe('AwaitingCustomerState', () => {
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

    let awaitingCustomerState: AwaitingCustomerState;

    beforeEach(() => {
        awaitingCustomerState = new AwaitingCustomerState(app, testCardReader, testTouchDisplay, testBankAPI);
    })

    describe('when cardReader.readCard rejects', () => {
        beforeEach(() => {
            testTouchDisplay.showErrorPrompt.mockResolvedValueOnce(undefined);
        })
        
        test('with GenericHardwareOperationError -> MaintenanceRequiredState', async () => {
            testCardReader.readCard.mockRejectedValue(new GenericHardwareOperationError());
            const nextState = await awaitingCustomerState.process();
            expect(nextState).toBeInstanceOf(MaintenanceRequiredState);
        });

        test('with unexpected Error and card can be released -> AwaitingCustomerState', async () => {
            testCardReader.readCard.mockRejectedValue(new Error());

            testCardReader.releaseCard.mockResolvedValue(undefined);

            const nextState = await awaitingCustomerState.process();
            expect(nextState).toBeInstanceOf(AwaitingCustomerState)
        });

        test('with unexpected Error and card cannot be released -> MaintenanceRequiredState', async () => {
            testCardReader.readCard.mockRejectedValue(new Error());
            testCardReader.releaseCard.mockRejectedValue(new Error());

            const nextState = await awaitingCustomerState.process();
            expect(nextState).toBeInstanceOf(MaintenanceRequiredState);
        });
    });

    test('when is unreadable return to AwaitingCustomerState', async () => {
        testCardReader.readCard.mockResolvedValue(undefined);
        testTouchDisplay.showErrorPrompt.mockResolvedValue(undefined);
        testCardReader.releaseCard.mockResolvedValue(undefined);
        testCardReader.awaitCardRemoval.mockResolvedValue(undefined);

        const nextState = await awaitingCustomerState.process();
        expect(nextState).toBeInstanceOf(AwaitingCustomerState);
    });

    test('when card is expired return to AwaitingCustomerState', async () => {
        testCardReader.readCard.mockResolvedValue({
            PAIN: '0000111122223333',
            expirationDate: new Date('1970-01-01'),
        });
        testTouchDisplay.showErrorPrompt.mockResolvedValue(undefined);
        testCardReader.releaseCard.mockResolvedValue(undefined);
        testCardReader.awaitCardRemoval.mockResolvedValue(undefined);

        const nextState = await awaitingCustomerState.process();
        expect(nextState).toBeInstanceOf(AwaitingCustomerState);
    });

    test('when user cancels PIN entry return to AwaitingCustomerState', async () => {
        testCardReader.readCard.mockResolvedValue({
            PAIN: '0000111122223333',
            expirationDate: new Date().setDate(new Date().getDate() + 1),
        });
        testCardReader.releaseCard.mockResolvedValue(undefined);
        testCardReader.awaitCardRemoval.mockResolvedValue(undefined);
        testTouchDisplay.requestPINEntry.mockResolvedValue(undefined);

        const nextState = await awaitingCustomerState.process();
        expect(nextState).toBeInstanceOf(AwaitingCustomerState);
    });

    describe('when retrieveAccountData', () => {
        beforeEach(() => {
            testCardReader.readCard.mockResolvedValue({
                PAIN: '0000111122223333',
                expirationDate: new Date().setDate(new Date().getDate() + 1),
            });
            testCardReader.releaseCard.mockResolvedValue(undefined);
            testCardReader.awaitCardRemoval.mockResolvedValue(undefined);
            testTouchDisplay.requestPINEntry.mockResolvedValue(1234);
            testTouchDisplay.showErrorPrompt.mockResolvedValue(undefined);
        });

        test('rejects with NetworkAccessError -> AwaitingCustomerState', async () => {
            testBankAPI.retrieveAccountData.mockRejectedValue(new NetworkAccessError);

            const nextState = await awaitingCustomerState.process();
            expect(nextState).toBeInstanceOf(AwaitingCustomerState);
        });

        test('resolves without data -> AwaitingCustomerState', async () => {
            testBankAPI.retrieveAccountData.mockResolvedValue(undefined);

            const nextState = await awaitingCustomerState.process();
            expect(nextState).toBeInstanceOf(AwaitingCustomerState);
        });

        test('resolves with user data -> MainMenuState', async () => {
            testBankAPI.retrieveAccountData.mockResolvedValue(userData);

            const nextState = await awaitingCustomerState.process();
            expect(nextState).toBeInstanceOf(MainMenuState);
        });

    })

});