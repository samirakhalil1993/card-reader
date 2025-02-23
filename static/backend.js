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
