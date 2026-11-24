---
title: "[CryptoHackCTF] writeup 2"
category: ctf
date: 2026-11-24
summary: Encoding ~ DataFormats
cover: ../../images/cryptohacklogo.png # 선택, 목록 카드 썸네일
draft: false # 선택, true면 사이트에 올라가지 않음
---

## XOR Properties

임의 키와 플래그를 xor 연산한 값을 제시하여줍니다.<br>
이를통해 마지막줄의 암호화를 해제하면 플래그가 제시됩니다.

```본문
KEY1 = a6c8b6733c9b22de7bc0253266a3867df55acde8635e19c73313 <br>
KEY2 ^ KEY1 = 37dcb292030faa90d07eec17e3b1c6d8daf94c35d4c9191a5e1e<br>
KEY2 ^ KEY3 = c1545756687e7573db23aa1c3452a098b71a7fbf0fddddde5fc1<br>
FLAG ^ KEY1 ^ KEY3 ^ KEY2 = 04ee9855208a2cd59091d04767ae47963170d1660df7f56f5faf
```

먼저 16진수 값을 byte로 decoe하여 K1의 값을 구한다.

이후 xor 특성에 근거하여 (동일값끼리 만나면 0이 된다)

**(FLAG ^ KEY1 ^ KEY3 ^ KEY2) ^ KEY1 ^ (KEY2 ^ KEY3)** 을 통해<br>
FLAG를 구할수 있다.

![그림5](../../images/crypto-writeup/xor_pro.png)

> crypto{x0r_i5_ass0c1at1v3}

## Favourite byte

XOR 연산을 이용해 1바이트 데이터를 숨겨놓았다는 문자열을 보여줍니다.

> 73626960647f6b206821204f21254f7d694f7624662065622127234f726927756d

해당 문자열을 먼저 16진수에서 디코딩화를 한다음 xor연산을 통해 flag을 찾아야합니다.

```python
x = bytes.fromhex("73626960647f6b206821204f21254f7d694f7624662065622127234f726927756d")

for key in range(256):

    result = []

    for b in x:
        result.append(b ^ key)

    result = bytes(result)

    if b"crypto" in result:
        print(result)
```

1바이트 데이터를 숨겨놓았으므로 임의의 키값을 디코딩한 값 x에 무차별 대입(y)을 해줍니다.

Flag형식이 crypto{""} 의 형태이므로

만약 생성된 문자열이 "crypto"를 포함할경우 출력하는 형태를 만들어줍니다.

> crypto{0x10_15_my_f4v0ur173_by7e}

## You either know, XOR you don't

해당 문제는 암호화된 문자열을 주고 이를 복호화하여야 합니다.

```
0e0b213f26041e480b26217f27342e175d0e070a3c5b103e2526217f27342e175d0e077e263451150104
```

힌트에서는 flag의 형식을 기억하라고 하였으므로 해당 암호문에 flag의 시작 부분인 `crypto{`를 XOR 연산하여 봅니다.

XOR 연산은 암호문과 평문을 알고 있다면 역으로 Key값을 구할 수 있다는 특징이 있습니다.

```python
x = bytes.fromhex("0e0b213f26041e480b26217f27342e175d0e070a3c5b103e2526217f27342e175d0e077e263451150104")

print(x)

c = bytes(a ^ b for a, b in zip(b"crypto{", x))

print(c)
```

해당 문자열을 대입하여 보니 다음과 같은 결과가 나옵니다.

```
b'myXORke'
```

해당 결과를 통해 Key값의 시작 부분이 `myXORke`라는 것을 알 수 있으며, 문자열의 형태로 보아 전체 Key값이 `myXORkey`일 것이라 추측할 수 있습니다.

이제 추측한 Key값을 암호문에 XOR 연산하여 복호화를 진행합니다.

```python
key = b"myXORkey"

result = []

for i in range(len(x)):
    result.append(x[i] ^ key[i % len(key)])

result = bytes(result)

print(result.decode())
```

암호문의 길이가 Key값의 길이보다 길기 때문에 나머지 연산자(%)를 사용하여 Key값이 반복적으로 사용되도록 하였습니다.

해당 코드를 실행하면 다음과 같은 flag를 얻을 수 있습니다.

> crypto{1f_y0u_Kn0w_En0uGH_y0u_Kn0w_1t_4ll}

## Lemur XOR

## Greatest Common Divisor

## Extended GCD

## Modular Arithmetic 1

## Modular Arithmetic 2

## Modular Inverting

## Privacy-Enhanced Mail?

## CERTainly not

## SSH Keys

## Transparency
