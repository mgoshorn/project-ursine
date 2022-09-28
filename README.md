# Cloning Project

## SSH clone

```
git clone git@github.com:mgoshorn/project-ursine.git
```

## HTTPS clone

```
git clone https://github.com/mgoshorn/project-ursine.git
```

# Running Tests

With NPM Installed:

```
npm install
npm test
```

With Docker:
```
docker build -f ./test.Dockerfile . -t project-ursine
docker run project-ursine
```

## Options
You may append -- --coverage or -- --verbose for more details on test run. Example: `npm test -- --coverage`.

## Disabling Logs
To disable log statements, copy ./.env.example to ./.env and set `LOG_LEVEL=silent`.

# Implementation Notes
## Application Flow Management

The ATM's interaction state is managed as a finite-state machine. The IState interface defines an interface that defines the structure of how the application can interact with a state. The process function executes the state's internal behavior and returns a new state. Therefore the return value of each state's process controls the flow of the application.

The starting point is AwaitingCustomerState is the default waiting state. When a customer enters their card and PIN number, the application transitions to the MainMenuState.  At the MainMenuState, the user is free to navigate the view on the ATM until they have selected an operation. The selection payload does not get sent until they have reached a point in the operation that requires data or hardware access, so the payload may already contain details on the operation which then just need to be validated.

Under normal circumstances, the operation states (DepositState, TransferState, etc) will resolve normally and return the user to the MainMenuState.  However, in the case of a mechanical error or other error which requires manual intervention by a bank represntative, the process will transition to the MaintenanceRequiredState. This state cannot be progressed by normal users, though a full implementation of this state is not provided as the details of this implementation fall fairly far outside the scope of the initial implementation.

![Application State Flow](/res/ursine-states.svg)

## API Access

The application uses four interfaces for interacting with hardware and a networked Banking API. These are ICardReader, IDispenser, ITouchDisplay, and IBankAPI. ICardReader, IDispenser, and ITouchDisplay are interfaces for physical devices and are designed to be loosely coupled. The function calls are fairly high level and it would be expected for actual implementations to handle more ground-level details.

# Unit Tests

Unit tests have been written covering the various implemented states. These tests cover validation logic and error handling related to the operation. They largely rely on making assertions as to the next state that the application will transition to, as this is the only stateful change for the application, but to allow for more thorough unit testing some white-box testing is included which verifies calls to hardware/network APIs when doing so can better differentiate one exit point from another. Tests do not attempt to cover functionality better tested through integration testing or end-to-end testing.

## Test Coverage

```
-----------------------------------|---------|----------|---------|---------|-------------------
File                               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-----------------------------------|---------|----------|---------|---------|-------------------
All files                          |   98.42 |    98.27 |   91.17 |   98.41 |
 src                               |   88.88 |      100 |      90 |   88.88 |
  App.ts                           |   88.88 |      100 |      90 |   88.88 | 65-67
 src/__test__/test-implementations |     100 |      100 |     100 |     100 |
  BankTestingImpl.ts               |     100 |      100 |     100 |     100 |
  CardReaderTesting.ts             |     100 |      100 |     100 |     100 |
  DispenserTesting.ts              |     100 |      100 |     100 |     100 |
  TouchDisplayTesting.ts           |     100 |      100 |     100 |     100 |
 src/errors                        |     100 |      100 |     100 |     100 |
  UrsineErrors.ts                  |     100 |      100 |     100 |     100 |
 src/hardware/TouchDisplay         |     100 |      100 |     100 |     100 |
  ITouchDisplay.ts                 |     100 |      100 |     100 |     100 |
 src/hardware/TouchDisplay/dto     |     100 |      100 |     100 |     100 |
  OperationPayload.ts              |     100 |      100 |     100 |     100 |
 src/state                         |   98.89 |      100 |    87.5 |   98.88 |
  AwaitingCustomerState.ts         |     100 |      100 |     100 |     100 |
  BalanceCheckState.ts             |     100 |      100 |     100 |     100 |
  DepositState.ts                  |     100 |      100 |     100 |     100 |
  MainMenuState.ts                 |     100 |      100 |     100 |     100 |
  MaintenanceRequiredState.ts      |   57.14 |      100 |   33.33 |      50 | 16-20
  TransferState.ts                 |     100 |      100 |     100 |     100 |
  WithdrawState.ts                 |     100 |      100 |     100 |     100 |
 src/state/dtos                    |     100 |      100 |     100 |     100 |
  DisplayViewDTOs.ts               |     100 |      100 |     100 |     100 |
  TransferConfirmationResponse.ts  |     100 |      100 |     100 |     100 |
 src/util                          |     100 |       50 |     100 |     100 |
  logger.ts                        |     100 |       50 |     100 |     100 | 16
-----------------------------------|---------|----------|---------|---------|-------------------
```