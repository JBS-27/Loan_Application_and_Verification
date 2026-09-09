import { NextResponse } from 'next/server';

function calculateEMI(principal: number, annualInterestRate: number, tenureMonths: number) {
  const monthlyInterestRate = annualInterestRate / 12 / 100;
  if (monthlyInterestRate === 0) return principal / tenureMonths;
  
  const emi = (principal * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, tenureMonths)) / 
              (Math.pow(1 + monthlyInterestRate, tenureMonths) - 1);
              
  return Math.round(emi * 100) / 100;
}

export async function POST(req: Request) {
  try {
    const { principal, interestRate, tenureMonths } = await req.json();
    
    if (!principal || !interestRate || !tenureMonths) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    
    const emi = calculateEMI(Number(principal), Number(interestRate), Number(tenureMonths));
    const totalAmount = emi * Number(tenureMonths);
    const totalInterest = totalAmount - Number(principal);
    
    return NextResponse.json({ 
      emi, 
      totalAmount, 
      totalInterest,
      principal: Number(principal),
      interestRate: Number(interestRate),
      tenureMonths: Number(tenureMonths)
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
