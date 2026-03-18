import { Loader2 } from "lucide-react";

export function LoadingScreen() {
    return (
        <div className="flex items-center justify-center h-screen bg-background">
            <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-sm text-primary">Loading...</p>
                <p className="text-xs text-primary">Please wait while we load the page...</p>
            </div>
        </div>
    );
}