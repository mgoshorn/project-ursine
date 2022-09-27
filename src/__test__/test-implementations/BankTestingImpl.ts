import { IBankAPI } from '../../network/bank/bank.api';

export class BankTestingImpl implements IBankAPI {
    creditAccount = jest.fn();
    executeTransfer = jest.fn();
    processDeposit = jest.fn();
    processWithdrawal = jest.fn();
    retrieveAccountBalance = jest.fn();
    retrieveAccountData = jest.fn();
    retrievePublicAccountData = jest.fn();
}
