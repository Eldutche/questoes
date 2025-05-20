import os
import sys
from flask import Flask, render_template, flash, redirect, url_for, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from werkzeug.utils import secure_filename
from datetime import datetime

# Garantir que o diretório raiz esteja no path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Importar modelos
from models.database import db, Subject, Topic, Question, Alternative, UserResponse

# Configuração da aplicação
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'chave-secreta-padrao')

# Configuração do banco de dados - adaptada para o Render
if os.environ.get('RENDER'):
    # Configuração para o Render (produção)
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///questoes.db')
else:
    # Configuração para desenvolvimento local
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(os.path.dirname(os.path.dirname(__file__)), 'questoes.db')

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static/uploads')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'gif'}

# Inicializar o banco de dados
db.init_app(app)

# Importar rotas
from routes.home import home_bp
from routes.questions import questions_bp
from routes.print import print_bp
from routes.answer import answer_bp

# Registrar blueprints
app.register_blueprint(home_bp, url_prefix='/')
app.register_blueprint(questions_bp, url_prefix='/questions')
app.register_blueprint(print_bp, url_prefix='/print')
app.register_blueprint(answer_bp, url_prefix='/answer')

# Criar tabelas do banco de dados
with app.app_context():
    db.create_all()

# Função auxiliar para verificar extensões de arquivo permitidas
def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

# Rota para lidar com erros 404
@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

# Rota para lidar com erros 500
@app.errorhandler(500)
def internal_server_error(e):
    return render_template('500.html'), 500

if __name__ == '__main__':
    # Garantir que a pasta de uploads exista
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    # Porta definida pelo ambiente ou padrão 5000
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
