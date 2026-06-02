import { useState } from "react";

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value: T | ((prev: T) => T)) => {
    if (value instanceof Function) {
      setStoredValue((prev) => {
        const newValue = value(prev);
        window.localStorage.setItem(key, JSON.stringify(newValue));
        return newValue;
      });
    } else {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  };

  return [storedValue, setValue];
}
