import { useEffect, useState, useRef } from "react";
import BackHeader from "../components/BackHeader";
import Toast from "../components/Toast";
import { useToast } from "../hooks/useToast";
import { api, ApiError } from "../utils/api";
import { validateRoomName } from "../utils/profanity";
import { isTossApp } from "../utils/platform";
import { showTossRewardedAd, reportAdLoadFailed } from "../utils/tossRewardedAd";
import type { AccountType, Classroom, ClassroomListItem, ValidationType, ClassroomSettingsRequest, GpsConfig, WifiConfig } from "../types";

interface CreateRoomScreenProps {
  accountType?: AccountType;
  onBack: () => void;
  onCreated: (classroomId: number) => void;
}

type Step = 1 | 2 | 3;

const selectStyle: React.CSSProperties = {
  padding: "10px 4px",
  fontSize: 18,
  fontWeight: 600,
  borderRadius: 8,
  border: "1px solid var(--border-light)",
  background: "var(--bg-secondary)",
  color: "var(--text-primary)",
  textAlign: "center",
  textAlignLast: "center",
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
};

const CREATE_ROOM_AD_GROUP_ID = "ait.v2.live.55ffe7a234434623";

function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [h, m] = value ? value.split(":") : ["", ""];

  const update = (newH: string, newM: string) => {
    if (newH && newM) onChange(`${newH}:${newM}`);
    else if (newH) onChange(`${newH}:00`);
    else onChange("");
  };

  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      <select value={h} onChange={(e) => update(e.target.value, m || "00")} style={{ ...selectStyle, width: 60 }}>
        <option value="">시</option>
        {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((v) => (
          <option key={v} value={v}>{v}</option>
        ))}
      </select>
      <span style={{ color: "var(--text-secondary)", fontSize: 18 }}>:</span>
      <select value={m} onChange={(e) => update(h || "00", e.target.value)} style={{ ...selectStyle, width: 60 }}>
        <option value="">분</option>
        {["00", "10", "20", "30", "40", "50"].map((v) => (
          <option key={v} value={v}>{v}</option>
        ))}
      </select>
    </div>
  );
}

const VALIDATION_OPTIONS: { type: ValidationType; label: string; desc: string; disabled?: boolean }[] = [
  { type: "NONE", label: "검증 없음", desc: "누구나 어디서든 출석" },
  { type: "GPS", label: "GPS 위치 확인", desc: "지정 위치 반경 내에서만" },
  { type: "WIFI", label: "Wi-Fi 확인", desc: "지원 예정", disabled: true },
];

