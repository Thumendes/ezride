import { Config } from '../config.js';
import { createUid } from '../utils.js';

/**
 * @typedef {Object} Destination
 * @property {string} [id] - O ID do destino.
 * @property {number} userId - O ID do usuário associado ao destino.
 * @property {boolean} default - Indica se o destino é padrão.
 * @property {string} name - O nome do destino.
 * @property {string} startAddress - O endereço de partida do destino.
 * @property {number} startLat - A latitude do endereço de partida.
 * @property {number} startLng - A longitude do endereço de partida.
 * @property {string} startTime - O horário de partida do destino.
 * @property {string} endAddress - O endereço de chegada do destino.
 * @property {number} endLat - A latitude do endereço de chegada.
 * @property {number} endLng - A longitude do endereço de chegada.
 */

export const destinationsRepository = {
  /**
   * Busca todos os destinos.
   * @returns {Promise<Destination[]>} Um array de objetos de destino.
   * @throws {Error} Se ocorrer um erro ao buscar os destinos.
   */
  async getDestinations() {
    const response = await fetch(`${Config.API_URL}/destinations`);
    if (!response.ok) {
      throw new Error('Error fetching destinations');
    }
    return response.json();
  },

  /**
   * Busca destinos de um usuário específico.
   * @param {string} userId - O ID do usuário.
   * @returns {Promise<Destination[]>} Um array de objetos de destino do usuário.
   * @throws {Error} Se ocorrer um erro ao buscar os destinos.
   */
  async getDestinationsByUser(userId) {
    const response = await fetch(`${Config.API_URL}/destinations?userId=${userId}`);
    if (!response.ok) {
      throw new Error('Error fetching user destinations');
    }
    return response.json();
  },

  /**
   * Busca um destino específico pelo ID.
   * @param {string} id - O ID do destino a ser buscado.
   * @returns {Promise<Destination>} O objeto do destino encontrado.
   * @throws {Error} Se ocorrer um erro ao buscar o destino.
   */
  async getDestinationById(id) {
    const response = await fetch(`${Config.API_URL}/destinations/${id}`);
    if (!response.ok) {
      throw new Error('Error fetching destination');
    }
    return response.json();
  },

  /**
   * Cria um novo destino.
   * @param {Destination} destination - O objeto que representa o destino a ser criado.
   * @returns {Promise<Destination>} O objeto do destino criado.
   * @throws {Error} Se ocorrer um erro ao criar o destino.
   */
  async createDestination(destination) {
    const response = await fetch(`${Config.API_URL}/destinations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: createUid(), ...destination }),
    });
    if (!response.ok) {
      throw new Error('Error creating destination');
    }
    return response.json();
  },

  /**
   * Atualiza um destino existente.
   * @param {string} id - O ID do destino a ser atualizado.
   * @param {Destination} destination - O objeto atualizado do destino.
   * @returns {Promise<Destination>} O objeto do destino atualizado.
   * @throws {Error} Se ocorrer um erro ao atualizar o destino.
   */
  async updateDestination(id, destination) {
    const response = await fetch(`${Config.API_URL}/destinations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(destination),
    });
    if (!response.ok) {
      throw new Error('Error updating destination');
    }
    return response.json();
  },

  /**
   * Deleta um destino existente.
   * @param {string} id - O ID do destino a ser deletado.
   * @throws {Error} Se ocorrer um erro ao deletar o destino.
   */
  async deleteDestination(id) {
    const response = await fetch(`${Config.API_URL}/destinations/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Error deleting destination');
    }
  },
};
