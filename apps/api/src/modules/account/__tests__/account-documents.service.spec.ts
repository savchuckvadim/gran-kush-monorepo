import { UserDocument, UserDocumentSide } from "@prisma/client";

import { AccountDocumentsService } from "../application/services/account-documents.service";
import { SharedClub } from "../domain/repositories/member-document-share-repository.interface";

const doc = (id: string, version: number, type = "passport"): UserDocument =>
    ({ id, userId: "u1", type, side: UserDocumentSide.single, version }) as UserDocument;

const club = (memberId: string): SharedClub => ({
    memberId,
    portalId: `portal-${memberId}`,
    slug: `club-${memberId}`,
    displayName: `Club ${memberId}`,
});

const build = (versionsBySlot: UserDocument[][], sharesByDoc: Record<string, SharedClub[]>) => {
    const current = versionsBySlot.map((versions) => versions[0]);
    const documents = {
        findAllByUser: jest.fn().mockResolvedValue(current),
        findVersions: jest
            .fn()
            .mockImplementation((_userId: string, type: string) =>
                Promise.resolve(versionsBySlot.find((versions) => versions[0]?.type === type) ?? [])
            ),
    };
    const shares = {
        findClubsByDocumentIds: jest
            .fn()
            .mockImplementation((ids: string[]) =>
                Promise.resolve(
                    new Map(ids.filter((id) => sharesByDoc[id]).map((id) => [id, sharesByDoc[id]]))
                )
            ),
    };
    const service = new AccountDocumentsService(
        documents as never,
        {} as never,
        shares as never,
        {} as never,
        {} as never
    );
    return { service, documents, shares };
};

describe("AccountDocumentsService.listDocuments — кто видит какую версию", () => {
    it("клуб, который видит прежнюю версию, попадает в staleSharedWith", async () => {
        const { service } = build([[doc("v2", 2), doc("v1", 1)]], { v1: [club("a")] });

        const [view] = await service.listDocuments("u1");

        expect(view?.document.id).toBe("v2");
        expect(view?.sharedWith).toEqual([]);
        expect(view?.staleSharedWith.map((c) => c.memberId)).toEqual(["a"]);
    });

    it("клуб, видящий текущую версию, не считается отставшим", async () => {
        const { service } = build([[doc("v2", 2), doc("v1", 1)]], {
            v2: [club("a")],
            v1: [club("a"), club("b")],
        });

        const [view] = await service.listDocuments("u1");

        expect(view?.sharedWith.map((c) => c.memberId)).toEqual(["a"]);
        expect(view?.staleSharedWith.map((c) => c.memberId)).toEqual(["b"]);
    });

    it("клуб, видящий несколько прежних версий, указан один раз", async () => {
        const { service } = build([[doc("v3", 3), doc("v2", 2), doc("v1", 1)]], {
            v2: [club("a")],
            v1: [club("a")],
        });

        const [view] = await service.listDocuments("u1");

        expect(view?.staleSharedWith).toHaveLength(1);
    });

    it("версии одного документа не смешиваются с другими слотами", async () => {
        const { service } = build([[doc("p2", 2), doc("p1", 1)], [doc("i1", 1, "id_card")]], {
            p1: [club("a")],
        });

        const views = await service.listDocuments("u1");

        expect(views.find((v) => v.document.id === "i1")?.staleSharedWith).toEqual([]);
        expect(views.find((v) => v.document.id === "p2")?.staleSharedWith).toHaveLength(1);
    });

    it("документ без версий и без показов даёт пустые списки", async () => {
        const { service } = build([[doc("only", 1)]], {});

        const [view] = await service.listDocuments("u1");

        expect(view?.sharedWith).toEqual([]);
        expect(view?.staleSharedWith).toEqual([]);
    });
});
