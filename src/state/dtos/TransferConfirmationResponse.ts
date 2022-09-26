export type DisplayViewResponse = TransferConfirmationResponseDTO
    | DepositCancelledFromDisplayDTO
    | DepositResolvedNormallyDTO
    | DepositConfirmationReponseDTO;

export type TransferConfirmationResponseDTO = {
    opCode: DisplayViewResponseOpCodes.TRANSFER_CONFIRMATION_RESPONSE;
    confirmed: boolean;
};

export type DepositCancelledFromDisplayDTO = {
    opCode: DisplayViewResponseOpCodes.DEPOSIT_CANCELLED_FROM_DISPLAY;
}

export type DepositResolvedNormallyDTO = {
    opCode: DisplayViewResponseOpCodes.DEPOSIT_RESOLVED_NORMALLY;
}

export type DepositConfirmationReponseDTO = {
    opCode: DisplayViewResponseOpCodes.DEPOSIT_CONFIRMATION_RESPONSE;
    confirmed: boolean;
}

export enum DisplayViewResponseOpCodes {
    TRANSFER_CONFIRMATION_RESPONSE = 'TRANSFER_CONFIRMATION_RESPONSE',
    DEPOSIT_CANCELLED_FROM_DISPLAY = 'DEPOSIT_CANCELLED_FROM_DISPLAY',
    DEPOSIT_RESOLVED_NORMALLY = 'DEPOSIT_RESOLVED_NORMALLY',
    DEPOSIT_CONFIRMATION_RESPONSE = 'DEPOSIT_CONFIRMATION_RESPONSE',
};
