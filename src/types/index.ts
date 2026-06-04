// === Enums ===

export type LoginType = "KAKAO" | "TOSS";
export type ValidationType = "NONE" | "GPS" | "WIFI" | "GPS_AND_WIFI";
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

export interface User {
  userId: number;
  nickname: string;
  loginType: LoginType;
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
  memberCount: number;
  createdAt: string;
}

export interface ClassroomListItem {
  classroomId: number;
  name: string;
  ownerId: number;
  ownerNickname: string;
  isOwner: boolean;
  memberCount: number;
  todayCheckedIn: boolean;
  todayRank: number | null;
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
  createdAt: string;
}

// === Screen State ===

export type ScreenName =
  | "login"
  | "home"
  | "profile"
  | "createRoom"
  | "joinRoom"
  | "room"
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

