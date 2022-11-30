export type PickPartial<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>> & Partial<Pick<T, K>>;
export type PickRequired<T, K extends keyof T> = Partial<T> & Required<Pick<T, K>>;
