'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from '@/components/login-form';

export default function Home() {
    const router = useRouter();

    useEffect(() => {
        // Check if user is already logged in
        const token = localStorage.getItem('jwt');
        if (token) {
            router.push('/chat');
        }
    }, [router]);

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
            <div className="w-full max-w-md">
                <h1 className="text-3xl font-bold text-center mb-8">
                    Welcome to ChatApp
                </h1>
                <LoginForm />
            </div>
        </main>
    );
}
