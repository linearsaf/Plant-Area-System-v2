// Creates an isolated, disposable test deployment. Never use its credentials in production.
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, writeFile, access, readFile } from 'node:fs/promises';
const directory = '.test-runtime';
if (existsSync(`${directory}/REAL-DATA-PRESENT.json`))
  throw Error('This preview contains real data. Prepare tests in a separate checkout and Docker project.');
await mkdir(directory, { recursive: true });
try {
  await access(`${directory}/stack.env`);
  console.log('Test environment already exists.');
} catch {
  const root = randomBytes(24).toString('hex'),
    auth = randomBytes(24).toString('hex'),
    bag = randomBytes(24).toString('hex');
  const shared = {
    PUBLIC_ORIGIN: 'https://localhost:8443',
    SERVICE_TOKEN: randomBytes(32).toString('hex'),
    AUTH_SECRET: randomBytes(32).toString('hex'),
    BOOTSTRAP_EMAIL: 'pilot@example.test',
    BOOTSTRAP_NAME: 'Pilot Admin',
    BOOTSTRAP_PASSWORD: randomBytes(18).toString('hex'),
    MYSQL_ROOT_PASSWORD: root,
    AUTH_DB_PASSWORD: auth,
    BAG_DB_PASSWORD: bag,
    HTTP_PORT: '8080',
    HTTPS_PORT: '8443',
    RELEASE_TAG: 'test',
  };
  const render = (values: Record<string, string>) =>
    Object.entries(values)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n') + '\n';
  await writeFile(`${directory}/stack.env`, render(shared));
  await writeFile(
    `${directory}/host.env`,
    render({
      ...shared,
      TEST_DATABASE: '1',
      AUTH_INTERNAL_URL: 'http://localhost:3001',
      AUTH_DATABASE_URL: `mysql://plant_auth:${auth}@127.0.0.1:13306/plant_auth`,
      BAG_DATABASE_URL: `mysql://plant_bag:${bag}@127.0.0.1:13306/plant_bag_filter`,
      AUTH_MIGRATION_DATABASE_URL: `mysql://root:${root}@127.0.0.1:13306/plant_auth`,
      BAG_MIGRATION_DATABASE_URL: `mysql://root:${root}@127.0.0.1:13306/plant_bag_filter`,
    }),
  );
  console.log('Created ignored test environment files; credentials were not printed.');
}
await writeFile(
  `${directory}/compose.yaml`,
  // The gateway recovery test occupies old application IPs with sentinel containers.
  // Docker requires an explicitly configured subnet for `docker run --ip`.
  'services:\n  mysql:\n    ports: ["127.0.0.1:13306:3306"]\n    networks: [private, test-host]\n' +
    // S3-compatible storage for the Drawing Database `s3` driver tests only. The minio/minio image is
    // no longer available on Docker Hub; SeaweedFS serves the S3 API. Credentials come from stack.env.
    [
      '  s3:',
      '    image: chrislusf/seaweedfs:3.85',
      '    entrypoint: [sh, -c]',
      '    command:',
      '      - >-',
      `        printf '{"identities":[{"name":"plant","credentials":[{"accessKey":"%s","secretKey":"%s"}],"actions":["Admin","Read","Write","List","Tagging"]}]}' "$$S3_KEY" "$$S3_SECRET" > /tmp/s3.json &&`,
      '        exec weed server -dir=/data -volume.max=0 -master.volumeSizeLimitMB=64 -s3 -s3.port=8333 -s3.config=/tmp/s3.json',
      '    environment:',
      '      S3_KEY: ${DRAWINGS_TEST_S3_ACCESS_KEY_ID:?Set DRAWINGS_TEST_S3_ACCESS_KEY_ID}',
      '      S3_SECRET: ${DRAWINGS_TEST_S3_SECRET_ACCESS_KEY:?Set DRAWINGS_TEST_S3_SECRET_ACCESS_KEY}',
      '    ports: ["127.0.0.1:19000:8333"]',
      '    networks: [private, test-host]',
      '',
    ].join('\n') +
    'networks:\n  private:\n    ipam:\n      config:\n        - subnet: ${PLANT_TEST_SUBNET:-172.30.250.0/24}\n  test-host: {}\n',
);
// Extend an existing isolated deployment without changing its users, volumes, or secrets.
const stackPath = `${directory}/stack.env`,
  hostPath = `${directory}/host.env`;
let stack = await readFile(stackPath, 'utf8'),
  host = await readFile(hostPath, 'utf8');
const secret = /^CONSUMABLES_DB_PASSWORD=(.+)$/m.exec(stack)?.[1] || randomBytes(24).toString('hex');
const drawingsSecret = /^DRAWINGS_DB_PASSWORD=(.+)$/m.exec(stack)?.[1] || randomBytes(24).toString('hex');
const s3Key =
  /^DRAWINGS_TEST_S3_ACCESS_KEY_ID=(.+)$/m.exec(stack)?.[1] || 'plant' + randomBytes(8).toString('hex');
const s3Secret =
  /^DRAWINGS_TEST_S3_SECRET_ACCESS_KEY=(.+)$/m.exec(stack)?.[1] || randomBytes(24).toString('hex');
const rootPassword = /^MYSQL_ROOT_PASSWORD=(.+)$/m.exec(stack)![1];
if (!/^CONSUMABLES_DB_PASSWORD=/m.test(stack)) stack += `CONSUMABLES_DB_PASSWORD=${secret}\n`;
if (!/^DRAWINGS_DB_PASSWORD=/m.test(stack)) stack += `DRAWINGS_DB_PASSWORD=${drawingsSecret}\n`;
if (!/^DRAWINGS_TEST_S3_ACCESS_KEY_ID=/m.test(stack)) stack += `DRAWINGS_TEST_S3_ACCESS_KEY_ID=${s3Key}\n`;
if (!/^DRAWINGS_TEST_S3_SECRET_ACCESS_KEY=/m.test(stack))
  stack += `DRAWINGS_TEST_S3_SECRET_ACCESS_KEY=${s3Secret}\n`;
await writeFile(stackPath, stack);
const extra: Record<string, string> = {
  CONSUMABLES_DB_PASSWORD: secret,
  CONSUMABLES_DATABASE_URL: `mysql://plant_consumables:${secret}@127.0.0.1:13306/plant_consumables`,
  CONSUMABLES_MIGRATION_DATABASE_URL: `mysql://root:${rootPassword}@127.0.0.1:13306/plant_consumables`,
  DRAWINGS_DB_PASSWORD: drawingsSecret,
  DRAWINGS_DATABASE_URL: `mysql://plant_drawings:${drawingsSecret}@127.0.0.1:13306/plant_drawings`,
  DRAWINGS_MIGRATION_DATABASE_URL: `mysql://root:${rootPassword}@127.0.0.1:13306/plant_drawings`,
  DRAWINGS_TEST_S3_ENDPOINT: 'http://127.0.0.1:19000',
  DRAWINGS_TEST_S3_ACCESS_KEY_ID: s3Key,
  DRAWINGS_TEST_S3_SECRET_ACCESS_KEY: s3Secret,
};
for (const [k, v] of Object.entries(extra)) if (!new RegExp(`^${k}=`, 'm').test(host)) host += `${k}=${v}\n`;
await writeFile(hostPath, host);
