from flask import Blueprint, render_template, redirect, url_for, request, flash, current_app, jsonify
import os
from werkzeug.utils import secure_filename
from models.database import db, Subject, Topic, Question, Alternative
import uuid

questions_bp = Blueprint('questions', __name__)

# Função auxiliar para verificar extensões de arquivo permitidas
def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in current_app.config['ALLOWED_EXTENSIONS']

@questions_bp.route('/')
def index():
    return redirect(url_for('questions.view_questions'))

@questions_bp.route('/add', methods=['GET', 'POST'])
def add_question():
    if request.method == 'POST':
        # Obter dados do formulário
        question_type = request.form.get('question_type')
        subject_name = request.form.get('subject')
        topic_name = request.form.get('topic')
        question_text = request.form.get('question_text')
        
        # Validar dados
        if not all([question_type, subject_name, topic_name, question_text]):
            flash('Todos os campos são obrigatórios!', 'danger')
            return redirect(url_for('questions.add_question'))
        
        # Processar imagem se existir
        image_path = None
        if 'question_image' in request.files:
            file = request.files['question_image']
            if file and file.filename and allowed_file(file.filename):
                # Gerar nome único para o arquivo
                filename = secure_filename(file.filename)
                unique_filename = f"{uuid.uuid4().hex}_{filename}"
                file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
                file.save(file_path)
                image_path = f"uploads/{unique_filename}"
        
        # Verificar se o assunto já existe, caso contrário criar
        subject = Subject.query.filter_by(name=subject_name).first()
        if not subject:
            subject = Subject(name=subject_name)
            db.session.add(subject)
            db.session.flush()  # Para obter o ID sem commit
        
        # Verificar se o tópico já existe, caso contrário criar
        topic = Topic.query.filter_by(name=topic_name, subject_id=subject.id).first()
        if not topic:
            topic = Topic(name=topic_name, subject_id=subject.id)
            db.session.add(topic)
            db.session.flush()  # Para obter o ID sem commit
        
        # Criar a questão
        question = Question(
            text=question_text,
            image_path=image_path,
            question_type=question_type,
            subject_id=subject.id,
            topic_id=topic.id
        )
        db.session.add(question)
        db.session.flush()  # Para obter o ID sem commit
        
        # Processar alternativas
        if question_type == 'multiple_choice':
            alternatives = []
            correct_letter = request.form.get('correct_answer', '').upper()
            
            # Letras para indexar alternativas
            letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
            
            for i, letter in enumerate(letters):
                alt_text = request.form.get(f'alternative_{letter}')
                if alt_text:
                    is_correct = (letter == correct_letter)
                    alternative = Alternative(
                        text=alt_text,
                        is_correct=is_correct,
                        question_id=question.id
                    )
                    db.session.add(alternative)
                    alternatives.append(alternative)
            
            if not alternatives:
                flash('É necessário adicionar pelo menos uma alternativa!', 'danger')
                db.session.rollback()
                return redirect(url_for('questions.add_question'))
                
        elif question_type == 'true_false':
            # Para questões de verdadeiro/falso
            is_true = request.form.get('is_true') == 'true'
            
            # Alternativa Verdadeira
            alt_true = Alternative(
                text='Verdadeiro',
                is_correct=is_true,
                question_id=question.id
            )
            db.session.add(alt_true)
            
            # Alternativa Falsa
            alt_false = Alternative(
                text='Falso',
                is_correct=not is_true,
                question_id=question.id
            )
            db.session.add(alt_false)
        
        # Salvar tudo no banco de dados
        db.session.commit()
        flash('Questão adicionada com sucesso!', 'success')
        return redirect(url_for('questions.view_questions'))
    
    # Para requisições GET, renderizar o formulário
    return render_template('add_question.html')

@questions_bp.route('/view')
def view_questions():
    # Obter filtros da query string
    subject_filter = request.args.get('subject', 'all')
    topic_filter = request.args.get('topic', 'all')
    type_filter = request.args.get('type', 'all')
    
    # Construir a query base
    query = Question.query.join(Subject).join(Topic)
    
    # Aplicar filtros
    if subject_filter != 'all':
        query = query.filter(Subject.name == subject_filter)
    
    if topic_filter != 'all':
        query = query.filter(Topic.name == topic_filter)
    
    if type_filter != 'all':
        query = query.filter(Question.question_type == type_filter)
    
    # Ordenar por data de criação (mais recentes primeiro)
    questions = query.order_by(Question.created_at.desc()).all()
    
    # Obter lista de assuntos e tópicos para os filtros
    subjects = Subject.query.all()
    topics = Topic.query.all()
    
    return render_template('view_questions.html', 
                          questions=questions,
                          subjects=subjects,
                          topics=topics,
                          subject_filter=subject_filter,
                          topic_filter=topic_filter,
                          type_filter=type_filter)

