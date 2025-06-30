import { Config } from '../config.js';
import { createUid } from '../utils.js';

/**
 * @typedef {Object} Vehicle
 * @property {string} [id] - ID único do veículo
 * @property {string} driverId - ID do motorista
 * @property {string} brand - Marca do veículo
 * @property {string} model - Modelo do veículo
 * @property {string} color - Cor do veículo
 * @property {string} licensePlate - Placa do veículo
 * @property {'CAR'|'MOTORCYCLE'} type - Tipo do veículo
 * @property {number} availableSeats - Número de assentos disponíveis
 */

export const vehiclesRepository = {
  /**
   * Busca todos os veículos.
   * @returns {Promise<Vehicle[]>} Um array de objetos de veículo.
   * @throws {Error} Se ocorrer um erro ao buscar os veículos.
   */
  async getVehicles() {
    const response = await fetch(`${Config.API_URL}/vehicles`);
    if (!response.ok) {
      throw new Error('Error fetching vehicles');
    }
    return response.json();
  },

  /**
   * Busca um veículo específico pelo ID.
   * @param {string} id - O ID do veículo a ser buscado.
   * @returns {Promise<Vehicle>} O objeto do veículo encontrado.
   * @throws {Error} Se ocorrer um erro ao buscar o veículo.
   */
  async getVehicleById(id) {
    const response = await fetch(`${Config.API_URL}/vehicles/${id}`);
    if (!response.ok) {
      throw new Error('Error fetching vehicle');
    }
    return response.json();
  },

  /**
   * Busca o veículo do motorista.
   * @param {string} driverId - O ID do motorista.
   * @returns {Promise<Vehicle[]>} O objeto do veículo do motorista.
   * @throws {Error} Se ocorrer um erro ao buscar o veículo.
   */
  async getByDriverId(driverId) {
    const response = await fetch(
      `${Config.API_URL}/vehicles?driverId=${driverId}`
    );
    if (!response.ok) {
      throw new Error('Error fetching driver vehicle');
    }
    const vehicles = await response.json();
    return vehicles;
  },

  /**
   * Cria um novo veículo.
   * @param {Vehicle} vehicle - O objeto que representa o veículo a ser criado.
   * @returns {Promise<Vehicle>} O objeto do veículo criado.
   * @throws {Error} Se ocorrer um erro ao criar o veículo.
   */
  async createVehicle(vehicle) {
    const response = await fetch(`${Config.API_URL}/vehicles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: createUid(), ...vehicle }),
    });
    if (!response.ok) {
      throw new Error('Error creating vehicle');
    }
    return response.json();
  },

  /**
   * Atualiza um veículo existente.
   * @param {string} id - O ID do veículo a ser atualizado.
   * @param {Vehicle} vehicle - O objeto atualizado do veículo.
   * @returns {Promise<Vehicle>} O objeto do veículo atualizado.
   * @throws {Error} Se ocorrer um erro ao atualizar o veículo.
   */
  async update(id, vehicle) {
    const response = await fetch(`${Config.API_URL}/vehicles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vehicle),
    });
    if (!response.ok) {
      throw new Error('Error updating vehicle');
    }
    return response.json();
  },

  /**
   * Atualiza ou cria o veículo do motorista.
   * @param {string} driverId - O ID do motorista.
   * @param {Vehicle} vehicle - O objeto do veículo.
   * @returns {Promise<Vehicle>} O objeto do veículo atualizado ou criado.
   * @throws {Error} Se ocorrer um erro ao atualizar ou criar o veículo.
   */
  async updateVehicleByDriverId(driverId, vehicle) {
    const driverVehicles = await this.getByDriverId(driverId);

    const existingVehicle = driverVehicles[0] || null;

    if (existingVehicle) {
      return this.update(existingVehicle.id, {
        ...existingVehicle,
        ...vehicle,
      });
    } else {
      return this.createVehicle({ ...vehicle, driverId });
    }
  },

  /**
   * Deleta um veículo existente.
   * @param {string} id - O ID do veículo a ser deletado.
   * @throws {Error} Se ocorrer um erro ao deletar o veículo.
   */
  async delete(id) {
    const response = await fetch(`${Config.API_URL}/vehicles/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Error deleting vehicle');
    }
  },

  /**
   * Deleta o veículo do motorista.
   * @param {string} driverId - O ID do motorista.
   * @throws {Error} Se ocorrer um erro ao deletar o veículo.
   */
  async deleteVehicleByDriverId(driverId) {
    const vehicles = await this.getByDriverId(driverId);
    const vehicle = vehicles[0] || null;

    if (vehicle) {
      await this.delete(vehicle.id);
    }
  },
};
