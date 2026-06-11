# uno

Run this Lakebed capsule:

```sh
npx lakebed dev
```

Public tunnel:

```sh
cp .env.example .env
./scripts/dev-public.sh
```

This starts `npx lakebed dev --port 3000` and then attaches your configured Cloudflare Tunnel to `http://127.0.0.1:3000`.
By default it also runs a tunnel cleanup first, which helps if an older `cloudflared` connector got stuck and caused intermittent `503` responses.

The starter app includes two client routes:

- `/`: the todo list.
- `/status`: a page that calls the `GET /api/status` endpoint.

You can also call the endpoint directly:

```sh
curl http://localhost:3000/api/status
```
