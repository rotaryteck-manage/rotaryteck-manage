const SITE = 'https://rotaryteck-manage.rotaryteckserve.workers.dev';
const APP_ID = 'tw.com.rotaryteck.meetingtest';
const PATH = /^\/meeting\/([A-Za-z0-9_-]{1,80})$/;
const json = (body, status = 200) => Response.json(body, {
  status, headers: { 'Cache-Control': 'no-store' },
});
const text = (body, status) => new Response(body, {
  status, headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' },
});

export default {
  fetch(request, env) {
    if (!['GET', 'HEAD'].includes(request.method)) return text('Method not allowed', 405);
    const { pathname } = new URL(request.url);
    if (pathname === '/.well-known/apple-app-site-association') {
      if (!/^[A-Z0-9]{10}$/.test(env.APPLE_TEAM_ID || '')) return text('iOS association is not configured', 503);
      return json({ applinks: { details: [{ appIDs: [env.APPLE_TEAM_ID + '.' + APP_ID], components: [{ '/': '/meeting/*' }] }] } });
    }
    if (pathname === '/.well-known/assetlinks.json') {
      const fingerprint = env.ANDROID_CERT_SHA256?.toUpperCase();
      if (!/^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(fingerprint || '')) return text('Android association is not configured', 503);
      return json([{
        relation: ['delegate_permission/common.handle_all_urls'],
        target: { namespace: 'android_app', package_name: APP_ID, sha256_cert_fingerprints: [fingerprint] },
      }]);
    }
    const id = PATH.exec(pathname)?.[1];
    if (!id) return text('找不到這個週會測試連結', 404);
    const target = new URL('/', SITE);
    target.searchParams.set('notificationMeeting', id);
    target.hash = 'schedule';
    return new Response(null, { status: 302, headers: { Location: target.href, 'Cache-Control': 'no-store' } });
  },
};
