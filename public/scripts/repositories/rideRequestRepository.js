/**
 * Repository para gerenciamento de solicitações de caronas
 */
export class RideRequestRepository {
    constructor() {
      this.storageKey = 'rideRequests';
    }
  
    /**
     * Obtém todas as solicitações de caronas
     * @returns {Array} Lista de solicitações
     */
    getAll() {
      const rideRequests = localStorage.getItem(this.storageKey);
      return rideRequests ? JSON.parse(rideRequests) : [];
    }
  
    /**
     * Salva uma nova solicitação de carona
     * @param {Object} request - Dados da solicitação
     * @returns {Object} Solicitação salva
     */
    save(request) {
      const rideRequests = this.getAll();
      rideRequests.push(request);
      localStorage.setItem(this.storageKey, JSON.stringify(rideRequests));
      return request;
    }
  }
  