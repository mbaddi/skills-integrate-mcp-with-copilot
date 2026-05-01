document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const adminForm = document.getElementById("admin-form");
  const adminNameInput = document.getElementById("admin-name");
  const adminDescriptionInput = document.getElementById("admin-description");
  const adminScheduleInput = document.getElementById("admin-schedule");
  const adminMaxParticipantsInput = document.getElementById("admin-max-participants");
  const originalNameInput = document.getElementById("original-name");
  const cancelEditButton = document.getElementById("cancel-edit");
  const messageDiv = document.getElementById("message");

  let editingActivity = null;

  function displayMessage(text, type = "info") {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function resetAdminForm() {
    adminForm.reset();
    originalNameInput.value = "";
    editingActivity = null;
    adminNameInput.disabled = false;
    cancelEditButton.classList.add("hidden");
  }

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      activitiesList.innerHTML = "";
      activitySelect.innerHTML = `<option value="">-- Select an activity --</option>`;

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";
        activityCard.dataset.maxParticipants = details.max_participants;

        const spotsLeft = details.max_participants - details.participants.length;

        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
          <div class="admin-actions">
            <button class="edit-activity-btn" data-activity="${name}" type="button">Edit</button>
            <button class="delete-activity-btn" data-activity="${name}" type="button">Delete</button>
          </div>
        `;

        activitiesList.appendChild(activityCard);

        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });

      document.querySelectorAll(".delete-activity-btn").forEach((button) => {
        button.addEventListener("click", handleDeleteActivity);
      });

      document.querySelectorAll(".edit-activity-btn").forEach((button) => {
        button.addEventListener("click", handleEditActivity);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function handleDeleteActivity(event) {
    const activity = event.target.getAttribute("data-activity");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        displayMessage(result.message, "success");
        fetchActivities();
      } else {
        displayMessage(result.detail || "Could not delete activity", "error");
      }
    } catch (error) {
      displayMessage("Failed to delete activity. Please try again.", "error");
      console.error("Error deleting activity:", error);
    }
  }

  function handleEditActivity(event) {
    const activity = event.target.getAttribute("data-activity");
    const card = event.target.closest(".activity-card");
    const description = card.querySelector("p:nth-of-type(1)").textContent;
    const scheduleRow = card.querySelector("p:nth-of-type(2)").textContent;
    const schedule = scheduleRow.replace("Schedule: ", "");

    editingActivity = activity;
    originalNameInput.value = activity;
    adminNameInput.value = activity;
    adminDescriptionInput.value = description;
    adminScheduleInput.value = schedule;
    adminMaxParticipantsInput.value = card.dataset.maxParticipants || "";
    adminNameInput.disabled = true;
    cancelEditButton.classList.remove("hidden");
    adminDescriptionInput.focus();
  }

  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        displayMessage(result.message, "success");
        fetchActivities();
      } else {
        displayMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      displayMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        displayMessage(result.message, "success");
        signupForm.reset();
        fetchActivities();
      } else {
        displayMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      displayMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  adminForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = adminNameInput.value.trim();
    const description = adminDescriptionInput.value.trim();
    const schedule = adminScheduleInput.value.trim();
    const maxParticipants = Number(adminMaxParticipantsInput.value);

    if (!name || !description || !schedule || !maxParticipants) {
      displayMessage("All admin fields are required.", "error");
      return;
    }

    const payload = {
      description,
      schedule,
      max_participants: maxParticipants,
    };

    try {
      let response;

      if (editingActivity) {
        response = await fetch(
          `/activities/${encodeURIComponent(editingActivity)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
      } else {
        response = await fetch(
          `/activities/${encodeURIComponent(name)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, participants: [] }),
          }
        );
      }

      const result = await response.json();

      if (response.ok) {
        displayMessage(result.message, "success");
        resetAdminForm();
        fetchActivities();
      } else {
        displayMessage(result.detail || "Could not save activity", "error");
      }
    } catch (error) {
      displayMessage("Failed to save activity. Please try again.", "error");
      console.error("Error saving activity:", error);
    }
  });

  cancelEditButton.addEventListener("click", resetAdminForm);

  fetchActivities();
});
