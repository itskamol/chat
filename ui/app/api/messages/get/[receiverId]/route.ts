import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: { receiverId: string } }
) {
    try {
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.split(' ')?.[1]; // Bearer <token>

        if (!token) {
            return NextResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const receiverId = params.receiverId;

        // In a real app, you would fetch this from your backend
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE_URL}/messages/get/${receiverId}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { message: data.message || 'Failed to fetch messages' },
                { status: response.status }
            );
        }

        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error('Message fetch error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}
