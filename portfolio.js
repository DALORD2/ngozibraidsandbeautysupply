(() => {
  const TABLE_NAME = "hair_portfolio";
  const BUCKET_NAME = "hair-portfolio";
  const MAX_FILE_SIZE = 8 * 1024 * 1024;
  const SUPPORTED_TYPES = new Map([
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"]
  ]);
  const SDK_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  const config = window.NGOZI_SUPABASE_CONFIG || {};
  const isConfigured = typeof config.url === "string" && config.url.trim() !== ""
    && typeof config.anonKey === "string" && config.anonKey.trim() !== "";
  let clientPromise;

  function setStatus(element, message, state) {
    if (!element) return;
    element.textContent = message;
    element.dataset.state = state || "info";
    element.hidden = message === "";
  }

  function getClient() {
    if (!isConfigured) {
      return Promise.reject(new Error("Add the Supabase project URL and anon key in supabase-config.js."));
    }

    if (!clientPromise) {
      clientPromise = new Promise((resolve, reject) => {
        function createClient() {
          if (!window.supabase || typeof window.supabase.createClient !== "function") {
            reject(new Error("The Supabase client library did not load correctly."));
            return;
          }
          try {
            resolve(window.supabase.createClient(config.url.trim(), config.anonKey.trim()));
          } catch (error) {
            reject(error);
          }
        }

        if (window.supabase && typeof window.supabase.createClient === "function") {
          createClient();
          return;
        }

        const script = document.createElement("script");
        script.src = SDK_URL;
        script.async = true;
        script.onload = createClient;
        script.onerror = () => reject(new Error("Could not load the Supabase client library. Check your internet connection and try again."));
        document.head.appendChild(script);
      });
    }

    return clientPromise;
  }

  function getPublicImageUrl(client, storagePath) {
    const result = client.storage.from(BUCKET_NAME).getPublicUrl(storagePath);
    if (!result.data || !result.data.publicUrl) {
      throw new Error("A portfolio image could not be displayed.");
    }
    return result.data.publicUrl;
  }

  function renderPortfolioCard(client, photo) {
    const figure = document.createElement("figure");
    figure.className = "portfolio-card";

    const image = document.createElement("img");
    image.src = getPublicImageUrl(client, photo.storage_path);
    image.alt = photo.caption || "Hair style created at Ngozi Hair Braiding & Beauty Supply";
    image.loading = "lazy";
    image.decoding = "async";

    const caption = document.createElement("figcaption");
    caption.textContent = photo.caption || "A style by Ngozi";
    figure.append(image, caption);
    return figure;
  }

  async function loadPublicPortfolio() {
    const gallery = document.getElementById("portfolio-gallery");
    const status = document.getElementById("portfolio-status");
    if (!gallery || !status) return;

    if (!isConfigured) {
      setStatus(status, "Our salon portfolio is being set up. Please check back soon.", "info");
      return;
    }

    try {
      const client = await getClient();
      const { data, error } = await client
        .from(TABLE_NAME)
        .select("id, storage_path, caption, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;

      gallery.replaceChildren();
      if (!data || data.length === 0) {
        setStatus(status, "Our gallery is ready for new salon photos. Check back soon.", "info");
        return;
      }

      const cards = data.map((photo) => renderPortfolioCard(client, photo));
      gallery.append(...cards);
      setStatus(status, "", "success");
    } catch (error) {
      console.error("Could not load the public hair portfolio.", error);
      setStatus(status, "We could not load the salon portfolio right now. Please try again later.", "error");
    }
  }

  async function initializeAdmin() {
    const setupNotice = document.getElementById("admin-setup-notice");
    const loginForm = document.getElementById("admin-login-form");
    const authStatus = document.getElementById("admin-auth-status");
    const recoveryForm = document.getElementById("admin-recovery-form");
    const recoveryStatus = document.getElementById("admin-recovery-status");
    const forgotPasswordButton = document.getElementById("admin-forgot-password");
    const dashboard = document.getElementById("admin-dashboard");
    const adminStatus = document.getElementById("admin-status");
    const uploadForm = document.getElementById("portfolio-upload-form");
    const fileInput = document.getElementById("portfolio-file");
    const captionInput = document.getElementById("portfolio-caption");
    const photoList = document.getElementById("admin-portfolio-list");
    const loginButton = loginForm && loginForm.querySelector('button[type="submit"]');
    const uploadButton = uploadForm && uploadForm.querySelector('button[type="submit"]');

    if (!setupNotice || !loginForm || !authStatus || !recoveryForm || !recoveryStatus
      || !forgotPasswordButton || !dashboard || !adminStatus
      || !uploadForm || !fileInput || !captionInput || !photoList) return;

    if (!isConfigured) {
      setupNotice.hidden = false;
      loginForm.hidden = true;
      return;
    }

    let client;
    const photosById = new Map();
    const recoveryFromUrl = new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery";

    function renderAdminPhoto(photo) {
      const card = document.createElement("article");
      card.className = "admin-portfolio-card";

      const image = document.createElement("img");
      image.src = getPublicImageUrl(client, photo.storage_path);
      image.alt = photo.caption || "Hair portfolio photo";
      image.loading = "lazy";
      image.decoding = "async";

      const details = document.createElement("div");
      details.className = "admin-portfolio-details";

      const caption = document.createElement("p");
      caption.textContent = photo.caption || "No caption";

      const removeButton = document.createElement("button");
      removeButton.className = "button button-outline portfolio-delete-button";
      removeButton.type = "button";
      removeButton.dataset.photoId = photo.id;
      removeButton.textContent = "Remove photo";

      details.append(caption, removeButton);
      card.append(image, details);
      return card;
    }

    async function loadAdminPhotos() {
      const { data, error } = await client
        .from(TABLE_NAME)
        .select("id, storage_path, caption, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;

      photosById.clear();
      photoList.replaceChildren();
      if (!data || data.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "portfolio-status";
        emptyMessage.textContent = "No portfolio photos yet. Upload the first one above.";
        photoList.appendChild(emptyMessage);
        return;
      }

      data.forEach((photo) => {
        photosById.set(photo.id, photo);
        photoList.appendChild(renderAdminPhoto(photo));
      });
    }

    async function showDashboard() {
      const { data, error } = await client.rpc("is_portfolio_admin");
      if (error) throw error;
      if (data !== true) {
        const { error: signOutError } = await client.auth.signOut();
        if (signOutError) {
          throw new Error("This account is not authorized to manage the portfolio, and sign-out failed. Please sign out and contact the site administrator.");
        }
        throw new Error("This account is not authorized to manage the portfolio. Add its user ID to the portfolio_admins table.");
      }

      loginForm.hidden = true;
      dashboard.hidden = false;
      setStatus(authStatus, "", "success");
      setStatus(adminStatus, "You are signed in. Upload a salon photo to add it to the public portfolio.", "success");
      try {
        await loadAdminPhotos();
      } catch (error) {
        console.error("Could not load portfolio photos in admin.", error);
        setStatus(adminStatus, `You are signed in, but the photo list could not be loaded: ${error.message}`, "error");
      }
    }

    function showRecoveryForm() {
      loginForm.hidden = true;
      dashboard.hidden = true;
      recoveryForm.hidden = false;
      setStatus(recoveryStatus, "Choose a new password to finish setting up your account.", "info");
    }

    try {
      client = await getClient();
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      if (recoveryFromUrl) {
        if (!data.session) throw new Error("This password-reset link is no longer valid. Request a new one from the sign-in page.");
        showRecoveryForm();
      } else if (data.session) {
        await showDashboard();
      }
    } catch (error) {
      console.error("Could not initialize the portfolio admin.", error);
      setStatus(authStatus, error.message, "error");
    }

    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!client) {
        setStatus(authStatus, "The Supabase client is not available. Check the project configuration and try again.", "error");
        return;
      }

      loginButton.disabled = true;
      setStatus(authStatus, "Signing in...", "info");
      try {
        const formData = new FormData(loginForm);
        const { error } = await client.auth.signInWithPassword({
          email: formData.get("email"),
          password: formData.get("password")
        });
        if (error) throw error;
        await showDashboard();
        loginForm.reset();
      } catch (error) {
        console.error("Portfolio admin sign-in failed.", error);
        setStatus(authStatus, error.message, "error");
      } finally {
        loginButton.disabled = false;
      }
    });

    forgotPasswordButton.addEventListener("click", async () => {
      if (!client) {
        setStatus(authStatus, "The Supabase client is not available. Refresh the page and try again.", "error");
        return;
      }

      const emailInput = loginForm.elements.namedItem("email");
      const email = emailInput && emailInput.value.trim();
      if (!email) {
        setStatus(authStatus, "Enter your email address first, then choose Forgot your password.", "error");
        return;
      }

      forgotPasswordButton.disabled = true;
      setStatus(authStatus, "Sending a password-reset email...", "info");
      try {
        const redirectTo = new URL(window.location.href);
        redirectTo.hash = "";
        redirectTo.search = "";
        const { error } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: redirectTo.toString()
        });
        if (error) throw error;
        setStatus(authStatus, "If an account exists for that email, a password-reset email has been sent.", "success");
      } catch (error) {
        console.error("Could not send the portfolio password-reset email.", error);
        const message = /rate limit/i.test(error.message)
          ? "Supabase temporarily limited password-reset emails. Wait for the email limit to reset, then try again."
          : error.message;
        setStatus(authStatus, message, "error");
      } finally {
        forgotPasswordButton.disabled = false;
      }
    });

    recoveryForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(recoveryForm);
      const password = formData.get("new-password");
      const confirmation = formData.get("confirm-password");
      if (password !== confirmation) {
        setStatus(recoveryStatus, "The passwords do not match.", "error");
        return;
      }
      if (typeof password !== "string" || password.length < 8) {
        setStatus(recoveryStatus, "Choose a password with at least 8 characters.", "error");
        return;
      }

      const saveButton = recoveryForm.querySelector('button[type="submit"]');
      saveButton.disabled = true;
      setStatus(recoveryStatus, "Updating your password...", "info");
      try {
        const { error } = await client.auth.updateUser({ password });
        if (error) throw error;

        recoveryForm.reset();
        recoveryForm.hidden = true;
        window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
        await showDashboard();
        setStatus(adminStatus, "Password updated. You can now manage the salon portfolio.", "success");
      } catch (error) {
        console.error("Could not update the portfolio account password.", error);
        setStatus(recoveryStatus, error.message, "error");
      } finally {
        saveButton.disabled = false;
      }
    });

    uploadForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!client) {
        setStatus(adminStatus, "The Supabase client is not available. Refresh the page and try again.", "error");
        return;
      }

      uploadButton.disabled = true;
      setStatus(adminStatus, "Uploading photo...", "info");
      try {
        const file = fileInput.files && fileInput.files[0];
        if (!file) throw new Error("Choose a photo to upload.");
        if (!SUPPORTED_TYPES.has(file.type)) throw new Error("Choose a JPG, PNG, or WebP image.");
        if (file.size > MAX_FILE_SIZE) throw new Error("Choose an image smaller than 8 MB.");
        const caption = captionInput.value.trim();
        if (!caption) throw new Error("Add a short description for this hairstyle.");
        if (!window.crypto || typeof window.crypto.randomUUID !== "function") {
          throw new Error("Secure photo uploads require a current browser on HTTPS.");
        }

        const storagePath = `${window.crypto.randomUUID()}.${SUPPORTED_TYPES.get(file.type)}`;
        const { error: uploadError } = await client.storage
          .from(BUCKET_NAME)
          .upload(storagePath, file, {
            cacheControl: "31536000",
            contentType: file.type,
            upsert: false
          });
        if (uploadError) throw uploadError;

        const { error: insertError } = await client.from(TABLE_NAME).insert({
          storage_path: storagePath,
          caption
        });
        if (insertError) {
          const { error: cleanupError } = await client.storage.from(BUCKET_NAME).remove([storagePath]);
          if (cleanupError) {
            throw new Error(`${insertError.message} The uploaded image could not be cleaned up: ${cleanupError.message}`);
          }
          throw insertError;
        }

        uploadForm.reset();
        try {
          await loadAdminPhotos();
        } catch (error) {
          console.error("Photo uploaded, but the admin list could not be refreshed.", error);
          setStatus(adminStatus, `Photo uploaded, but the list could not be refreshed: ${error.message}`, "error");
          return;
        }
        setStatus(adminStatus, "Photo added to the public portfolio.", "success");
      } catch (error) {
        console.error("Portfolio photo upload failed.", error);
        setStatus(adminStatus, error.message, "error");
      } finally {
        uploadButton.disabled = false;
      }
    });

    photoList.addEventListener("click", async (event) => {
      const removeButton = event.target instanceof Element
        ? event.target.closest("button[data-photo-id]")
        : null;
      if (!removeButton) return;

      const photo = photosById.get(removeButton.dataset.photoId);
      if (!photo || !window.confirm("Remove this photo from the public portfolio?")) return;

      removeButton.disabled = true;
      setStatus(adminStatus, "Removing photo...", "info");
      try {
        const { error: deleteError } = await client.from(TABLE_NAME).delete().eq("id", photo.id);
        if (deleteError) throw deleteError;

        const { error: storageError } = await client.storage.from(BUCKET_NAME).remove([photo.storage_path]);
        if (storageError) {
          let refreshMessage = "";
          try {
            await loadAdminPhotos();
          } catch (refreshError) {
            refreshMessage = ` The photo list could not be refreshed: ${refreshError.message}`;
          }
          throw new Error(`The photo was removed from the portfolio, but its stored image could not be deleted: ${storageError.message}.${refreshMessage}`);
        }

        try {
          await loadAdminPhotos();
        } catch (refreshError) {
          throw new Error(`Photo removed from the portfolio, but the list could not be refreshed: ${refreshError.message}`);
        }
        setStatus(adminStatus, "Photo removed from the portfolio.", "success");
      } catch (error) {
        console.error("Portfolio photo removal failed.", error);
        setStatus(adminStatus, error.message, "error");
      }
    });

    const signOutButton = document.getElementById("admin-signout");
    if (signOutButton) {
      signOutButton.addEventListener("click", async () => {
        signOutButton.disabled = true;
        try {
          const { error } = await client.auth.signOut();
          if (error) throw error;
          dashboard.hidden = true;
          loginForm.hidden = false;
          loginForm.reset();
          setStatus(adminStatus, "", "success");
          setStatus(authStatus, "You have signed out.", "success");
        } catch (error) {
          console.error("Portfolio admin sign-out failed.", error);
          setStatus(adminStatus, error.message, "error");
        } finally {
          signOutButton.disabled = false;
        }
      });
    }
  }

  loadPublicPortfolio();
  initializeAdmin();
})();
