'use client';

import { Button } from "@workspace/ui";

import { useLogout } from "@/modules/entities/auth";

export function LogoutButton() {
    const { logout } = useLogout();
    
    return (
        <Button variant="default"  onClick={logout}>
            <div className="flex items-center flex-col gap-2 cursor-pointer w-full justify-center">
                <span>Logout</span> 
            </div>
        </Button>
    );
}