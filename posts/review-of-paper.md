---
title: 관심분야 논문 리뷰하기 # 필수
category: papers # 필수 (아래 표 중 하나)
date: 2026-11-12 # 필수, YYYY-MM-DD
summary: DIRTYFREE # 선택 (없으면 본문 앞부분 사용)
cover: ../images/dirtyfreepaper.png # 선택, 목록 카드 썸네일
draft: false # 선택, true면 사이트에 올라가지 않음
---

- **NDSS 2026**

# DirtyFree : simplified Data Oriented Programming in the Linux Kernel

_논문을 읽기 전_

### **1. 이 논문이 다루는 문제**

기존 DOP에 비해 안정적으로 UAF 상태로 전환이 가능한 새로운 기법인 DIRTYFREE를 소개한다.
그리고 이에 대한 실용적인 완화기법 두가지를 제안하고있다.

### **2. 왜 이 문제가 중요한가?**

기존 DOP에 비해 새롭고 체계적이며 과정이 단순화된 DIRTYFREE기법을 제시한다.
이는 전통적인 제어흐름 탈취없이 임의 해제로 직접 권한을 상승하는 구조화된 악용 방법이 존재한다.
기존에는 임의 해제가 exploit을 보조하는 수단에 그쳤는데, 이 논문은 이를 단독 권한상승 수단으로 끌어올렸다.

### **3. 기존 방식들은 무엇이 부족했는가**

기존 ROP는 KCFI의 등장으로 DOP에 비해 실효성이 떨어진다. 이에 대해 DOP가 부상하기 시작하였으나 특정 조건을 만족하기 어렵고 각 프리미티브의 성립조건이 크게 달라 충족하기 어려웠다.
cross-cache 계열(DirtyCred 등)도 있었지만, SLUB의 page reuse에 의존하기 때문에 SLAB Virtual 완화책(가상주소-물리주소 분리)이 나오면서 무력화되었다.

_본문_

## **1. 배경**

KCFI의 등장으로 ROP의 실행가능성과 인기가 크게 감소하였다.
그에 비해 DOP는 KCFI의 영향을 받지않고 유효하다. DOP에 대응하기 위해 수많은 데이터 흐름 무결성 완화책이 연구되었지만 어느것도 리눅스 메인라인 커널에 통합되지 못했다.

기존 DOP 공격의 흐름은 three exploit primitives를 사용한다.

1. Heap Address Leakage
2. Recursive Arbitrary Address Read
3. Recursive Arbitrary Address Write

장점은 안정적이며 재사용이 가능하다. ROP에 비해 객체의 크기가 다르지 않는한 아키텍처가 달라도 일관되고 안정적이다.

하지만 앞서 말한 각 primitives는 각각 그에 맞는 특별한 커널 객체가 필요하다.
힙 유출, AAR, AAW는 적합한 객체마다 만족하는 제약이 다르다.
이러한 이상적 조건은 현실에서 매우 드물다.
그래서 이런 DOP exploit은 실제 커널 취약점에 이용하기 어렵다.

현재 Arbitrary free primitive는 공격자가 선택한 임의의 커널 객체를 강제로 해제할수있게 한다.
메모리 손상 취약점을 악용하여 특정 커널포인터를 손상, 그리고 손상된 포인터로 해제 연산을 호출한다.

이런 Arbitrary free는 성공적인 악용에 필요한 조건이 비교적으로 약하다.
기존 8byte를 덮어쓰는 AAR에 비해 Arbitrary free는 포인터의 일부만 손상시켜도 달성이 가능하다. 상황에 따라서 1byte의 OverFlow만으로도 충분하다는 이야기다.
이는 다양한 커널 힙 취약점에 이 primitive를 폭넓게 사용이 가능하다는 점을 시사한다.

그래서 본문에서는 Arbitrary free object의 체계적 식별, 구조화된 악용 방법론에 대해 다룬다.

## **2. 문제**

- 현재 Arbitrary free primitive는 아직 임의해제 객체를 체계적으로 찾는 방법이 없다.
- 임의해제로 권한 상승까지 가는 정해진 절차가 확립되지 않았다.

## **3. 핵심 아이디어**

