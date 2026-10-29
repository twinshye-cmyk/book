# 우리 반 독서 기록장

실제 서버에 배포 가능한 Flask 기반 독후감 제출 앱입니다.

## 주요 기능
- 학생: 학번/이름/책 제목/작가/200자 이상 감상문 입력 및 제출 (모바일 지원)
- 교사: 4자 이상 비밀번호 로그인, 검색, 열람, 삭제, 검색 결과 XLSX/PDF 다운로드
- SQLite 파일에 영구 저장 (단, **호스팅의 영구 디스크 연결이 필수**)
- 비밀번호 해시, CSRF 보호, HttpOnly 쿠키, HTTPS 전용 쿠키 기본 설정

## 배포 (Docker 지원 호스팅: Render, Railway, VPS 등)
1. 이 폴더를 GitHub의 **비공개 저장소**에 올립니다. `.env` 파일은 절대 올리지 마세요.
2. 터미널에서 아래 명령으로 비밀키와 관리자 비밀번호 해시를 생성합니다.
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(48))"
   python -c "from werkzeug.security import generate_password_hash; print(generate_password_hash('CHANGE_ME_TO_STRONG_PASSWORD'))"
   ```
3. 호스팅에서 Docker 웹 서비스로 배포하고 환경변수 `SECRET_KEY`, `ADMIN_PASSWORD_HASH`, `COOKIE_SECURE=1`, `DATA_DIR=/app/data`를 등록합니다. 비밀번호 자체가 아니라 생성된 **해시 문자열**을 넣습니다.
4. 호스팅의 **persistent volume / disk**를 `/app/data`에 연결합니다. 이 단계를 생략하면 서버 재시작/재배포 때 답안이 사라질 수 있습니다. 일부 무료 요금제는 영구 디스크를 지원하지 않습니다.
5. HTTPS 주소를 사용합니다. 학생 주소는 `/`, 교사 주소는 `/teacher/login`입니다.
6. 주기적으로 `/app/data/submissions.db`를 안전한 장소에 백업하세요. 학생 이름·학번이 포함된 개인정보이므로 접근 권한과 보관/삭제 기간을 정하세요.

## 로컬 테스트
```bash
python -m venv .venv
pip install -r requirements.txt
# .env.example 참고하여 환경변수 지정
# 로컬 HTTP에서만 COOKIE_SECURE=0 설정
python app.py
```
브라우저에서 `http://127.0.0.1:5000` 접속.

## 주의 사항
- 운영 배포 전에 HTTPS와 지속 저장 디스크를 반드시 설정하세요.
- 기본 앱은 단일 관리자 비밀번호를 사용합니다. 교사가 여럿이라면 사용자별 계정 및 권한 관리를 추가해야 합니다.
- 공개 서비스에서는 로그인 시도 제한, 서버 측 모니터링, 백업 및 개인정보 보존 정책을 별도로 설정하는 것이 좋습니다.
- 관리자 비밀번호 변경은 환경변수 `ADMIN_PASSWORD_HASH`를 새 해시로 교체하고 서비스를 재시작하면 됩니다.
- 다중 인스턴스/대규모 이용 시 SQLite 대신 관리형 PostgreSQL로 전환하세요.

참고: 4자리 비밀번호는 공개 서비스에서 취약합니다. 반드시 로그인 시도 제한을 추가하고 가능하면 더 긴 비밀번호를 사용하세요.
