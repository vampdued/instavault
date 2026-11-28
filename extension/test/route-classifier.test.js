'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  classifyInstagramRoute,
  shortcodeToPk,
  getRouteCapabilities,
  RESERVED_TOP_LEVEL_SEGMENTS,
} = require('../js/route-classifier.js');

test('classifies root home and past_posts timeline routes', () => {
  const home = classifyInstagramRoute('https://www.instagram.com/');
  assert.equal(home.type, 'home');
  assert.equal(home.username, null);
  assert.equal(home.isReserved, false);

  const timeline = classifyInstagramRoute('https://www.instagram.com/?variant=past_posts');
  assert.equal(timeline.type, 'timeline');
  assert.equal(timeline.isReserved, false);
});

test('classifies profile and profile sub-routes', () => {
  const profile = classifyInstagramRoute('/natgeo/');
  assert.equal(profile.type, 'profile');
  assert.equal(profile.username, 'natgeo');
  assert.equal(profile.isReserved, false);

  const profileReels = classifyInstagramRoute('https://www.instagram.com/natgeo/reels/');
  assert.equal(profileReels.type, 'profile_reels');
  assert.equal(profileReels.username, 'natgeo');
  assert.equal(profileReels.isReserved, false);

  const tagged = classifyInstagramRoute('/natgeo/tagged/');
  assert.equal(tagged.type, 'profile_tagged');
  assert.equal(tagged.username, 'natgeo');

  const saved = classifyInstagramRoute('/natgeo/saved/');
  assert.equal(saved.type, 'profile_saved');
  assert.equal(saved.username, 'natgeo');

  const savedAll = classifyInstagramRoute('/natgeo/saved/all-posts/');
  assert.equal(savedAll.type, 'profile_saved_all');
  assert.equal(savedAll.username, 'natgeo');

  const savedCol = classifyInstagramRoute('/natgeo/saved/travel/17912345678901234/');
  assert.equal(savedCol.type, 'profile_saved_collection');
  assert.equal(savedCol.username, 'natgeo');
  assert.equal(savedCol.collectionId, '17912345678901234');

  const guide = classifyInstagramRoute('/natgeo/guide/best-photos/12345/');
  assert.equal(guide.type, 'guide');
  assert.equal(guide.username, 'natgeo');
});

test('classifies post /p/, /<user>/p/, and /tv/ routes', () => {
  const post = classifyInstagramRoute('https://www.instagram.com/p/C9abcDEF123/?img_index=2#top');
  assert.equal(post.type, 'post');
  assert.equal(post.shortcode, 'C9abcDEF123');
  assert.equal(post.username, null);
  assert.equal(post.isReserved, true);

  const userPost = classifyInstagramRoute('/nasa/p/CxYz987654/');
  assert.equal(userPost.type, 'post');
  assert.equal(userPost.username, 'nasa');
  assert.equal(userPost.shortcode, 'CxYz987654');
  assert.equal(userPost.isReserved, false);

  const tvPost = classifyInstagramRoute('/tv/CTvCode123/');
  assert.equal(tvPost.type, 'post');
  assert.equal(tvPost.shortcode, 'CTvCode123');
});

test('classifies reel /reel/, /<user>/reel/, /reels/, and /reels/audio/ routes', () => {
  const reel = classifyInstagramRoute('/reel/D1ReelCode99/?igsh=abc#frag');
  assert.equal(reel.type, 'reel');
  assert.equal(reel.shortcode, 'D1ReelCode99');
  assert.equal(reel.username, null);
  assert.equal(reel.isReserved, true);

  const userReel = classifyInstagramRoute('https://www.instagram.com/mkbhd/reel/D2UserReel/');
  assert.equal(userReel.type, 'reel');
  assert.equal(userReel.username, 'mkbhd');
  assert.equal(userReel.shortcode, 'D2UserReel');
  assert.equal(userReel.isReserved, false);

  const reelsFeed = classifyInstagramRoute('/reels/D3FeedReel/');
  assert.equal(reelsFeed.type, 'reels_feed');
  assert.equal(reelsFeed.shortcode, 'D3FeedReel');
  assert.equal(reelsFeed.isReserved, true);

  const reelsRoot = classifyInstagramRoute('/reels/');
  assert.equal(reelsRoot.type, 'reels_feed');
  assert.equal(reelsRoot.shortcode, null);

  const reelsAudio = classifyInstagramRoute('/reels/audio/123456789012345/');
  assert.equal(reelsAudio.type, 'reels_audio');
  assert.equal(reelsAudio.audioId, '123456789012345');
  assert.equal(reelsAudio.isReserved, true);
});