@questions_bp.route('/edit/<int:question_id>', methods=['GET', 'POST'])
def edit_question(question_id):
    question = Question.query.get_or_404(question_id)
    
    if request.method == 'POST':
        # Obter dados do formulário
        question.text = request.form.get('question_text')
        subject_name = request.form.get('subject')
        topic_name = request.form.get('topic')
        
        # Validar dados
        if not all([question.text, subject_name, topic_name]):
            flash('Todos os campos são obrigatórios!', 'danger')
            return redirect(url_for('questions.edit_question', question_id=question_id))
        
        # Processar imagem se existir
        if 'question_image' in request.files:
            file = request.files['question_image']
            if file and file.filename and allowed_file(file.filename):
                # Remover imagem antiga se existir
                if question.image_path:
                    old_path = os.path.join(current_app.config['UPLOAD_FOLDER'], question.image_path.split('/')[-1])
                    if os.path.exists(old_path):
                        os.remove(old_path)
                
                # Gerar nome único para o arquivo
                filename = secure_filename(file.filename)
                unique_filename = f"{uuid.uuid4().hex}_{filename}"
                file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
                file.save(file_path)
                question.image_path = f"uploads/{unique_filename}"
        
        # Verificar se o assunto já existe, caso contrário criar
        subject = Subject.query.filter_by(name=subject_name).first()
        if not subject:
            subject = Subject(name=subject_name)
            db.session.add(subject)
            db.session.flush()  # Para obter o ID sem commit
        
        # Verificar se o tópico já existe, caso contrário criar
        topic = Topic.query.filter_by(name=topic_name, subject_id=subject.id).first()
        if not topic:
            topic = Topic(name=topic_name, subject_id=subject.id)
            db.session.add(topic)
            db.session.flush()  # Para obter o ID sem commit
        
        # Atualizar assunto e tópico
        question.subject_id = subject.id
        question.topic_id = topic.id
        
        # Processar alternativas
        if question.question_type == 'multiple_choice':
            # Remover alternativas antigas
            for alt in question.alternatives:
                db.session.delete(alt)
            
            # Adicionar novas alternativas
            alternatives = []
            correct_letter = request.form.get('correct_answer', '').upper()
            
            # Letras para indexar alternativas
            letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
            
            for i, letter in enumerate(letters):
                alt_text = request.form.get(f'alternative_{letter}')
                if alt_text:
                    is_correct = (letter == correct_letter)
                    alternative = Alternative(
                        text=alt_text,
                        is_correct=is_correct,
                        question_id=question.id
                    )
                    db.session.add(alternative)
                    alternatives.append(alternative)
            
            if not alternatives:
                flash('É necessário adicionar pelo menos uma alternativa!', 'danger')
                db.session.rollback()
                return redirect(url_for('questions.edit_question', question_id=question_id))
                
        elif question.question_type == 'true_false':
            # Remover alternativas antigas
            for alt in question.alternatives:
                db.session.delete(alt)
                
            # Para questões de verdadeiro/falso
            is_true = request.form.get('is_true') == 'true'
            
            # Alternativa Verdadeira
            alt_true = Alternative(
                text='Verdadeiro',
                is_correct=is_true,
                question_id=question.id
            )
            db.session.add(alt_true)
            
            # Alternativa Falsa
            alt_false = Alternative(
                text='Falso',
                is_correct=not is_true,
                question_id=question.id
            )
            db.session.add(alt_false)
        
        # Salvar tudo no banco de dados
        db.session.commit()
        flash('Questão atualizada com sucesso!', 'success')
        return redirect(url_for('questions.view_questions'))
    
    # Para requisições GET, renderizar o formulário com os dados da questão
    return render_template('edit_question.html', question=question)

@questions_bp.route('/delete/<int:question_id>', methods=['POST'])
def delete_question(question_id):
    question = Question.query.get_or_404(question_id)
    
    # Remover imagem se existir
    if question.image_path:
        image_file = os.path.join(current_app.config['UPLOAD_FOLDER'], question.image_path.split('/')[-1])
        if os.path.exists(image_file):
            os.remove(image_file)
    
    # Remover questão do banco de dados
    db.session.delete(question)
    db.session.commit()
    
    flash('Questão excluída com sucesso!', 'success')
    return redirect(url_for('questions.view_questions'))

@questions_bp.route('/api/topics/<subject_name>')
def get_topics(subject_name):
    subject = Subject.query.filter_by(name=subject_name).first()
    if not subject:
        return jsonify([])
    
    topics = Topic.query.filter_by(subject_id=subject.id).all()
    return jsonify([topic.name for topic in topics])
