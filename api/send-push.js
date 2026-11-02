// Vercel Serverless Function: Web Push Notification Dispatcher
// Dispatches background push notifications to subscribed devices via Web Push protocol

const webpush = require('web-push');

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BAtx_VsX7sQqBLrErkVgQhJXjecTxKV0ohn_ICVeQsAjuskf2dAqTKA3982-WlTVeDiPMQ9ubQaBmfnlgW07660';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'i9f-hoomB134FdYKUoXvVCG8phABT6VnxWHTA7tsmOE';

try {
  webpush.setVapidDetails(
    'mailto:eng.nader.reda@gmail.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
} catch (vErr) {
  console.warn('VAPID initialization error:', vErr);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    subscription,
    target,
    targetRole,
    targetUserId,
    targetUserEmail,
    title,
    body,
    url,
    tag,
    ttl,
    expireAt,
    zoomUrl
  } = req.body || {};

  // حساب الصلاحية الزمنية للإشعار (TTL بالثواني)
  // افتراضياً 24 ساعة، ولتنبيهات زوم المؤقتة ساعة أو ساعتان
  let pushTTL = 86400;
  if (typeof ttl === 'number' && ttl > 0) {
    pushTTL = Math.min(Math.max(60, ttl), 86400 * 3);
  } else if (tag && tag.includes('zoom')) {
    pushTTL = 7200; // ساعتان كحد أقصى لتنبيهات زوم
  }

  const payload = JSON.stringify({
    title: title || 'منصة دراسة المشورة 🎓',
    body: body || '',
    url: url || '/',
    tag: tag || ('counsel_push_' + Date.now()),
    timestamp: Date.now(),
    expireAt: expireAt || 0,
    zoomUrl: zoomUrl || ''
  });

  const subscriptionsToSend = [];

  // 1. اشتراك مباشر تم تمريره في الطلب (مثل الإشعار التجريبي)
  if (subscription) {
    try {
      const parsed = typeof subscription === 'string' ? JSON.parse(subscription) : subscription;
      if (parsed && parsed.endpoint) {
        subscriptionsToSend.push(parsed);
      }
    } catch (eSub) {}
  }

  // 2. جلب اشتراكات المستخدمين المستهدفين من فايربيز مباشرة عبر REST API
  try {
    const firestoreUrl = 'https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/users?pageSize=300';
    const fsRes = await fetch(firestoreUrl);
    if (fsRes.ok) {
      const fsData = await fsRes.json();
      const docs = fsData.documents || [];

      for (const doc of docs) {
        const fields = doc.fields || {};
        const subStr = fields.pushSubscription && fields.pushSubscription.stringValue;
        if (!subStr) continue;

        let userSub = null;
        try {
          userSub = JSON.parse(subStr);
        } catch (e) {
          continue;
        }
        if (!userSub || !userSub.endpoint) continue;

        const docId = doc.name ? doc.name.split('/').pop() : '';
        const role = fields.role && fields.role.stringValue;
        const email = (fields.email && fields.email.stringValue ? fields.email.stringValue : '').toLowerCase().trim();
        const status = fields.status && fields.status.stringValue;

        // استبعاد الحسابات المرفوضة
        if (status === 'rejected') continue;

        const isAdmin = role === 'admin' || email.includes('nader.kamel') || email.includes('eng.nader');
        let shouldSend = false;

        const effectiveTarget = target || targetRole || 'all';

        if (effectiveTarget === 'all') {
          shouldSend = true;
        } else if (effectiveTarget === 'students') {
          if (!isAdmin) shouldSend = true;
        } else if (effectiveTarget === 'admin') {
          if (isAdmin) shouldSend = true;
        } else if (effectiveTarget === 'user') {
          if (targetUserId && targetUserId === docId) shouldSend = true;
          if (targetUserEmail && targetUserEmail.toLowerCase().trim() === email) shouldSend = true;
        }

        if (shouldSend) {
          subscriptionsToSend.push(userSub);
        }
      }
    }
  } catch (fsErr) {
    console.warn('Firestore users fetch error in send-push:', fsErr);
  }

  // إزالة التكرار من الاشتراكات حسب endpoint
  const uniqueSubs = Array.from(new Map(subscriptionsToSend.map(s => [s.endpoint, s])).values());

  const results = await Promise.allSettled(
    uniqueSubs.map(sub =>
      webpush.sendNotification(
        sub,
        Buffer.from(payload, 'utf8'),
        { TTL: pushTTL }
      )
    )
  );

  return res.status(200).json({
    success: true,
    sentCount: uniqueSubs.length,
    ttl: pushTTL,
    results: results.map(r => r.status)
  });
};
