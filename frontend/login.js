
document.getElementById("login").addEventListener("click", login, false);
document.getElementById("register").addEventListener("click", register, false);

// Sends form data when the login button is clicked
function login(event) {
    event.preventDefault();

    let form = document.getElementById("login_form");
    form.setAttribute("action", "/login");
    form.submit();
}

// Sends form data when the register button is clicked
function register(event) {
    event.preventDefault();

    let form = document.getElementById("login_form");
    form.setAttribute("action", "/register");
    form.submit();
}