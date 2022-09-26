import { UserAccountDTO } from './dto/AuthenticatedUserSession';
import { PublicAccountDataDTO } from './dto/PublicAccountData';

export interface IBankAPI {
    /**
     * Attempts to retrieve user account information from bank system given a personal account number
     * and a PIN number. When data is correct, a payload will be retrieved. If credentials are incorrect
     * or invalid then undefined will be returned.
     * @param PAN 
     * @param PIN 
     */
    retrieveAccountData(PAN: string, PIN: number): Promise<UserAccountDTO | undefined>;

    retrieveAccountBalance(accountNumber: string, sessionID: string): Promise<BigInt>;

    /**
     * Returns the public facing account data for the provided account number.
     * Will return undefined if an account number with the provided account number does not exist or is not
     * publicly accessible.
     * @param accountNumber 
     */
    retrievePublicAccountData(accountNumber: string): Promise<PublicAccountDataDTO | undefined>;

    executeTransfer(sourceAccountNumber: string, targetAccountNumber: string, amount: BigInt, sessionToken: string): Promise<void>;

    processWithdrawal(accountNumber: string, amount: BigInt, sessionToken: string): Promise<void>;

    /**
     * Process a deposit operation
     * @returns BigInt - Balance after deposit
     */
    processDeposit(accountNumber: string, amount: BigInt, sessionToken: string): Promise<BigInt>;
    /**
     * This function is used to credit an account in the case of a system error outside the 
     * normal workflow. Use processDeposit for standard deposit operations.
     */
    creditAccount(accountNumber: string, amount: BigInt, sessionToken: string, notation: string): Promise<void>;
}