권한관련 cred 객체를 겨냥.
손상된 cred객체를 안정적으로 활용하여 권한상승을 목표로 하는 전략.
제어흐름을 건들이지 않는다.

최대한 많은 cred 객체를 할당(선택적; heap spray를 방해하지않게)
적절한 system call을 찾아 spray를 합니다. (필자는 io_uring interface를 활용)

이후 spray한 io_uring instance를 통해 privilege cred object를 쓰기 권한으로 열어보는것.
이를 통해 루트권한을 가진 인스턴스를 찾아 dirtyfree:x:0:0 문자열을 써서 암호없이 루트권한을 가진 새 사용자를 추가하는것이다.

## 4. 방법론 또는 시스템 구성

**임의해제 객체 식별**

임의 해제 객체의 핵심 특성 > kfree()인자로 명시적으로 쓰이는 포인터를포함한다는것.
포인터 찾기위해 kfree()호출하는 모든 커널 명령어를 찾고 포인터 인자 추출

그에 따라 struct 유형의 원본요소 즉 상위개체에 도달된다.
이후 복원된 kmalloc()호출을 찾고 후보로 선택한다.
DIRTYFREE는 일반 캐시의 임의 해제 객체를 대상으로 하므로 분석을 kmalloc()할당으로 제한한다.

**임시 객체 필터링**

임시 객체는 할당되자마자 같은함수에서 금방 해제되는 객체이다.
함수 내에서 바로 해제되서 개입할 시간이 없게된다.
그래서 후보식별에서 제외.

[참조]

```c
void func() {
    obj = kmalloc(~); //할당
    ~
    kfree(obj) //해제
}
```

임시객체의 판단? -> CFG 도달 가능성

CFG(Control Flow Graph, 제어흐름 그래프)는 함수의 흐름을 그린 지도이다.
like 스크래치처럼!

여기서 도달가능성이란 A지점에서 B지점에 닿을수 있는가를 판단하는것.

본문에서는 할당(kmalloc)과 해제(kfree) 둘다있는 후보군을 탐색
CFG에서 할당 -> 해제지점으로 가는 경로 탐색
이런 경로가 있으면 임시객체로 분류!
예외사항또한 존재.
커널-사용자 데이터 전송함수(ex- copy_to_user) -> 악용가능성이 있기때문!

## 5. 실험 / 평가 / 결과

### 조건

리눅스 커널 v6.8 LLVM/Clang 12로 DIRTYFREE 프로토타입 구현
Arbitrary free 후보를 식별하기 위해 정적분석기법 사용.
포괄적 정적분석을 위해 wllvm을 사용하여 여러 컴파일 단위를 하나의 LLVM IR byte code file로 결합함.

실험 환경은 QEMU VM(2 CPU, 4GB RAM), Linux v6.8. 완화책으로 KASLR, SMEP, SMAP, KCFI, SLAB Virtual, KPTI가 전부 켜져있다. (즉 cross-cache 공격이랑 제어흐름 탈취가 다 막힌 하드닝 환경)

### 평가

**임의해제 객체를 몇개 찾았나 -> 14개**

- kmalloc-8(거의 안쓰임) 빼고 거의 모든 general cache를 커버
- static-size 객체(landlock_hierarchy, msg_queue, io_ring_ctx 등) + dynamic-size 객체(msg_msg, poll_list, simple_xattr 등)
- 정적분석이 처음 보고한 후보는 43개, 수동 검증으로 14개가 true positive
  - False Positive 원인: (1) 권한 필요한 함수로만 조작되는 객체, (2) error-handling 경로에만 나와서 안정적으로 도달 불가능한 객체
  - False Negative 원인: -O2 최적화로 심볼이 사라져서 이름 기반 식별이 실패함 -> -O0로 컴파일하면 완화 가능

주목할 두 객체:

- poll_list : 할당/해제가 같은 흐름(임시객체)이지만 중간에 copy_from_user가 있어서 userfaultfd/FUSE로 악용 가능
- callchain_cpus_entries : 크기가 CPU 코어 수에 종속 -> 대상 시스템 CPU 구성을 미리 알아야 안정적으로 사용 가능

### 결과

**실제 취약점 몇개 공격했나 -> 31개중 24개 성공**

