/**
 * This interface generically defines the software interface between the controller application and the
 * hardware cash dispenser.
 */
interface IDispenser {
    
    fundsAvailable(amount: BigInt): Promise<boolean>;

    /**
     * This function communicates to the dispenser that it should allow users
     * to insert money into the dispenser unit. This may involve mechanically opening 
     * a container or simply allowing insertion into a slot. This function resolves
     * once the hardware is in a state ready to accept the deposited funds.
     */
    allowDeposit(): Promise<void>;

    /**
     * This function can be called to retrieve a promise which resolves
     * once cash is inserted and ready to continue with the deposit process
     * or the action has been cancelled.
     * Resolves to true when cash was inserted, false when the action was cancelled
     */
    awaitCashInsertion(): Promise<boolean>;

    /**
     * Cancels the deposit action. If cash has already been inserted, then the function 
     * will resolve to true and software should show a prompt for the customer to take funds and
     * use awaitDispenserEmptied to know when they have been taken. If it resolves to false, then
     * no cash has been inserted and the operation is complete.
     */
    cancelDeposit(): Promise<boolean>;

    /**
     * Accept deposit mechanically completes the deposit interaction, moving inserted cash
     * into the ATM cash storage.
     */
    acceptDeposit(): Promise<void>;

    /**
     * Mechanical operation which tallys the number of bills in the dispenser. As this assumes
     * there are only single dollar units, there is no need for further logic which evaluates the value
     * of each bill so the returnd tally is the exact value of the currency.
     * Calling this function when the till is open will be considered an error.
     * @param amount 
     */
     countDeposit(): Promise<BigInt>;

    /**
     * Mechanical operation which distributes funds from available funds into the dispenser.
     * This operation should not be called while the dispenser is in the open state.
     * Implementations should ensure that calling it is an error.
     * This function resolves when all cash has been dispersed into the till.
     * @param amount 
     */
    disperse(amount: BigInt): Promise<void>;

    /**
     * Used to await signals indicating that the dispenser has been emptied.
     * Await this function to know when cash has been removed.
     * Will resolve immediately if the dispenser is closed or is already empty.
     */
    awaitDispenserEmptied(): Promise<void>;
}
