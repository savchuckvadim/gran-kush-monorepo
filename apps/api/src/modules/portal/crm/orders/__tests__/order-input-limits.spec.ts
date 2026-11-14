import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import { CreateOrderDto, CrmCreateOrderDto } from "../api/dto/order-input.dto";
import { ORDER_MAX_ITEMS } from "../domain/order.limits";

const item = { productId: "550e8400-e29b-41d4-a716-446655440000", quantity: 1 };
const items = (count: number) => Array.from({ length: count }, () => ({ ...item }));

const itemsErrors = async (
    dto: typeof CreateOrderDto | typeof CrmCreateOrderDto,
    count: number
) => {
    const errors = await validate(plainToInstance(dto, { items: items(count) }));
    return errors.filter((error) => error.property === "items");
};

describe("Заказ: потолок позиций (TASK-670)", () => {
    it.each([CreateOrderDto, CrmCreateOrderDto])("%p принимает ровно потолок", async (dto) => {
        expect(await itemsErrors(dto, ORDER_MAX_ITEMS)).toHaveLength(0);
    });

    it.each([CreateOrderDto, CrmCreateOrderDto])(
        "%p отклоняет позиций больше потолка",
        async (dto) => {
            const errors = await itemsErrors(dto, ORDER_MAX_ITEMS + 1);
            expect(errors[0]?.constraints).toHaveProperty("arrayMaxSize");
        }
    );
});
