'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import { AuthProvider } from '@/contexts/auth-context';
import { AppearanceProvider } from '@/contexts/appearance-context';
import { NotificationProvider } from '@/contexts/notification-context';
import { ThemeProvider } from '@/providers/theme-provider';
import { Toaster } from 'sonner';

export default function Providers({ children }: { children: ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 60 * 1000,
                        retry: 1,
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                <AppearanceProvider>
                    <AuthProvider>
                        <NotificationProvider>
                            {children}
                            <Toaster position="top-center" richColors />
                        </NotificationProvider>
                    </AuthProvider>
                </AppearanceProvider>
            </ThemeProvider>
        </QueryClientProvider>
    );
}
