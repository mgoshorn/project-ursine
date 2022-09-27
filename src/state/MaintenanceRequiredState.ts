import { IState } from './IState';
import { App } from '../App';
import { DisplayErrorPrompt, ITouchDisplay } from '../hardware/TouchDisplay/ITouchDisplay';

/**
 * The MaintenanceRequiredState is a state that should be used
 * when the ATM requires manual maintenance to become operable again.
 * 
 * ! Currently this state is in an incomplete state, but has been partially
 * ! implemented to allow for more in depth testing.
 */
export class MaintenanceRequiredState implements IState {
    constructor(private app: App, private display: ITouchDisplay) {}

    async process() {
        await this.display.showErrorPrompt(DisplayErrorPrompt.MAINTENANCE_REQUIRED);
        
        // TODO: Add logic to respond to maintenance, return to an operable state
        await new Promise(() => {});
        return this.app.createAwaitingCustomerState();
    }
}
