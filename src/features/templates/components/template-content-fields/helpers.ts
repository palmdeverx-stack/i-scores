import { useWatch, useFormContext } from 'react-hook-form';

export function uid() {
  return crypto.randomUUID();
}

export function contentName(contentPath: string, field: string) {
  return `${contentPath}.${field}`;
}

export function useArrayValue<T>(name: string) {
  const { control, setValue } = useFormContext();
  const value = (useWatch({ control, name }) ?? []) as T[];
  const update = (next: T[]) => setValue(name, next, { shouldDirty: true, shouldValidate: true });
  const remove = (index: number) => update(value.filter((_, rowIndex) => rowIndex !== index));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    update(next);
  };
  return { value, update, remove, move };
}
