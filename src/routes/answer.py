from flask import Blueprint, render_template, redirect, url_for, request, flash, jsonify
from models.database import db, Subject, Topic, Question, Alternative, UserResponse
import random

answer_bp = Blueprint('answer', __name__)

@answer_bp.route('/')
def index():
    # Obter lista de assuntos e tópicos para os filtros
    subjects = Subject.query.all()
    
    return render_template('answer_questions.html', subjects=subjects)

@answer_bp.route('/start', methods=['POST'])
def start_quiz():
    # Obter parâmetros do formulário
    subject_id = request.form.get('subject')
    topic_id = request.form.get('topic', 'all')
    question_count = request.form.get('question_count', 10, type=int)
    
    # Construir a query base
    query = Question.query
    
    # Aplicar filtros
    if subject_id != 'all':
        query = query.filter(Question.subject_id == subject_id)
    
    if topic_id != 'all':
        query = query.filter(Question.topic_id == topic_id)
    
    # Obter todas as questões que correspondem aos filtros
    all_questions = query.all()
    
    if not all_questions:
        flash('Nenhuma questão encontrada com os filtros selecionados.', 'warning')
        return redirect(url_for('answer.index'))
    
    # Selecionar aleatoriamente o número solicitado de questões
    selected_questions = random.sample(all_questions, min(question_count, len(all_questions)))
    
    # Armazenar IDs das questões na sessão
    question_ids = [q.id for q in selected_questions]
    
    # Redirecionar para a primeira questão
    return redirect(url_for('answer.show_question', question_index=0, question_ids=','.join(map(str, question_ids))))

@answer_bp.route('/question/<int:question_index>')
def show_question(question_index):
    # Obter IDs das questões da query string
    question_ids_str = request.args.get('question_ids', '')
    if not question_ids_str:
        flash('Nenhuma questão selecionada.', 'warning')
        return redirect(url_for('answer.index'))
    
    question_ids = list(map(int, question_ids_str.split(',')))
    total_questions = len(question_ids)
    
    # Verificar se o índice é válido
    if question_index >= total_questions:
        # Redirecionar para a página de resultados
        return redirect(url_for('answer.show_results', question_ids=question_ids_str))
    
    # Obter a questão atual
    current_question_id = question_ids[question_index]
    question = Question.query.get_or_404(current_question_id)
    
    # Preparar dados para o template
    return render_template('answer_question.html',
                          question=question,
                          question_index=question_index,
                          total_questions=total_questions,
                          question_ids=question_ids_str)

@answer_bp.route('/submit/<int:question_index>', methods=['POST'])
def submit_answer(question_index):
    # Obter IDs das questões
    question_ids_str = request.form.get('question_ids', '')
    if not question_ids_str:
        flash('Nenhuma questão selecionada.', 'warning')
        return redirect(url_for('answer.index'))
    
    question_ids = list(map(int, question_ids_str.split(',')))
    
    # Obter a questão atual
    current_question_id = question_ids[question_index]
    question = Question.query.get_or_404(current_question_id)
    
    # Obter a resposta selecionada
    selected_alternative_id = request.form.get('alternative')
    
    if not selected_alternative_id:
        flash('Por favor, selecione uma alternativa.', 'warning')
        return redirect(url_for('answer.show_question', 
                               question_index=question_index,
                               question_ids=question_ids_str))
    
    # Verificar se a resposta está correta
    selected_alternative = Alternative.query.get_or_404(selected_alternative_id)
    is_correct = selected_alternative.is_correct
    
    # Registrar a resposta do usuário
    user_response = UserResponse(
        question_id=current_question_id,
        alternative_id=selected_alternative_id,
        is_correct=is_correct
    )
    db.session.add(user_response)
    db.session.commit()
    
    # Avançar para a próxima questão
    next_index = question_index + 1
    
    return redirect(url_for('answer.show_question', 
                           question_index=next_index,
                           question_ids=question_ids_str))

@answer_bp.route('/results')
def show_results():
    # Obter IDs das questões
    question_ids_str = request.args.get('question_ids', '')
    if not question_ids_str:
        flash('Nenhuma questão selecionada.', 'warning')
        return redirect(url_for('answer.index'))
    
    question_ids = list(map(int, question_ids_str.split(',')))
    
    # Obter as últimas respostas para estas questões
    responses = []
    correct_count = 0
    
    for q_id in question_ids:
        # Obter a questão
        question = Question.query.get(q_id)
        
        # Obter a resposta mais recente para esta questão
        response = UserResponse.query.filter_by(question_id=q_id).order_by(UserResponse.created_at.desc()).first()
        
        if response:
            if response.is_correct:
                correct_count += 1
            
            responses.append({
                'question': question,
                'selected_alternative': response.alternative,
                'is_correct': response.is_correct,
                'correct_alternative': next((alt for alt in question.alternatives if alt.is_correct), None)
            })
    
    # Calcular pontuação
    total_questions = len(question_ids)
    score_percent = (correct_count / total_questions * 100) if total_questions > 0 else 0
    
    return render_template('answer_results.html',
                          responses=responses,
                          correct_count=correct_count,
                          total_questions=total_questions,
                          score_percent=score_percent)
