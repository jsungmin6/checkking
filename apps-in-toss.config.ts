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

  // 토스 네비게이션 바의 뒤로가기를 끈다. 앱이 화면마다 자체 헤더에 뒤로가기를
  // 그리고 있어 버튼이 둘 다 보였고, 그 중복으로 심사에서 반려됐다(2026-11-01).
  //
  // 자체 헤더를 남기는 쪽을 택했다 — 화면 제목과 한 묶음이라 떼면 레이아웃이 깨진다.
  // 기기 뒤로가기(제스처·하드웨어 키)는 backEvent로 계속 받으므로 동작은 그대로다.
  // 홈 버튼은 켜 둔다. 미니앱을 빠져나갈 수단이 하나는 있어야 한다.
  navigationBar: {
    withBackButton: false,
    withHomeButton: true,
  },
  webBundleDir: "dist",
  webView: {}
});
