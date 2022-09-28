import { DisplayOnlyDTO, DisplayViewOpCodes, DisplayViewPayload } from '../../state/dtos/DisplayViewDTOs';
import { DisplayViewResponse } from '../../state/dtos/TransferConfirmationResponse';
import { OperationDTO } from './dto/OperationPayload';

const displayOnly: DisplayOnlyDTO = { opCode: DisplayViewOpCodes.DISPLAY_ONLY }
export interface ITouchDisplay {
    awaitUserOperation(): Promise<OperationDTO>;

    /**
     * Requests display to show a prompt for the user to enter their PIN.
     * May return undefined in the case that the user cancels.
     */
    requestPINEntry(): Promise<number | undefined>;
    
    /**
     * Instructs the display to show an error message with
     * the provided ErrorCode. The function resolves when the user
     * closes the error prompt.
     * @param error 
     */
    showErrorPrompt(error: DisplayErrorPrompt): Promise<void>;

    /**
     * Show a prompt that requires the user to interact with the ATM.
     * This function resolves once the display confirms that the prompt
     * has been shown. This function returns a resolve function which
     * can be called to clear the prompt. This resolve function returns
     * a promise which resolves when the prompt has been cleared. 
     *  
     * @param message 
     */
    showPrompt(message: DisplayPrompt): Promise<resolveFunction>;
    
    /**
     * Showing a view displays a view that is interactable from the 
     * display. The function will resolve when the user reaches an 
     * endpoint to the interactive view on the display.
     * @param view 
     * @param payload 
     */
    showView(view: DisplayView, payload?: DisplayViewPayload): Promise<DisplayViewResponse>;

    /**
     * Sends an event to the display system that cash has been inserted.
     * This is used to alert the display to close view shown by
     * INSERT_CASH_TO_DEPOSIT as a response to cash being inserted. Otherwise
     * this view will not resolve unless the user cancels through the display.
     */
    sendCashInsertedEvent(): Promise<undefined>;
}

export enum DisplayErrorPrompt {
    CARD_EXPIRED = 'CARD_EXPIRED',
    CARD_UNREADABLE = 'CARD_UNREADABLE',
    INVALID_PIN = 'INVALID_PIN',
    TARGET_ACCOUNT_NOT_FOUND = 'TARGET_ACCOUNT_NOT_FOUND',
    EXCEEDS_ACCOUNT_LIMIT = 'EXCEEDS_ACCOUNT_LIMIT',
    INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
    INVALID_DISPLAY_PAYLOAD = 'INVALID_DISPLAY_PAYLOAD',
    /** 
     * Indicates a user account changed causing a transaction failure,
     *  Display should prompt user to review account balance details, etc
     *  and retry transfer if still desired
    */
    ACCOUNT_CHANGED = 'ACCOUNT_CHANGED',
    NETWORK_FAILURE = 'NETWORK_FAILURE',
    EXCEEDS_ATM_AVAILABLE_FUNDS = 'EXCEEDS_ATM_AVAILABLE_FUNDS',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
    MAINTENANCE_REQUIRED = 'MAINTENANCE_REQUIRED',
    ATM_HARDWARE_ERROR = 'ATM_HARDWARE_ERROR',
    INVALID_AMOUNT = 'INVALID_AMOUNT',
}

export enum DisplayPrompt {
    RETRIEVE_CARD = 'RETRIEVE_CARD',
    RETRIEVE_DISPENSED_FUNDS = 'RETRIEVE_DISPENSED_FUNDS',
}

export enum DisplayView {
    TRANSFER_SUCCESS = 'TRANSFER_SUCCESS',
    ACTION_CANCELLED = 'ACTION_CANCELLED',
    BALANCE_CHECK = 'BALANCE_CHECK',
    TRANSFER_CONFIRMATION = 'TRANSFER_CONFIRMATION',
    INSERT_CASH_TO_DEPOSIT = 'INSERT_CASH_TO_DEPOSIT',
    DEPOSIT_CONFIRMATION = 'DEPOSIT_CONFIRMATION',
    DEPOSIT_SUMMARY = 'DEPOSIT_SUMMARY'
}

type resolveFunction = () => Promise<void>;