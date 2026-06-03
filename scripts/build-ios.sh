#!/bin/bash
# iOS 빌드 스크립트 - 맥 IP를 자동 감지하여 API URL 설정

MAC_IP=$(ipconfig getifaddr en0)
if [ -z "$MAC_IP" ]; then
  echo "❌ Wi-Fi IP를 찾을 수 없습니다. Wi-Fi에 연결되어 있는지 확인하세요."
  exit 1
fi

echo "📱 iOS 빌드 시작"
echo "   맥 IP: $MAC_IP"
echo "   API URL: http://$MAC_IP:8081/api"

# 맥 IP 기준으로 빌드
VITE_API_BASE_URL="http://$MAC_IP:8081/api" \
VITE_KAKAO_JS_KEY="${VITE_KAKAO_JS_KEY:-fe0280338601d870909ff7b884415010}" \
VITE_KAKAO_REDIRECT_URI="http://$MAC_IP:5174/oauth/kakao" \
npx vite build

echo "📦 iOS sync"
npx cap sync ios

echo "✅ 빌드 완료. Xcode에서 Run하거나 아래 명령어로 설치:"
echo "   xcodebuild -project ios/App/App.xcodeproj -scheme App -destination 'platform=iOS,name=김태민' -allowProvisioningUpdates build"
