import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateCrmMemberStatus } from "../api";
import { CrmMemberDetails } from "../type/member.type";
import { memberKeys } from "./member.hook";

export function useUpdateCrmMemberStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ memberId, statusItemId }: { memberId: string; statusItemId: string }) =>
            updateCrmMemberStatus(memberId, statusItemId),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: memberKeys.detail(variables.memberId) });
            queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
            queryClient.setQueryData<CrmMemberDetails>(memberKeys.detail(variables.memberId), data);
        },
    });
}