데이터셋 : Google kCTF(2023~2024) 제출 취약점 31개 (전부 공개 exploit 존재)
24개에서 권한상승 성공. 그중 10개는 부분 덮어쓰기가 가능해서 정보유출 없이 단일 단계로 성공
실패 7개 : (1) arbitrary free 조건을 못맞출만큼 exploitability가 낮거나 (2) dedicated cache 내 UAF라 temporal cross-cache가 필요(위협모델상 금지)

**다른 DOP 기법이랑 비교**

전통적 DOP(Eloise, BridgeRouter) : 31개중 6개만 세 primitive를 전부 충족. 특정 cache에서만 객체를 찾는 한계도 있음
DirtyCred : 14개 공격 가능하나, double-free는 temporal cross-cache에 의존 -> SLAB Virtual 환경에서 전부 실패. DIRTYFREE는 kfree() 기반 cross-cache라 같은 환경에서도 유효함

**신뢰성** : 합성 arbitary free 객체로 측정 -> idle 95.6%, busy 87.4% 성공률

## 6. 한계점 및 아쉬운 점(review)

- **노이즈** : 레이아웃 조작 단계에서 다른 프로세스의 동시 할당이 간섭할 수 있음. user cred 해제 후 root cred 할당 전에 다른 프로세스가 cred를 선점하면 실패 가능. (CPU pinning 등으로 완화 가능하지만 논문 범위 밖)

- **다른 보안 객체** : cred에만 집중했는데, DirtyCred가 쓴 file 구조체 같은 다른 보안 객체에도 확장 가능하다고만 전망하고 끝냄

- **다른 OS** : macOS/FreeBSD도 적용 여지가 있다고 하지만 실제 구현은 안했음 (적절한 보안 객체 식별이 관건)

- **정적분석의 보수성** : 임시객체 필터가 over-approximation 하는 경우가 있어서 false negative 발생 가능. path-sensitive 분석을 더하면 객체 집합을 넓힐 수 있다고 함

- **방어의 한계** : 두 완화책 모두 "알려진 임의해제 객체"를 전제로 함 -> 새 객체가 발견되면 추가 갱신이 필요 (단, macOS zone_require 등 기존 OS 방어도 공유하는 일반적인 유지보수 특성이긴 함)

## 7. 내가 보기에 앞으로 이어서 해볼 만한 방향

### 느낀 점·배운 점

DIRTYFREE의 핵심은 제어 흐름을 건드리지 않고 데이터/객체만 바꿔치기한다는 점이다.
KCFI의 등장으로 ROP가 막힌 지금, 그 방어가 놓치는 맹점(데이터 계층)을 파고든 논문이라
현재 커널 보안의 방향성을 이해하는 데 도움이 되었다.
유저랜드 pwn 경험만 있던 내게 이 논문은 UAF·힙·SLUB·cross-cache 같은 개념을
기초부터 다시 잡게 했고, 커널 pwn이라는 분야에 처음으로 발을 들이는 계기가 되었다.

### 더 읽어볼 논문

본 논문의 선행 연구인 "Dirty cred"라는 논문에 대해 읽어보며 어떻게 이런 아이디어가 나오게 되었는제 알고싶다.

### 다른 분야 적용 가능성

다른 유저랜드, 브라우저 에서 또한 cross-cache같은 방식의 취약점이 있는지 찾고 비슷한 방법과 방어하는 방향에서의 관점을 조사하고 싶다

### 직접 재현·비교해보고 싶은 포인트

로컬 VM에서 직접 Arbitary free, Arbitrary object filtering부분에 대해 직접 구현하여 보고싶다. 구현하며 보아야할 부분과 보지말아야할 부분에 대한 감각을 키우고 레드팀의 관점, 블루팀의 관점에 대해 통찰을 해보고싶다.

### 연구/프로젝트로 발전시킨다면

DirtyFree는 arbitrary free를 cred 교체에 집중해 적용했다.
(그 이전 DirtyCred는 cred·struct file을 double-free + cross-cache로 교체했다)
arbitrary free는 원래 임의의 객체를 UAF로 만드는 범용 능력이다.
그래서 이 arbitrary free 전략을 cred 외의 다른 권한 구조체에도
적용할 수 있는지 필자는 분석해보고 싶다.

_서강렬_
