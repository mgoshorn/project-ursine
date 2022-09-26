import { ICardReader } from '../hardware/CardReader/ICardReader';
import { DisplayErrorPrompt, ITouchDisplay } from '../hardware/TouchDisplay/ITouchDisplay';

export async function endSessionWithDisplayError(display: ITouchDisplay, error: DisplayErrorPrompt, cardReader: ICardReader) {
    await Promise.all([
        await display.showErrorPrompt(error),
        await cardReader.releaseCard()
    ]);
    await cardReader.awaitCardRemoval();
}