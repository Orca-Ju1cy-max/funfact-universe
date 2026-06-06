
const Generator = (() => {

  let currentFunfact = '';

  // ============================================
  // INIT
  // ============================================
  function init() {
    const generateBtn = document.getElementById('generate-btn');
    const copyBtn     = document.getElementById('copy-btn');
    const publishBtn  = document.getElementById('publish-btn');

    if (!generateBtn) return;

    generateBtn.addEventListener('click', generate);
    copyBtn?.addEventListener('click', copyFunfact);
    publishBtn?.addEventListener('click', publishToFeed);

    document.getElementById('share-twitter')?.addEventListener('click', () => shareToSosmed('twitter'));
    document.getElementById('share-whatsapp')?.addEventListener('click', () => shareToSosmed('whatsapp'));
    document.getElementById('share-facebook')?.addEventListener('click', () => shareToSosmed('facebook'));
    document.getElementById('share-telegram')?.addEventListener('click', () => shareToSosmed('telegram'));
  }

  // ============================================
  // GENERATE
  // ============================================
  async function generate() {
    const generateBtn = document.getElementById('generate-btn');
    const outputCard  = document.getElementById('output-card');
    const outputText  = document.getElementById('output-text');
    const actionBar   = document.getElementById('action-bar');
    const thinkingEl  = document.getElementById('thinking-state');

    generateBtn.disabled = true;
    generateBtn.innerHTML = `<span class="spin">✦</span> Thinking...`;
    outputCard.classList.remove('hidden');
    thinkingEl.classList.remove('hidden');
    actionBar.classList.add('hidden');
    outputText.classList.add('hidden');
    outputText.textContent = '';
    outputText.style.color = '';
    currentFunfact = '';

    try {
      const funfact = await _callGemini();
      currentFunfact = funfact;

      thinkingEl.classList.add('hidden');
      outputText.classList.remove('hidden');
      actionBar.classList.remove('hidden');

      await _typeText(outputText, funfact);

    } catch (err) {
      thinkingEl.classList.add('hidden');
      outputText.classList.remove('hidden');
      outputText.textContent = '⚠️ Gagal generate. Coba lagi.';
      outputText.style.color = '#ff6b6b';
      console.error(err);
    } finally {
      generateBtn.disabled = false;
      generateBtn.innerHTML = `✦ Generate Funfact`;
    }
  }

  
  async function _callGemini() {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err?.error || 'Gagal generate.');
    }

    const data = await res.json();
    if (!data.funfact) throw new Error('Respons kosong.');

    return data.funfact;
  }

  // ============================================
  // TYPING EFFECT
  // ============================================
  async function _typeText(el, text, speed = 18) {
    el.textContent = '';
    for (let i = 0; i < text.length; i++) {
      el.textContent += text[i];
      await _sleep(speed);
    }
  }

  function _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================
  // COPY
  // ============================================
  async function copyFunfact() {
    if (!currentFunfact) return;
    try {
      await navigator.clipboard.writeText(currentFunfact);
      const btn = document.getElementById('copy-btn');
      btn.textContent = '✓ Copied!';
      setTimeout(() => btn.textContent = '⎘ Copy', 2000);
      Toast.show('Funfact berhasil di-copy!', 'success');
    } catch {
      Toast.show('Gagal copy. Coba manual.', 'error');
    }
  }

  // ============================================
  // SHARE KE SOSMED LUAR
  // ============================================
  function shareToSosmed(platform) {
    if (!currentFunfact) return;

    const text    = `✦ Funfact:\n\n${currentFunfact}\n\n— via FunFact Universe`;
    const encoded = encodeURIComponent(text);
    const url     = encodeURIComponent(window.location.href);

    const links = {
      twitter:  `https://twitter.com/intent/tweet?text=${encoded}`,
      whatsapp: `https://wa.me/?text=${encoded}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${encoded}`,
      telegram: `https://t.me/share/url?url=${url}&text=${encoded}`,
    };

    const shareUrl = links[platform];
    if (shareUrl) window.open(shareUrl, '_blank', 'width=600,height=500');
  }

  // ============================================
  // PUBLISH KE FEED INTERNAL
  // ============================================
  async function publishToFeed() {
    if (!currentFunfact) return;

    if (!Auth.isLoggedIn()) {
      Toast.show('Login dulu untuk publish ke feed!', 'info');
      Auth.showModal('login');
      return;
    }

    const btn = document.getElementById('publish-btn');
    btn.disabled = true;
    btn.textContent = 'Publishing...';

    try {
      await DB.publishPost(currentFunfact);
      Toast.show('Funfact berhasil dipublish ke feed! 🚀', 'success');
      btn.textContent = '✓ Published!';
      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = '⬆ Publish ke Feed';
      }, 3000);
    } catch (err) {
      Toast.show('Gagal publish: ' + err.message, 'error');
      btn.disabled = false;
      btn.textContent = '⬆ Publish ke Feed';
    }
  }

  return { init };

})();

document.addEventListener('DOMContentLoaded', Generator.init);