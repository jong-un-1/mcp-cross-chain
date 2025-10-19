export type SignedResponse<T> = {
  data: T;
  dataStringified: string;
  signature: string;
};
