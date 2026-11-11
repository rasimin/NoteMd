(() => {
  const form = document.getElementById('login-form');
  const err = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.hidden = true;
    btn.disabled = true;
    btn.textContent = 'Memeriksa...';
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'ai-note' },
        body: JSON.stringify({ username: form.username.value.trim(), password: form.password.value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Gagal masuk (' + res.status + ')');
      location.replace('/');
    } catch (e2) {
      err.textContent = e2.message;
      err.hidden = false;
      btn.disabled = false;
      btn.textContent = 'Masuk';
      form.password.select();
    }
  });
})();
