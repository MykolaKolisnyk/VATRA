import { supabase } from './supabase-client.js';

const $ = selector => document.querySelector(selector);
const mode = document.body.dataset.authMode === 'register' ? 'register' : 'login';
const register = mode === 'register';
const form = $('#authForm');
const submit = $('#submit');
let submitting = false;

const birthday = $('#birthday');
if (birthday) birthday.max = new Date().toISOString().slice(0, 10);

function showError(message, success = false) {
  const error = $('#error');
  error.textContent = message;
  error.classList.toggle('success', success);
}

function setupPage() {
  $('#firstNameWrap').hidden = !register;
  $('#lastNameWrap').hidden = !register;
  $('#birthdayWrap').hidden = !register;
  $('#confirmWrap').hidden = !register;
  $('#firstName').required = register;
  $('#lastName').required = register;
  $('#birthday').required = register;
  $('#confirm').required = register;
  $('#password').autocomplete = register ? 'new-password' : 'current-password';
  $('#forgot').hidden = register;
  $('#eyebrow').textContent = register ? 'ТВОЯ ІСТОРІЯ ПОЧИНАЄТЬСЯ ТУТ' : 'РАДІ БАЧИТИ ЗНОВУ';
  $('#title').textContent = register ? 'Створи акаунт ВАТРИ' : 'З поверненням до ВАТРИ';
  $('#desc').textContent = register
    ? 'Створи профіль, щоб ділитися новинами та знаходити друзів.'
    : 'Увійди, щоб побачити свою стрічку та друзів.';
  submit.textContent = register ? 'Створити акаунт' : 'Увійти';
  $('#bottom').innerHTML = register
    ? 'Вже маєш акаунт? <a href="auth.html">Увійти</a>'
    : 'Ще немає акаунта? <a href="register.html">Зареєструватися</a>';
  $('#showPassword').addEventListener('click', () => {
    const password = $('#password');
    password.type = password.type === 'password' ? 'text' : 'password';
    $('#showPassword').textContent = password.type === 'password' ? 'Показати' : 'Сховати';
  });
}

supabase.auth.onAuthStateChange((_event, session) => {
  if (session && !submitting) location.replace('index.html');
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (submitting) return;
  showError('');
  const email = $('#email').value.trim().toLowerCase();
  const password = $('#password').value;
  if (!$('#email').validity.valid) {
    showError('Введи коректну адресу електронної пошти.');
    return;
  }

  if (register) {
    const firstName = $('#firstName').value.trim();
    const lastName = $('#lastName').value.trim();
    const dob = $('#birthday').value;
    if (firstName.length < 2 || lastName.length < 2) {
      showError('Вкажи ім’я та прізвище (не менше 2 символів кожне).');
      return;
    }
    if (!dob) {
      showError('Вкажи дату народження.');
      return;
    }
    const birth = new Date(dob + 'T00:00:00');
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
    if (Number.isNaN(birth.getTime()) || birth > today || age < 13) {
      showError('ВАТРА доступна з 13 років. Перевір дату народження.');
      return;
    }
    if (password.length < 10 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      showError('Пароль має містити щонайменше 10 символів, велику й малу латинські літери та цифру.');
      return;
    }
    if (password !== $('#confirm').value) {
      showError('Паролі не збігаються.');
      return;
    }
  }

  const oldLabel = submit.textContent;
  submitting = true;
  submit.disabled = true;
  submit.textContent = 'Зачекай…';
  try {
    let result;
    if (register) {
      const firstName = $('#firstName').value.trim();
      const lastName = $('#lastName').value.trim();
      const username = (firstName + '.' + lastName).toLocaleLowerCase('uk-UA')
        .replace(/[^\p{L}\p{N}]+/gu, '.').replace(/^\.|\.$/g, '').slice(0, 24);
      result = await supabase.auth.signUp({
        email,
        password,
        options: { data: { first_name: firstName, last_name: lastName, username, date_of_birth: $('#birthday').value } }
      });
    } else {
      result = await supabase.auth.signInWithPassword({ email, password });
    }
    if (result.error) throw result.error;
    if (register && !result.data.session) {
      showError('Перевір пошту та підтверди реєстрацію. Після цього увійди у ВАТРУ.', true);
      return;
    }
    location.replace('index.html');
  } catch (error) {
    showError(error.message || 'Не вдалося виконати дію. Перевір інтернет і налаштування Supabase.');
  } finally {
    submitting = false;
    submit.disabled = false;
    submit.textContent = oldLabel;
  }
});

$('#forgot').addEventListener('click', async () => {
  const email = $('#email').value.trim().toLowerCase();
  if (!$('#email').validity.valid) {
    showError('Спочатку введи свою адресу електронної пошти.');
    return;
  }
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/auth.html' });
    if (error) throw error;
    showError('Якщо акаунт із цією адресою існує, лист для відновлення надіслано.', true);
  } catch (error) {
    showError(error.message || 'Не вдалося надіслати лист для відновлення.');
  }
});

setupPage();
