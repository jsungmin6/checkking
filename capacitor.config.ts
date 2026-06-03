import type { CapacitorConfig } from '@capacitor/cli';

const isDev = process.env.CAPACITOR_DEV === 'true';
const macIp = process.env.MAC_IP ?? '192.168.0.64';

const config: CapacitorConfig = {
  appId: 'com.chescode.checkking',
  appName: '등교왕',
  webDir: 'dist',
  server: isDev
    ? {
        // 개발: 맥의 vite dev 서버 사용 (카카오 리다이렉트 + HMR)
        url: `http://${macIp}:5174`,
        cleartext: true,
        allowNavigation: ['*'],
      }
    : {
        // 프로덕션: 빌드된 dist/ 로컬 파일 사용
        allowNavigation: ['*'],
      },
};

export default config;
