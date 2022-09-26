export type DisplayViewPayload = 
    DisplayBalanceDTO 
    | TransferConfirmationDTO
    | DisplayOnlyDTO
    | DepositConfirmationDTO
    | DepositSummaryDTO;

export type DisplayBalanceDTO = {
    opCode: DisplayViewOpCodes.BALANCE;
    data: {
        accountNumber: string;
        balance: BigInt;
    }
}

export type TransferConfirmationDTO = {
    opCode: DisplayViewOpCodes.TRANSFER_CONFIRMATION;
    data: {
        sourceAccount: string;
        targetAccount: string;
        targetAccountNickname: string;
        transferAmount: BigInt;
    }
}

export type DepositConfirmationDTO = {
    opCode: DisplayViewOpCodes;
    data: {
        targetAccount: string;
        depositAmount: BigInt;
    }
}

export type DepositSummaryDTO = {
    opCode: DisplayViewOpCodes.DEPOSIT_SUMMARY,
    data: {
        accountNumber: string;
        previousBalance: BigInt;
        newBalance: BigInt;
        depositAmount: BigInt;
    }
}

/* Default op code used when no additional data is needed */
export type DisplayOnlyDTO = {
    opCode: DisplayViewOpCodes.DISPLAY_ONLY;
}

export enum DisplayViewOpCodes {
    DISPLAY_ONLY = 'DISPLAY_ONLY',
    BALANCE = 'BALANCE',
    TRANSFER_CONFIRMATION = 'TRANSFER_CONFIRMATION',
    DEPOSIT_CONFIRMATION = 'DEPOSIT_CONFIRMATION',
    DEPOSIT_SUMMARY = 'DEPOSIT_SUMMARY',
}
