import { usersRepository } from '../repositories/users.js';
import { createFormAlert, delay, validateEmail } from '../utils.js';

// Função para validar o formulário
function validateForm(formData) {
  const errors = [];

  // Validar nome
  if (formData.get('name').trim().length < 3) {
    errors.push('O nome deve ter pelo menos 3 caracteres');
  }

  // Validar email
  if (!validateEmail(formData.get('email'))) {
    errors.push('Email inválido');
  }

  // Validar senha
  if (formData.get('password').trim().length < 6) {
    errors.push('A senha deve ter no mínimo 6 caracteres');
  }

  // Validar confirmação de senha
  if (formData.get('password') !== formData.get('confirmPassword')) {
    errors.push('As senhas não coincidem');
  }

  // Validar role
  if (!formData.get('role')) {
    errors.push('Selecione o tipo de conta');
  }

  return errors;
}

function setupRegisterForm() {
  const $form = document.querySelector('#registerForm');
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
      const user = await usersRepository.register({
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password'),
        role: formData.get('role'),
      });

      localStorage.setItem('user', JSON.stringify(user));

      formAlert.show('Cadastro realizado com sucesso!', { variant: 'success' });
      await delay(1200);
      window.location.href = './index.html';
    } catch (error) {
      formAlert.show(error.message);
    }
  });
}

document.addEventListener('DOMContentLoaded', function() {
  const $form = document.querySelector('#registerForm');
  const $registerCard = document.querySelector('.register-container');
  if ($form) {
    $form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const password = document.getElementById('password').value;
      const hasLength = password.length >= 6;
      const hasUppercase = /[A-Z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      if (!hasLength || !hasUppercase || !hasNumber) {
        if ($registerCard) {
          $registerCard.classList.remove('shake');
          void $registerCard.offsetWidth; 
          $registerCard.classList.add('shake');
        }
        return;
      }
    });
  }
});

setupRegisterForm();
