document.addEventListener("DOMContentLoaded", function () {
    const addUserForm = document.getElementById("addUserForm");
    const removeUserForm = document.getElementById("removeUserForm");
    const usersTableBody = document.getElementById("usersTable").getElementsByTagName("tbody")[0];
    const updateModal = document.getElementById("updateUserModal");
    const addUserModal = document.getElementById("addUserModal");
    const removeUserModal = document.getElementById("removeUserModal");
    const updateForm = document.getElementById("updateUserForm");
    const closeButtonUpdate = updateModal.querySelector(".close");
    const closeButtonAdd = addUserModal.querySelector(".close");
    const closeButtonRemove = removeUserModal.querySelector(".close");
    const archiveUserButton = document.getElementById("archiveUserButton");
    const searchForm = document.getElementById("searchForm");
    const searchInput = searchForm.elements["search"];
    const showActiveUsersButton = document.getElementById("showActiveUsers");
    const showArchivedUsersButton = document.getElementById("showArchivedUsers");

    let currentFilter = null; // Track the current filter state

    // Show the add user form when clicking the Add User box
    document.getElementById('addUserBox').addEventListener('click', function () {
        addUserModal.style.display = 'block'; // Display the modal when clicked
    });

    // Show the remove user form when clicking the Remove User box
    document.getElementById('removeUserBox').addEventListener('click', function () {
        removeUserModal.style.display = 'block'; // Display the modal when clicked
    });

    // Function to validate BTH email
    function validateBthEmail(email) {
        const regex = /^[a-zA-Z]{4}\d{2}@student\.bth\.se$/;
        return regex.test(email);
    }

    // Function to fetch users and update the table
    function fetchUsers(searchTerm = '', isActive = null) {
        let url = '/review_users';
        const params = new URLSearchParams();
        if (searchTerm) {
            params.append('name', searchTerm);
        }
        if (isActive !== null) {
            params.append('is_active', isActive);
        }
        if (params.toString()) {
            url += `?${params.toString()}`;
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
                        row.insertCell(3).textContent = user.program;
                        row.insertCell(4).textContent = user.is_active ? 'Active' : 'Archived'; // Add status column

                        // Add click event for updating
                        row.addEventListener("click", function(e) {
                            e.preventDefault();
                            e.stopPropagation();

                            // Populate form fields
                            document.getElementById("updateName").value = user.name;
                            document.getElementById("updateEmail").value = user.email;
                            document.getElementById("updateUserId").value = user.user_id;
                            document.getElementById("updateProgram").value = user.program;

                            // Display the modal
                            updateModal.style.display = "block";
                            archiveUserButton.textContent = user.is_active ? "Archive User" : "Activate User"; // Change button text based on status
                        });
                    });
                } else if (searchTerm) {
                    usersTableBody.innerHTML = '<tr><td colspan="5">No users found</td></tr>'; // Update colspan to 5
                }
            })
            .catch(error => console.error('Error:', error));
    }

    // Fetch all users when the page loads
    fetchUsers();

    // Handle search input event
    searchInput.addEventListener("input", function(event) {
        const searchTerm = searchInput.value;
        fetchUsers(searchTerm, currentFilter);
    });

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
            const response = await fetch("/add_user", {
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
                row.insertCell(4).textContent = 'Active'; // Default status

                // Add click event for updating
                row.addEventListener("click", function(e) {
                    e.preventDefault(); // Prevent any default action
                    e.stopPropagation(); // Stop event bubbling
                    
                    // Populate form fields
                    document.getElementById("updateName").value = formData.name;
                    document.getElementById("updateEmail").value = formData.email;
                    document.getElementById("updateUserId").value = formData.user_id;
                    document.getElementById("updateProgram").value = formData.program;
                    
                    // Display the modal
                    updateModal.style.display = "block";
                    archiveUserButton.textContent = "Archive User"; // Default button text
                });

                addUserForm.reset();
                addUserModal.style.display = "none"; // Close the modal
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
            user_id: removeUserForm.elements["user_id"].value
        };

        // Show confirmation dialog
        const confirmed = confirm("Are you sure you want to archive this user?");
        if (!confirmed) {
            return; // Exit if the user cancels the archiving
        }

        try {
            const response = await fetch("/archive_user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
            const result = await response.json();
            if (response.ok) {
                alert(result.message);
                fetchUsers(); // Refresh the table
                removeUserModal.style.display = "none"; // Close the modal
            } else {
                alert("Error: " + (result.error || "Something went wrong!"));
            }
            removeUserForm.reset();
        } catch (error) {
            alert("Network error: " + error.message);  // Handle network issues
        }
    });

    // Close modal when clicking (×) button
    closeButtonUpdate.onclick = function() {
        updateModal.style.display = "none";
    }
    closeButtonAdd.onclick = function() {
        addUserModal.style.display = "none";
    }
    closeButtonRemove.onclick = function() {
        removeUserModal.style.display = "none";
    }

    // Close modal when clicking outside
    window.onclick = function(event) {
        if (event.target == updateModal) {
            updateModal.style.display = "none";
        }
        if (event.target == addUserModal) {
            addUserModal.style.display = "none";
        }
        if (event.target == removeUserModal) {
            removeUserModal.style.display = "none";
        }
    }

    // Handle update form submission
    updateForm.addEventListener("submit", async function(e) {
        e.preventDefault();

        const formData = {
            name: document.getElementById("updateName").value,
            email: document.getElementById("updateEmail").value,
            user_id: document.getElementById("updateUserId").value,
            program: document.getElementById("updateProgram").value
        };

        // Validate BTH email
        if (!validateBthEmail(formData.email)) {
            alert("Invalid email address. Only BTH email addresses are allowed.");
            return;
        }

        try {
            const response = await fetch("/update_user", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (response.ok) {
                alert("User updated successfully!");
                updateModal.style.display = "none";
                fetchUsers(); // Refresh the table
            } else {
                alert(result.error || "Failed to update user");
            }
        } catch (error) {
            console.error("Error:", error);
            alert("An error occurred while updating the user");
        }
    });

    // Handle archive user button click in the update modal
    document.getElementById("archiveUserButton").addEventListener("click", async function() {
        const userId = document.getElementById("updateUserId").value;

        // Show confirmation dialog
        const action = archiveUserButton.textContent === "Archive User" ? "archive" : "reactivate";
        const confirmed = confirm(`Are you sure you want to ${action} this user?`);
        if (!confirmed) {
            return; // Exit if the user cancels the action
        }

        const formData = {
            user_id: userId
        };

        const endpoint = action === "archive" ? "/archive_user" : "/reactivate_user";

        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (response.ok) {
                alert(`User ${action}d successfully!`);
                updateModal.style.display = "none";
                fetchUsers(); // Refresh the table
            } else {
                alert(result.error || `Failed to ${action} user`);
            }
        } catch (error) {
            console.error("Error:", error);
            alert(`An error occurred while trying to ${action} the user`);
        }
    });

    // Add event listeners for filter buttons
    showActiveUsersButton.addEventListener("click", function () {
        if (currentFilter === 1) {
            currentFilter = null; // Reset filter
            showActiveUsersButton.classList.remove("active");
        } else {
            currentFilter = 1; // Set filter to active users
            showActiveUsersButton.classList.add("active");
            showArchivedUsersButton.classList.remove("active");
        }
        fetchUsers(searchInput.value, currentFilter);
    });

    showArchivedUsersButton.addEventListener("click", function () {
        if (currentFilter === 0) {
            currentFilter = null; // Reset filter
            showArchivedUsersButton.classList.remove("active");
        } else {
            currentFilter = 0; // Set filter to archived users
            showArchivedUsersButton.classList.add("active");
            showActiveUsersButton.classList.remove("active");
        }
        fetchUsers(searchInput.value, currentFilter);
    });
});
