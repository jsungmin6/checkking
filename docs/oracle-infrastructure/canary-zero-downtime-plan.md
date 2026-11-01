# 출석왕 카나리 서버 무중단 전환 계획

작성: 2026-10-31 (KST)  
목표: 기존 출석왕 서버와 새 A1 카나리 사이에서 웹 요청을 한 번에 한 서버씩 옮기고, 중복 스케줄 발송과 동시 재시작을 막는다.  
상태: **단계 0 완료, 단계 2의 OS/설정 준비 완료(앱 미기동).** 2026-10-31 21:45–21:53 KST에 카나리에 Java 25·`/opt/checkking`·비밀 파일·systemd unit·logrotate·firewalld 규칙을 설치했다. `checkking.service`는 `disabled`이며 기동하지 않았고 LB에도 등록하지 않았다. 운영 서버는 재시작 없이 영향 없음을 확인했다.

## 진행 현황

| 단계 | 상태 |
|---|---|
| 0 — 기준 상태 확인 | ✅ 완료 (2026-10-31 21:44 KST) |
| 1 — 스케줄러 단일 실행 | ⏸️ **보류 — 사용자 판단으로 중복 실행 허용, 선행 조건에서 제외** |
| 2 — 카나리 설치·검증 | 🟡 OS/설정 준비 완료, **앱 기동·health 검증 남음** |
| 3 — LB 등록·전환 | ⛔ 미착수 |
| 4 — 순차 배포·scheduler 전환 | ⛔ 미착수 |
| 5 — 완료 판정 | ⛔ 미착수 |

완료된 카나리 준비 작업: Temurin 25.0.4.1+1 aarch64를 운영과 같은 `/opt/java25-aarch64`에 설치 · `/opt/checkking`(certs/mtls/wallet) 및 `/etc/checkking` 생성 · wallet·certs·mtls·`.env`·`/etc/checkking/*.env` 4개를 piped `tar`로 운영에서 전송(로컬 디스크 미경유, 28개 파일 SHA256 전부 일치) · `checkking.service`와 drop-in·logrotate 복제 · firewalld rich rule 6개(`10.0.0.0/24` → 8080, 8084–8088) 추가.

**남은 준비 항목:** `app.jar` 투입, scheduler feature gate, LB 등록, `deploy.yml`의 host 분리.

## 운영 모델

- HTTP: 두 서버를 모두 정상화한 뒤 LB 뒤에서 함께 사용한다. 배포 때는 항상 한 서버가 트래픽을 받을 수 있게 두고 다른 한 서버만 교체한다.
- 스케줄러: 처음에는 기존 운영 서버만 실행한다. 장기적으로 Oracle DB 분산 잠금을 적용해 각 예약 작업을 두 서버 중 한 곳에서만 실행한다.
- 서비스는 단일 `launcher` JAR와 JVM에 묶여 있다. 한 서버의 JAR 교체/재시작은 출석왕뿐 아니라 런처에 포함된 다른 앱에도 영향을 준다.
- 엄밀한 무중단은 LB 전환·기존 연결·외부 서비스까지 통제할 수 없으므로 보장한다고 단정하지 않는다. 계획의 기준은 동시 재시작을 피하고, 항상 정상 backend를 남기며, 문제가 나면 한 번의 LB 전환으로 복귀하는 것이다.

## 기록된 기준 상태

아래는 2026-10-30 확인 기록이며, 실제 작업 당일 OCI에서 다시 조회한다.

