import { OrderStagesService } from "@modules/portal/crm/orders/application/services/order-stages.service";

import {
    PENDING,
    PORTAL,
    positions,
    PREPARING,
    repository,
    setupStagesService,
} from "./order-stages.fixtures";

describe("OrderStagesService — место карточки в колонке", () => {
    let service: OrderStagesService;

    beforeEach(async () => {
        service = await setupStagesService();
    });

    it("ставит карточку под соседа в новой колонке", async () => {
        repository.findStageInPortal.mockResolvedValue(PREPARING);

        await service.moveToStage("order-1", PREPARING.id, "emp-1", PORTAL, "order-2");

        expect(positions.positionFor).toHaveBeenCalledWith(
            { portalId: PORTAL, entityDefinitionId: "def-order", stageId: PREPARING.id },
            "record-of-order-1",
            "record-of-order-2"
        );
    });

    it("в той же стадии с соседом только переставляет карточку", async () => {
        repository.findStageInPortal.mockResolvedValue(PENDING);

        await service.moveToStage("order-1", PENDING.id, "emp-1", PORTAL, null);

        expect(repository.setStagePosition).toHaveBeenCalledWith(
            "record-of-order-1",
            PENDING.id,
            -42
        );
        expect(repository.compareAndSetStage).not.toHaveBeenCalled();
        expect(repository.update).not.toHaveBeenCalled();
    });

    it("перестановка, пока заказ уже перенесли в другую стадию, — 409 и запись не тронута", async () => {
        repository.findStageInPortal.mockResolvedValue(PENDING);
        repository.setStagePosition.mockResolvedValue(false);

        await expect(
            service.moveToStage("order-1", PENDING.id, "emp-1", PORTAL, "order-2")
        ).rejects.toMatchObject({ status: 409 });
        expect(repository.compareAndSetStage).not.toHaveBeenCalled();
    });

    it("без соседа в той же стадии место не меняется вовсе", async () => {
        repository.findStageInPortal.mockResolvedValue(PENDING);

        await service.moveToStage("order-1", PENDING.id, "emp-1", PORTAL);

        expect(repository.setStagePosition).not.toHaveBeenCalled();
        expect(positions.positionFor).not.toHaveBeenCalled();
    });
});