declare global {
  interface Window {
    daum: {
      Postcode: new (config: {
        oncomplete: (data: { address: string; roadAddress: string; jibunAddress: string }) => void;
        width?: string;
        height?: string;
      }) => { open: () => void; embed: (element: HTMLElement) => void };
    };
  }
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=kr`,
      { headers: { "Accept-Language": "ko" } }
    );
    const data = await res.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  } catch {
    return null;
  }
}

async function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
  const { Geolocation } = await import("@capacitor/geolocation");
  const pos = await Geolocation.getCurrentPosition({
    enableHighAccuracy: true,
    timeout: 10000,
  });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}

export default function CreateRoomScreen({ accountType, onBack, onCreated }: CreateRoomScreenProps) {
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [validationType, setValidationType] = useState<ValidationType>("NONE");

  // GPS 설정
  const [addressText, setAddressText] = useState("");
  const [gpsConfig, setGpsConfig] = useState<GpsConfig | null>(null);
  const [radiusMeters, setRadiusMeters] = useState("100");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Wi-Fi 설정
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiBssid, setWifiBssid] = useState("");

  // 출석 시간 + 주말
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [includeWeekends, setIncludeWeekends] = useState(true);
  const [showTimeSelect, setShowTimeSelect] = useState(false);

  const [loading, setLoading] = useState(false);
  const [watchingAd, setWatchingAd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toastMessage, showToast } = useToast();
  const [roomCount, setRoomCount] = useState<number | null>(null);
  const roomLimit = accountType === "PREMIUM" ? 50 : 10;
  const roomLimitReached = roomCount !== null && roomCount >= roomLimit;

  useEffect(() => {
    api<{ classrooms: ClassroomListItem[] }>("/classrooms/my")
      .then((data) => setRoomCount(data.classrooms.length))
      .catch(() => setRoomCount(null));
  }, []);

  const [showPostcode, setShowPostcode] = useState(false);
  const postcodeRef = useRef<HTMLDivElement>(null);

  const handleAddressSearch = () => {
    if (!window.daum) {
      setGpsError("주소 검색을 로드할 수 없습니다");
      return;
    }
    setShowPostcode(true);
    setTimeout(() => {
      if (!postcodeRef.current) return;
      new window.daum.Postcode({
        oncomplete: async (data) => {
          const addr = data.roadAddress || data.jibunAddress || data.address;
          setShowPostcode(false);
          setAddressText(addr);
          setGpsLoading(true);
          setGpsError(null);
          const result = await geocodeAddress(addr);
          if (result) {
            setGpsConfig({ latitude: result.lat, longitude: result.lng, radiusMeters: Number.parseInt(radiusMeters, 10) || 100 });
          } else {
            setGpsError("좌표를 찾을 수 없습니다");
          }
          setGpsLoading(false);
        },
        width: "100%",
        height: "100%",
      }).embed(postcodeRef.current);
    }, 100);
  };

  const handleCurrentLocation = async () => {
    setGpsLoading(true);
    setGpsError(null);
    try {
      const pos = await getCurrentPosition();
      setGpsConfig({ latitude: pos.lat, longitude: pos.lng, radiusMeters: Number.parseInt(radiusMeters, 10) || 100 });
      setAddressText(`현재 위치 (${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)})`);
    } catch (e) {
      setGpsError(e instanceof Error ? e.message : "위치를 가져올 수 없습니다");
    } finally {
      setGpsLoading(false);
    }
  };

  const canProceedStep2 = () => {
    if (validationType === "NONE") return true;
    if (validationType === "GPS") return gpsConfig !== null;
    if (validationType === "WIFI") return wifiSsid.trim() !== "" && wifiBssid.trim() !== "";
    return false;
  };

  const handleCreate = async () => {
    const parsedRadiusMeters = Number.parseInt(radiusMeters, 10);
    if (validationType === "GPS" && (!Number.isInteger(parsedRadiusMeters) || parsedRadiusMeters < 10 || parsedRadiusMeters > 1000)) {
      setGpsError("허용 반경은 10~1000m로 입력해 주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (isTossApp()) {
        setWatchingAd(true);
        let result: boolean;
        try {
          result = await showTossRewardedAd(CREATE_ROOM_AD_GROUP_ID);
        } catch (adError) {
          setWatchingAd(false);
          reportAdLoadFailed(CREATE_ROOM_AD_GROUP_ID, adError instanceof Error ? adError.message : "unknown_error");
          showToast("광고 불러오기가 실패했어요. 다음에 시도해주세요");
          return;
        }
        setWatchingAd(false);
        if (!result) {
          setError("광고를 끝까지 시청하면 방을 만들 수 있어요.");
          return;
        }
      }

      const finalGpsConfig = validationType === "GPS" && gpsConfig
        ? { ...gpsConfig, radiusMeters: parsedRadiusMeters }
        : null;
      const finalWifiConfig: WifiConfig | null = validationType === "WIFI" && wifiSsid
        ? { ssid: wifiSsid, bssid: wifiBssid }
        : null;

      // 방 생성 + 옵션 저장을 한 요청으로 합쳐서, 옵션 저장 단계에서만 실패해
      // "옵션 없는 방이 혼자 만들어지는" 상황이 생기지 않게 한다.
      // 기본값(NONE, 시간 제한 없음, 주말 포함)은 서버의 생성 기본값과 같아서 생략 가능.
      const settings: ClassroomSettingsRequest | null =
        validationType !== "NONE" || startTime || endTime || !includeWeekends
          ? {
              validationType,
              gpsConfig: finalGpsConfig,
              wifiConfig: finalWifiConfig,
              checkInStartTime: startTime || null,
              checkInEndTime: endTime || null,
              includeWeekends,
            }
          : null;

      const classroom = await api<Classroom>("/classrooms", {
        method: "POST",
        body: JSON.stringify({ name, isPublic, settings }),
      });

      onCreated(classroom.classroomId);
    } catch (e) {
      if (e instanceof ApiError && e.code === "MAX_ROOMS_EXCEEDED") {
        showToast(`방은 최대 ${roomLimit}개까지 관리할 수 있어요.`);
        return;
      }
      setError(e instanceof Error ? e.message : "생성 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page animate-fade-in">
      <BackHeader title="방 만들기" onBack={onBack} />
      {error && <div style={{ padding: "0 16px", color: "var(--accent-red)", fontSize: 13 }}>{error}</div>}

      {step === 1 && (
        <div style={{ padding: "24px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Step 1. 기본 정보</div>
          <div style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 24 }}>방 이름을 입력하세요</div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 1학년 3반, 코딩 동아리" style={{ width: "100%", padding: 14, borderRadius: "var(--radius-input)", border: "1px solid var(--border-light)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 15, textAlign: "center" }} />
          <button onClick={() => {
            const err = validateRoomName(name);
            if (err) { setError(err); return; }
            setError(null);
            setStep(2);
          }} disabled={!name.trim()} style={{ width: "100%", padding: 16, borderRadius: "var(--radius-button)", background: name.trim() ? "var(--accent-blue)" : "#ccc", color: name.trim() ? "#fff" : "#888", fontSize: 16, fontWeight: 700, marginTop: 24 }}>다음</button>
        </div>
      )}

      {step === 2 && (
        <div style={{ padding: "24px 16px" }}>
          <div style={{ textAlign: "center", fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Step 2. 출석 검증 방식</div>
          <div style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: 13, marginBottom: 24 }}>어떻게 출석을 확인할까요?</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {VALIDATION_OPTIONS.map((opt) => (
              <div key={opt.type} onClick={() => { if (!opt.disabled) { setValidationType(opt.type); setGpsConfig(null); setGpsError(null); setAddressText(""); } }} style={{
                background: "var(--bg-card)", borderRadius: "var(--radius-card)", padding: 16, textAlign: "center",
                cursor: opt.disabled ? "not-allowed" : "pointer",
                opacity: opt.disabled ? 0.4 : 1,
                border: validationType === opt.type ? "2px solid var(--accent-blue)" : "1px solid var(--border-light)",
                boxShadow: "var(--shadow-card)",
              }}>
                <div style={{ fontWeight: 600 }}>{opt.label}</div>
                <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>{opt.desc}</div>
              </div>
            ))}
          </div>

          {validationType === "GPS" && (
            <div style={{ marginTop: 20, padding: 16, background: "var(--bg-card)", borderRadius: "var(--radius-card)", boxShadow: "var(--shadow-card)" }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>위치 설정</div>

              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <button onClick={handleAddressSearch} disabled={gpsLoading} style={{
                  flex: 1, padding: 10, borderRadius: 8, background: "var(--accent-blue)", color: "#fff", fontSize: 13, fontWeight: 600,
                  opacity: gpsLoading ? 0.5 : 1,
                }}>
                  주소 검색
                </button>
                <button onClick={handleCurrentLocation} disabled={gpsLoading} style={{
                  flex: 1, padding: 10, borderRadius: 8, background: "var(--accent-green)", color: "#fff", fontSize: 13, fontWeight: 600,
                  opacity: gpsLoading ? 0.5 : 1,
                }}>
                  {gpsLoading ? "확인 중..." : "현재 위치로 설정"}
                </button>
              </div>

              {showPostcode && (
                <div style={{ position: "relative", marginBottom: 8 }}>
                  <div ref={postcodeRef} style={{ height: 400, border: "1px solid var(--border-light)", borderRadius: 8, overflow: "hidden" }} />
                  <button onClick={() => setShowPostcode(false)} style={{
                    position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "50%",
                    background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 16, border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>X</button>
                </div>
              )}

              {gpsError && <div style={{ color: "var(--accent-red)", fontSize: 12, marginTop: 8 }}>{gpsError}</div>}

              {addressText && (
                <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 8, padding: "8px 0", borderTop: "1px solid var(--border-light)" }}>
                  {addressText}
                </div>
              )}

              {gpsConfig && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 12, color: "var(--accent-green)", marginBottom: 8 }}>
                    좌표: {gpsConfig.latitude.toFixed(6)}, {gpsConfig.longitude.toFixed(6)}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>허용 반경</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={radiusMeters}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                        setRadiusMeters(value);
                        const parsed = Number.parseInt(value, 10);
                        if (gpsConfig && Number.isInteger(parsed)) setGpsConfig({ ...gpsConfig, radiusMeters: parsed });
                      }}
                      onBlur={() => {
                        const parsed = Number.parseInt(radiusMeters, 10);
                        if (Number.isInteger(parsed)) setRadiusMeters(String(parsed));
                      }}
                      min={10}
                      max={1000}
                      style={{ width: 80, padding: 8, borderRadius: 6, border: "1px solid var(--border-light)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 14, textAlign: "center" }}
                    />
                    <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>m</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {validationType === "WIFI" && (
            <div style={{ marginTop: 20, padding: 16, background: "var(--bg-card)", borderRadius: "var(--radius-card)", boxShadow: "var(--shadow-card)" }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Wi-Fi 설정</div>
              <input
                value={wifiSsid}
                onChange={(e) => setWifiSsid(e.target.value)}
                placeholder="Wi-Fi 이름 (SSID)"
                style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid var(--border-light)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 14, marginBottom: 8 }}
              />
              <input
                value={wifiBssid}
                onChange={(e) => setWifiBssid(e.target.value)}
                placeholder="BSSID (예: AA:BB:CC:DD:EE:FF)"
                style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid var(--border-light)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 14 }}
              />
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
                BSSID는 공유기의 고유 주소입니다. 핸드폰 Wi-Fi 설정에서 확인할 수 있습니다.
              </div>
            </div>
          )}

          <button onClick={() => canProceedStep2() && setStep(3)} disabled={!canProceedStep2()} style={{
            width: "100%", padding: 16, borderRadius: "var(--radius-button)",
            background: canProceedStep2() ? "var(--accent-blue)" : "#ccc",
            color: canProceedStep2() ? "#fff" : "#888", fontSize: 16, fontWeight: 700, marginTop: 16,
          }}>다음</button>
        </div>
      )}

      {step === 3 && (() => {
        const timeInvalid = startTime && endTime && startTime >= endTime;
        return (
          <div style={{ padding: "24px 16px" }}>
            <div style={{ textAlign: "center", fontSize: 16, fontWeight: 600, marginBottom: 4 }}>상세 설정</div>
            <div style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: 13, marginBottom: 24 }}>설정하지 않으면 기본값으로 생성돼요</div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>방 공개 범위</div>
              <div style={{ display: "flex", gap: 8 }}>
                {([{ value: false, label: "암호방" }, { value: true, label: "공개방" }] as const).map((option) => <button key={option.label} onClick={() => setIsPublic(option.value)} style={{ flex: 1, padding: 12, borderRadius: "var(--radius-button)", fontSize: 14, fontWeight: 600, background: isPublic === option.value ? "var(--accent-blue)" : "var(--bg-card)", color: isPublic === option.value ? "#fff" : "var(--text-secondary)", border: isPublic === option.value ? "none" : "1px solid var(--border-color)" }}>{option.label}</button>)}
              </div>
              {/* 암호방도 방 찾기 목록에 이름이 보인다. 참여만 초대 코드로 막힌다. */}
              <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>
                둘 다 '방 찾기'에 보여요. 암호방은 초대 코드를 아는 사람만 들어올 수 있어요.
              </div>
            </div>

            {/* 주말 출석 */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>주말 출석</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setIncludeWeekends(false)} style={{
                  flex: 1, padding: 12, borderRadius: "var(--radius-button)", fontSize: 14, fontWeight: 600,
                  background: !includeWeekends ? "var(--accent-blue)" : "var(--bg-card)",
                  color: !includeWeekends ? "#fff" : "var(--text-secondary)",
                  border: !includeWeekends ? "none" : "1px solid var(--border-color)",
                }}>주말 제외</button>
                <button onClick={() => setIncludeWeekends(true)} style={{
                  flex: 1, padding: 12, borderRadius: "var(--radius-button)", fontSize: 14, fontWeight: 600,
                  background: includeWeekends ? "var(--accent-blue)" : "var(--bg-card)",
                  color: includeWeekends ? "#fff" : "var(--text-secondary)",
                  border: includeWeekends ? "none" : "1px solid var(--border-color)",
                }}>주말 포함</button>
              </div>
            </div>

            {/* 출석 시간 */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>출석 가능 시간</div>
              {!showTimeSelect ? (
                <button onClick={() => setShowTimeSelect(true)} style={{
                  width: "100%", padding: 14, borderRadius: "var(--radius-button)", fontSize: 14,
                  background: "var(--bg-card)", color: "var(--text-secondary)",
                  border: "1px solid var(--border-color)",
                }}>시간 설정하기</button>
              ) : (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", marginBottom: 8 }}>
                    <div>
                      <div style={{ color: "var(--text-secondary)", fontSize: 12, marginBottom: 4, textAlign: "center" }}>시작</div>
                      <TimeSelect value={startTime} onChange={setStartTime} />
                    </div>
                    <div style={{ fontSize: 20, color: "var(--text-secondary)", marginTop: 16 }}>~</div>
                    <div>
                      <div style={{ color: "var(--text-secondary)", fontSize: 12, marginBottom: 4, textAlign: "center" }}>종료</div>
                      <TimeSelect value={endTime} onChange={setEndTime} />
                    </div>
                  </div>
                  {timeInvalid && (
                    <div style={{ color: "var(--accent-red)", fontSize: 13, textAlign: "center" }}>종료 시간이 시작 시간보다 빠릅니다</div>
                  )}
                  <div style={{ textAlign: "center", marginTop: 8 }}>
                    <span onClick={() => { setShowTimeSelect(false); setStartTime(""); setEndTime(""); }} style={{ color: "var(--text-muted)", fontSize: 13, cursor: "pointer" }}>시간 설정 취소</span>
                  </div>
                </div>
              )}
              <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 6 }}>설정하지 않으면 24시간 출석 가능</div>
            </div>

            <button onClick={handleCreate} disabled={loading || !!timeInvalid || roomLimitReached} style={{ width: "100%", padding: 16, borderRadius: "var(--radius-button)", background: "var(--accent-blue)", color: "#fff", fontSize: 16, fontWeight: 700, opacity: loading || timeInvalid || roomLimitReached ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {watchingAd && (
                <span style={{
                  display: "inline-block", width: 16, height: 16, borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff",
                  animation: "spin 0.8s linear infinite",
                }} />
              )}
              {watchingAd ? "광고 불러오는 중" : loading ? "방 만드는 중..." : isTossApp() ? "광고 보고 방 만들기" : "방 만들기"}
            </button>
          </div>
        );
      })()}
      <Toast message={toastMessage} />
    </div>
  );
}
