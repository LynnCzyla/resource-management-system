// ---------- Imports ----------
import { supabase } from "../../supabaseClient.js";
import bcrypt from "https://cdn.jsdelivr.net/npm/bcryptjs@2.4.3/+esm";


// ---------- Remember Me Feature ----------
document.addEventListener("DOMContentLoaded", () => {
  const emailInput = document.getElementById("email");
  const rememberMe = document.getElementById("rememberMe");
  console.log("Supabase connected:", supabase);

  if (emailInput && rememberMe) {
    // Load saved email on page load
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      emailInput.value = savedEmail;
      rememberMe.checked = true;
    }

    // Save or remove email based on checkbox
    rememberMe.addEventListener("change", () => {
      if (rememberMe.checked) {
        localStorage.setItem("rememberedEmail", emailInput.value);
      } else {
        localStorage.removeItem("rememberedEmail");
      }
    });
  }
});

// ---------- Login Logic ----------
const form = document.getElementById("loginForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    Swal.fire("Error", "Please fill in all fields.", "error");
    return;
  }

  Swal.fire({
    title: 'Logging in...',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    console.error(error);
    Swal.close();
    Swal.fire("Error", "Database connection failed.", "error");
    return;
  }

  if (!user) {
    Swal.close();
    Swal.fire("Invalid Login", "No user found with that email.", "error");
    return;
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    Swal.close();
    Swal.fire("Invalid Login", "Incorrect password.", "error");
    return;
  }

  Swal.fire({
    icon: 'success',
    title: `Welcome, ${user.name}!`,
    showConfirmButton: false,
    timer: 1200
  });

  localStorage.setItem("loggedUser", JSON.stringify({
    id: user.id,
    name: user.name,
    role: user.role,
    email: user.email
  }));

  setTimeout(() => {
    if (user.role === "project_manager") {
      window.location.href = "../HTML_Files/project_dashboard.html";
    } else if (user.role === "resource_manager") {
      window.location.href = "/ResourceManager/HTML_Files/dashboard.html";
    } else {
      window.location.href = "../HTML_Files/employee_dashboard.html";
    }
  }, 1200);
});
