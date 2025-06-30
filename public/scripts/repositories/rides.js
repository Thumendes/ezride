import { Config } from '../config.js';
import { createUid } from '../utils.js';

/**
 * @typedef {Object} Ride
 * @property {string} [id] - O ID da carona.
 * @property {string} vehicleId - O ID do veículo.
 * @property {string} driverId - O ID do motorista.
 * @property {string} routeId - O ID da rota.
 * @property {string} startAddress - O endereço de partida.
 * @property {number} startLat - A latitude do endereço de partida.
 * @property {number} startLng - A longitude do endereço de partida.
 * @property {string} endAddress - O endereço de chegada.
 * @property {number} endLat - A latitude do endereço de chegada.
 * @property {number} endLng - A longitude do endereço de chegada.
 * @property {string} startTime - O horário de partida.
 * @property {number} availableSeats - Número de vagas disponíveis.
 * @property {'AVAILABLE'|'IN_PROGRESS'|'COMPLETED'|'CANCELLED'} status - Status da carona.
 */

export const ridesRepository = {
  /**
   * Busca todas as caronas.
   * @returns {Promise<Ride[]>} Um array de objetos de carona.
   * @throws {Error} Se ocorrer um erro ao buscar as caronas.
   */
  async getRides() {
    const response = await fetch(`${Config.API_URL}/rides`);
    if (!response.ok) {
      throw new Error('Error fetching rides');
    }
    return response.json();
  },

  /**
   * Busca uma carona específica pelo ID.
   * @param {string} id - O ID da carona a ser buscada.
   * @returns {Promise<Ride>} O objeto da carona encontrada.
   * @throws {Error} Se ocorrer um erro ao buscar a carona.
   */
  async getRideById(id) {
    const response = await fetch(`${Config.API_URL}/rides/${id}`);
    if (!response.ok) {
      throw new Error('Error fetching ride');
    }
    return response.json();
  },

  /**
   * Cria uma nova carona.
   * @param {Ride} ride - O objeto que representa a carona a ser criada.
   * @returns {Promise<Ride>} O objeto da carona criada.
   * @throws {Error} Se ocorrer um erro ao criar a carona.
   */
  async createRide(ride) {
    const response = await fetch(`${Config.API_URL}/rides`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: createUid(), ...ride }),
    });
    if (!response.ok) {
      throw new Error('Error creating ride');
    }
    return response.json();
  },

  /**
   * Atualiza uma carona existente.
   * @param {string} id - O ID da carona a ser atualizada.
   * @param {Ride} ride - O objeto atualizado da carona.
   * @returns {Promise<Ride>} O objeto da carona atualizada.
   * @throws {Error} Se ocorrer um erro ao atualizar a carona.
   */
  async updateRide(id, ride) {
    const response = await fetch(`${Config.API_URL}/rides/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ride),
    });
    if (!response.ok) {
      throw new Error('Error updating ride');
    }
    return response.json();
  },

  /**
   * Deleta uma carona existente.
   * @param {string} id - O ID da carona a ser deletada.
   * @throws {Error} Se ocorrer um erro ao deletar a carona.
   */
  async deleteRide(id) {
    const response = await fetch(`${Config.API_URL}/rides/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Error deleting ride');
    }
  },

  /**
   * Busca caronas por motorista.
   * @param {string} driverId - O ID do motorista.
   * @returns {Promise<Ride[]>} Um array de caronas do motorista.
   * @throws {Error} Se ocorrer um erro ao buscar as caronas.
   */
  async getRidesByDriver(driverId) {
    const response = await fetch(
      `${Config.API_URL}/rides?driverId=${driverId}`
    );
    if (!response.ok) {
      throw new Error('Error fetching driver rides');
    }
    return response.json();
  },

  /**
   * Atualiza o status de uma carona.
   * @param {string} id - O ID da carona.
   * @param {'AVAILABLE'|'IN_PROGRESS'|'COMPLETED'|'CANCELLED'} status - O novo status.
   * @returns {Promise<Ride>} A carona atualizada.
   * @throws {Error} Se ocorrer um erro ao atualizar o status.
   */
  async updateRideStatus(id, status) {
    const response = await fetch(`${Config.API_URL}/rides/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      throw new Error('Error updating ride status');
    }
    return response.json();
  },
};
