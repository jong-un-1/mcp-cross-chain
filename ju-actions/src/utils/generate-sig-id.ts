export const generateSigId = (prefix: string) => {
  return `${prefix}-${Date.now()}`;
};
