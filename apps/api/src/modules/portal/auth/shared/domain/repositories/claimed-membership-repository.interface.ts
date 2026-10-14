/**
 * Членства, созданные саморегистрацией с чужим pending_claim email, держатся в
 * consent=pending, пока владелец адреса не докажет владение (задаст пароль по
 * ссылке из письма). Этот порт подтверждает их в момент клейма.
 */
export abstract class ClaimedMembershipRepository {
    /**
     * Подтвердить membership-ы пользователя, ожидающие клейма аккаунта:
     * consent=pending и joinSource != crm (crm-ные pending подтверждаются
     * только явным согласием с паролем — TASK-663). Возвращает число строк.
     */
    abstract confirmPendingSelfJoins(userId: string): Promise<number>;
}
