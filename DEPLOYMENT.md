# 배포 완료

- 학생용: [우리 반 독서 기록장](https://reading-journal-class-2026.workspace-998456.chatgpt.site/)
- 교사용: [초기 설정 및 로그인](https://reading-journal-class-2026.workspace-998456.chatgpt.site/teacher)
- 실행 소스: [webapp](webapp)
- 운영: Sites / Cloudflare Workers + 영구 D1 데이터베이스

관리자 최초 등록은 별도로 전달받은 초기 설정 키와 4자 이상 비밀번호로 진행합니다. 초기 설정 키와 비밀번호를 저장소에 올리지 마세요. 실제 학생 데이터를 GitHub에 올리지 마세요.

저장소 루트의 Flask 파일은 전달받은 원본이며 현재 온라인 실행 버전은 webapp 폴더의 앱입니다. GitHub Pages의 시작 페이지는 실제 앱 주소로 연결합니다.
