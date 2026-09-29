# nightshift-site

The one-page site for [Nightshift](https://github.com/wildorder/nightshift), at
[nightshift.wildorder.dev](https://nightshift.wildorder.dev).

The page is `site/`: plain HTML and CSS, no build step. `infra/` is a small CDK
app that serves it: a private S3 bucket behind CloudFront on the apex of the
`nightshift.wildorder.dev` zone, with its certificate in `us-east-1`. The zone
belongs to the Nightshift repository's DNS stack; this app names it by id and
writes only the apex records and the certificate's validation record.

```sh
npm ci
npm run verify                       # lint, the page and stack tests, synth
AWS_PROFILE=nightshift npm run deploy
```

Apache-2.0. See `LICENSE`.
