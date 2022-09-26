import { version, name } from '../package.json';
import { App } from './App';
import { CardReaderTesting } from './hardware/CardReader/impl/CardReaderTesting';
import { DispenserTestImplementation } from './hardware/CashDispenser/impl/DispenserTesting';
import { TouchDisplayTesting } from './hardware/TouchDisplay/impl/TouchDisplayTesting';
import { withLogger } from './util/logger';


const log = withLogger('index');
const env: Lowercase<string> = (process.env.NODE_ENV || 'development').toLowerCase();

log.info(`Application ${name} (${version}) starting up.`);

(async () => {

let app: App = env === 'production'
    ? new App(new CardReaderTesting(1000), new DispenserTestImplementation(1000), new TouchDisplayTesting(1000))
    : new App(new CardReaderTesting(1000), new DispenserTestImplementation(1000), new TouchDisplayTesting(1000))

await app.start();

log.info(`Application shutting down`);

})()