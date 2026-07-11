# [모두를 위한 Openclaw](https://nomadcoders.co/clawclone)

- URL : <https://nomdcoders.co/clawclone>
- 개요 : Cloudflare로 12가지 기능을 갖춘 나만의 claw 빌드하기

## CLOUDFARE WORKERS

초기 세팅

```bash
$ npx create-cloudflare@latest introduction-to-workers
```

- Hello example
- Worker only
- AGENTS.md -> yes
- git -> yes
- deploy -> no

### Introducton To Workers

**Worker**는 작성해서 Cloudflare 서버에 업로드하는 코드 즉, workder는 서버가 아님.
<br>
worker 특징

1. 호출 시 cloudeflare가 서버를 자동으로 호스팅하여 서비스되는 방식이며 서버에 대한 제어권을 가질 수 없음.
2. cloudflare가 서버를 관리하므로 확장이 쉽다.
3. worker 자체는 stateless 방식 (state를 유지하려면 db, key-value storage 등을 사용해야함.)
4. node.js 안에 있거나 node.js 환경에 있는 것이 아님. 즉, cloudflare workers거의 100% node.js api와 호환되지만, node.js는 아님. -> 공식 홈페이지에서 호환성 확인 가능
5. Cloudflare가 worker에 사용하는 런타임은 JavaScript web API를 사용함.

Wrangler => Cloudeflare와 상호작용할 수 잇는 커맨드 라인 유틸리티 툴 (배포 등)  
사용을 위해 Wrangler login이 필요

```bash
$ npx wrangler@latest login
$ npm run deploy # 배포를 위한 커맨드
```

### Bindings

`wrangler.jsonc`에 존재하는 binding 옵션에 대해 알아보자.  
bindings는 worker가 cloudflare developer platform에서 리소스와 상호작용할 수 있게 해줌.  
이를 통해 어떤 서버스를 사용 및 연결할 것인지 정의

<br>

데이터를 저장하고 불러올 수 있게 KV(key-value database) 사용할 것임.  
이를 통해 state를 줄 수 있음

```bash
# KV 설치
$ npx wrangler@latest kv namspace create [KV_이름]
```

`wrangler.jsonc`에 관련 설정 필수 추가 필요  
binding 옵션 : worker가 service에 접근할 때 사용할 변수 이름

- binding 된 변수를 사용하려면 `npm run cf-typegen` 명령어 실행 typescript 타입 생성

remote 옵션 : cloudflare/local 에뮬레이터 중 선택 (true/false)
`npx wrangler@latest tail` : 배포된 Cloudflare Workers의 실시간 로그 확인 명령어

---

## Durable Objects

### Introduction

**[stateless]**

```txt
User ----> Worker (init) ----> Response ----> Worker (killed)

이 경우, 같은 worker를 사용하지 않기 때문에 대화 불가 => 따라서, 같은 데이터 베이스 사용 필요

User Tokyo ----> Worker (init. Japan) ----> Message (KV DB)
User Jamaica ----> Worker (init. Jamaica) ----> get() messages
```

**[stateful]**

```txt
Server (unique. Germany) (connections)
|			|			|
jamaica		japan		argentina
```

durable objects를 사용하면 stateful하게 사용 가능하며, worker의 장점도 가진다!!

1. 서버에 실경 쓸 필요 없이 코드만 작성하면 cloudflare가 실행해 줌
2. 스케일 업/다운에 신경 쓸 필요가 없다!
3. 상태성(stateful)을 보장해준다 -> 채팅 등 실시간 기능 사용 가능

즉, stateful serverless 어플리케이션 생성 가능!

### Your First Durable Object

아래 명령어를 이용해 durable objects 생성

```bash
$ npx create-cloudflare@latest introduction-to-durable-objects
```

### Durable Object Lifecycle

Durable Objects 사용 시 `await`를 필수로 사용해야 한다.  
왜냐하면, 코드 상으로 같은 서버에 있는 것처럼 보여도 인스턴스는 어디에 생성될지(다른 곳에 생성되어 있을지) 모르기 때문에 비동기 처리 필요.  
<br>
다음과 같은 lifecycle을 따름. hibernated 상태 후 다시 active되면, 기존 상태가 초기화됨.

1. Active, in-memory
2. Idle(요청 대기 상태), in-memory non-hibernatable
3. Idle, in-memory hibernateable()
4. Hibernated(동면)
5. Inactive

### Durable Object Storage

인스터스 생성 관련 옵션 및 메서드

- `locationHint` 옵션 : instance 생성 시 최대한 그 지역에서 생성될 수 있도록 알려주는 것 (보장 X)
- `jurisdiction` 메서드 : 데이터가 어디에 저장될 지 관할권을 지정하는 방법 즉, 이 방법을 사용하면 인스턴스가 어디에 생성될지 보장함.

Durable Objects에는 SQLite DB가 내장되어 있음.  
내장된 SQLite DB는 Hibernated(동면) 과 상관없이 유지된

### Concurrency

Durable objects에 내장된 SQLite는 싱글 쓰레드로 작동해서 race condition이 발생하지 않음.  
내장되어 있어 인스턴스와 함께 실행되기 때문에 비통기 처리(`await`) 할 필요 없음.  
<br>
만약, 비동기 처리가 필요할 경우, 아래 구문 사용 필요

```typescript
this.ctx.blockConcurrencyWhile(async () => {
  await fetch(".....");
});
```

### Data Explorer

Durable Objects의 스토리지가 각 인스턴스마다 따로 있고, 각 durable object들끼리는 서로 격리되어 있음

### Alarms

alarm() 함수 내 내용을 지정한 시간에 발생 시키는 기능  
alarm table에 적재되어 지정된 시간 이후에 함수가 실행됨.  
`retryCount`, `isRetry` 가 optional paramaeter로 제공되어 사용할 수 있음.

1. one alarm at a time
2. alarm()

### WebSockets

WebSocket -> open ........ close
Upgrade header : 웹 소켓 연결을 위해 사용하는 http 헤더
<br>
또한, 웹 소켓을 사용하기 위해 durable objects가 필요하기 때문에 아래 함수 사용 필요

```typescript
fetch(request: Request): Response | Promise<Response> {

}
```

Worker in doorman ---> Worker forwards the request to Durable Objects ---> Replies