test('classifies story /stories/<user>/<id> and highlight /stories/highlights/<id> routes', () => {
  const storyWithId = classifyInstagramRoute('/stories/alice.dev/3456789012345678901/');
  assert.equal(storyWithId.type, 'story');
  assert.equal(storyWithId.username, 'alice.dev');
  assert.equal(storyWithId.mediaId, '3456789012345678901');
  assert.equal(storyWithId.highlightId, null);
  assert.equal(storyWithId.isReserved, true);

  const storyNoId = classifyInstagramRoute('/stories/alice.dev/');
  assert.equal(storyNoId.type, 'story');
  assert.equal(storyNoId.username, 'alice.dev');
  assert.equal(storyNoId.mediaId, null);

  const highlight = classifyInstagramRoute('https://www.instagram.com/stories/highlights/17999888777666555/?hl=en');
  assert.equal(highlight.type, 'highlight');
  assert.equal(highlight.highlightId, '17999888777666555');
  assert.equal(highlight.username, null);
  assert.equal(highlight.mediaId, null);
  assert.equal(highlight.isReserved, true);

  const highlightWithMedia = classifyInstagramRoute('/stories/highlights/17999888777666555/3456789012345678901/');
  assert.equal(highlightWithMedia.type, 'highlight');
  assert.equal(highlightWithMedia.highlightId, '17999888777666555');
  assert.equal(highlightWithMedia.mediaId, '3456789012345678901');
});

test('classifies explore and reserved paths without mistaking them for usernames', () => {
  const explore = classifyInstagramRoute('/explore/');
  assert.equal(explore.type, 'explore');
  assert.equal(explore.username, null);
  assert.equal(explore.isReserved, true);

  const loc = classifyInstagramRoute('/explore/locations/213385402/london-uk/');
  assert.equal(loc.type, 'explore_location');
  assert.equal(loc.locationId, '213385402');

  const tag = classifyInstagramRoute('/explore/tags/photography/');
  assert.equal(tag.type, 'explore_tag');

  const direct = classifyInstagramRoute('/direct/inbox/?thread=123#bottom');
  assert.equal(direct.type, 'reserved');
  assert.equal(direct.username, null);
  assert.equal(direct.isReserved, true);

  const accounts = classifyInstagramRoute('/accounts/edit/');
  assert.equal(accounts.type, 'reserved');
  assert.equal(accounts.username, null);
  assert.equal(accounts.isReserved, true);

  assert.ok(RESERVED_TOP_LEVEL_SEGMENTS.includes('direct'));
  assert.ok(RESERVED_TOP_LEVEL_SEGMENTS.includes('accounts'));
});

test('handles query strings, hashes, repeated slashes, and empty inputs cleanly', () => {
  const messy = classifyInstagramRoute('//p//AbCdEf123//?utm_source=ig_web#section');
  assert.equal(messy.type, 'post');
  assert.equal(messy.shortcode, 'AbCdEf123');
  assert.equal(messy.pathname, '/p/AbCdEf123/');

  const empty = classifyInstagramRoute('');
  assert.equal(empty.type, 'home');

  const nullish = classifyInstagramRoute(null);
  assert.equal(nullish.type, 'home');
});

test('shortcodeToPk decodes standard, extended (>28 char), and invalid shortcodes', () => {
  assert.equal(shortcodeToPk('A'), '0');
  assert.equal(shortcodeToPk('B'), '1');
  assert.equal(shortcodeToPk('BA'), '64');
  assert.equal(shortcodeToPk('_'), '63');
  assert.equal(shortcodeToPk('-'), '62');
  // Real 11-char Instagram shortcode -> 64-bit numeric media PK
  assert.equal(shortcodeToPk('B_123456789'), '2302988119653990205');
  // Extended (>28 char) private/IGTV shortcode trims trailing 28 chars before decoding
  assert.equal(
    shortcodeToPk('B_123456789' + 'A'.repeat(28)),
    '2302988119653990205',
  );
  // Invalid or empty inputs
  assert.equal(shortcodeToPk(''), null);
  assert.equal(shortcodeToPk(null), null);
  assert.equal(shortcodeToPk(undefined), null);
  assert.equal(shortcodeToPk('bad!char'), null);
});

