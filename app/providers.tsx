'use client';

import { SessionProvider } from "next-auth/react";
import { NavigationGuardProvider } from "@/app/lib/navigation/use-navigation-guard";
import { UnsavedChangesDialog } from "@/components/navigation/unsaved-changes-dialog";
import { OfflineSyncManager } from "@/components/offline/offline-sync-manager";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NavigationGuardProvider>
        {children}
        <UnsavedChangesDialog />
        <OfflineSyncManager />
      </NavigationGuardProvider>
    </SessionProvider>
  );
}