import type { SchemaSharedClubDto } from "@workspace/api-client/core";

/** Членства, которым файл показан, — для переключателей «показать клубу». */
export const sharedIdsOf = (clubs: readonly SchemaSharedClubDto[]): ReadonlySet<string> =>
    new Set(clubs.map((club) => club.memberId));
