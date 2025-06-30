/**
 * Repository para gerenciamento de caronas
 */
export class RideRepository {
    constructor() {
      this.storageKey = 'rides';
    }
  
    /**
     * Obtém todas as caronas armazenadas
     * @returns {Array} Lista de caronas
     */
    getAll() {
      const rides = localStorage.getItem(this.storageKey);
      return rides ? JSON.parse(rides) : [];
    }
  
    /**
     * Salva uma nova carona
     * @param {Object} ride - Dados da carona
     * @returns {Object} Carona salva
     */
    save(ride) {
      const rides = this.getAll();
      rides.push(ride);
      localStorage.setItem(this.storageKey, JSON.stringify(rides));
      return ride;
    }
  
    /**
     * Atualiza as informações de uma carona
     * @param {string} rideId - ID da carona
     * @param {Object} ride - Dados atualizados da carona
     * @returns {Object} Carona atualizada
     */
    update(rideId, ride) {
      const rides = this.getAll();
      const index = rides.findIndex(r => r.id === rideId);
      if (index !== -1) {
        rides[index] = { ...rides[index], ...ride };
        localStorage.setItem(this.storageKey, JSON.stringify(rides));
        return rides[index];
      }
      return null;
    }
  
    /**
     * Remove uma carona pelo ID
     * @param {string} rideId - ID da carona
     */
    delete(rideId) {
      const rides = this.getAll();
      const filteredRides = rides.filter(r => r.id !== rideId);
      localStorage.setItem(this.storageKey, JSON.stringify(filteredRides));
    }
  }
  