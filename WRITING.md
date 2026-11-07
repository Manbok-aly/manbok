# 글 작성 · 배포 가이드

글은 `posts/` 폴더의 Markdown 파일, 사진은 `images/` 폴더에 커밋합니다. `main` 브랜치에 push 하면 GitHub Actions가 정적 HTML을 만들어 GitHub Pages에 배포합니다(1~2분 소요). 사이트 주소는 `https://manbok-aly.github.io/manbok/`, 글 주소는 `https://manbok-aly.github.io/manbok/posts/<slug>/` 입니다.

```
posts/<slug>.md            글 (slug = 파일 이름 = 글 주소)
images/<slug>/01.png       그 글에 쓰는 사진
index.html, posts.css      디자인 템플릿 (빌드가 카테고리별 카드를 채움)
scripts/build.js           빌드 스크립트 → _site/ 생성
```

## 새 글 추가하기
1. `posts/<slug>.md` 파일을 만듭니다. slug는 **영문 소문자, 숫자, 하이픈(-)** 만 쓸 수 있습니다. 예: `posts/dreamhack-xss-01.md`
2. 사진이 있으면 `images/<slug>/` 폴더에 넣습니다.
3. commit → push 합니다. 저장소의 **Actions** 탭에서 진행 상황을 볼 수 있고, 실패하면 로그에 원인이 나옵니다.
   - GitHub 웹에서 쓸 때: `posts` 폴더에서 **Add file → Create new file**, 사진은 `images` 폴더에서 **Add file → Upload files** (새 폴더는 폴더째 끌어다 놓기).

## frontmatter 형식
파일 맨 위에 `---` 로 감싸서 적습니다. 예시: [posts/static-site-migration.md](posts/static-site-migration.md)

```yaml
---
title: Dreamhack XSS-1 풀이        # 필수
category: ctf                      # 필수 (아래 표 중 하나)
date: 2026-11-07                   # 필수, YYYY-MM-DD
summary: 목록 카드에 보일 한 줄 요약  # 선택 (없으면 본문 앞부분 사용)
cover: ../images/dreamhack-xss-01/cover.png   # 선택, 목록 카드 썸네일
draft: true                        # 선택, true면 사이트에 올라가지 않음
---
```

| category | 섹션 |
|---|---|
| `dev` | 개발 |
| `ctf` | CTF / Wargame |
| `bugbounty` | Bug Bounty |
| `blog` | 블로그 · 기술문서 |
| `papers` | 논문 · 컨퍼런스 |
| `awards` | 공모전 · 자격증 |

목록은 카테고리별로 날짜 최신순으로 정렬됩니다.

## 이미지 경로 작성법
본문과 `cover` 모두 **글 파일 기준 상대경로**로 적습니다. Obsidian 미리보기에서도 그대로 보이고, 빌드할 때 사이트 주소로 바뀝니다.

```markdown
![로그인 요청 캡처](../images/dreamhack-xss-01/01.png)
```

- 파일 이름의 대소문자까지 정확히 맞춰야 합니다(Windows에서는 보여도 GitHub Pages에서는 깨집니다).
- Obsidian을 쓴다면 **설정 → 파일 및 링크**에서 `[[위키링크]] 사용`을 끄고, 새 링크 형식을 `현재 파일 기준 상대 경로`로 바꿔 주세요. `![[사진.png]]` 형식은 사이트에 표시되지 않아 빌드가 실패합니다. Obsidian에 사진을 붙여넣으면 다른 폴더에 저장될 수 있으니 `images/<slug>/` 로 옮기고 경로를 맞춰 주세요.
- 본문 속 HTML 태그는 실행되지 않고 글자로 표시됩니다.

빌드는 다음 경우 **실패**하고 어떤 파일의 어떤 문제인지 출력합니다: title·category·date 누락, 없는 카테고리, 잘못된 날짜, 존재하지 않는 이미지(본문·cover), images/ 밖을 가리키는 경로, `![[...]]` 이미지, 규칙에 맞지 않는 파일 이름, YAML 문법 오류.

## 로컬에서 미리보기
Node.js 20.18 이상이 필요합니다.

```powershell
npm ci             # 처음 한 번
npm run preview    # 빌드 후 http://localhost:4000/ 에서 확인 (종료: Ctrl+C)
```

실제 배포와 같은 하위 경로(`/manbok/`)로 확인하려면 PowerShell에서:

```powershell
$env:BASE_PATH="/manbok"; npm run preview    # http://localhost:4000/manbok/
Remove-Item Env:BASE_PATH                     # 끝나면 되돌리기
```

빌드 결과는 `_site/` 에 생기며 커밋하지 않습니다(`.gitignore` 처리됨).

## 사진 용량 줄이기
저장소와 페이지가 무거워지지 않도록 올리기 전에 줄여 주세요.
- 가로 1600px 이하, 장당 **500KB 이하** 권장. 스크린샷은 PNG, 사진은 JPG/WebP가 작습니다.
- [Squoosh](https://squoosh.app) 같은 도구나 Windows 사진 앱의 **크기 조정**을 쓰면 됩니다.

## ⚠️ 공개 저장소 주의
이 저장소와 사이트는 누구나 볼 수 있습니다. 한 번 push 한 파일은 지워도 git 기록에 남으니 **올리기 전에** 확인하세요.
- 스크린샷의 **IP 주소, 토큰·API 키·쿠키/세션 값, 계정 ID·이메일, CTF 플래그**는 가리고(모자이크가 아니라 단색 박스로 덮기) 올립니다.
- 진행 중인 대회 문제나 패치되지 않은 버그바운티 취약점은 공개 가능해진 뒤에 올립니다.
- 휴대폰 사진은 위치정보(EXIF)가 들어 있을 수 있으니 제거하고 올립니다.
- `draft: true` 는 사이트에만 안 보일 뿐, 글과 사진 파일은 공개 저장소에 그대로 보입니다. 비공개로 둘 글은 커밋하지 마세요.

## 배포 설정 (처음 한 번)
- 저장소 **Settings → Pages → Build and deployment → Source** 를 **GitHub Actions** 로 바꿉니다.
- 그 뒤 `main` 에 push 하거나 **Actions → Deploy to GitHub Pages → Run workflow** 로 배포합니다. 설정 전에 실행되어 실패한 워크플로는 설정 후 **Re-run** 하면 됩니다.
