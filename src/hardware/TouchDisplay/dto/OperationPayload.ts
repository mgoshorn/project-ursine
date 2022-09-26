
export type OperationDTO = BalanceCheckOperationDTO
    | WithdrawOperationDTO
    | DepositOperationDTO
    | TransferOperationDTO
    | ExitOperationDTO;

export type BalanceCheckOperationDTO = {
    opCode: 'BALANCE_CHECK';
}

export type WithdrawOperationDTO = {
    opCode: 'WITHDRAWAL';
    amount: BigInt;
}

export type DepositOperationDTO = {
    opCode: 'DEPOSIT'
}

export type TransferOperationDTO = {
    opCode: 'TRANSFER';
    amount: BigInt;
    targetAccount: string;
}

export type ExitOperationDTO = {
    opCode: 'EXIT'
}
