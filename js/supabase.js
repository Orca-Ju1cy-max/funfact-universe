
const DB = (() => {

  // --- Init client ---
  const client = supabase.createClient(
    CONFIG.supabase.url,
    CONFIG.supabase.anonKey
  );

  // ============================================
  // AUTH
  // ============================================

  // Register user baru
  async function register(email, password, username) {
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { username } 
      }
    });
    if (error) throw error;
    return data;
  }

  // Login
  async function login(email, password) {
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  }

  // Logout
  async function logout() {
    const { error } = await client.auth.signOut();
    if (error) throw error;
  }

  // Ambil session aktif
  async function getSession() {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  // Ambil user yang sedang login
  async function getCurrentUser() {
    const { data, error } = await client.auth.getUser();
    if (error) return null;
    return data.user;
  }

  // Listen perubahan auth state (login/logout)
  function onAuthChange(callback) {
    client.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ?? null);
    });
  }

  // ============================================
  // POSTS
  // ============================================

  // Ambil semua posts (feed), urut terbaru
  async function getPosts({ limit = 20, offset = 0 } = {}) {
    const { data, error } = await client
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data;
  }

  async function publishPost(funfact) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Harus login dulu untuk publish.');

    const username = user.user_metadata?.username || user.email.split('@')[0];

    const { data, error } = await client
      .from('posts')
      .insert([{
        user_id:  user.id,
        username: username,
        funfact:  funfact,
        likes:    0,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async function toggleLike(postId, currentLikes, isLiked) {
    const newLikes = isLiked ? currentLikes - 1 : currentLikes + 1;

    const { data, error } = await client
      .from('posts')
      .update({ likes: newLikes })
      .eq('id', postId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Hapus post (hanya milik sendiri)
  async function deletePost(postId) {
    const { error } = await client
      .from('posts')
      .delete()
      .eq('id', postId);

    if (error) throw error;
  }

  // ============================================
  // RETURN PUBLIC API
  // ============================================
  return {
    client,
    // auth
    register,
    login,
    logout,
    getSession,
    getCurrentUser,
    onAuthChange,
    // posts
    getPosts,
    publishPost,
    toggleLike,
    deletePost,
  };

})();