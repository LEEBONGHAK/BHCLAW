# [모두를 위한 Openclaw](https://nomadcoders.co/clawclone)

- URL : <https://nomdcoders.co/clawclone>
- 개요 : Cloudflare로 12가지 기능을 갖춘 나만의 claw 빌드하기

## cloudflare worker

초기 세팅

```bash
npx create-cloudflare@latest introduction-to-workers
```

- Hello example
- Worker only
- AGENTS.md -> yes
- git -> yes
- deploy -> no

**Worker**는 작성해서 Cloudflare 서버에 업로드하는 코드 즉, workder는 서버가 아님.
