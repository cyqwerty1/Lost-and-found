// Full updated home.js - Realtime Integrated
document.addEventListener("DOMContentLoaded", () => {
  // --- Supabase initialization (Matched with lost.js) ---
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

  const itemsContainer = document.getElementById('itemsContainer');

  // --- Helper: Create Card HTML (Matched to your UI) ---
  const createCardHTML = (item) => {
    const statusClass = item.status.toLowerCase() === 'lost' ? 'status-lost' : 'status-found';
    return `
      <div class="item-card">
          <img src="${item.image_url}" alt="${item.title}">
          <h3>${item.title}</h3>
          <p style="margin:.25rem 0"> <b>Campus:</b> ${item.campus}</p>
          <p style="margin:.25rem 0"> <b>Contact:</b> ${item.phone}</p>
          <p style="margin:.25rem 0"> <b>Description:</b> ${item.description}</p>
          <span class="lost ${statusClass}">${item.status}</span>
      </div>
    `;
  };

  // --- 1. Initial Load: Fetch the 3 most recent items ---
  const fetchRecentItems = async () => {
    if (!supabase) return;

    const { data, error } = await supabase
      .from('items') // Make sure your table is named 'items'
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);

    if (error) {
      console.error("Error fetching items:", error);
    } else if (data) {
      itemsContainer.innerHTML = data.map(item => createCardHTML(item)).join('');
    }
  };

  // --- 2. Realtime Listener: Listen for new posts ---
  const setupRealtime = () => {
    if (!supabase) return;

    supabase
      .channel('home-recent-updates')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'items' }, 
        (payload) => {
          console.log("New item detected via Realtime:", payload.new);
          
          // Create the new card element
          const newCardHTML = createCardHTML(payload.new);
          
          // Add to the top of the grid
          itemsContainer.insertAdjacentHTML('afterbegin', newCardHTML);
          
          // Keep only the 3 most recent items in the display
          if (itemsContainer.children.length > 3) {
            itemsContainer.lastElementChild.remove();
          }
        }
      )
      .subscribe();
  };

  // Run the logic
  if (supabase) {
    fetchRecentItems();
    setupRealtime();
  } else {
    console.error("Supabase failed to initialize. Realtime disabled.");
  }
});