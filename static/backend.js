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

    const scheduleModal = document.getElementById("scheduleModal");
    const scheduleTableBody = document.getElementById("scheduleTable").getElementsByTagName("tbody")[0];
    const saveScheduleButton = document.getElementById("saveScheduleButton");

    const updateScheduleTableBody = document.getElementById("updateScheduleTable").getElementsByTagName("tbody")[0];

    let currentFilter = null; // Track the current filter state
    let currentUserId = null; // Track the current user ID for schedule management

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
                        row.insertCell(4).textContent = user.is_active ? 'Active' : 'Archived';
                        const expirationTimeCell = row.insertCell(5);
                        expirationTimeCell.textContent = user.is_active ? user.expiration_time : '';

                        // Add schedules column
                        const schedulesCell = row.insertCell(6);
                        schedulesCell.innerHTML = ""; // Clear existing content
                        if (user.schedules && Object.keys(user.schedules).length > 0) {
                            const scheduleList = document.createElement('ul');
                            for (const [day, periods] of Object.entries(user.schedules)) {
                                const listItem = document.createElement('li');
                                listItem.innerHTML = `<strong>${day}:</strong> ${periods.join(', ')}`;
                                scheduleList.appendChild(listItem);
                            }
                            schedulesCell.appendChild(scheduleList);
                        } else {
                            schedulesCell.textContent = 'No scheduling periods selected';
                        }
                    });
                } else if (searchTerm) {
                    usersTableBody.innerHTML = '<tr><td colspan="7">No users found</td></tr>'; // Update colspan to 7
                }
            })
            .catch(error => console.error('Error:', error));
    }

    // Function to update the schedules column dynamically
    function updateSchedulesColumn(userId, updatedSchedules) {
        const rows = usersTableBody.querySelectorAll("tr");
        rows.forEach(row => {
            const rowUserId = row.cells[2].textContent.trim(); // Get the User ID from the 3rd column
            if (rowUserId === userId) {
                const schedulesCell = row.cells[6]; // Get the Schedules column
                schedulesCell.innerHTML = ""; // Clear the existing content

                if (updatedSchedules && Object.keys(updatedSchedules).length > 0) {
                    const scheduleList = document.createElement('ul');
                    for (const [day, periods] of Object.entries(updatedSchedules)) {
                        const listItem = document.createElement('li');
                        listItem.innerHTML = `<strong>${day}:</strong> ${periods.join(', ')}`;
                        scheduleList.appendChild(listItem);
                    }
                    schedulesCell.appendChild(scheduleList);
                } else {
                    schedulesCell.textContent = 'No scheduling periods selected';
                }
            }
        });
    }

    // Fetch all users when the page loads
    fetchUsers();

    // Handle search input event
    searchInput.addEventListener("input", function (event) {
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
                row.insertCell(5).textContent = result.expiration_time ? new Date(result.expiration_time).toISOString().split('T')[0] : 'No Expiration';
                row.insertCell(6).textContent = 'No schedule'; // Default schedule

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
    closeButtonUpdate.onclick = function () {
        updateModal.style.display = "none";
    }
    closeButtonAdd.onclick = function () {
        addUserModal.style.display = "none";
    }
    closeButtonRemove.onclick = function () {
        removeUserModal.style.display = "none";
    }

    // Close modal when clicking outside
    window.onclick = function (event) {
        if (event.target == updateModal) {
            updateModal.style.display = "none";
        }
        if (event.target == addUserModal) {
            addUserModal.style.display = "none";
        }
        if (event.target == removeUserModal) {
            removeUserModal.style.display = "none";
        }
        if (event.target == scheduleModal) {
            scheduleModal.style.display = "none";
        }
    }

    // Function to populate the schedule table in the update modal
    function populateUpdateScheduleTable(schedule) {
        updateScheduleTableBody.innerHTML = ""; // Clear the table body
        const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]; 
        const periods = ["08:00 - 12:00", "12:00 - 16:00", "16:00 - 20:00", "20:00 - 23:00"];

        days.forEach(day => {
            const row = updateScheduleTableBody.insertRow();
            const dayCell = row.insertCell(0);
            dayCell.textContent = day;

            periods.forEach(period => {
                const cell = row.insertCell();
                const isSelected = schedule[day]?.includes(period); // Check if the period is selected
                cell.innerHTML = `<input type="checkbox" ${isSelected ? "checked" : ""} data-day="${day}" data-period="${period}">`;
            });
        });
    }

    // Function to fetch and populate user data in the update modal
    function populateUpdateModal(user) {
        document.getElementById("updateName").value = user.name;
        document.getElementById("updateEmail").value = user.email;
        document.getElementById("updateUserId").value = user.user_id;
        document.getElementById("updateProgram").value = user.program;

        // Populate the schedule table
        populateUpdateScheduleTable(user.schedules || {});

        // Toggle the Archive/Activate button based on user status
        const archiveUserButton = document.getElementById("archiveUserButton");
        if (user.is_active) {
            archiveUserButton.textContent = "Archive User";
            archiveUserButton.classList.remove("activate-button");
            archiveUserButton.classList.add("delete-button");
        } else {
            archiveUserButton.textContent = "Activate User";
            archiveUserButton.classList.remove("delete-button");
            archiveUserButton.classList.add("activate-button");
        }
    }

    // Handle update form submission
    updateForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const formData = {
            name: document.getElementById("updateName").value,
            email: document.getElementById("updateEmail").value,
            user_id: document.getElementById("updateUserId").value,
            program: document.getElementById("updateProgram").value,
            schedules: {} // Collect updated schedules
        };

        // Collect schedule data from the table
        const checkboxes = updateScheduleTableBody.querySelectorAll("input[type='checkbox']");
        checkboxes.forEach(checkbox => {
            const day = checkbox.getAttribute("data-day");
            const period = checkbox.getAttribute("data-period");

            if (checkbox.checked) {
                if (!formData.schedules[day]) {
                    formData.schedules[day] = [];
                }
                formData.schedules[day].push(period);
            }
        });

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
                updateSchedulesColumn(formData.user_id, formData.schedules); // Update the schedules column dynamically
            } else {
                alert(result.error || "Failed to update user");
            }
        } catch (error) {
            alert("An error occurred while updating the user");
        }
    });

    // Add click event for updating users
    usersTableBody.addEventListener("click", function (event) {
        const row = event.target.closest("tr");
        if (row) {
            const userId = row.cells[2].textContent.trim(); // Get the User ID from the 3rd column

            fetch(`/review_users?user_id=${userId}`) // Pass user_id as a query parameter
                .then(response => response.json())
                .then(users => {
                    if (users.length > 0) {
                        const user = users[0]; // Assuming the first result is the correct user
                        populateUpdateModal(user); // Populate the modal with user data
                        updateModal.style.display = "block"; // Show the modal
                    } else {
                        alert("User not found.");
                    }
                })
                .catch(error => console.error("Error fetching user data:", error));
        }
    });

    // Handle archive/reactivate user button click in the update modal
    document.getElementById("archiveUserButton").addEventListener("click", async function () {
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
                alert(result.message); // Display the corrected message from the backend
                updateModal.style.display = "none";
                fetchUsers(); // Refresh the table
            } else {
                alert(result.error || `Failed to ${action} user`);
            }
        } catch (error) {
            alert(`An error occurred while trying to ${action} the user`);
        }
    });

    // Update button text and style dynamically
    function updateArchiveButton(user) {
        const archiveUserButton = document.getElementById("archiveUserButton");
        if (user.is_active) {
            archiveUserButton.textContent = "Archive User";
            archiveUserButton.classList.remove("activate-button");
            archiveUserButton.classList.add("delete-button");
        } else {
            archiveUserButton.textContent = "Activate User";
            archiveUserButton.classList.remove("delete-button");
            archiveUserButton.classList.add("activate-button");
        }
    }

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

    // Function to fetch and display the schedule for a user
    function fetchUserSchedule(userId) {
        currentUserId = userId;
        fetch(`/get_user_schedule/${userId}`)
            .then(response => response.json())
            .then(schedule => {
                scheduleTableBody.innerHTML = ""; // Clear the table body
                const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
                const periods = ["08:00 - 12:00", "12:00 - 16:00", "16:00 - 20:00", "20:00 - 23:00"];

                days.forEach(day => {
                    const row = scheduleTableBody.insertRow();
                    const dayCell = row.insertCell(0);
                    dayCell.textContent = day;

                    periods.forEach(period => {
                        const cell = row.insertCell();
                        const isSelected = schedule[day]?.includes(period); // Check if the period is selected
                        cell.innerHTML = `<input type="checkbox" ${isSelected ? "checked" : ""} data-day="${day}" data-period="${period}">`;
                    });
                });

                scheduleModal.style.display = "block"; // Show the modal
            })
            .catch(error => console.error("Error fetching schedule:", error));
    }

    // Function to save the updated schedule
    saveScheduleButton.addEventListener("click", function () {
        const schedule = {};
        const checkboxes = scheduleTableBody.querySelectorAll("input[type='checkbox']");

        checkboxes.forEach(checkbox => {
            const day = checkbox.getAttribute("data-day");
            const period = checkbox.getAttribute("data-period");

            if (checkbox.checked) {
                if (!schedule[day]) {
                    schedule[day] = [];
                }
                schedule[day].push(period);
            }
        });

        fetch(`/update_user_schedule/${currentUserId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ schedules: schedule })
        })
            .then(response => response.json())
            .then(data => {
                if (data.message) {
                    alert(data.message);
                    scheduleModal.style.display = "none"; // Close the modal
                    updateSchedulesColumn(currentUserId, schedule); // Update the schedules column dynamically
                } else {
                    alert(data.error || "Failed to save schedule");
                }
            })
            .catch(error => console.error("Error saving schedule:", error));
    });

    // Close the schedule modal
    scheduleModal.querySelector(".close").onclick = function () {
        scheduleModal.style.display = "none";
    };

    // Add double-click event to rows in the user table to open the schedule modal
    usersTableBody.addEventListener("dblclick", function (event) {
        const row = event.target.closest("tr");
        if (row) {
            const userId = row.cells[2].textContent; // Assuming the User ID is in the 3rd column
            fetchUserSchedule(userId);
        }
    });
});
