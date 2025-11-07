/**
 * COSMIC DEVSPACE - CONTACT PAGE
 * Two-step contact form with user profile collection
 */

console.log('✅ Contact.js loaded successfully');

// Storage key for user profile
const PROFILE_STORAGE_KEY = 'cds_contact_profile';

// Check if user profile exists on load
document.addEventListener('DOMContentLoaded', function() {
  const savedProfile = getSavedProfile();
  
  if (savedProfile) {
    // User has already filled profile, show contact step
    showContactStep(savedProfile);
  } else {
    // Show profile step
    showProfileStep();
  }
  
  setupEventListeners();
});

/**
 * Get saved profile from localStorage
 */
function getSavedProfile() {
  const profileData = localStorage.getItem(PROFILE_STORAGE_KEY);
  return profileData ? JSON.parse(profileData) : null;
}

/**
 * Save profile to localStorage
 */
function saveProfile(profileData) {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profileData));
}

/**
 * Show profile step (Step 1)
 */
function showProfileStep() {
  const profileStep = document.getElementById('profileStep');
  const contactStep = document.getElementById('contactStep');
  
  if (profileStep) profileStep.style.display = 'block';
  if (contactStep) contactStep.style.display = 'none';
  
  // Pre-fill if profile exists
  const savedProfile = getSavedProfile();
  if (savedProfile) {
    document.getElementById('userName').value = savedProfile.name || '';
    document.getElementById('userEmail').value = savedProfile.email || '';
    document.getElementById('userGithub').value = savedProfile.github || '';
    document.getElementById('userLinkedin').value = savedProfile.linkedin || '';
    document.getElementById('userTwitter').value = savedProfile.twitter || '';
    document.getElementById('userPortfolio').value = savedProfile.portfolio || '';
    document.getElementById('userLocation').value = savedProfile.location || '';
  }
}

/**
 * Show contact step with user profile (Step 2)
 */
function showContactStep(profileData) {
  const profileStep = document.getElementById('profileStep');
  const contactStep = document.getElementById('contactStep');
  
  if (profileStep) profileStep.style.display = 'none';
  if (contactStep) contactStep.style.display = 'block';
  
  // Update display names
  const displayName = document.getElementById('displayName');
  const displayName2 = document.getElementById('displayName2');
  
  if (displayName) {
    displayName.textContent = profileData.name || 'User';
  }
  if (displayName2) {
    displayName2.textContent = profileData.name || 'this developer';
  }
  
  // Display user social links
  displayUserSocialLinks(profileData);
  
  // Scroll to top smoothly
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Display user's social links in banner
 */
function displayUserSocialLinks(profileData) {
  const socialLinksContainer = document.getElementById('userSocialLinks');
  if (!socialLinksContainer) return;
  
  socialLinksContainer.innerHTML = '';
  
  // GitHub
  if (profileData.github) {
    const githubLink = createSocialLink('🔗', 'GitHub', profileData.github);
    socialLinksContainer.appendChild(githubLink);
  }
  
  // LinkedIn
  if (profileData.linkedin) {
    const linkedinLink = createSocialLink('💼', 'LinkedIn', profileData.linkedin);
    socialLinksContainer.appendChild(linkedinLink);
  }
  
  // Twitter
  if (profileData.twitter) {
    const twitterLink = createSocialLink('🐦', 'Twitter', profileData.twitter);
    socialLinksContainer.appendChild(twitterLink);
  }
  
  // Portfolio
  if (profileData.portfolio) {
    const portfolioLink = createSocialLink('🌐', 'Portfolio', profileData.portfolio);
    socialLinksContainer.appendChild(portfolioLink);
  }
  
  // Location
  if (profileData.location) {
    const locationBadge = document.createElement('span');
    locationBadge.className = 'user-social-link';
    locationBadge.innerHTML = `<span class="icon">📍</span> ${profileData.location}`;
    socialLinksContainer.appendChild(locationBadge);
  }
  
  // If no links, show a message
  if (socialLinksContainer.children.length === 0) {
    const noLinks = document.createElement('p');
    noLinks.style.color = 'var(--text-muted)';
    noLinks.textContent = 'No social profiles added';
    socialLinksContainer.appendChild(noLinks);
  }
}

/**
 * Create social link element
 */
function createSocialLink(icon, label, url) {
  const link = document.createElement('a');
  link.className = 'user-social-link';
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.innerHTML = `<span class="icon">${icon}</span> ${label}`;
  return link;
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  console.log('Setting up event listeners...');
  
  // Profile form submission
  const profileForm = document.getElementById('profileForm');
  console.log('Looking for profileForm:', profileForm);
  if (profileForm) {
    console.log('✅ Profile form found:', profileForm);
    console.log('Form tag name:', profileForm.tagName);
    console.log('Form ID:', profileForm.id);
    console.log('Attaching submit handler...');
    profileForm.addEventListener('submit', handleProfileSubmit);
    console.log('✅ Submit handler attached successfully');
    
    // Test by manually triggering
    window.testProfileSubmit = () => {
      console.log('Manual test triggered');
      handleProfileSubmit({preventDefault: () => console.log('Test preventDefault')});
    };
  } else {
    console.error('❌ Profile form not found!');
  }
  
  // Edit profile button
  const editProfileBtn = document.getElementById('editProfileBtn');
  if (editProfileBtn) {
    editProfileBtn.addEventListener('click', function() {
      showProfileStep();
    });
  }
  
  // Contact form submission
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', handleContactSubmit);
  }
}

