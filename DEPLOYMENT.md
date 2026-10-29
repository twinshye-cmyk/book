# 독후감 웹앱 배포 상태

보안을 보강한 실행 버전은 [webapp 폴더](webapp)입니다. [설치·관리자 설정 안내](webapp/README.md)를 참고하세요.

현재 GitHub 업로드와 로컬 검증은 완료했으며, 공개 호스팅은 작업 환경의 외부 서버 전송 권한 제한으로 아직 완료되지 않았습니다. GitHub Pages에서는 서버와 D1 데이터베이스가 실행되지 않습니다. 실제 학생 정보를 GitHub에 올리지 마세요.

저장소 루트의 Flask 파일은 전달받은 원본입니다. 현재 검증한 서버는 webapp 폴더의 Cloudflare Workers 버전입니다.
