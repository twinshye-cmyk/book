# 우리 반 독서 기록장

**[학생용 앱 열기](https://reading-journal-class-2026.workspace-998456.chatgpt.site/)** · **[교사용 초기 설정 / 로그인](https://reading-journal-class-2026.workspace-998456.chatgpt.site/teacher)**

학생은 학번·이름·책 제목·작가·200자 이상의 감상문을 제출합니다. 교사는 4자 이상의 비밀번호로 로그인해 제출물을 검색·확인·휴지통 관리하고 실제 XLSX/PDF 파일로 내려받습니다.

웹앱은 GitHub에 소스를 보관하고 Sites / Cloudflare Workers와 영구 D1 데이터베이스에서 실행됩니다. 교사 비밀번호 해시, 로그인 시도 제한, 보안 쿠키, CSRF 및 HTTPS 설정을 포함합니다. 실제 학생 자료로 테스트하지 않았습니다.

- [현재 앱 소스와 설치 안내](webapp/README.md)
- [배포 및 관리자 초기 설정 안내](DEPLOYMENT.md)

관리자 초기 설정 키는 개별 전달하며 저장소에 포함하지 않습니다. 루트의 Flask 코드와 Dockerfile은 처음 전달받은 원본으로 보관했습니다. 온라인 운영 소스는 webapp 폴더입니다.
