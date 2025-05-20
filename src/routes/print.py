from flask import Blueprint, render_template, redirect, url_for, request, jsonify
from models.database import db, Subject, Topic, Question, Alternative
import os
from weasyprint import HTML
from flask import current_app, make_response

print_bp = Blueprint('print', __name__)

@print_bp.route('/')
def index():
    # Obter lista de assuntos e tópicos para os filtros
    subjects = Subject.query.all()
    
    return render_template('print.html', subjects=subjects)

@print_bp.route('/generate', methods=['POST'])
def generate_print():
    # Obter parâmetros do formulário
    subject_id = request.form.get('subject')
    topic_id = request.form.get('topic', 'all')
    question_count = request.form.get('question_count', 10, type=int)
    questions_per_page = request.form.get('questions_per_page', 5, type=int)
    show_answers = 'show_answers' in request.form
    
    # Construir a query base
    query = Question.query
    
    # Aplicar filtros
    if subject_id != 'all':
        query = query.filter(Question.subject_id == subject_id)
    
    if topic_id != 'all':
        query = query.filter(Question.topic_id == topic_id)
    
    # Limitar o número de questões
    questions = query.limit(question_count).all()
    
    if not questions:
        return render_template('print_preview.html', 
                              error="Nenhuma questão encontrada com os filtros selecionados.")
    
    # Organizar questões por páginas
    pages = []
    current_page = []
    
    for i, question in enumerate(questions):
        current_page.append(question)
        
        # Quando atingir o limite por página ou for a última questão
        if len(current_page) == questions_per_page or i == len(questions) - 1:
            pages.append(current_page)
            current_page = []
    
    # Renderizar a prévia
    return render_template('print_preview.html',
                          pages=pages,
                          questions=questions,
                          show_answers=show_answers)

@print_bp.route('/pdf', methods=['POST'])
def generate_pdf():
    # Obter parâmetros do formulário
    subject_id = request.form.get('subject')
    topic_id = request.form.get('topic', 'all')
    question_count = request.form.get('question_count', 10, type=int)
    questions_per_page = request.form.get('questions_per_page', 5, type=int)
    show_answers = 'show_answers' in request.form
    
    # Construir a query base
    query = Question.query
    
    # Aplicar filtros
    if subject_id != 'all':
        query = query.filter(Question.subject_id == subject_id)
    
    if topic_id != 'all':
        query = query.filter(Question.topic_id == topic_id)
    
    # Limitar o número de questões
    questions = query.limit(question_count).all()
    
    if not questions:
        return jsonify({'error': 'Nenhuma questão encontrada com os filtros selecionados.'}), 404
    
    # Organizar questões por páginas
    pages = []
    current_page = []
    
    for i, question in enumerate(questions):
        current_page.append(question)
        
        # Quando atingir o limite por página ou for a última questão
        if len(current_page) == questions_per_page or i == len(questions) - 1:
            pages.append(current_page)
            current_page = []
    
    # Renderizar o HTML para o PDF
    html_content = render_template('pdf_template.html',
                                  pages=pages,
                                  questions=questions,
                                  show_answers=show_answers)
    
    # Gerar o PDF
    pdf = HTML(string=html_content).write_pdf()
    
    # Criar a resposta com o PDF
    response = make_response(pdf)
    response.headers['Content-Type'] = 'application/pdf'
    response.headers['Content-Disposition'] = 'inline; filename=questoes.pdf'
    
    return response

@print_bp.route('/api/topics/<subject_id>')
def get_topics(subject_id):
    if subject_id == 'all':
        return jsonify([{'id': 'all', 'name': 'Todos os Assuntos'}])
    
    topics = Topic.query.filter_by(subject_id=subject_id).all()
    topics_list = [{'id': topic.id, 'name': topic.name} for topic in topics]
    topics_list.insert(0, {'id': 'all', 'name': 'Todos os Assuntos'})
    
    return jsonify(topics_list)
