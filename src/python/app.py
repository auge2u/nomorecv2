from flask import Flask, render_template, jsonify, request, send_from_directory
import os
import yaml
import markdown
import json

app = Flask(__name__)

# Load data
def load_yaml_data(file_path):
    try:
        with open(file_path, 'r') as file:
            return yaml.safe_load(file)
    except Exception as e:
        print(f"Error loading {file_path}: {e}")
        return {}

def load_cv_data():
    cv_dir = os.path.join(app.root_path, 'data', 'cv')
    cv_files = [f for f in os.listdir(cv_dir) if f.endswith('.md')]
    
    cv_data = {}
    for file in cv_files:
        with open(os.path.join(cv_dir, file), 'r') as f:
            content = f.read()
            cv_data[file] = markdown.markdown(content)
    
    return cv_data

def load_industry_data():
    industry_dir = os.path.join(app.root_path, 'data', 'industries')
    industry_files = [f for f in os.listdir(industry_dir) if f.endswith('.yaml')]
    
    industries = {}
    for file in industry_files:
        industry_id = file.replace('.yaml', '')
        industries[industry_id] = load_yaml_data(os.path.join(industry_dir, file))
    
    return industries

def load_project_data():
    project_file = os.path.join(app.root_path, 'data', 'projects.yaml')
    return load_yaml_data(project_file)

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/cv')
def get_cv():
    cv_data = load_cv_data()
    return jsonify(cv_data)

@app.route('/api/industries')
def get_industries():
    industries = load_industry_data()
    return jsonify(industries)

@app.route('/api/industry/<industry_id>')
def get_industry(industry_id):
    industries = load_industry_data()
    if industry_id in industries:
        return jsonify(industries[industry_id])
    return jsonify({"error": "Industry not found"}), 404

@app.route('/api/projects')
def get_projects():
    projects_data = load_project_data()
    
    # Format data for category listing
    categories = []
    for category in projects_data.get('projects', []):
        categories.append({
            'id': category['category'].lower().replace(' & ', '-').replace(' ', '-'),
            'name': category['category'],
            'projectCount': len(category.get('projects', []))
        })
    
    return jsonify({
        'categories': categories
    })

@app.route('/api/projects/category/<category_id>')
def get_projects_by_category(category_id):
    projects_data = load_project_data()
    
    # Find the matching category
    for category in projects_data.get('projects', []):
        category_normalized = category['category'].lower().replace(' & ', '-').replace(' ', '-')
        if category_normalized == category_id:
            # Add IDs to projects
            projects = category.get('projects', [])
            for i, project in enumerate(projects):
                project['id'] = f"{category_id}-{i}"
            
            return jsonify({
                'category': category['category'],
                'projects': projects
            })
    
    return jsonify({"error": "Category not found"}), 404

@app.route('/api/projects/<project_id>')
def get_project(project_id):
    projects_data = load_project_data()
    
    # Parse the project ID to find category and index
    parts = project_id.split('-')
    if len(parts) < 2:
        return jsonify({"error": "Invalid project ID"}), 400
    
    category_id = parts[0]
    try:
        project_index = int(parts[1])
    except ValueError:
        return jsonify({"error": "Invalid project index"}), 400
    
    # Find the matching category
    for category in projects_data.get('projects', []):
        category_normalized = category['category'].lower().replace(' & ', '-').replace(' ', '-')
        if category_normalized == category_id:
            projects = category.get('projects', [])
            if 0 <= project_index < len(projects):
                project = projects[project_index]
                project['id'] = project_id
                
                # Add industry applications if not present
                if 'industry_applications' not in project:
                    project['industry_applications'] = [
                        {
                            'industry': 'Financial Services',
                            'application': 'Enhances regulatory compliance while enabling innovation'
                        },
                        {
                            'industry': 'Technology Consulting',
                            'application': 'Demonstrates expertise in complex system integration'
                        },
                        {
                            'industry': 'Digital Transformation',
                            'application': 'Shows ability to reimagine processes with technology'
                        }
                    ]
                
                # Add capabilities if not present
                if 'capabilities' not in project:
                    project['capabilities'] = [
                        'Strategic vision and planning',
                        'Technical implementation expertise',
                        'Cross-functional team leadership',
                        'Innovation and creative problem-solving'
                    ]
                
                return jsonify(project)
    
    return jsonify({"error": "Project not found"}), 404

@app.route('/api/projects/industry-relevance/<industry_id>')
def get_industry_project_relevance(industry_id):
    # This would normally come from a database or more sophisticated mapping
    # For now, we'll use a simple hardcoded mapping
    
    relevance_map = {
        'financial-services': {
            'relevant_projects': ['ai-technology-innovation-0', 'ai-technology-innovation-1', 'business-transformation-innovation-2'],
            'highlight_projects': ['ai-technology-innovation-0']
        },
        'tech-consulting': {
            'relevant_projects': ['ai-technology-innovation-1', 'business-transformation-innovation-0', 'business-transformation-innovation-2'],
            'highlight_projects': ['business-transformation-innovation-2']
        },
        'ai-implementation': {
            'relevant_projects': ['ai-technology-innovation-0', 'ai-technology-innovation-1', 'ai-technology-innovation-2'],
            'highlight_projects': ['ai-technology-innovation-1']
        },
        'digital-transformation': {
            'relevant_projects': ['strategic-vision-systems-thinking-1', 'business-transformation-innovation-0', 'business-transformation-innovation-1'],
            'highlight_projects': ['business-transformation-innovation-0']
        },
        'startup-innovation': {
            'relevant_projects': ['business-transformation-innovation-1', 'creative-conceptual-development-0', 'creative-conceptual-development-1'],
            'highlight_projects': ['creative-conceptual-development-1']
        },
        'custom': {
            'relevant_projects': ['ai-technology-innovation-0', 'strategic-vision-systems-thinking-0', 'business-transformation-innovation-0', 'creative-conceptual-development-0'],
            'highlight_projects': ['strategic-vision-systems-thinking-0', 'ai-technology-innovation-0']
        }
    }
    
    if industry_id in relevance_map:
        return jsonify(relevance_map[industry_id])
    
    # Default to custom if industry not found
    return jsonify(relevance_map['custom'])

@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
