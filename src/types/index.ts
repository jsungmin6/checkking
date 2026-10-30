// === Enums ===

export type LoginType = "KAKAO" | "TOSS" | "APPLE";
export type ValidationType = "NONE" | "GPS" | "WIFI" | "GPS_AND_WIFI" | "PHOTO";
export type AttendanceStatus = "PRESENT" | "ABSENT" | "EXCUSED";

// === API 공통 ===

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// === Auth ===

export type AccountType = "FREE" | "PREMIUM";

export interface User {
  userId: number;
  nickname: string;
  loginType: LoginType;
  accountType?: AccountType;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  isNewUser: boolean;
  user: User;
}

export interface TokenRefreshResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
}

// === Classroom ===

export interface GpsConfig {
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface WifiConfig {
  ssid: string;
  bssid: string;
}

export interface Classroom {
  classroomId: number;
  name: string;
  inviteCode: string;
  ownerId: number;
  ownerNickname: string;
  validationType: ValidationType;
  gpsConfig: GpsConfig | null;
  wifiConfig: WifiConfig | null;
  checkInStartTime: string | null;
  checkInEndTime: string | null;
  includeWeekends: boolean;
  isPublic: boolean;
  memberCount: number;
  /** 방장 계정 등급에 따라 정해지는 정원 — 서버가 응답마다 계산해서 내려준다. */
  maxMembers: number;
  createdAt: string;
  announcement?: string | null;
  /** 오늘의 마지막 인사 id — 내가 본 마지막 글과 비교해 인사 탭에 점을 띄울지 정한다. */
  latestGreetingId?: number | null;
}

export interface RoomGreeting {
  greetingId: number;
  userId: number;
  nickname: string;
  content: string;
  imageAvailable?: boolean;
  /** 로컬 미리보기에서만 사용해요. 운영 이미지는 인증된 이미지 API로 불러와요. */
  imageDataUrl?: string;
  reportCount: number;
  hidden: boolean;
  mine: boolean;
  createdAt: string;
}

export interface ClassroomListItem {
  classroomId: number;
  name: string;
  ownerId: number;
  ownerNickname: string;
  isOwner: boolean;
  memberCount: number;
  maxMembers: number;
  todayCheckedIn: boolean;
  todayRank: number | null;
  isPublic: boolean;
  inviteCode: string;
  joined: boolean;
  isDemo?: boolean;
  /** 방 카드에 "사진 인증" 같은 태그를 띄우는 데 쓴다. */
  validationType?: ValidationType;
  /** 오늘의 마지막 인사 id. 참여하지 않은 방은 인사를 볼 수 없어 null 이다. */
  latestGreetingId?: number | null;
}

export interface ClassroomMember {
  userId: number;
  nickname: string;
  isOwner: boolean;
  joinedAt: string;
}

// === Attendance ===

export interface CheckInResponse {
  attendanceId: number;
  classroomId: number;
  checkInDate: string;
  checkInTime: string;
  dailyRank: number;
  totalCheckedIn: number;
  totalMembers: number;
  status: AttendanceStatus;
  /** 방을 가리지 않는 내 누적 출석 횟수 — 만족도를 물어볼 시점인지 판단하는 데 쓴다. */
  myTotalCheckIns: number;
}

export interface TodayRanking {
  rank: number;
  userId: number;
  nickname: string;
  checkInTime: string;
  status: AttendanceStatus;
}

export interface AbsentMember {
  userId: number;
  nickname: string;
  status: AttendanceStatus;
}

export interface TodayAttendance {
  date: string;
  totalMembers: number;
  totalCheckedIn: number;
  myRank: number | null;
  myCheckInTime: string | null;
  rankings: TodayRanking[];
  absentMembers: AbsentMember[];
}

// === Monthly Attendance ===

export interface MonthlyAttendanceRecord {
  checkInDate: string;
  checkInTime: string;
  dailyRank: number;
  status: string;
}

// === Statistics ===

export interface MonthlyRankingEntry {
  rank: number;
  userId: number;
  nickname: string;
  avgRank: number;
  totalPresent: number;
  totalDays: number;
}

export interface MonthlyRanking {
  period: string;
  year: number;
  month: number;
  criteria: string;
  rankings: MonthlyRankingEntry[];
}

export interface PersonalStats {
  userId: number;
  nickname: string;
  classroomId: number;
  avgRank: number;
  avgCheckInTime: string;
  totalPresent: number;
  firstPlaceCount: number;
  topThreeCount: number;
  currentStreak: number;
  earliestCheckIn: string;
  latestCheckIn: string;
}

// === Profile ===

export interface Profile {
  userId: number;
  nickname: string;
  loginType: LoginType;
  accountType: AccountType;
  createdAt: string;
}

// === Screen State ===

export type ScreenName =
  | "login"
  | "home"
  | "profile"
  | "createRoom"
  | "joinRoom"
  | "publicRooms"
  | "room"
  | "greeting"
  | "ranking"
  | "stats"
  | "settings";

// === Check-in Request ===

export interface CheckInRequest {
  latitude?: number;
  longitude?: number;
  locationAccuracy?: number;
  wifiSsid?: string;
  wifiBssid?: string;
  imageBase64?: string;
}

// === Settings Request ===

export interface ClassroomSettingsRequest {
  validationType: ValidationType;
  gpsConfig: GpsConfig | null;
  wifiConfig: WifiConfig | null;
  checkInStartTime: string | null;
  checkInEndTime: string | null;
  includeWeekends: boolean;
}

