import assert from 'node:assert/strict';
import test from 'node:test';
import worker from './link-worker.mjs';

const root = 'https://rotaryteck-meeting-link-test.rotaryteckserve.workers.dev';
const env = { APPLE_TEAM_ID: 'AB12CD34EF', ANDROID_CERT_SHA256: Array(32).fill('AA').join(':') };
const get = (path, vars = env, init) => worker.fetch(new Request(root + path, init), vars);

test('serves both signed app associations directly and refuses missing signing data', async () => {
  const apple = get('/.well-known/apple-app-site-association');
  assert.equal(apple.status, 200);
  assert.deepEqual((await apple.json()).applinks.details, [{
    appIDs: ['AB12CD34EF.tw.com.rotaryteck.meetingtest'], components: [{ '/': '/meeting/*' }],
  }]);
  const android = get('/.well-known/assetlinks.json');
  assert.equal(android.status, 200);
  assert.deepEqual((await android.json())[0].target, {
    namespace: 'android_app', package_name: 'tw.com.rotaryteck.meetingtest',
    sha256_cert_fingerprints: [env.ANDROID_CERT_SHA256],
  });
  for (const path of ['/.well-known/apple-app-site-association', '/.well-known/assetlinks.json']) {
    assert.equal(get(path, {}).status, 503);
  }
});

test('browser fallback preserves only the meeting ID on the existing site', () => {
  const response = get('/meeting/aB_123-456?next=https://untrusted.test&notificationMeeting=wrong');
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('Location'),
    'https://rotaryteck-manage.rotaryteckserve.workers.dev/?notificationMeeting=aB_123-456#schedule');
  for (const path of ['/', '/meeting/', '/meeting/a%2Fb', '/meeting/a/b', '/meeting/' + 'a'.repeat(81)]) {
    assert.equal(get(path).status, 404);
  }
  assert.equal(get('/meeting/valid', env, { method: 'POST' }).status, 405);
});
