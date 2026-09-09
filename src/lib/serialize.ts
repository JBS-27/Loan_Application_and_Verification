export function serialize<T>(value: unknown): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function idOf(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (typeof value === "object") {
    const record = value as {
      toHexString?: () => string;
      _id?: unknown;
      toString?: () => string;
    };

    if (typeof record.toHexString === "function") {
      return record.toHexString();
    }

    if (record._id && record._id !== value) {
      return idOf(record._id);
    }

    if (typeof record.toString === "function") {
      const text = record.toString();
      if (text && text !== "[object Object]") return text;
    }
  }

  return String(value);
}
