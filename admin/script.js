// Change l'iframe selon le bouton cliqué
document.querySelectorAll(".menu-item").forEach(link => {
  link.addEventListener("click", function (e) {
    e.preventDefault();
    document.querySelectorAll(".menu-item").forEach(item => item.classList.remove("active"));
    this.classList.add("active");
    document.getElementById("mainFrame").src = this.getAttribute("href");
  });
});
