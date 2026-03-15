/**
 * Событие регистрации пользователя
 * Используется для публикации в EventBus
 */
export class UserRegisteredEvent {
    constructor(
        public readonly userId: string,
        public readonly email: string,
        public readonly name: string,
        public readonly registeredAt: Date
    ) {}
}
