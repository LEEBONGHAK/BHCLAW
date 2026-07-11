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
remote 옵션 : cloudflare/local 에뮬레이터 중 선택 (true/false)
