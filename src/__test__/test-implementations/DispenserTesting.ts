export class DispenserTestImplementation implements IDispenser {
    fundsAvailable = jest.fn();
    dispense = jest.fn();
    countDeposit = jest.fn();
    allowDeposit = jest.fn();
    awaitCashInsertion = jest.fn();
    cancelDeposit = jest.fn();
    awaitDispenserEmptied = jest.fn();
    acceptDeposit = jest.fn();
}
