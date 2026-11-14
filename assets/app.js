/* Nancy Munce Personal Dashboard — data lives in Supabase, never in browser
   localStorage. If the Supabase table is not set up yet, the page shows the
   published seed list (data/resources.json) read-only, with a setup banner.
   Same pattern as the Reseller Command Center: Supabase JS client +
   publishable key in the browser, Row Level Security in Supabase. */
(function () {
  "use strict";

  var TABLE = "personal_dashboard_resources";
  var SEED_URL = "data/resources.json";
  var NEW_CATEGORY_VALUE = "__new__";

  var CATEGORY_ICONS = {
    "Resale & Shops": "🛍",
    "My Sites & Projects": "★",
    "Shopping & Everyday": "🛒",
    "Health": "♥",
    "AI & Tools": "✦"
  };

  var resources = [];
  var mode = "seed"; // "supabase" once the table answers
  var session = null;
  var currentCategory = null;
  var showingFavorites = false;
  var pendingDeleteId = null;

  var $ = function (id) { return document.getElementById(id); };

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function setStatus(text) { $("statusLine").textContent = text || ""; }

  function signedIn() { return !!session; }
  function canEdit() { return mode === "supabase" && signedIn(); }

  function normalizeUrl(url) {
    url = String(url || "").trim();
    if (url && !/^https?:\/\//i.test(url)) url = "https://" + url;
    return url;
  }

  function parseTags(text) {
    return String(text || "").split(",").map(function (t) { return t.trim(); })
      .filter(function (t) { return t.length > 0; }).slice(0, 20);
  }

  function matches(resource, query) {
    if (!query) return true;
    var hay = [resource.name, resource.description, resource.category,
      resource.type, (resource.tags || []).join(" ")].join(" ").toLowerCase();
    return hay.indexOf(query.toLowerCase()) !== -1;
  }

  function sortedResources() {
    return resources.slice().sort(function (a, b) {
      return (a.sort_order || 0) - (b.sort_order || 0);
    });
  }

  function categories() {
    var seen = {}, list = [];
    sortedResources().forEach(function (r) {
      if (!seen[r.category]) { seen[r.category] = true; list.push(r.category); }
    });
    return list;
  }

  function categoryCounts() {
    var counts = {};
    resources.forEach(function (r) { counts[r.category] = (counts[r.category] || 0) + 1; });
    return counts;
  }

  /* ---------- data ---------- */

  function supabase() {
    if (typeof window.supabaseClient === "undefined" || !window.supabaseClient) return null;
    return window.supabaseClient;
  }

  function loadSeed() {
    return fetch(SEED_URL).then(function (res) {
      if (!res.ok) throw new Error("Seed list could not be loaded.");
      return res.json();
    }).then(function (data) {
      return (data.resources || []).map(function (r, i) {
        return {
          id: r.id || ("seed-" + i), name: r.name, url: r.url, category: r.category,
          description: r.description || "", type: r.type || "",
          tags: r.tags || [], favorite: !!r.favorite, sort_order: r.sort_order != null ? r.sort_order : i
        };
      });
    });
  }

  function loadFromSupabase() {
    var client = supabase();
    if (!client) return Promise.reject(new Error("Supabase is not configured."));
    return client.from(TABLE).select("*").order("sort_order", { ascending: true })
      .then(function (result) {
        if (result.error) throw result.error;
        return (result.data || []).map(function (r) {
          return {
            id: r.id, name: r.name, url: r.url, category: r.category,
            description: r.description || "", type: r.type || "",
            tags: r.tags || [], favorite: !!r.favorite,
            sort_order: r.sort_order != null ? r.sort_order : 0
          };
        });
      });
  }

  function refresh() {
    return loadFromSupabase().then(function (rows) {
      mode = "supabase";
      resources = rows;
      $("setupBanner").classList.add("hidden");
      setStatus(rows.length + " links · saved in Supabase" +
        (signedIn() ? " · signed in — you can add, edit, and star" : " · sign in to edit"));
      render();
    }).catch(function (err) {
      mode = "seed";
      var missing = err && (err.code === "PGRST205" || /Could not find the table/i.test(err.message || ""));
      return loadSeed().then(function (rows) {
        resources = rows;
        var banner = $("setupBanner");
        banner.classList.remove("hidden");
        banner.textContent = missing
          ? "Supabase setup needed: the personal_dashboard_resources table does not exist yet. These " + rows.length + " links are the published list, shown read-only. Run supabase.sql in your Supabase dashboard (see the README in the GitHub repo), then reload this page — no links will be lost."
          : "Supabase could not be reached, so these " + rows.length + " links are the published list, shown read-only. Check your connection and reload.";
        setStatus(rows.length + " links · read-only until Supabase is connected");
        render();
      });
    });
  }

  /* ---------- rendering ---------- */

  function renderCategoryGrid() {
    var grid = $("categoryGrid");
    grid.innerHTML = "";
    var counts = categoryCounts();
    categories().forEach(function (cat) {
      var tpl = document.getElementById("categoryCardTemplate").content.cloneNode(true);
      var btn = tpl.querySelector(".category-card");
      btn.querySelector(".category-icon").textContent = CATEGORY_ICONS[cat] || "•";
      btn.querySelector("h3").textContent = cat;
      btn.querySelector("p").textContent = counts[cat] + (counts[cat] === 1 ? " link" : " links");
      btn.addEventListener("click", function () { showCategory(cat); });
      grid.appendChild(tpl);
    });
    $("resourceCount").textContent = resources.length + (resources.length === 1 ? " resource" : " resources");
  }

  function resourceCard(resource) {
    var tpl = document.getElementById("resourceCardTemplate").content.cloneNode(true);
    var card = tpl.querySelector(".resource-card");
    card.querySelector(".type-pill").textContent = resource.type || resource.category;
    var favBtn = tpl.querySelector(".favorite-btn");
    favBtn.textContent = resource.favorite ? "★" : "☆";
    favBtn.setAttribute("aria-pressed", resource.favorite ? "true" : "false");
    favBtn.setAttribute("aria-label", (resource.favorite ? "Remove " : "Star ") + resource.name + (resource.favorite ? " from favorites" : " as a favorite"));
    favBtn.addEventListener("click", function () { toggleFavorite(resource); });
    card.querySelector("h3").textContent = resource.name;
    card.querySelector(".description").textContent = resource.description || "";
    var tagList = tpl.querySelector(".tag-list");
    (resource.tags || []).forEach(function (tag) {
      var span = document.createElement("span");
      span.textContent = tag;
      tagList.appendChild(span);
    });
    var link = tpl.querySelector(".open-link");
    link.href = resource.url;
    link.textContent = "Open Resource ↗";
    var editBtn = tpl.querySelector(".edit-btn");
    editBtn.addEventListener("click", function () { openResourceDialog(resource); });
    var deleteBtn = tpl.querySelector(".delete-btn");
    deleteBtn.addEventListener("click", function () { askDelete(resource); });
    if (!canEdit()) { editBtn.disabled = true; deleteBtn.disabled = true; favBtn.disabled = true; }
    return tpl;
  }

  function renderResourceGrid(gridEl, list) {
    gridEl.innerHTML = "";
    if (list.length === 0) {
      var p = document.createElement("p");
      p.className = "muted";
      p.textContent = "No links match. Try a different keyword.";
      gridEl.appendChild(p);
      return;
    }
    list.forEach(function (r) { gridEl.appendChild(resourceCard(r)); });
  }

  function render() {
    renderCategoryGrid();
    $("homeView").classList.toggle("hidden", currentCategory !== null || showingFavorites);
    $("categoryView").classList.toggle("hidden", currentCategory === null);
    $("favoritesView").classList.toggle("hidden", !showingFavorites);
    if (currentCategory) {
      $("categoryTitle").textContent = currentCategory;
      var inCat = sortedResources().filter(function (r) { return r.category === currentCategory; });
      $("categorySubtitle").textContent = inCat.length + (inCat.length === 1 ? " link" : " links");
      renderResourceGrid($("resourceGrid"), inCat.filter(function (r) { return matches(r, $("categorySearch").value.trim()); }));
    }
    if (showingFavorites) {
      var favs = sortedResources().filter(function (r) { return r.favorite; });
      renderResourceGrid($("favoritesGrid"), favs.filter(function (r) { return matches(r, $("globalSearch").value.trim()); }));
    }
    updateAuthUI();
  }

  function showCategory(cat) {
    currentCategory = cat;
    showingFavorites = false;
    $("globalSearch").value = "";
    $("categorySearch").value = "";
    render();
    $("categoryTitle").focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showHome() {
    currentCategory = null;
    showingFavorites = false;
    $("globalSearch").value = "";
    render();
  }

  function showFavorites() {
    showingFavorites = true;
    currentCategory = null;
    render();
    $("favoritesHeading").focus();
  }

  /* ---------- auth ---------- */

  function updateAuthUI() {
    var status = $("authStatus");
    if (signedIn()) {
      status.textContent = "Signed in" + (session.user && session.user.email ? " as " + session.user.email : "");
      $("signInBtn").classList.add("hidden");
      $("signOutBtn").classList.remove("hidden");
    } else {
      status.textContent = mode === "supabase" ? "Not signed in — viewing only" : "Not signed in";
      $("signInBtn").classList.remove("hidden");
      $("signOutBtn").classList.add("hidden");
    }
    var favBtn = $("favoritesBtn");
    favBtn.setAttribute("aria-pressed", showingFavorites ? "true" : "false");
  }

  function requireEdit() {
    if (mode !== "supabase") {
      setStatus("Supabase is not connected yet — run supabase.sql first, then reload.");
      return false;
    }
    if (!signedIn()) {
      openAuthDialog();
      setStatus("Sign in to add, edit, or star links.");
      return false;
    }
    return true;
  }

  /* ---------- mutations (Supabase only — never localStorage) ---------- */

  function toggleFavorite(resource) {
    if (!requireEdit()) return;
    supabase().from(TABLE).update({ favorite: !resource.favorite })
      .eq("id", resource.id).then(function (result) {
        if (result.error) { setStatus("Could not save that star: " + result.error.message); return; }
        return refresh();
      });
  }

  function saveResource(fields, id) {
    var client = supabase();
    var payload = {
      name: fields.name, url: normalizeUrl(fields.url), category: fields.category,
      description: fields.description || "", type: fields.type || "",
      tags: fields.tags, favorite: !!fields.favorite, updated_at: new Date().toISOString()
    };
    var query;
    if (id) {
      query = client.from(TABLE).update(payload).eq("id", id);
    } else {
      payload.user_id = session.user.id;
      payload.sort_order = resources.length;
      query = client.from(TABLE).insert(payload);
    }
    return query.then(function (result) {
      if (result.error) throw new Error(result.error.message);
      return refresh();
    });
  }

  function deleteResource(id) {
    return supabase().from(TABLE).delete().eq("id", id).then(function (result) {
      if (result.error) throw new Error(result.error.message);
      return refresh();
    });
  }

  /* ---------- dialogs ---------- */

  function fillCategorySelect(selected) {
    var select = $("resourceCategory");
    select.innerHTML = "";
    categories().forEach(function (cat) {
      var opt = document.createElement("option");
      opt.value = cat; opt.textContent = cat;
      if (cat === selected) opt.selected = true;
      select.appendChild(opt);
    });
    var opt = document.createElement("option");
    opt.value = NEW_CATEGORY_VALUE; opt.textContent = "＋ New category…";
    select.appendChild(opt);
    if (selected && categories().indexOf(selected) === -1) select.value = NEW_CATEGORY_VALUE;
  }

  function openResourceDialog(resource) {
    if (!requireEdit()) return;
    var dialog = $("resourceDialog");
    $("formError").classList.add("hidden");
    if (resource) {
      $("dialogTitle").textContent = "Edit Resource";
      $("resourceId").value = resource.id;
      $("resourceName").value = resource.name;
      $("resourceUrl").value = resource.url;
      fillCategorySelect(resource.category);
      $("newCategoryLabel").classList.add("hidden");
      $("resourceDescription").value = resource.description || "";
      $("resourceType").value = resource.type || "";
      $("resourceTags").value = (resource.tags || []).join(", ");
      $("resourceFavorite").checked = !!resource.favorite;
    } else {
      $("dialogTitle").textContent = "Add Resource";
      $("resourceId").value = "";
      $("resourceName").value = "";
      $("resourceUrl").value = "";
      fillCategorySelect(categories()[0]);
      $("newCategoryLabel").classList.add("hidden");
      $("newCategoryName").value = "";
      $("resourceDescription").value = "";
      $("resourceType").value = "";
      $("resourceTags").value = "";
      $("resourceFavorite").checked = false;
    }
    dialog.showModal();
    $("resourceName").focus();
  }

  function askDelete(resource) {
    if (!requireEdit()) return;
    pendingDeleteId = resource.id;
    $("confirmText").textContent = "Delete “" + resource.name + "” (" + resource.url + ")? This removes it from Supabase for every browser.";
    $("confirmDialog").showModal();
  }

  function openAuthDialog() {
    $("authError").classList.add("hidden");
    $("authNote").classList.add("hidden");
    $("authDialog").showModal();
    $("authEmail").focus();
  }

  /* ---------- export / import ---------- */

  function exportResources() {
    var data = { version: "1.0", resources: sortedResources().map(function (r) {
      return { name: r.name, url: r.url, category: r.category, description: r.description,
        type: r.type, tags: r.tags, favorite: r.favorite, sort_order: r.sort_order };
    }) };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "personal-dashboard-resources.json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    $("manageNote").textContent = "Exported " + data.resources.length + " links.";
  }

  function importResources(file) {
    if (!requireEdit()) { $("manageNote").textContent = "Sign in first — imports save to Supabase."; return; }
    var reader = new FileReader();
    reader.onload = function () {
      var data;
      try { data = JSON.parse(reader.result); }
      catch (e) { $("manageNote").textContent = "That file is not valid JSON."; return; }
      var rows = (data.resources || data || []).filter(function (r) { return r && r.name && r.url && r.category; });
      if (!rows.length) { $("manageNote").textContent = "No links found in that file."; return; }
      var client = supabase();
      client.from(TABLE).delete().neq("id", "00000000-0000-0000-0000-000000000000").then(function () {
        var payload = rows.map(function (r, i) {
          return { user_id: session.user.id, name: r.name, url: normalizeUrl(r.url),
            category: r.category, description: r.description || "", type: r.type || "",
            tags: r.tags || [], favorite: !!r.favorite, sort_order: i };
        });
        return client.from(TABLE).insert(payload);
      }).then(function (result) {
        if (result && result.error) { $("manageNote").textContent = "Import failed: " + result.error.message; return; }
        $("manageNote").textContent = "Imported " + rows.length + " links.";
        return refresh();
      });
    };
    reader.readAsText(file);
  }

  /* ---------- wiring ---------- */

  document.addEventListener("DOMContentLoaded", function () {
    $("globalSearch").addEventListener("input", function () {
      var q = $("globalSearch").value.trim();
      if (q) { showingFavorites = false; currentCategory = null; }
      render();
      if (q) {
        var list = sortedResources().filter(function (r) { return matches(r, q); });
        $("homeView").classList.remove("hidden");
        $("categoryView").classList.add("hidden");
        $("favoritesView").classList.add("hidden");
        var grid = $("categoryGrid");
        grid.innerHTML = "";
        var heading = document.createElement("p");
        heading.className = "muted";
        heading.textContent = list.length + (list.length === 1 ? " match" : " matches") + " for “" + q + "”";
        grid.appendChild(heading);
        var wrap = document.createElement("div");
        wrap.className = "resource-grid";
        wrap.style.gridColumn = "1 / -1";
        renderResourceGrid(wrap, list);
        grid.appendChild(wrap);
        $("resourceCount").textContent = "";
      } else {
        render();
      }
    });
    $("categorySearch").addEventListener("input", render);
    $("backBtn").addEventListener("click", showHome);
    $("backFromFavoritesBtn").addEventListener("click", showHome);
    $("favoritesBtn").addEventListener("click", function () {
      if (showingFavorites) showHome(); else showFavorites();
    });
    $("addResourceBtn").addEventListener("click", function () { openResourceDialog(null); });
    $("signInBtn").addEventListener("click", openAuthDialog);
    $("signOutBtn").addEventListener("click", function () {
      supabase().auth.signOut().then(function () { session = null; render(); setStatus("Signed out. Links are still saved in Supabase."); });
    });

    $("resourceCategory").addEventListener("change", function () {
      var isNew = $("resourceCategory").value === NEW_CATEGORY_VALUE;
      $("newCategoryLabel").classList.toggle("hidden", !isNew);
      if (isNew) $("newCategoryName").focus();
    });
    $("closeDialog").addEventListener("click", function () { $("resourceDialog").close(); });
    $("cancelDialog").addEventListener("click", function () { $("resourceDialog").close(); });
    $("resourceForm").addEventListener("submit", function (event) {
      event.preventDefault();
      var category = $("resourceCategory").value;
      if (category === NEW_CATEGORY_VALUE) {
        category = $("newCategoryName").value.trim();
        if (!category) {
          var err = $("formError");
          err.textContent = "Please type a name for the new category.";
          err.classList.remove("hidden");
          return;
        }
      }
      var fields = {
        name: $("resourceName").value.trim(),
        url: $("resourceUrl").value.trim(),
        category: category,
        description: $("resourceDescription").value.trim(),
        type: $("resourceType").value.trim(),
        tags: parseTags($("resourceTags").value),
        favorite: $("resourceFavorite").checked
      };
      var id = $("resourceId").value || null;
      saveResource(fields, id).then(function () {
        $("resourceDialog").close();
        setStatus("Saved “" + fields.name + "” to Supabase.");
      }).catch(function (e) {
        var errEl = $("formError");
        errEl.textContent = "Could not save: " + e.message;
        errEl.classList.remove("hidden");
      });
    });

    $("confirmCancel").addEventListener("click", function () { $("confirmDialog").close(); });
    $("confirmDelete").addEventListener("click", function () {
      if (!pendingDeleteId) return;
      deleteResource(pendingDeleteId).then(function () {
        setStatus("Deleted. The change is saved in Supabase.");
      }).catch(function (e) { setStatus("Could not delete: " + e.message); });
      pendingDeleteId = null;
    });

    $("closeAuth").addEventListener("click", function () { $("authDialog").close(); });
    $("cancelAuth").addEventListener("click", function () { $("authDialog").close(); });
    $("magicLinkBtn").addEventListener("click", function () {
      var email = $("authEmail").value.trim();
      if (!email) { showAuthError("Enter your email first."); return; }
      supabase().auth.signInWithOtp({ email: email }).then(function (result) {
        if (result.error) { showAuthError(result.error.message); return; }
        var note = $("authNote");
        note.textContent = "Magic link sent to " + email + ". Open it, then come back here — you will be signed in.";
        note.classList.remove("hidden");
      });
    });
    $("authForm").addEventListener("submit", function (event) {
      event.preventDefault();
      var email = $("authEmail").value.trim();
      var password = $("authPassword").value;
      if (!password) { showAuthError("Enter your password, or use “Email me a magic link” instead."); return; }
      supabase().auth.signInWithPassword({ email: email, password: password }).then(function (result) {
        if (result.error) { showAuthError(result.error.message); return; }
        session = result.data.session;
        $("authDialog").close();
        refresh();
      });
    });

    $("manageBtn").addEventListener("click", function () {
      $("manageNote").textContent = mode === "supabase"
        ? "Connected to Supabase."
        : "Supabase is not connected yet — exports still work from the published list.";
      $("manageDialog").showModal();
    });
    $("closeManage").addEventListener("click", function () { $("manageDialog").close(); });
    $("exportBtn").addEventListener("click", exportResources);
    $("reloadBtn").addEventListener("click", function () {
      refresh().then(function () { $("manageNote").textContent = "Reloaded from Supabase."; });
    });
    $("importInput").addEventListener("change", function (event) {
      if (event.target.files && event.target.files[0]) importResources(event.target.files[0]);
      event.target.value = "";
    });

    var client = supabase();
    if (client) {
      client.auth.getSession().then(function (result) {
        session = result.data ? result.data.session : null;
        return refresh();
      });
      client.auth.onAuthStateChange(function (_event, nextSession) {
        session = nextSession;
        refresh();
      });
    } else {
      refresh();
    }
  });

  function showAuthError(message) {
    var err = $("authError");
    err.textContent = message;
    err.classList.remove("hidden");
  }
})();
