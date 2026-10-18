import { isCapacitor } from "./platform";

export interface AppleLoginResult {
  identityToken: string;
  user: string | null;
}

export async function startAppleLogin(): Promise<AppleLoginResult> {
  if (isCapacitor()) {
    const { SignInWithApple } = await import("@capacitor-community/apple-sign-in");
    try {
      console.log("[출석왕] Apple authorize 호출 시작");
      const result = await SignInWithApple.authorize({
        clientId: "com.chesscode.checkking",
        scopes: "name email",
        redirectURI: "https://chesscode.duckdns.org",
        state: "auth",
      });
      console.log("[출석왕] Apple 로그인 성공, user:", result.response.user);
      return {
        identityToken: result.response.identityToken,
        user: result.response.user ?? null,
      };
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      console.error("[출석왕] Apple authorize 에러:", JSON.stringify({ code: err.code, message: err.message }));
      throw e;
    }
  } else {
    throw new Error("Apple 로그인은 iOS에서만 지원됩니다");
  }
}
