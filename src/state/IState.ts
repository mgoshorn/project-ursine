export interface IState {
    process(): Promise<IState | undefined>;
}
