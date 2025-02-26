document.addEventListener("DOMContentLoaded", function () {
    const addUserForm = document.getElementById("addUserForm");
    const removeUserForm = document.getElementById("removeUserForm");
    const usersTableBody = document.getElementById("usersTable").getElementsByTagName("tbody")[0];

    
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
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(formData)
        });
    
        const result = await response.json();
        alert(result.message);
        
        if (response.ok) {
            const newRow = usersTableBody.insertRow();
            newRow.insertCell(0).textContent = formData.name;
            newRow.insertCell(1).textContent = formData.email;
            newRow.insertCell(2).textContent = formData.user_id;
            newRow.insertCell(3).textContent = formData.swipe_card;
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
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(formData)
        });
    
        const result = await response.json();
        alert(result.message);
    
        if (response.ok) {
            for (let i = 0; i < usersTableBody.rows.length; i++) {
                const row = usersTableBody.rows[i];
                if (row.cells[2].textContent === formData.user_id && row.cells[1].textContent === formData.user_email) {
                    usersTableBody.deleteRow(i);
                    break;
                }
            }
        }
    
        removeUserForm.reset();
    });
});

document.addEventListener("DOMContentLoaded", function () {
    const addUserForm = document.getElementById("addUserForm");
    const addUserBox = document.getElementById("addUserBox");
    const removeUserForm = document.getElementById("removeUserForm");
    const removeUserBox = document.getElementById("removeUserBox");
    const reviewUsersModal = document.getElementById("reviewUsersModal");
    const reviewUsersBox = document.getElementById("reviewUsersBox");
    const overlay = document.createElement("div");

    // Create overlay
    overlay.classList.add("overlay");
    document.body.appendChild(overlay);

    // Function to show a modal
    function showForm(form) {
        form.style.display = "flex";
        overlay.style.display = "block"; // Show overlay
    }

    // Function to hide all modals
    function hideForms() {
        addUserForm.style.display = "none";
        removeUserForm.style.display = "none";
        reviewUsersModal.style.display = "none";
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

    // Show "Review Users" modal
    reviewUsersBox.addEventListener("click", function () {
        showForm(reviewUsersModal);
        fetchUsers(); // Load users when the modal opens
    });

    // Hide forms when clicking the overlay
    overlay.addEventListener("click", hideForms);

    // Function to fetch users and populate the table
    function fetchUsers() {
        fetch('/review_users')
            .then(response => response.json())
            .then(data => {
                let tableBody = document.querySelector("#usersTable tbody");
                tableBody.innerHTML = ""; // Clear old data

                data.forEach(user => {
                    let row = `
                        <tr>
                            <td>${user.name}</td>
                            <td>${user.email}</td>
                            <td>${user.user_id}</td>
                            <td>${user.swipe_card}</td>
                        </tr>
                    `;
                    tableBody.innerHTML += row;
                });
            })
            .catch(error => console.error('Error fetching users:', error));
    }
});
