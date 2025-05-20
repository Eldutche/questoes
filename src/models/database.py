from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Subject(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    questions = db.relationship('Question', backref='subject', lazy=True)
    
    def __repr__(self):
        return f'<Subject {self.name}>'

class Topic(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subject.id'), nullable=False)
    questions = db.relationship('Question', backref='topic', lazy=True)
    
    def __repr__(self):
        return f'<Topic {self.name}>'

class Question(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.Text, nullable=False)
    image_path = db.Column(db.String(255), nullable=True)
    question_type = db.Column(db.String(20), nullable=False)  # multiple_choice, true_false
    subject_id = db.Column(db.Integer, db.ForeignKey('subject.id'), nullable=False)
    topic_id = db.Column(db.Integer, db.ForeignKey('topic.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    alternatives = db.relationship('Alternative', backref='question', lazy=True, cascade="all, delete-orphan")
    
    def __repr__(self):
        return f'<Question {self.id}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'text': self.text,
            'image_path': self.image_path,
            'question_type': self.question_type,
            'subject': self.subject.name,
            'topic': self.topic.name,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'alternatives': [alt.to_dict() for alt in self.alternatives]
        }

class Alternative(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.Text, nullable=False)
    is_correct = db.Column(db.Boolean, default=False)
    question_id = db.Column(db.Integer, db.ForeignKey('question.id'), nullable=False)
    
    def __repr__(self):
        return f'<Alternative {self.id}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'text': self.text,
            'is_correct': self.is_correct
        }

class UserResponse(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    question_id = db.Column(db.Integer, db.ForeignKey('question.id'), nullable=False)
    alternative_id = db.Column(db.Integer, db.ForeignKey('alternative.id'), nullable=False)
    is_correct = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    question = db.relationship('Question', backref='responses')
    alternative = db.relationship('Alternative')
    
    def __repr__(self):
        return f'<UserResponse {self.id}>'
