import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { name, email, password } = await request.json();

        // In a real app, you would send this to your backend
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/register`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, password }),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { message: data.message || 'Registration failed' },
                { status: response.status }
            );
        }

        return NextResponse.json(
            { message: 'Registration successful', user: data.data },
            { status: 200 }
        );
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}
