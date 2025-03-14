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
    const deleteUserButton = document.getElementById("deleteUserButton");
    const searchForm = document.getElementById("searchForm");
    const searchInput = searchForm.elements["search"];

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
                        row.insertCell(3).textContent = user.program;

                        // Add click event for updating
                        row.addEventListener("click", function(e) {
                            e.preventDefault(); // Prevent any default action
                            e.stopPropagation(); // Stop event bubbling
                            
                            // Populate form fields
                            document.getElementById("updateName").value = user.name;
                            document.getElementById("updateEmail").value = user.email;
                            document.getElementById("updateUserId").value = user.user_id;
                            document.getElementById("updateProgram").value = user.program;
                            
                            // Display the modal
                            updateModal.style.display = "block";
                        });
                    });
                } else if (searchTerm) {
                    usersTableBody.innerHTML = '<tr><td colspan="4">No users found</td></tr>';
                }
            })
            .catch(error => console.error('Error:', error));
    }

    // Fetch all users when the page loads
    fetchUsers();

    // Handle search input event
    searchInput.addEventListener("input", function(event) {
        const searchTerm = searchInput.value;
        fetchUsers(searchTerm);
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
            user_id: removeUserForm.elements["user_id"].value,
            user_email: removeUserForm.elements["user_email"].value
        };

        // Show confirmation dialog
        const confirmed = confirm("Are you sure you want to delete this user?");
        if (!confirmed) {
            return; // Exit if the user cancels the deletion
        }

        try {
            const response = await fetch("/remove_user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
            const result = await response.json();
            alert(result.message);
            if (response.ok) {
                fetchUsers(); // Refresh the table
                removeUserModal.style.display = "none"; // Close the modal
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

    // Handle delete user button click
    deleteUserButton.addEventListener("click", async function() {
        const userId = document.getElementById("updateUserId").value;
        const userEmail = document.getElementById("updateEmail").value;

        // Show confirmation dialog
        const confirmed = confirm("Are you sure you want to delete this user?");
        if (!confirmed) {
            return; // Exit if the user cancels the deletion
        }

        const formData = {
            user_id: userId,
            user_email: userEmail
        };

        try {
            const response = await fetch("/remove_user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (response.ok) {
                alert("User deleted successfully!");
                updateModal.style.display = "none";
                fetchUsers(); // Refresh the table
            } else {
                alert(result.error || "Failed to delete user");
            }
        } catch (error) {
            console.error("Error:", error);
            alert("An error occurred while deleting the user");
        }
    });
});

