
interface ITouchDisplay {

    setState();
    awaitUserOperation(): Promise<unknown>

}

enum OperationTypes {
    READY,
    POST_PROCESSING,

    CARD_INSERTED_UNVERIFIED,
    CARD_INSERTED_VERIFIED,
    
    DEPOSIT_ENUMERATING,
    DEPOSIT_OPEN,
    DEPOSIT_CLOSING,
    DEPOSIT_PROCESSING,

    WITHDRAW_ENUMERATING,
    WITHDRAW_OPEN,
    WITHDRAW_CLOSING,
    WITHDRAW_PROCESSING,


}