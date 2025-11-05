/**
 * Format large numbers compactly for display
 * @param {number} num - The number to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted string
 * 
 * Examples:
 * 9.9 -> "9.90"
 * 99.99 -> "99.99"
 * 999.99 -> "999.99"
 * 1000 -> "1.00K"
 * 1500 -> "1.50K"
 * 999999 -> "999.99K"
 * 1000000 -> "1.00M"
 * 1500000 -> "1.50M"
 * 1000000000 -> "1.00B"
 */
export function formatBalance(num, decimals = 2) {
  if (num == null || isNaN(num)) return '0.00'
  
  const absNum = Math.abs(num)
  
  // Less than 1000: show with decimals
  if (absNum < 1000) {
    return num.toFixed(decimals)
  }
  
  // 1K - 999.99K
  if (absNum < 1000000) {
    return (num / 1000).toFixed(decimals) + 'K'
  }
  
  // 1M - 999.99M
  if (absNum < 1000000000) {
    return (num / 1000000).toFixed(decimals) + 'M'
  }
  
  // 1B+
  return (num / 1000000000).toFixed(decimals) + 'B'
}