- 기존 A1은 운영 중. 새 `chesscode-canary-a1`은 Oracle Linux 9.8 AArch64만 설치되어 있었고 LB에도 등록되지 않았다. (10-31에 OS/설정 준비 완료, 앱은 여전히 미기동·LB 미등록.)
- ~~카나리 `opc`의 sudo 권한은 미확인이다.~~ → **해소: `sudo -n true` 성공, NOPASSWD 확인** (2026-10-31).
- 카나리와 운영 서버는 같은 VCN/subnet/security list를 사용한다. **실제 접근 제어는 security list가 아니라 firewalld가 한다**: 양쪽 모두 zone `public`에 `ssh`+`dhcpv6-client`만 열려 있고 `ports:`는 비어 있어, security list의 `0.0.0.0/0` 3000–9090 허용은 OS에서 막힌다. 앱 포트 도달성은 `10.0.0.0/24` rich rule에만 의존한다. 8083(oops)은 양쪽 모두 rich rule이 없고 공개 LB route도 없다 — 외부 `/api/oopsalarm/health` 401은 기본 8080 backend로 흘러간 결과이며 정상이다. security list 자체는 건드리지 않았다.
- A1 총량은 2 OCPU/12GB로 상향되어 운영+카나리가 사실상 할당량을 모두 쓴다. 부트 볼륨 총 사용량은 Always Free 한도에 근접하므로 추가 볼륨을 만들지 않는다.
- LB 실제 구성 (2026-10-31 21:53 KST 조회): backend set **6개**. `bs_lb_2026-0603-2157` 8080만 멤버가 2개(A1 primary + E2 `10.0.0.164` backup, 전체 `WARNING` — 죽은 E2 backup 때문)이고, `bs_cloveralarm_8084`·`bs_fishingalarm_8085`·`bs_pocketquest_8086`·`bs_comic_8087`·`bs_gabangkkeun_8088`은 **전부 `10.0.0.238` 단독 멤버이며 health `OK`**. 즉 attendance 외 5개 서비스는 현재 단일 장애점이다. path route set `reminder_path_routes`가 `/api/cloveralarm`·`/api/fishingalarm`·`/api/pocketquest`·`/api/comic`·`/api/gabangkkeun`를 각 set으로 보내고, **attendance는 route 없이 기본 8080 set**이 처리한다. 8083용 backend set은 없다. 8084/8085의 health-checker port는 `0`(backend 포트 사용)이다.
- `.github/workflows/deploy.yml`은 운영 서버 IP 한 개로 고정되어 있고 한 서버만 재시작한다. workflow는 일부 서비스 health만 확인한다.
- 출석 알림 변경은 `chesscode-server`의 `PushNotificationLog`, repository, `AttendanceReminderScheduler` 세 파일에 미커밋으로 남아 있으며 `:service-attendance:compileJava`는 통과했다. PocketQuest 관련 untracked 파일은 다른 작업이므로 절대 stage/수정/삭제하지 않는다.

## 두 서버에서 중복될 예약 작업

현재 두 서버에서 런처를 모두 실행하면 Spring 스케줄러도 각자 실행된다. **`origin/main` 기준 `@Scheduled`는 9개다** (2026-10-31 재확인).

| 모듈 | 예약 작업 | 주기 | 파일 |
|---|---|---|---|
| Attendance / CHECKKING | 출석 알림 | `0 */10 5-21 * * *` KST | `notification/scheduler/AttendanceReminderScheduler.java:77` |
| Attendance / CHECKKING | 새 미션 알림 | 07:00 | `notification/scheduler/NewMissionReminderScheduler.java:60` |
| Attendance / CHECKKING | 오래된 방 정리 | 04:00 | `classroom/scheduler/StaleClassroomCleanupScheduler.java:45` |
| Attendance / CHECKKING | 인사 정리 | 05:00 | `classroom/scheduler/GreetingCleanupScheduler.java:51` |
| Attendance / CHECKKING | API 지표 flush | fixedDelay 60초 | `monitoring/ApiUsageMonitorService.java:106` |
| Attendance / CHECKKING | 성능 요약 | 09:00 | `monitoring/ApiUsageMonitorService.java:129` |
| OopsAlarm / OOPSALARM | due 알림 | 09:00 | `notification/AlarmNotificationScheduler.java:28` |
| CloverAlarm / OOPSALARM | 만기 알림 poll | `${reminder.poll-ms:60000}` | `reminder/CloverReminderScheduler.java:23` |
| FishingAlarm / OOPSALARM | 만기 알림 poll | `${reminder.poll-ms:60000}` | `reminder/FishingReminderScheduler.java:23` |

`@EnableScheduling`은 4개 앱에 무조건 붙어 있고 ShedLock 의존성·코드는 전무하므로, 환경변수만으로 스케줄러를 끌 수는 없다. 다만 **2026-10-31 사용자 판단으로 9개 전부 중복 실행을 허용하기로 했다** — 해당 서비스들의 실사용량이 매우 낮아 중복 발송·중복 운영 알림의 실제 피해가 무시할 수준이라는 근거다. 따라서 **단계 1(분산 잠금)은 전환의 선행 조건에서 제외**하고, 향후 사용량이 늘면 재검토한다. 중복 시 성격은 다음과 같다: Clover·Fishing poller와 Oops 09:00은 조회→발송→기록 사이에 락이 없어 실사용자에게 **중복 메시지**가 갈 수 있고, 출석 알림은 `PushNotificationLog`로 하루 1회 제한이 있어 최대 2통, cleanup 2개는 멱등이라 데이터 피해 없이 **운영 텔레그램만 2통**, API 지표 flush는 호스트별 로컬 파일이라 충돌 없이 **지표가 두 파일로 분리**된다.

### 빌드 소스 주의 — 로컬 체크아웃을 믿지 말 것

