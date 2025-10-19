// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-nocheck

export const isCallerAuthorizedLit = (authorisedCaller: string): boolean => {
  const authMethods: { userId?: string }[] = Lit.Auth.authMethodContexts;
  console.log(`Verifying caller: ${authorisedCaller}`);

  const isAuthorized = authMethods.some((authMethod) => {
    const userId = authMethod.userId;
    if (!userId) return false;

    return userId.toLowerCase() === authorisedCaller.toLowerCase();
  });

  if (isAuthorized) return true;
  else {
    console.log(
      `Caller ${JSON.stringify(authMethods)} is not authorized. Expected: ${authorisedCaller}`,
    );
    return false;
  }
};
