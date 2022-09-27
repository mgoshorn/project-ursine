
export type OperationDTO = BalanceCheckOperationDTO
    | WithdrawOperationDTO
    | DepositOperationDTO
    | TransferOperationDTO
    | ExitOperationDTO;

export type BalanceCheckOperationDTO = {
    opCode: OperationDTOOpCodes.BALANCE_CHECK;
}

export type WithdrawOperationDTO = {
    opCode: OperationDTOOpCodes.WITHDRAWAL;
    amount: BigInt;
}

export type DepositOperationDTO = {
    opCode: OperationDTOOpCodes.DEPOSIT;
}

export type TransferOperationDTO = {
    opCode: OperationDTOOpCodes.TRANSFER;
    amount: BigInt;
    targetAccount: string;
}

export type ExitOperationDTO = {
    opCode: OperationDTOOpCodes.EXIT;
}

export enum OperationDTOOpCodes {
    EXIT = 'EXIT',
    TRANSFER = 'TRANSFER',
    DEPOSIT = 'DEPOSIT',
    WITHDRAWAL = 'WITHDRAWAL',
    BALANCE_CHECK = 'BALANCE_CHECK',
} 
