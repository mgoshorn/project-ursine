import { version, name } from '../package.json';
import { App } from './App';
import { DispenserTestImplementation } from './__test__/test-implementations/DispenserTesting';
import { withLogger } from './util/logger';


const log = withLogger('index');
const env: Lowercase<string> = (process.env.NODE_ENV || 'development').toLowerCase();

log.info(`Application ${name} (${version}) starting up.`);

(async () => {

/**
 * TODO: Create API implementations and wire them up to start app here (currently out of scope) 
 */
// let app: App = env === 'production'
//     ? new App()
//     : new App()

// await app.start();

log.info(`Application shutting down`);

})()