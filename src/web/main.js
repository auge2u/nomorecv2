// Main JavaScript for the responsive CV presentation tool

document.addEventListener('DOMContentLoaded', function() {
    // Initialize leadership radar chart
    initLeadershipRadarChart();
    
    // Initialize impact flow diagram
    initImpactFlowDiagram();
    
    // Add event listeners to industry cards
    document.querySelectorAll('.industry-card').forEach(card => {
        card.addEventListener('click', function() {
            const industry = this.dataset.industry;
            updatePerspective(industry);
        });
    });
    
    // Add event listener to perspective button
    document.getElementById('perspective-btn').addEventListener('click', function() {
        showPerspectiveModal();
    });
    
    // Add event listener to download button
    document.getElementById('download-btn').addEventListener('click', function() {
        prepareForDownload();
    });
});

// Initialize the leadership radar chart
function initLeadershipRadarChart() {
    const ctx = document.getElementById('leadership-radar-chart').getContext('2d');
    
    // Default data - will be updated based on selected industry
    const data = {
        labels: [
            'Strategic Vision',
            'Technical Expertise',
            'Innovation Leadership',
            'Team Development',
            'Business Acumen',
            'Change Management'
        ],
        datasets: [{
            label: 'Leadership Capabilities',
            data: [90, 85, 95, 80, 75, 85],
            fill: true,
            backgroundColor: 'rgba(79, 70, 229, 0.2)',
            borderColor: 'rgba(79, 70, 229, 1)',
            pointBackgroundColor: 'rgba(79, 70, 229, 1)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(79, 70, 229, 1)'
        }]
    };
    
    const config = {
        type: 'radar',
        data: data,
        options: {
            elements: {
                line: {
                    borderWidth: 3
                }
            },
            scales: {
                r: {
                    angleLines: {
                        display: true
                    },
                    suggestedMin: 0,
                    suggestedMax: 100
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.raw + '% proficiency';
                        }
                    }
                }
            }
        }
    };
    
    window.leadershipChart = new Chart(ctx, config);
}

// Initialize the impact flow diagram using D3.js
function initImpactFlowDiagram() {
    const width = document.getElementById('impact-flow-diagram').clientWidth;
    const height = document.getElementById('impact-flow-diagram').clientHeight;
    
    const svg = d3.select('#impact-flow-diagram')
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    // Default data - will be updated based on selected industry
    const nodes = [
        { id: 'strategy', label: 'Strategic Vision', x: width * 0.2, y: height * 0.3, r: 40, color: '#4F46E5' },
        { id: 'implementation', label: 'Implementation', x: width * 0.5, y: height * 0.2, r: 35, color: '#10B981' },
        { id: 'optimization', label: 'Optimization', x: width * 0.8, y: height * 0.3, r: 35, color: '#F59E0B' },
        { id: 'transformation', label: 'Transformation', x: width * 0.5, y: height * 0.7, r: 45, color: '#EC4899' }
    ];
    
    const links = [
        { source: 'strategy', target: 'implementation', value: 5 },
        { source: 'implementation', target: 'optimization', value: 3 },
        { source: 'strategy', target: 'transformation', value: 4 },
        { source: 'implementation', target: 'transformation', value: 3 },
        { source: 'optimization', target: 'transformation', value: 2 }
    ];
    
    // Create links
    svg.selectAll('.link')
        .data(links)
        .enter()
        .append('line')
        .attr('class', 'link')
        .attr('x1', function(d) {
            const source = nodes.find(node => node.id === d.source);
            return source.x;
        })
        .attr('y1', function(d) {
            const source = nodes.find(node => node.id === d.source);
            return source.y;
        })
        .attr('x2', function(d) {
            const target = nodes.find(node => node.id === d.target);
            return target.x;
        })
        .attr('y2', function(d) {
            const target = nodes.find(node => node.id === d.target);
            return target.y;
        })
        .attr('stroke-width', function(d) { return d.value * 2; })
        .attr('stroke', '#e5e7eb')
        .attr('opacity', 0.7);
    
    // Create nodes
    const nodeGroups = svg.selectAll('.node')
        .data(nodes)
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', function(d) {
            return 'translate(' + d.x + ',' + d.y + ')';
        });
    
    nodeGroups.append('circle')
        .attr('r', function(d) { return d.r; })
        .attr('fill', function(d) { return d.color; })
        .attr('opacity', 0.8);
    
    nodeGroups.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '.3em')
        .attr('fill', 'white')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .text(function(d) { return d.label; });
    
    // Add animation
    nodeGroups.call(
        d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended)
    );
    
    function dragstarted(event, d) {
        d3.select(this).raise().attr('stroke', 'black');
    }
    
    function dragged(event, d) {
        d3.select(this).attr('transform', 'translate(' + (d.x = event.x) + ',' + (d.y = event.y) + ')');
        
        // Update connected links
        svg.selectAll('.link')
            .attr('x1', function(l) {
                const source = nodes.find(node => node.id === l.source);
                return source.x;
            })
            .attr('y1', function(l) {
                const source = nodes.find(node => node.id === l.source);
                return source.y;
            })
            .attr('x2', function(l) {
                const target = nodes.find(node => node.id === l.target);
                return target.x;
            })
            .attr('y2', function(l) {
                const target = nodes.find(node => node.id === l.target);
                return target.y;
            });
    }
    
    function dragended(event, d) {
        d3.select(this).attr('stroke', null);
    }
}

