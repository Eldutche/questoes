from flask import Blueprint, render_template, redirect, url_for, request, flash, current_app
import os
from werkzeug.utils import secure_filename
from models.database import db, Subject, Topic, Question, Alternative

home_bp = Blueprint('home', __name__)

@home_bp.route('/')
def index():
    # Obter estatísticas para o dashboard
    subject_count = Subject.query.count()
    question_count = Question.query.count()
    
    return render_template('home.html', 
                          subject_count=subject_count,
                          question_count=question_count)
