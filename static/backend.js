document.addEventListener("DOMContentLoaded", function () {
    const addUserForm = document.getElementById("addUserForm");
    const removeUserForm = document.getElementById("removeUserForm");
    const usersTableBody = document.getElementById("usersTable").getElementsByTagName("tbody")[0];
  
    // Define fetchUsers here if you want to reuse it across both blocks
    function fetchUsers(searchTerm = '') {
      let url = '/review_users';
      if (searchTerm) {
        url += `?name=${encodeURIComponent(searchTerm)}`;
      }
      fetch(url)
        .then(response => response.json())
        .then(data => {
          usersTableBody.innerHTML = "";
          if (data.length > 0) {
            data.forEach(user => {
              const row = usersTableBody.insertRow();
              row.insertCell(0).textContent = user.name;
              row.insertCell(1).textContent = user.email;
              row.insertCell(2).textContent = user.user_id;
              row.insertCell(3).textContent = user.swipe_card;
            });
          } else if (searchTerm) {
            usersTableBody.innerHTML = '<tr><td colspan="4">Name doesn\'t exist</td></tr>';
          }
        })
        .catch(error => console.error('Error fetching users:', error));
    }
  
    addUserForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      const formData = {
        name: addUserForm.elements["name"].value,
        email: addUserForm.elements["email"].value,
        user_id: addUserForm.elements["user_id"].value,
        swipe_card: addUserForm.elements["swipe_card"].value
      };
      const response = await fetch("http://127.0.0.1:5000/add_user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const result = await response.json();
      alert(result.message);
      if (response.ok) {
        fetchUsers(); // Refresh the table
      }
      addUserForm.reset();
    });
  
    removeUserForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      const formData = {
        user_id: removeUserForm.elements["user_id"].value,
        user_email: removeUserForm.elements["user_email"].value
      };
      const response = await fetch("http://127.0.0.1:5000/remove_user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const result = await response.json();
      alert(result.message);
      if (response.ok) {
        fetchUsers(); // Refresh the table
      }
      removeUserForm.reset();
    });
  });



document.addEventListener("DOMContentLoaded", function () {
    const addUserForm = document.getElementById("addUserForm");
    const addUserBox = document.getElementById("addUserBox");
    const removeUserForm = document.getElementById("removeUserForm");
    const removeUserBox = document.getElementById("removeUserBox");
    const searchForm = document.getElementById("searchForm");
    const overlay = document.createElement("div");
  
    // Create overlay
    overlay.classList.add("overlay");
    document.body.appendChild(overlay);
  
    // Function to show a form
    function showForm(form) {
      form.style.display = "flex";
      overlay.style.display = "block"; // Show overlay
    }
  
    // Function to hide forms
    function hideForms() {
      addUserForm.style.display = "none";
      removeUserForm.style.display = "none";
      overlay.style.display = "none"; // Hide overlay
    }
  
    // Show "Add User" form
    addUserBox.addEventListener("click", function () {
      showForm(addUserForm);
    });
  
    // Show "Remove User" form
    removeUserBox.addEventListener("click", function () {
      showForm(removeUserForm);
    });
  
    // Hide forms when clicking the overlay
    overlay.addEventListener("click", hideForms);
  
    // Function to fetch users and update the table
    function fetchUsers(searchTerm = '') {
      let url = '/review_users';
      if (searchTerm) {
        url += `?name=${encodeURIComponent(searchTerm)}`;
      }
      fetch(url)
        .then(response => response.json())
        .then(data => {
          const tableBody = document.querySelector("#usersTable tbody");
          tableBody.innerHTML = ""; // Clear existing rows
          if (data.length > 0) {
            data.forEach(user => {
              const row = `
                <tr>
                  <td>${user.name}</td>
                  <td>${user.email}</td>
                  <td>${user.user_id}</td>
                  <td>${user.swipe_card}</td>
                </tr>
              `;
              tableBody.innerHTML += row;
            });
          } else {
            tableBody.innerHTML = '<tr><td colspan="4">Name doesn\'t exist</td></tr>';
          }
        })
        .catch(error => console.error('Error fetching users:', error));
    }
  
    // Fetch all users when the page loads
    fetchUsers();
  
    // Handle search form submission
    searchForm.addEventListener('submit', function (event) {
      event.preventDefault(); // Prevent page reload
      const searchTerm = searchForm.querySelector('input[name="search"]').value.trim();
      fetchUsers(searchTerm);
    });
  });
