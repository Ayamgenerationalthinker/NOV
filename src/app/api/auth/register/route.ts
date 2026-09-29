import { NextResponse } from 'next/server';

/**
 * Public customer registration endpoint.
 * In this single-owner store architecture, customer registration is disabled.
 * Customers purchase directly as guests; only the store owner/admin has console access.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'Public customer registration is disabled. Only pre-configured administrators may sign in. Customers can purchase products directly via guest checkout.',
    },
    { status: 403 }
  );
}

export async function GET() {
  return NextResponse.json(
    {
      error: 'Customer registration is disabled on this platform.',
    },
    { status: 403 }
  );
}
