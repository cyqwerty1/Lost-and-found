// Full updated lost.js - Clean Version
document.addEventListener("DOMContentLoaded", () => {
  // --- Supabase initialization ---
const SUPABASE_URL = "https://auudknvvbadwwoyaudil.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1dWRrbnZ2YmFkd3dveWF1ZGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNDkxMTQsImV4cCI6MjA4OTcyNTExNH0.Qu-XcADVETSXlGeX58QM93rET_D0TSJRa3T2_Z-eJNI";
let supabase = null;

  try {
    if (typeof createClient === "function") {
      supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    } else if (window.supabase && typeof window.supabase.createClient === "function") {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
  } catch (err) {
    console.error("Supabase init error:", err);
  }

  console.log("supabase initialized?", !!supabase);

  // --- Modal controls ---
  const reportBtn = document.getElementById("reportBtn");
  const reportModal = document.getElementById("reportModal");
  const closeModal = document.getElementById("closeModal");

  if (reportBtn && reportModal) {
    reportBtn.addEventListener("click", () => {
      reportModal.style.display = "flex";
    });
  }

  if (closeModal && reportModal) {
    closeModal.addEventListener("click", () => {
      reportModal.style.display = "none";
    });
  }

  // --- Image preview ---
  const imageUpload = document.getElementById("imageUpload");
  const imagePreview = document.getElementById("imagePreview");
  if (imageUpload && imagePreview) {
    imageUpload.addEventListener("change", () => {
      const file = imageUpload.files[0];
      if (!file) {
        imagePreview.style.display = "none";
        imagePreview.src = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        imagePreview.src = e.target.result;
        imagePreview.style.display = "block";
      };
      reader.readAsDataURL(file);
    });
  }

  // --- Display helper (FIXED: item vs items typo) ---
  function displayItemInto(containerEl, item) {
    if (!containerEl) return;
    const card = document.createElement("div");
    card.className = "item-card";
    card.innerHTML = `
      <img src="${item.image_url || ''}" alt="Item Image">
      <div class="item-content">
        <h3>${item.title || "Item"}</h3>
        <p style="margin:.25rem 0"><b>Contact:</b> ${item.phone || ""}</p>
        <p style="margin:.25rem 0"><b>Description:</b> ${item.description || ""}</p>
        <span class="lost">Lost</span>
      </div>
    `;
    containerEl.appendChild(card);
  }

async function loadItems() {
    const campusFilter = document.getElementById("campusFilter")?.value;
    const campuses = ["Binangonan", "Cainta", "Angono", "Taytay", "Antipolo", "Cogeo"];
    
    // 1. Linisin muna lahat ng grids at ipakita/itago ang sections base sa filter
    campuses.forEach(campus => {
        const grid = document.getElementById(`grid-${campus}`);
        const section = document.getElementById(`section-${campus}`);
        if (grid) grid.innerHTML = ""; // Clear contents
        
        // Kung "All" ang filter, ipakita lahat ng sections. 
        // Kung may specific campus, ipakita lang yung napili.
        if (section) {
            if (campusFilter === "All" || campusFilter === campus) {
                section.style.display = "block";
            } else {
                section.style.display = "none";
            }
        }
    });

    if (!supabase) return;

    try {
        let query = supabase.from("items").select("*");

        if (campusFilter && campusFilter !== "All") {
            query = query.eq('campus', campusFilter);
        }

        const { data, error } = await query.order("id", { ascending: false });
        if (error) throw error;

        // 2. I-distribute ang items sa tamang grid
        data.forEach(item => {
            const targetGrid = document.getElementById(`grid-${item.campus}`);
            if (targetGrid) {
                displayItemInto(targetGrid, item);
            }
        });

        // 3. CHECKER: Pagkatapos ng loop, tingnan kung aling grid ang walang laman
        campuses.forEach(campus => {
            const grid = document.getElementById(`grid-${campus}`);
            const section = document.getElementById(`section-${campus}`);
            
            // Kung ang section ay visible (display block) pero walang laman ang grid
            if (section && section.style.display === "block" && grid && grid.children.length === 0) {
                grid.innerHTML = `<p style="color: #64748b; font-style: italic; padding: 20px;">No reported items found in ${campus} campus.</p>`;
            }
        });

    } catch (err) {
        console.error("Fetch error:", err);
    }
}

  // --- Post item function ---
  async function postItem() {
    const postBtn = document.getElementById("postBtn");
    const categoryInput = document.getElementById("categoryInput");
    const campusInput = document.getElementById("campusInput");
    const phoneInput = document.getElementById("phoneInput");
    const messageInput = document.getElementById("messageInput");

    const category = categoryInput?.value?.trim();
    const campus = campusInput?.value?.trim();
    const phone = phoneInput?.value?.trim();
    const message = messageInput?.value?.trim();

    if (!category || !campus || !phone || !message || !imageUpload.files[0]) {
      alert("Please fill all required fields and upload an image.");
      return;
    }

    if (postBtn) {
      postBtn.disabled = true;
      postBtn.innerText = "Posting...";
    }

    try {
      const file = imageUpload.files[0];
      const fileName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;

      // 1. Upload Image
      const { data: uploadData, error: uploadError } = await supabase.storage.from("images").upload(fileName, file);
      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: publicData } = supabase.storage.from("images").getPublicUrl(fileName);
      const imageUrl = publicData?.publicUrl;

      // 3. Insert Row
      const row = {
        title: category,
        description: message,
        status: "lost",
        campus: campus,
        phone: phone,
        image_url: imageUrl
      };

      const { error: insertError } = await supabase.from("items").insert([row]);
      if (insertError) throw insertError;

      alert("Item posted successfully.");
      reportModal.style.display = "none";
      
      // Reset form
      imageUpload.value = "";
      imagePreview.style.display = "none";
      categoryInput.value = "";
      campusInput.value = "";
      phoneInput.value = "";
      messageInput.value = "";

    } catch (err) {
      console.error("postItem error", err);
      alert("Failed to post: " + err.message);
    } finally {
      if (postBtn) {
        postBtn.disabled = false;
        postBtn.innerText = "Post";
      }
    }
  }

  // Bindings
  const postButtonEl = document.getElementById("postBtn");
  if (postButtonEl) postButtonEl.addEventListener("click", postItem);

  const searchBtn = document.getElementById("searchBtn");
  if (searchBtn) searchBtn.addEventListener("click", loadItems);

  // Initial load
  loadItems();

  // Realtime subscribe WITH DEBOUNCE (prevent double-load)
  let realtimeTimeout;
  if (supabase) {
    supabase
      .channel("items-realtime")
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'items' }, () => {
        clearTimeout(realtimeTimeout);
        realtimeTimeout = setTimeout(() => loadItems(), 800);
      })
      .subscribe();
  }

  // Expose loadItems globally for the onchange event in HTML
  window.loadItems = loadItems;
});