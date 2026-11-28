'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  checkOtherTabsDownloading,
  createTabUpdateHandler,
  createMessageRouter,
} = require('../js/bg.js');
const { classifyInstagramRoute } = require('../js/route-classifier.js');

test('createMessageRouter dispatches daemon actions, download status probe, and active feed titles', async () => {
  const calls = [];
  const daemonClient = {
    async notifySyncStart(payload) {
      calls.push({ type: 'sync_start', payload });
      return { ok: true };
    },
    async dispatchDownload(payload) {
      calls.push({ type: 'download', payload });
      return { ok: true, data: { saved: true } };
    },
  };

  const feedFetcher = {
    handlers: {
      get_post_info: async (msg) => ({ items: [msg.postId] }),
      get_user_info: async (msg) => ({ userName: msg.userName }),
    },
  };

  const router = createMessageRouter({
    daemonClient,
    feedFetcher,
    checkDownloading: async () => true,
  });

  // 1. sync_start
  const syncRet = router({ action: 'sync_start', payload: { username: 'natgeo' } }, {}, () => {});
  assert.equal(syncRet, false);
  assert.deepEqual(calls[0], { type: 'sync_start', payload: { username: 'natgeo' } });

  // 2. download
  const dlResp = await new Promise((resolve) => {
    const keepOpen = router({ action: 'download', payload: { url: 'https://cdn/a.jpg' } }, {}, resolve);
    assert.equal(keepOpen, true);
  });
  assert.deepEqual(dlResp, { ok: true, data: { saved: true } });

  // 3. get_download_status
  const statusResp = await new Promise((resolve) => {
    const keepOpen = router({ title: 'get_download_status' }, { tab: { id: 1 } }, resolve);
    assert.equal(keepOpen, true);
  });
  assert.equal(statusResp, true);

  // 4. active feed fetcher title
  const postResp = await new Promise((resolve) => {
    const keepOpen = router({ title: 'get_post_info', postId: '999' }, {}, resolve);
    assert.equal(keepOpen, true);
  });
  assert.deepEqual(postResp, { items: ['999'] });

  // 5. removed dead routes are NOT handled
  assert.equal(router({ title: 'get_user_reels' }, {}, () => {}), undefined);
  assert.equal(router({ title: 'get_user_saved_posts_base_info' }, {}, () => {}), undefined);
  assert.equal(router({ title: 'get_download_status_scroll' }, {}, () => {}), undefined);
});

test('checkOtherTabsDownloading excludes sender tab and resolves true when another tab is downloading', async () => {
  const probedTabIds = [];
  const tabsApi = {
    query(_filter, cb) {
      cb([{ id: 10 }, { id: 20 }, { id: 30 }]);
    },
    sendMessage(tabId, _msg, cb) {
      probedTabIds.push(tabId);
      cb({ isDownload: tabId === 30 });
    },
  };

  const busy = await checkOtherTabsDownloading({ tab: { id: 10 } }, tabsApi);
  assert.equal(busy, true);
  assert.deepEqual(probedTabIds, [20, 30]);

  const idleTabsApi = {
    query(_filter, cb) {
      cb([{ id: 10 }]);
    },
    sendMessage() {
      throw new Error('should not probe sender tab');
    },
  };
  const idle = await checkOtherTabsDownloading({ tab: { id: 10 } }, idleTabsApi);
  assert.equal(idle, false);
});

test('createTabUpdateHandler dispatches reelFeedScroll for reels_feed and url for profile navigation', () => {
  const sent = [];
  const tabsApi = {
    sendMessage(tabId, msg, _cb) {
      sent.push({ tabId, msg });
    },
  };

  const onTabUpdated = createTabUpdateHandler({
    classifyRoute: classifyInstagramRoute,
    tabsApi,
  });

  onTabUpdated(
    5,
    { url: 'https://www.instagram.com/reels/D1ReelCode/' },
    { url: 'https://www.instagram.com/reels/D1ReelCode/' },
  );
  assert.deepEqual(sent[0], {
    tabId: 5,
    msg: {
      message: 'reelFeedScroll',
      url: 'https://www.instagram.com/reels/D1ReelCode/',
      shortcode: 'D1ReelCode',
    },
  });

  onTabUpdated(
    5,
    { url: 'https://www.instagram.com/natgeo/tagged/' },
    { url: 'https://www.instagram.com/natgeo/tagged/' },
  );
  assert.deepEqual(sent[1], {
    tabId: 5,
    msg: {
      message: 'url',
      pageName: 'natgeo',
      url: { url: 'https://www.instagram.com/natgeo/tagged/' },
    },
  });
});
