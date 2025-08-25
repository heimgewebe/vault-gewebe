let isLoggedIn = false;

function login() {
  const password = document.getElementById('password').value;
  if (password === 'weberei') {
    isLoggedIn = true;
    document.getElementById('login-container').style.display = 'none';
    document.dispatchEvent(new CustomEvent("loginSuccess")); // Signal an Karte
  } else {
    alert('Falsches Passwort');
  }
}j