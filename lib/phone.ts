/** "(407) 749-3429", "407.749.3429", "+1 407 749 3429" -> "+14077493429"; anything else -> null. */
export function normalizeUsPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return /^[2-9]\d{9}$/.test(ten) ? `+1${ten}` : null;
}

/** "+14077493429" -> "(407) 749-3429" */
export function formatUsPhone(e164: string | null): string {
  const m = e164?.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : (e164 ?? "");
}
