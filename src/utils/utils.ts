import fs from "node:fs";

/** Does nothing. */
export function nop(): void {}

/** Converts a Date to Excel's serial-number date. */
export function dateToExcel(d: Date, date1904?: boolean): number {
  return 25569 + d.getTime() / (24 * 3600 * 1000) - (date1904 ? 1462 : 0);
}

/** Converts Excel's serial-number date to a Date. */
export function excelToDate(v: number, date1904?: boolean): Date {
  const millisecondSinceEpoch = Math.round((v - 25569 + (date1904 ? 1462 : 0)) * 24 * 3600 * 1000);
  return new Date(millisecondSinceEpoch);
}

// eslint-disable-next-line no-control-regex
const xmlDecodeRegex = /[<>&'"\x7F\x00-\x08\x0B-\x0C\x0E-\x1F]/;

/** Escapes text for XML, dropping the control characters XML cannot carry. */
export function xmlEncode(text: string): string {
  const regexResult = xmlDecodeRegex.exec(text);
  if (!regexResult) return text;

  let result = '';
  let escape = '';
  let lastIndex = 0;
  let i = regexResult.index;
  for (; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    switch (charCode) {
      case 34: // "
        escape = '&quot;';
        break;
      case 38: // &
        escape = '&amp;';
        break;
      case 39: // '
        escape = '&apos;';
        break;
      case 60: // <
        escape = '&lt;';
        break;
      case 62: // >
        escape = '&gt;';
        break;
      case 127:
        escape = '';
        break;
      default: {
        if (charCode <= 31 && (charCode <= 8 || (charCode >= 11 && charCode !== 13))) {
          escape = '';
          break;
        }
        continue;
      }
    }
    if (lastIndex !== i) result += text.substring(lastIndex, i);
    lastIndex = i + 1;
    if (escape) result += escape;
  }
  if (lastIndex !== i) return result + text.substring(lastIndex, i);
  return result;
}

/** Reverses the five predefined XML entities. */
export function xmlDecode(text: string): string {
  return text.replace(/&([a-z]*);/g, c => {
    switch (c) {
      case "&lt;":
        return "<";
      case "&gt;":
        return ">";
      case "&amp;":
        return "&";
      case "&apos;":
        return "'";
      case "&quot;":
        return '"';
      default:
        return c;
    }
  });
}

/** Parses an integer, giving 0 for anything that is not one. */
export function validInt(value: unknown): number {
  const i = parseInt(value as string, 10);
  return !Number.isNaN(i) ? i : 0;
}

/** Does a number-format code contain date or time characters? */
export function isDateFmt(fmt?: string | null): boolean {
  if (!fmt) {
    return false;
  }

  // must remove all chars inside quotes and []
  const stripped = fmt.replace(/\[[^\]]*]/g, "").replace(/"[^"]*"/g, "");
  // then check for date formatting chars
  return stripped.match(/[ymdhMsb]+/) !== null;
}

/** Does the file or directory exist? */
export function exists(path: string): Promise<boolean> {
  return new Promise(resolve => {
    fs.access(path, fs.constants.F_OK, err => {
      resolve(!err);
    });
  });
}

/** Reads the XML-style boolean spellings of true. */
export function parseBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}
