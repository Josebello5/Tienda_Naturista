// ===== CONFIGURACIÓN INICIAL =====
const sidebar = document.querySelector(".sidebar");
const sidebarToggler = document.querySelector(".sidebar-toggler");
const menuToggler = document.querySelector(".menu-toggler");

let collapsedSidebarHeight = "56px";
let fullSidebarHeight = "calc(100vh - 32px)";

// ===== FUNCIONALIDAD DE COLAPSO DEL SIDEBAR MEJORADA =====
sidebarToggler.addEventListener("click", () => {
  sidebar.style.transition = "all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
  sidebar.classList.toggle("collapsed");
});

// ===== FUNCIONALIDAD DEL MENÚ EN MÓVIL =====
const toggleMenu = (isMenuActive) => {
  sidebar.style.transition = "all 0.4s ease";
  sidebar.style.height = isMenuActive ? `${sidebar.scrollHeight}px` : collapsedSidebarHeight;
  menuToggler.querySelector("span").innerText = isMenuActive ? "close" : "menu";
};

menuToggler.addEventListener("click", () => {
  const isActive = sidebar.classList.toggle("menu-active");
  toggleMenu(isActive);
});

// ===== MANEJO DE REDIMENSIONAMIENTO DE VENTANA =====
window.addEventListener("resize", () => {
  if (window.innerWidth >= 1024) {
    sidebar.style.transition = "all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
    sidebar.style.height = fullSidebarHeight;
  } else {
    sidebar.classList.remove("collapsed");
    sidebar.style.height = "auto";
    toggleMenu(sidebar.classList.contains("menu-active"));
  }
});

// ===== INICIALIZACIÓN AL CARGAR LA PÁGINA =====
document.addEventListener("DOMContentLoaded", function() {
  // Activar elemento actual en el menú
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll(".nav-link");
  
  navLinks.forEach(link => {
    if (link.getAttribute("href") === currentPath) {
      link.classList.add("active");
    }
  });
  
  // Ajustar la posición inicial del sidebar en móvil
  if (window.innerWidth < 1024) {
    toggleMenu(sidebar.classList.contains("menu-active"));
  }
});