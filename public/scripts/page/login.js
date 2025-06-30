import { usersRepository } from '../repositories/users.js';
import { createFormAlert, delay, validateEmail } from '../utils.js';

// Função para validar o formulário
function validateForm(formData) {
  const errors = [];

  // Validar email
  if (!validateEmail(formData.get('email'))) {
    errors.push('Email inválido');
  }

  // Validar senha
  if (!formData.get('password')) {
    errors.push('A senha é obrigatória');
  }

  return errors;
}

function setupLoginForm() {
  const $form = document.querySelector('#loginForm');
  const formAlert = createFormAlert($form);

  $form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData($form);

    // Validar o formulário
    const errors = validateForm(formData);

    if (errors.length > 0) {
      formAlert.show(errors.join(', '));
      return;
    }

    try {
      const user = await usersRepository.login(
        formData.get('email'),
        formData.get('password')
      );

      localStorage.setItem('user', JSON.stringify(user));


      formAlert.show('Login realizado com sucesso!', { variant: 'success' });
      await delay(1200);
      window.location.href = './index.html';

    } catch (error) {
      formAlert.show(error.message);
    }
  });
}

document.addEventListener('DOMContentLoaded', function() {
  const $form = document.querySelector('#loginForm');
  if ($form) {
    $form.addEventListener('submit', async (event) => {
      event.preventDefault();
      // ... existing code ...
    });
  }
});

setupLoginForm();
