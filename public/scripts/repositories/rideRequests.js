import { Config } from '../config.js';

export const rideRequestsRepository = {
  async getRideRequests() {
    const response = await fetch(
      `${Config.API_URL}/ride-requests?_embed=user&_embed=destination`
    );
    if (!response.ok) throw new Error('Error fetching ride requests');
    return response.json();
  },

  async getRideRequestsByDestination(destinationId) {
    const response = await fetch(
      `${Config.API_URL}/ride-requests?destinationId=${destinationId}`
    );
    if (!response.ok) throw new Error('Error fetching ride requests by destination');
    return response.json();
  },

  async getRideRequestsByDriver(driverId) {
    const response = await fetch(
      `${Config.API_URL}/ride-requests?driverId=${driverId}`
    );
    if (!response.ok) throw new Error('Error fetching ride requests by driver');
    return response.json();
  },

  async updateRideRequestStatus(id, status) {
    const response = await fetch(`${Config.API_URL}/ride-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) throw new Error('Error updating ride request status');
    return response.json();
  },

  async createRideRequest(rideRequest) {
    // Garantir que sempre tenha um driverResponse
    if (!rideRequest.driverResponse) {
      // Se não foi fornecido, criar um placeholder
      rideRequest.driverResponse = {
        id: 'pending',
        name: 'Motorista a ser definido',
        email: 'pendente',
        contact: 'pendente',
        vehicle: 'Veículo a ser definido'
      };
    }

    const response = await fetch(`${Config.API_URL}/ride-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rideRequest),
    });
    if (!response.ok) throw new Error('Error creating ride request');
    return response.json();
  },

  async deleteRideRequest(id) {
    const response = await fetch(`${Config.API_URL}/ride-requests/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Error deleting ride request');
  },
};