로컬 `/Users/taemin/Desktop/project/출석체크서버`는 2026-10-31 확인 시 `origin/main`보다 **45커밋 뒤처져 있었고, `settings.gradle`에 `service-comic`과 `service-gabangkkeun`이 아예 없었다.** 운영 `app.jar`에는 두 모듈이 포함되어 8087/8088을 서비스한다. 이 낡은 워킹카피로 빌드한 JAR을 배포하면 **운영의 만화·가방끈 서비스가 사라진다.** 배포 JAR은 반드시 GitHub Actions의 `origin/main` 체크아웃 빌드이거나, 현재 운영 중인 `app.jar` 자체여야 한다. 스케줄러·엔드포인트 등 코드 사실을 확인할 때도 `git show origin/main:<path>`를 쓴다.

Attendance의 푸시 발송 기록이나 Oops/Clover/Fishing의 `sent`/`notified` 기록은 외부 메시지를 보낸 뒤 저장된다. 두 서버가 동시에 같은 due 항목을 읽으면 중복 발송할 수 있다. 인사/방 정리 작업도 둘 다 실행할 이유가 없다. 각 작업별 단일 실행을 보장해야 한다.

## 단계 0 — 변경 전 고정점과 실시간 상태 확인

1. 두 로컬 레포의 branch/status/diff를 기록한다. 출석 알림 관련 세 파일과 계획 문서만 이번 변경 후보로 식별하고, PocketQuest 등 기존 타 작업은 그대로 둔다. force push/reset/전체 stage를 하지 않는다.
2. OCI에서 인스턴스 상태·shape·VNIC, LB/listener, 모든 backend set/member/backup flag/weight, backend health, health-check path, path-route set, DNS/TLS를 다시 조회한다. 날짜가 지난 스냅샷은 현재값으로 취급하지 않는다.
3. 사용자가 보는 기존 기준선을 기록한다: 도메인의 attendance 및 각 서비스 health HTTP status/body, 기존 A1의 `checkking.service`, 8080/8083~8088 로컬 health, 5xx/응답시간, JVM CPU·RSS, Oracle 연결/CPU.
4. 카나리 SSH 뒤 `sudo -n true`, Java 25 설치 여부, 디스크 여유, firewalld, 각 포트 listen 상태를 확인한다. 실패하면 배포 자동화 전에 sudo/OS 준비부터 해결한다.
5. security list/NSG가 실제 어느 VNIC에 연결됐는지 확인한다. 공개 인바운드 규칙은 A1/E2/카나리 모두에 영향을 줄 수 있으므로 필요한 LB-subnet 및 관리자 SSH 경로를 표로 만든 뒤 별도 변경안을 세운다. 확인 없이 공통 규칙을 삭제하지 않는다.

**통과 기준:** 운영 baseline이 정상이고, 카나리 OS 접근·sudo·저장 공간이 확인되며, 변경 시 영향을 받을 LB backend와 네트워크 리소스가 모두 특정돼야 한다. 하나라도 불명확하면 LB를 건드리지 않는다.

## 단계 1 — 스케줄러 단일 실행 설계와 검증

권장 최종 방식은 Oracle JDBC 기반 DB 분산 잠금(ShedLock 또는 동등한 lease lock)이다. 같은 예약 작업 이름을 공유 DB의 잠금 테이블에서 경쟁시켜 lock 획득자만 실행하고, 나머지는 그 회차를 건너뛴다. JDBC provider의 DB 시간을 사용하고 `lockAtMostFor`는 해당 작업의 최악 실행시간보다 길게 둔다. ShedLock은 Oracle JDBC DB 시간을 지원하고, 동일 lock 이름 작업의 동시 실행을 막되 잠금을 못 잡은 회차는 건너뛴다: <https://github.com/lukas-krecan/ShedLock>.

