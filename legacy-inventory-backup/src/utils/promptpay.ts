// Generates an EMV-compliant PromptPay QR payload (Bank of Thailand spec).
// Any banking app can scan this and transfer real money to the given PromptPay ID.

function formatField(id: string, value: string): string {
  const length = value.length.toString().padStart(2, '0');
  return `${id}${length}${value}`;
}

function crc16ccitt(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) !== 0 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function buildMerchantTarget(promptPayId: string): { tag: string; value: string } {
  const digits = promptPayId.replace(/\D/g, '');
  if (digits.length === 13) {
    // National ID / Tax ID
    return { tag: '02', value: digits };
  }
  // Mobile number -> country code 66 + number without leading 0
  const localNumber = digits.startsWith('0') ? digits.slice(1) : digits;
  return { tag: '01', value: `0066${localNumber}` };
}

/**
 * @param promptPayId Mobile number (e.g. "0954400809") or 13-digit national/tax ID
 * @param amount Optional fixed amount in THB; omit for a static (any-amount) QR
 */
export function generatePromptPayPayload(promptPayId: string, amount?: number): string {
  const target = buildMerchantTarget(promptPayId);

  const merchantAccountInfo =
    formatField('00', 'A000000677010111') + formatField(target.tag, target.value);

  let payload =
    formatField('00', '01') +
    formatField('01', amount ? '12' : '11') +
    formatField('29', merchantAccountInfo) +
    formatField('53', '764');

  if (amount) {
    payload += formatField('54', amount.toFixed(2));
  }

  payload += formatField('58', 'TH');
  payload += '6304';

  return payload + crc16ccitt(payload);
}
