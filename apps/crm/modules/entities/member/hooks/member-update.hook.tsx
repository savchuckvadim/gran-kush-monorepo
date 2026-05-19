import { useMutation, useQueryClient } from "@tanstack/react-query";
import { memberKeys } from "./member.hook";
import { updateCrmMember } from "../api";
import { CrmMemberDetails } from "../type/member.type";

// Hook for updating member profile
export function useUpdateCrmMember() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            memberId,
            payload,
        }: {
            memberId: string;
            payload: Parameters<typeof updateCrmMember>[1];
        }) => updateCrmMember(memberId, payload),
        onSuccess: (data, variables) => {
            // Invalidate and refetch member details
            queryClient.invalidateQueries({ queryKey: memberKeys.detail(variables.memberId) });
            // Also invalidate list to update any displayed data
            queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
            // Optionally update cache directly with returned data
            queryClient.setQueryData<CrmMemberDetails>(memberKeys.detail(variables.memberId), data);
        },
    });
}
