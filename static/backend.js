document.addEventListener("DOMContentLoaded", function () {
    const addUserForm = document.getElementById("addUserForm");
    const removeUserForm = document.getElementById("removeUserForm");
    const usersTableBody = document.getElementById("usersTable").getElementsByTagName("tbody")[0];

    // Function to validate BTH email
    function validateBthEmail(email) {
        return email.endsWith('@student.bth.se');
    }

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
              row.insertCell(3).textContent = user.program; // Add program to the table
            });
          } else if (searchTerm) {
            usersTableBody.innerHTML = '<tr><td colspan="4">Name doesn\'t exist</td></tr>';
          }
        })
        .catch(error => console.error('Error fetching users:', error));
    }

    // Fetch all users when the page loads
    fetchUsers();

    addUserForm.addEventListener("submit", async function (event) {
      event.preventDefault();
  
      const formData = {
          name: addUserForm.elements["name"].value,
          email: addUserForm.elements["email"].value,
          user_id: addUserForm.elements["user_id"].value,
          program: addUserForm.elements["program"].value // Include program in form data
      };

      // Client-side validation for BTH email
      if (!validateBthEmail(formData.email)) {
          alert("Invalid email address. Only BTH email addresses are allowed.");
          return;
      }
  
      try {
          const response = await fetch("http://127.0.0.1:5000/add_user", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(formData)
          });
  
          const result = await response.json();
  
          if (response.ok) {
              alert(result.message);  // Show success message
              // Add the new user to the table immediately
              const row = usersTableBody.insertRow();
              row.insertCell(0).textContent = formData.name;
              row.insertCell(1).textContent = formData.email;
              row.insertCell(2).textContent = formData.user_id;
              row.insertCell(3).textContent = formData.program; // Add program to the table
              addUserForm.reset();
          } else {
              alert("Error: " + (result.error || "Something went wrong!"));  // Handle errors properly
          }
  
      } catch (error) {
          alert("Network error: " + error.message);  // Handle network issues
      }
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
                  <td>${user.program}</td> <!-- Add program to the table -->
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

document.addEventListener("DOMContentLoaded", function () {
  const usersTableBody = document.getElementById("usersTable").getElementsByTagName("tbody")[0];

  // Function to fetch users and update the table
  function fetchUsers() {
      fetch("/review_users")
          .then(response => response.json())
          .then(data => {
              usersTableBody.innerHTML = ""; // Clear existing rows
              if (data.length > 0) {
                  data.forEach(user => {
                      const row = usersTableBody.insertRow();
                      row.insertCell(0).textContent = user.name;
                      row.insertCell(1).textContent = user.email;
                      row.insertCell(2).textContent = user.user_id;
                      row.insertCell(3).textContent = user.program; // Add program to the table

                      // Add event listener for click-to-delete
                      row.addEventListener("click", function () {
                          deleteUser(user.user_id, user.email);
                      });
                  });
              } else {
                  usersTableBody.innerHTML = '<tr><td colspan="4">No users found</td></tr>';
              }
          })
          .catch(error => console.error("Error fetching users:", error));
  }

  // Function to delete a user when clicking a row
  function deleteUser(userId, email) {
      if (confirm("Are you sure you want to delete this user?")) {
          fetch("/remove_user", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ user_id: userId, user_email: email })
          })
          .then(response => response.json())
          .then(result => {
              alert(result.message || result.error);
              fetchUsers(); // Refresh the table
          })
          .catch(error => console.error("Error deleting user:", error));
      }
  }

  // Fetch all users when the page loads
  fetchUsers();
});

document.addEventListener("DOMContentLoaded", function () {
  const removeUserForm = document.getElementById("removeUserForm");

  // Ensure the form exists before adding an event listener
  if (removeUserForm) {
      removeUserForm.addEventListener("submit", async function (event) {
          event.preventDefault();

          const userId = removeUserForm.elements["user_id"].value;
          const userEmail = removeUserForm.elements["user_email"].value;

          // Ask for confirmation before proceeding
          if (!confirm(`Are you sure you want to delete user with ID: ${userId}?`)) {
              return; // Stop if user cancels
          }

          const formData = {
              user_id: userId,
              user_email: userEmail
          };

          try {
              fetch("/remove_user", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(formData)
              });

              const result = await response.json();
              alert(result.message || result.error);

              if (response.ok) {
                  fetchUsers(); // Refresh the table after deletion
              }
              removeUserForm.reset();
          } catch (error) {
              console.error("Error deleting user:", error);
          }
      });
  }
});