test('getRouteCapabilities maps user, saved, reels_audio, explore, story, and detail routes', () => {
  const profile = getRouteCapabilities('/natgeo/');
  assert.equal(profile.type, 'profile');
  assert.equal(profile.isUserRoute, true);
  assert.equal(profile.isUserProfile, true);
  assert.equal(profile.isSaved, false);
  assert.equal(profile.canFilterByDate, true);
  assert.equal(profile.canFilterByAmount, true);
  assert.equal(profile.canMarkItems, true);

  const userReels = getRouteCapabilities('/natgeo/reels/');
  assert.equal(userReels.isUserRoute, true);
  assert.equal(userReels.isUserReels, true);
  assert.equal(userReels.canFilterByDate, true);
  assert.equal(userReels.canFilterByAmount, true);

  const userTagged = getRouteCapabilities('/natgeo/tagged/');
  assert.equal(userTagged.isUserRoute, true);
  assert.equal(userTagged.isUserTagged, true);
  assert.equal(userTagged.canFilterByDate, true);

  const savedPreview = getRouteCapabilities('/natgeo/saved/');
  assert.equal(savedPreview.isUserRoute, true);
  assert.equal(savedPreview.isSaved, true);
  assert.equal(savedPreview.isSavedPreview, true);
  assert.equal(savedPreview.canFilterByDate, false);
  assert.equal(savedPreview.canFilterByAmount, false);
  assert.equal(savedPreview.canMarkItems, true);

  const savedAll = getRouteCapabilities('/natgeo/saved/all-posts/');
  assert.equal(savedAll.isUserRoute, true);
  assert.equal(savedAll.isSaved, true);
  assert.equal(savedAll.isSavedAll, true);
  assert.equal(savedAll.canFilterByDate, false);
  assert.equal(savedAll.canFilterByAmount, true);

  const savedCol = getRouteCapabilities('/natgeo/saved/travel/17912345678901234/');
  assert.equal(savedCol.isUserRoute, true);
  assert.equal(savedCol.isSaved, true);
  assert.equal(savedCol.isSavedCollection, true);
  assert.equal(savedCol.canFilterByDate, false);
  assert.equal(savedCol.canFilterByAmount, true);

  const reelsAudio = getRouteCapabilities(
    classifyInstagramRoute('https://www.instagram.com/reels/audio/987654321012345/'),
  );
  assert.equal(reelsAudio.type, 'reels_audio');
  assert.equal(reelsAudio.isReelsAudio, true);
  assert.equal(reelsAudio.isReelsFeed, false);
  assert.equal(reelsAudio.isUserRoute, false);
  assert.equal(reelsAudio.canFilterByDate, false);
  assert.equal(reelsAudio.canFilterByAmount, true);
  assert.equal(reelsAudio.canMarkItems, true);

  const reelsFeed = getRouteCapabilities('/reels/D3FeedReel/');
  assert.equal(reelsFeed.isReelsFeed, true);
  assert.equal(reelsFeed.isReelsAudio, false);
  assert.equal(reelsFeed.canFilterByDate, false);
  assert.equal(reelsFeed.canFilterByAmount, false);

  const story = getRouteCapabilities('/stories/alice.dev/3456789012345678901/');
  assert.equal(story.isStory, true);
  assert.equal(story.isStoryOrHighlight, true);
  assert.equal(story.canMarkItems, false);

  const highlight = getRouteCapabilities('/stories/highlights/17999888777666555/');
  assert.equal(highlight.isHighlight, true);
  assert.equal(highlight.isStoryOrHighlight, true);
  assert.equal(highlight.canMarkItems, false);

  const loc = getRouteCapabilities('/explore/locations/213385402/london-uk/');
  assert.equal(loc.isExplore, true);
  assert.equal(loc.isExploreLocation, true);
  assert.equal(loc.isExploreGeneric, false);
  assert.equal(loc.canFilterByDate, true);
  assert.equal(loc.canFilterByAmount, true);

  const locNearby = getRouteCapabilities('/explore/locations/213385402/london-uk/nearby/');
  assert.equal(locNearby.isExplore, true);
  assert.equal(locNearby.isExploreLocation, false);
  assert.equal(locNearby.isExploreGeneric, true);
  assert.equal(locNearby.canFilterByDate, false);

  const tag = getRouteCapabilities('/explore/tags/photography/');
  assert.equal(tag.isExplore, true);
  assert.equal(tag.isExploreTag, true);
  assert.equal(tag.canFilterByDate, true);

  const post = getRouteCapabilities('/p/C9abcDEF123/');
  assert.equal(post.isPost, true);
  assert.equal(post.isPostOrReel, true);
  assert.equal(post.canFilterByDate, false);
  assert.equal(post.canFilterByAmount, false);
  assert.equal(post.canMarkItems, true);

  const guide = getRouteCapabilities('/natgeo/guide/best-photos/12345/');
  assert.equal(guide.isGuide, true);
  assert.equal(guide.isUserRoute, false);
  assert.equal(guide.canMarkItems, false);

  const home = getRouteCapabilities('/');
  assert.equal(home.isHome, true);
  assert.equal(home.isHomeOrTimeline, true);
  assert.equal(home.canFilterByDate, false);
  assert.equal(home.canFilterByAmount, false);
});
