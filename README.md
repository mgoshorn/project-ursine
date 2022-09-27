# Running Tests

With NPM Installed:

```
npm install
npm test
```
## Options
You may append -- --coverage or -- --verbose for more details on test run. Example: `npm test -- --coverage`.

## Disabling Logs
To disable log statements, copy ./.env.example to ./.env and set `LOG_LEVEL=silent`.

# Implementation Notes
## Application Flow Management

The ATM's interaction state is managed as a finite-state machine. The IState interface defines an interface that defines the structure of how the application can interact with a state. The process function executes the state's internal behavior and returns a new state. Therefore the return value of each state's process controls the flow of the application.

![Application State Flow](/res/ursine-states.svg)