// js/profile-page.js
import { escapeHTML } from './main.js'; // Assuming escapeHTML is exported from main.js
import { updateNavOnAuthStateChange } from './auth.js'; // To update nav username after profile update

const profileContentDiv = document.getElementById('profile-content');
const profileUsernameSpan = document.getElementById('profile-username');
const profileEmailSpan = document.getElementById('profile-email');
const profileEditForm = document.getElementById('profile-edit-form');
const profileFullNameInput = document.getElementById('profile-fullname');
const profileNewPasswordInput = document.getElementById('profile-new-password');
const profileMessageDiv = document.getElementById('profile-message');
const profileLoginPromptDiv = document.getElementById('profile-login-prompt');
const profileLoadingDiv = document.getElementById('profile-loading');
const profileUpdateButton = document.getElementById('profile-update-button');

function loadUserProfileData(user) {
    if (profileContentDiv && profileUsernameSpan && profileEmailSpan && profileFullNameInput) {
        if (profileLoadingDiv) profileLoadingDiv.classList.add('hidden');
        profileContentDiv.classList.remove('hidden');
        if (profileLoginPromptDiv) profileLoginPromptDiv.classList.add('hidden');

        profileUsernameSpan.textContent = user.user_metadata.full_name || user.email.split('@')[0];
        profileEmailSpan.textContent = user.email;
        profileFullNameInput.value = user.user_metadata.full_name || '';
    }
}

function showLoginPromptForProfile() {
    if (profileLoginPromptDiv && profileContentDiv) {
        profileLoginPromptDiv.classList.remove('hidden');
        profileContentDiv.classList.add('hidden');
        if (profileLoadingDiv) profileLoadingDiv.classList.add('hidden');
    }
}

async function handleProfileFormSubmit(event) {
    event.preventDefault();
    if (!profileEditForm || !profileMessageDiv || !profileFullNameInput || !profileNewPasswordInput || !profileUpdateButton) return;

    const user = window.netlifyIdentity.currentUser();
    if (!user) {
        profileMessageDiv.textContent = 'Error: Not logged in.';
        profileMessageDiv.className = 'mt-4 text-sm text-center text-red-400';
        return;
    }

    profileUpdateButton.disabled = true;
    profileUpdateButton.textContent = 'Updating...';
    profileMessageDiv.textContent = ''; 

    const updates = { data: { full_name: profileFullNameInput.value.trim() } };
    const newPassword = profileNewPasswordInput.value;

    // Simple name update for now. Password change is more complex.
    // if (newPassword) {
    //     updates.password = newPassword; // This might require current password or admin context
    // }

    try {
        await user.update(updates);
        profileMessageDiv.textContent = 'Profile updated successfully!';
        profileMessageDiv.className = 'mt-4 text-sm text-center text-green-400';
        
        // Re-fetch user to get potentially updated metadata for nav display
        const updatedUser = window.netlifyIdentity.currentUser(); 
        if(updatedUser) {
            loadUserProfileData(updatedUser); // Reload form with potentially new name
            updateNavOnAuthStateChange(updatedUser); // Update nav username display
        }


        if (profileNewPasswordInput) profileNewPasswordInput.value = '';
        if(newPassword) { // If password was attempted
            profileMessageDiv.textContent += ' (Password change requires email confirmation or separate process if enabled).';
        }


    } catch (error) {
        profileMessageDiv.textContent = `Error: ${error.message || 'Failed to update profile.'}`;
        profileMessageDiv.className = 'mt-4 text-sm text-center text-red-400';
    } finally {
        profileUpdateButton.disabled = false;
        profileUpdateButton.textContent = 'Update Profile';
    }
}

export function updateUserProfilePage(user) {
    if (user) {
        loadUserProfileData(user);
    } else {
        showLoginPromptForProfile();
    }
}

export function initProfilePage() {
    console.log("Profile Page Initializing...");
    if (profileEditForm) {
        profileEditForm.addEventListener('submit', handleProfileFormSubmit);
    }
    const user = window.netlifyIdentity ? window.netlifyIdentity.currentUser() : null;
    updateUserProfilePage(user); // Initial setup
}