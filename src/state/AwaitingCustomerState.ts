import { IState } from './IState';

export class AwaitingCustomerState implements IState {

    async process() {
        return undefined;
    }
}