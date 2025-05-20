// Funções principais para o sistema de questões

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar tooltips do Bootstrap
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    });

    // Inicializar popovers do Bootstrap
    var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'))
    var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl)
    });

    // Adicionar evento para alternativas na página de responder questões
    const alternativeItems = document.querySelectorAll('.alternative-item');
    alternativeItems.forEach(item => {
        item.addEventListener('click', function() {
            // Encontrar o input radio dentro deste item
            const radio = this.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = true;
                
                // Remover classe selected de todos os itens
                alternativeItems.forEach(alt => {
                    alt.classList.remove('selected');
                });
                
                // Adicionar classe selected ao item clicado
                this.classList.add('selected');
            }
        });
    });

    // Função para carregar tópicos quando o assunto é selecionado
    const subjectSelect = document.getElementById('subject');
    const topicSelect = document.getElementById('topic');
    
    if (subjectSelect && topicSelect) {
        subjectSelect.addEventListener('change', function() {
            const subjectId = this.value;
            if (subjectId) {
                // Construir a URL para a API
                const apiUrl = `/print/api/topics/${subjectId}`;
                
                // Fazer a requisição AJAX
                fetch(apiUrl)
                    .then(response => response.json())
                    .then(data => {
                        // Limpar o select de tópicos
                        topicSelect.innerHTML = '';
                        
                        // Adicionar as opções de tópicos
                        data.forEach(topic => {
                            const option = document.createElement('option');
                            option.value = topic.id;
                            option.textContent = topic.name;
                            topicSelect.appendChild(option);
                        });
                    })
                    .catch(error => {
                        console.error('Erro ao carregar tópicos:', error);
                    });
            } else {
                // Se nenhum assunto for selecionado, limpar o select de tópicos
                topicSelect.innerHTML = '<option value="all">Todos os Assuntos</option>';
            }
        });
    }

    // Função para adicionar alternativas na página de adicionar questão
    const addAlternativeBtn = document.querySelector('.add-alternative-btn');
    if (addAlternativeBtn) {
        addAlternativeBtn.addEventListener('click', function() {
            const alternativesContainer = document.getElementById('alternatives-container');
            const alternativeCount = alternativesContainer.children.length;
            
            if (alternativeCount < 8) { // Limitar a 8 alternativas (A-H)
                const letter = String.fromCharCode(65 + alternativeCount); // A, B, C, ...
                
                const alternativeDiv = document.createElement('div');
                alternativeDiv.className = 'mb-3 alternative-row';
                alternativeDiv.innerHTML = `
                    <div class="row align-items-center">
                        <div class="col-auto">
                            <label class="form-label">${letter})</label>
                        </div>
                        <div class="col">
                            <input type="text" class="form-control" name="alternative_${letter}" placeholder="Digite o texto da alternativa ${letter}" required>
                        </div>
                        <div class="col-auto">
                            <button type="button" class="btn btn-danger remove-alternative-btn">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
                
                alternativesContainer.appendChild(alternativeDiv);
                
                // Adicionar evento para remover alternativa
                const removeBtn = alternativeDiv.querySelector('.remove-alternative-btn');
                removeBtn.addEventListener('click', function() {
                    alternativeDiv.remove();
                    updateAlternativeLabels();
                });
            } else {
                alert('Máximo de 8 alternativas atingido.');
            }
        });
        
        // Função para atualizar as letras das alternativas após remoção
        function updateAlternativeLabels() {
            const alternativeRows = document.querySelectorAll('.alternative-row');
            alternativeRows.forEach((row, index) => {
                const letter = String.fromCharCode(65 + index);
                const label = row.querySelector('.form-label');
                const input = row.querySelector('.form-control');
                
                label.textContent = `${letter})`;
                input.name = `alternative_${letter}`;
                input.placeholder = `Digite o texto da alternativa ${letter}`;
            });
        }
        
        // Adicionar evento para remover alternativas existentes
        document.querySelectorAll('.remove-alternative-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                this.closest('.alternative-row').remove();
                updateAlternativeLabels();
            });
        });
    }

    // Função para pré-visualização de imagem
    const imageInput = document.getElementById('question_image');
    const imagePreview = document.getElementById('image_preview');
    
    if (imageInput && imagePreview) {
        imageInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    imagePreview.src = e.target.result;
                    imagePreview.style.display = 'block';
                };
                
                reader.readAsDataURL(this.files[0]);
            }
        });
    }

    // Função para alternar entre tipos de questão
    const questionTypeSelect = document.getElementById('question_type');
    const multipleChoiceOptions = document.getElementById('multiple_choice_options');
    const trueFalseOptions = document.getElementById('true_false_options');
    
    if (questionTypeSelect && multipleChoiceOptions && trueFalseOptions) {
        questionTypeSelect.addEventListener('change', function() {
            if (this.value === 'multiple_choice') {
                multipleChoiceOptions.style.display = 'block';
                trueFalseOptions.style.display = 'none';
            } else if (this.value === 'true_false') {
                multipleChoiceOptions.style.display = 'none';
                trueFalseOptions.style.display = 'block';
            }
        });
    }
});
