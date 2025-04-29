// Project showcase component for the responsive CV presentation tool

document.addEventListener('DOMContentLoaded', function() {
    // Initialize project showcase
    initProjectShowcase();
    
    // Add event listeners to project category tabs
    document.querySelectorAll('.project-category-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const category = this.dataset.category;
            showProjectCategory(category);
        });
    });
});

// Initialize the project showcase section
function initProjectShowcase() {
    // Load projects data
    fetch('/api/projects')
        .then(response => response.json())
        .then(data => {
            // Populate project categories
            populateProjectCategories(data.categories);
            
            // Show first category by default
            if (data.categories && data.categories.length > 0) {
                showProjectCategory(data.categories[0].id);
            }
            
            // Initialize industry-specific project highlighting
            updateProjectsForIndustry('custom');
        })
        .catch(error => console.error('Error loading projects:', error));
}

// Populate project category tabs
function populateProjectCategories(categories) {
    const tabContainer = document.getElementById('project-categories');
    if (!tabContainer) return;
    
    tabContainer.innerHTML = '';
    
    categories.forEach((category, index) => {
        const tab = document.createElement('div');
        tab.className = `project-category-tab ${index === 0 ? 'active' : ''}`;
        tab.dataset.category = category.id;
        tab.innerHTML = `
            <span class="category-name">${category.name}</span>
            <span class="category-count">${category.projectCount}</span>
        `;
        tabContainer.appendChild(tab);
    });
}

// Show projects for a specific category
function showProjectCategory(categoryId) {
    // Update active tab
    document.querySelectorAll('.project-category-tab').forEach(tab => {
        if (tab.dataset.category === categoryId) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Load projects for this category
    fetch(`/api/projects/category/${categoryId}`)
        .then(response => response.json())
        .then(data => {
            populateProjects(data.projects);
        })
        .catch(error => console.error('Error loading category projects:', error));
}

// Populate projects in the showcase
function populateProjects(projects) {
    const projectContainer = document.getElementById('project-showcase');
    if (!projectContainer) return;
    
    projectContainer.innerHTML = '';
    
    projects.forEach(project => {
        const projectCard = document.createElement('div');
        projectCard.className = 'project-card perspective-transition';
        projectCard.dataset.projectId = project.id;
        
        projectCard.innerHTML = `
            <div class="project-image-container">
                <img src="/static/images/projects/${project.image}" alt="${project.title}" class="project-image">
                <div class="project-company">${project.company}</div>
            </div>
            <div class="project-content">
                <h3 class="project-title">${project.title}</h3>
                <p class="project-description">${project.description}</p>
                <div class="project-features">
                    <h4>Key Features</h4>
                    <ul>
                        ${project.key_features.map(feature => `<li>${feature}</li>`).join('')}
                    </ul>
                </div>
                <div class="project-outcomes">
                    <h4>Outcomes</h4>
                    <ul>
                        ${project.outcomes.map(outcome => `<li>${outcome}</li>`).join('')}
                    </ul>
                </div>
                <div class="project-technologies">
                    ${project.technologies.map(tech => `<span class="tech-badge">${tech}</span>`).join('')}
                </div>
            </div>
            <div class="project-expand">
                <button class="expand-btn" onclick="expandProject('${project.id}')">
                    <span>View Details</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </button>
            </div>
        `;
        
        projectContainer.appendChild(projectCard);
    });
}

// Expand project to show full details
function expandProject(projectId) {
    fetch(`/api/projects/${projectId}`)
        .then(response => response.json())
        .then(project => {
            showProjectModal(project);
        })
        .catch(error => console.error('Error loading project details:', error));
}

// Show project details in modal
function showProjectModal(project) {
    const modal = document.createElement('div');
    modal.className = 'project-modal-overlay';
    
    modal.innerHTML = `
        <div class="project-modal">
            <div class="modal-header">
                <h2>${project.title}</h2>
                <button class="close-modal" onclick="closeProjectModal()">×</button>
            </div>
            <div class="modal-content">
                <div class="project-hero">
                    <img src="/static/images/projects/${project.image}" alt="${project.title}">
                </div>
                
                <div class="project-details">
                    <div class="project-section">
                        <h3>Challenge Context</h3>
                        <p>${project.challenge || 'No challenge context provided.'}</p>
                    </div>
                    
                    <div class="project-section">
                        <h3>Solution Approach</h3>
                        <p>${project.solution || 'No solution approach provided.'}</p>
                        
                        <h4>Key Features</h4>
                        <ul>
                            ${project.key_features.map(feature => `<li>${feature}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div class="project-section">
                        <h3>Demonstrated Capabilities</h3>
                        <ul>
                            ${(project.capabilities || []).map(capability => `<li>${capability}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div class="project-section">
                        <h3>Measurable Outcomes</h3>
                        <ul>
                            ${project.outcomes.map(outcome => `<li>${outcome}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div class="project-section">
                        <h3>Industry Application</h3>
                        <div class="industry-applications">
                            ${(project.industry_applications || []).map(app => `
                                <div class="industry-application">
                                    <h4>${app.industry}</h4>
                                    <p>${app.application}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="project-section">
                        <h3>Technologies</h3>
                        <div class="technologies-container">
                            ${project.technologies.map(tech => `<span class="tech-badge">${tech}</span>`).join('')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Prevent body scrolling when modal is open
    document.body.style.overflow = 'hidden';
    
    // Add event listener to close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeProjectModal();
        }
    });
}

// Close project modal
function closeProjectModal() {
    const modal = document.querySelector('.project-modal-overlay');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
    }
}

// Update project highlighting based on selected industry
function updateProjectsForIndustry(industry) {
    // Get industry-specific project relevance data
    fetch(`/api/projects/industry-relevance/${industry}`)
        .then(response => response.json())
        .then(data => {
            // Reset all project cards
            document.querySelectorAll('.project-card').forEach(card => {
                card.classList.remove('industry-relevant', 'industry-highlight');
            });
            
            // Highlight relevant projects
            data.relevant_projects.forEach(projectId => {
                const card = document.querySelector(`.project-card[data-project-id="${projectId}"]`);
                if (card) {
                    card.classList.add('industry-relevant');
                }
            });
            
            // Strongly highlight most relevant projects
            data.highlight_projects.forEach(projectId => {
                const card = document.querySelector(`.project-card[data-project-id="${projectId}"]`);
                if (card) {
                    card.classList.add('industry-highlight');
                }
            });
        })
        .catch(error => console.error('Error loading industry relevance:', error));
}

// Add this function to the window object to make it accessible from HTML
window.expandProject = expandProject;
window.closeProjectModal = closeProjectModal;
window.updateProjectsForIndustry = updateProjectsForIndustry;
