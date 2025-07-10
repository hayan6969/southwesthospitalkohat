
// PKR exchange rate (you may want to fetch this from an API in production)
const USD_TO_PKR_RATE = 278; // Approximate rate as of 2024

export const formatCurrency = (amount: number, currency: 'USD' | 'PKR' = 'PKR'): string => {
  if (currency === 'PKR') {
    return `Rs. ${amount.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const convertUsdToPkr = (usdAmount: number): number => {
  return usdAmount * USD_TO_PKR_RATE;
};

export const formatPkrCurrency = (usdAmount: number): string => {
  const pkrAmount = convertUsdToPkr(usdAmount);
  return formatCurrency(pkrAmount, 'PKR');
};

// Format amount that's already in PKR (no conversion needed)
export const formatPkrAmount = (pkrAmount: number): string => {
  return formatCurrency(pkrAmount, 'PKR');
};
