import { Config } from '../config.js';
import { createUid } from '../utils.js';

/**
 * @typedef {Object} User
 * @property {string} [id] - O ID do usuário.
 * @property {string} name - O nome do usuário.
 * @property {string} email - O email do usuário.
 * @property {string} password - A senha do usuário.
 * @property {string} role - O papel do usuário.
 */

export const usersRepository = {
  /**
   * Lista todos os usuários
   * @returns {Promise<User[]>} Lista de usuários
   */
  async list() {
    const response = await fetch(`${Config.API_URL}/users`);
    if (!response.ok) {
      throw new Error('Erro ao buscar usuários');
    }
    return response.json();
  },

  /**
   * Realiza o login do usuário
   * @param {string} email - Email do usuário
   * @param {string} password - Senha do usuário
   * @returns {Promise<User?>} Dados do usuário logado
   */
  async login(email, password) {
    const user = await this.getUserByEmail(email);

    if (!user) {
      throw new Error('E-mail não encontrado');
    }

    if (user?.password !== password) {
      throw new Error('Senha inválida');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  },

  /**
   * Registra um novo usuário
   * @param {Object} userData - Dados do usuário
   * @param {string} userData.name - Nome do usuário
   * @param {string} userData.email - Email do usuário
   * @param {string} userData.password - Senha do usuário
   * @returns {Promise<User?>} Dados do usuário registrado
   */
  async register(userData) {
    const alreadyExists = await this.getUserByEmail(userData.email);

    if (alreadyExists) {
      throw new Error('E-mail já cadastrado');
    }

    const response = await fetch(`${Config.API_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: createUid(), ...userData }),
    });

    if (!response.ok) {
      throw new Error('Erro ao registrar usuário');
    }

    const user = await response.json();

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  },

  /**
   * Busca um usuário pelo email
   * @param {string} email - Email do usuário
   * @returns {Promise<User?>} Dados do usuário encontrado
   */
  async getUserByEmail(email) {
    const response = await fetch(`${Config.API_URL}/users?email=${email}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }

      throw new Error('Erro ao buscar usuário');
    }

    const users = await response.json();

    return users[0];
  },
};