/**
 * Handle profile form submission
 */
async function handleProfileSubmit(e) {
  console.log('🚀 handleProfileSubmit CALLED!', e);
  e.preventDefault();
  console.log('✅ preventDefault() called');
  
  console.log('Profile form submitted!');
  
  // Get elements with null checks - use querySelector on form to avoid conflicts
  const form = document.getElementById('profileForm');
  const nameInput = form?.querySelector('#userName') || document.getElementById('userName');
  const emailInput = form?.querySelector('#userEmail') || document.getElementById('userEmail');
  const githubInput = form?.querySelector('#userGithub') || document.getElementById('userGithub');
  const linkedinInput = form?.querySelector('#userLinkedin') || document.getElementById('userLinkedin');
  const twitterInput = form?.querySelector('#userTwitter') || document.getElementById('userTwitter');
  const portfolioInput = form?.querySelector('#userPortfolio') || document.getElementById('userPortfolio');
  const locationInput = form?.querySelector('#userLocation') || document.getElementById('userLocation');
  
  console.log('Input elements:', {
    nameInput, emailInput, githubInput, linkedinInput, twitterInput, portfolioInput, locationInput
  });
  
  // Debug: Check if we're getting the right elements
  if (nameInput) {
    console.log('nameInput element:', nameInput);
    console.log('nameInput tagName:', nameInput.tagName);
    console.log('nameInput type:', nameInput.type);
    console.log('nameInput id:', nameInput.id);
  }
  
  // Debug: Check each value
  console.log('Input values:', {
    name: nameInput ? nameInput.value : 'NO INPUT',
    email: emailInput ? emailInput.value : 'NO INPUT',
    github: githubInput ? githubInput.value : 'NO INPUT',
    linkedin: linkedinInput ? linkedinInput.value : 'NO INPUT',
    twitter: twitterInput ? twitterInput.value : 'NO INPUT',
    portfolio: portfolioInput ? portfolioInput.value : 'NO INPUT',
    location: locationInput ? locationInput.value : 'NO INPUT'
  });
  
  // Try to get values, with fallback to FormData
  let profileData;
  
  // Method 1: Direct element access
  if (nameInput && nameInput.value) {
    profileData = {
      name: (nameInput?.value || '').trim(),
      email: (emailInput?.value || '').trim(),
      github: (githubInput?.value || '').trim(),
      linkedin: (linkedinInput?.value || '').trim(),
      twitter: (twitterInput?.value || '').trim(),
      portfolio: (portfolioInput?.value || '').trim(),
      location: (locationInput?.value || '').trim(),
      timestamp: Date.now()
    };
  } else {
    // Method 2: FormData fallback
    console.log('Using FormData fallback');
    const formData = new FormData(form);
    profileData = {
      name: (formData.get('name') || '').trim(),
      email: (formData.get('email') || '').trim(),
      github: (formData.get('github') || '').trim(),
      linkedin: (formData.get('linkedin') || '').trim(),
      twitter: (formData.get('twitter') || '').trim(),
      portfolio: (formData.get('portfolio') || '').trim(),
      location: (formData.get('location') || '').trim(),
      timestamp: Date.now()
    };
  }
  
  console.log('Profile data:', profileData);
  console.log('Name length:', profileData.name.length, 'Email length:', profileData.email.length);
  console.log('Name value:', JSON.stringify(profileData.name));
  console.log('Email value:', JSON.stringify(profileData.email));
  console.log('Name is empty?', !profileData.name, 'Email is empty?', !profileData.email);
  
  // Validate required fields
  if (!profileData.name || !profileData.email) {
    console.error('❌ VALIDATION FAILED!');
    console.error('Name:', profileData.name, '(empty:', !profileData.name, ')');
    console.error('Email:', profileData.email, '(empty:', !profileData.email, ')');
    alert('⚠️ Name and Email are required!\n\nName: "' + profileData.name + '"\nEmail: "' + profileData.email + '"');
    return;
  }
  
  console.log('✅ Validation PASSED!');
  
  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(profileData.email)) {
    console.error('Validation failed: Invalid email format');
    alert('⚠️ Please enter a valid email address!');
    return;
  }
  
  console.log('Validation passed, saving profile...');
  
  // Show loading state
  const submitBtn = document.getElementById('nextBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Saving...';
  }
  
  // Save to database via API
  try {
    const response = await fetch('/api/contact/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(profileData)
    });
    
    const result = await response.json();
    console.log('API Response:', result);
    
    if (result.success) {
      // Save to localStorage as well
      saveProfile(profileData);
      console.log('Profile saved to database and localStorage');
      
      // Show success message
      alert('✅ Profile saved successfully!');
      
      // Move to contact step immediately
      console.log('Moving to contact step...');
      showContactStep(profileData);
    } else {
      throw new Error(result.message || 'Failed to save profile');
    }
  } catch (error) {
    console.error('Error saving profile to database:', error);
    
    // Fallback to localStorage only
    try {
      saveProfile(profileData);
      alert('⚠️ Saved locally (database offline)');
      showContactStep(profileData);
    } catch (localError) {
      console.error('Error saving to localStorage:', localError);
      alert('❌ Error saving profile!');
    }
  } finally {
    // Reset button
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span class="btn-text">Next Step ➡️</span>';
    }
  }
}

