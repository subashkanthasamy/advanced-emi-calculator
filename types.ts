
export interface AmortizationData {
  month: number;
  openingBalance: number;
  interest: number;
  principal: number;
  prepayment: number;
  totalPayment: number;
  closingBalance: number;
}

export interface EMIDetails {
  emi: number;
  totalInterest: number;
  totalPayment: number;
  principal: number;
  actualTenure?: number; // Actual tenure when prepayments are made
}

export type TenureUnit = 'years' | 'months';

export type Prepayments = Record<number, number>;