1. Attendance는 CHECKKING datasource, Oops/Clover/Fishing은 런처 설정상 OOPSALARM datasource를 사용한다. 필요한 잠금 테이블은 두 스키마에 SQLcl로 명시적으로 만든다. 앱의 `ddl-auto`로 자동 생성하지 않는다.
2. 서로 다른 작업은 서로 다른 lock name을 쓰고, 두 JVM에서는 같은 작업에 반드시 같은 lock name을 쓴다. `@Scheduled`가 있는 9개 메서드를 전부 목록 대조해 누락을 막는다.
3. 두 서버의 예약 작업마다 인스턴스 이름, lock 획득/건너뜀, 시작/종료, 건수/결과를 로그로 남긴다. fixed-delay poller의 최대 100건 처리 시간이 lock 만료보다 길어지지 않는지 확인한다.
4. 카나리 준비 중에는 `scheduler.enabled=false` 역할을 넣어 예약 작업을 끈다. 현재 `@EnableScheduling`은 앱별 Spring 컨텍스트에서 무조건 켜져 있어 환경변수만 추가해도 꺼지지 않는다. 각 앱의 scheduling configuration을 조건부로 바꾸고, 런처가 서버별 설정을 전달해야 한다.
5. 잠금 적용 전후로 운영 A1은 한 번에 한 노드만 예약 실행하게 한다. 양쪽 서버를 동시에 scheduler-enabled로 열기 전에 no-side-effect lock probe로 한 곳만 획득하는지 확인한다. 실제 유저에게 푸시를 보내는 수동 scheduler 호출은 검증에 쓰지 않는다.
6. DB 잠금은 동시 실행을 막지만, 외부 메시지를 성공적으로 보내고 DB 기록 전에 프로세스가 죽는 crash window까지 exactly-once로 만들지는 않는다. 이 구간의 중복을 허용할지, outbox/claim 상태 또는 발송 API idempotency를 추가할지 결정한다.

**단기 안전장치:** 분산 잠금이 완성되기 전까지 기존 A1 scheduler만 켜고 카나리 scheduler는 계속 끈다. 이는 수동 failover가 필요하지만 이중 발송은 막는다.

## 단계 2 — 카나리 설치, LB 미등록 상태로 검증

1. 현재 workflow를 그대로 새 IP에 적용하지 않는다. workflow는 현재 운영 host에 고정되어 있고 `/opt/checkking/.env`, Wallet, 기본 systemd 구성이 이미 있는 단일 서버 배포를 전제로 한다. 카나리의 core DB/JWT/Toss 값과 Wallet은 GitHub Secrets/기존 보안 전달 방식으로 주입하고 출력하지 않는다.
2. Java 25, `/opt/checkking`, JAR 경로, systemd unit, 로그/rotate, Wallet, CHECKKING 및 OOPSALARM datasource, 각 서비스 환경변수, 인증서/mTLS, firewalld LB-subnet 규칙을 구성한다. 새 DB migration이 있으면 먼저 영향과 역호환성을 검토한다.
3. 카나리는 LB에 넣기 전 scheduler off로 기동한다. `localhost`에서 `/api/attendance/health`와 각 서비스의 실제 health를 점검한다. 목표 포트는 런처 기준 8080, 8083~8088이다. DB 연결은 스키마별로 검증하되 사용자 데이터 전체를 출력하지 않는다.
4. 새 JAR는 모든 서비스가 묶인 런처이므로, 출석 API뿐 아니라 8083~8088 전체를 확인한다. 현재 workflow의 일부 health-check 누락을 수정한다. `/api-docs` 하나의 200만으로 DB와 전체 앱 readiness를 판정하지 않는다.
5. 실제 사용자 푸시/텔레그램 메시지를 발생시키는 smoke test는 하지 않는다. 조회형 health와 DB read-only 확인을 우선하고, side-effect 검증은 별도 테스트 사용자/비발송 모드로 한다.

**통과 기준:** 카나리 단독에서 모든 서비스가 정상이고, scheduler off 확인, DB 풀/메모리 여유 확인. 불통과 시 카나리를 LB에 넣지 않는다.

## 단계 3 — LB에 카나리 추가 및 사용자 트래픽 전환

1. 실제 OCI 설정을 기준으로 route table을 만든다. 문서상 attendance는 8080 기본 backend, Clover/Fishing/PocketQuest/Comic/가방끈은 각각 8084~8088 path backend set이 있다. Oops 8083은 현재 public LB path가 없다는 기록이다. 운영 당일 실제 path-route set과 backend set을 조회해 전부 확인한다.
2. 카나리를 필요한 모든 backend set에 먼저 standby/backup으로 등록하고 health가 연속 정상인지 확인한다. OCI의 backend weight/backup 동작을 live에서 확인하지 않은 채 weight 값을 가정하지 않는다.
3. canary가 LB health에 healthy로 보이고 직접 health도 정상일 때만 traffic을 옮긴다. 지원되는 weight가 검증되면 작은 비율부터 올린다. weight 운용이 불가능하거나 확인되지 않으면 A1을 backup으로 보존하고 카나리를 primary로 승격하는 방식으로 전환한다. 각 변경 뒤 OCI backend health와 도메인 API를 모두 확인한다.
4. 경로 backend 하나씩 옮긴다. `/api/attendance`, Clover, Fishing, PocketQuest, Comic, 가방끈 각각에서 응답이 정상인지 확인하고, 라우트 하나에 문제가 생기면 해당 backend set만 즉시 이전 설정으로 되돌린다. Oops 공개 route는 별도 요청 없이는 새로 열지 않는다.
5. canary 트래픽을 올린 뒤 5xx, p95, 응답 body, DB 연결, CPU/RSS, 외부 푸시 실패율을 기존 baseline과 비교한다. 10분 이상 안정 구간을 확인하기 전 다음 단계로 가지 않는다.

