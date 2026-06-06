
const Feed = (() => {

  const LIMIT  = 10;
  let offset   = 0;
  let loading  = false;
  let hasMore  = true;

  // Set postId → true kalau user sudah like
  const likedPosts = new Set(
    JSON.parse(localStorage.getItem('liked-posts') || '[]')
  );

  // ============================================
  // INIT
  // ============================================
  function init() {
    const feedEl = document.getElementById('feed');
    if (!feedEl) return;

    _loadPosts();

    // Infinite scroll
    window.addEventListener('scroll', () => {
      const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 300;
      if (nearBottom && !loading && hasMore) _loadPosts();
    });

    // Refresh button
    document.getElementById('refresh-btn')?.addEventListener('click', refreshFeed);
  }

  // ============================================
  // LOAD POSTS
  // ============================================
  async function _loadPosts() {
    if (loading || !hasMore) return;
    loading = true;

    const feedEl   = document.getElementById('feed');
    const emptyEl  = document.getElementById('feed-empty');
    const loaderEl = document.getElementById('feed-loader');

    loaderEl?.classList.remove('hidden');

    try {
      const posts = await DB.getPosts({ limit: LIMIT, offset });

      loaderEl?.classList.add('hidden');

      if (posts.length === 0 && offset === 0) {
        emptyEl?.classList.remove('hidden');
        hasMore = false;
        return;
      }

      if (posts.length < LIMIT) hasMore = false;

      posts.forEach(post => {
        feedEl.appendChild(_buildPostCard(post));
      });

      offset += posts.length;

    } catch (err) {
      loaderEl?.classList.add('hidden');
      Toast.show('Gagal load feed: ' + err.message, 'error');
    } finally {
      loading = false;
    }
  }

  // ============================================
  // BUILD POST CARD
  // ============================================
  function _buildPostCard(post) {
    const currentUser = Auth.getUser();
    const isOwner     = currentUser?.id === post.user_id;
    const isLiked     = likedPosts.has(post.id);
    const initial     = (post.username || '?').charAt(0).toUpperCase();
    const timeAgo     = _timeAgo(post.created_at);

    const card = document.createElement('div');
    card.className  = 'post-card';
    card.dataset.id = post.id;

    card.innerHTML = `
      <div class="post-header">
        <div class="post-avatar">${initial}</div>
        <div class="post-meta">
          <span class="post-username">@${post.username || 'anonymous'}</span>
          <span class="post-time">${timeAgo}</span>
        </div>
        ${isOwner ? `
        <button class="post-delete-btn" title="Hapus post">✕</button>
        ` : ''}
      </div>

      <div class="post-body">${_escapeHTML(post.funfact)}</div>

      <div class="post-footer">
        <button class="like-btn ${isLiked ? 'liked' : ''}" data-id="${post.id}" data-likes="${post.likes}">
          <span class="like-icon">${isLiked ? '♥' : '♡'}</span>
          <span class="like-count">${post.likes}</span>
        </button>

        <div class="post-share-row">
          <button class="share-sm-btn" data-platform="twitter"  data-text="${_escapeAttr(post.funfact)}">𝕏</button>
          <button class="share-sm-btn" data-platform="whatsapp" data-text="${_escapeAttr(post.funfact)}">WA</button>
          <button class="share-sm-btn" data-platform="telegram" data-text="${_escapeAttr(post.funfact)}">TG</button>
        </div>
      </div>
    `;

    // Like
    card.querySelector('.like-btn').addEventListener('click', (e) => {
      _handleLike(e.currentTarget);
    });

    // Delete
    card.querySelector('.post-delete-btn')?.addEventListener('click', () => {
      _handleDelete(post.id, card);
    });

    // Share dari card
    card.querySelectorAll('.share-sm-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        _shareFromCard(btn.dataset.platform, btn.dataset.text);
      });
    });

    return card;
  }

  // ============================================
  // LIKE
  // ============================================
  async function _handleLike(btn) {
    const postId      = btn.dataset.id;
    const currentLikes = parseInt(btn.dataset.likes);
    const isLiked     = likedPosts.has(postId);

    // Optimistic UI update
    const newLikes = isLiked ? currentLikes - 1 : currentLikes + 1;
    btn.dataset.likes = newLikes;
    btn.querySelector('.like-count').textContent = newLikes;
    btn.querySelector('.like-icon').textContent  = isLiked ? '♡' : '♥';
    btn.classList.toggle('liked', !isLiked);

    // Update liked set & localStorage
    isLiked ? likedPosts.delete(postId) : likedPosts.add(postId);
    localStorage.setItem('liked-posts', JSON.stringify([...likedPosts]));

    try {
      await DB.toggleLike(postId, currentLikes, isLiked);
    } catch {
      // Rollback kalau gagal
      btn.dataset.likes = currentLikes;
      btn.querySelector('.like-count').textContent = currentLikes;
      btn.querySelector('.like-icon').textContent  = isLiked ? '♥' : '♡';
      btn.classList.toggle('liked', isLiked);
      isLiked ? likedPosts.add(postId) : likedPosts.delete(postId);
      localStorage.setItem('liked-posts', JSON.stringify([...likedPosts]));
      Toast.show('Gagal like post.', 'error');
    }
  }

  // ============================================
  // DELETE
  // ============================================
  async function _handleDelete(postId, cardEl) {
    if (!confirm('Hapus funfact ini?')) return;

    try {
      await DB.deletePost(postId);
      cardEl.style.opacity   = '0';
      cardEl.style.transform = 'scale(0.95)';
      cardEl.style.transition = '0.3s ease';
      setTimeout(() => cardEl.remove(), 300);
      Toast.show('Post berhasil dihapus.', 'success');
    } catch (err) {
      Toast.show('Gagal hapus: ' + err.message, 'error');
    }
  }

  // ============================================
  // SHARE DARI CARD
  // ============================================
  function _shareFromCard(platform, text) {
    const encoded = encodeURIComponent(`✦ Funfact:\n\n${text}\n\n— via FunFact Universe`);
    const url     = encodeURIComponent(window.location.href);

    const links = {
      twitter:  `https://twitter.com/intent/tweet?text=${encoded}`,
      whatsapp: `https://wa.me/?text=${encoded}`,
      telegram: `https://t.me/share/url?url=${url}&text=${encoded}`,
    };

    const shareUrl = links[platform];
    if (shareUrl) window.open(shareUrl, '_blank', 'width=600,height=500');
  }

  // ============================================
  // REFRESH
  // ============================================
  function refreshFeed() {
    const feedEl = document.getElementById('feed');
    const emptyEl = document.getElementById('feed-empty');
    if (!feedEl) return;

    feedEl.innerHTML = '';
    emptyEl?.classList.add('hidden');
    offset  = 0;
    hasMore = true;
    loading = false;
    _loadPosts();
  }

  // ============================================
  // HELPERS
  // ============================================
  function _timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);

    if (mins < 1)   return 'baru saja';
    if (mins < 60)  return `${mins} menit lalu`;
    if (hours < 24) return `${hours} jam lalu`;
    return `${days} hari lalu`;
  }

  function _escapeHTML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function _escapeAttr(str) {
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  return { init, refreshFeed };

})();

document.addEventListener('DOMContentLoaded', Feed.init);