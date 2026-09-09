import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Loan } from '@/models/Loan';
import { getSession } from '@/lib/auth';

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const user = await getSession();
    if (!user || user.role === 'customer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    const { content } = await req.json();
    await connectDB();
    
    const loan = await Loan.findById(params.id);
    if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    
    loan.internalNotes.push({
      author: user._id,
      content,
      timestamp: new Date()
    });
    
    await loan.save();
    
    return NextResponse.json({ message: 'Note added successfully', loan }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
