import { useState } from "react";
import BackHeader from "../components/BackHeader";
import { api } from "../utils/api";
import type { Classroom, ValidationType, ClassroomSettingsRequest, GpsConfig, WifiConfig } from "../types";

interface CreateRoomScreenProps {
  onBack: () => void;
  onCreated: (classroomId: number) => void;
}

type Step = 1 | 2 | 3;

const VALIDATION_OPTIONS: { type: ValidationType; label: string; desc: string; disabled?: boolean }[] = [
  { type: "NONE", label: "검증 없음", desc: "누구나 어디서든 출석" },
  { type: "GPS", label: "GPS 위치 확인", desc: "지정 위치 반경 내에서만" },
  { type: "WIFI", label: "Wi-Fi 확인", desc: "지원 예정 (iOS 앱 전용)", disabled: true },
];

declare global {
  interface Window {
    daum: {
      Postcode: new (config: {
        oncomplete: (data: { address: string; roadAddress: string; jibunAddress: string }) => void;
      }) => { open: () => void };
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

function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("GPS를 사용할 수 없습니다"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error(`위치를 가져올 수 없습니다: ${err.message}`)),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

export default function CreateRoomScreen({ onBack, onCreated }: CreateRoomScreenProps) {
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [validationType, setValidationType] = useState<ValidationType>("NONE");

  // GPS 설정
  const [addressText, setAddressText] = useState("");
  const [gpsConfig, setGpsConfig] = useState<GpsConfig | null>(null);
  const [radiusMeters, setRadiusMeters] = useState(100);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Wi-Fi 설정
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiBssid, setWifiBssid] = useState("");

  // 출석 시간
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddressSearch = () => {
    if (!window.daum) {
      setGpsError("주소 검색을 로드할 수 없습니다");
      return;
    }
    new window.daum.Postcode({
      oncomplete: async (data) => {
        const addr = data.roadAddress || data.jibunAddress || data.address;
        setAddressText(addr);
        setGpsLoading(true);
        setGpsError(null);
        const result = await geocodeAddress(addr);
        if (result) {
          setGpsConfig({ latitude: result.lat, longitude: result.lng, radiusMeters });
        } else {
          setGpsError("좌표를 찾을 수 없습니다");
        }
        setGpsLoading(false);
      },
    }).open();
  };

  const handleCurrentLocation = async () => {
    setGpsLoading(true);
    setGpsError(null);
    try {
      const pos = await getCurrentPosition();
      setGpsConfig({ latitude: pos.lat, longitude: pos.lng, radiusMeters });
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
    setLoading(true);
    setError(null);
    try {
      const classroom = await api<Classroom>("/classrooms", {
        method: "POST",
        body: JSON.stringify({ name }),
      });

      const finalGpsConfig = validationType === "GPS" && gpsConfig
        ? { ...gpsConfig, radiusMeters }
        : null;
      const finalWifiConfig: WifiConfig | null = validationType === "WIFI" && wifiSsid
        ? { ssid: wifiSsid, bssid: wifiBssid }
        : null;

      if (validationType !== "NONE" || startTime) {
        const settings: ClassroomSettingsRequest = {
          validationType,
          gpsConfig: finalGpsConfig,
          wifiConfig: finalWifiConfig,
          checkInStartTime: startTime || null,
          checkInEndTime: endTime || null,
        };
        await api(`/classrooms/${classroom.classroomId}/settings`, {
          method: "PUT",
          body: JSON.stringify(settings),
        });
      }
      onCreated(classroom.classroomId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "생성 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page animate-fade-in">
      <BackHeader title="방 만들기" onBack={onBack} />
      <div style={{ display: "flex", justifyContent: "center", gap: 8, padding: 16 }}>
        {[1, 2, 3].map((s) => (
          <div key={s} style={{ width: s === step ? 24 : 8, height: 8, borderRadius: 4, background: s === step ? "var(--accent-blue)" : "var(--border-light)", transition: "width 0.2s" }} />
        ))}
      </div>
      {error && <div style={{ padding: "0 16px", color: "var(--accent-red)", fontSize: 13 }}>{error}</div>}

      {step === 1 && (
        <div style={{ padding: "24px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Step 1. 기본 정보</div>
          <div style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 24 }}>방 이름을 입력하세요</div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 1학년 3반, 코딩 동아리" style={{ width: "100%", padding: 14, borderRadius: 10, border: "1px solid var(--border-light)", background: "var(--bg-card)", color: "var(--text-primary)", fontSize: 15, textAlign: "center" }} />
          <button onClick={() => name.trim() && setStep(2)} disabled={!name.trim()} style={{ width: "100%", padding: 14, borderRadius: 10, background: name.trim() ? "var(--accent-blue)" : "var(--border-light)", color: "#fff", fontSize: 15, fontWeight: 600, marginTop: 24 }}>다음</button>
        </div>
      )}

      {step === 2 && (
        <div style={{ padding: "24px 16px" }}>
          <div style={{ textAlign: "center", fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Step 2. 출석 검증 방식</div>
          <div style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: 13, marginBottom: 24 }}>어떻게 출석을 확인할까요?</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {VALIDATION_OPTIONS.map((opt) => (
              <div key={opt.type} onClick={() => { if (!opt.disabled) { setValidationType(opt.type); setGpsConfig(null); setGpsError(null); setAddressText(""); } }} style={{
                background: "var(--bg-card)", borderRadius: 12, padding: 16, textAlign: "center",
                cursor: opt.disabled ? "not-allowed" : "pointer",
                opacity: opt.disabled ? 0.4 : 1,
                border: validationType === opt.type ? "2px solid var(--accent-blue)" : "1px solid var(--border-light)",
              }}>
                <div style={{ fontWeight: 600 }}>{opt.label}</div>
                <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>{opt.desc}</div>
              </div>
            ))}
          </div>

          {validationType === "GPS" && (
            <div style={{ marginTop: 20, padding: 16, background: "var(--bg-card)", borderRadius: 12 }}>
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
                      type="number"
                      value={radiusMeters}
                      onChange={(e) => setRadiusMeters(Number(e.target.value))}
                      min={10}
                      max={1000}
                      style={{ width: 80, padding: 8, borderRadius: 6, border: "1px solid var(--border-light)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14, textAlign: "center" }}
                    />
                    <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>m</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {validationType === "WIFI" && (
            <div style={{ marginTop: 20, padding: 16, background: "var(--bg-card)", borderRadius: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Wi-Fi 설정</div>
              <input
                value={wifiSsid}
                onChange={(e) => setWifiSsid(e.target.value)}
                placeholder="Wi-Fi 이름 (SSID)"
                style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid var(--border-light)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14, marginBottom: 8 }}
              />
              <input
                value={wifiBssid}
                onChange={(e) => setWifiBssid(e.target.value)}
                placeholder="BSSID (예: AA:BB:CC:DD:EE:FF)"
                style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid var(--border-light)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14 }}
              />
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
                BSSID는 공유기의 고유 주소입니다. 핸드폰 Wi-Fi 설정에서 확인할 수 있습니다.
              </div>
            </div>
          )}

          <button onClick={() => canProceedStep2() && setStep(3)} disabled={!canProceedStep2()} style={{
            width: "100%", padding: 14, borderRadius: 10,
            background: canProceedStep2() ? "var(--accent-blue)" : "var(--border-light)",
            color: "#fff", fontSize: 15, fontWeight: 600, marginTop: 16,
          }}>다음</button>
        </div>
      )}

      {step === 3 && (
        <div style={{ padding: "24px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Step 3. 출석 시간 (선택)</div>
          <div style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 24 }}>비워두면 24시간 출석 가능</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", marginBottom: 32 }}>
            <div>
              <div style={{ color: "var(--text-secondary)", fontSize: 12, marginBottom: 4 }}>시작</div>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={{ width: 100, padding: 10, textAlign: "center", fontSize: 16, borderRadius: 8, border: "1px solid var(--border-light)", background: "var(--bg-card)", color: "var(--text-primary)" }} />
            </div>
            <div style={{ fontSize: 20, color: "var(--text-secondary)", marginTop: 16 }}>~</div>
            <div>
              <div style={{ color: "var(--text-secondary)", fontSize: 12, marginBottom: 4 }}>종료</div>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={{ width: 100, padding: 10, textAlign: "center", fontSize: 16, borderRadius: 8, border: "1px solid var(--border-light)", background: "var(--bg-card)", color: "var(--text-primary)" }} />
            </div>
          </div>
          <button onClick={handleCreate} disabled={loading} style={{ width: "100%", padding: 14, borderRadius: 10, background: "var(--accent-green)", color: "#fff", fontSize: 15, fontWeight: 600, opacity: loading ? 0.6 : 1 }}>
            {loading ? "생성 중..." : "방 생성 완료!"}
          </button>
          <div onClick={handleCreate} style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 12, cursor: "pointer" }}>건너뛰기 (나중에 설정)</div>
        </div>
      )}
    </div>
  );
}