// Update the perspective based on selected industry
function updatePerspective(industry) {
    // Highlight selected industry card
    document.querySelectorAll('.industry-card').forEach(card => {
        if (card.dataset.industry === industry) {
            card.classList.add('ring-4', 'ring-indigo-500');
        } else {
            card.classList.remove('ring-4', 'ring-indigo-500');
        }
    });
    
    // Update leadership radar chart data based on industry
    updateLeadershipChart(industry);
    
    // Update capability breakdown
    updateCapabilityBreakdown(industry);
    
    // Update impact flow diagram
    updateImpactFlow(industry);
    
    // Update question responses
    updateQuestionResponses(industry);
    
    // Add fade-in animation to updated sections
    document.querySelectorAll('.bg-white').forEach(section => {
        section.classList.add('fade-in');
        setTimeout(() => {
            section.classList.remove('fade-in');
        }, 500);
    });
}

// Update leadership radar chart based on industry
function updateLeadershipChart(industry) {
    let data = [];
    
    switch(industry) {
        case 'financial-services':
            data = [95, 90, 85, 75, 80, 90];
            break;
        case 'tech-consulting':
            data = [85, 95, 90, 85, 80, 75];
            break;
        case 'ai-implementation':
            data = [80, 90, 95, 75, 70, 85];
            break;
        case 'digital-transformation':
            data = [90, 85, 90, 80, 85, 95];
            break;
        case 'startup-innovation':
            data = [85, 80, 95, 90, 85, 75];
            break;
        default:
            data = [90, 85, 95, 80, 75, 85];
    }
    
    window.leadershipChart.data.datasets[0].data = data;
    window.leadershipChart.update();
}