**중단 기준:** backend unhealthy, 5xx 증가, 로그인/DB 오류, p95 급증, 메모리 압박, 중복 알림, DB connection pool 포화. Canary를 모든 관련 backend set에서 빼고 기존 A1 단독으로 복구한 뒤 원인을 조사한다.

## 단계 4 — 순차 배포와 scheduler 소유권 전환

1. 먼저 workflow를 빌드/test 한 번, 배포는 host별 순차 수행하도록 바꾼다. 현 workflow의 `SERVER_HOST` 고정값을 host matrix/명시적 입력으로 바꾸되 두 host를 parallel deploy하지 않는다. 기존 `concurrency.cancel-in-progress: false`는 유지한다.
2. 카나리에 새 JAR를 배포하고 전체 서비스 health가 통과할 때까지 이전 JAR를 보존한다. A1이 트래픽을 계속 받는다. 실패하면 카나리 JAR만 롤백한다.
3. 카나리가 정상일 때 A1에 같은 JAR를 배포한다. 카나리가 트래픽을 계속 받으므로 A1을 재시작해도 두 서버를 동시에 내리지 않는다. A1의 전체 health 통과 전까지 기존 JAR 백업을 삭제하지 않는다.
4. scheduler lock 코드를 양쪽에 배포한 다음 no-side-effect probe로 단일 lock 획득을 확인한다. 구버전 scheduler와 새 잠금 scheduler가 동시에 실행되는 배포 순서를 피한다. 처음엔 A1만 enabled, 카나리는 disabled로 유지한다. 두 서버가 모두 동일 lock 코드를 실행하는 것이 확인된 후에만 카나리를 enabled로 전환한다.
5. 실제 nightly window는 04시 오래된 방 정리, 05시 인사 정리, 07시 새 미션 알림, 09시 요약/Oops 알림과 겹치지 않게 잡는다. 만기 폴러와 출석 알림은 주기적으로 돌기 때문에 중복/누락 로그를 계속 관찰한다.

## 단계 5 — 완료 판정 및 롤백

- 두 backend의 LB health가 정상이며 서비스별 외부 경로가 모두 2xx.
- 한 예약 시각/회차마다 동일 lock 이름의 실행 완료가 서버 로그에서 한 번만 관찰됨. attendance의 발송 기록도 사용자별 날짜/회차 수와 맞고 최대 3회·1시간 간격을 넘지 않음.
- HTTP 5xx, p95, JVM CPU/RSS, Oracle 연결/CPU가 baseline 대비 지속 악화하지 않음.
- 새 버전이 안정화될 때까지 두 서버 각각 `app.jar.prev`를 보존하고 마지막으로 한 노드씩 롤백할 수 있음.
- 롤백은 먼저 LB에서 문제가 있는 노드를 빼거나 backup으로 돌리고, 나머지 healthy node를 확인한 뒤 해당 노드만 JAR/systemd를 되돌린다. 양쪽을 함께 restart하지 않는다. DB schema change가 있었다면 코드 롤백만으로 안전한지 별도 판단한다.
- 다음 정상 스케줄 구간(04/05/07/09시 및 poller)을 확인하기 전에는 “scheduler 전환 완료”로 닫지 않는다.

## 진행 당일 시작 순서

1. 이 문서와 `~/.codex/skills/oci-ops/references/current-environment.md`, 서버 README, `deploy.yml` 확인.
2. 로컬 diff/status와 OCI/LB 실시간 상태 기록, 외부 health baseline 저장.
3. sudo·보안 목록·Wallet/env·DB 연결 확인.
4. scheduler feature gate와 DB lock 설계/스키마를 먼저 확정하고, side-effect 없는 lock 검증.
5. 카나리 scheduler off 설치 및 모든 모듈 health 통과.
6. path-route/backend set 하나씩 카나리 등록·health 확인·전환.
7. A1을 포함해 한 호스트씩 순차 배포, 마지막에 scheduler ownership 전환 및 다음 예약 시각까지 관찰.

실제 OCI/LB 변경을 시작하기 전에는 위 사전 점검의 결과를 사용자에게 요약하고, baseline과 rollback 대상이 확인된 상태에서만 다음 단계로 간다.
