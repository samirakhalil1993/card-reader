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

    const showSuperUsersButton = document.getElementById("showSuperUsers"); // Get the Super Users button

    let currentFilter = null; // Track the current filter state
    let currentUserId = null; // Track the current user ID for schedule management

    // Show the add user form when clicking the Add User box
    document.getElementById('addUserBox').addEventListener('click', function () {
        populateAddScheduleTable();
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
    function fetchUsers(searchTerm = '', filter = null) {
        let url = '/review_users';
        const params = new URLSearchParams();
        if (searchTerm) {
            params.append('name', searchTerm);
        }
        if (filter === 1 || filter === 0) {
            params.append('is_active', filter);
        } else if (filter === "super_users") {
            params.append('is_super_user', true); // Add filter for super users
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
                        row.insertCell(4).textContent = user.is_active
                            ? 'Has Access'
                            : `Archived: ${user.archived_date ? new Date(user.archived_date).toISOString().split('T')[0] : ''}`;
                        row.insertCell(5).textContent = user.is_active ? 
                            (user.expiration_time ? user.expiration_time : '') : '';
                        const actionCell = row.insertCell(6);
                        const generateButton = document.createElement('button');
                        generateButton.className = 'generate-code-btn';
                        generateButton.setAttribute('data-userid', user.user_id);
                        generateButton.textContent = 'Generate Code';
                        actionCell.appendChild(generateButton);
                    });
                } else if (searchTerm) {
                    usersTableBody.innerHTML = '<tr><td colspan="7">No users found</td></tr>';
                }
            })
            .catch(error => console.error('Error:', error));
    }

    const codeModal = document.createElement('div');
    codeModal.id = 'codeModal';
    codeModal.className = 'modal';
    codeModal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2>Generated Code</h2>
            <div id="generatedCode" style="font-size: 24px; text-align: center; margin: 20px; padding: 10px; background-color: #f0f0f0; border-radius: 5px;"></div>
            <button id="copyCodeBtn">Copy Code</button>
        </div>
    `;
    document.body.appendChild(codeModal);
    
    const closeCodeModal = codeModal.querySelector('.close');
    closeCodeModal.onclick = function() {
        codeModal.style.display = "none";
    }
    
    const copyCodeBtn = document.getElementById('copyCodeBtn');
    copyCodeBtn.addEventListener('click', function() {
        const codeText = document.getElementById('generatedCode').textContent;
        navigator.clipboard.writeText(codeText).then(() => {
            alert('Code copied to clipboard!');
        }).catch(err => {
            console.error('Could not copy text: ', err);
        });
    });
    
    // Function to generate random 9-digit code
    function generateRandomCode() {
        let code = '';
        for (let i = 0; i < 9; i++) {
            code += Math.floor(Math.random() * 10); // Random digit 0-9
        }
        return code;
    }
    
    // Add event listener for the generate code buttons
    // Add this at the top of your DOMContentLoaded function
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('generate-code-btn')) {
        event.stopPropagation();
        event.preventDefault();
        
        const userId = event.target.getAttribute('data-userid');
        const randomCode = generateRandomCode();
        
        // Display the code in modal
        document.getElementById('generatedCode').textContent = randomCode;
        codeModal.style.display = 'block';
        
        // Update timestamp and code in the database
        fetch('/update_code_timestamp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                random_code: randomCode
            })
        })
        .then(response => response.json())
        .then(data => {
            if (!data.message) {
                console.error('Error updating timestamp:', data.error);
            }
        })
        .catch(error => console.error('Error:', error));
    }
    }, true);

    
    // Close the code modal when clicking outside
    window.onclick = function(event) {
        if (event.target == codeModal) {
            codeModal.style.display = "none";
        }
        // Keep your existing modal close handlers
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
                    const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
                    
                    // Loop through days in correct order
                    dayOrder.forEach(day => {
                        if (updatedSchedules[day]) {
                            const listItem = document.createElement('li');
                            listItem.innerHTML = `<strong>${day}:</strong> ${updatedSchedules[day].join(', ')}`;
                            scheduleList.appendChild(listItem);
                        }
                    });
                    
                    schedulesCell.appendChild(scheduleList);
                }
                else {
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
            name: addUserForm.elements["name"].value.trim(),
            email: addUserForm.elements["email"].value.trim().toLowerCase(),
            user_id: addUserForm.elements["user_id"].value.trim(),
            program: addUserForm.elements["program"].value.trim(),
            schedules: collectAddScheduleData(), // Collect schedule data
            is_super_user: addUserForm.elements["is_super_user"].checked, // Get super user status
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
                fetchUsers(); // Refresh the user table
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
            
            // Add select-all button cell
            const selectAllCell = row.insertCell(0);
            const selectAllBtn = document.createElement('button');
            selectAllBtn.type = 'button';
            selectAllBtn.className = 'select-all-btn';
            selectAllBtn.setAttribute('data-day', day);
            selectAllBtn.title = 'Toggle all time slots for ' + day;
            
            // Initialize button state based on whether all periods are selected for this day
            const allSelected = periods.every(period => schedule[day]?.includes(period));
            selectAllBtn.textContent = allSelected ? '✓' : '';
            
            // Add click handler for the select-all button
            selectAllBtn.onclick = function() {
                const checkboxes = row.querySelectorAll('input[type="checkbox"]');
                
                // Check if all boxes are already checked
                const allChecked = Array.from(checkboxes).every(cb => cb.checked);
                
                // If all are checked, uncheck all; otherwise, check all
                checkboxes.forEach(checkbox => {
                    checkbox.checked = !allChecked;
                });
                
                // Update button appearance
                selectAllBtn.textContent = !allChecked ? '✓' : '';
            };
            
            selectAllCell.appendChild(selectAllBtn);
            
            // Add day name cell
            const dayCell = row.insertCell(1);
            dayCell.textContent = day;
    
            // Add period checkboxes
            periods.forEach(period => {
                const cell = row.insertCell();
                const isSelected = schedule[day]?.includes(period); // Check if the period is selected
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = isSelected;
                checkbox.setAttribute('data-day', day);
                checkbox.setAttribute('data-period', period);
                
                // Add event listener to update the button state when checkbox is clicked
                checkbox.addEventListener('change', function() {
                    const allNowChecked = Array.from(row.querySelectorAll('input[type="checkbox"]')).every(cb => cb.checked);
                    selectAllBtn.textContent = allNowChecked ? '✓' : '';
                });
                
                cell.appendChild(checkbox);
            });
        });
    }
    // Function to fetch and populate user data in the update modal
    function populateUpdateModal(user) {
        document.getElementById("updateName").value = user.name;
        document.getElementById("updateEmail").value = user.email;
        document.getElementById("updateUserId").value = user.user_id;
        document.getElementById("updateProgram").value = user.program;
        document.getElementById("updateIsSuperUser").checked = user.is_super_user; // Populate super user status

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
            program: document.getElementById("updateProgram").value, // Allow custom program input
            schedules: {}, // Collect updated schedules
            is_super_user: document.getElementById("updateIsSuperUser").checked, // Get super user status
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

    // Add event listener for the Super Users button
    showSuperUsersButton.addEventListener("click", function () {
        if (currentFilter === "super_users") {
            currentFilter = null; // Reset filter
            showSuperUsersButton.classList.remove("active");
        } else {
            currentFilter = "super_users"; // Set filter to super users
            showSuperUsersButton.classList.add("active");
            showActiveUsersButton.classList.remove("active");
            showArchivedUsersButton.classList.remove("active");
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

// Populate the schedule table in the "Add User" modal
function populateAddScheduleTable() {
    const addScheduleTableBody = document.getElementById("addScheduleTable").getElementsByTagName("tbody")[0];
    addScheduleTableBody.innerHTML = ""; // Clear the table body
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const periods = ["08:00 - 12:00", "12:00 - 16:00", "16:00 - 20:00", "20:00 - 23:00"];

    days.forEach(day => {
        const row = addScheduleTableBody.insertRow();

        // Add "Select All" button cell
        const selectAllCell = row.insertCell(0);
        const selectAllBtn = document.createElement('button');
        selectAllBtn.type = 'button';
        selectAllBtn.className = 'select-all-btn';
        selectAllBtn.setAttribute('data-day', day);
        selectAllBtn.title = `Select all time slots for ${day}`;
        selectAllCell.appendChild(selectAllBtn);

        // Add event listener for "Select All" button
        selectAllBtn.addEventListener('click', function () {
            const checkboxes = row.querySelectorAll('input[type="checkbox"]');
            const allChecked = Array.from(checkboxes).every(cb => cb.checked); // Check if all are selected
            checkboxes.forEach(checkbox => {
                checkbox.checked = !allChecked; // Toggle all checkboxes
            });

            // Update button appearance
            selectAllBtn.textContent = !allChecked ? '✓' : '';
        });

        // Add day name cell
        const dayCell = row.insertCell(1);
        dayCell.textContent = day;

        // Add period checkboxes
        periods.forEach(period => {
            const cell = row.insertCell();
            cell.innerHTML = `<input type="checkbox" data-day="${day}" data-period="${period}">`;
        });
    });
}

// Collect schedule data from the "Add User" modal
function collectAddScheduleData() {
    const schedule = {};
    const checkboxes = document.getElementById("addScheduleTable").querySelectorAll("input[type='checkbox']");
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
    return schedule;
}