// Update capability breakdown based on industry
function updateCapabilityBreakdown(industry) {
    const capabilityData = {
        'financial-services': [
            { name: 'Regulatory Compliance', value: 95, color: 'blue', description: 'Implemented FINMA-approved infrastructure and compliance frameworks' },
            { name: 'Security Architecture', value: 90, color: 'purple', description: 'Designed secure, compliant cloud infrastructure for financial operations' },
            { name: 'Risk Management', value: 85, color: 'green', description: 'Developed comprehensive risk management frameworks for financial technology' },
            { name: 'Digital Banking', value: 80, color: 'red', description: 'Led digital transformation initiatives for banking operations' }
        ],
        'tech-consulting': [
            { name: 'Solution Architecture', value: 90, color: 'blue', description: 'Designed enterprise-scale technology solutions across multiple domains' },
            { name: 'Client Engagement', value: 85, color: 'purple', description: 'Maintained 95% client retention rate through strategic partnerships' },
            { name: 'Technical Leadership', value: 95, color: 'green', description: 'Led senior engineering and management initiatives' },
            { name: 'Strategic Consulting', value: 90, color: 'red', description: 'Provided C-level consulting focused on business process optimization' }
        ],
        'ai-implementation': [
            { name: 'LLM Integration', value: 95, color: 'blue', description: 'Developed enterprise-grade LLM integration platform with governance controls' },
            { name: 'AI Solution Design', value: 90, color: 'purple', description: 'Created AI-enhanced solutions for business operations' },
            { name: 'Prompt Engineering', value: 95, color: 'green', description: 'Developed sophisticated prompt management system with version control' },
            { name: 'AI Governance', value: 85, color: 'red', description: 'Implemented usage monitoring, cost optimization, and governance controls' }
        ],
        'digital-transformation': [
            { name: 'Change Management', value: 90, color: 'blue', description: 'Led organizational change initiatives for digital adoption' },
            { name: 'Process Optimization', value: 85, color: 'purple', description: 'Streamlined operations through enhanced processes' },
            { name: 'Technology Roadmapping', value: 95, color: 'green', description: 'Developed comprehensive roadmaps for infrastructure and applications' },
            { name: 'Digital Strategy', value: 90, color: 'red', description: 'Created strategic vision for digital business transformation' }
        ],
        'startup-innovation': [
            { name: 'Venture Building', value: 95, color: 'blue', description: 'Founded and scaled multiple successful startups' },
            { name: 'Product Development', value: 90, color: 'purple', description: 'Developed innovative platforms and applications' },
            { name: 'Team Leadership', value: 85, color: 'green', description: 'Built and led diverse teams across multiple disciplines' },
            { name: 'Market Strategy', value: 80, color: 'red', description: 'Developed go-to-market strategies for innovative products' }
        ],
        'custom': [
            { name: 'Strategic Vision', value: 90, color: 'blue', description: 'Developed comprehensive technology roadmaps aligned with business objectives' },
            { name: 'Technical Expertise', value: 85, color: 'purple', description: 'Deep expertise in cloud infrastructure, security, and AI integration' },
            { name: 'Innovation Leadership', value: 95, color: 'green', description: 'Led multiple innovation initiatives including AI integration' },
            { name: 'Team Development', value: 80, color: 'red', description: 'Built and led high-performing technical teams across multiple organizations' }
        ]
    };
    
    const data = capabilityData[industry] || capabilityData.custom;
    const container = document.getElementById('capability-breakdown');
    
    // Clear existing content
    container.innerHTML = '';
    
    // Add new capability cards
    data.forEach(capability => {
        const card = document.createElement('div');
        card.className = `bg-${capability.color}-50 p-4 rounded-lg`;
        
        card.innerHTML = `
            <h4 class="font-semibold text-${capability.color}-900 mb-2">${capability.name}</h4>
            <div class="relative pt-1">
                <div class="flex mb-2 items-center justify-between">
                    <div>
                        <span class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-${capability.color}-600 bg-${capability.color}-200">
                            Industry Relevance: ${capability.value}%
                        </span>
                    </div>
                </div>
                <div class="overflow-hidden h-2 mb-4 text-xs flex rounded bg-${capability.color}-200">
                    <div style="width: ${capability.value}%" class="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-${capability.color}-600"></div>
                </div>
                <p class="text-sm text-${capability.color}-800">${capability.description}</p>
            </div>
        `;
        
        container.appendChild(card);
    });
}

// Update impact flow diagram based on industry
function updateImpactFlow(industry) {
    // This would update the D3.js visualization based on industry
    // For simplicity, we'll just add a class to change colors
    const diagram = document.getElementById('impact-flow-diagram');
    
    // Remove all industry classes
    diagram.classList.remove(
        'financial-services-theme',
        'tech-consulting-theme',
        'ai-implementation-theme',
        'digital-transformation-theme',
        'startup-innovation-theme'
    );
    
    // Add selected industry class
    if (industry !== 'custom') {
        diagram.classList.add(`${industry}-theme`);
    }
}

// Update question responses based on industry
function updateQuestionResponses(industry) {
    const questionData = {
        'financial-services': [
            {
                question: 'How have you implemented security measures in financial technology systems?',
                response: 'At Sygnum Bank, I implemented Switzerland\'s first FINMA-approved IT infrastructure, establishing security controls that balanced regulatory compliance with operational efficiency. This included implementing zero-trust architecture, comprehensive threat detection, and automated compliance reporting aligned with financial regulations.'
            },
            {
                question: 'Describe your experience with regulatory compliance in financial services.',
                response: 'My experience includes designing and implementing regulatory-compliant infrastructure for crypto-finance operations at Sygnum Bank, where I worked directly with FINMA requirements. I\'ve developed compliance frameworks that automate monitoring and reporting while maintaining operational flexibility.'
            },
            {
                question: 'How do you balance innovation with security requirements in a regulated env
(Content truncated due to size limit. Use line ranges to read in chunks)