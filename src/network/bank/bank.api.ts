import { UserAccountDTO } from './dto/AuthenticatedUserSession';
import { PublicAccountDataDTO } from './dto/PublicAccountData';

export interface IBankAPI {
    /**
     * Attempts to retrieve user account information from bank system given a personal account number
     * and a PIN number. When data is correct, a payload will be retrieved. If credentials are incorrect
     * or invalid then undefined will be returned.
     * This is a non-mutative operation.
     * @param PAN 
     * @param PIN 
     */
    retrieveAccountData(PAN: string, PIN: number): Promise<UserAccountDTO | undefined>;

    /**
     * Retrieves the balance of the session connected account.
     * This is a non-mutative operation.
     * @param accountNumber 
     * @param sessionID 
     */
    retrieveAccountBalance(accountNumber: string, sessionID: string): Promise<BigInt>;

    /**
     * Returns the public facing account data for the provided account number.
     * Will return undefined if an account number with the provided account number does not exist or is not
     * publicly accessible.
     * This is a non-mutative operation.
     * @param accountNumber 
     */
    retrievePublicAccountData(accountNumber: string): Promise<PublicAccountDataDTO | undefined>;


    /**
     * Executes a transfer from one account to another.
     * This is a mutative, transactional operation.
     * @param sourceAccountNumber 
     * @param targetAccountNumber 
     * @param amount 
     * @param sessionToken 
     */
    executeTransfer(sourceAccountNumber: string, targetAccountNumber: string, amount: BigInt, sessionToken: string): Promise<void>;

    /**
     * Processes withdrawal, deducting withdrawn amount from the accounts balance.
     * This is a mutative operation.
     * @param accountNumber 
     * @param amount 
     * @param sessionToken 
     */
    processWithdrawal(accountNumber: string, amount: BigInt, sessionToken: string): Promise<void>;

    /**
     * Process a deposit operation.
     * This is a mutative operation.
     * @returns BigInt - Balance after deposit
     */
    processDeposit(accountNumber: string, amount: BigInt, sessionToken: string): Promise<BigInt>;
    
    /**
     * This function is used to credit an account in the case of a system error outside the 
     * normal workflow. Use processDeposit for standard deposit operations.
     * This is a mutative operation.
    */
    creditAccount(accountNumber: string, amount: BigInt, sessionToken: string, notation: string): Promise<void>;
}
