# Sistema de Questões - Documentação de Deploy no Render

Este documento contém instruções para fazer o deploy do Sistema de Questões no Render.

## Sobre o Sistema

O Sistema de Questões é uma aplicação web completa desenvolvida em Flask que permite:

- Cadastrar, editar e excluir questões de múltipla escolha e verdadeiro/falso
- Adicionar imagens às questões
- Responder questões interativamente
- Imprimir questões por matéria e assunto
- Interface responsiva para qualquer dispositivo

## Requisitos para Deploy

- Uma conta no [Render](https://render.com/)
- Git instalado na sua máquina (opcional, você pode fazer upload direto pelo Render)

## Passos para Deploy

### 1. Criar uma conta no Render

Acesse [render.com](https://render.com/) e crie uma conta gratuita.

### 2. Criar um novo Web Service

1. No dashboard do Render, clique em "New" e selecione "Web Service"
2. Conecte seu repositório GitHub ou faça upload do código diretamente
3. Preencha as informações:
   - Nome: `sistema-questoes` (ou outro nome de sua preferência)
   - Runtime: `Python 3`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn src.main:app`
   - Plano: Free

### 3. Configurar Variáveis de Ambiente

No Render, vá até a seção "Environment" do seu Web Service e adicione:

- `RENDER`: `true`
- `SECRET_KEY`: Uma string aleatória para segurança (ex: `sua-chave-secreta-aqui`)

### 4. Deploy

Clique em "Create Web Service" e aguarde o deploy ser concluído. O Render irá automaticamente:

1. Instalar as dependências do `requirements.txt`
2. Configurar o ambiente
3. Iniciar o servidor usando o Gunicorn

### 5. Acessar o Sistema

Após o deploy ser concluído, você receberá um URL no formato `https://seu-app.onrender.com`. Use este link para acessar o sistema.

## Estrutura do Projeto

```
questoes_app_completo/
├── Procfile                # Configuração para o Render
├── requirements.txt        # Dependências do projeto
├── src/
│   ├── main.py             # Ponto de entrada da aplicação
│   ├── models/             # Modelos de dados
│   ├── routes/             # Rotas da aplicação
│   ├── static/             # Arquivos estáticos (CSS, JS, imagens)
│   └── templates/          # Templates HTML
└── questoes.db             # Banco de dados SQLite (criado automaticamente)
```

## Manutenção

- O plano gratuito do Render pode hibernar após períodos de inatividade
- O primeiro acesso após hibernação pode ser mais lento
- Os arquivos de upload são temporários no plano gratuito e podem ser perdidos em redeploys

## Suporte

Para qualquer dúvida ou problema, entre em contato com o desenvolvedor.
