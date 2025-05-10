document.addEventListener("DOMContentLoaded", function () {
    const addUserForm = document.getElementById("addUserForm");
    const removeUserForm = document.getElementById("removeUserForm");
    const adminInfoForm = document.getElementById("adminInfoForm");
    const usersTableBody = document.getElementById("usersTable").getElementsByTagName("tbody")[0];
    const updateModal = document.getElementById("updateUserModal");
    const addUserModal = document.getElementById("addUserModal");
    const removeUserModal = document.getElementById("removeUserModal");
    const adminInfoModal = document.getElementById("adminInfoModal");
    const updateForm = document.getElementById("updateUserForm");
    const closeButtonUpdate = updateModal.querySelector(".close");
    const closeButtonAdd = addUserModal.querySelector(".close");
    const closeButtonRemove = removeUserModal.querySelector(".close");
    const closeButtonAdmin = adminInfoModal.querySelector(".close");
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
    const showUserLoginsButton = document.getElementById("showUserLogins");
    const UserLoginsContainer = document.getElementById("UserLoginsContainer");
    const UserLoginsBody = document.querySelector("#UserLogins tbody");

    let currentFilter = null; // Track the current filter state
    let currentUserId = null; // Track the current user ID for schedule management
    let currentPage = 1; // Track the current page
    const perPage = 7; // Number of items per page

    // Show the add user form when clicking the Add User box
    document.getElementById('addUserBox').addEventListener('click', function () {
        populateAddScheduleTable();
        addUserModal.style.display = 'block'; // Display the modal when clicked
    });

    // Show the remove user form when clicking the Remove User box
    document.getElementById('removeUserBox').addEventListener('click', function () {
        removeUserModal.style.display = 'block'; // Display the modal when clicked
    });

    // Show the admin info form when clicking the Admin Info box
    document.getElementById('adminInfoBox').addEventListener('click', function () {
        // Fetch current admin info if it exists
        populateAdminForm();
        adminInfoModal.style.display = 'block'; // Display the modal when clicked
    });

    // Function to populate admin form with existing admin data
    function populateAdminForm() {
        // Fetch the current admin user if it exists
        fetch('/review_users?is_admin=true')
            .then(response => response.json())
            .then(admins => {
                if (admins.length > 0) {
                    const admin = admins[0];
                    document.getElementById("adminInfoForm").elements["admin_name"].value = admin.name;
                    document.getElementById("adminInfoForm").elements["admin_email"].value = admin.email;
                    document.getElementById("adminInfoForm").elements["admin_id"].value = admin.user_id;
                }
            })
            .catch(error => console.error('Error fetching admin details:', error));
    }

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
        }
        if (params.toString()) {
            url += `?${params.toString()}`;
        }
        fetch(url)
            .then(response => response.json())
            .then(data => {
                usersTableBody.innerHTML = ""; // Clear the table body
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

                        // Render schedules with hover functionality
                        const schedulesCell = row.insertCell(6);
                        const viewScheduleText = document.createElement('div');
                        viewScheduleText.className = 'view-schedule-box'; // Apply the blue box styling
                        viewScheduleText.textContent = 'View Schedule';

                        const scheduleBox = document.createElement('div');
                        scheduleBox.className = 'schedule-box';
                        scheduleBox.style.display = 'none'; // Initially hidden

                        if (user.schedules && Object.keys(user.schedules).length > 0) {
                            const scheduleList = document.createElement('ul');
                            const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
                            
                            // Loop through days in correct order
                            dayOrder.forEach(day => {
                                if (user.schedules[day]) {
                                    const listItem = document.createElement('li');
                                    listItem.innerHTML = `<strong>${day}:</strong> ${user.schedules[day].join(', ')}`;
                                    scheduleList.appendChild(listItem);
                                }
                            });
                            
                            scheduleBox.appendChild(scheduleList);
                        } else {
                            scheduleBox.textContent = 'No scheduling periods selected';
                        }

                        // Add hover events to show and hide the schedule box
                        viewScheduleText.addEventListener('mouseover', () => {
                            scheduleBox.style.display = 'block';
                        });
                        viewScheduleText.addEventListener('mouseout', () => {
                            scheduleBox.style.display = 'none';
                        });

                        schedulesCell.appendChild(viewScheduleText);
                        schedulesCell.appendChild(scheduleBox);

                        // Add the action column with the generate code button
                        const actionCell = row.insertCell(7);
                        const generateButton = document.createElement('button');
                        generateButton.className = 'generate-code-btn';
                        generateButton.setAttribute('data-userid', user.user_id);
                        generateButton.textContent = 'Generate Code';
                        actionCell.appendChild(generateButton);
                    });
                } else if (searchTerm) {
                    usersTableBody.innerHTML = '<tr><td colspan="8">No users found</td></tr>';
                }
            })
            .catch(error => console.error('Error:', error));
    }

    const codeModal = document.createElement('div');
    codeModal.id = 'codeModal';
    codeModal.className = 'modal';
    codeModal.innerHTML = `
        <div class="modal-content">
            <span class="close">×</span>
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
        for (let i = 0; i < 5; i++) {
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
        if (event.target == adminInfoModal) {
            adminInfoModal.style.display = "none";
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

                const viewScheduleText = document.createElement('div');
                viewScheduleText.className = 'view-schedule-box'; // Apply the blue box styling
                viewScheduleText.textContent = 'View Schedule';

                const scheduleBox = document.createElement('div');
                scheduleBox.className = 'schedule-box';
                scheduleBox.style.display = 'none'; // Initially hidden

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
                    
                    scheduleBox.appendChild(scheduleList);
                } else {
                    scheduleBox.textContent = 'No scheduling periods selected';
                }

                // Add hover events to show and hide the schedule box
                viewScheduleText.addEventListener('mouseover', () => {
                    scheduleBox.style.display = 'block';
                });
                viewScheduleText.addEventListener('mouseout', () => {
                    scheduleBox.style.display = 'none';
                });

                schedulesCell.appendChild(viewScheduleText);
                schedulesCell.appendChild(scheduleBox);
            }
        });
    }

    // Fetch all users when the page loads
    fetchUsers();

    searchInput.addEventListener("input", function (event) {
        const searchTerm = searchInput.value;
    
        if (currentFilter === "user_logins") {
            // Fetch user logins when the UserLogins section is active
            fetchUserLogins(currentPage, searchTerm);
        } else {
            // Fetch users for other filters (e.g., active, archived, super users)
            fetchUsers(searchTerm, currentFilter);
        }
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
            temporary_status: '' // Default value for temporary_status
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

    // Handle admin info form submission
    adminInfoForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        // Show enhanced confirmation dialog
        const confirmed = confirm(
            "⚠️ WARNING ⚠️\n\n" +
            "You are about to add or update the system administrator.\n\n" +
            "Any existing admin will be COMPLETELY REMOVED from the database.\n\n" +
            "Are you sure you want to continue?"
        );
        
        if (!confirmed) {
            return; // Exit if the admin cancels the update
        }

        const formData = {
            name: adminInfoForm.elements["admin_name"].value.trim(),
            email: adminInfoForm.elements["admin_email"].value.trim(),
            user_id: adminInfoForm.elements["admin_id"].value.trim(),
            is_admin: true,  // Mark as admin
            is_super_user: true, // Admin is always a super user
            schedules: {},  // No schedules for admin
            temporary_status: "Super User - Always Active", // Non-null value for temporary_status
            status2: 1 // Set status2 to 1 for admin/superuser
        };

        try {
            const response = await fetch("/add_admin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (response.ok) {
                alert(result.message);
                fetchUsers(); // Refresh the user table
                adminInfoForm.reset();
                adminInfoModal.style.display = "none"; // Close the modal
            } else {
                alert("Error: " + (result.error || "Something went wrong!"));
            }

        } catch (error) {
            alert("Network error: " + error.message);
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
    closeButtonAdmin.onclick = function () {
        adminInfoModal.style.display = "none";
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
        if (event.target == adminInfoModal) {
            adminInfoModal.style.display = "none";
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
            temporary_status: '' // Default value for temporary_status
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

    // Function to handle button activation
    function activateButton(button) {
        // Remove the 'active' class from all filter buttons
        document.querySelectorAll(".filter-button").forEach(btn => btn.classList.remove("active"));

        // Add the 'active' class to the clicked button
        button.classList.add("active");
    }

    // Add event listener for the Active Users button
    showActiveUsersButton.addEventListener("click", function () {
        activateButton(this); // Set this button as active
        currentFilter = 1; // Set filter for active users
        fetchUsers(searchInput.value, currentFilter); // Fetch active users
        toggleTableVisibility(false); // Show the users table
    });

    // Add event listener for the Archived Users button
    showArchivedUsersButton.addEventListener("click", function () {
        activateButton(this); // Set this button as active
        currentFilter = 0; // Set filter for archived users
        fetchUsers(searchInput.value, currentFilter); // Fetch archived users
        toggleTableVisibility(false); // Show the users table
    });

    // Add event listener for the Super Users button
    showSuperUsersButton.addEventListener("click", function () {
        activateButton(this); // Set this button as active
        currentFilter = "super_users"; // Set filter for super users
        fetchSuperUsers(); // Fetch super users
        toggleTableVisibility(false); // Show the users table
    });

    // Add event listener for the UserLogins button
    showUserLoginsButton.addEventListener("click", function () {
        activateButton(this); // Set this button as active
        currentFilter = "user_logins"; // Set filter for user logins
        fetchUserLogins(); // Fetch user logins
        toggleTableVisibility(true); // Show the UserLogins table
    });

    // Function to fetch super users
    function fetchSuperUsers() {
        const url = '/review_users?is_super_user=true'; // Add the is_super_user filter
        fetch(url)
            .then(response => response.json())
            .then(data => {
                usersTableBody.innerHTML = ""; // Clear the table body
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

                        // Render schedules with hover functionality
                        const schedulesCell = row.insertCell(6);
                        const viewScheduleText = document.createElement('div');
                        viewScheduleText.className = 'view-schedule-box'; // Apply the blue box styling
                        viewScheduleText.textContent = 'View Schedule';

                        const scheduleBox = document.createElement('div');
                        scheduleBox.className = 'schedule-box';
                        scheduleBox.style.display = 'none'; // Initially hidden

                        if (user.schedules && Object.keys(user.schedules).length > 0) {
                            const scheduleList = document.createElement('ul');
                            const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
                            
                            // Loop through days in correct order
                            dayOrder.forEach(day => {
                                if (user.schedules[day]) {
                                    const listItem = document.createElement('li');
                                    listItem.innerHTML = `<strong>${day}:</strong> ${user.schedules[day].join(', ')}`;
                                    scheduleList.appendChild(listItem);
                                }
                            });
                            
                            scheduleBox.appendChild(scheduleList);
                        } else {
                            scheduleBox.textContent = 'No scheduling periods selected';
                        }

                        // Add hover events to show and hide the schedule box
                        viewScheduleText.addEventListener('mouseover', () => {
                            scheduleBox.style.display = 'block';
                        });
                        viewScheduleText.addEventListener('mouseout', () => {
                            scheduleBox.style.display = 'none';
                        });

                        schedulesCell.appendChild(viewScheduleText);
                        schedulesCell.appendChild(scheduleBox);

                        // Add the action column with the generate code button
                        const actionCell = row.insertCell(7);
                        const generateButton = document.createElement('button');
                        generateButton.className = 'generate-code-btn';
                        generateButton.setAttribute('data-userid', user.user_id);
                        generateButton.textContent = 'Generate Code';
                        actionCell.appendChild(generateButton);
                    });
                } else {
                    usersTableBody.innerHTML = '<tr><td colspan="8">No superusers found</td></tr>';
                }
            })
            .catch(error => console.error('Error fetching superusers:', error));
    }

    // Function to fetch and display the schedule for a user
    function fetchUserSchedule(userId) {
        currentUserId = userId;
        fetch(`/get_user_schedule/${userId}`)
            .then(response => response.json())
            .then(schedule => {
                scheduleTableBody.innerHTML = ""; // Clear the table body
                const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
                const periods = ["08:00-10:00", "10:00-12:00", "12:00-14:00", "14:00-16:00", "16:00-18:00"];

                days.forEach(day => {
                    const row = document.createElement('tr');
                    const dayCell = document.createElement('td');
                    dayCell.textContent = day;
                    row.appendChild(dayCell);

                    periods.forEach(period => {
                        const cell = document.createElement('td');
                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.setAttribute('data-day', day);
                        checkbox.setAttribute('data-period', period);

                        // Check the box if the user is a superuser or the period is in the schedule
                        if (schedule.is_super_user || (schedule[day] && schedule[day].includes(period))) {
                            checkbox.checked = true;
                        }

                        cell.appendChild(checkbox);
                        row.appendChild(cell);
                    });

                    scheduleTableBody.appendChild(row);
                });
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

    function fetchUserLogins(page = 1, searchQuery = '') {
        console.log("Fetching user logins for page:", page, "with search query:", searchQuery);
        fetch(`/UserLogins?page=${page}&per_page=${perPage}&search=${encodeURIComponent(searchQuery)}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("User logins fetched:", data);

                // Update the current page
                currentPage = data.current_page;

                // Update the table
                UserLoginsBody.innerHTML = ""; // Clear the table body

                if (data.logs.length > 0) {
                    data.logs.forEach(log => {
                        const row = UserLoginsBody.insertRow();
                        row.insertCell(0).textContent = log.id;
                        row.insertCell(1).textContent = log.user_id;
                        row.insertCell(2).textContent = log.name || "N/A";
                        row.insertCell(3).textContent = log.timestamp;
                        row.insertCell(4).textContent = log.status;
                        row.insertCell(5).textContent = log.method;
                        row.insertCell(6).textContent = log.message;
                    });
                } else {
                    UserLoginsBody.innerHTML = '<tr><td colspan="7">No login/logout history found</td></tr>';
                }

                // Update pagination controls
                document.getElementById("paginationInfo").textContent = `Page ${data.current_page} of ${data.pages}`;
                document.getElementById("prevPage").disabled = data.current_page === 1;
                document.getElementById("nextPage").disabled = data.current_page === data.pages;
            })
            .catch(error => console.error('Error fetching user logins:', error));
    }

    document.getElementById("prevPage").addEventListener("click", function () {
        if (currentPage > 1) {
            console.log("Previous button clicked, fetching page:", currentPage - 1);
            fetchUserLogins(currentPage - 1); // Fetch the previous page
        }
    });

    document.getElementById("nextPage").addEventListener("click", function () {
        console.log("Next button clicked, fetching page:", currentPage + 1);
        console.log("Current page before fetching:", currentPage);
        fetchUserLogins(currentPage + 1);
        console.log("Current page after fetching:", currentPage);
    });

    function toggleTableVisibility(showLogins) {
        const usersTable = document.querySelector(".review-users-box");
        const userLoginsTable = document.getElementById("UserLoginsContainer");

        if (showLogins) {
            usersTable.style.display = "none";
            userLoginsTable.style.display = "block";
        } else {
            usersTable.style.display = "block";
            userLoginsTable.style.display = "none";
        }
    }

    document.getElementById("showUserLogins").addEventListener("click", function () {
        toggleTableVisibility(true);
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