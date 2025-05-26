'use client';

import { Inter } from 'next/font/google';
import './globals.css';
import dynamic from 'next/dynamic';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.className} suppressHydrationWarning>
                <NoSSRWrapper>{children}</NoSSRWrapper>
            </body>
        </html>
    );
}

// NoSSR wrapper component
const NoSSRWrapper = dynamic(
    () =>
        Promise.resolve(({ children }: { children: React.ReactNode }) => (
            <>{children}</>
        )),
    {
        ssr: false,
    }
);
