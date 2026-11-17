---
title: "할것정리" # 필수
category: blog # 필수 (아래 표 중 하나)
date: 2026-11-12 # 필수, YYYY-MM-DD
summary: DIRTYFREE # 선택 (없으면 본문 앞부분 사용)
cover: ../images/dirtyfreepaper.png # 선택, 목록 카드 썸네일
draft: true # 선택, true면 사이트에 올라가지 않음
---

## 수행과제 정리 - 11월내 5개 전부

1. 시간복잡도 줄이기

https://jungol.co.kr/problem/3135
https://jungol.co.kr/problem/1836
https://jungol.co.kr/problem/2306
https://jungol.co.kr/problem/1809
https://jungol.co.kr/problem/1214
https://jungol.co.kr/problem/4529
https://jungol.co.kr/problem/1257
https://jungol.co.kr/problem/3297

미션 목표
시간 복잡도의 정의와 점근 표기법을 수학적으로 이해하고, 코드의 연산 횟수를 세어 복잡도를 계산할 수 있다. 입력 크기 제한만 보고 허용 복잡도를 판단하고, 단순하게 풀면 O(N²) 이상이 되어 시간 제한을 넘는 정올 문제 8개를 더 낮은 복잡도로 개선한다. 문제마다 단순한 풀이와 개선한 풀이를 모두 제출해 결과를 비교하고, 어떤 알고리즘으로 왜 복잡도가 줄어드는지 설명할 수 있다.

수행 과정

1. 시간 복잡도 정의와 점근 표기법(빅오·빅오메가·빅세타) 학습;
2. 복잡도 계산 규칙과 대표 복잡도(O(1)~O(2^N)) 학습;
3. 재귀(마스터 정리)와 분할 상환 분석 학습;
4. 입력 제한으로 허용 복잡도 추정하기(1초 약 10^8번 연산);
5. 누적 합 → 정올 3135, 1836 풀기;
6. 정렬과 투 포인터 → 정올 2306 풀기;
7. 단조 스택 → 정올 1809, 1214 풀기;
8. 이분 탐색과 LIS → 정올 4529, 1257 풀기;
9. 펜윅 트리 → 정올 3297 풀기;
10. 문제마다 단순한 풀이와 개선한 풀이를 모두 제출해 결과 비교;
11. 사용한 알고리즘, 풀이 전후 복잡도, 줄어든 이유를 블로그 글로 정리;
12. 주의: 모든 풀이에 LLM(글 다듬는 용도 외) 사용 금지;

2) x에 올라오는 최신 보안이슈 정리하기 (x)

-적어도 28일 이상

3. OWSAP top 10 보안 동향분석
   블로그 기술문서

4. cryptoHack 문제 올클리어
   문제풀이과정 전부 writeup 정리

5. Space Alone 올클리어(시스템해킹)
   https://github.com/hspace-io/Space_Alone

- 산출물 ; writeup blog

6. 논문 트렌드 분석

보안 탑 컨퍼런스 논문 1편을 중심으로,
그 논문의 선행 논문 2편과 후속 논문 2편을 함께 읽고
해당 분야의 연구 흐름과 트렌드를 분석한다.

단순 요약이 아니라,
“이 문제가 왜 중요했는지, 기존 연구는 무엇이 부족했는지, 중심 논문은 무엇을 해결했고, 이후 연구는 어떻게 이어졌는지”를 본인의 언어로 정리하는 것이 목표이다.

수행 과정
보안 탑 컨퍼런스의 2024-2026년 논문 중 중심 문 1편을 고른다.
중심 논문과 연결되는 선행 논문 2편을 찾는다.
중심 논문의 문제 정의, 핵심 아이디어, 방법론, 평가 결과, 한계를 분석한다.
중심 논문 이후의 후속 또는 확장 논문 2편을 찾는다.
총 5편의 논문이 어떤 흐름으로 이어지는지 정리한다.
이 분야가 앞으로 어떤 방향으로 발전할지 본인 생각을 작성한다.

- IEEE S&P 2025 Accepted Papers: https://sp2025.ieee-security.org/accepted-papers.html
  IEEE S&P 2026 Accepted Papers: https://sp2026.ieee-security.org/accepted-papers.html
  USENIX Security 2025 Accepted Papers / Technical Sessions: https://www.usenix.org/conference/usenixsecurity25/technical-sessions
  USENIX Security 2026 공식 페이지: https://www.usenix.org/conference/usenixsecurity26
  USENIX Security 2026 Call for Papers: https://www.usenix.org/conference/usenixsecurity26/call-for-papers
  ACM CCS 2025 Accepted Papers: https://www.sigsac.org/ccs/CCS2025/accepted-papers/
  ACM CCS 2025 Proceedings: https://dl.acm.org/doi/proceedings/10.1145/3719027
  NDSS 2025 Accepted Papers: https://www.ndss-symposium.org/ndss2025/accepted-papers/
  NDSS 2026 Accepted Papers: https://www.ndss-symposium.org/ndss2026/accepted-papers/
