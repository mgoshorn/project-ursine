interface BankAPI {
    /**
     * Attempts to retrieve user account information from bank system given a personal account number
     * and a PIN number. When data is correct, a payload will be retrieved. If credentials are incorrect
     * or invalid then undefined will be returned.
     * @param PAN 
     * @param PIN 
     */
    retrieveAccountData(PAN: string, PIN: string): Promise<UserAccountPayload | undefined>;
}
