/**
 * JWT Payload Interface
 * Данные, которые хранятся в JWT токене
 */
export interface JwtPayload {
    sub: string; // user id
    email: string;
    type?: "user"; // Тип для различения от employee токенов
}
