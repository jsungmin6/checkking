import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "checkking",

  brand: {
    primaryColor: "#1a5fb4"
  },

  permissions: [
    { name: "camera", access: "access" },
    { name: "photos", access: "read" },
  ],

  // 뒤로가기는 **네비게이션 바 것만 쓴다.** 화면 안의 헤더(BackHeader)는 토스에서
  // 스스로 숨고, 클로버 화면의 자체 버튼도 숨긴다.
  //
  // 한때 이 버튼을 껐다가 되돌렸다. 중복 노출로 반려된 줄 알고 껐는데, 정작 화면
  // 대부분은 BackHeader를 써서 이미 숨고 있었다. 끄고 나니 방에 들어가면 나갈
  // 수단이 사라졌다. 중복은 클로버 화면 한 곳의 문제였다.
  navigationBar: {
    withBackButton: true,
    withHomeButton: true,
  },
  webBundleDir: "dist",
  webView: {}
});
