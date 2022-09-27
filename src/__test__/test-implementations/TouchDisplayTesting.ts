import { ITouchDisplay } from '../../hardware/TouchDisplay/ITouchDisplay';

export class TouchDisplayTesting implements ITouchDisplay {
    showPrompt = jest.fn();
    showView = jest.fn();
    setState = jest.fn();
    showErrorPrompt = jest.fn();
    awaitUserOperation = jest.fn();
    requestPINEntry = jest.fn();
}
