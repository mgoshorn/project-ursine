export type UserAccountDTO = {
    accountNumber: string;
    sessionToken: string;
    withdrawalLimit: BigInt;
    withdrawalLimitRemaining: BigInt;
    accountNickname: string;
}
