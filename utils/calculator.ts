
import type { AmortizationData, Prepayments } from '../types';

export const calculateEMI = (principal: number, annualRate: number, tenureInMonths: number): number => {
  if (principal <= 0 || tenureInMonths <= 0) {
    return 0;
  }
  if (annualRate <= 0) {
    return principal / tenureInMonths;
  }
  const monthlyRate = annualRate / 12 / 100;
  const emi =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureInMonths)) /
    (Math.pow(1 + monthlyRate, tenureInMonths) - 1);
  return emi;
};

export const generateAmortizationSchedule = (
  principal: number,
  annualRate: number,
  tenureInMonths: number,
  prepayments: Prepayments = {}
): AmortizationData[] => {
  if (principal <= 0 || tenureInMonths <= 0) {
    return [];
  }

  const schedule: AmortizationData[] = [];
  let remainingBalance = principal;
  const monthlyRate = annualRate > 0 ? annualRate / 12 / 100 : 0;
  const baseEMI = calculateEMI(principal, annualRate, tenureInMonths);

  for (let month = 1; month <= tenureInMonths && remainingBalance > 0.01; month++) {
    const openingBalance = remainingBalance;
    const interest = openingBalance * monthlyRate;
    let principalPaid = Math.min(baseEMI - interest, openingBalance);
    
    // Ensure principal payment is not negative
    if (principalPaid < 0) {
      principalPaid = 0;
    }

    const prepayment = prepayments[month] || 0;
    
    // Calculate closing balance
    let closingBalance = openingBalance - principalPaid - prepayment;
    
    // Adjust if prepayment exceeds remaining balance
    let actualPrepayment = prepayment;
    if (closingBalance < 0) {
      actualPrepayment = prepayment + closingBalance;
      closingBalance = 0;
    }

    const totalPayment = interest + principalPaid + actualPrepayment;

    schedule.push({
      month,
      openingBalance,
      interest: Math.max(0, interest),
      principal: Math.max(0, principalPaid),
      prepayment: Math.max(0, actualPrepayment),
      totalPayment: Math.max(0, totalPayment),
      closingBalance: Math.max(0, closingBalance),
    });

    remainingBalance = closingBalance;
  }

  return schedule;
};