/**
 * Handle contact form submission
 */
function handleContactSubmit(e) {
  e.preventDefault();
  
  const btn = document.getElementById('sendBtn');
  const btnText = btn.querySelector('.btn-text');
  const btnLoader = btn.querySelector('.btn-loader');
  
  btnText.classList.add('hidden');
  btnLoader.classList.remove('hidden');
  btn.disabled = true;
  
  // Get form data (from company/visitor)
  const companyName = document.getElementById('companyName')?.value.trim();
  const companyEmail = document.getElementById('companyEmail')?.value.trim();
  const subject = document.getElementById('contactSubject')?.value.trim();
  const message = document.getElementById('contactMessage')?.value.trim();
  
  const formData = {
    companyName: companyName || '',
    companyEmail: companyEmail || '',
    subject: subject || '',
    message: message || '',
    timestamp: Date.now()
  };
  
  // Get user profile data (the person being contacted)
  const userProfile = getSavedProfile();
  
  // Combine company inquiry with user profile info
  const fullContactData = {
    // Who is being contacted
    recipient: {
      name: userProfile?.name || '',
      email: userProfile?.email || '',
      profiles: {
        github: userProfile?.github || '',
        linkedin: userProfile?.linkedin || '',
        twitter: userProfile?.twitter || '',
        portfolio: userProfile?.portfolio || ''
      }
    },
    // Who is contacting (company/visitor)
    inquiry: formData
  };
  
  // Save to localStorage (demo)
  const contacts = JSON.parse(localStorage.getItem('cds_contacts') || '[]');
  contacts.push(fullContactData);
  localStorage.setItem('cds_contacts', JSON.stringify(contacts));
  
  // Simulate sending
  setTimeout(() => {
    showToast(`✅ Message sent to ${userProfile?.name || 'developer'}!`, 'success');
    
    // Reset the form completely
    if (document.getElementById('companyName')) document.getElementById('companyName').value = '';
    if (document.getElementById('companyEmail')) document.getElementById('companyEmail').value = '';
    if (document.getElementById('contactSubject')) document.getElementById('contactSubject').value = '';
    if (document.getElementById('contactMessage')) document.getElementById('contactMessage').value = '';
    if (document.getElementById('messageCharCount')) document.getElementById('messageCharCount').textContent = '0';
    
    btnText.classList.remove('hidden');
    btnLoader.classList.add('hidden');
    btn.disabled = false;
  }, 1500);
}

/**
 * Show toast notification
 */
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type} show`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getSavedProfile,
    saveProfile,
    showProfileStep,
    showContactStep
  };
}
